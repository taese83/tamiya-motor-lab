import {Box} from '@mui/material'
import {darkColor, numericTypography} from '@shared/config/design-tokens'
import {EM_DASH} from '@shared/lib/format'

export interface BigNumberProps {
  /** 사전 포맷 문자열(`@shared/lib/format` 경유). null → "—" + sr-only "측정값 없음" */
  value: string | null
  /** 단위 라벨("RPM" 등) — caption·text.secondary, 수치보다 작게 */
  unit?: string
  /** numericTypography 토큰 1:1 (rpmValue / fanoValue / guideRange) */
  size: 'rpm' | 'fano' | 'guide'
  /** measureStatusTokens.valueFg 주입용 — 기본 text.primary */
  valueColor?: string
}

const SIZE_TO_TYPOGRAPHY = {
  rpm: numericTypography.rpmValue,
  fano: numericTypography.fanoValue,
  guide: numericTypography.guideRange,
} as const

const srOnlySx = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const

/**
 * 대형 수치 표시 (component-spec §3.8) — 전 size tabular-nums(layout shift 금지).
 * 고정 높이는 갖지 않는다 — S1 존 높이는 MeasureFigures(존) 소유.
 * "—"는 value=null일 때 동일 타이포로 렌더: aria-hidden dash + sr-only "측정값 없음".
 */
export function BigNumber({value, unit, size, valueColor}: BigNumberProps) {
  const typography = SIZE_TO_TYPOGRAPHY[size]
  return (
    <Box
      sx={[
        {display: 'inline-flex', alignItems: 'baseline', gap: 1},
        // 다크 베젤 (design-system v2 §2-6·§9): night900 다크 글래스 bg + 헤어라인 1px 보더.
        // 보더+패딩을 음수 마진으로 정확히 상쇄 — 플로우 크기 불변(고정 높이·layout shift 금지 계약,
        // 모드 토글 시에도 수치 위치 이동 없음). hex 금지 — darkColor 토큰·theme.vars(divider=hairline) 경유.
        (theme) =>
          theme.applyStyles('dark', {
            backgroundColor: darkColor.night900,
            border: `1px solid ${(theme.vars ?? theme).palette.divider}`,
            borderRadius: '12px',
            padding: '6px 14px',
            margin: '-7px -15px',
          }),
      ]}>
      <Box component="span" sx={{...typography, color: valueColor ?? 'text.primary'}}>
        {value !== null ? (
          value
        ) : (
          <>
            <span aria-hidden="true">{EM_DASH}</span>
            <Box component="span" sx={srOnlySx}>
              측정값 없음
            </Box>
          </>
        )}
      </Box>
      {unit !== undefined && (
        <Box component="span" sx={{typography: 'caption', color: 'text.secondary'}}>
          {unit}
        </Box>
      )}
    </Box>
  )
}
