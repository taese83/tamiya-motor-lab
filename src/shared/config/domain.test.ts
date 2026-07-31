import {describe, expect, it} from 'vitest'

import {
  RETIRE_REASON_LEAF_KEYS,
  STABILITY_EXCELLENT_MAX_CV,
  STABILITY_GOOD_MAX_CV,
  STABILITY_HIGH_MIN_CV,
  reasonPath,
  resolveSpeedRelated,
  retireReasonRowLabel,
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

// ── 이탈 사유 taxonomy (R20 — retire-reason-chipset D-R1·D-R3·D-R5) ──────────────
// 재귀 트리의 파생(leaf 튜플·경로 복원·행 라벨·speedRelated 상속)을 고정한다.
// 저장은 항상 leaf key 하나 — 트리가 경로·인과 메타를 복원하므로, 여기 어긋나면
// 목록 표시(D-R3)와 향후 AI 신호(속도형=전압 처방 / 기계형=제외)가 함께 깨진다.

describe('RETIRE_REASON_LEAF_KEYS (저장 가능 leaf 튜플)', () => {
  it('정확히 11개이고 중복이 없다 — D-R1 확정 트리(속도형 5섹션·점프 4세부·기계형 2·escape 1)', () => {
    expect(RETIRE_REASON_LEAF_KEYS).toHaveLength(11)
    expect(new Set(RETIRE_REASON_LEAF_KEYS).size).toBe(11)
  })

  it("branch key('jump')는 미포함 — 저장 대상은 leaf뿐(D-R5)", () => {
    expect(RETIRE_REASON_LEAF_KEYS).not.toContain('jump')
  })

  it('모든 leaf key가 트리에서 경로를 복원한다 — 튜플↔트리 런타임 정합(컴파일 타임 검증의 실행 확인)', () => {
    for (const key of RETIRE_REASON_LEAF_KEYS) {
      expect(reasonPath(key).length).toBeGreaterThan(0)
    }
  })
})

describe('reasonPath (루트→leaf 라벨 경로)', () => {
  it('branch 하위 leaf는 섹션 라벨부터 잇는다', () => {
    expect(reasonPath('jump_overshoot')).toEqual(['점프', '비거리 김'])
  })

  it('top-level leaf는 자기 라벨 하나다', () => {
    expect(reasonPath('corner')).toEqual(['코너 이탈'])
  })
})

describe('retireReasonRowLabel (목록 행 표시 — D-R3)', () => {
  it("branch 하위 leaf는 섹션 문맥 병기 — '점프 · 비거리 김'", () => {
    expect(retireReasonRowLabel('jump_overshoot')).toBe('점프 · 비거리 김')
  })

  it("'그 외' 계열 leaf도 경로 병기 — 말단 라벨만으로는 모호하다", () => {
    expect(retireReasonRowLabel('jump_other')).toBe('점프 · 그 외 점프')
  })

  it("top-level leaf는 라벨 그대로 — '코너 이탈'(섹션 병기 없음)", () => {
    expect(retireReasonRowLabel('corner')).toBe('코너 이탈')
  })
})

describe('resolveSpeedRelated (AI 계약 — leaf부터 부모로 상속)', () => {
  it('자기 정의 없는 leaf는 부모에서 상속 — 점프 세부는 jump(true)를 물려받는다', () => {
    expect(resolveSpeedRelated('jump_overshoot')).toBe(true)
    expect(resolveSpeedRelated('jump_attitude')).toBe(true)
  })

  it('자기 정의가 있으면 그 값 — corner(속도형) true, parts·stall(기계형) false', () => {
    expect(resolveSpeedRelated('corner')).toBe(true)
    expect(resolveSpeedRelated('parts')).toBe(false)
    expect(resolveSpeedRelated('stall')).toBe(false)
  })

  it('escape(other)는 false — 미상은 전압 처방 표본에서 제외가 안전', () => {
    expect(resolveSpeedRelated('other')).toBe(false)
  })
})
