import {Box, Button, Typography} from '@mui/material'

import {
  CONDITION_LEVEL_LABELS,
  STABILITY_HIGH_MIN_CV,
  STABILITY_LEVEL_LABELS,
  conditionLevelOf,
  stabilityLevelOf,
} from '@shared/config/domain'

import type {StabilityLevel} from '@shared/config/domain'
import type {MeasureRecord} from '@entities/measure-record'

export interface ConditionSummaryProps {
  /** measuredAt asc (listMeasureRecordsByMotor 결과 그대로) */
  records: ReadonlyArray<MeasureRecord>
  /** computeStabilityBaseline 결과 — null이면 기준선 표본 수집 중 */
  baseline: number | null
  onOpenHelp: () => void
}

// 절대(변동률 자체) 등급색 — MeasureFigures·PanoGauge 부채꼴과 동일 체계(기능 간 import 금지로 각자 보유)
const ABS_COLOR: Record<StabilityLevel, string> = {
  excellent: 'success.main',
  good: 'success.main',
  fair: 'warning.main',
  high: 'error.main',
}

/**
 * 모터 컨디션 요약 1줄 (v2.x — 절대 등급 + **조용한 추세**, 사용자 확정).
 * 평소엔 절대 등급(stabilityLevelOf)과 최신 변동률만 표시한다 — 추세 '양호'는 정보가 없어
 * 말하지 않는다. 추세(최상 컨디션 기준선 대비, conditionLevelOf)는 **할 말이 있을 때만** 끼어든다:
 * 1) 기준선(최상 3건 중앙값) 자체가 high(≥1.5%) 구간 → 좋았던 기록이 아예 없다는 뜻 —
 *    비교가 무의미하므로 추세 대신 재측정 안내(맹점 차단, 사용자 지적).
 * 2) 최상 대비 watch(1.5배)/inspect(2배) 이상 악화 → "가장 좋을 때보다 N배 나빠짐" 경고.
 * 3) 그 외 → 절대 등급만(조용).
 * [보는 법] 버튼으로 ConditionHelpDialog(판단 가이드)를 연다 — 열림 상태는 페이지 소유.
 */
export function ConditionSummary({records, baseline, onOpenHelp}: ConditionSummaryProps) {
  // 최신 안정도 보유 기록 (지표 도입 전 기록은 건너뜀)
  let latestCv: number | null = null
  for (let i = records.length - 1; i >= 0; i--) {
    const cv = records[i]?.stabilityCv
    if (cv !== undefined) {
      latestCv = cv
      break
    }
  }

  const absLevel = latestCv !== null ? stabilityLevelOf(latestCv) : null
  const baselineUntrusted = baseline !== null && baseline >= STABILITY_HIGH_MIN_CV
  const trendLevel =
    latestCv !== null && !baselineUntrusted ? conditionLevelOf(latestCv, baseline) : null
  const ratio = latestCv !== null && baseline !== null && baseline > 0 ? latestCv / baseline : null

  return (
    <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minHeight: 32}}>
      {latestCv !== null && absLevel !== null ? (
        <Typography variant="body2" sx={{fontVariantNumeric: 'tabular-nums lining-nums'}}>
          변동{' '}
          <Box component="span" sx={{color: ABS_COLOR[absLevel], fontWeight: 700}}>
            {STABILITY_LEVEL_LABELS[absLevel]}
          </Box>
          <Box component="span" sx={{color: 'text.secondary'}}>
            {' · '}
            {(latestCv * 100).toFixed(2)}%
          </Box>
          {baselineUntrusted ? (
            // 1) 기준선 신뢰 경고 — 최상 3건조차 high 구간 = 좋았던 기록이 없다
            <>
              <Box component="span" sx={{color: 'text.secondary'}}>
                {' · '}
              </Box>
              <Box component="span" sx={{color: 'warning.main', fontWeight: 700}}>
                좋았던 기록이 없어요
              </Box>
              <Box component="span" sx={{color: 'text.secondary'}}>
                {' — 조용한 곳에서 다시 재보세요'}
              </Box>
            </>
          ) : (
            // 2) 조용한 추세 — watch/inspect일 때만 발화(ok·수집 중엔 침묵)
            (trendLevel === 'watch' || trendLevel === 'inspect') &&
            ratio !== null && (
              <>
                <Box component="span" sx={{color: 'text.secondary'}}>
                  {' · '}
                </Box>
                <Box
                  component="span"
                  sx={{
                    color: trendLevel === 'inspect' ? 'error.main' : 'warning.main',
                    fontWeight: 700,
                  }}>
                  가장 좋을 때보다 {ratio.toFixed(1)}배 나빠짐
                </Box>
                {trendLevel === 'inspect' && (
                  <Box component="span" sx={{color: 'text.secondary'}}>
                    {' — '}
                    {CONDITION_LEVEL_LABELS.inspect}
                  </Box>
                )}
              </>
            )
          )}
        </Typography>
      ) : (
        // 안정도 보유 기록 없음 — 판단하지 않는다
        <Typography variant="body2" sx={{color: 'text.secondary'}}>
          측정을 기록하면 컨디션이 표시돼요
        </Typography>
      )}
      <Button size="small" variant="text" onClick={onOpenHelp} sx={{ml: 'auto', flexShrink: 0}}>
        보는 법
      </Button>
    </Box>
  )
}
