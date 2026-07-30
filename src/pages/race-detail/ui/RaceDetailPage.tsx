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
import {raceQueries} from '@entities/race-record'
import {beginRaceMeasure, consumeRaceMeasureReturn} from '@features/race-measure-handoff'
import {useRaceDeleteFlow, useRaceEntry, useResetRecordsFlow} from '@features/race-record/model'
import {RaceEntrySheet, RaceGoalSheet, RaceRecordRow, ResetRecordsBlock} from '@features/race-record/ui'
import {layoutTokens} from '@shared/config/design-tokens'
import {formatDateTimeShort} from '@shared/lib/format'
import {assignExponentialWeights} from '@shared/lib/voltage-advisor'
import {ConfirmDialog} from '@shared/ui/confirm-dialog'
import {useSingleOpenRow} from '@shared/ui/swipe-actions'
import {EmptyState} from '@shared/ui/empty-state'
import {PageHeader} from '@shared/ui/page-header'
import {RecoveryPanel} from '@shared/ui/recovery-panel'
import {useToast} from '@shared/ui/toast'

import type {RaceRecord} from '@entities/race-record'
import type {RaceMeasureDraft} from '@features/race-measure-handoff'
import type {RaceEntryDraft, RaceEntryPano} from '@features/race-record/ui'
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
  }
}

/** handoff slot draft → 폼 draft (복귀 복원) — 수치를 원시 문자열로 되돌린다 */
function fromHandoffDraft(draft: RaceMeasureDraft): RaceEntryDraft {
  return {
    result: draft.result ?? null,
    voltageRaw: draft.voltage !== undefined ? String(draft.voltage) : '',
    lapTimeRaw: draft.lapTimeSec !== undefined ? String(draft.lapTimeSec) : '',
    goal: draft.goal ?? null, // v2.31 — 왕복 복귀 시 목표 복원
  }
}

export function RaceDetailPage() {
  const {motorId = ''} = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const shell = useOutletContext<ShellOutletContext>()
  const corrupted = shell.persistenceStatus?.status === 'corrupted'

  // 부재는 정상 도메인 결과(null) — in-place not-found로 분기 (layout-spec §2.2)
  const motorQuery = useQuery({...motorQueries.detail(motorId), enabled: !corrupted})
  const racesQuery = useQuery({...raceQueries.byMotor(motorId), enabled: !corrupted})
  // 파노 자동 인용(R-3①) — byMotor(asc) 마지막 요소 파생, 전용 query 신설 금지 (AR-5)
  const measuresQuery = useQuery({...measureQueries.byMotor(motorId), enabled: !corrupted})
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
  // v2.36 — 직전 기록에 결과(완주/이탈) 미입력 시 [+ 기록] 클릭에서 "입력하시겠습니까?" 확인
  const [incompleteTarget, setIncompleteTarget] = useState<RaceRecord | null>(null)
  const lastGoal: RaceGoal | null = races[0]?.goal ?? null
  // v2.34(사용자) — 추천 근거는 "현재→가장 최근 완주 기록까지"의 최근 구간(오래된 상태 드리프트 배제).
  // races는 최신순(desc)이라 최근 완주 index까지 자르면 [최신…그 완주] 포함. 완주가 없으면
  // 최근 RECENT_FALLBACK건으로 대체(추세선 학습 최소 표본 확보).
  const RECENT_FALLBACK = 5
  const lastFinishedIdx = races.findIndex(r => r.result === 'finished')
  const windowRaces =
    lastFinishedIdx >= 0 ? races.slice(0, lastFinishedIdx + 1) : races.slice(0, RECENT_FALLBACK)
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
        {/* [H] 화면 헤더 — [←] [h1 모터명] [+ 기록] */}
        <PageHeader
          onBack={handleBack}
          title={motor?.name ?? '레이스'}
          actions={
            motor !== null ? (
              // v2.6: 화면의 주 행동 — 라임 contained(컷코너)로 위계를 명확히 한다
              <Button variant="contained" onClick={handleAddRecord} sx={{minHeight: '2.75rem'}}>
                + 기록
              </Button>
            ) : undefined
          }
        />

        {corrupted ? (
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
                // createdAt 역순(repository 보장 — 재정렬 금지). 회차 번호는 내림차순 부여 —
                // 최신 행 = 총 건수 (R-2)
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
          onSubmit={entry.submit}
          pending={entry.pending}
          errorMessage={entry.errorMessage}
          fieldErrors={entry.fieldErrors}
          justMeasured={entry.justMeasured}
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
        onSelect={handleGoalSelect}
        onClose={() => setGoalSheetOpen(false)}
      />

      {/* 단건 삭제 confirm (RV-A3) — copy·pending·오류는 flow가 소유 (§3.1 스프레드 계약) */}
      <ConfirmDialog {...deleteFlow.dialogProps} />
    </>
  )
}
