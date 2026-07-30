import {useEffect, useRef} from 'react'

import {useQueryClient} from '@tanstack/react-query'

import {useSession} from '@features/auth'
import {pullServerData, pushServerData} from '@features/sync'
import {readDomainSnapshot, replaceDomainSnapshot} from '@shared/lib/persistence'
import {subscribeServerSync} from '@shared/lib/sync-signal'

// 서버 동기화 오케스트레이션 (v2.40 Phase B → v2.x: 서버 DB 정본 통일).
// v2.x(사용자): **데이터는 서버 DB가 정본.** 로그인 시 서버에서 로드해 로컬(IndexedDB 캐시)을 채운다.
//  - 서버에 데이터가 있으면 **서버 우선**: 서버 스냅샷으로 로컬을 교체(replaceDomainSnapshot).
//  - 서버가 비어 있으면 **최초 1회 병합**: 현재 로컬을 서버로 시드 push(전환 시 로컬 데이터 보존).
// mutation 성공(로그인 상태) 시 로컬 전체 스냅샷을 서버로 디바운스 mirror push → 서버 정본 유지.
// 필터·정렬은 로컬(localStorage) 전용 — 서버 스냅샷 대상 아님.
// 미로그인·로컬 정적 서버·오프라인에서는 pull/push가 조용히 no-op → IndexedDB 동작 그대로.

const PUSH_DEBOUNCE_MS = 800

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
      const server = await pullServerData()
      if (server === null) return // 서버리스/DB 미가용 — skip(기존 로컬 유지)
      const serverHasData =
        server.motors.length > 0 || server.measures.length > 0 || server.races.length > 0
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
