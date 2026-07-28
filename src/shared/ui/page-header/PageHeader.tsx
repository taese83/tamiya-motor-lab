import {Box, IconButton, Typography} from '@mui/material'
import {ChevronLeftIcon} from '@shared/ui/icons'
import type {ReactNode} from 'react'

export interface PageHeaderProps {
  /** 화면당 h1 정확히 1개 (heading 계약). S1은 미사용 — Z1이 겸함 */
  title: string
  /** 있으면 [←] 48×48, aria-label "뒤로" */
  onBack?: (() => void) | undefined
  /** 우측 버튼들 — 각 44×44 이상은 호출부 책임 */
  actions?: ReactNode | undefined
  /**
   * 우측 끝 단일 액션 슬롯 (design-system v2 §7.3 — additive, 기존 호출부 무변경).
   * ThemeToggle 주입용 — 래퍼가 44×44 최소 타깃 영역을 보장한다.
   */
  action?: ReactNode | undefined
}

/**
 * 전 화면 공통 헤더 [H] (component-spec §3.9) — h 56px(rem 기반), AppBar 미사용(장식 배제).
 */
export function PageHeader({title, onBack, actions, action}: PageHeaderProps) {
  return (
    <Box
      component="header"
      sx={{height: '3.5rem', display: 'flex', alignItems: 'center', gap: 0.5, px: 1}}>
      {onBack !== undefined && (
        <IconButton aria-label="뒤로" onClick={onBack} sx={{width: '3rem', height: '3rem'}}>
          <ChevronLeftIcon />
        </IconButton>
      )}
      <Typography
        variant="h1"
        component="h1"
        noWrap
        sx={{flex: 1, minWidth: 0, px: onBack !== undefined ? 0 : 1}}>
        {title}
      </Typography>
      {actions !== undefined && actions !== null && (
        <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>{actions}</Box>
      )}
      {action !== undefined && action !== null && (
        <Box
          sx={{
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {action}
        </Box>
      )}
    </Box>
  )
}
