import {describe, expect, it} from 'vitest'

import {clampVoltage, recommendVoltageHeuristic} from './voltage-advisor'

import type {VoltageAdviceRace} from './voltage-advisor'

// 전압 추천 휴리스틱 unit (v2.31 / v2.33 상관 학습). 추천값·상관 학습은 매 입력마다 사용자에게
// 보이는 숫자라 규칙을 고정한다.

const race = (over: Partial<VoltageAdviceRace> = {}): VoltageAdviceRace => ({
  voltage: 2.7,
  result: 'finished',
  panoHz: 400,
  ...over,
})

describe('clampVoltage', () => {
  it('0.1 step으로 반올림하고 0.1~9.9로 클램프한다', () => {
    expect(clampVoltage(2.74)).toBe(2.7)
    expect(clampVoltage(2.76)).toBe(2.8)
    expect(clampVoltage(-5)).toBe(0.1)
    expect(clampVoltage(99)).toBe(9.9)
  })
  it('비유한값은 최소값으로 방어한다', () => {
    expect(clampVoltage(Number.NaN)).toBe(0.1)
  })
})

describe('recommendVoltageHeuristic — 목표 기준값(이력 0건)', () => {
  it('속도>안정>완주 순으로 시작한다', () => {
    const base = {currentPanoHz: 400, history: []}
    const finish = recommendVoltageHeuristic({...base, goal: 'finish'}).voltage
    const stability = recommendVoltageHeuristic({...base, goal: 'stability'}).voltage
    const speed = recommendVoltageHeuristic({...base, goal: 'speed'}).voltage
    expect(finish).toBeLessThan(stability)
    expect(stability).toBeLessThan(speed)
  })
})

describe('recommendVoltageHeuristic — 파노 비례(이력 1건)', () => {
  it('같은 파노·안정 목표면 직전 전압을 그대로 쓴다', () => {
    const advice = recommendVoltageHeuristic({
      goal: 'stability',
      currentPanoHz: 400,
      history: [race({voltage: 3.0, panoHz: 400})],
    })
    expect(advice.voltage).toBe(3.0)
  })

  it('파노가 2배면 전압도 비례해 커진다(원점 통과 비례)', () => {
    const advice = recommendVoltageHeuristic({
      goal: 'stability',
      currentPanoHz: 800,
      history: [race({voltage: 3.0, panoHz: 400})],
    })
    expect(advice.voltage).toBeCloseTo(6.0, 5)
  })
})

describe('recommendVoltageHeuristic — 파노-전압 추세선(이력 2건+)', () => {
  // (400,2.5),(500,3.5) → 기울기 0.01/Hz, 절편 −1.5 → V(P)=0.01P−1.5
  const history = [race({voltage: 3.5, panoHz: 500}), race({voltage: 2.5, panoHz: 400})]

  it('학습한 추세선을 현재 파노에서 평가한다', () => {
    const advice = recommendVoltageHeuristic({goal: 'stability', currentPanoHz: 450, history})
    expect(advice.voltage).toBe(3.0) // 0.01·450−1.5 = 3.0
  })

  it('파노가 오르면 추세선을 따라 전압도 오른다(학습된 방향)', () => {
    const low = recommendVoltageHeuristic({goal: 'stability', currentPanoHz: 450, history}).voltage
    const high = recommendVoltageHeuristic({goal: 'stability', currentPanoHz: 600, history}).voltage
    expect(high).toBeGreaterThan(low)
  })

  it('속도 목표는 완주 목표보다 높은 전압을 추천한다(동일 파노)', () => {
    const finish = recommendVoltageHeuristic({goal: 'finish', currentPanoHz: 450, history}).voltage
    const speed = recommendVoltageHeuristic({goal: 'speed', currentPanoHz: 450, history}).voltage
    expect(speed).toBeGreaterThan(finish)
  })
})

describe('recommendVoltageHeuristic — 이탈 회피 · 방어', () => {
  it('비슷한 파노에서 이탈했던 전압 이상은 회피한다', () => {
    // 안정 추천이 3.0인데 파노 450 근처에서 2.8V 이탈 이력 → 2.8 미만으로 낮춤
    const history = [
      race({voltage: 3.5, panoHz: 500, result: 'finished'}),
      race({voltage: 2.5, panoHz: 400, result: 'finished'}),
      race({voltage: 2.8, panoHz: 450, result: 'retired'}),
    ]
    const advice = recommendVoltageHeuristic({goal: 'stability', currentPanoHz: 450, history})
    expect(advice.voltage).toBeLessThan(2.8)
  })

  it('항상 0.1~9.9로 클램프하고 원본 history를 변형하지 않으며 source=heuristic', () => {
    const history = [race({voltage: 9.9, panoHz: 400})]
    const snapshot = JSON.stringify(history)
    const advice = recommendVoltageHeuristic({goal: 'speed', currentPanoHz: 900, history})
    expect(advice.voltage).toBeLessThanOrEqual(9.9)
    expect(advice.voltage).toBeGreaterThanOrEqual(0.1)
    expect(JSON.stringify(history)).toBe(snapshot)
    expect(advice.source).toBe('heuristic')
  })
})
