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
 * v2.x(사용자): **헤더 고정 + 콘텐츠만 스크롤** — sticky top. 문서 스크롤 구조는 유지하고
 * 헤더만 뷰포트 상단에 붙는다(불투명 배경 — 스크롤 콘텐츠가 뒤로 비치지 않음).
 * safe-area(top)는 헤더가 패딩으로 덮는다 — 노치 기기에서 고정 시 status bar 영역까지 배경이
 * 이어지고, env=0 환경(데스크톱 등)에서는 기존과 동일 높이(56px)라 layout shift가 없다.
 * 모터 상세의 자체 고정 셸(내부 스크롤) 안에서는 스크롤 조상이 없어 무해하게 공존한다.
 */
export function PageHeader({title, onBack, actions, action}: PageHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: theme => theme.zIndex.appBar,
        backgroundColor: 'background.default',
        pt: 'var(--mml-safe-top, 0px)',
        height: 'calc(3.5rem + var(--mml-safe-top, 0px))',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
      }}>
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
