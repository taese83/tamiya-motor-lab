import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import {useId, useRef} from 'react'

export interface ConfirmDialogProps {
  open: boolean
  /** 질문형 1줄 — aria-labelledby */
  title: string
  /** 영향 고지: 삭제 범위·건수·불가역 — aria-describedby */
  impact: string
  /** destructive 액션 어휘 고정 */
  confirmLabel: '삭제' | '초기화'
  /** command 실행 중 — 두 버튼 disabled + "{label} 중…" + ESC/backdrop 닫기 차단 */
  pending?: boolean | undefined
  /** store-side rejection — dialog 내 인라인 Alert + 버튼 재활성(재시도 가능, 성공 위장 금지) */
  errorMessage?: string | null | undefined
  onConfirm: () => void
  onCancel: () => void
}

/**
 * destructive 계약 dialog (component-spec §3.1) — red contained 버튼의 유일한 사용처.
 * 초기 포커스 = [취소](Enter 오폭 방지), focus trap·닫힘 후 트리거 복귀는 MUI 기본.
 * 트리거 소멸 시 포커스 승계(다음 행 [삭제] → 목록 heading)는 소비자(CD-A5) 책임.
 */
export function ConfirmDialog({
  open,
  title,
  impact,
  confirmLabel,
  pending = false,
  errorMessage = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const impactId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const hasError = errorMessage !== null && errorMessage !== ''
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) onCancel()
      }}
      disableEscapeKeyDown={pending}
      aria-labelledby={titleId}
      aria-describedby={impactId}
      slotProps={{
        paper: {role: 'alertdialog', 'aria-modal': true},
        // 초기 포커스 = [취소] — autoFocus 속성 대신 전환 완료 시점에 programmatic 이동
        transition: {onEntered: () => cancelRef.current?.focus()},
      }}>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id={impactId}>{impact}</DialogContentText>
        {hasError && (
          <Alert severity="error" role="alert" sx={{mt: 2}}>
            {errorMessage}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button ref={cancelRef} variant="text" onClick={onCancel} disabled={pending}>
          취소
        </Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={pending}>
          {pending ? `${confirmLabel} 중…` : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
