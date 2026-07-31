import {Box, Typography} from '@mui/material'
import {formatDateTimeShort, formatPanoValue, formatRpm} from '@shared/lib/format'
import {BigNumber} from '@shared/ui/big-number'

// LatestPanoHero (R17) — 모터 상세 '파노 추세' 차트 위 히어로. 가장 최근 기록의 파노를 크게
// 강조한다. 실제 콘텐츠(aria-hidden 아님) — 차트와 달리 기록 리스트와 별개의 라벨된 요약이다.

export interface LatestPanoHeroProps {
  /** 가장 최근 측정값 파노 주파수(Hz). 소비 측이 measuredAt asc 배열의 마지막 원소에서 전달 */
  panoHz: number
  /** 측정 시각 ISO 문자열 */
  measuredAt: string
  /** 측정 회전수(rpm) */
  rpm: number
}

/**
 * 세로 스택: overline 라벨 → BigNumber 히어로 수치(라임) → 측정 시각·rpm 보조행.
 * 고정 높이·margin을 갖지 않는다 — 간격은 소비 측(fixedTop gap) 소유, 반응형은
 * BigNumber 타이포 토큰(clamp)이 처리. 포맷은 전부 `@shared/lib/format` 경유.
 */
export function LatestPanoHero({panoHz, measuredAt, rpm}: LatestPanoHeroProps) {
  return (
    <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.25}}>
      <Typography variant="overline" component="span" sx={{color: 'text.secondary', lineHeight: 1}}>
        최근 파노
      </Typography>
      <BigNumber size="guide" value={formatPanoValue(panoHz)} unit="Hz" valueColor="primary.main" />
      <Typography
        variant="body2"
        component="span"
        sx={{color: 'text.secondary', fontVariantNumeric: 'tabular-nums lining-nums'}}
      >
        {formatDateTimeShort(measuredAt)} · {formatRpm(rpm)} rpm
      </Typography>
    </Box>
  )
}
