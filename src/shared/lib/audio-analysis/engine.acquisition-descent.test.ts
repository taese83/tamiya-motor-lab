// R69 초기 잠금 검증 테스트 — N1 완화 (pano-tuner-comparison.md §4 권고 1).
//
// 고정하는 계약: 신규 획득(무hint)에서 YIN 최단 lag가 2f0에 잠길 때(기본파 약한 원거리
// 레짐 — R58 거리 확대가 노출을 키움), f0/2의 비공유 배음(0.5·1.5·2.5f0) 실증거가 R63
// 기준(국소 SNR ≥12dB + 메인 라인 대비 전력 ≥10%)으로 있으면 하강 시작값을 채택한다.
// 추적 중 로직(R62~R65)은 무변경 — 이 검사는 무hint 획득 프레임 한정이다.
// 정상 신호(기본파 최강)에서는 하강이 발화하지 않아야 한다(오하강 = 새 결함).

import {describe, expect, test} from 'vitest'

import {
  FIXTURE_SAMPLE_RATE,
  addNoiseAtSnr,
  createRng,
  pinkNoise,
  toneSet,
  type TonePartial,
} from './__fixtures__/synth'
import {createAnalysisEngine} from './engine'
import type {DisplayEstimate, EngineTuning} from './types'

/** 참값 — 대역(170~800) 하부의 실기기형 파노 (18,000 rpm). 2f0=600도 대역 내 → 오잠금 가능 */
const TRUE_F0_HZ = 300
const DOUBLE_F0_HZ = TRUE_F0_HZ * 2
const TOL_RATIO = 0.05

/**
 * 기본파 약한 원거리 레짐: 짝수 배음(600·1200)이 지배하고 홀수 실성분은 900 라인에
 * 응축(참값 300의 3배음 = 600/2의 비공유 배음 1.5×600). 시간영역에서 300-주기 dip은
 * 홀수 성분 비율이 낮아 얕고, 600-주기 dip이 최단 lag로 임계를 먼저 통과한다.
 */
const WEAK_FUNDAMENTAL_MOTOR: readonly TonePartial[] = [
  {freqHz: TRUE_F0_HZ, amplitude: 0.1, phase: 0.3},
  {freqHz: DOUBLE_F0_HZ, amplitude: 1.0},
  {freqHz: TRUE_F0_HZ * 3, amplitude: 0.35, phase: 1.9},
  {freqHz: TRUE_F0_HZ * 4, amplitude: 0.6, phase: 0.7},
]

/** 정상 스펙트럼(기본파 최강) — 오하강 부재 확인용 */
const HEALTHY_MOTOR: readonly TonePartial[] = [
  {freqHz: TRUE_F0_HZ, amplitude: 1.0},
  {freqHz: TRUE_F0_HZ * 2, amplitude: 0.8, phase: 0.7},
  {freqHz: TRUE_F0_HZ * 3, amplitude: 0.5, phase: 1.9},
]

function synth(partials: readonly TonePartial[], snrDb: number, seconds = 3): Float32Array {
  const signal = toneSet([...partials], seconds, FIXTURE_SAMPLE_RATE)
  return addNoiseAtSnr(signal, pinkNoise(signal.length, createRng(20260819)), snrDb)
}

function runEngine(pcm: Float32Array, tuning: Partial<EngineTuning> = {}): (number | null)[] {
  const engine = createAnalysisEngine({sampleRate: FIXTURE_SAMPLE_RATE, ...tuning})
  const out: (number | null)[] = []
  for (let offset = 0; offset < pcm.length; offset += 1024) {
    const chunk = pcm.subarray(offset, Math.min(offset + 1024, pcm.length))
    for (const est of engine.process(chunk) as Iterable<DisplayEstimate>) {
      out.push(est.f0)
    }
  }
  return out
}

const near = (f0: number | null, target: number): boolean =>
  f0 !== null && Math.abs(f0 / target - 1) <= TOL_RATIO

describe('R69 — 신규 획득 초기 잠금 검증 (N1)', () => {
  test('기본파 약한 신호: 배값(600) 고착 없이 참값(300)으로 획득·유지된다', () => {
    const values = runEngine(synth(WEAK_FUNDAMENTAL_MOTOR, 30))
    const numeric = values.filter((f): f is number => f !== null)
    expect(numeric.length).toBeGreaterThan(30)
    // N1의 정의: 잘못된 초기 잠금은 "구조적으로 고착"된다 — 한 프레임이라도 배값이
    // 표시되고 이후 참값으로 수렴하지 못하면 결함 재현이다.
    const doubled = numeric.filter(f => near(f, DOUBLE_F0_HZ)).length
    const correct = numeric.filter(f => near(f, TRUE_F0_HZ)).length
    expect(doubled, `배값(${DOUBLE_F0_HZ}) 표시 ${doubled}프레임`).toBe(0)
    expect(correct).toBeGreaterThan(30)
  })

  test('정상 신호(기본파 최강): 획득 하강이 발화하지 않는다 — 150 오하강 0건', () => {
    const values = runEngine(synth(HEALTHY_MOTOR, 30))
    const numeric = values.filter((f): f is number => f !== null)
    expect(numeric.length).toBeGreaterThan(30)
    const halved = numeric.filter(f => near(f, TRUE_F0_HZ / 2)).length
    const correct = numeric.filter(f => near(f, TRUE_F0_HZ)).length
    expect(halved, `오하강(150) 표시 ${halved}프레임`).toBe(0)
    expect(correct).toBeGreaterThan(30)
  })
})
