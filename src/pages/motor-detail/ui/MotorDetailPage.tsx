import {useState} from 'react'

import {Alert, Box, Button, Typography} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {useNavigate, useOutletContext, useParams} from 'react-router'

import {motorQueries} from '@entities/motor'
import {recordQueries, RecordRow} from '@entities/run-record'
import {useDeleteMotorCascade, useUpdateMotor} from '@features/motor-management/api'
import {useMotorDeleteFlow, useRecordDeleteFlow} from '@features/motor-management/model'
import {GradeChip, MotorFormSheet} from '@features/motor-management/ui'
import {useDeleteRecord} from '@features/record-entry/api'
import {MOTOR_STATUS_GRADE_LABELS, RUN_RESULT_LABELS} from '@shared/config/domain'
import {formatRpm, formatVoltage} from '@shared/lib/format'
import {ConfirmDialog} from '@shared/ui/confirm-dialog'
import {EmptyState} from '@shared/ui/empty-state'
import {PageHeader} from '@shared/ui/page-header'
import {RecoveryPanel} from '@shared/ui/recovery-panel'
import {useToast} from '@shared/ui/toast'

import type {RecordRowView, RunRecord} from '@entities/run-record'
import type {MotorFormValues} from '@features/motor-management/ui'
import type {PersistenceStatus} from '@shared/lib/persistence'

// ─────────────────────────────────────────────────────────────────────────────
// S4 모터 상세·이력 ('/motors/:id', 스택 push) — layout-spec §6.2.
// 조립 계약 (component-spec §1.4): PageHeader(←/수정/삭제) + 요약 행 + RecordRow 목록 +
// useMotorDeleteFlow/useRecordDeleteFlow + in-place not-found(EmptyState — 라우트 404 금지).
// ─────────────────────────────────────────────────────────────────────────────

// RootLayout Outlet context의 로컬 구조 선언 — pages는 app을 import할 수 없다
// (FSD, app/routes/Routes.tsx RootOutletContext와 동일 구조 유지).
interface ShellOutletContext {
  persistenceStatus: PersistenceStatus | null
  retryPersistence: () => void
  persistenceRetryPending: boolean
  resetPersistedData: () => Promise<boolean>
}

