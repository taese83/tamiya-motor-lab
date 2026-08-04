import {useEffect, useRef, useState} from 'react'

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {useNavigate, useOutletContext, useParams} from 'react-router'

import {measureQueries} from '@entities/measure-record'
import {motorQueries} from '@entities/motor'
import {
  computeRaceInsight,
  raceQueries,
  selectAdviceWindow,
  selectGoalRecommendation,
  selectPrerunChecklist,
  selectRaceAnalysisGate,
} from '@entities/race-record'
import {AuthMenu, useSession} from '@features/auth'
import {beginRaceMeasure, consumeRaceMeasureReturn} from '@features/race-measure-handoff'
import {
  useRaceAnalysis,
  useRaceDeleteFlow,
  useRaceEntry,
  useResetRecordsFlow,
} from '@features/race-record/model'
import {
  RaceAnalysisCard,
  RaceEntrySheet,
  RaceGoalSheet,
  RaceInsightCard,
  RaceInsightHelpDialog,
  RaceRecordRow,
  ResetRecordsBlock,
} from '@features/race-record/ui'
import {layoutTokens} from '@shared/config/design-tokens'
import {formatDateTimeShort} from '@shared/lib/format'
import {assignExponentialWeights} from '@shared/lib/voltage-advisor'
import {ConfirmDialog} from '@shared/ui/confirm-dialog'
import {useSingleOpenRow} from '@shared/ui/swipe-actions'
import {EmptyState} from '@shared/ui/empty-state'
import {PageHeader} from '@shared/ui/page-header'
import {RecoveryPanel} from '@shared/ui/recovery-panel'
import {ThemeToggle} from '@shared/ui/theme-toggle'
import {useToast} from '@shared/ui/toast'

import type {RaceAnalysisGateReason, RaceRecord} from '@entities/race-record'
import type {RaceMeasureDraft} from '@features/race-measure-handoff'
import type {RaceAnalysisView, RaceEntryDraft, RaceEntryPano} from '@features/race-record/ui'
import type {RaceGoal} from '@shared/config/domain'
import type {VoltageAdviceRace} from '@shared/lib/voltage-advisor'
import type {PersistenceStatus} from '@shared/lib/persistence'

// ─────────────────────────────────────────────────────────────────────────────
// S6 모터별 레이스 기록 ('/race/:motorId', 스택 push) — layout-spec v2 §6.2·§6.3.
// 조립 계약: PageHeader(←/모터명/+기록) + RaceRecordRow 목록(최신순 — 회차 번호 내림차순)
// + RaceEntrySheet(useRaceEntry 전개) + useRaceDeleteFlow(ConfirmDialog).
// [측정] 왕복(RV-1): onMeasure → beginRaceMeasure + navigate('/'), mount 시
// consumeRaceMeasureReturn() → restoreFromMeasureReturn 복원(§7.2).
// 미존재 motorId는 라우트 404가 아니라 in-place EmptyState (layout-spec §2.2).
// ─────────────────────────────────────────────────────────────────────────────

// RootLayout Outlet context의 로컬 구조 선언 — pages는 app을 import할 수 없다
// (FSD, app/routes/Routes.tsx RootOutletContext와 동일 구조 유지).
interface ShellOutletContext {
  persistenceStatus: PersistenceStatus | null
  retryPersistence: () => void
  persistenceRetryPending: boolean
  resetPersistedData: () => Promise<boolean>
}

// ── v2.24 고정 셸 (req8: [레이스 기록 초기화]를 하단 고정) ─────────────────────
// 모터 상세(MotorDetailPage)의 [측정] 하단 고정과 동일 패턴: 페이지를 뷰포트에 고정하고
// 기록 목록만 스크롤, 초기화 버튼은 하단에 고정한다. 이전에는 초기화가 목록 흐름 맨 끝에 있어
// 기록이 많으면 스크롤을 끝까지 내려야 보였다. 높이 계산은 MotorDetailPage와 동일(탭 바 예약분 제외).
const pageShellSx = {
  display: 'flex',
  flexDirection: 'column',
  height: `calc(100dvh - ${layoutTokens.bottomNavHeight}px - ${layoutTokens.safeAreaBottom})`,
} as const

