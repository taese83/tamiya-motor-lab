import {Box, Button, Typography} from '@mui/material'

export interface EmptyStateProps {
  /** 예: "첫 모터를 등록하세요" */
  title: string
  description?: string | undefined
  actionLabel?: string | undefined
  onAction?: (() => void) | undefined
  actionDisabled?: boolean | undefined
}

/**
 * 빈 상태·in-place not-found 블록 (component-spec §3.6).
 * 안내 1~2줄 + primary 버튼 최대 1개. 오류로 위장 금지(E-1) — error 색·아이콘 사용 금지.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled = false,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 6,
        textAlign: 'center',
      }}>
      <Typography variant="body1" sx={{fontWeight: 600}}>
        {title}
      </Typography>
      {description !== undefined && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
      {actionLabel !== undefined && onAction !== undefined && (
        <Button variant="contained" onClick={onAction} disabled={actionDisabled} sx={{mt: 1}}>
          {actionLabel}
        </Button>
      )}
    </Box>
  )
}
