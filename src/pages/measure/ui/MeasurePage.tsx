import {useEffect, useRef} from 'react'

import {Box, Typography} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {useNavigate, useOutletContext} from 'react-router'

import {motorQueries} from '@entities/motor'
import {MotorPickSheet, useCollectFlow} from '@features/collect-measure'
import {
  restartCaptureOnVisible,
  resumeAudio,
  retryPermission,
  startCapture,
  stopCapture,
  stopCaptureForHidden,
  toggleSettingsHelp,
  useMeasureAnnouncement,
  useMeasureView,
} from '@features/measure-session/model'
import {
  MeasureActionDock,
  MeasureFigures,
  PermissionHelpDialog,
  deriveMeasureAction,
} from '@features/measure-session/ui'
import {useCreateMotor} from '@features/motor-management/api'
import {MotorFormSheet} from '@features/motor-management/ui'
import {
  RaceMeasureStrip,
  useRaceAutoCollect,
  useRaceMeasureSlot,
} from '@features/race-measure-handoff'
import {srOnlySx} from '@shared/config/design-tokens'
import {MeasureStatusLabel} from '@shared/ui/measure-status-label'
import {ThemeToggle} from '@shared/ui/theme-toggle'

import type {MotorPickItem} from '@features/collect-measure'
import type {MeasureView} from '@features/measure-session/model'
import {MIN_MEASURE_DURATION_MS} from '@shared/config/domain'

import type {MotorKind} from '@shared/config/domain'
import type {PersistenceStatus} from '@shared/lib/persistence'

// ─────────────────────────────────────────────────────────────────────────────
// S1 측정 ('/') v2 — 자동 시작(M-1)·연속 측정(M-3) 3존 조립 (layout-spec v2 §4).
// Z1 상태 라벨 / Z2 수치 / Z3 단일 슬롯 액션 — 존 높이·위치는 상태 전환에도 불변(§4.1).
// [기록] 수집 플로우(M-5/M-6)는 @features/collect-measure, 레이스 왕복(RV-1)은
// @features/race-measure-handoff 소비 — store 직접 구독은 이 페이지만 (component-spec §2.1).
// ─────────────────────────────────────────────────────────────────────────────

// RootLayout Outlet context의 로컬 구조 선언 — pages는 app을 import할 수 없다
// (FSD, app/routes/Routes.tsx RootOutletContext와 동일 구조 유지).
interface ShellOutletContext {
  persistenceStatus: PersistenceStatus | null
  retryPersistence: () => void
  persistenceRetryPending: boolean
  resetPersistedData: () => Promise<boolean>
}

// view 7종 → MeasureStatusLabel(measureStatusTokens) 키 매핑 — MeasureFigures.statusTokenKey와
// 동일 규칙(component-spec v2 §2.3): starting·insecure·awaiting-gesture → 'idle'.
function statusLabelKey(
  view: MeasureView,
): 'idle' | 'measuring' | 'weak-signal' | 'no-permission' | 'suspended' {
  switch (view.status) {
    case 'starting':
    case 'insecure':
    case 'awaiting-gesture':
      return 'idle'
    default:
      return view.status
  }
}

