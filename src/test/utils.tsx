import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import type {ReactNode} from 'react'

// AD-4a 로컬 store 특화 정책을 테스트 클라이언트에도 동일 적용한다:
// - networkMode 'always': 기본 'online'은 오프라인에서 IndexedDB 쿼리를 pause시킨다
// - staleTime Infinity: 데이터 변경 경로가 자체 command뿐 — mutation 후 명시 invalidate
// - retry false: IndexedDB 오류는 자동 재시도 무의미 (명시 재시도 = refetch)
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {retry: false, networkMode: 'always', staleTime: Infinity},
      mutations: {retry: false, networkMode: 'always'},
    },
  })

export const createWrapper = () => {
  const queryClient = createTestQueryClient()
  return ({children}: {children: ReactNode}) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
