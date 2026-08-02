import {afterEach, describe, expect, it, vi} from 'vitest'

import {recommendVoltage} from './recommend-voltage'

import type {VoltageAdviceInput} from '@shared/lib/voltage-advisor'

// [AI 추천] 어댑터 방향 안전장치 unit (R35). 실 LLM(Haiku)은 로컬에서 못 돌리므로, 서버 응답을
// mock해 "파노↑→전압↓ 원칙을 어긴 LLM 출력"이 들어와도 결정론적으로 방어되는지 고정한다.
// 배경: 사용자 제보 — 파노 474→526인데 [AI 추천]이 완주 전압을 2.81로 올림(작은 모델이 "파노 높음=
// 고전압" 직관으로 회귀). 프롬프트 강화와 별개로, 어댑터가 속도 유지 기준 초과를 폴백으로 잡는다.

function mockFetch(body: {voltage: number; rationale: string}): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ok: true, json: () => Promise.resolve(body)})),
  )
}

// 파노 474에서 2.9V 완주 → 속도 유지로 파노 526에선 완주값이 2.6(휴리스틱). LLM이 이보다 크게 높으면 위반.
const finishInput: VoltageAdviceInput = {
  goal: 'finish',
  currentPanoHz: 526,
  history: [{voltage: 2.9, panoHz: 474, result: 'finished'}],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('recommendVoltage — 방향 안전장치(R35)', () => {
  it('완주 목표에서 LLM이 속도 유지 기준보다 크게 높으면 휴리스틱으로 폴백한다', async () => {
    mockFetch({voltage: 2.82, rationale: 'AI가 파노 높다고 전압을 올림(원칙 위반)'})
    const advice = await recommendVoltage(finishInput)
    expect(advice.source).toBe('heuristic') // LLM 폐기 → 결정론적 폴백
    expect(advice.voltage).toBe(2.6) // 파노 526 속도 유지 완주값(오히려 낮아짐)
  })

  it('LLM이 기준 이하(허용오차 내)면 AI 결과를 그대로 쓴다', async () => {
    mockFetch({voltage: 2.64, rationale: 'AI 보수적'})
    const advice = await recommendVoltage(finishInput)
    expect(advice.source).toBe('ai')
    expect(advice.voltage).toBe(2.64)
  })

  it('speed 목표는 상한 방어를 걸지 않는다(높음이 목표)', async () => {
    mockFetch({voltage: 3.2, rationale: '속도 우선'})
    const advice = await recommendVoltage({...finishInput, goal: 'speed'})
    expect(advice.source).toBe('ai')
    expect(advice.voltage).toBe(3.2)
  })

  it('네트워크 실패면 휴리스틱으로 폴백한다(기존 계약 유지)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network'))),
    )
    const advice = await recommendVoltage(finishInput)
    expect(advice.source).toBe('heuristic')
  })
})
