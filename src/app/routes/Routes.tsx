import {useCallback, useEffect, useRef, useState} from 'react'

import {BottomNavigation, BottomNavigationAction, Box, Button, Typography} from '@mui/material'
import {useQueryClient} from '@tanstack/react-query'
import {
  createBrowserRouter,
  Link,
  Outlet,
  redirect,
  ScrollRestoration,
  useLocation,
  useMatches,
  useNavigate,
} from 'react-router'

import {layoutTokens, motionTokens} from '@app/theme'
import {measureRecordSchema} from '@entities/measure-record'
import {motorSchema} from '@entities/motor'
import {raceRecordSchema} from '@entities/race-record'
import {cancelRaceMeasure} from '@features/race-measure-handoff'
import {config} from '@shared/config'
import {getPersistenceStatus, initPersistence, resetAllData} from '@shared/lib/persistence'
import {MicIcon} from '@shared/ui/icons'
import {StatusBanner} from '@shared/ui/status-banner'
import {ToastHost} from '@shared/ui/toast'

import type {PersistenceStatus} from '@shared/lib/persistence'
import type {IconProps} from '@shared/ui/icons'
import type {ReactElement} from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// layout-spec v2 §2 라우팅 계약 구현 — 측정('/')·모터('/motors')·모터 상세
// ('/motors/:motorId' 스택 — 버그 리포트 #2로 재도입)·레이스('/race')·
// 레이스 상세('/race/:motorId' 스택)·'/guide' → '/race' redirect·'*' 404.
// v2 제거 라우트: '/record/new'(S2 폐지 — [기록] 수집 팝업으로 대체).
// 문서상 파일 배치는 app/routes/router.tsx + app/layouts/* + app/ui/*지만, 본 하네스의
// ownership 경계상 라우팅은 이 파일(Routes.tsx)에 둔다 — RootLayout·RootErrorFallback·
// BottomTabBar·GlobalPersistenceBanner도 여기에 함께 있다.
// persistence 부팅(initPersistence + zod 스캔 검증 주입)·3-상태 배너·복구 command는
// RootLayout이 소유하고, 페이지에는 Outlet context(RootOutletContext)로 전달한다 —
// pages는 app을 import할 수 없으므로(FSD) useOutletContext가 유일한 전달 경로다.
// ─────────────────────────────────────────────────────────────────────────────

// handle 메타 — document.title·하단 탭 활성을 결정한다 (layout-spec §2.3).
// v2: hideTabBar 폐지 — 전 화면이 탭 바를 유지한다 ('/record/new' 제거).
export interface RouteHandle {
  title: string
  tab?: 'measure' | 'motors' | 'race' // 하단 탭 활성 매핑 (prefix 아님 — handle이 명시)
}

/**
 * RootLayout → 페이지 Outlet context 계약.
 * pages는 이 타입을 import할 수 없어(FSD: pages→app 금지) 동일 구조 인터페이스를
 * 각 페이지에 로컬 선언해 소비한다 — 필드 변경 시 소비 페이지들과 동시 갱신할 것.
 */
export interface RootOutletContext {
  /** 마지막 initPersistence 결과 — null이면 부팅 init 진행 중(Outlet 게이트로 페이지 미렌더) */
  persistenceStatus: PersistenceStatus | null
  /** RecoveryPanel [다시 시도] — initPersistence 재실행, ready 전환 시 활성 query 재조회 */
  retryPersistence: () => void
  persistenceRetryPending: boolean
  /** RecoveryPanel.onResetAllData 계약 — resetAllData 성공 시 queryClient.clear() 후 true */
  resetPersistedData: () => Promise<boolean>
}

// 부팅 full-scan 의미 검증기 주입 (SC-A9 · AD-7) — rehydrate(read-lenient) 스키마 3종.
// shared/lib/persistence는 entities를 import할 수 없어 app 부트스트랩이 주입한다.
const SCAN_VALIDATION = {
  motor: motorSchema,
  measureRecord: measureRecordSchema,
  raceRecord: raceRecordSchema,
}

