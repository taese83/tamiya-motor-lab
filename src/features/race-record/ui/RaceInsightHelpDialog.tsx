import {Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography} from '@mui/material'

export interface RaceInsightHelpDialogProps {
  open: boolean
  onClose: () => void
}

/**
 * 레이스 요약 [보는 법] 다이얼로그 (R22 — ConditionHelpDialog 패턴, 열림 상태는 페이지 소유).
 * 카드 본문에 계산 설명을 싣지 않는 대신(ux-brief) 여기서 세 요소의 기준을 밝힌다.
 * 핵심은 D2 기준 분리 — 완주 전압대는 **전체 완주 기록**, 추세는 **최근 구간**(전압 추천과
 * 같은 기준). 두 기준이 다르다는 것을 명시해 요약↔추천 수치 대조 시 불신을 막는다.
 */
export function RaceInsightHelpDialog({open, onClose}: RaceInsightHelpDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="race-insight-help-title"
      maxWidth="xs"
      fullWidth>
      <DialogTitle id="race-insight-help-title">레이스 요약 보는 법</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{mb: 1.5}}>
          <strong>완주 전압대</strong> — 완주한 회차들의 전압 범위예요. <strong>전체 완주
          기록</strong> 기준으로, 이 모터가 몇 V에서 완주했는지 보여줍니다.
        </Typography>
        <Typography variant="body2" sx={{mb: 1.5}}>
          <strong>추세</strong> — <strong>최근 구간</strong>(전압 추천과 같은 기준) 기록으로
          랩타임·파노가 어느 방향인지 봐요. 판단할 기록이 모자라면 아무 말도 하지 않습니다.
        </Typography>
        <Typography variant="body2" sx={{mb: 1.5}}>
          <strong>미정 제외</strong> — 결과(완주/이탈)를 아직 넣지 않은 회차는 통계에서 빼고, 몇
          건을 뺐는지만 알려드려요.
        </Typography>
        <Typography variant="body2" sx={{color: 'text.secondary'}}>
          전압대는 전체 완주 기록, 추세는 최근 구간 — 두 기준이 서로 달라요.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  )
}
