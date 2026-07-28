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
  children: ReactNode
}

/**
 * 모터 등록/수정 시트 컨테이너 (component-spec §3.9) — Drawer anchor="bottom".
 * radius 16·safe-area·max-width 480 중앙은 theme(MuiDrawer paperAnchorBottom) 소유.
 * focus trap은 MUI Modal 기본.
 */
export function BottomSheet({open, title, onClose, onOpened, children}: BottomSheetProps) {
  const titleId = useId()
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {role: 'dialog', 'aria-modal': true, 'aria-labelledby': titleId},
        transition: {onEntered: () => onOpened?.()},
      }}>
      <Box sx={{p: 2}}>
        <Typography id={titleId} variant="h2" component="h2" sx={{mb: 2}}>
          {title}
        </Typography>
        {children}
      </Box>
    </Drawer>
  )
}
