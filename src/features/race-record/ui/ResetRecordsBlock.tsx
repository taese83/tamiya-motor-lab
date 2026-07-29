import {Box, Button} from '@mui/material'
import {useState} from 'react'

import {ConfirmDialog} from '@shared/ui/confirm-dialog'

export interface ResetRecordsBlockProps {
  /** 실측 k — confirm 문구 "등록된 모터 {k}대는 유지됩니다". 0이면 미렌더 */
  motorCount: number
  /**
   * resetAllRecords 실행자(useResetAllRecords 경유) — true=성공.
   * 성공 토스트 "초기화되었습니다"·invalidation은 상위(model/api) 소유.
   */
  onReset: () => Promise<boolean>
}

// §6.4 내부 상태 머신: idle → confirm-open → pending → (success: 닫힘 | error: confirm-open+오류)
interface ResetBlockState {
  open: boolean
  pending: boolean
  errorMessage: string | null
}

const IDLE: ResetBlockState = {open: false, pending: false, errorMessage: null}
const RESET_ERROR_MESSAGE = '초기화하지 못했습니다 — 다시 시도해주세요'

/**
 * `/race` 목록 최하단 [기록 초기화] (component-spec §6.4 — R-6·RV-A2·LD-5).
 * outlined destructive 톤(error 보더·텍스트 — contained 금지, red contained는 ConfirmDialog 전용).
 * confirm copy는 §3.1 표 고정 — 범위 고지 "모터는 유지" 필수(§8 resetAllData와 문구·범위 분리).
 * 상태 전수: hidden(motorCount 0) / idle / confirm-open / pending / error.
 */
export function ResetRecordsBlock({motorCount, onReset}: ResetRecordsBlockProps) {
  const [state, setState] = useState<ResetBlockState>(IDLE)

  if (motorCount <= 0) return null // 초기화 대상 없음(layout §6.1 — [기록 초기화] 미렌더)

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
        title="모든 기록을 초기화할까요?"
        impact={`모든 측정 기록과 레이스 기록이 삭제됩니다. 등록된 모터 ${motorCount}대는 유지됩니다. 되돌릴 수 없습니다.`}
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