// [G] 전역 배너 (layout-spec §8) — persistence 3-상태. 부팅 시 1회 결정되는 지속형 배너 —
// 'ready'/init 진행 중(null)이면 null. corrupt의 복구 진입점은 데이터 화면 본문 RecoveryPanel.
function GlobalPersistenceBanner({status}: {status: PersistenceStatus | null}) {
  const navigate = useNavigate()
  if (status === null || status.status === 'ready') return null
  if (status.status === 'unavailable') {
    return (
      <StatusBanner
        tone="warning"
        message="저장소를 사용할 수 없습니다 — 측정은 가능하지만 기록 저장·조회가 되지 않습니다"
      />
    )
  }
  // corrupted — 복구 옵션(RecoveryPanel)은 데이터 화면 본문에 있다 (layout-spec §8)
  return (
    <StatusBanner
      tone="error"
      message="저장된 데이터를 읽을 수 없습니다"
      actionLabel="복구 옵션"
      onAction={() => {
        void navigate('/motors')
      }}
    />
  )
}

// shared/ui/icons 인벤토리에 없는 탭 아이콘 2종 — icons/icons.tsx 규격(24×24 viewBox,
// currentColor, aria-hidden — 의미 전달은 병행 라벨 담당)을 그대로 따르는 소비자 로컬 정의.
// shared/ui/icons 승격 시 이 정의를 제거하고 import로 교체한다 (icons.tsx 주석 계약).
function ListIcon({size = 24}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor">
      <path d="M3 13h2v-2H3zm0 4h2v-2H3zm0-8h2V7H3zm4 4h14v-2H7zm0 4h14v-2H7zM7 7v2h14V7z" />
    </svg>
  )
}

function BoltIcon({size = 24}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor">
      <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z" />
    </svg>
  )
}

// v2 탭 3종 — 측정(mic)·모터(list)·레이스(bolt) (design-system §9)
const TAB_ITEMS = [
  {key: 'measure', label: '측정', to: '/', Icon: MicIcon},
  {key: 'motors', label: '모터', to: '/motors', Icon: ListIcon},
  {key: 'race', label: '레이스', to: '/race', Icon: BoltIcon},
] as const satisfies readonly {
  key: NonNullable<RouteHandle['tab']>
  label: string
  to: string
  Icon: (props: IconProps) => ReactElement
}[]

// [N] 하단 탭 바 (component-spec §1.4 BottomTabBar) — 아이콘+라벨 병행(mic/list/bolt),
// showLabels로 비활성 탭 라벨도 상시 노출한다 (아이콘 단독 구분 금지).
// 탭 클릭 = 왕복 파기 계약(RV-1): 왕복 중 하단 탭 이탈이면 slot을 파기한다 —
// cancelRaceMeasure는 멱등이라 slot이 없으면 no-op (조건 분기 불요).
function BottomTabBar({active}: {active?: RouteHandle['tab']}) {
  return (
    <Box
      component="nav"
      aria-label="주요"
      sx={{position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 'appBar', bgcolor: 'background.paper'}}>
      <BottomNavigation
        value={active ?? false}
        showLabels
        sx={{maxWidth: layoutTokens.contentMaxWidth, mx: 'auto'}}>
        {TAB_ITEMS.map(item => (
          <BottomNavigationAction
            key={item.key}
            value={item.key}
            label={item.label}
            icon={<item.Icon size={24} />}
            component={Link}
            to={item.to}
            onClick={() => {
              cancelRaceMeasure()
            }}
            aria-current={active === item.key ? 'page' : undefined}
          />
        ))}
      </BottomNavigation>
    </Box>
  )
}

// 렌더 crash 전용 패널 (component-spec §1.4 RootErrorFallback / layout-spec §1) —
// [G/H/N] 골격 없이 전용 패널만. persistence·IndexedDB 실패는 여기로 오지 않는다
// (Result 값으로 전파 → layout-spec §8 복구 패널이 처리, crash loop 금지).
// prop 없는 컴포넌트 — react-router route ErrorBoundary와 react-error-boundary
// FallbackComponent 양쪽에서 그대로 사용 가능하다.
export function RootErrorFallback() {
  return (
    <Box
      role="alert"
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        px: 2,
        textAlign: 'center',
      }}>
      <Typography variant="h1" component="h1">
        문제가 발생했습니다
      </Typography>
      {/* [새로고침] = 전체 리로드 — 앱 상태·query 캐시가 처음부터 다시 초기화된다 */}
      <Button
        variant="contained"
        size="large"
        sx={{minWidth: 220}}
        onClick={() => {
          window.location.reload()
        }}>
        새로고침
      </Button>
    </Box>
  )
}

