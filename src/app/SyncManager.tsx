import {useEffect, useRef} from 'react'

import {useQueryClient} from '@tanstack/react-query'

import {useSession} from '@features/auth'
import {pushServerData} from '@features/sync'
import {readDomainSnapshot} from '@shared/lib/persistence'

// 서버 동기화 오케스트레이션 (v2.40 Phase B → v2.x 개정).
// v2.x(사용자): **로그인 시 서버-우선 마이그레이션 제거.** 이전에는 로그인 시 서버 스냅샷으로
// 로컬 IndexedDB를 replaceDomainSnapshot으로 덮어썼는데(서버 우선), 이게 로컬 측정 데이터를
// 예상 밖으로 대체하는 문제가 있어 제거한다. 이제 **로컬이 진실**이고 로그인이 로컬을 건드리지
// 않는다. 서버는 아래 mutation mirror push로 로컬을 따라가는 백업(미러)일 뿐이다.
// - 도메인 mutation 성공 시(로그인 상태): 디바운스 후 로컬 전체 스냅샷을 서버로 mirror push.
// 미로그인·로컬 정적 서버·오프라인에서는 push가 조용히 no-op → IndexedDB 동작 그대로.

const PUSH_DEBOUNCE_MS = 800

export function SyncManager() {
  const {user} = useSession()
  const queryClient = useQueryClient()
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userId = user?.id ?? null

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
