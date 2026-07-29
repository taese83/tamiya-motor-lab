import {useState} from 'react'

import {Alert, Box, Button, Typography} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {useNavigate, useOutletContext, useParams} from 'react-router'

import {measureQueries} from '@entities/measure-record'
import {MotorKindChip, motorQueries} from '@entities/motor'
import {useDeleteMotorCascade, useUpdateMotor} from '@features/motor-management/api'
import {useMotorDeleteFlow} from '@features/motor-management/model'
import {MotorFormSheet, PanoLineChart} from '@features/motor-management/ui'
import {numericTypography} from '@shared/config/design-tokens'
import {formatDateTimeShort, formatFanoHz, formatRpm} from '@shared/lib/format'
import {ConfirmDialog} from '@shared/ui/confirm-dialog'
import {EmptyState} from '@shared/ui/empty-state'
import {PageHeader} from '@shared/ui/page-header'
import {RecoveryPanel} from '@shared/ui/recovery-panel'
import {ThemeToggle} from '@shared/ui/theme-toggle'
import {useToast} from '@shared/ui/toast'

import type {MotorKind} from '@shared/config/domain'
import type {PersistenceStatus} from '@shared/lib/persistence'

// ─────────────────────────────────────────────────────────────────────────────
// 모터 상세 ('/motors/:motorId', 스택 push) — 버그 리포트 #2: 목록 인라인 확장을
// 상세 페이지로 전환. 조립 계약: PageHeader(←/모터명/[수정][삭제]/ThemeToggle) +
// MotorKindChip + PanoLineChart(measureQueries.byMotor asc ≤10) + 기록 리스트
// (canonical 텍스트 채널 — 차트는 추세 보조 aria-hidden) + MotorFormSheet(edit) +
// useMotorDeleteFlow(cascade ConfirmDialog, 성공 시 '/motors' replace).
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