// 글로벌 레이아웃 (layout-spec §1/§2.3): skip link → [G] 전역 배너 → <main> Outlet → [N] 탭 바.
// header([H])는 각 페이지가 소유한다 (S1은 상태 라벨 존이 겸함).
// ToastHost(성공 토스트 단일 host — component-spec §3.9)를 여기 1곳에 mount한다.
export function RootLayout() {
  const matches = useMatches()
  const location = useLocation()
  const handle = matches.at(-1)?.handle as RouteHandle | undefined
  const title = handle?.title

  // document.title = 마지막 match의 handle.title + ' — {VITE_APP_TITLE}' (layout-spec §2.2)
  useEffect(() => {
    document.title = title ? `${title} — ${config.appTitle}` : config.appTitle
  }, [title])

  // ── persistence 부팅·복구 (REQ-F-007 / layout-spec §8) ──────────────────────
  const queryClient = useQueryClient()
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus | null>(() =>
    getPersistenceStatus(),
  )
  // RV-3 recreated 1회성 고지 — Toast는 showSuccess 전용(성공 확인)이라 부적합,
  // StatusBanner를 부팅 1회 노출하고 [닫기]로 해제한다 (지속형 3-상태 배너와 별개).
  const [recreatedNoticeOpen, setRecreatedNoticeOpen] = useState(false)
  const [retryPending, setRetryPending] = useState(false)
  const retryInFlightRef = useRef(false)

  // 부팅 1회 init — throw 없음(항상 상태값 수렴). init 완료 전에는 Outlet을 게이트해
  // 페이지 query가 storage-unavailable로 헛발 실패하는 부팅 경쟁을 차단한다.
  useEffect(() => {
    let cancelled = false
    void initPersistence({validation: SCAN_VALIDATION}).then(status => {
      if (cancelled) return
      setPersistenceStatus(status)
      if (status.status === 'ready' && status.detail === 'recreated') setRecreatedNoticeOpen(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // RecoveryPanel [다시 시도] — 멱등 재호출 (unavailable/corrupted는 캐시되지 않아 재실행)
  const retryPersistence = useCallback(() => {
    if (retryInFlightRef.current) return
    retryInFlightRef.current = true
    setRetryPending(true)
    void (async () => {
      try {
        const status = await initPersistence()
        setPersistenceStatus(status)
        // ready 전환 시 오류로 정착한 활성 query를 초기화·재조회한다
        if (status.status === 'ready') await queryClient.resetQueries()
      } finally {
        retryInFlightRef.current = false
        setRetryPending(false)
      }
    })()
  }, [queryClient])

  // RecoveryPanel.onResetAllData 계약 — 성공 시에만 전체 query 캐시 clear(reset.ts 주석 계약).
  // 성공 토스트("초기화되었습니다")는 호출 페이지 소유(useToast).
  const resetPersistedData = useCallback(async (): Promise<boolean> => {
    const result = await resetAllData()
    setPersistenceStatus(getPersistenceStatus())
    if (!result.ok) return false
    queryClient.clear()
    return true
  }, [queryClient])

  const outletContext: RootOutletContext = {
    persistenceStatus,
    retryPersistence,
    persistenceRetryPending: retryPending,
    resetPersistedData,
  }

  return (
    <ToastHost>
      {/* skip link — 첫 tabbable, 평시 화면 밖·focus 시에만 표시 */}
      <Box
        component="a"
        href="#main"
        sx={{
          position: 'fixed',
          top: `calc(${layoutTokens.safeAreaTop} + 8px)`,
          left: 8,
          zIndex: 'tooltip',
          px: 2,
          py: 1,
          bgcolor: 'background.paper',
          color: 'primary.main',
          borderRadius: 1,
          transform: 'translateY(calc(-100% - 24px))',
          '&:focus-visible': {transform: 'none'},
        }}>
        본문으로 건너뛰기
      </Box>
      <GlobalPersistenceBanner status={persistenceStatus} />
      {recreatedNoticeOpen && (
        <StatusBanner
          tone="warning"
          message="앱 데이터 형식이 바뀌어 저장소를 새로 준비했습니다 — 이전 기록은 초기화되었습니다"
          actionLabel="닫기"
          onAction={() => {
            setRecreatedNoticeOpen(false)
          }}
        />
      )}
      <Box
        component="main"
        id="main"
        sx={{
          maxWidth: layoutTokens.contentMaxWidth,
          mx: 'auto',
          minHeight: '100dvh',
          // 탭 바(fixed) 높이 예약 — v2는 전 화면 탭 바 유지 (hideTabBar 폐지)
          pb: `calc(${layoutTokens.bottomNavHeight}px + ${layoutTokens.safeAreaBottom})`,
        }}>
        {/*
          OPTION-M1 페이지 전환 페이드 — pathname key로 wrapper를 리마운트해 enter 페이드 1회.
          토큰 관례(motionTokens.enterMs — OPTION-M1 페이드 지정 토큰)·easeStandard,
          prefers-reduced-motion: reduce면 애니메이션 없음(즉시 표시).
        */}
        <Box
          key={location.pathname}
          sx={{
            '@keyframes mml-route-fade': {
              from: {opacity: 0},
              to: {opacity: 1},
            },
            animation: `mml-route-fade ${motionTokens.enterMs}ms ${motionTokens.easeStandard} both`,
            '@media (prefers-reduced-motion: reduce)': {animation: 'none'},
          }}>
          {/* 부팅 init 완료 전(null)에는 페이지를 렌더하지 않는다 — full-scan 예산 <500ms */}
          {persistenceStatus !== null && <Outlet context={outletContext} />}
        </Box>
      </Box>
      <BottomTabBar active={handle?.tab} />
      <ScrollRestoration />
    </ToastHost>
  )
}

// 라우팅 맵 (layout-spec v2 §2.1/§2.3 — 본 테이블이 계약 전체).
// - 각 페이지 모듈은 lazy route 규약으로 Component를 named export 한다:
//   `export {MeasurePage as Component}` (layout-spec §2.3).
// - 라우트 분할 경계는 페이지 모듈 단위가 전부다 — 임의 분할 금지.
// - loader 미사용('/guide' redirect 제외) — 읽기는 전부 react-query가 페이지 내부 소유,
//   라우터는 내비게이션만 담당한다 (layout-spec §0).
// - '/race/:motorId'의 미존재 id는 라우트 404가 아니라 화면 내 in-place 처리 — '*' splat은
//   진짜 미등록 경로 전용이며 URL을 보존한 채 제자리 렌더한다.
export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    // 렌더 crash 전용 — persistence 실패는 값으로 전파되어 §8 복구 패널이 처리
    ErrorBoundary: RootErrorFallback,
    children: [
      {
        index: true, // S1 측정 (자동 시작·연속 측정 v2)
        lazy: () => import('@pages/measure'),
        handle: {title: '측정', tab: 'measure'} satisfies RouteHandle,
      },
      {
        path: 'motors', // 모터 목록·관리
        lazy: () => import('@pages/motors'),
        handle: {title: '모터', tab: 'motors'} satisfies RouteHandle,
      },
      {
        path: 'motors/:motorId', // 모터 상세 (스택) — 모터 탭 활성 유지, 미존재 id는 in-place 처리
        lazy: () => import('@pages/motor-detail'),
        handle: {title: '모터 상세', tab: 'motors'} satisfies RouteHandle,
      },
      {
        path: 'race', // 레이스 진입 목록
        lazy: () => import('@pages/race'),
        handle: {title: '레이스', tab: 'race'} satisfies RouteHandle,
      },
      {
        path: 'race/:motorId', // 레이스 상세 (스택) — 레이스 탭 활성 유지
        lazy: () => import('@pages/race-detail'),
        handle: {title: '레이스 기록', tab: 'race'} satisfies RouteHandle,
      },
      {
        // 구 '/guide' 진입(북마크 등) — 레이스로 흡수 (Component 없음, 항상 redirect)
        path: 'guide',
        loader: () => redirect('/race'),
      },
      {
        path: '*', // 클라이언트 404 — 탭 바 유지(활성 탭 없음), URL 보존
        lazy: () => import('@pages/not-found'),
        handle: {title: '페이지를 찾을 수 없음'} satisfies RouteHandle,
      },
    ],
  },
])
