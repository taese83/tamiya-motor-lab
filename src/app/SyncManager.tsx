import {useEffect, useRef} from 'react'

import {useQueryClient} from '@tanstack/react-query'

import {useSession} from '@features/auth'
import {pullServerData, pushServerData} from '@features/sync'
import {readDomainSnapshot, replaceDomainSnapshot} from '@shared/lib/persistence'

// 서버 동기화 오케스트레이션 (v2.40 Phase B). 세션 의존이라 app 계층이 소유(features 간 import 회피).
// - 로그인 시 1회: **서버 우선**. 서버에 데이터가 있으면 로컬을 서버 스냅샷으로 교체(로컬 대체).
//   서버가 비어 있으면 로컬을 서버로 시드 push(초기 로그인에서 로컬 데이터 유실 방지).
// - 도메인 mutation 성공 시(로그인 상태): 디바운스 후 로컬 전체 스냅샷을 서버로 mirror push(dual-write).
// 미로그인·로컬 정적 서버·오프라인에서는 pull/push가 조용히 no-op → 기존 IndexedDB 동작 그대로.

const PUSH_DEBOUNCE_MS = 800

export function SyncManager() {
  const {user} = useSession()
  const queryClient = useQueryClient()
  const syncedUserRef = useRef<string | null>(null)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userId = user?.id ?? null

  // 로그인 시 1회 서버 우선 동기화
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
        if (localHasData) await pushServerData(local) // 서버 비어있음 → 로컬 시드
      }
      await queryClient.invalidateQueries()
    })()
  }, [userId, queryClient])

  // 도메인 mutation 성공 → 디바운스 mirror push(로그인 상태만)
  useEffect(() => {
    const cache = queryClient.getMutationCache()
    const unsubscribe = cache.subscribe(event => {
      if (event.type !== 'updated' || event.mutation.state.status !== 'success') return
      if (userId === null) return
      if (pushTimerRef.current !== null) clearTimeout(pushTimerRef.current)
      pushTimerRef.current = setTimeout(() => {
        void (async () => {
          await pushServerData(await readDomainSnapshot())
        })()
      }, PUSH_DEBOUNCE_MS)
    })
    return () => {
      unsubscribe()
      if (pushTimerRef.current !== null) clearTimeout(pushTimerRef.current)
    }
  }, [queryClient, userId])

  return null
}
