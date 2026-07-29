import {Box, Stack} from '@mui/material'

import {useSingleOpenRow} from '@shared/ui/swipe-actions'

import {MotorRow} from './MotorRow'

import type {MotorSummary} from '@entities/motor'

// MotorList (v2.26 — DnD 제거). 정렬 순서로 전달된 summaries를 그대로 렌더한다.
// 순서 소유는 소비 페이지의 정렬 컨트롤(useMotorSort)로 이동했다 — 이 컴포넌트는 표시만 한다.
// 스와이프 트레이의 "한 번에 한 행만" 규칙만 여기서 소유한다(파괴 액션 대상 모호성 제거).

export interface MotorListProps {
  /** 정렬 적용 순서 — 재정렬하지 않는다(정렬은 소비 페이지 소유) */
  summaries: ReadonlyArray<MotorSummary>
  /** 행 본체 탭 — 상세 페이지 진입 */
  onSelect: (motorId: string) => void
  /** 행 스와이프 [수정] — 편집 시트는 소비 페이지 소유 */
  onEdit: (motor: MotorSummary['motor']) => void
  /** 행 스와이프 [삭제] — cascade confirm 플로우는 소비 페이지 소유 */
  onDelete: (motor: MotorSummary['motor']) => void
  /** 삭제 대상 건수 조회 중 — 모든 행의 트레이 액션 disabled */
  actionsPending?: boolean | undefined
}

export function MotorList({
  summaries,
  onSelect,
  onEdit,
  onDelete,
  actionsPending = false,
}: MotorListProps) {
  const swipe = useSingleOpenRow()

  // empty는 상위 EmptyState 소관 — 본 컴포넌트 미렌더
  if (summaries.length === 0) return null

  return (
    <Stack component="ul" spacing={1} sx={{listStyle: 'none', m: 0, p: 0}}>
      {summaries.map(summary => (
        // key = stable entity id (렌더 index 금지)
        <Box component="li" key={summary.motor.id}>
          <MotorRow
            summary={summary}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            actionsPending={actionsPending}
            swipeOpen={swipe.openId === summary.motor.id}
            onSwipeOpenChange={open => swipe.setOpen(summary.motor.id, open)}
          />
        </Box>
      ))}
    </Stack>
  )
}