/** "07-25 14:02" — 기록 행 시각 (로컬 시간대 표시) */
function formatMonthDayTime(iso: string): string {
  const date = new Date(iso)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

// RunRecord → RecordRow 뷰모델 (라벨 맵·포맷 유틸 경유 — 하드코딩 금지)
function toRecordRowView(record: RunRecord): RecordRowView {
  return {
    id: record.id,
    dateTimeLabel: formatMonthDayTime(record.createdAt),
    voltageLabel: formatVoltage(record.voltage),
    rpmLabel: record.rpm === null ? null : `${formatRpm(record.rpm)} RPM`,
    resultLabel: RUN_RESULT_LABELS[record.result],
    satisfied: record.satisfied,
  }
}

export function MotorDetailPage() {
  const {id = ''} = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const shell = useOutletContext<ShellOutletContext>()
  const corrupted = shell.persistenceStatus?.status === 'corrupted'

  // 부재는 정상 도메인 결과(null) — S4가 in-place not-found로 분기한다 (layout-spec §2.2)
  const motorQuery = useQuery({...motorQueries.detail(id), enabled: !corrupted})
  const recordsQuery = useQuery({...recordQueries.byMotor(id), enabled: !corrupted})
  const motor = motorQuery.data ?? null

  // [수정] — MotorFormSheet mode='edit' + useUpdateMotor (성공 시 motorKeys.root invalidate)
  const [editOpen, setEditOpen] = useState(false)
  const updateMotor = useUpdateMotor()
  const handleEditSubmit = (values: MotorFormValues) => {
    if (motor === null) return
    updateMotor.mutate(
      {
        id: motor.id,
        patch: {name: values.name, statusGrade: values.grade, statusMemo: values.memo},
      },
      {
        onSuccess: () => {
          setEditOpen(false)
        },
      },
    )
  }

  // [삭제] — count 실측 → cascade ConfirmDialog(CP-3) → deleteMotorCascade →
  // /motors replace (유령 상세 재진입 방지)
  const deleteMotorCascade = useDeleteMotorCascade()
  const motorDeleteFlow = useMotorDeleteFlow({
    deleteMotor: async motorId => {
      await deleteMotorCascade.mutateAsync(motorId)
    },
    onDeleted: () => {
      void navigate('/motors', {replace: true})
    },
  })

  // 기록 행 [삭제] — 단건 confirm (C-2). invalidation은 useDeleteRecord 소관
  const deleteRecord = useDeleteRecord()
  const recordDeleteFlow = useRecordDeleteFlow({
    deleteRecord: async recordId => {
      await deleteRecord.mutateAsync(recordId)
    },
  })

  // 스택 pop. history 스택이 없는 딥링크 최초 진입이면 목록(/motors)으로 replace.
  const handleBack = () => {
    const historyIndex = (window.history.state as {idx?: number} | null)?.idx ?? 0
    if (historyIndex > 0) void navigate(-1)
    else void navigate('/motors', {replace: true})
  }

  const records = recordsQuery.data

  return (
    <>
      {/* [H] 화면 헤더 — 스택 화면: [←] [h1 truncate] [수정][삭제] (layout-spec §3) */}
      <PageHeader
        onBack={handleBack}
        title={motor?.name ?? '모터 상세'}
        actions={
          <>
            <Button
              variant="text"
              disabled={motor === null}
              onClick={() => {
                updateMotor.reset()
                setEditOpen(true)
              }}>
              수정
            </Button>
            <Button
              variant="text"
              disabled={motor === null || motorDeleteFlow.isCounting}
              onClick={() => {
                if (motor !== null) motorDeleteFlow.requestDelete({id: motor.id, name: motor.name})
              }}>
              삭제
            </Button>
          </>
        }
      />

      {/* count 조회 실패 — 트리거 인근 인라인 문구 + [다시 시도] (dialog는 열지 않음, §3.1) */}
      {motorDeleteFlow.countError !== null && (
        <Box sx={{px: 2, pb: 1}}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={motorDeleteFlow.retryCount}>
                다시 시도
              </Button>
            }>
            {motorDeleteFlow.countError}
          </Alert>
        </Box>
      )}

      {/* [M] 요약 행 + 기록 목록 — corrupt / loading / 오류(D-10) / not-found / 본문 분기 */}
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
      ) : motor === null ? (
        // in-place not-found — 라우트 404로 던지지 않는다 (삭제됨·오타 딥링크, layout-spec §2.2)
        <EmptyState
          title="모터를 찾을 수 없습니다"
          description="삭제됐거나 잘못된 주소일 수 있습니다"
          actionLabel="이력으로 이동"
          onAction={() => {
            void navigate('/motors', {replace: true})
          }}
        />
      ) : (
        <Box sx={{px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 2}}>
          {/* 요약 행 — GradeChip + "기록 n건" + 메모 1줄 */}
          <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.5}}>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
              {motor.statusGrade !== null && (
                <GradeChip label={MOTOR_STATUS_GRADE_LABELS[motor.statusGrade]} />
              )}
              {records !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  기록 {records.length}건
                </Typography>
              )}
            </Box>
            {motor.statusMemo !== undefined && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {motor.statusMemo}
              </Typography>
            )}
          </Box>

          {/* 기록 목록 — 시간 역순(INV-08, 정렬은 데이터 계층 소유), immutable — 행 탭 액션 없음 */}
          <Box>
            <Typography variant="h2" component="h2" sx={{mb: 1}}>
              기록
            </Typography>
            {recordsQuery.isPending ? (
              <Typography color="text.secondary">불러오는 중…</Typography>
            ) : recordsQuery.isError ? (
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => {
                      void recordsQuery.refetch()
                    }}>
                    다시 시도
                  </Button>
                }>
                기록을 불러오지 못했습니다
              </Alert>
            ) : recordsQuery.data.length === 0 ? (
              // LO-4 baseline: [+ 기록] 진입점 없음 — 중립 텍스트 블록
              <Typography color="text.secondary">아직 기록 없음</Typography>
            ) : (
              <Box
                component="ul"
                sx={{
                  listStyle: 'none',
                  m: 0,
                  p: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}>
                {recordsQuery.data.map(record => (
                  <Box
                    component="li"
                    key={record.id}
                    sx={{borderTop: 1, borderColor: 'divider', pt: 1.5}}>
                    <RecordRow
                      record={toRecordRowView(record)}
                      onDelete={recordDeleteFlow.requestDelete}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      )}

      <MotorFormSheet
        open={editOpen}
        mode="edit"
        initial={
          motor === null
            ? undefined
            : {name: motor.name, grade: motor.statusGrade, memo: motor.statusMemo ?? ''}
        }
        pending={updateMotor.isPending}
        errorMessage={updateMotor.isError ? updateMotor.error.message : null}
        onSubmit={handleEditSubmit}
        onClose={() => {
          if (!updateMotor.isPending) setEditOpen(false)
        }}
      />

      {/* destructive confirm 2종 — copy·pending·오류 유지 계약은 flow dialogProps가 소유 (§3.1) */}
      <ConfirmDialog {...motorDeleteFlow.dialogProps} />
      <ConfirmDialog {...recordDeleteFlow.dialogProps} />
    </>
  )
}
