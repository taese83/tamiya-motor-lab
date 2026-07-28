import {Box, Typography} from '@mui/material'
import {
  startCapture,
  stopCapture,
  resumeAudio,
  retryPermission,
  toggleSettingsHelp,
  useMeasureAnnouncement,
  useMeasureView,
} from '@features/measure-session/model'
import {MeasureActionDock, MeasureFigures} from '@features/measure-session/ui'
import {MeasureStatusLabel} from '@shared/ui/measure-status-label'
import {ThemeToggle} from '@shared/ui/theme-toggle'
import {useEffect} from 'react'
import {useNavigate} from 'react-router'

// ─────────────────────────────────────────────────────────────────────────────
// S1 측정 ('/') — layout-spec §4 3단 골격(Z1/Z2/Z3) 조립 (component-spec §1.4).
// 상태 6종 어느 전환에서도 존 높이·위치는 불변 — 바뀌는 것은 각 존 내부 내용뿐 (§4.1).
// store 직접 구독은 이 페이지만 (component-spec §2.1).
// ─────────────────────────────────────────────────────────────────────────────

// S1의 h1은 visually-hidden "측정" — Z1 상태 라벨이 heading을 대체하지 않는다 (layout-spec §1).
const visuallyHiddenSx = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const

export function MeasurePage() {
  const view = useMeasureView()
  const announcement = useMeasureAnnouncement()
  const navigate = useNavigate()

  // UX-A2: 라우트 이탈·백그라운드 전환 시 세션 종료 — stale 캡처 방지
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stopCapture()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stopCapture()
    }
  }, [])

  // H-5: handoff set은 세션이 stable 확정 전이 시점에 이미 수행(INV-14) —
  // 페이지 CTA는 이동만 한다 (중복 set 금지, confidence·capturedAt은 세션 소유)
  const handleCreateRecord = () => {
    if (view.status !== 'stable') return
    void navigate('/record/new')
  }

  // stable → 새 세션: 확정 잠금 해제 후 즉시 재캡처 (INV-14 slot clear는 dock 계약)
  const handleRemeasure = () => {
    stopCapture()
    void startCapture()
  }

  return (
    <Box
      sx={{
        px: 2,
        display: 'flex',
        flexDirection: 'column',
        // RootLayout <main>의 탭 바 예약 padding(56px + safe-area)을 제외한 세로 공간을
        // 가득 채워 Z1/Z2/Z3를 flex spacer(위 1 : 아래 1) 고정 비율로 배치한다 (layout-spec §4.1).
        minHeight: 'calc(100dvh - 56px - var(--mml-safe-bottom))',
      }}>
      <Typography component="h1" sx={visuallyHiddenSx}>
        측정
      </Typography>

      {/* 테마 토글 — S1 우상단 고정, 수치 영역 밖 (design-system v2 §7.3) */}
      <Box
        sx={{
          position: 'absolute',
          top: 'calc(8px + var(--mml-safe-top, 0px))',
          right: 8,
          zIndex: 1,
        }}>
        <ThemeToggle />
      </Box>

      {/* [Z1] 상태 라벨 존 — h 48px 고정 (라벨+색+아이콘 3요소 + sr 단일 채널) */}
      <Box sx={{height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <MeasureStatusLabel status={view.status} announcement={announcement} />
      </Box>

      <Box sx={{flex: 1}} />

      {/* [Z2] 수치 존 — 고정 높이(--s1-figure-h)는 MeasureFigures가 소유 (component-spec §2.4) */}
      <MeasureFigures view={view} />

      <Box sx={{flex: 1}} />

      {/* [Z3] 액션 존 — [A] h56 + [B] h44 슬롯 예약은 dock이 소유 (component-spec §2.5) */}
      <Box sx={{pb: 2}}>
        <MeasureActionDock
          view={view}
          onActivate={() => void startCapture()}
          onStop={stopCapture}
          onCreateRecord={handleCreateRecord}
          onRemeasure={handleRemeasure}
          onRetryPermission={() => void retryPermission()}
          onToggleSettingsHelp={toggleSettingsHelp}
          onResume={() => void resumeAudio()}
        />
      </Box>
    </Box>
  )
}
