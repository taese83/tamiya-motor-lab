import {Box, Typography} from '@mui/material'

import type {ReactNode} from 'react'

// SectionHeading (v2.14) — 섹션 구분 헤딩 (레퍼런스: Google Fit "Duration"/"Schedule",
// Apple Health "Highlights" + 우측 "Show All").
//
// 목적: 한 화면에 성격이 다른 블록이 여러 개 있을 때 평평한 나열을 끊어준다.
// 이전 모터 상세는 칩·차트·기록 목록이 구분 없이 이어져 어디까지가 한 덩어리인지 알기 어려웠다.
//
// heading 레벨은 소비처가 정한다 — 화면당 h1은 PageHeader가 이미 쓰므로 보통 h2다.
// 장식 목적이면 `as="span"`으로 heading 트리에서 빼서 스크린리더 목차를 오염시키지 않는다.

export interface SectionHeadingProps {
  children: ReactNode
  /** 보조 수치·설명(건수 등) — 제목 오른쪽에 muted로 붙는다 */
  meta?: string | undefined
  /** 우측 액션(레퍼런스의 "Show All" 위치) */
  action?: ReactNode | undefined
  /** heading 레벨. 장식용 섹션이면 'span' */
  as?: 'h2' | 'h3' | 'span' | undefined
}

export function SectionHeading({children, meta, action, as = 'h2'}: SectionHeadingProps) {
  return (
    <Box sx={{display: 'flex', alignItems: 'baseline', gap: 1, minHeight: 28}}>
      <Typography
        component={as}
        // variant는 h2 타이포 토큰을 쓰지 않는다 — 화면 제목(PageHeader h1)보다 작아야
        // 위계가 뒤집히지 않는다. 굵기로 구분한다(레퍼런스도 본문 크기 + bold).
        sx={{fontWeight: 700, lineHeight: 1.3, m: 0}}>
        {children}
      </Typography>
      {meta !== undefined && (
        <Typography component="span" variant="body2" sx={{color: 'text.secondary'}}>
          {meta}
        </Typography>
      )}
      {action !== undefined && action !== null && (
        <Box sx={{ml: 'auto', display: 'flex', alignItems: 'center'}}>{action}</Box>
      )}
    </Box>
  )
}
