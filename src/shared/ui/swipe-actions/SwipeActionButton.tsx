import {ButtonBase, Typography} from '@mui/material'

import {SWIPE_ACTION_WIDTH} from './SwipeActions'

import type {ReactNode} from 'react'

// SwipeActionButton (v2.16) — 스와이프 트레이 액션 1개.
//
// 아이콘 단독으로 두지 않고 **아이콘 + 짧은 텍스트**를 함께 넣는다:
// ① 색·아이콘 단독 구분 금지(DS-A5·REQ-NFR-003) — 연필/휴지통은 형태가 다르지만
//    파괴 액션에서 형태만으로 확신을 요구하는 건 위험 대비 이득이 없다.
// ② LD-4가 스와이프를 기각한 사유 중 "가시 버튼이 확실하다"에 대한 대응 —
//    트레이가 열린 뒤에는 텍스트 라벨이 그 확실성을 그대로 제공한다.
//
// 파괴 톤(`destructive`)은 error 계열이지만 contained가 아니다 —
// red contained는 ConfirmDialog 전용이라는 기존 계약(component-spec §3.1)을 침범하지 않는다.

export interface SwipeActionButtonProps {
  icon: ReactNode
  /** 아이콘 아래 라벨 — 짧게(2자) */
  label: string
  /** 스크린리더용 완전한 문장 — 어느 행의 액션인지까지 포함한다 */
  ariaLabel: string
  onClick: () => void
  disabled?: boolean | undefined
  /** 파괴 액션 — error 전경색 + 배경 tint */
  destructive?: boolean | undefined
}

export function SwipeActionButton({
  icon,
  label,
  ariaLabel,
  onClick,
  disabled = false,
  destructive = false,
}: SwipeActionButtonProps) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      sx={{
        width: SWIPE_ACTION_WIDTH,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.25,
        color: destructive ? 'error.main' : 'text.primary',
        bgcolor: destructive ? 'error.light' : 'action.hover',
        '&.Mui-disabled': {opacity: 0.5},
      }}>
      {icon}
      <Typography component="span" variant="caption" sx={{lineHeight: 1, fontWeight: 600}}>
        {label}
      </Typography>
    </ButtonBase>
  )
}
