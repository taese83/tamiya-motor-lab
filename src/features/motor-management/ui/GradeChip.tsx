import {Chip} from '@mui/material'
import {color} from '@shared/config/design-tokens'

export interface GradeChipProps {
  /** shared/config 라벨 맵 통과 값만. statusGrade null이면 호출부가 칩 자체를 렌더하지 않는다(CP2-3) */
  label: string
}

/**
 * 등급 표시 outlined Chip (component-spec §4.3) — 중립색, 가치판단 색 금지(노화≠나쁨, DS-A5).
 * 표시 전용 — 인터랙션 없음.
 */
export function GradeChip({label}: GradeChipProps) {
  return (
    <Chip
      variant="outlined"
      size="small"
      label={label}
      sx={{color: color.gray700, borderColor: color.gray500}}
    />
  )
}
