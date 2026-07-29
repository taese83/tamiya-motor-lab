import {Alert, Box, Button, Typography} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {useNavigate, useOutletContext} from 'react-router'

import {motorQueries} from '@entities/motor'
import {useMotorKindFilter} from '@features/motor-management/model'
import {MotorKindFilter} from '@features/motor-management/ui'
import {RaceMotorList} from '@features/race-record/ui'
import {EmptyState} from '@shared/ui/empty-state'
import {PageHeader} from '@shared/ui/page-header'
import {RecoveryPanel} from '@shared/ui/recovery-panel'
import {ThemeToggle} from '@shared/ui/theme-toggle'
import {useToast} from '@shared/ui/toast'

import type {PersistenceStatus} from '@shared/lib/persistence'

// ─────────────────────────────────────────────────────────────────────────────
// S5 레이스 진입 목록 ('/race') — layout-spec v2 §6.1 / component-spec v2 §6.1·§6.4.
// 조립 계약: PageHeader + MotorKindFilter(v2.17 — 모터 목록과 공유하는 종류 필터)
// + RaceMotorList(모터 행 + 마지막 레이스 요약, 행 탭 → /race/:motorId).
// 모터 0이면 EmptyState([모터로 이동] → /motors). corrupt면 본문 = RecoveryPanel.
//
// 순서는 S3(모터 목록)와 동일하다 — 두 화면이 같은 `motorQueries.summaries()`(sortOrder
// 오름차순 INV-08)를 소비하므로 DnD로 바꾼 순서가 이 화면에도 그대로 반영된다.
// 이 화면에서 재정렬은 하지 않는다(정렬 진입점은 모터 목록 1곳 — sortOrder 단일 소유).
// ─────────────────────────────────────────────────────────────────────────────

// RootLayout Outlet context의 로컬 구조 선언 — pages는 app을 import할 수 없다
// (FSD, app/routes/Routes.tsx RootOutletContext와 동일 구조 유지).
interface ShellOutletContext {
  persistenceStatus: PersistenceStatus | null
  retryPersistence: () => void
  persistenceRetryPending: boolean
  resetPersistedData: () => Promise<boolean>
}

/** 필터 훅 입력 안정 참조 — pending/error 시 매 렌더 새 배열을 만들지 않게 한다 */
const EMPTY_SUMMARIES: ReadonlyArray<never> = []

export function RacePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const shell = useOutletContext<ShellOutletContext>()
  const corrupted = shell.persistenceStatus?.status === 'corrupted'

  // S3와 동일 원본(motorQueries.summaries) — 화면 간 순서·데이터 불일치 금지 (INV-09)
  const summariesQuery = useQuery({...motorQueries.summaries(), enabled: !corrupted})

  const summaries = summariesQuery.data

  // v2.17 — 모터 목록과 공유하는 종류 필터(영속). 이 화면은 DnD 정렬이 없어
  // 모터 목록의 정렬 잠금(SO-2)은 해당되지 않는다 — filtered만 소비한다.
  const kindFilter = useMotorKindFilter(summaries ?? EMPTY_SUMMARIES)

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
        <Box sx={{px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5}}>
          {/*
            v2.17 종류 필터 — 모터 목록과 **같은 컴포넌트·같은 상태**를 쓴다.
            칩 UI를 이 화면에 다시 만들지 않는 이유: 같은 필터를 두 번 구현하면 옵션 산출·
            0건 처리·정렬 정규화가 화면마다 미묘하게 갈린다. 상태도 공유라 한쪽에서 고르면
            다른 쪽에 그대로 반영된다(사용자 결정).
          */}
          <MotorKindFilter
            options={kindFilter.options}
            active={kindFilter.active}
            onToggle={kindFilter.toggle}
            onClear={kindFilter.clear}
          />

          {/* v2.2: [기록 초기화]는 모터별 처리로 이동 — 레이스 상세(/race/:motorId) 하단 */}
          {kindFilter.filtered.length === 0 ? (
            // 필터 결과 0건 — 모터 0건(EmptyState)과 **다른 경로**다. 빈 상태로 위장하면
            // "모터가 없다"로 오독되므로 사유를 밝히고 빠져나갈 액션을 반드시 준다.
            <Box sx={{py: 2, textAlign: 'center'}}>
              <Typography color="text.secondary">선택한 종류의 모터가 없습니다</Typography>
              <Button variant="outlined" onClick={kindFilter.clear} sx={{mt: 1.5, minHeight: 44}}>
                필터 해제
              </Button>
            </Box>
          ) : (
            <RaceMotorList
              summaries={kindFilter.filtered}
              onSelect={motorId => {
                void navigate(`/race/${motorId}`)
              }}
            />
          )}
        </Box>
      )}
    </>
  )
}
