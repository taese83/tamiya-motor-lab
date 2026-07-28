import {useState} from 'react'

import {Alert, Box, Button, Typography} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {useNavigate, useOutletContext} from 'react-router'

import {listMotors, motorKeys} from '@entities/motor'
import {composeMotorSummaries, listMotorRecordRollups} from '@entities/run-record'
import {useCreateMotor} from '@features/motor-management/api'
import {MotorFormSheet, MotorListItem} from '@features/motor-management/ui'
import {MOTOR_STATUS_GRADE_LABELS, RUN_RESULT_LABELS} from '@shared/config/domain'
import {formatRpm, formatVoltage} from '@shared/lib/format'
import {EmptyState} from '@shared/ui/empty-state'
import {PageHeader} from '@shared/ui/page-header'
import {RecoveryPanel} from '@shared/ui/recovery-panel'
import {ThemeToggle} from '@shared/ui/theme-toggle'
import {useToast} from '@shared/ui/toast'

import type {Motor} from '@entities/motor'
import type {MotorSummaryOf} from '@entities/run-record'
import type {MotorFormValues, MotorSummaryView} from '@features/motor-management/ui'
import type {PersistenceStatus} from '@shared/lib/persistence'

// ─────────────────────────────────────────────────────────────────────────────
// S3 이력·모터 목록 ('/motors') — layout-spec §6.1.
// 조립 계약 (component-spec §1.4): PageHeader + MotorListItem 목록 + EmptyState +
// MotorFormSheet 오케스트레이션. corrupt면 본문 = RecoveryPanel.
// ─────────────────────────────────────────────────────────────────────────────

// RootLayout Outlet context의 로컬 구조 선언 — pages는 app을 import할 수 없다
// (FSD, app/routes/Routes.tsx RootOutletContext와 동일 구조 유지).
interface ShellOutletContext {
  persistenceStatus: PersistenceStatus | null
  retryPersistence: () => void
  persistenceRetryPending: boolean
  resetPersistedData: () => Promise<boolean>
}

/** "07-25" — S3 카드 최근 기록 날짜 (로컬 시간대 표시) */
function formatMonthDay(iso: string): string {
  const date = new Date(iso)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}

// listMotorSummaries 파생 view → MotorListItem 뷰모델 (라벨 맵·포맷 유틸 경유 — 하드코딩 금지)
function toSummaryView(summary: MotorSummaryOf<Motor>): MotorSummaryView {
  const {motor, lastRecord} = summary
  return {
    motorId: motor.id,
    name: motor.name,
    gradeLabel: motor.statusGrade === null ? null : MOTOR_STATUS_GRADE_LABELS[motor.statusGrade],
    statusMemo: motor.statusMemo ?? '',
    recordCount: summary.recordCount,
    lastRecord:
      lastRecord === undefined
        ? null
        : {
            dateLabel: formatMonthDay(lastRecord.createdAt),
            voltageLabel: formatVoltage(lastRecord.voltage),
            rpmLabel: lastRecord.rpm === null ? null : `${formatRpm(lastRecord.rpm)} RPM`,
            resultLabel: RUN_RESULT_LABELS[lastRecord.result],
            satisfied: lastRecord.satisfied,
          },
  }
}

export function MotorsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const shell = useOutletContext<ShellOutletContext>()
  const corrupted = shell.persistenceStatus?.status === 'corrupted'

  // motorKeys.summaries() queryFn 합성 — entity 간 import 금지로 상위 레이어(page)가 조인한다
  // (entities/run-record/api/summaries.ts 계약). 파생 값 캐시·영속 금지 — 매 조회 계산 (INV-09).
  const summariesQuery = useQuery({
    queryKey: motorKeys.summaries(),
    queryFn: async () => composeMotorSummaries(await listMotors(), await listMotorRecordRollups()),
    enabled: !corrupted,
  })

  // [+ 모터] → MotorFormSheet mode='create' — 저장 성공 시 useCreateMotor가
  // motorKeys.root invalidate → 목록 즉시 반영 (C-1)
  const [sheetOpen, setSheetOpen] = useState(false)
  const createMotor = useCreateMotor()

  const openCreateSheet = () => {
    createMotor.reset()
    setSheetOpen(true)
  }

  const handleCreateSubmit = (values: MotorFormValues) => {
    createMotor.mutate(
      {name: values.name, statusGrade: values.grade, statusMemo: values.memo},
      {
        onSuccess: () => {
          setSheetOpen(false)
        },
      },
    )
  }

  const hasMotors = (summariesQuery.data?.length ?? 0) > 0

  return (
    <>
      {/* [H] 화면 헤더 — 탭 화면: [h1] [+ 모터][+ 기록] (layout-spec §3) */}
      <PageHeader
        title="이력"
        action={<ThemeToggle />}
        actions={
          <>
            <Button variant="outlined" onClick={openCreateSheet} sx={{minHeight: '2.75rem'}}>
              + 모터
            </Button>
            {/* /record/new push — 기록은 모터 필수: 모터 0개(미확인 포함)면 disabled (E-1) */}
            <Button
              variant="outlined"
              disabled={!hasMotors}
              onClick={() => {
                void navigate('/record/new')
              }}
              sx={{minHeight: '2.75rem'}}>
              + 기록
            </Button>
          </>
        }
      />

      {/* [M] 모터 카드 목록 영역 — corrupt / loading / 오류(D-10) / empty / 목록 분기 */}
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
      ) : summariesQuery.isPending ? (
        <Typography color="text.secondary" sx={{px: 2, py: 2}}>
          불러오는 중…
        </Typography>
      ) : summariesQuery.isError ? (
        // D-10: 읽기 실패는 오류로 표면화 — 빈 목록 위장 금지, [다시 시도] = 명시 refetch
        <Box sx={{px: 2, py: 2}}>
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  void summariesQuery.refetch()
                }}>
                다시 시도
              </Button>
            }>
            기록을 불러오지 못했습니다
          </Alert>
        </Box>
      ) : summariesQuery.data.length === 0 ? (
        // E-1: 빈 상태 — 오류 위장 금지. [+ 기록] 진입은 헤더에서 이미 disabled
        <EmptyState
          title="첫 모터를 등록하세요"
          description="모터를 등록하면 측정 기록을 남길 수 있습니다"
          actionLabel="+ 모터"
          onAction={openCreateSheet}
        />
      ) : (
        // 최근 사용순 (FP-A1) — 정렬은 composeMotorSummaries가 소유, 행 탭 → /motors/:id
        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            m: 0,
            px: 2,
            py: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}>
          {summariesQuery.data.map(summary => (
            <li key={summary.motor.id}>
              <MotorListItem
                summary={toSummaryView(summary)}
                onSelect={motorId => {
                  void navigate(`/motors/${motorId}`)
                }}
              />
            </li>
          ))}
        </Box>
      )}

      <MotorFormSheet
        open={sheetOpen}
        mode="create"
        pending={createMotor.isPending}
        errorMessage={createMotor.isError ? createMotor.error.message : null}
        onSubmit={handleCreateSubmit}
        onClose={() => {
          if (!createMotor.isPending) setSheetOpen(false)
        }}
      />
    </>
  )
}