const scrollAreaSx = {
  px: 2,
  py: 2,
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehaviorY: 'contain',
} as const

// ── R49 인사이트 카드 고정 블록 ─────────────────────────────────────────────
// 상단 인사이트 카드를 스크롤 영역 밖으로 빼 고정한다(회차 목록만 스크롤). 모터 상세
// (MotorDetailPage) fixedTopSx와 동일 관례: flexShrink 0으로 셸 상단에 붙이고 좌우/상단
// 패딩은 스크롤 영역과 맞춘다. AI 분석 카드(가변 높이·확장형)는 이 고정 대상이 아니라
// 스크롤 영역에 남는다 — 펼치면 뷰포트를 크게 먹어 고정에 부적합하다.
const fixedInsightSx = {
  px: 2,
  pt: 2,
  pb: 1,
  flexShrink: 0,
} as const

// 하단 고정 초기화 도크 — 모터 상세 [측정] 푸터와 동일 배치·헤어라인. 버튼 색은 파괴 톤을
// 유지한다(측정=라임 primary와 동일 색을 쓰면 전체 초기화가 안전한 주 행동으로 오독된다 —
// 위치·크기만 통일, 톤은 error outlined 유지가 req8의 안전한 해석).
const footerSx = {
  px: 2,
  py: 1.5,
  flexShrink: 0,
  borderTop: '1px solid',
  borderTopColor: 'divider',
} as const

// ── 왕복 draft 매핑 — slot(수치형 RaceMeasureDraft) ↔ 폼(원시 문자열 RaceEntryDraft) ──
// slot 계약이 수치형이라 파싱 불가한 원시 입력(비수치 문자열)은 왕복 시 보존되지 않는다.

/** 폼 draft → handoff slot draft (beginRaceMeasure 입력) — 파싱 가능한 값만 이관 */
function toHandoffDraft(draft: RaceEntryDraft): RaceMeasureDraft {
  const voltageRaw = draft.voltageRaw.trim()
  const lapTimeRaw = draft.lapTimeRaw.trim()
  const voltage = Number(voltageRaw)
  const lapTimeSec = Number(lapTimeRaw)
  return {
    ...(draft.result !== null ? {result: draft.result} : {}),
    ...(voltageRaw !== '' && Number.isFinite(voltage) ? {voltage} : {}),
    ...(lapTimeRaw !== '' && Number.isFinite(lapTimeSec) ? {lapTimeSec} : {}),
    ...(draft.goal !== null ? {goal: draft.goal} : {}), // v2.31 목표 보존
    ...(draft.retireReason !== null ? {retireReason: draft.retireReason} : {}), // R20 이탈 사유 보존
  }
}

/** handoff slot draft → 폼 draft (복귀 복원) — 수치를 원시 문자열로 되돌린다 */
function fromHandoffDraft(draft: RaceMeasureDraft): RaceEntryDraft {
  return {
    result: draft.result ?? null,
    voltageRaw: draft.voltage !== undefined ? String(draft.voltage) : '',
    lapTimeRaw: draft.lapTimeSec !== undefined ? String(draft.lapTimeSec) : '',
    goal: draft.goal ?? null, // v2.31 — 왕복 복귀 시 목표 복원
    retireReason: draft.retireReason ?? null, // R20 — 왕복 복귀 시 이탈 사유 복원
  }
}

// R25 U6 — 게이트 사유 → [AI 분석] 비활성 caption(component-spec race-ai §5, 문구 소유는 UI측).
// empty는 인사이트 카드 자체가 null(미노출)이라 이 문구에는 도달하지 않는다 — 방어 매핑만 유지.
const ANALYZE_GATE_MESSAGES: Record<RaceAnalysisGateReason, string | null> = {
  empty: null,
  insufficient: '기록 3건부터 분석할 수 있어요',
  no_retire_reasons: '이탈 사유를 입력하면 분석할 수 있어요',
}

