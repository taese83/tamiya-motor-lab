import {MOTOR_STATUS_GRADES, MOTOR_STATUS_GRADE_LABELS} from '@shared/config/domain'
import type {MotorStatusGrade} from '@shared/config/domain'
import {SegmentControl} from './SegmentControl'
import type {SegmentOption} from './SegmentControl'

// CP-1a 확정 4단계 — 라벨 교체는 shared/config MOTOR_STATUS_GRADE_LABELS 1곳
const GRADE_OPTIONS: ReadonlyArray<SegmentOption<MotorStatusGrade>> = MOTOR_STATUS_GRADES.map(
  value => ({value, label: MOTOR_STATUS_GRADE_LABELS[value]}),
)

export interface GradeSegmentProps {
  /** null = 미지정 (CP2-3: 기본값 상수 없음 — 초기값은 항상 미선택) */
  value: MotorStatusGrade | null
  /** 선택 항목 — 재탭 해제(deselect)로 null 복귀 허용 */
  onChange: (value: MotorStatusGrade | null) => void
  disabled?: boolean | undefined
}

/** 모터 상태 등급 4택 — 320px에서 2×2 wrap, 등급에 가치판단 색 금지(DS-A5) */
export function GradeSegment({value, onChange, disabled = false}: GradeSegmentProps) {
  return (
    <SegmentControl
      options={GRADE_OPTIONS}
      value={value}
      onChange={onChange}
      allowDeselect
      wrap="2x2"
      aria-label="상태 등급"
      disabled={disabled}
    />
  )
}
