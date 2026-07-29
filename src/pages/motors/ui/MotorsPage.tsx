import {useState} from 'react'

import {Alert, Box, Button, Typography} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {useOutletContext} from 'react-router'

import {motorQueries} from '@entities/motor'
import {
  useCreateMotor,
  useDeleteMotorCascade,
  useReorderMotors,
  useUpdateMotor,
} from '@features/motor-management/api'
import {useMotorDeleteFlow} from '@features/motor-management/model'
import {MotorFormSheet, MotorList} from '@features/motor-management/ui'
import {ConfirmDialog} from '@shared/ui/confirm-dialog'
import {EmptyState} from '@shared/ui/empty-state'
import {PageHeader} from '@shared/ui/page-header'
import {RecoveryPanel} from '@shared/ui/recovery-panel'
import {ThemeToggle} from '@shared/ui/theme-toggle'
import {useToast} from '@shared/ui/toast'

import type {MotorFormValues} from '@features/motor-management/ui'
import type {MotorKind} from '@shared/config/domain'
import type {PersistenceStatus} from '@shared/lib/persistence'

// ─────────────────────────────────────────────────────────────────────────────
// S3 모터 목록 ('/motors') — v2 전면 교체 (component-spec v2 §5).
// 조립 계약: PageHeader(+모터/ThemeToggle) + MotorList(DnD 재정렬 + 인라인 확장) +
// MotorFormSheet(create/edit) + useMotorDeleteFlow(cascade ConfirmDialog) + EmptyState.
// corrupt면 본문 = RecoveryPanel. 확장 행의 측정 기록(measureQueries.byMotor) 구독은
// MotorList 내부(MotorListRow) 소관 — 페이지는 summaries만 공급한다.
// ─────────────────────────────────────────────────────────────────────────────

// RootLayout Outlet context의 로컬 구조 선언 — pages는 app을 import할 수 없다
// (FSD, app/routes/Routes.tsx RootOutletContext와 동일 구조 유지).
interface ShellOutletContext {
  persistenceStatus: PersistenceStatus | null
  retryPersistence: () => void
  persistenceRetryPending: boolean
  resetPersistedData: () => Promise<boolean>
}

/** MotorFormSheet 오케스트레이션 상태 — 시트 1개를 create/edit 겸용으로 재사용 */
type SheetState =
  | {mode: 'create'}
  | {mode: 'edit'; motorId: string; initial: MotorFormValues}

const REORDER_ERROR_MESSAGE = '순서를 저장하지 못했습니다 — 목록이 저장된 순서로 되돌아갑니다'

