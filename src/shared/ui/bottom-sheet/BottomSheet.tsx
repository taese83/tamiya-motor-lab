import {Box, Drawer, Typography} from '@mui/material'
import {useId} from 'react'
import type {ReactNode} from 'react'

export interface BottomSheetProps {
  open: boolean
  /** 시트 제목 h2 — aria-labelledby 연결 */
  title: string
  /** 닫기(ESC·backdrop 포함) = 폼 파기, confirm 없음 (LO-2 동일 원칙). 닫힘 후 트리거 focus 복귀는 MUI 기본 */
  onClose: () => void
  /** 전환 완료 시점 콜백 — 초기 포커스(첫 입력 필드) 이동은 콘텐츠 소유자가 수행 */
  onOpened?: (() => void) | undefined
  /**
   * 고정 높이(예: '50vh') — 지정 시 시트를 그 높이로 **고정**하고 내부를 flex 컬럼으로 만들어
   * 콘텐츠가 스크롤 영역을 소유하게 한다(제목은 상단 고정). 미지정(기본)이면 콘텐츠 높이에 맞춘다
   * — 등록/수정·목표·레이스 시트의 기존 동작(자동 높이)은 그대로다.
   */
  height?: string | undefined
  children: ReactNode
}

/**
 * 모터 등록/수정 시트 컨테이너 (component-spec §3.9) — Drawer anchor="bottom".
 * radius 16·safe-area·max-width 480 중앙은 theme(MuiDrawer paperAnchorBottom) 소유.
 * focus trap은 MUI Modal 기본.
 */
export function BottomSheet({open, title, onClose, onOpened, height, children}: BottomSheetProps) {
  const titleId = useId()
  const fixed = height !== undefined
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': titleId,
          // 고정 높이 시: paper를 그 높이로 잡고 자신을 flex 컬럼으로 — 내부 스크롤 영역의 기준 높이가 된다
          ...(fixed && {sx: {height, display: 'flex', flexDirection: 'column'}}),
        },
        transition: {onEntered: () => onOpened?.()},
      }}>
      <Box sx={[{p: 2}, fixed && {flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column'}]}>
        <Typography id={titleId} variant="h2" component="h2" sx={{mb: 2, flexShrink: 0}}>
          {title}
        </Typography>
        {fixed ? (
          // 콘텐츠가 남은 높이를 채우고 스크롤 영역을 소유하도록 flex 컬럼으로 감싼다(자동 높이 모드는 그대로 통과)
          <Box sx={{flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column'}}>{children}</Box>
        ) : (
          children
        )}
      </Box>
    </Drawer>
  )
}
