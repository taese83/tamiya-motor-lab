import {useState} from 'react'

import {Alert, Box, Button, Typography} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {useNavigate, useOutletContext} from 'react-router'

import {motorQueries} from '@entities/motor'
import {useCreateMotor, useReorderMotors} from '@features/motor-management/api'
import {MotorFormSheet, MotorList} from '@features/motor-management/ui'
import {EmptyState} from '@shared/ui/empty-state'
import {PageHeader} from '@shared/ui/page-header'
import {RecoveryPanel} from '@shared/ui/recovery-panel'
import {ThemeToggle} from '@shared/ui/theme-toggle'
import {useToast} from '@shared/ui/toast'

import type {MotorKind} from '@shared/config/domain'
import type {PersistenceStatus} from '@shared/lib/persistence'

// ─────────────────────────────────────────────────────────────────────────────
// S3 모터 목록 ('/motors') — 버그 리포트 #2: 인라인 확장을 상세 페이지로 전환.
// 조립 계약: PageHeader(+모터/ThemeToggle) + MotorList(DnD 재정렬, 행 탭 → 상세 진입) +
// MotorFormSheet(create 전용) + EmptyState. corrupt면 본문 = RecoveryPanel.
// 수정·삭제·차트·기록 목록은 상세 페이지('/motors/:motorId')로 이동 — 이 페이지는
// 확장 상태·edit 시트·삭제 플로우를 소유하지 않는다.
// ─────────────────────────────────────────────────────────────────────────────

// RootLayout Outlet context의 로컬 구조 선언 — pages는 app을 import할 수 없다
// (FSD, app/routes/Routes.tsx RootOutletContext와 동일 구조 유지).
interface ShellOutletContext {
  persistenceStatus: PersistenceStatus | null
  retryPersistence: () => void
  persistenceRetryPending: boolean
  resetPersistedData: () => Promise<boolean>
}

const REORDER_ERROR_MESSAGE = '순서를 저장하지 못했습니다 — 목록이 저장된 순서로 되돌아갑니다'

export function MotorsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const shell = useOutletContext<ShellOutletContext>()
  const corrupted = shell.persistenceStatus?.status === 'corrupted'

  // v2: 파생 join은 entity 데이터 계층 소유(listMotorSummaries) — 페이지 합성 제거
  const summariesQuery = useQuery({...motorQueries.summaries(), enabled: !corrupted})

  // 행 탭 → 상세 페이지 push (v2.2 — 차트·기록·수정·삭제는 상세 소유)
  const openDetail = (motorId: string) => {
    void navigate(`/motors/${motorId}`)
  }

  // ── 등록 시트 (create 전용 — edit는 상세 페이지 소관) ──────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const createMotor = useCreateMotor()

  const openCreateSheet = () => {
    createMotor.reset()
    setCreateOpen(true)
  }

  const handleCreateSubmit = (values: {name: string; kind: MotorKind}) => {
    createMotor.mutate(values, {onSuccess: () => setCreateOpen(false)})
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
          <MotorList summaries={summaries} onReorder={handleReorder} onSelect={openDetail} />
        </Box>
      )}

      {/* 등록 시트 — 닫힘 = 폼 파기, pending 중 닫힘 차단(single-flight) */}
      <MotorFormSheet
        open={createOpen}
        mode="create"
        pending={createMotor.isPending}
        errorMessage={createMotor.isError ? createMotor.error.message : null}
        onSubmit={handleCreateSubmit}
        onClose={() => {
          if (!createMotor.isPending) setCreateOpen(false)
        }}
      />
    </>
  )
}
