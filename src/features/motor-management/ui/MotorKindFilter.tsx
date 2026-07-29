import {Box, Chip} from '@mui/material'

import {MOTOR_KIND_LABELS} from '@shared/config/domain'

import type {MotorKindFilterOption} from '../model'
import type {MotorKind} from '@shared/config/domain'

// MotorKindFilter (v2.4 — 모터 목록 종류 필터 행). 순수 presentational·완전 제어형:
// 선택 상태·URL 동기화는 상위(useMotorKindFilter) 소유.
//
// 형태: 가로 스크롤 칩 행 [전체][종류 n]… — 다중선택(사용자 결정). 모바일 터치 우선이라
// 칩 최소 높이 44px를 유지하고, 가로 스크롤은 목록 세로 스크롤과 충돌하지 않게 x축만 허용한다.
// a11y: role="group"으로 묶고 각 칩은 aria-pressed 토글 버튼. 선택 표시는 색 단독이 아니라
// filled/outlined 변형 + aria-pressed로 이중화한다(색 단독 구분 금지 — DS 계약).

export interface MotorKindFilterProps {
  /** 목록에 존재하는 종류 + 건수 + 선택 여부 (MOTOR_KINDS 순서) */
  options: ReadonlyArray<MotorKindFilterOption>
  /** 선택 1개 이상 — [전체] 칩의 선택 표시 반전에 사용 */
  active: boolean
  onToggle: (kind: MotorKind) => void
  /** [전체] 탭 — 선택 비움 */
  onClear: () => void
}

const chipSx = {minHeight: 44, borderRadius: 999, flexShrink: 0} as const

export function MotorKindFilter({options, active, onToggle, onClear}: MotorKindFilterProps) {
  return (
    <Box
      role="group"
      aria-label="모터 종류 필터"
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        // 스크롤바를 숨기되 스크롤은 유지 — 칩 행은 장식 스크롤 영역
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': {display: 'none'},
        // 스크롤 끝에서 상위 스크롤로 연쇄되지 않게(세로 목록 스크롤 보호)
        overscrollBehaviorX: 'contain',
        pb: 0.5,
      }}>
      {/* [전체] — 선택 없음 상태를 명시적으로 표현·복귀 (aria-pressed로 현재 상태 고지) */}
      <Chip
        label="전체"
        onClick={onClear}
        aria-pressed={!active}
        variant={active ? 'outlined' : 'filled'}
        color={active ? 'default' : 'primary'}
        sx={chipSx}
      />
      {options.map(option => (
        <Chip
          key={option.kind}
          label={`${MOTOR_KIND_LABELS[option.kind]} ${option.count}`}
          onClick={() => onToggle(option.kind)}
          aria-pressed={option.selected}
          variant={option.selected ? 'filled' : 'outlined'}
          color={option.selected ? 'primary' : 'default'}
          sx={chipSx}
        />
      ))}
    </Box>
  )
}