export function MotorDetailPage() {
  const {motorId = ''} = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const shell = useOutletContext<ShellOutletContext>()
  const corrupted = shell.persistenceStatus?.status === 'corrupted'

  // 부재는 정상 도메인 결과(null) — in-place not-found로 분기 (layout-spec §2.2)
  const motorQuery = useQuery({...motorQueries.detail(motorId), enabled: !corrupted})
  // measuredAt asc ≤10 (listMeasureRecordsByMotor 결과 그대로, 재정렬 금지)
  const recordsQuery = useQuery({...measureQueries.byMotor(motorId), enabled: !corrupted})
  const motor = motorQuery.data ?? null

  // ── 수정 시트 (edit 전용 — create는 목록 페이지 소관) ────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false)
  const updateMotor = useUpdateMotor()
  const openEditSheet = () => {
    updateMotor.reset()
    setSheetOpen(true)
  }
  const handleSheetSubmit = (values: {name: string; kind: MotorKind}) => {
    updateMotor.mutate({id: motorId, patch: values}, {onSuccess: () => setSheetOpen(false)})
  }

  // ── cascade 삭제 (CP-3) — count 실측 → ConfirmDialog → deleteMotorCascade ──
  const deleteMotorCascade = useDeleteMotorCascade()
  const deleteFlow = useMotorDeleteFlow({
    deleteMotor: async id => {
      await deleteMotorCascade.mutateAsync(id)
    },
    // 삭제 성공 — 상세의 대상이 소멸했으므로 목록으로 replace (스택에 잔존 금지)
    onDeleted: () => {
      void navigate('/motors', {replace: true})
    },
  })
  const requestDelete = () => {
    if (motor === null) return
    deleteFlow.requestDelete({id: motor.id, name: motor.name})
  }

  // 스택 pop. history 스택이 없는 딥링크 최초 진입이면 목록(/motors)으로 replace.
  const handleBack = () => {
    const historyIndex = (window.history.state as {idx?: number} | null)?.idx ?? 0
    if (historyIndex > 0) void navigate(-1)
    else void navigate('/motors', {replace: true})
  }

  const notFound = !corrupted && motorQuery.isSuccess && motor === null
  const records = recordsQuery.data

  return (
    <>
      {/* [H] 화면 헤더 — [←] [h1 모터명] [수정][삭제] [ThemeToggle] */}
      <PageHeader
        onBack={handleBack}
        title={motor?.name ?? '모터 상세'}
        action={<ThemeToggle />}
        actions={
          motor !== null ? (
            <>
              <Button variant="outlined" onClick={openEditSheet} sx={{minHeight: '2.75rem'}}>
                수정
              </Button>
              <Button
                variant="outlined"
                disabled={deleteFlow.isCounting}
                onClick={requestDelete}
                sx={{minHeight: '2.75rem', color: 'error.main', borderColor: 'error.main'}}>
                삭제
              </Button>
            </>
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
      ) : notFound || motor === null ? (
        // in-place not-found — URL 보존, 라우트 404 금지 (layout-spec §2.2)
        <EmptyState
          title="모터를 찾을 수 없습니다"
          description="삭제되었거나 잘못된 주소입니다"
          actionLabel="모터 목록으로"
          onAction={() => {
            void navigate('/motors', {replace: true})
          }}
        />
      ) : (
        <Box sx={{px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5}}>
          {deleteFlow.countError !== null && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={deleteFlow.retryCount}>
                  다시 시도
                </Button>
              }>
              {deleteFlow.countError}
            </Alert>
          )}

          <Box>
            <MotorKindChip kind={motor.kind} />
          </Box>

          {recordsQuery.isPending ? (
            <Typography variant="body2" sx={{color: 'text.secondary'}}>
              기록 불러오는 중…
            </Typography>
          ) : recordsQuery.isError ? (
            // D-10: 읽기 실패는 오류로 표면화 — 빈 목록 위장 금지
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
          ) : records === undefined || records.length === 0 ? (
            // 기록 0건 — 안내 텍스트 블록 (오류 위장 금지)
            <Typography variant="body2" sx={{color: 'text.secondary'}}>
              아직 기록 없음 — 측정 탭에서 [기록]으로 수집하세요
            </Typography>
          ) : (
            <>
              {/* 차트는 추세 보조(aria-hidden) — canonical 데이터는 아래 기록 리스트 텍스트 */}
              <PanoLineChart
                points={records.map(record => ({
                  id: record.id,
                  measuredAt: record.measuredAt,
                  panoHz: record.panoHz,
                }))}
              />
              {/* 기록 리스트 ≤10행 — 오래된 순 01부터(차트 X축과 정렬 일치, CD2-A1) */}
              <Box
                component="ol"
                sx={{listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 0.5}}>
                {records.map((record, index) => (
                  <Box
                    component="li"
                    key={record.id}
                    sx={{display: 'flex', alignItems: 'baseline', gap: 1}}>
                    <Typography
                      variant="overline"
                      component="span"
                      sx={{color: 'text.secondary', lineHeight: 1.5, minWidth: '1.5em'}}>
                      {String(index + 1).padStart(2, '0')}
                    </Typography>
                    <Typography variant="body2" component="span" sx={{color: 'text.secondary'}}>
                      {formatDateTimeShort(record.measuredAt)}
                    </Typography>
                    <Typography component="span" sx={{...numericTypography.listValue, ml: 'auto'}}>
                      {formatFanoHz(record.panoHz)}
                    </Typography>
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{color: 'text.secondary', fontVariantNumeric: 'tabular-nums lining-nums'}}>
                      · {formatRpm(record.rpm)} rpm
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Box>
      )}

      {/* 수정 시트 — 닫힘 = 폼 파기, pending 중 닫힘 차단(single-flight) */}
      {motor !== null && (
        <MotorFormSheet
          open={sheetOpen}
          mode="edit"
          initial={{name: motor.name, kind: motor.kind}}
          pending={updateMotor.isPending}
          errorMessage={updateMotor.isError ? updateMotor.error.message : null}
          onSubmit={handleSheetSubmit}
          onClose={() => {
            if (!updateMotor.isPending) setSheetOpen(false)
          }}
        />
      )}

      {/* cascade 삭제 confirm — copy·pending·오류는 flow가 소유 (§3.1 스프레드 계약) */}
      <ConfirmDialog {...deleteFlow.dialogProps} />
    </>
  )
}
