import {Box, Button, Paper, Typography} from '@mui/material'
import {numericTypography} from '@shared/config/design-tokens'
import {formatFanoHz, formatRpm} from '@shared/lib/format'

// 필드명은 api-schema NR-1 표준(panoHz) — spec §5.1 본문의 fanoHz 표기는 정정 전 표기.
export type MeasurementFillState =
  | {mode: 'filled'; rpm: number; panoHz: number} // S1 handoff take 성공 — stable 확정값만(H-5)
  | {mode: 'empty'} // 직접 입력 / 새로고침 소실 / [비우기] 후

export interface MeasurementFillBlockProps {
  state: MeasurementFillState
  /** filled에서만 — empty로 전환. 즉시 적용·undo 없음(폼 로컬 조작, slot 이미 소비).
   *  비운 후 focus 이동(다음 필드 = 전압 input)은 폼 소유 */
  onClear: () => void
}

/**
 * S2 측정값 카드 (component-spec §5.1) — 두 모드 카드 외형·높이 동일, 내용만 교체.
 * filled는 읽기전용 정적 텍스트 — 수치 수정 UI 없음(UX-A3).
 * empty는 중립 문구 — 오류 톤 금지(D2는 정상 경로).
 */
export function MeasurementFillBlock({state, onClear}: MeasurementFillBlockProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1,
        minHeight: '5.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 0.5,
      }}>
      {state.mode === 'filled' ? (
        <>
          <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <Typography variant="body2" color="text.secondary">
              측정값 (읽기전용)
            </Typography>
            <Button
              variant="text"
              onClick={onClear}
              aria-label="측정값 비우기"
              sx={{minHeight: '2.75rem'}}>
              비우기
            </Button>
          </Box>
          <Typography component="p" sx={{...numericTypography.listValue}}>
            {formatRpm(state.rpm)} RPM · {formatFanoHz(state.panoHz)}
          </Typography>
        </>
      ) : (
        <Typography variant="body1" color="text.secondary">
          측정값 없음 (직접 입력 기록)
        </Typography>
      )}
    </Paper>
  )
}
