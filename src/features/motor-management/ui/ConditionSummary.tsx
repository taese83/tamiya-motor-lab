import {Box, Button, Typography} from '@mui/material'

import {CONDITION_LEVEL_LABELS, STABILITY_BASELINE_COUNT, conditionLevelOf} from '@shared/config/domain'

import type {MeasureRecord} from '@entities/measure-record'

export interface ConditionSummaryProps {
  /** measuredAt asc (listMeasureRecordsByMotor 결과 그대로) */
  records: ReadonlyArray<MeasureRecord>
  /** computeStabilityBaseline 결과 — null이면 기준선 표본 수집 중 */
  baseline: number | null
  onOpenHelp: () => void
}

const LEVEL_COLOR = {ok: 'success.main', watch: 'warning.main', inspect: 'error.main'} as const

/**
 * 모터 컨디션 요약 1줄 (v2.x — 자기 기준선 비교).
 * - 기준선 미완: 수집 진행 안내(판단 없음 — 오류 톤 금지)
 * - 기준선 완성: 최신 안정도와 기준선의 비율로 ok/watch/inspect 판정 — 색+라벨 병행(REQ-NFR-003)
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

  const level = latestCv !== null ? conditionLevelOf(latestCv, baseline) : null
  const changePct =
    latestCv !== null && baseline !== null && baseline > 0
      ? Math.round((latestCv / baseline - 1) * 100)
      : null

  return (
    <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minHeight: 32}}>
      {level !== null && changePct !== null ? (
        <Typography variant="body2" sx={{fontVariantNumeric: 'tabular-nums lining-nums'}}>
          컨디션{' '}
          <Box component="span" sx={{color: LEVEL_COLOR[level], fontWeight: 700}}>
            {CONDITION_LEVEL_LABELS[level]}
          </Box>
          <Box component="span" sx={{color: 'text.secondary'}}>
            {' · 기준 대비 '}
            {changePct >= 0 ? `+${changePct}` : changePct}%
          </Box>
        </Typography>
      ) : (
        // 기준선 수집 중 — 판단하지 않는다(초기 값이 이 모터의 규격이 된다)
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
