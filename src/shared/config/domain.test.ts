import {describe, expect, it} from 'vitest'

import {
  STABILITY_EXCELLENT_MAX_CV,
  STABILITY_GOOD_MAX_CV,
  STABILITY_HIGH_MIN_CV,
  stabilityLevelOf,
} from './domain'

// 절대 안정도 4구간(사용자 확정 2축의 1축) — 경계는 하한 포함/상한 미포함(cv < max)으로 고정한다.
// high 하한은 엔진 안정 판정 임계(DEFAULT_TUNING.stabilityCv)와 정렬된 유일한 확정 근거 경계라
// 값 자체(0.015)도 함께 고정한다 — 어긋나면 "엔진이 안정 선언 못 하는 수준" 서사가 깨진다.

describe('stabilityLevelOf', () => {
  it('경계 미만은 해당 등급, 경계값은 다음 등급 (cv < max 계약)', () => {
    expect(stabilityLevelOf(0)).toBe('excellent')
    expect(stabilityLevelOf(STABILITY_EXCELLENT_MAX_CV - 1e-9)).toBe('excellent')
    expect(stabilityLevelOf(STABILITY_EXCELLENT_MAX_CV)).toBe('good')
    expect(stabilityLevelOf(STABILITY_GOOD_MAX_CV - 1e-9)).toBe('good')
    expect(stabilityLevelOf(STABILITY_GOOD_MAX_CV)).toBe('fair')
    expect(stabilityLevelOf(STABILITY_HIGH_MIN_CV - 1e-9)).toBe('fair')
    expect(stabilityLevelOf(STABILITY_HIGH_MIN_CV)).toBe('high')
    expect(stabilityLevelOf(0.1)).toBe('high')
  })

  it('high 하한은 엔진 안정 판정 임계(1.5%)와 정렬 — 확정 근거 경계', () => {
    expect(STABILITY_HIGH_MIN_CV).toBe(0.015)
  })

  it('구간 순서 불변식: excellent < good < high 경계', () => {
    expect(STABILITY_EXCELLENT_MAX_CV).toBeLessThan(STABILITY_GOOD_MAX_CV)
    expect(STABILITY_GOOD_MAX_CV).toBeLessThan(STABILITY_HIGH_MIN_CV)
  })
})
