import {Box, Button, Paper, Typography} from '@mui/material'
import {ConfirmDialog} from '@shared/ui/confirm-dialog'
import {useState} from 'react'

export interface RecoveryPanelProps {
  /** initPersistence 재시도 — 결과는 상위 persistence 상태 재렌더로 반영 */
  onRetry: () => void
  retryPending: boolean
  /** ConfirmDialog 확인 후에만 호출. true=성공(상위가 ready 전환 + 토스트 "초기화되었습니다") */
  onResetAllData: () => Promise<boolean>
}

const RESET_ERROR_MESSAGE = '초기화하지 못했습니다 — 다시 시도해주세요'

/**
 * corrupt 시 데이터 화면 본문 대체 패널 (component-spec §3.7, F-1).
 * resetAllData 진입점은 이 패널이 유일하다 — 다른 어떤 컴포넌트에서도 호출 금지.
 * ErrorBoundary 경유 아님 — persistence 실패는 Result 값 전파(crash loop 금지).
 * 내부 상태 머신: idle → confirm-open → reset-pending → (성공: 닫힘 | 실패: confirm-open + 오류)
 */
export function RecoveryPanel({onRetry, retryPending, onResetAllData}: RecoveryPanelProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resetPending, setResetPending] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const handleConfirm = () => {
    void (async () => {
      setResetPending(true)
      setResetError(null)
      let succeeded = false
      try {
        succeeded = await onResetAllData()
      } catch {
        succeeded = false
      }
      setResetPending(false)
      if (succeeded) {
        setConfirmOpen(false)
      } else {
        setResetError(RESET_ERROR_MESSAGE) // dialog 유지 + 재시도 가능 — 성공 위장 금지
      }
    })()
  }

  return (
    <Paper variant="outlined" sx={{p: 3}}>
      <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
        <Typography variant="h2" component="h2">
          데이터를 읽을 수 없습니다
        </Typography>
        <Typography variant="body1">
          앱은 계속 사용할 수 있지만 저장된 기록에 접근할 수 없습니다.
        </Typography>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={onRetry}
          disabled={retryPending}>
          {retryPending ? '다시 시도 중…' : '다시 시도'}
        </Button>
        {/* red contained는 dialog 확인 버튼 전용 — 진입 버튼은 outlined (component-spec §3.7) */}
        <Button
          variant="outlined"
          color="error"
          fullWidth
          onClick={() => {
            setResetError(null)
            setConfirmOpen(true)
          }}
          sx={{minHeight: '2.75rem'}}>
          모든 데이터 초기화
        </Button>
      </Box>
      <ConfirmDialog
        open={confirmOpen}
        title="모든 데이터를 초기화할까요?"
        impact="모든 모터와 기록이 삭제되며 되돌릴 수 없습니다."
        confirmLabel="초기화"
        pending={resetPending}
        errorMessage={resetError}
        onConfirm={handleConfirm}
        onCancel={() => {
          if (!resetPending) setConfirmOpen(false)
        }}
      />
    </Paper>
  )
}
