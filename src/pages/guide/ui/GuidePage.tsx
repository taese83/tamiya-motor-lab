import {useState} from 'react'

import {Alert, Box, Button, Typography} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {useNavigate, useOutletContext} from 'react-router'

import {listMotors, motorKeys, MotorRadioList} from '@entities/motor'
import {composeMotorSummaries, listMotorRecordRollups, listSatisfiedRecords} from '@entities/run-record'
import {guideKeys} from '@features/voltage-guide/api'
import {computeGuide} from '@features/voltage-guide/model'
import {GuideInsufficient, GuideResult} from '@features/voltage-guide/ui'
import {GUIDE_MIN_SATISFIED, MOTOR_STATUS_GRADE_LABELS, RUN_RESULT_LABELS} from '@shared/config/domain'
import {formatRpm, formatVoltage} from '@shared/lib/format'
import {EmptyState} from '@shared/ui/empty-state'
import {PageHeader} from '@shared/ui/page-header'
import {RecoveryPanel} from '@shared/ui/recovery-panel'
import {ThemeToggle} from '@shared/ui/theme-toggle'
import {useToast} from '@shared/ui/toast'

import type {RunRecord} from '@entities/run-record'
import type {GuideEvidenceRecord, GuideResultView} from '@features/voltage-guide/ui'
import type {PersistenceStatus} from '@shared/lib/persistence'

// ─────────────────────────────────────────────────────────────────────────────
// S5 전압 가이드 ('/guide') — layout-spec §7.3.
// 조립 계약 (component-spec §1.4): MotorRadioList + GuideResult/GuideInsufficient/EmptyState.
// 모터 선택은 페이지 로컬 상태 — 새로고침 시 미선택으로 시작 (LO-1 확정, layout-spec §2.2).
// ─────────────────────────────────────────────────────────────────────────────

// RootLayout Outlet context의 로컬 구조 선언 — pages는 app을 import할 수 없다
// (FSD, app/routes/Routes.tsx RootOutletContext와 동일 구조 유지).
interface ShellOutletContext {
  persistenceStatus: PersistenceStatus | null
  retryPersistence: () => void
  persistenceRetryPending: boolean
  resetPersistedData: () => Promise<boolean>
}

/** "07-25 14:02" — 근거 기록 행 시각 (로컬 시간대 표시) */
function formatMonthDayTime(iso: string): string {
  const date = new Date(iso)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

// RunRecord → 근거 행 뷰모델 (RecordRow와 동일 표시 계약 — 비인터랙티브)
function toEvidenceView(record: RunRecord): GuideEvidenceRecord {
  return {
    id: record.id,
    dateTimeLabel: formatMonthDayTime(record.createdAt),
    voltageLabel: formatVoltage(record.voltage),
    rpmLabel: record.rpm === null ? null : `${formatRpm(record.rpm)} RPM`,
    resultLabel: RUN_RESULT_LABELS[record.result],
    satisfied: record.satisfied,
  }
}

export function GuidePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const shell = useOutletContext<ShellOutletContext>()
  const corrupted = shell.persistenceStatus?.status === 'corrupted'

  // LO-1: 미선택(null)으로 시작 — 자동 선택 금지, 페이지 로컬 상태(새로고침 시 초기화)
  const [selectedMotorId, setSelectedMotorId] = useState<string | null>(null)

  // 라디오 목록도 최근 사용순(FP-A1) — S3와 동일한 summaries 합성 query를 공유한다
  const summariesQuery = useQuery({
    queryKey: motorKeys.summaries(),
    queryFn: async () => composeMotorSummaries(await listMotors(), await listMotorRecordRollups()),
    enabled: !corrupted,
  })

  // guideKeys.byMotor queryFn 합성: listSatisfiedRecords + computeGuide (api-schema §6.3 —
  // guideQueries factory 부재로 page가 합성). 결과는 in-memory 캐시만 — 기록 추가·삭제 시
  // mutation 훅이 guideKeys.root를 invalidate해 항상 최신 기록으로 재계산된다 (INV-10).
  const guideQuery = useQuery({
    queryKey: guideKeys.byMotor(selectedMotorId ?? 'none'),
    queryFn: async () => computeGuide(await listSatisfiedRecords(selectedMotorId ?? '')),
    enabled: !corrupted && selectedMotorId !== null,
  })
  const guide = guideQuery.data

  return (
    <>
      {/* [H] 화면 헤더 — 탭 화면: [h1] (layout-spec §3) */}
      <PageHeader title="가이드" action={<ThemeToggle />} />

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
        // D-10: 읽기 실패 표면화 + [다시 시도] = 명시 refetch
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
            모터 목록을 불러오지 못했습니다
          </Alert>
        </Box>
      ) : summariesQuery.data.length === 0 ? (
        // 모터 0개 — 빈 상태 계열(오류 톤 금지), 등록 동선은 이력 탭
        <EmptyState
          title="먼저 모터를 등록하세요"
          description="모터와 만족 기록이 있어야 전압을 추천할 수 있습니다"
          actionLabel="이력으로 이동"
          onAction={() => {
            void navigate('/motors')
          }}
        />
      ) : (
        <Box sx={{px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 2}}>
          {/* 모터 선택 — 최근 사용순 그대로 렌더 (정렬은 데이터 계층 소관) */}
          <MotorRadioList
            motors={summariesQuery.data.map(summary => ({
              id: summary.motor.id,
              name: summary.motor.name,
              gradeLabel:
                summary.motor.statusGrade === null
                  ? null
                  : MOTOR_STATUS_GRADE_LABELS[summary.motor.statusGrade],
            }))}
            value={selectedMotorId}
            onChange={setSelectedMotorId}
            legend="모터 선택"
          />

          {/* 추천/근거 영역 — 미선택은 안내 1줄(빈 데이터 아님 — EmptyState 금지) */}
          {selectedMotorId === null ? (
            <Typography color="text.secondary">
              모터를 선택하면 추천 전압을 보여드립니다
            </Typography>
          ) : guideQuery.isError ? (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    void guideQuery.refetch()
                  }}>
                  다시 시도
                </Button>
              }>
              기록을 불러오지 못했습니다
            </Alert>
          ) : guide === undefined ? null : guide.kind === 'insufficient' ? ( // 로컬 1회 계산 — 스피너 없음
            // 0·1·2건 동일 계약 (REQ-ST-006 / D1·E-2)
            <GuideInsufficient
              satisfiedCount={guide.satisfiedCount}
              requiredCount={GUIDE_MIN_SATISFIED}
              onGoMeasure={() => {
                void navigate('/')
              }}
            />
          ) : (
            // 추천 범위 = 만족 기록 min~max (A6) + 분포 근거 + 근거 기록(비인터랙티브)
            <GuideResult
              guide={
                {
                  minV: guide.rangeMin,
                  maxV: guide.rangeMax,
                  satisfiedCount: guide.satisfiedCount,
                  distribution: guide.distribution,
                  wideVariance: guide.wideVariance,
                } satisfies GuideResultView
              }
              records={guide.evidence.map(toEvidenceView)}
            />
          )}
        </Box>
      )}
    </>
  )
}
