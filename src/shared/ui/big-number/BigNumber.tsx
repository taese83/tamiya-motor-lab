import {Box} from '@mui/material'
import {numericTypography, srOnlySx} from '@shared/config/design-tokens'
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

/**
 * 대형 수치 표시 (component-spec §3.8) — 전 size tabular-nums(layout shift 금지).
 * 고정 높이는 갖지 않는다 — S1 존 높이는 MeasureFigures(존) 소유.
 * value=null → aria-hidden dash + sr-only "측정값 없음".
 *
 * v2.13: 값 없음 dash를 **수치와 같은 크기로 그리지 않는다.** hero 사이즈(rpmValue 최대 120px)에서
 * em dash 글리프가 99×142px의 두꺼운 막대로 렌더돼 "값 없음"이 아니라 정체불명의 검은 바로 읽혔다
 * (사용자 지적 → 실측 확인). 원래 "동일 타이포" 규칙의 목적은 layout shift 방지인데, 행 높이는
 * 소비 측(MeasureFigures의 Row)이 고정하므로 글리프만 줄여도 시프트가 없다.
 * 색도 muted로 낮춰 placeholder임을 분명히 한다.
 */
export function BigNumber({value, unit, size, valueColor}: BigNumberProps) {
  const typography = SIZE_TO_TYPOGRAPHY[size]
  return (
    // v3: 개별 베젤 제거 — 베젤·비네트는 존(MeasureFigures) 소유 (design-system v3 §10 낙차)
    <Box sx={{display: 'inline-flex', alignItems: 'baseline', gap: 1}}>
      {value !== null ? (
        <Box component="span" sx={{...typography, color: valueColor ?? 'text.primary'}}>
          {value}
        </Box>
      ) : (
        // placeholder — 크기·색을 낮춘다. 행 높이는 상위 Row가 고정하므로 시프트 없음.
        // 축소 비율은 **바깥에 typography를 유지한 채 안쪽에서 em**으로 건다 —
        // 바깥에 바로 em을 주면 부모(16px) 기준으로 계산돼 글리프가 몇 px로 붕괴한다.
        <Box component="span" sx={{...typography, color: 'text.secondary'}}>
          <Box component="span" aria-hidden="true" sx={{fontSize: '0.3em', lineHeight: 1}}>
            {EM_DASH}
          </Box>
          <Box component="span" sx={srOnlySx}>
            측정값 없음
          </Box>
        </Box>
      )}
      {unit !== undefined && (
        <Box component="span" sx={{typography: 'caption', color: 'text.secondary'}}>
          {unit}
        </Box>
      )}
    </Box>
  )
}
