import {Box} from '@mui/material'
import {numericTypography} from '@shared/config/design-tokens'
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
    // v3: 개별 베젤 제거 — 베젤·비네트는 존(MeasureFigures) 소유 (design-system v3 §10 낙차)
    <Box sx={{display: 'inline-flex', alignItems: 'baseline', gap: 1}}>
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
