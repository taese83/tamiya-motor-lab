import {Alert, Box, Button, Typography} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {useNavigate, useOutletContext} from 'react-router'

import {motorQueries} from '@entities/motor'
import {useResetRecordsFlow} from '@features/race-record/model'
import {RaceMotorList, ResetRecordsBlock} from '@features/race-record/ui'
import {layoutTokens} from '@shared/config/design-tokens'
import {EmptyState} from '@shared/ui/empty-state'
import {PageHeader} from '@shared/ui/page-header'
import {RecoveryPanel} from '@shared/ui/recovery-panel'
import {ThemeToggle} from '@shared/ui/theme-toggle'
import {useToast} from '@shared/ui/toast'

import type {PersistenceStatus} from '@shared/lib/persistence'

// ─────────────────────────────────────────────────────────────────────────────
// S5 레이스 진입 목록 ('/race') — layout-spec v2 §6.1 / component-spec v2 §6.1·§6.4.
// 조립 계약: PageHeader + RaceMotorList(모터 행 + 마지막 레이스 요약, 행 탭 → /race/:motorId)
// + 최하단 ResetRecordsBlock(R-6 — confirm·오류는 블록 내부, 실행·토스트는 useResetRecordsFlow).
// 모터 0이면 EmptyState([모터로 이동] → /motors). corrupt면 본문 = RecoveryPanel.
// ─────────────────────────────────────────────────────────────────────────────

// RootLayout Outlet context의 로컬 구조 선언 — pages는 app을 import할 수 없다
// (FSD, app/routes/Routes.tsx RootOutletContext와 동일 구조 유지).
interface ShellOutletContext {
  persistenceStatus: PersistenceStatus | null
  retryPersistence: () => void
  persistenceRetryPending: boolean
  resetPersistedData: () => Promise<boolean>
}

export function RacePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const shell = useOutletContext<ShellOutletContext>()
  const corrupted = shell.persistenceStatus?.status === 'corrupted'

  // S3와 동일 원본(motorQueries.summaries) — 화면 간 순서·데이터 불일치 금지 (INV-09)
  const summariesQuery = useQuery({...motorQueries.summaries(), enabled: !corrupted})
  const resetFlow = useResetRecordsFlow()

  const summaries = summariesQuery.data

  return (
    <>
      {/* [H] 화면 헤더 — [h1 레이스] [ThemeToggle] */}
      <PageHeader title="레이스" action={<ThemeToggle />} />

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
        // D-10: 읽기 실패는 오류로 표면화 — 빈 목록 위장 금지
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
        // 모터 0 — 레이스 기록은 모터 단위: 등록 화면으로 유도 (오류 위장 금지)
        <EmptyState
          title="모터를 먼저 등록하세요"
          description="레이스 기록은 모터별로 남깁니다"
          actionLabel="모터로 이동"
          onAction={() => {
            void navigate('/motors')
          }}
        />
      ) : (
        <Box sx={{px: 2, py: 2}}>
          <RaceMotorList
            summaries={summaries}
            onSelect={motorId => {
              void navigate(`/race/${motorId}`)
            }}
          />
          {/* R-6 [기록 초기화] — 목록 최하단, sectionGap 이격 (모터는 유지·기록만 삭제) */}
          <Box sx={{mt: `${layoutTokens.sectionGap}px`}}>
            <ResetRecordsBlock motorCount={summaries.length} onReset={resetFlow.reset} />
          </Box>
        </Box>
      )}
    </>
  )
}
