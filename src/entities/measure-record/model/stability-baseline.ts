import {STABILITY_BASELINE_COUNT} from '@shared/config/domain'

import type {MeasureRecord} from './types'

// 회전 안정도 기준선 (v2.x 개정 3 — 최상 컨디션 **영속**, 사용자 확정).
// 기준 = **역대 최상(낮은) CV STABILITY_BASELINE_COUNT건의 중앙값** — 그 모터가 실제로 낼 수
// 있는 최상 컨디션. rolling 20건과 무관하게 유지된다: 최상 3건은 motors 행(stabilityBestCvs)에
// 영속되고, collectMeasureRecord가 새 CV를 병합(더 좋은 3건만 생존)하므로 좋았던 기록이
// eviction으로 삭제돼도 기준은 절대 후퇴하지 않는다(사용자 규칙: 기존 기준이 현재 20건의
// 최상 3건보다 좋으면 유지). 기록 전체 초기화(resetAllRecords)만 기준을 지운다.
// 중앙값(=2번째로 좋은 값)을 쓰는 이유: 우연히 잘 나온 1건(뽀록)이 기준이 되어 이후 전부
// '나빠짐'으로 보이는 왜곡 방지.

/** 오름차순 정렬 후 하위 STABILITY_BASELINE_COUNT건만 생존 — collect 시 병합 갱신용 */
export function mergeBestCvs(
  current: ReadonlyArray<number>,
  incoming: ReadonlyArray<number>,
): number[] {
  return [...current, ...incoming].sort((a, b) => a - b).slice(0, STABILITY_BASELINE_COUNT)
}

/**
 * 영속된 최상 CV 표본 → 기준선 (중앙값). 표본 미달이면 null(수집 중 — 판단하지 않는다).
 * @param bestCvs Motor.stabilityBestCvs (구버전 모터는 undefined)
 */
export function baselineFromBestCvs(bestCvs: ReadonlyArray<number> | undefined): number | null {
  if (bestCvs === undefined || bestCvs.length < STABILITY_BASELINE_COUNT) return null
  const sorted = [...bestCvs].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  return median === undefined ? null : median
}

/**
 * 보관 기록에서 직접 계산하는 파생 기준선 — **영속 기준(baselineFromBestCvs)이 없을 때의
 * fallback**(지표 도입 후 아직 collect가 없어 stabilityBestCvs 미기록인 모터).
 * @param records 순서 무관 (최상값 탐색 — listMeasureRecordsByMotor 결과 그대로 사용 가능)
 */
export function computeStabilityBaseline(records: ReadonlyArray<MeasureRecord>): number | null {
  const cvs: number[] = []
  for (const record of records) {
    if (record.stabilityCv !== undefined) cvs.push(record.stabilityCv)
  }
  if (cvs.length < STABILITY_BASELINE_COUNT) return null
  return baselineFromBestCvs(mergeBestCvs([], cvs))
}
