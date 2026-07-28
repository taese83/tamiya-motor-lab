import {Alert, Button} from '@mui/material'
import {layoutTokens} from '@shared/config/design-tokens'

export interface StatusBannerProps {
  /** unavailable=warning(정보 지속형) / corrupt=error */
  tone: 'warning' | 'error'
  message: string
  /** corrupt: "복구 옵션" */
  actionLabel?: string | undefined
  /** 이동 등 액션 — 판정·조립은 app/ui/GlobalPersistenceBanner 소유 */
  onAction?: (() => void) | undefined
}

/**
 * 전역 상태 배너 프리젠테이션 (component-spec §3.5) — MUI Alert standard variant.
 * role="status"(landmark 아님), 닫기 버튼 없음(상태 지속형), sticky top + safe-top 패딩.
 * 부팅 시 1회 결정 — 측정 상태 전환으로 나타나거나 사라지지 않는다(S1 layout stability 전제).
 */
export function StatusBanner({tone, message, actionLabel, onAction}: StatusBannerProps) {
  return (
    <Alert
      severity={tone}
      role="status"
      action={
        actionLabel !== undefined && onAction !== undefined ? (
          <Button color="inherit" size="small" onClick={onAction} sx={{minHeight: '2.75rem'}}>
            {actionLabel}
          </Button>
        ) : undefined
      }
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 'appBar',
        borderRadius: 0,
        pt: `calc(${layoutTokens.safeAreaTop} + 6px)`,
      }}>
      {message}
    </Alert>
  )
}
