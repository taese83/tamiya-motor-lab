import {Box, ToggleButton, ToggleButtonGroup, toggleButtonGroupClasses} from '@mui/material'
import {MOTOR_KINDS, MOTOR_KIND_LABELS} from '@shared/config/domain'
import {CheckIcon} from '@shared/ui/icons'

import type {MotorKind} from '@shared/config/domain'
import type {MouseEvent} from 'react'

// MotorKindSelect (component-spec v2 §5.4 — T-1 종류 10택 3열 그리드 (v2.6: light_dash 추가)).
// MUI exclusive ToggleButtonGroup 채택(CD2-A3) — 직각·라임 선택 bg·w800은 theme이 소유.
// 선택 표시 3중: 라임 bg + w800(theme) + check 아이콘 병행 — 색 단독 구분 금지(REQ-NFR-003).
// 라벨 = MOTOR_KIND_LABELS 1곳(하드코딩 금지), 저장 값 = 안정 식별자(m130·atomic·…).

export interface MotorKindSelectProps {
  value: MotorKind | null
  /** 필수 항목 — 해제 없음(선택 재탭 null은 무시) */
  onChange: (kind: MotorKind) => void
  /** 그룹 외곽 error 표시만 — 오류 문구·focus 이동은 폼(MotorFormSheet) 소유 */
  error?: boolean | undefined
}

/**
 * 3열 CSS grid — 320px에서도 3열 유지, 긴 라벨("스프린트대시") 2줄 wrap 허용, 셀 min-h 44.
 * 키보드: Tab 진입 + 버튼별 Enter/Space(ToggleButton 기본). 상태 전달은 aria-pressed(MUI 기본).
 * 비선택 셀에도 동일 폭 투명 check placeholder를 두어 선택 전환 시 폭이 흔들리지 않는다.
 */
export function MotorKindSelect({value, onChange, error = false}: MotorKindSelectProps) {
  const handleChange = (_event: MouseEvent<HTMLElement>, next: MotorKind | null): void => {
    if (next !== null) onChange(next)
  }

  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      onChange={handleChange}
      aria-label="모터 종류"
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1,
        width: '100%',
        // grid 배치에서 그룹 연결 스타일(마이너스 마진·보더 병합) 해제 — exported utility class 경유
        [`& .${toggleButtonGroupClasses.grouped}`]: {
          border: '1px solid var(--mml-outline)',
          borderRadius: 0,
          margin: 0,
        },
        ...(error && {outline: '2px solid', outlineColor: 'error.main', outlineOffset: '2px'}),
      }}>
      {MOTOR_KINDS.map(kind => {
        const selected = value === kind
        return (
          <ToggleButton
            key={kind}
            value={kind}
            sx={{minHeight: 44, px: 0.5, py: 0.75, lineHeight: 1.25, whiteSpace: 'normal'}}>
            {/* 선택 3중 표시의 아이콘 채널 — 비선택은 동일 폭 투명 placeholder(폭 흔들림 금지) */}
            <Box
              component="span"
              aria-hidden="true"
              sx={{
                display: 'inline-flex',
                flexShrink: 0,
                mr: 0.5,
                visibility: selected ? 'visible' : 'hidden',
              }}>
              <CheckIcon size={16} />
            </Box>
            {MOTOR_KIND_LABELS[kind]}
          </ToggleButton>
        )
      })}
    </ToggleButtonGroup>
  )
}
