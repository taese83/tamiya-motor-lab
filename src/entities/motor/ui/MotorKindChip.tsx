import {Chip} from '@mui/material'
import {MOTOR_KIND_LABELS} from '@shared/config/domain'
import {motorKindColors} from '@shared/config/design-tokens'

import type {MotorKind} from '@shared/config/domain'

export interface MotorKindChipProps {
  /** 저장값(안정 식별자) — 라벨 변환은 이 컴포넌트가 MOTOR_KIND_LABELS 1곳에서 수행 */
  kind: MotorKind
  size?: 'small' | 'medium'
}

/**
 * 모터 종류 칩 (T-1 — 10종 enum 라벨 + 종류색). 순수 presentational.
 *
 * v2.6: 중립 outlined → **종류별 식별색 채움**(사용자 요구 — 실제 엔드벨 색으로 빠르게 구분).
 * 색 정의는 motorKindColors 1곳 소유이고 여기서 hex를 재정의하지 않는다.
 * 라벨 텍스트를 항상 동반하므로 색 단독 구분이 아니다(REQ-NFR-003) — 하이퍼대시·마하대시가
 * 같은 빨강인 것도 라벨이 구분한다.
 * 이전 구현은 테마와 무관하게 라이트 모드 hex(gray700/gray500)를 고정으로 써서 다크 모드에서
 * 저대비였다 — 자체 대비를 갖는 채움 방식이라 모드 분기 없이 양쪽을 만족한다.
 *
 * 모터 리스트·레이스 진입 리스트·선택 팝업·모터 상세 공용.
 */
export function MotorKindChip({kind, size = 'small'}: MotorKindChipProps) {
  const visual = motorKindColors[kind]
  return (
    <Chip
      size={size}
      label={MOTOR_KIND_LABELS[kind]}
      sx={{
        backgroundColor: visual.bg,
        color: visual.fg,
        // 면 분리 — 흰 뱃지(라이트 배경)·검정 뱃지(다크 배경)가 배경에 녹지 않게 한다
        border: '1px solid',
        borderColor: visual.border,
        fontWeight: 600,
        // 표시 전용 — MUI의 hover 톤 변화를 상속하지 않는다
        '&:hover': {backgroundColor: visual.bg},
      }}
    />
  )
}
