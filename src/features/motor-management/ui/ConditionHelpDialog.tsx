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
  STABILITY_EXCELLENT_MAX_CV,
  STABILITY_GOOD_MAX_CV,
  STABILITY_HIGH_MIN_CV,
  STABILITY_LEVEL_LABELS,
} from '@shared/config/domain'

export interface ConditionHelpDialogProps {
  open: boolean
  onClose: () => void
}

// % 표기 — 임계 상수(비율)를 가이드 문구로. 부동소수 잔차 방지로 toFixed 고정.
const pct = (ratio: number): string => (ratio * 100).toFixed(1).replace(/\.0$/, '')

// 컨디션 판단 가이드 (v2.x 2축 — 사용자 확정: 변동률 자체의 기준 + 자기 기준선 추세).
// 전문 용어 없이 '고르게 도는가'라는 감각어로 설명하고, 두 축을 각각 3~4줄 규칙으로 고정한다.
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

        <Typography variant="body2" sx={{mb: 0.5}}>
          <strong>① 변동 — 지금 상태가 괜찮은가</strong> (변동률 자체의 구간)
        </Typography>
        <Box component="ul" sx={{m: 0, mb: 1.5, pl: 2.5, '& li': {mb: 0.5}}}>
          <Typography component="li" variant="body2">
            <Box component="span" sx={{color: 'success.main', fontWeight: 700}}>
              {STABILITY_LEVEL_LABELS.excellent}
            </Box>{' '}
            — {pct(STABILITY_EXCELLENT_MAX_CV)}% 미만. 길들이기가 잘 끝난 최상 컨디션이에요.
          </Typography>
          <Typography component="li" variant="body2">
            <Box component="span" sx={{color: 'success.main', fontWeight: 700}}>
              {STABILITY_LEVEL_LABELS.good}
            </Box>{' '}
            — {pct(STABILITY_GOOD_MAX_CV)}% 미만. 정상적인 공회전이에요.
          </Typography>
          <Typography component="li" variant="body2">
            <Box component="span" sx={{color: 'warning.main', fontWeight: 700}}>
              {STABILITY_LEVEL_LABELS.fair}
            </Box>{' '}
            — {pct(STABILITY_HIGH_MIN_CV)}% 미만. 사용감이 있는 상태 — 추세를 지켜보세요.
          </Typography>
          <Typography component="li" variant="body2">
            <Box component="span" sx={{color: 'error.main', fontWeight: 700}}>
              {STABILITY_LEVEL_LABELS.high}
            </Box>{' '}
            — {pct(STABILITY_HIGH_MIN_CV)}% 이상. 측정이 성립하기 어려운 흔들림이에요. 브러시·정류자
            청소나 베어링 점검을 해볼 때입니다.
          </Typography>
        </Box>

        <Typography variant="body2" sx={{mb: 0.5}}>
          <strong>② 추세 — 나빠지고 있는가</strong> (자기 기준과 비교)
        </Typography>
        <Typography variant="body2" sx={{mb: 1, color: 'text.secondary'}}>
          처음 {STABILITY_BASELINE_COUNT}번 측정한 값이 이 모터의 기준이 돼요. 새 모터마다 타고난
          값이 달라서, 남의 기준이 아니라 자기 기준과 비교합니다.
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
            — 기준의 {CONDITION_INSPECT_RATIO}배 이상이에요. 점검해볼 때입니다.
          </Typography>
        </Box>

        <Typography variant="body2" sx={{mb: 1.5}}>
          단, 기준 {STABILITY_BASELINE_COUNT}회 자체가 <strong>{STABILITY_LEVEL_LABELS.high}</strong>{' '}
          구간이면 그 기준과의 비교는 믿기 어려워요. 이때는 추세 대신{' '}
          <Box component="span" sx={{color: 'warning.main', fontWeight: 700}}>
            기준값 자체가 커요
          </Box>
          라고 알려드려요 — 조용한 곳에서 기록을 초기화하고 기준을 다시 잡아보세요.
        </Typography>

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
