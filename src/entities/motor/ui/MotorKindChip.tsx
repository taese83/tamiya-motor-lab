import {Chip} from '@mui/material'
import {MOTOR_KIND_LABELS} from '@shared/config/domain'
import {color} from '@shared/config/design-tokens'

import type {MotorKind} from '@shared/config/domain'

export interface MotorKindChipProps {
  /** 저장값(안정 식별자) — 라벨 변환은 이 컴포넌트가 MOTOR_KIND_LABELS 1곳에서 수행 */
  kind: MotorKind
  size?: 'small' | 'medium'
}

/**
 * 모터 종류 칩 (T-1 — 9종 enum 라벨 표시). 순수 presentational.
 * 중립 outlined — 종류는 상태·경고가 아니므로 시맨틱 컬러를 쓰지 않는다 (DS-A5 승계).
 * 모터 리스트·레이스 진입 리스트·선택 팝업 공용.
 */
export function MotorKindChip({kind, size = 'small'}: MotorKindChipProps) {
  return (
    <Chip
      variant="outlined"
      size={size}
      label={MOTOR_KIND_LABELS[kind]}
      sx={{color: color.gray700, borderColor: color.gray500}}
    />
  )
}
