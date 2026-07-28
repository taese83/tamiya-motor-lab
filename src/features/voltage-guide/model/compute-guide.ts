import {byCreatedAtDescIdAsc} from '@entities/run-record'
import {GUIDE_MIN_SATISFIED, WIDE_VARIANCE_THRESHOLD} from '@shared/config/domain'

import type {RunRecord} from '@entities/run-record'

// computeGuide 순수 함수 계약 (api-schema §7 canonical — F8, REQ-F-006·REQ-ST-006).
// IO 0건: 부수효과·비동기·전역 접근·Date/random 금지 — seed 배열만으로 결정적 검증 가능.
// 결과는 IndexedDB·전역 store에 영속 금지 (INV-09/INV-10) — TanStack Query in-memory 캐시 +
// invalidation만. guideQueries 합성(listSatisfiedRecords + computeGuide)은 api 세그먼트 소관.

/** 동일 전압 그룹 — S5 "2.8 V × 1 · 2.9 V × 1 · 3.0 V × 2" 텍스트 원천 (전압 오름차순) */
export interface GuideDistributionEntry {
  readonly voltage: number
  readonly count: number
}

export type GuideResult =
  | {
      readonly kind: 'recommendation'
      /** 만족 기록 전압 min (A6 — 평균·중앙값 아님, 근거 투명성 원칙) */
      readonly rangeMin: number
      /** 만족 기록 전압 max (A6) */
      readonly rangeMax: number
      readonly satisfiedCount: number
      /** 동일 전압 그룹핑, 전압 오름차순 */
      readonly distribution: readonly GuideDistributionEntry[]
      /** (max − min) ≥ WIDE_VARIANCE_THRESHOLD(0.5 V) → 분산 큼 보조 문구 (E-4) */
      readonly wideVariance: boolean
      /** 근거 기록 — createdAt 내림차순, 동률 시 id 오름차순 (INV-08 공용 비교자) */
      readonly evidence: readonly RunRecord[]
    }
  | {
      readonly kind: 'insufficient'
      readonly satisfiedCount: number
      /** GUIDE_MIN_SATISFIED − n — UI 문구 "n건 더 필요 (n/3)" (D1/E-2) */
      readonly needed: number
    }

/**
 * 전압 가이드 계산 (F8 — 동기·무실패·IO 없음).
 *
 * - 입력은 `listSatisfiedRecords` 결과(만족 기록 배열)이되, 방어적으로
 *   `satisfied !== true` 항목은 무시한다(멱등 — api-schema §7).
 * - 부족 판정: n < GUIDE_MIN_SATISFIED(3) → insufficient (0·1·2건 동일 계약).
 * - wideVariance는 float 안전 비교: 전압을 × 100 정수(cent)로 반올림해 비교 —
 *   `2.9−2.4=0.4999…` 같은 부동소수 오차로 임계 경계가 뒤집히는 결함 방지.
 * - 측정값 null 기록(panoHz/rpm null — D2)도 voltage·satisfied만 쓰므로 동등 집계.
 */
export function computeGuide(records: readonly RunRecord[]): GuideResult {
  const satisfied = records.filter(record => record.satisfied)
  const satisfiedCount = satisfied.length

  if (satisfiedCount < GUIDE_MIN_SATISFIED) {
    return {
      kind: 'insufficient',
      satisfiedCount,
      needed: GUIDE_MIN_SATISFIED - satisfiedCount,
    }
  }

  // 전압을 정수 cent(× 100)로 정규화해 그룹핑·min/max·임계 비교 전부 정수 연산으로 수행
  const countByCents = new Map<number, number>()
  let minCents = Number.POSITIVE_INFINITY
  let maxCents = Number.NEGATIVE_INFINITY
  for (const record of satisfied) {
    const cents = Math.round(record.voltage * 100)
    countByCents.set(cents, (countByCents.get(cents) ?? 0) + 1)
    if (cents < minCents) minCents = cents
    if (cents > maxCents) maxCents = cents
  }

  const distribution: GuideDistributionEntry[] = [...countByCents.entries()]
    .sort(([a], [b]) => a - b)
    .map(([cents, count]) => ({voltage: cents / 100, count}))

  return {
    kind: 'recommendation',
    rangeMin: minCents / 100,
    rangeMax: maxCents / 100,
    satisfiedCount,
    distribution,
    wideVariance: maxCents - minCents >= Math.round(WIDE_VARIANCE_THRESHOLD * 100),
    evidence: [...satisfied].sort(byCreatedAtDescIdAsc),
  }
}
