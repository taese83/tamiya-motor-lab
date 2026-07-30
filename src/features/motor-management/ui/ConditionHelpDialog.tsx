import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'

import {
  CONDITION_INSPECT_RATIO,
  CONDITION_LEVEL_LABELS,
  CONDITION_WATCH_RATIO,
  STABILITY_BASELINE_COUNT,
} from '@shared/config/domain'

export interface ConditionHelpDialogProps {
  open: boolean
  onClose: () => void
}

// 컨디션 판단 가이드 (v2.x — 사용자 요청: "어렵지 않게 판단할 수 있는 방법").
// 전문 용어 없이 '고르게 도는가'라는 감각어로 설명하고, 판단 규칙을 3줄로 고정한다.
// 임계·표본 수는 상수 참조 — 값이 바뀌면 가이드 문구가 자동으로 따라온다.
export function ConditionHelpDialog({open, onClose}: ConditionHelpDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="condition-help-title" maxWidth="xs" fullWidth>
      <DialogTitle id="condition-help-title">컨디션 보는 법</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{mb: 1.5}}>
          <strong>변동률(±rpm)</strong>은 모터가 얼마나 <strong>고르게</strong> 도는지예요. 값이
          작을수록 회전이 일정합니다. 브러시·정류자·베어링이 마모되면 이 값이 점점 커집니다.
        </Typography>
        <Typography variant="body2" sx={{mb: 1.5}}>
          처음 {STABILITY_BASELINE_COUNT}번 측정한 값이 <strong>이 모터의 기준</strong>이 돼요. 새
          모터마다 타고난 값이 달라서, 남의 기준이 아니라 자기 기준과 비교합니다.
        </Typography>
        <Box component="ul" sx={{m: 0, mb: 1.5, pl: 2.5, '& li': {mb: 0.5}}}>
          <Typography component="li" variant="body2">
            <Box component="span" sx={{color: 'success.main', fontWeight: 700}}>
              {CONDITION_LEVEL_LABELS.ok}
            </Box>{' '}
            — 기준과 비슷해요. 그대로 즐기면 됩니다.
          </Typography>
          <Typography component="li" variant="body2">
            <Box component="span" sx={{color: 'warning.main', fontWeight: 700}}>
              {CONDITION_LEVEL_LABELS.watch}
            </Box>{' '}
            — 기준의 {CONDITION_WATCH_RATIO}배를 넘었어요. 추세를 지켜보세요.
          </Typography>
          <Typography component="li" variant="body2">
            <Box component="span" sx={{color: 'error.main', fontWeight: 700}}>
              {CONDITION_LEVEL_LABELS.inspect}
            </Box>{' '}
            — 기준의 {CONDITION_INSPECT_RATIO}배 이상이에요. 브러시·정류자 청소나 베어링 점검을
            해볼 때입니다.
          </Typography>
        </Box>
        <Typography variant="body2" sx={{color: 'text.secondary'}}>
          한두 번 튀는 건 정상이에요(측정 환경 영향) — <strong>여러 기록이 이어서 나빠지는
          추세</strong>가 진짜 신호입니다.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  )
}
