import {describe, expect, it} from 'vitest'

import {
  assignExponentialWeights,
  clampVoltage,
  recommendVoltageHeuristic,
} from './voltage-advisor'

import type {VoltageAdviceRace} from './voltage-advisor'

// 전압 추천 휴리스틱 unit (v2.31 상관 학습 / v2.34 권장 대역 2.6~3.2 + 속도 다운그레이드).
// 추천값·상관 학습은 매 입력마다 사용자에게 보이는 숫자라 규칙을 고정한다.

const race = (over: Partial<VoltageAdviceRace> = {}): VoltageAdviceRace => ({
  voltage: 2.9,
  result: 'finished',
  panoHz: 400,
  ...over,
})

describe('clampVoltage — 권장 대역 2.6~3.2, 0.02 step', () => {
  it('0.02 step 반올림 + 2.6~3.2로 클램프', () => {
    expect(clampVoltage(2.94)).toBe(2.94) // 0.02 배수는 유지
    expect(clampVoltage(2.93)).toBe(2.94) // 0.02 반올림
    expect(clampVoltage(2.97)).toBe(2.98)
    expect(clampVoltage(1.0)).toBe(2.6) // 하한
    expect(clampVoltage(99)).toBe(3.2) // 상한
  })
  it('비유한값은 하한으로 방어', () => {
    expect(clampVoltage(Number.NaN)).toBe(2.6)
  })
})

describe('recommendVoltageHeuristic — 목표 기준값(이력 0건)', () => {
  it('완주 2.6 < 안정 2.9 < 속도 3.2', () => {
    const base = {currentPanoHz: 400, history: []}
    expect(recommendVoltageHeuristic({...base, goal: 'finish'}).voltage).toBe(2.6)
    expect(recommendVoltageHeuristic({...base, goal: 'stability'}).voltage).toBe(2.9)
    expect(recommendVoltageHeuristic({...base, goal: 'speed'}).voltage).toBe(3.2)
  })
})

describe('recommendVoltageHeuristic — 파노↔전압 상관', () => {
  it('이력 1건, 같은 파노·안정이면 직전 전압을 그대로', () => {
    const advice = recommendVoltageHeuristic({
      goal: 'stability',
      currentPanoHz: 400,
      history: [race({voltage: 3.0, panoHz: 400})],
    })
    expect(advice.voltage).toBe(3.0)
  })

  it('이력 2건, 학습한 추세선을 현재 파노에서 평가', () => {
    // (400,2.7),(500,3.1) → 기울기 0.004/Hz, 절편 1.1 → V(450)=2.9
    const history = [race({voltage: 3.1, panoHz: 500}), race({voltage: 2.7, panoHz: 400})]
    expect(recommendVoltageHeuristic({goal: 'stability', currentPanoHz: 450, history}).voltage).toBe(
      2.9,
    )
  })

  it('파노가 오르면 추세선을 따라 전압도 오른다', () => {
    const history = [race({voltage: 3.1, panoHz: 500}), race({voltage: 2.7, panoHz: 400})]
    const low = recommendVoltageHeuristic({goal: 'stability', currentPanoHz: 420, history}).voltage
    const high = recommendVoltageHeuristic({goal: 'stability', currentPanoHz: 480, history}).voltage
    expect(high).toBeGreaterThan(low)
  })
})

describe('recommendVoltageHeuristic — 속도 상한 다운그레이드', () => {
  it('속도가 3.2V를 넘겨야 하면 안정으로 낮추고 근거에 밝힌다', () => {
    // base 3.0 → speed 3.3(>3.2) → 안정(3.0)으로 다운그레이드
    const history = [race({voltage: 3.0, panoHz: 400})]
    const speed = recommendVoltageHeuristic({goal: 'speed', currentPanoHz: 400, history})
    const stability = recommendVoltageHeuristic({goal: 'stability', currentPanoHz: 400, history})
    expect(speed.voltage).toBe(stability.voltage)
    expect(speed.rationale).toContain('안정 권장')
  })

  it('헤드룸이 있으면 속도는 완주보다 높게 추천', () => {
    // base 2.7 → speed 3.0(<=3.2, 허용), finish 2.4→클램프 2.6
    const history = [race({voltage: 2.7, panoHz: 400})]
    const finish = recommendVoltageHeuristic({goal: 'finish', currentPanoHz: 400, history}).voltage
    const speed = recommendVoltageHeuristic({goal: 'speed', currentPanoHz: 400, history}).voltage
    expect(speed).toBeGreaterThan(finish)
  })
})

describe('assignExponentialWeights — 지수 가중치(v2.37)', () => {
  it('최신순 입력에 오래된=1, 최근일수록 GROWTH^rank', () => {
    const h = [race({voltage: 3.0}), race({voltage: 2.9}), race({voltage: 2.8})] // 최신→오래됨
    const w = assignExponentialWeights(h, 1.5).map(r => r.weight)
    expect(w).toEqual([2.25, 1.5, 1]) // 최신 1.5² / 1.5¹ / 오래된 1.5⁰
  })
  it('원본 배열을 변형하지 않는다', () => {
    const h = [race(), race()]
    const before = JSON.stringify(h)
    assignExponentialWeights(h)
    expect(JSON.stringify(h)).toBe(before)
  })
})

describe('recommendVoltageHeuristic — 가중 추세(v2.37)', () => {
  it('가중치가 큰(최근) 기록 쪽으로 기운다', () => {
    // 같은 파노(400)에서 오래된 2.7(w=1) vs 최근 3.0(w=5) → 가중 평균은 3.0쪽(단순평균 2.85 초과)
    const history = [
      race({voltage: 3.0, panoHz: 400, weight: 5}),
      race({voltage: 2.7, panoHz: 400, weight: 1}),
    ]
    const advice = recommendVoltageHeuristic({goal: 'stability', currentPanoHz: 400, history})
    expect(advice.voltage).toBeGreaterThan(2.85)
  })
})

describe('recommendVoltageHeuristic — 이탈 회피 · 방어', () => {
  it('비슷한 파노에서 이탈했던 전압 이상은 회피', () => {
    const history = [
      race({voltage: 3.1, panoHz: 500, result: 'finished'}),
      race({voltage: 2.7, panoHz: 400, result: 'finished'}),
      race({voltage: 2.9, panoHz: 450, result: 'retired'}),
    ]
    const advice = recommendVoltageHeuristic({goal: 'stability', currentPanoHz: 450, history})
    expect(advice.voltage).toBeLessThan(2.9)
  })

  it('항상 2.6~3.2로 클램프하고 원본 불변, source=heuristic', () => {
    const history = [race({voltage: 3.0, panoHz: 400})]
    const snapshot = JSON.stringify(history)
    const advice = recommendVoltageHeuristic({goal: 'speed', currentPanoHz: 900, history})
    expect(advice.voltage).toBeLessThanOrEqual(3.2)
    expect(advice.voltage).toBeGreaterThanOrEqual(2.6)
    expect(JSON.stringify(history)).toBe(snapshot)
    expect(advice.source).toBe('heuristic')
  })
})
