import {useState} from 'react'

import {Alert, Box, Button, Typography} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {useNavigate, useOutletContext} from 'react-router'

import {motorQueries} from '@entities/motor'
import {useCreateMotor, useReorderMotors} from '@features/motor-management/api'
import {useMotorKindFilter} from '@features/motor-management/model'
import {MotorFormSheet, MotorKindFilter, MotorList} from '@features/motor-management/ui'
import {EmptyState} from '@shared/ui/empty-state'
import {PageHeader} from '@shared/ui/page-header'
import {RecoveryPanel} from '@shared/ui/recovery-panel'
import {ThemeToggle} from '@shared/ui/theme-toggle'
import {useToast} from '@shared/ui/toast'

import type {MotorKind} from '@shared/config/domain'
import type {PersistenceStatus} from '@shared/lib/persistence'

// ─────────────────────────────────────────────────────────────────────────────
// S3 모터 목록 ('/motors') — 버그 리포트 #2: 인라인 확장을 상세 페이지로 전환.
// 조립 계약: PageHeader(+모터/ThemeToggle) + MotorKindFilter(v2.4 종류 필터) +
// MotorList(DnD 재정렬, 행 탭 → 상세 진입) + MotorFormSheet(create 전용) + EmptyState.
// corrupt면 본문 = RecoveryPanel.
// 수정·삭제·차트·기록 목록은 상세 페이지('/motors/:motorId')로 이동 — 이 페이지는
// 확장 상태·edit 시트·삭제 플로우를 소유하지 않는다.
//
// v2.4 필터×정렬 계약: 필터가 활성이면 MotorList에 부분집합이 전달되므로 reorderDisabled=true로
// 정렬을 잠근다(reorderMotors는 전체 순열 요구 — SO-2). 잠금 사유는 인라인 안내로 고지하고,
// 필터 결과 0건은 전체 0건(EmptyState E-1)과 다른 경로로 분기한다(빈 상태 위장 금지).
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
/** 필터 훅 입력 안정 참조 — pending/error 시 매 렌더 새 배열을 만들지 않게 한다 */
const EMPTY_SUMMARIES: ReadonlyArray<never> = []

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

  // v2.4 종류 필터 — 선택 상태는 URL search param 소유(상세 왕복 후 유지). 목록 재정렬은 하지 않는다.
  const kindFilter = useMotorKindFilter(summaries ?? EMPTY_SUMMARIES)

  return (
    <>
      {/* [H] 화면 헤더 — [h1 모터] [+ 모터] [ThemeToggle] */}
      <PageHeader
        title="모터"
        action={<ThemeToggle />}
        actions={
          // v2.6: 화면의 주 행동이므로 시그니처 라임 contained(컷코너)로 위계를 명확히 한다
          <Button variant="contained" onClick={openCreateSheet} sx={{minHeight: '2.75rem'}}>
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

          {/* 종류 필터 — 모터가 1건 이상일 때만 노출(빈 목록에 죽은 컨트롤 금지) */}
          <MotorKindFilter
            options={kindFilter.options}
            active={kindFilter.active}
            onToggle={kindFilter.toggle}
            onClear={kindFilter.clear}
          />

          {kindFilter.filtered.length === 0 ? (
            // 필터 결과 0건 — 전체 0건(EmptyState)과 다른 경로. 빠져나갈 액션을 반드시 제공한다
            <Box sx={{py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1}}>
              <Typography color="text.secondary">선택한 종류의 모터가 없습니다</Typography>
              <Button variant="outlined" onClick={kindFilter.clear} sx={{minHeight: 44}}>
                필터 해제
              </Button>
            </Box>
          ) : (
            <>
              {/* 잠금 사유 고지 — 무음 비활성 금지(핸들 aria-label에도 동일 사유 포함) */}
              {kindFilter.active && (
                <Typography variant="body2" color="text.secondary">
                  필터 중에는 순서를 변경할 수 없습니다 — [전체]에서 변경하세요
                </Typography>
              )}
              <MotorList
                summaries={kindFilter.filtered}
                onReorder={handleReorder}
                onSelect={openDetail}
                reorderDisabled={kindFilter.active}
              />
            </>
          )}
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
