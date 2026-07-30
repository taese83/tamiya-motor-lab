import {CssBaseline} from '@mui/material'
import {ThemeProvider, useColorScheme} from '@mui/material/styles'
import {QueryClient, QueryClientProvider, QueryErrorResetBoundary} from '@tanstack/react-query'
import {useEffect} from 'react'
import {ErrorBoundary} from 'react-error-boundary'

import {AppRouterProvider} from '@app/providers/RouterProvider'
import {RootErrorFallback} from '@app/routes'
import {SyncManager} from '@app/SyncManager'
import {theme} from '@app/theme'
import {themeColorMeta} from '@shared/config/design-tokens'

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
// 토글 시 문서 레벨 동기화 (design-system v2 §7.2-4):
// 1) <html data-mui-color-scheme> — MUI 7.3이 이 속성을 스스로 갱신하지 않는 것이 관찰됨.
//    커스텀 상태 변수(--mml-status-*)와 index.html 부팅 스크립트가 이 속성에 결속되므로 앱이 동기화한다.
// 2) <meta name="theme-color"> — hex는 design-tokens export(themeColorMeta) 경유(hex 금지 규칙 유지).
function ThemeColorMetaSync() {
  const {mode} = useColorScheme()
  useEffect(() => {
    if (mode !== 'dark' && mode !== 'light') return
    document.documentElement.setAttribute('data-mui-color-scheme', mode)
    document.documentElement.style.removeProperty('background-color') // 부팅 인라인 fallback 해제 — CssBaseline이 승계
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColorMeta[mode])
  }, [mode])
  return null
}

export function App() {
  return (
    // 다크 기본 + 라이트 토글 (v2 §7): modeStorageKey는 index.html 부팅 스크립트의
    // localStorage 키('mml-mode-2')와 문자열 결속 — 변경 시 index.html 부팅 스크립트와 동시 수정.
    // 키 v2: 초기화 버그 시절 기기의 잔존 light 값 무효화 (실기기 피드백 — 다크 재시작).
    <ThemeProvider theme={theme} defaultMode="dark" modeStorageKey="mml-mode-2" disableTransitionOnChange noSsr>
      <CssBaseline />
      <ThemeColorMetaSync />
      <QueryClientProvider client={queryClient}>
        {/* v2.40 Phase B — 로그인 시 서버 우선 동기화 + mutation mirror push (미로그인/로컬은 no-op) */}
        <SyncManager />
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
