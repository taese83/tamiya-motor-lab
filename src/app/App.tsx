import {CssBaseline} from '@mui/material'
import {ThemeProvider} from '@mui/material/styles'
import {QueryClient, QueryClientProvider, QueryErrorResetBoundary} from '@tanstack/react-query'
import {ErrorBoundary} from 'react-error-boundary'

import {AppRouterProvider} from '@app/providers/RouterProvider'
import {RootErrorFallback} from '@app/routes'
import {theme} from '@app/theme'

// AD-4a 로컬 store 특화 정책 (api-schema.md §6.1 — 값 고정, 변경 금지).
// project-init QUERY_CLIENT 템플릿의 AppError/HTTP retry 로직은 해당 없음 — HTTP 경계가 없고
// 유일한 데이터원은 IndexedDB다. 오프라인에서도 전 query 정상 동작이 수용 기준.
// NOTE: api-schema §9는 최종 위치를 src/app/providers/query-client.ts로 지정한다(app F9 담당).
// 해당 파일이 생성되면 이 인라인 정의를 제거하고 import로 교체한다.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always', // 기본 'online'은 오프라인에서 IndexedDB 쿼리를 pause — 로컬 데이터에 치명
      staleTime: Infinity, // 데이터 변경 경로는 자체 command뿐 — mutation 후 명시 invalidate가 유일한 갱신
      retry: false, // IndexedDB 오류에 자동 재시도 무의미 — 명시 [다시 시도] 버튼이 refetch
      refetchOnWindowFocus: false,
    },
    mutations: {networkMode: 'always', retry: false},
  },
})

// 프로바이더 조립 (layout-spec §2.3): ThemeProvider(+CssBaseline — safe-area 변수·focus ring·
// reduced-motion의 원천, 디자인 §8 이식 주의) → QueryClientProvider → 최상위 ErrorBoundary →
// RouterProvider. 라우트 내부 렌더 crash는 route ErrorBoundary(RootErrorFallback)가 먼저 잡고,
// 이 최상위 경계는 프로바이더·라우터 초기화 crash를 커버한다. 동일 fallback([새로고침] = 전체
// 리로드)이므로 query 캐시도 함께 초기화되며, onReset은 QueryErrorResetBoundary와 연결해 둔다.
export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <QueryErrorResetBoundary>
          {({reset}) => (
            <ErrorBoundary FallbackComponent={RootErrorFallback} onReset={reset}>
              <AppRouterProvider />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
