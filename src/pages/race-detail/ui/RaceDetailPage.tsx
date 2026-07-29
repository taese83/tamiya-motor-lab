import {useEffect, useRef} from 'react'

import {Alert, Box, Button, Stack, Typography} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {useNavigate, useOutletContext, useParams} from 'react-router'

import {measureQueries} from '@entities/measure-record'
import {motorQueries} from '@entities/motor'
import {raceQueries} from '@entities/race-record'
import {beginRaceMeasure, consumeRaceMeasureReturn} from '@features/race-measure-handoff'
import {useRaceDeleteFlow, useRaceEntry} from '@features/race-record/model'
import {RaceEntrySheet, RaceRecordRow} from '@features/race-record/ui'
import {formatDateTimeShort} from '@shared/lib/format'
import {ConfirmDialog} from '@shared/ui/confirm-dialog'
import {EmptyState} from '@shared/ui/empty-state'
import {PageHeader} from '@shared/ui/page-header'
import {RecoveryPanel} from '@shared/ui/recovery-panel'
import {useToast} from '@shared/ui/toast'

import type {RaceMeasureDraft} from '@features/race-measure-handoff'
import type {RaceEntryDraft, RaceEntryPano} from '@features/race-record/ui'
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
  }
}

/** handoff slot draft → 폼 draft (복귀 복원) — 수치를 원시 문자열로 되돌린다 */
function fromHandoffDraft(draft: RaceMeasureDraft): RaceEntryDraft {
  return {
    result: draft.result ?? null,
    voltageRaw: draft.voltage !== undefined ? String(draft.voltage) : '',
    lapTimeRaw: draft.lapTimeSec !== undefined ? String(draft.lapTimeSec) : '',
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
  const deleteFlow = useRaceDeleteFlow()

  // 왕복 복귀 소비(§7.2) — mount 시 1회. consume은 read-and-clear라 StrictMode 이중
  // 실행에도 두 번째 호출은 null(no-op). restore 함수는 매 렌더 재생성이라 ref로 최신만 참조
  // (ref 갱신은 렌더 중이 아니라 effect에서 — react-hooks/refs. 선언 순서상 consume effect보다
  // 먼저 실행되므로 mount 시에도 최신값이 보장된다).
  const restoreRef = useRef(entry.restoreFromMeasureReturn)
  useEffect(() => {
    restoreRef.current = entry.restoreFromMeasureReturn
  })
  useEffect(() => {
    const slot = consumeRaceMeasureReturn()
    if (slot === null || slot.motorId !== motorId) return
    restoreRef.current({
      draft: fromHandoffDraft(slot.draft),
      measuredPanoHz: slot.measured?.panoHz ?? null,
      // 자동 확정 저장 성공 시에만 sr "방금 측정" 고지, storage 실패는 비차단 배너(§7.2-3)
      justMeasured: slot.measured?.save === 'saved',
      saveFailed: slot.measured?.save === 'failed',
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
  const races = racesQuery.data

  return (
    <>
      {/* [H] 화면 헤더 — [←] [h1 모터명] [+ 기록] */}
      <PageHeader
        onBack={handleBack}
        title={motor?.name ?? '레이스'}
        actions={
          motor !== null ? (
            <Button variant="outlined" onClick={entry.openSheet} sx={{minHeight: '2.75rem'}}>
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
        <Box sx={{px: 2, py: 2}}>
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
                    onDelete={id => deleteFlow.requestDelete(id, formatDateTimeShort(record.createdAt))}
                    deletePending={deleteFlow.pendingId === record.id}
                  />
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* 입력 시트 — useRaceEntry 전개 배선(제어형), motorName은 detail 결과 */}
      {motor !== null && (
        <RaceEntrySheet
          open={entry.sheetOpen}
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
          onClose={entry.closeSheet}
        />
      )}

      {/* 단건 삭제 confirm (RV-A3) — copy·pending·오류는 flow가 소유 (§3.1 스프레드 계약) */}
      <ConfirmDialog {...deleteFlow.dialogProps} />
    </>
  )
}
