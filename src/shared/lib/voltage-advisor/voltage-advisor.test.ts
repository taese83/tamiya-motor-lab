import {describe, expect, it} from 'vitest'

import {clampVoltage, recommendVoltageHeuristic} from './voltage-advisor'

import type {VoltageAdviceRace} from './voltage-advisor'

// 전압 추천 휴리스틱 unit (v2.31). 추천값은 매 입력마다 사용자에게 보이는 숫자라 규칙을 고정한다.

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

describe('recommendVoltageHeuristic', () => {
  it('과거 기록 없으면 목표 기준값(속도>안정>완주)에서 시작한다', () => {
    const base = {currentPanoHz: 400, history: []}
    const finish = recommendVoltageHeuristic({...base, goal: 'finish'}).voltage
    const stability = recommendVoltageHeuristic({...base, goal: 'stability'}).voltage
    const speed = recommendVoltageHeuristic({...base, goal: 'speed'}).voltage
    expect(finish).toBeLessThan(stability)
    expect(stability).toBeLessThan(speed)
  })

  it('직전 전압을 앵커로 삼는다(같은 파노·안정 목표면 직전값 근처)', () => {
    const advice = recommendVoltageHeuristic({
      goal: 'stability',
      currentPanoHz: 400,
      history: [race({voltage: 3.0, panoHz: 400})],
    })
    expect(advice.voltage).toBe(3.0) // 안정 delta 0 · 파노 변화 없음
  })

  it('직전 이탈이면 직전 전압보다 낮춘다', () => {
    const advice = recommendVoltageHeuristic({
      goal: 'stability',
      currentPanoHz: 400,
      history: [race({voltage: 3.0, result: 'retired', panoHz: 400})],
    })
    expect(advice.voltage).toBeLessThan(3.0)
  })

  it('속도 목표는 완주 목표보다 높은 전압을 추천한다(동일 이력)', () => {
    const history = [race({voltage: 3.0, panoHz: 400})]
    const finish = recommendVoltageHeuristic({goal: 'finish', currentPanoHz: 400, history}).voltage
    const speed = recommendVoltageHeuristic({goal: 'speed', currentPanoHz: 400, history}).voltage
    expect(speed).toBeGreaterThan(finish)
  })

  it('파노가 오르면(모터가 빨라짐) 안정 목표는 전압을 낮춘다', () => {
    const history = [race({voltage: 3.0, panoHz: 400})]
    const same = recommendVoltageHeuristic({goal: 'stability', currentPanoHz: 400, history}).voltage
    const faster = recommendVoltageHeuristic({goal: 'stability', currentPanoHz: 440, history}).voltage
    expect(faster).toBeLessThan(same)
  })

  it('항상 0.1~9.9 범위로 클램프하고 원본 history를 변형하지 않는다', () => {
    const history = [race({voltage: 9.9, panoHz: 400})]
    const snapshot = JSON.stringify(history)
    const advice = recommendVoltageHeuristic({goal: 'speed', currentPanoHz: 400, history})
    expect(advice.voltage).toBeLessThanOrEqual(9.9)
    expect(advice.voltage).toBeGreaterThanOrEqual(0.1)
    expect(JSON.stringify(history)).toBe(snapshot)
    expect(advice.source).toBe('heuristic')
  })
})
