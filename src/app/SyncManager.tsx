import {useEffect, useRef} from 'react'

import {useQueryClient} from '@tanstack/react-query'

import {measureRecordSchema} from '@entities/measure-record'
import {motorSchema} from '@entities/motor'
import {raceRecordSchema} from '@entities/race-record'
import {useSession} from '@features/auth'
import {pullServerData, pushServerData} from '@features/sync'
import {readDomainSnapshot, replaceDomainSnapshot} from '@shared/lib/persistence'
import {subscribeServerSync} from '@shared/lib/sync-signal'

import type {DomainSnapshot} from '@shared/lib/persistence'

// 서버 동기화 오케스트레이션 (v2.40 Phase B → v2.x: 서버 DB 정본 통일).
// v2.x(사용자): **데이터는 서버 DB가 정본.** 로그인 시 서버에서 로드해 로컬(IndexedDB 캐시)을 채운다.
//  - 서버에 데이터가 있으면 **서버 우선**: 서버 스냅샷으로 로컬을 교체(replaceDomainSnapshot).
//  - 서버가 비어 있으면 **최초 1회 병합**: 현재 로컬을 서버로 시드 push(전환 시 로컬 데이터 보존).
// mutation 성공(로그인 상태) 시 로컬 전체 스냅샷을 서버로 디바운스 mirror push → 서버 정본 유지.
// 필터·정렬은 로컬(localStorage) 전용 — 서버 스냅샷 대상 아님.
// 미로그인·로컬 정적 서버·오프라인에서는 pull/push가 조용히 no-op → IndexedDB 동작 그대로.

const PUSH_DEBOUNCE_MS = 800

/**
 * R35 — 서버 스냅샷 행 단위 검증·격리. replaceDomainSnapshot은 무검증 저장이라, 서버에 현행 클라
 * 스키마를 위반하는 행이 하나라도 있으면 pull 성공 시마다 로컬이 재오염돼 모든 목록 읽기가
 * data-corrupt로 고착됐다(캐시 삭제도 무효 — 프로덕션 장애). 위반 행은 격리(drop)하고 유효 행만
 * 저장한다 — 격리 행은 어차피 현행 앱이 읽지 못하는 행이며, 다음 mirror push에서 서버에서도 제거된다.
 * FK 정합: 격리된 모터를 참조하는 기록도 함께 격리한다(잔존 시 부팅 full-scan이 INV-03로 corrupted 판정).
 */
export function sanitizeSnapshot(server: DomainSnapshot): DomainSnapshot {
  const motors = server.motors.filter(row => {
    const ok = motorSchema.safeParse(row).success
    if (!ok) console.warn('[sync] 서버 motors 행 격리(스키마 위반):', (row as {id?: unknown}).id)
    return ok
  })
  const motorIds = new Set(motors.map(m => (m as {id: string}).id))
  const keepRecord = (store: string) => (row: DomainSnapshot['measures'][number]): boolean => {
    const motorId = (row as {motorId?: unknown}).motorId
    if (typeof motorId !== 'string' || !motorIds.has(motorId)) {
      console.warn(`[sync] 서버 ${store} 행 격리(모터 부재):`, (row as {id?: unknown}).id)
      return false
    }
    return true
  }
  const measures = server.measures
    .filter(row => {
      const ok = measureRecordSchema.safeParse(row).success
      if (!ok) console.warn('[sync] 서버 measures 행 격리(스키마 위반):', (row as {id?: unknown}).id)
      return ok
    })
    .filter(keepRecord('measures'))
  const races = server.races
    .filter(row => {
      const ok = raceRecordSchema.safeParse(row).success
      if (!ok) console.warn('[sync] 서버 races 행 격리(스키마 위반):', (row as {id?: unknown}).id)
      return ok
    })
    .filter(keepRecord('races'))
  return {motors, measures, races}
}

export function SyncManager() {
  const {user} = useSession()
  const queryClient = useQueryClient()
  const syncedUserRef = useRef<string | null>(null)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userId = user?.id ?? null

  // 로그인 시 1회 서버 우선 로드(서버 정본) — 서버 있으면 로컬 교체, 비었으면 로컬 시드
  useEffect(() => {
    if (userId === null) {
      syncedUserRef.current = null
      return
    }
    if (syncedUserRef.current === userId) return
    syncedUserRef.current = userId
    void (async () => {
      const raw = await pullServerData()
      if (raw === null) return // 서버리스/DB 미가용 — skip(기존 로컬 유지)
      const server = sanitizeSnapshot(raw) // R35 — 위반 행 격리 후 저장(재오염 차단)
      // R36: 분기는 **raw 기준** — sanitize가 전 행을 격리한 경우에도 "서버에 데이터가 있다"는 사실은
      // 참이므로 서버 우선 교체를 수행한다(격리 결과가 비어 있으면 로컬도 비움). raw 기준이 아니면
      // 이 경우 else로 빠져 오염된 로컬을 서버로 시드 push(역오염)하고 로컬 교체는 영영 일어나지 않는다.
      const serverHasData =
        raw.motors.length > 0 || raw.measures.length > 0 || raw.races.length > 0
      if (serverHasData) {
        await replaceDomainSnapshot(server) // 서버 우선(로컬 대체)
      } else {
        const local = await readDomainSnapshot()
        const localHasData =
          local.motors.length > 0 || local.measures.length > 0 || local.races.length > 0
        if (localHasData) await pushServerData(local) // 서버 비어있음 → 로컬 시드(최초 병합)
      }
      await queryClient.invalidateQueries()
    })()
  }, [userId, queryClient])

  // 로컬 쓰기 → 디바운스 mirror push(로그인 상태만). 두 채널을 모두 구독한다:
  //  ① TanStack mutation 성공(모터 생성·수정·삭제 등 useMutation 경로)
  //  ② requestServerSync 신호 — **측정 수집**은 command 직접 호출이라 ①이 발화하지 않았다.
  //     이 누락으로 측정 기록이 서버에 저장되지 않던 버그를 수정한다(v2.x 사용자 제보).
  useEffect(() => {
    const schedulePush = (): void => {
      if (userId === null) return
      if (pushTimerRef.current !== null) clearTimeout(pushTimerRef.current)
      pushTimerRef.current = setTimeout(() => {
        void (async () => {
          await pushServerData(await readDomainSnapshot())
        })()
      }, PUSH_DEBOUNCE_MS)
    }
    const unsubscribeMutations = queryClient.getMutationCache().subscribe(event => {
      if (event.type !== 'updated' || event.mutation.state.status !== 'success') return
      schedulePush()
    })
    const unsubscribeSignal = subscribeServerSync(schedulePush)
    return () => {
      unsubscribeMutations()
      unsubscribeSignal()
      if (pushTimerRef.current !== null) clearTimeout(pushTimerRef.current)
    }
  }, [queryClient, userId])

  return null
}