export function RaceDetailPage() {
  const {motorId = ''} = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const shell = useOutletContext<ShellOutletContext>()
  const corrupted = shell.persistenceStatus?.status === 'corrupted'
  // v2.43 — 레이스는 로그인 필수. 비로그인이면 본문·+기록을 게이트한다(로컬 정적 서버는 미로그인 수렴).
  const {user, isPending: sessionPending} = useSession()
  const loggedIn = user !== null
  const gated = !sessionPending && !loggedIn

  // 부재는 정상 도메인 결과(null) — in-place not-found로 분기 (layout-spec §2.2).
  // 비로그인(gated)이면 본문을 렌더하지 않으므로 도메인 조회도 걸지 않는다.
  const motorQuery = useQuery({...motorQueries.detail(motorId), enabled: !corrupted && loggedIn})
  const racesQuery = useQuery({...raceQueries.byMotor(motorId), enabled: !corrupted && loggedIn})
  // 파노 자동 인용(R-3①) — byMotor(asc) 마지막 요소 파생, 전용 query 신설 금지 (AR-5)
  const measuresQuery = useQuery({...measureQueries.byMotor(motorId), enabled: !corrupted && loggedIn})
  const motor = motorQuery.data ?? null

  const lastMeasure = measuresQuery.data?.at(-1)
  const initialPano: RaceEntryPano =
    lastMeasure !== undefined ? {kind: 'auto', panoHz: lastMeasure.panoHz} : {kind: 'none'}

  const entry = useRaceEntry(motorId, initialPano)
  const resetFlow = useResetRecordsFlow(motorId) // v2.3 — 모터별 [레이스 기록 초기화] (상세 하단)
  const deleteFlow = useRaceDeleteFlow()
  // v2.16 스와이프 트레이 — "한 번에 한 행만"을 페이지가 소유한다
  const swipe = useSingleOpenRow()

  // v2.31 — 목표 팝업 오케스트레이션. 2번째+ 입력이면 [+ 기록]이 목표 팝업을 먼저 띄우고,
  // 목표 선택 시 과거 레이스(최신순)+현재 파노로 하이브리드 전압 추천을 걸어 시트를 연다.
  // 첫 기록(과거 0건)은 근거로 삼을 정보가 없어 목표 없이 바로 시트를 연다.
  const races = racesQuery.data ?? []
  const [goalSheetOpen, setGoalSheetOpen] = useState(false)
  // R22 레이스 인사이트 — racesQuery 파생(표시 전용, 새 행동 진입점 아님). 도움말 열림은 페이지 소유.
  const insight = computeRaceInsight(races)
  // R30 — 자동 입력 파생(결정론·동기, DL-036). 저장 없음: 추천은 표시만, 체크리스트는 ephemeral.
  const goalRecommendation = selectGoalRecommendation(races, insight)
  const prerunChecklist = selectPrerunChecklist(races)
  const [insightHelpOpen, setInsightHelpOpen] = useState(false)
  // R25 U6 — AI 분석: 결정론 게이트(호출 차단) + 상태기계 훅 + 카드 뷰 사상(배선만 페이지 소유)
  const analysisGate = selectRaceAnalysisGate(races, insight)
  const analysis = useRaceAnalysis()
  // 버튼 disabled와 이중 게이트 — 탭 시점 파생값으로 방어 재확인 후 최신 races·insight로 요청
  const handleAnalyze = (): void => {
    if (!analysisGate.eligible) return
    analysis.analyze({races, insight})
  }
  const analyzeDisabledReason = analysisGate.eligible
    ? null
    : ANALYZE_GATE_MESSAGES[analysisGate.reason]
  // 훅 상태 → RaceAnalysisCard 뷰(§5) — success는 verdict로 분기, idle·첫 loading은 null(미렌더)
  const analysisView: RaceAnalysisView | null =
    analysis.state.phase === 'success'
      ? analysis.state.data.verdict === 'ok'
        ? {kind: 'success', data: analysis.state.data}
        : {
            kind: 'insufficient',
            reason: analysis.state.data.reason,
            evidence: analysis.state.data.evidence,
          }
      : analysis.state.phase === 'error'
        ? {kind: 'error', reason: analysis.state.reason}
        : null
  // [다시 시도]·재분석 pending — refreshing(성공 후)·retrying(오류 후) 공통
  const analysisRetryPending =
    (analysis.state.phase === 'success' && analysis.state.refreshing) ||
    (analysis.state.phase === 'error' && analysis.state.retrying)
  // v2.36 — 직전 기록에 결과(완주/이탈) 미입력 시 [+ 기록] 클릭에서 "입력하시겠습니까?" 확인
  const [incompleteTarget, setIncompleteTarget] = useState<RaceRecord | null>(null)
  const lastGoal: RaceGoal | null = races[0]?.goal ?? null
  // v2.34(사용자) — 추천 근거는 "현재→가장 최근 완주 기록까지"의 최근 구간(오래된 상태 드리프트 배제).
  // R22: 윈도우 규칙을 entity(selectAdviceWindow)로 추출 — 동작 동일(desc→최근 완주 포함 slice,
  // 완주 없으면 최근 RECENT_FALLBACK=5건 폴백). 인사이트 카드와 같은 규칙을 공유한다.
  const windowRaces = selectAdviceWindow(races)
  // v2.37 — 최근 구간에 지수 가중치 부여(가장 오래된=1, 최근일수록 큼). windowRaces는 최신순.
  const adviceHistory: VoltageAdviceRace[] = assignExponentialWeights(
    windowRaces.map(r => ({
      voltage: r.voltage,
      result: r.result,
      panoHz: r.panoHz,
      goal: r.goal,
      ...(r.lapTimeMs !== undefined ? {lapTimeMs: r.lapTimeMs} : {}),
    })),
  )
  // 현재 파노 — auto 인용값 우선, 없으면 직전 레이스 파노로 대체(휴리스틱은 0이면 파노 보정 생략)
  const currentPanoHz = initialPano.kind !== 'none' ? initialPano.panoHz : (races[0]?.panoHz ?? 0)

  // 새 기록 진입 — 2번째+는 목표 팝업, 첫 기록은 바로 시트
  const proceedAddRecord = (): void => {
    if (races.length >= 1) setGoalSheetOpen(true)
    else entry.openSheet()
  }
  // v2.36 — [+ 기록]: 직전 기록에 결과(완주/이탈) 미입력이면 먼저 확인 팝업.
  // 네 → 그 기록 수정 폼으로 이동 / 아니오 → 이전 입력 없이 새 기록 추가.
  const handleAddRecord = (): void => {
    const last = races[0]
    if (last !== undefined && last.result === undefined) {
      setIncompleteTarget(last)
      return
    }
    proceedAddRecord()
  }
  const handleIncompleteEdit = (): void => {
    const target = incompleteTarget
    setIncompleteTarget(null)
    if (target !== null) entry.editRecord(target)
  }
  const handleIncompleteSkip = (): void => {
    setIncompleteTarget(null)
    proceedAddRecord()
  }
  const handleGoalSelect = (goal: RaceGoal): void => {
    setGoalSheetOpen(false)
    entry.openWithGoal(goal, {currentPanoHz, history: adviceHistory})
  }
  // v2.35 — [AI 추천] 클릭: 현재 목표·파노·최근 이력으로 서버리스 LLM 요청(목표 있을 때만)
  const handleAiRecommend = (): void => {
    const goal = entry.draft.goal
    if (goal === null) return
    entry.requestAiVoltage({goal, currentPanoHz, history: adviceHistory})
  }

  // 왕복 복귀 소비(§7.2) — mount 시 1회. consume은 read-and-clear라 StrictMode 이중
  // 실행에도 두 번째 호출은 null(no-op). restore 함수는 매 렌더 재생성이라 ref로 최신만 참조
  // (ref 갱신은 렌더 중이 아니라 effect에서 — react-hooks/refs. 선언 순서상 consume effect보다
  // 먼저 실행되므로 mount 시에도 최신값이 보장된다).
  const restoreRef = useRef(entry.restoreFromMeasureReturn)
  useEffect(() => {
    restoreRef.current = entry.restoreFromMeasureReturn
  })
  // v2.33 — 재측정 재추천용 이력 최신 참조(effect 안 stale closure 방지, restoreRef와 동일 패턴)
  const adviceHistoryRef = useRef(adviceHistory)
  useEffect(() => {
    adviceHistoryRef.current = adviceHistory
  })
  useEffect(() => {
    // 자기 왕복만 소비(v2.5 — origin·motorId 일치 시에만 clear). 모터 상세에서 시작한
    // 왕복은 여기서 소비되지 않고 보존된다.
    const slot = consumeRaceMeasureReturn({origin: 'race', motorId})
    if (slot === null) return
    const draft = fromHandoffDraft(slot.draft)
    const measuredPanoHz = slot.measured?.panoHz ?? null
    // v2.33 — 목표가 있고 새 파노가 측정됐으면 그 파노로 전압 재추천(파노↔전압 상관 재평가)
    const recompute =
      draft.goal !== null && measuredPanoHz !== null
        ? {goal: draft.goal, currentPanoHz: measuredPanoHz, history: adviceHistoryRef.current}
        : undefined
    restoreRef.current({
      draft,
      measuredPanoHz,
      // 자동 확정 저장 성공 시에만 sr "방금 측정" 고지, storage 실패는 비차단 배너(§7.2-3)
      justMeasured: slot.measured?.save === 'saved',
      saveFailed: slot.measured?.save === 'failed',
      ...(recompute !== undefined ? {recompute} : {}),
    })
    if (slot.measured?.save === 'saved') toast.showSuccess(`'${slot.motorName}'에 기록됨`)
  }, [motorId, toast])

  // 스택 pop. history 스택이 없는 딥링크 최초 진입이면 목록(/race)으로 replace.
  const handleBack = () => {
    const historyIndex = (window.history.state as {idx?: number} | null)?.idx ?? 0
    if (historyIndex > 0) void navigate(-1)
    else void navigate('/race', {replace: true})
  }

  // [측정] 왕복 시작 — slot에 현재 draft 보존 후 S1로 이동 (feature 간 접속은 page가 조립, §7)
  const handleMeasure = () => {
    if (motor === null) return
    beginRaceMeasure({motorId: motor.id, motorName: motor.name, draft: toHandoffDraft(entry.draft)})
    void navigate('/')
  }

  const notFound = !corrupted && motorQuery.isSuccess && motor === null

  return (
    <>
      {/* v2.24 고정 셸 — 헤더는 고정, 기록 목록만 스크롤, [초기화]는 하단 고정 */}
      <Box sx={pageShellSx}>
        {/* [H] 화면 헤더 — [←] [h1 모터명] [+ 기록] [ThemeToggle] [Avatar] (v2.43: 아바타 전역·오른쪽 끝) */}
        <PageHeader
          onBack={handleBack}
          title={motor?.name ?? '레이스'}
          actions={
            <>
              {/* +기록은 로그인·모터 존재 시에만 — 게이트 상태에서는 진입점을 노출하지 않는다 */}
              {loggedIn && motor !== null && (
                // v2.6: 화면의 주 행동 — 라임 contained(컷코너)로 위계를 명확히 한다
                <Button variant="contained" onClick={handleAddRecord} sx={{minHeight: '2.75rem'}}>
                  + 기록
                </Button>
              )}
              <ThemeToggle />
              <AuthMenu />
            </>
          }
        />

        {sessionPending ? (
          // 세션 확인 중 — 콘텐츠/게이트 플래시 방지
          <Typography color="text.secondary" sx={{px: 2, py: 2}}>
            확인 중…
          </Typography>
        ) : gated ? (
          // v2.43 로그인 게이트 — 레이스 정보는 로그인 이후에만. 우상단 아바타로 로그인 진입.
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 1,
              px: 3,
            }}>
            <Typography variant="h2" component="p">
              로그인 후에 사용하세요
            </Typography>
            <Typography variant="body2" color="text.secondary">
              오른쪽 위 프로필을 눌러 로그인하면 레이스 기록을 볼 수 있습니다
            </Typography>
          </Box>
        ) : corrupted ? (
          <Box sx={{px: 2, py: 2}}>
            <RecoveryPanel
              onRetry={shell.retryPersistence}
              retryPending={shell.persistenceRetryPending}
              onResetAllData={async () => {
                const ok = await shell.resetPersistedData()
                if (ok) toast.showSuccess('초기화되었습니다')
                return ok
              }}
            />
          </Box>
        ) : motorQuery.isPending ? (
          <Typography color="text.secondary" sx={{px: 2, py: 2}}>
            불러오는 중…
          </Typography>
        ) : motorQuery.isError ? (
          <Box sx={{px: 2, py: 2}}>
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    void motorQuery.refetch()
                  }}>
                  다시 시도
                </Button>
              }>
              모터 정보를 불러오지 못했습니다
            </Alert>
          </Box>
        ) : notFound ? (
          // in-place not-found — URL 보존, 라우트 404 금지 (layout-spec §2.2)
          <EmptyState
            title="모터를 찾을 수 없습니다"
            description="삭제되었거나 잘못된 주소입니다"
            actionLabel="레이스 목록으로"
            onAction={() => {
              void navigate('/race', {replace: true})
            }}
          />
        ) : (
          <>
            {/* R49 — 인사이트 카드를 스크롤 영역 밖 상단에 고정한다(회차 목록만 스크롤).
                기록이 있을 때만 렌더 — 로딩/오류/0건은 아래 스크롤 영역이 담당한다.
                empty insight면 카드가 스스로 null을 반환하지만, races>0 게이트로 이미 배제된다. */}
            {racesQuery.isSuccess && races.length > 0 && (
              <Box sx={fixedInsightSx}>
                <RaceInsightCard
                  insight={insight}
                  onOpenHelp={() => setInsightHelpOpen(true)}
                  onAnalyze={handleAnalyze}
                  analyzeDisabledReason={analyzeDisabledReason}
                  analyzePending={analysis.pending}
                  onCancelAnalyze={analysis.cancel}
                />
              </Box>
            )}
            <Box sx={scrollAreaSx}>
              {racesQuery.isPending ? (
                <Typography color="text.secondary">기록 불러오는 중…</Typography>
              ) : racesQuery.isError ? (
                <Alert
                  severity="error"
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => {
                        void racesQuery.refetch()
                      }}>
                      다시 시도
                    </Button>
                  }>
                  레이스 기록을 불러오지 못했습니다
                </Alert>
              ) : races === undefined || races.length === 0 ? (
                // 기록 0건 — 안내 텍스트 블록 (오류 위장 금지)
                <Typography color="text.secondary" sx={{py: 2, textAlign: 'center'}}>
                  아직 레이스 기록이 없습니다 — [+ 기록]으로 첫 기록을 남기세요
                </Typography>
              ) : (
                <>
                  {/* R22 인사이트 카드는 R49에서 스크롤 영역 밖 상단 고정 블록으로 이동했다
                      (위 fixedInsightSx 참조 — 회차 목록만 스크롤). 여기서는 AI 분석 응답부터 렌더. */}
                  {/* R25 U6 — AI 분석 응답 슬롯: aria-live 래퍼는 상시 렌더(빈 상태 0px — 라이브
                      리전은 DOM 선존재해야 낭독), 카드는 success·insufficient·error일 때만(§2).
                      펼침 자동 스크롤은 이번 라운드 생략 — 카드 자체 scrollMarginTop 유지. */}
                  <Box aria-live="polite">
                    {analysisView !== null && (
                      <Box sx={{mb: 1}}>
                        <RaceAnalysisCard
                          view={analysisView}
                          expanded={analysis.expanded}
                          onToggleExpand={analysis.toggleExpanded}
                          onRetry={handleAnalyze}
                          retryPending={analysisRetryPending}
                        />
                      </Box>
                    )}
                  </Box>
                  {/* createdAt 역순(repository 보장 — 재정렬 금지). 회차 번호는 내림차순 부여 —
                      최신 행 = 총 건수 (R-2) */}
                  <Stack component="ol" spacing={1} sx={{listStyle: 'none', m: 0, p: 0}}>
                    {races.map((record, arrayIndex) => (
                      <Box component="li" key={record.id}>
                        <RaceRecordRow
                          record={record}
                          index={races.length - arrayIndex}
                          onEdit={entry.editRecord}
                          onDelete={id =>
                            deleteFlow.requestDelete(id, formatDateTimeShort(record.createdAt))
                          }
                          deletePending={deleteFlow.pendingId === record.id}
                          swipeOpen={swipe.openId === record.id}
                          onSwipeOpenChange={open => swipe.setOpen(record.id, open)}
                        />
                      </Box>
                    ))}
                  </Stack>
                </>
              )}
            </Box>

            {/*
            v2.24(req8) — [레이스 기록 초기화]를 목록 흐름 끝 → **하단 고정 푸터**로 이동.
            모터 상세 [측정] 푸터와 동일 배치(헤어라인 상단·flexShrink 0). 이 모터의 레이스 기록만
            삭제하고 측정(파노)·다른 모터 기록은 유지한다(v2.3 범위 불변, 고지는 ConfirmDialog).
          */}
            {motor !== null && (
              <Box sx={footerSx}>
                <ResetRecordsBlock motorName={motor.name} onReset={resetFlow.reset} />
              </Box>
            )}
          </>
        )}
      </Box>

      {/* 입력 시트 — useRaceEntry 전개 배선(제어형), motorName은 detail 결과 */}
      {motor !== null && (
        <RaceEntrySheet
          open={entry.sheetOpen}
          mode={entry.mode}
          motorName={motor.name}
          pano={entry.pano}
          draft={entry.draft}
          onDraftChange={entry.onDraftChange}
          onMeasure={handleMeasure}
          manualPanoOpen={entry.manualPanoOpen}
          onOpenManualPano={entry.openManualPano}
          onCloseManualPano={entry.closeManualPano}
          onSubmitManualPano={entry.submitManualPano}
          manualPanoPending={entry.manualPanoPending}
          onSubmit={entry.submit}
          pending={entry.pending}
          errorMessage={entry.errorMessage}
          fieldErrors={entry.fieldErrors}
          justMeasured={entry.justMeasured}
          // R30 — 출발 전 점검은 create 전용(REQ-AF-008: edit 경로 신규 UI 미노출)
          prerunChecklist={entry.mode === 'create' ? prerunChecklist : []}
          recommendation={entry.rationale}
          recommendPending={entry.recommendPending}
          recommendSource={entry.recommendSource}
          onRequestAiVoltage={handleAiRecommend}
          onClose={entry.closeSheet}
        />
      )}

      {/* v2.36 직전 기록 미완성 확인 — 결과(완주/이탈) 미입력 시. 네=수정 폼 / 아니오=새 기록 추가 */}
      <Dialog
        open={incompleteTarget !== null}
        onClose={handleIncompleteSkip}
        aria-labelledby="incomplete-title">
        <DialogTitle id="incomplete-title">직전 기록 확인</DialogTitle>
        <DialogContent>
          <DialogContentText>
            직전 기록에 아직 입력하지 않은 항목(결과)이 있습니다. 지금 입력하시겠습니까?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleIncompleteSkip}>아니오</Button>
          <Button variant="contained" onClick={handleIncompleteEdit}>
            네
          </Button>
        </DialogActions>
      </Dialog>

      {/* v2.31 목표 선택 팝업 — 2번째+ [+ 기록] 진입점. 선택 시 전압 추천 걸고 입력 시트로 */}
      <RaceGoalSheet
        open={goalSheetOpen}
        lastGoal={lastGoal}
        recommendation={goalRecommendation}
        onSelect={handleGoalSelect}
        onClose={() => setGoalSheetOpen(false)}
      />

      {/* R22 인사이트 [보는 법] 도움말 — 열림 상태는 페이지 소유(카드는 onOpenHelp만 호출) */}
      <RaceInsightHelpDialog open={insightHelpOpen} onClose={() => setInsightHelpOpen(false)} />

      {/* 단건 삭제 confirm (RV-A3) — copy·pending·오류는 flow가 소유 (§3.1 스프레드 계약) */}
      <ConfirmDialog {...deleteFlow.dialogProps} />
    </>
  )
}
