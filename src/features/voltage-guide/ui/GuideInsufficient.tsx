import {EmptyState} from '@shared/ui/empty-state'

export interface GuideInsufficientProps {
  /** 0·1·2건 동일 계약 (REQ-ST-006) */
  satisfiedCount: number
  /** GUIDE_MIN_SATISFIED = 3 (D1) — 상수 주입은 데이터 계층 소관 */
  requiredCount: number
  /** [측정하러 가기] → 탭 ① 전환 */
  onGoMeasure: () => void
}

/**
 * S5 기록 부족 안내 (component-spec §5.4) — 빈 상태 계열, 오류 톤 금지.
 * EmptyState 재사용 — error 색·아이콘 없음 계약을 그대로 승계한다.
 */
export function GuideInsufficient({
  satisfiedCount,
  requiredCount,
  onGoMeasure,
}: GuideInsufficientProps) {
  const needed = Math.max(0, requiredCount - satisfiedCount)
  return (
    <EmptyState
      title={`기록 부족 — 만족 기록 ${needed}건 더 필요합니다 (${satisfiedCount}/${requiredCount})`}
      actionLabel="측정하러 가기"
      onAction={onGoMeasure}
    />
  )
}
