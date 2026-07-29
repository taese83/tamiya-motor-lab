import {Box, Button} from '@mui/material'
import {useState} from 'react'

import {ConfirmDialog} from '@shared/ui/confirm-dialog'

export interface ResetRecordsBlockProps {
  /** 초기화 대상 모터 이름 — confirm 범위 고지에 사용 (v2.2: 초기화는 모터 단위) */
  motorName: string
  /**
   * 해당 모터 기록 초기화 실행자(useResetRecordsFlow 경유) — true=성공.
   * 성공 토스트·invalidation은 상위(model/api) 소유.
   */
  onReset: () => Promise<boolean>
}

// 내부 상태 머신: idle → confirm-open → pending → (success: 닫힘 | error: confirm-open+오류)
interface ResetBlockState {
  open: boolean
  pending: boolean
  errorMessage: string | null
}

const IDLE: ResetBlockState = {open: false, pending: false, errorMessage: null}
const RESET_ERROR_MESSAGE = '초기화하지 못했습니다 — 다시 시도해주세요'

/**
 * 레이스 상세(`/race/:motorId`) 최하단 [기록 초기화] — v2.2 사용자 결정: 모터별 초기화.
 * 해당 모터의 측정·레이스 기록만 삭제, 모터 등록과 다른 모터의 기록은 유지.
 * outlined destructive 톤(error 보더·텍스트 — red contained는 ConfirmDialog 전용).
 * 상태 전수: idle / confirm-open / pending / error.
 */
export function ResetRecordsBlock({motorName, onReset}: ResetRecordsBlockProps) {
  const [state, setState] = useState<ResetBlockState>(IDLE)

  const handleConfirm = () => {
    if (state.pending) return
    setState({open: true, pending: true, errorMessage: null})
    void (async () => {
      let success = false
      try {
        success = await onReset()
      } catch {
        success = false // onReset 계약은 boolean이나 reject도 실패로 흡수(성공 위장 금지)
      }
      setState(success ? IDLE : {open: true, pending: false, errorMessage: RESET_ERROR_MESSAGE})
    })()
  }

  return (
    <Box>
      <Button
        variant="outlined"
        color="error"
        fullWidth
        onClick={() => setState({open: true, pending: false, errorMessage: null})}
        sx={{minHeight: 44}}>
        기록 초기화
      </Button>
      <ConfirmDialog
        open={state.open}
        title={`'${motorName}'의 기록을 초기화할까요?`}
        impact={`'${motorName}'의 측정 기록과 레이스 기록이 모두 삭제됩니다. 모터 등록과 다른 모터의 기록은 유지됩니다. 되돌릴 수 없습니다.`}
        confirmLabel="초기화"
        pending={state.pending}
        errorMessage={state.errorMessage}
        onConfirm={handleConfirm}
        onCancel={() => {
          if (!state.pending) setState(IDLE)
        }}
      />
    </Box>
  )
}
