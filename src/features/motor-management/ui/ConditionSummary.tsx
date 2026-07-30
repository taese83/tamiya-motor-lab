import {Box, Button, Typography} from '@mui/material'

import {
  CONDITION_LEVEL_LABELS,
  STABILITY_BASELINE_COUNT,
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

// 추세(기준선 대비) 등급색
const TREND_COLOR = {ok: 'success.main', watch: 'warning.main', inspect: 'error.main'} as const
// 절대(변동률 자체) 등급색 — MeasureFigures·PanoGauge 부채꼴과 동일 체계(기능 간 import 금지로 각자 보유)
const ABS_COLOR: Record<StabilityLevel, string> = {
  excellent: 'success.main',
  good: 'success.main',
  fair: 'warning.main',
  high: 'error.main',
}

/**
 * 모터 컨디션 요약 1줄 (v2.x 2축 — 사용자 확정).
 * [1축 절대] 최신 변동률 자체의 4구간(stabilityLevelOf) — "지금 상태가 괜찮은가"
 * [2축 추세] 기준선 대비 비율(conditionLevelOf) — "나빠지고 있는가"
 * 표시 우선순위:
 * 1) 기준선 자체가 high(≥1.5%) 구간 → **신뢰 경고 우선**(추세 비교 보류) — 기준이 이미 흔들린
 *    상태에서 추세 '양호'가 상태 양호로 위장하는 맹점(사용자 지적) 차단.
 * 2) 기준선 완성 + 신뢰 가능 → "변동 {절대} · 추세 {컨디션} (기준 대비 ±N%)"
 * 3) 기준선 수집 중인데 안정도 보유 기록 있음 → 절대 축만 + 수집 진행
 * 4) 안정도 보유 기록 없음 → 수집 안내(판단 없음 — 오류 톤 금지)
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

  const withCvCount = records.reduce(
    (count, record) => (record.stabilityCv !== undefined ? count + 1 : count),
    0,
  )

  const absLevel = latestCv !== null ? stabilityLevelOf(latestCv) : null
  const baselineUntrusted = baseline !== null && baseline >= STABILITY_HIGH_MIN_CV
  const trendLevel =
    latestCv !== null && !baselineUntrusted ? conditionLevelOf(latestCv, baseline) : null
  const changePct =
    latestCv !== null && baseline !== null && baseline > 0
      ? Math.round((latestCv / baseline - 1) * 100)
      : null

  return (
    <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minHeight: 32}}>
      {latestCv !== null && absLevel !== null ? (
        <Typography variant="body2" sx={{fontVariantNumeric: 'tabular-nums lining-nums'}}>
          변동{' '}
          <Box component="span" sx={{color: ABS_COLOR[absLevel], fontWeight: 700}}>
            {STABILITY_LEVEL_LABELS[absLevel]}
          </Box>
          {baselineUntrusted ? (
            // 1) 기준선 신뢰 경고 — 추세 판정 대신 우선 표시
            <>
              <Box component="span" sx={{color: 'text.secondary'}}>
                {' · '}
              </Box>
              <Box component="span" sx={{color: 'warning.main', fontWeight: 700}}>
                기준값 자체가 커요
              </Box>
              <Box component="span" sx={{color: 'text.secondary'}}>
                {' — 추세 비교 보류. 조용한 곳에서 기록을 초기화하고 다시 재보세요'}
              </Box>
            </>
          ) : trendLevel !== null && changePct !== null ? (
            // 2) 정상 2축 표시
            <>
              <Box component="span" sx={{color: 'text.secondary'}}>
                {' · 추세 '}
              </Box>
              <Box component="span" sx={{color: TREND_COLOR[trendLevel], fontWeight: 700}}>
                {CONDITION_LEVEL_LABELS[trendLevel]}
              </Box>
              <Box component="span" sx={{color: 'text.secondary'}}>
                {' (기준 대비 '}
                {changePct >= 0 ? `+${changePct}` : changePct}%)
              </Box>
            </>
          ) : (
            // 3) 기준선 수집 중 — 절대 축만 판단, 추세는 수집 진행 안내
            <Box component="span" sx={{color: 'text.secondary'}}>
              {' · 추세 기준 만드는 중 ('}
              {Math.min(withCvCount, STABILITY_BASELINE_COUNT)}/{STABILITY_BASELINE_COUNT}회)
            </Box>
          )}
        </Typography>
      ) : (
        // 4) 안정도 보유 기록 없음 — 판단하지 않는다
        <Typography variant="body2" sx={{color: 'text.secondary'}}>
          컨디션 기준 만드는 중 ({Math.min(withCvCount, STABILITY_BASELINE_COUNT)}/
          {STABILITY_BASELINE_COUNT}회) — 측정을 기록하면 비교가 시작돼요
        </Typography>
      )}
      <Button size="small" variant="text" onClick={onOpenHelp} sx={{ml: 'auto', flexShrink: 0}}>
        보는 법
      </Button>
    </Box>
  )
}