export function MotorsPage() {
  const toast = useToast()
  const shell = useOutletContext<ShellOutletContext>()
  const corrupted = shell.persistenceStatus?.status === 'corrupted'

  // v2: 파생 join은 entity 데이터 계층 소유(listMotorSummaries) — 페이지 합성 제거
  const summariesQuery = useQuery({...motorQueries.summaries(), enabled: !corrupted})

  // 인라인 확장 상태 — 휘발·다중 허용(LO-5), 드래그 시작 시 전체 접힘(§5.1)
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set())
  const toggleExpand = (motorId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(motorId)) next.delete(motorId)
      else next.add(motorId)
      return next
    })
  }

  // ── 등록/수정 시트 ──────────────────────────────────────────────────────────
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const createMotor = useCreateMotor()
  const updateMotor = useUpdateMotor()

  const openCreateSheet = () => {
    createMotor.reset()
    setSheet({mode: 'create'})
  }

  const openEditSheet = (motorId: string) => {
    const summary = summariesQuery.data?.find(item => item.motor.id === motorId)
    if (summary === undefined) return
    updateMotor.reset()
    setSheet({
      mode: 'edit',
      motorId,
      initial: {name: summary.motor.name, kind: summary.motor.kind},
    })
  }

  const sheetPending = sheet?.mode === 'edit' ? updateMotor.isPending : createMotor.isPending
  const sheetError =
    sheet === null
      ? null
      : sheet.mode === 'edit'
        ? updateMotor.isError
          ? updateMotor.error.message
          : null
        : createMotor.isError
          ? createMotor.error.message
          : null

  const handleSheetSubmit = (values: {name: string; kind: MotorKind}) => {
    if (sheet === null) return
    if (sheet.mode === 'create') {
      createMotor.mutate(values, {onSuccess: () => setSheet(null)})
      return
    }
    updateMotor.mutate({id: sheet.motorId, patch: values}, {onSuccess: () => setSheet(null)})
  }

  // ── cascade 삭제 (CP-3) — count 실측 → ConfirmDialog → deleteMotorCascade ──
  const deleteMotorCascade = useDeleteMotorCascade()
  const deleteFlow = useMotorDeleteFlow({
    deleteMotor: async motorId => {
      await deleteMotorCascade.mutateAsync(motorId)
    },
  })

  const requestDelete = (motorId: string) => {
    const summary = summariesQuery.data?.find(item => item.motor.id === motorId)
    if (summary === undefined) return
    deleteFlow.requestDelete({id: motorId, name: summary.motor.name})
  }

  // ── DnD 재정렬 (T-6) — 낙관 순서는 MotorList 소유, settle 대기용 Promise 반환 ──
  const reorderMotors = useReorderMotors()
  const [reorderError, setReorderError] = useState<string | null>(null)
  const handleReorder = (orderedIds: string[]) => {
    setReorderError(null)
    // 실패 시 invalidate 정정(IDB 순서 롤백 렌더)은 mutation 훅 소관 — 여기는 인라인 안내만.
    // 오류 Toast 금지 계약(ToastApi는 성공 전용) — 인라인 Alert로 표면화한다.
    return reorderMotors.mutateAsync(orderedIds).catch(() => {
      setReorderError(REORDER_ERROR_MESSAGE)
    })
  }

  const summaries = summariesQuery.data

  return (
    <>
      {/* [H] 화면 헤더 — [h1 모터] [+ 모터] [ThemeToggle] */}
      <PageHeader
        title="모터"
        action={<ThemeToggle />}
        actions={
          <Button variant="outlined" onClick={openCreateSheet} sx={{minHeight: '2.75rem'}}>
            + 모터
          </Button>
        }
      />

      {/* [M] 본문 — corrupt / loading / 읽기 오류(D-10) / empty / 목록 */}
      {corrupted ? (
        <Box sx={{px: 2, py: 2}}>
          <RecoveryPanel
            onRetry={shell.retryPersistence}
            retryPending={shell.persistenceRetryPending}
            onResetAllData={async () => {
              // resetAllData 성공 시 queryClient.clear()는 셸(resetPersistedData) 계약 — 여기는 토스트만
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
            모터 목록을 불러오지 못했습니다
          </Alert>
        </Box>
      ) : summaries === undefined || summaries.length === 0 ? (
        // E-1: 빈 상태 — 오류 위장 금지
        <EmptyState
          title="첫 모터를 등록하세요"
          description="모터를 등록하면 측정·레이스 기록을 남길 수 있습니다"
          actionLabel="+ 모터"
          onAction={openCreateSheet}
        />
      ) : (
        <Box sx={{px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5}}>
          {reorderError !== null && (
            <Alert severity="error" onClose={() => setReorderError(null)}>
              {reorderError}
            </Alert>
          )}
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
          <MotorList
            summaries={summaries}
            expandedIds={expandedIds}
            onToggleExpand={toggleExpand}
            onCollapseAll={() => setExpandedIds(new Set())}
            onReorder={handleReorder}
            onEdit={openEditSheet}
            onDelete={requestDelete}
          />
        </Box>
      )}

      {/* 등록/수정 시트 — 닫힘 = 폼 파기, pending 중 닫힘 차단(single-flight) */}
      <MotorFormSheet
        open={sheet !== null}
        mode={sheet?.mode ?? 'create'}
        initial={sheet?.mode === 'edit' ? sheet.initial : undefined}
        pending={sheetPending}
        errorMessage={sheetError}
        onSubmit={handleSheetSubmit}
        onClose={() => {
          if (!sheetPending) setSheet(null)
        }}
      />

      {/* cascade 삭제 confirm — copy·pending·오류는 flow가 소유 (§3.1 스프레드 계약) */}
      <ConfirmDialog {...deleteFlow.dialogProps} />
    </>
  )
}