export function MeasurePage() {
  const view = useMeasureView()
  const announcement = useMeasureAnnouncement()
  const navigate = useNavigate()
  const shell = useOutletContext<ShellOutletContext>()
  const persistenceReady = shell.persistenceStatus?.status === 'ready'

  // RV-1 왕복 slot — 존재 = 왕복 모드 (INV-21: [기록] 진입점 0개, deriveMeasureAction이 치환)
  const slot = useRaceMeasureSlot()

  // motor-deleted 복귀 대상 — useRaceAutoCollect가 slot을 파기한 **뒤** outcome이 도착하므로
  // slot이 살아 있는 동안 미리 잡아둔다(파기 후에는 origin을 알 수 없다).
  const deletedFallbackRef = useRef<'/race' | '/motors'>('/race')
  useEffect(() => {
    if (slot !== null) deletedFallbackRef.current = slot.origin === 'motor' ? '/motors' : '/race'
  })

  // M-1 자동 시작 + 이탈 종료 + visibilitychange 배선 (UX-A2 — 배선은 페이지 소유 계약)
  useEffect(() => {
    void startCapture()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stopCaptureForHidden()
      else void restartCaptureOnVisible()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stopCapture()
    }
  }, [])

  // RV-1 왕복 자동 확정 — slot 없으면 훅 내부 no-op. isStable은 UI 상태가 아니라 내부 신호(M-3):
  // 소비처는 이 트리거뿐이다. 성공/실패 모두 진입 화면으로 복귀(결과 표시는 그 화면 소유).
  // navigate(-1)은 origin 무관하게 동작한다 — 레이스 상세든 모터 상세든 직전 항목으로 돌아간다.
  // 측정 중 모터 삭제만 목록으로 replace 복귀하고, 이때 대상은 origin별로 갈린다(v2.5):
  // 삭제된 모터의 상세로 되돌아가면 not-found 화면에 착지하므로 각 origin의 목록으로 보낸다.
  useRaceAutoCollect({
    // v2.18: 왕복 자동 확정도 최소 측정시간 하한을 통과해야 한다. 이 경로를 빼면 레이스 왕복이
    // 여전히 '너무 빠른' 값을 자동 기록한다 — 요청의 핵심 문제가 그대로 남는다.
    isStable:
      view.status === 'measuring' && view.isStable && view.measuredMs >= MIN_MEASURE_DURATION_MS,
    panoHz: view.status === 'measuring' ? view.panoHz : null,
    rpm: view.status === 'measuring' ? view.rpm : null,
    onOutcome: outcome => {
      if (outcome.kind === 'motor-deleted') {
        // slot은 훅이 이미 파기했으므로 여기서는 소비 시점에 읽어둔 origin을 쓴다
        void navigate(deletedFallbackRef.current, {replace: true})
        return
      }
      void navigate(-1) // collected · collect-failed
    },
  })

  // M-5/M-6 [기록] 수집 플로우 — 왕복 모드에서는 진입점이 없어 시트도 렌더하지 않는다
  const flow = useCollectFlow()
  const createMotor = useCreateMotor()
  const summariesQuery = useQuery({
    ...motorQueries.summaries(),
    enabled: persistenceReady && slot === null,
  })
  const pickItems: MotorPickItem[] = (summariesQuery.data ?? []).map(summary => ({
    id: summary.motor.id,
    name: summary.motor.name,
    kind: summary.motor.kind,
    lastPanoHz: summary.lastMeasure?.panoHz ?? null,
  }))

  const action = deriveMeasureAction(
    view,
    slot === null ? null : {motorName: slot.motorName, origin: slot.origin},
    persistenceReady,
  )

  // [기록] 탭 시점 스냅샷 고정(SC2-A3·MR-2) — measuring 밖에서는 액션이 이미 disabled/치환
  const handleRecord = () => {
    if (view.status !== 'measuring') return
    flow.open({panoHz: view.panoHz, rpm: view.rpm})
  }

  // 행 이벤트는 id 기준 — 이름은 summaries에서 역참조해 flow에 전달 (토스트 문구 소유)
  const handlePickSelect = (motorId: string) => {
    const name = pickItems.find(item => item.id === motorId)?.name
    if (name === undefined) return
    flow.select(motorId, name)
  }

  // 모터 0개 → 등록 시트 교체(§3.2) — 등록 성공 시 그 모터로 즉시 수집
  const handleRegisterSubmit = (values: {name: string; kind: MotorKind}) => {
    createMotor.mutate(values, {
      onSuccess: motor => {
        flow.completeRegister({id: motor.id, name: motor.name})
      },
    })
  }

  const handleRegisterClose = () => {
    if (createMotor.isPending) return // single-flight — 저장 중 닫기 금지
    createMotor.reset()
    flow.cancelRegister()
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        // RootLayout <main>의 탭 바 예약 padding(56px + safe-area)을 제외한 세로 공간을
        // 가득 채워 Z1/Z2/Z3를 flex spacer(위 1 : 아래 1) 고정 비율로 배치한다 (layout-spec §4.1).
        minHeight: 'calc(100dvh - 56px - var(--mml-safe-bottom))',
      }}>
      {/* S1의 h1은 visually-hidden "측정" — Z1 상태 라벨이 heading을 대체하지 않는다 (layout-spec §1) */}
      <Typography component="h1" sx={srOnlySx}>
        측정
      </Typography>

      {/*
        v2.20 권한 안내 — 게이지를 가리는 인라인 Collapse에서 Dialog로 옮겼다.
        오버레이는 히어로 존이 아니라 페이지가 소유한다(존은 고정 높이 계약만 지킨다).
        열림 상태는 세션 store가 이미 들고 있어(settingsHelpOpen) 새 상태를 만들지 않았다.
      */}
      <PermissionHelpDialog
        open={view.status === 'no-permission' && view.permanent && view.settingsHelpOpen}
        onClose={toggleSettingsHelp}
      />

      {/* 왕복 모드 스트립 (component-spec §7.1) — slot 존재와 렌더가 동치(INV-21), 최상단 */}
      {slot !== null && <RaceMeasureStrip motorName={slot.motorName} origin={slot.origin} />}

      {/* 테마 토글 — S1 우상단 고정, 수치 영역 밖 (design-system §7.3 — 기존 패턴 승계) */}
      <Box
        sx={{
          position: 'absolute',
          top: 'calc(8px + var(--mml-safe-top, 0px))',
          right: 8,
          zIndex: 1,
        }}>
        <ThemeToggle />
      </Box>

      <Box sx={{px: 2, flex: 1, display: 'flex', flexDirection: 'column'}}>
        {/* [Z1] 상태 라벨 존 — h 48px 고정 (라벨+색+아이콘 3요소 + sr 단일 채널) */}
        <Box sx={{height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <MeasureStatusLabel status={statusLabelKey(view)} announcement={announcement} />
        </Box>

        <Box sx={{flex: 1}} />

        {/* [Z2] 수치 존 — 고정 높이는 MeasureFigures가 소유 (component-spec §2.4) */}
        <MeasureFigures view={view} />

        <Box sx={{flex: 1}} />

        {/* [Z3] 액션 존 — 단일 슬롯 h56, action은 deriveMeasureAction 순수 산출 (§2.7) */}
        <Box sx={{pb: 2}}>
          <MeasureActionDock
            action={action}
            onRecord={handleRecord}
            onActivate={() => void startCapture()}
            onRetryPermission={() => void retryPermission()}
            onToggleSettingsHelp={toggleSettingsHelp}
            onResume={() => void resumeAudio()}
            onBackToOrigin={() => void navigate(-1)}
          />
        </Box>
      </Box>

      {/* 수집 시트 2종 — 왕복 모드에서는 진입점 0개라 렌더 자체를 생략 (INV-21) */}
      {slot === null && (
        <>
          <MotorPickSheet
            open={flow.pickOpen}
            snapshot={flow.snapshot}
            motors={pickItems}
            pendingMotorId={flow.pendingMotorId}
            errorMessage={flow.errorMessage}
            onSelect={handlePickSelect}
            onRequestRegister={flow.requestRegister}
            onClose={flow.close}
          />
          <MotorFormSheet
            open={flow.registerOpen}
            mode="create"
            pending={createMotor.isPending}
            errorMessage={createMotor.isError ? createMotor.error.message : null}
            onSubmit={handleRegisterSubmit}
            onClose={handleRegisterClose}
          />
        </>
      )}
    </Box>
  )
}
