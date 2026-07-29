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

import {layoutTokens} from '@shared/config/design-tokens'

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
      {/*
        v2.14 레퍼런스(Spotify 다이얼로그) 구조: 중앙 정렬 제목 → 흐린 설명 → 주 액션(풀폭)
        → 보조 액션(텍스트). 이전에는 제목·설명이 좌측이고 액션이 우측 하단에 가로로 붙어
        시선이 좌상 → 우하로 튀었다. 중앙 스택은 읽는 순서와 누르는 순서가 일치한다.

        주 액션(파괴)이 위에 오지만 **초기 포커스는 [취소]** 그대로다 — Enter 오폭으로
        삭제가 실행되지 않게 하는 기존 계약(§3.1)을 유지한다.
      */}
      <DialogTitle id={titleId} sx={{textAlign: 'center', pb: 1}}>
        {title}
      </DialogTitle>
      <DialogContent sx={{pt: 0}}>
        <DialogContentText id={impactId} sx={{textAlign: 'center'}}>
          {impact}
        </DialogContentText>
        {hasError && (
          <Alert severity="error" role="alert" sx={{mt: 2}}>
            {errorMessage}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{flexDirection: 'column', gap: 1, px: 3, pb: 2.5}}>
        <Button
          fullWidth
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={pending}
          sx={{height: layoutTokens.formControlHeight}}>
          {pending ? `${confirmLabel} 중…` : confirmLabel}
        </Button>
        {/* MUI DialogActions는 형제 사이에 margin-left를 넣는다 — 세로 스택에서는 무효화한다 */}
        <Button
          ref={cancelRef}
          fullWidth
          variant="text"
          onClick={onCancel}
          disabled={pending}
          sx={{height: layoutTokens.formControlHeight, ml: 0}}>
          취소
        </Button>
      </DialogActions>
    </Dialog>
  )
}
