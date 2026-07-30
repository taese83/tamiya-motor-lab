import {STABILITY_BASELINE_COUNT} from '@shared/config/domain'

import type {MeasureRecord} from './types'

// 회전 안정도 기준선 (v2.x 개정 — 자기 기준선 방식).
// "새 모터일 때의 값이 그 개체의 규격"이라는 Portescap 백서의 baseline 모니터링 방식:
// 그 모터의 **가장 오래된** 안정도 보유 기록 STABILITY_BASELINE_COUNT건의 CV 중앙값.
// 파생값 — 영속·캐시 금지(INV-09), 읽기 시 계산. 표본 미달이면 null(기준선 수집 중).

/**
 * @param records measuredAt **오름차순** (listMeasureRecordsByMotor 결과 그대로)
 * @returns 기준선 CV — 안정도 보유 기록이 STABILITY_BASELINE_COUNT건 미만이면 null
 */
export function computeStabilityBaseline(records: ReadonlyArray<MeasureRecord>): number | null {
  const cvs: number[] = []
  for (const record of records) {
    if (record.stabilityCv !== undefined) cvs.push(record.stabilityCv)
    if (cvs.length === STABILITY_BASELINE_COUNT) break // 초기 표본만 — 최근 기록이 기준선을 오염시키지 않게
  }
  if (cvs.length < STABILITY_BASELINE_COUNT) return null
  const sorted = [...cvs].sort((a, b) => a - b)
  // 홀수 표본 중앙값 (짝수면 하위 중앙 — 표본 3 고정이라 실질 홀수 경로)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted[mid]
  return median === undefined ? null : median
}
