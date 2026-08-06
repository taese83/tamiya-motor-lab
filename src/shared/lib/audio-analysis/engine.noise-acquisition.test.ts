// R67 잡음 하 획득 수용 테스트 — "시끄러운 환경에서 파노 미표시" (2026-08-06 사용자 보고).
//
// probe 실측으로 확정한 두 획득 결함이 이 파일의 고정 계약이다 (모두 획득 단계 = hint 없음):
//   ① YIN 무성 사각지대 — 잡음이 CMNDF dip을 희석해 임계(0.2)를 넘기면 무성 → 영구 weak-signal.
//   ② ÷2 서브하모닉 슬립 — CMNDF는 2T0 lag에도 동일 null을 만들므로, 잡음이 T0-dip만 임계
//      위로 밀면 표준 YIN 규칙이 2T0을 선택해 **반값 파노**를 표시한다 (probe: 순수 pink
//      2~2.5 dB·경쟁 모터 혼입·험 혼입에서 전부 215 = 430/2).
// R67은 스펙트럼 증거(EMA 평균 + comb + 엄격 게이트 + 기본파 라인 실재 + R56 그룹 선택 +
// 연속 합의)로 ①을 획득으로 전환하고, ②를 라인 실재 가드로 기각한다. 증거가 부족하면
// 반값 대신 weak-signal — "오값 표시 금지"(fixture ⑤ 계약)가 우선한다.
// 조용한 환경 회귀는 기존 fixture·real-motors 스위트가 계속 강제한다.

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

/** 참값 — 대역(170~800) 중간의 실기기형 파노 (25,800 rpm) */
const MOTOR_F0_HZ = 430
/** 오값 판정 허용 편차 — ÷2(215)·÷3(143)·×2(860)는 ±5%를 크게 벗어난다 */
const WRONG_VALUE_TOL_RATIO = 0.05

/** 실기기 스펙트럼 형상(514 모터 실측 비율 유사): 기본파 최강 + 2배 강 + 3·6배 */
const MOTOR: readonly TonePartial[] = [
  {freqHz: MOTOR_F0_HZ, amplitude: 1.0},
  {freqHz: MOTOR_F0_HZ * 2, amplitude: 0.8, phase: 0.7},
  {freqHz: MOTOR_F0_HZ * 3, amplitude: 0.5, phase: 1.9},
  {freqHz: MOTOR_F0_HZ * 6, amplitude: 0.25, phase: 2.4},
]

function noisyMix(
  extra: readonly TonePartial[],
  snrDb: number,
  seconds = 4,
  seed = 20260806,
): Float32Array {
  const signal = toneSet([...MOTOR, ...extra], seconds, FIXTURE_SAMPLE_RATE)
  return addNoiseAtSnr(signal, pinkNoise(signal.length, createRng(seed)), snrDb)
}

interface TimedEstimate {
  frameEndSec: number
  f0: number | null
  status: DisplayEstimate['status']
}

function runEngine(pcm: Float32Array, tuning: Partial<EngineTuning> = {}): TimedEstimate[] {
  const engine = createAnalysisEngine({sampleRate: FIXTURE_SAMPLE_RATE, ...tuning})
  const out: TimedEstimate[] = []
  let produced = 0
  for (let offset = 0; offset < pcm.length; offset += 1024) {
    const chunk = pcm.subarray(offset, Math.min(offset + 1024, pcm.length))
    for (const est of engine.process(chunk)) {
      const frameEndSec = (engine.frameLength + produced * engine.hopLength) / engine.decimatedRate
      // 출력 계약 불변식 (REQ-ST-003): weak-signal ⇒ 수치 미노출
      if (est.status === 'weak-signal' && (est.f0 !== null || est.rpm !== null)) {
        throw new Error(`weak-signal인데 수치 노출 (t=${frameEndSec.toFixed(3)}s)`)
      }
      out.push({frameEndSec, f0: est.f0, status: est.status})
      produced += 1
    }
  }
  return out
}

const isCorrect = (f0: number | null): boolean =>
  f0 !== null && Math.abs(f0 / MOTOR_F0_HZ - 1) <= WRONG_VALUE_TOL_RATIO
const isWrong = (f0: number | null): boolean => f0 !== null && !isCorrect(f0)

function assertNoWrongValue(estimates: readonly TimedEstimate[]): void {
  for (const e of estimates) {
    expect(
      isWrong(e.f0),
      `오값 표시 t=${e.frameEndSec.toFixed(3)}s f0=${String(e.f0)}`,
    ).toBe(false)
  }
}

describe('결함 실증 baseline — R67 off(R57 원 동작)에서는 잡음 하 정상값이 0건', () => {
  test('순수 pink 2 dB: 표시가 나오면 전부 반값(÷2) — 정상값 0건', () => {
    const estimates = runEngine(noisyMix([], 2), {noiseAcquisition: false})
    expect(estimates.length).toBeGreaterThan(100)
    expect(estimates.filter(e => isCorrect(e.f0)).length).toBe(0)
    // 결함의 실체 고정(문서화 성격): ÷2 오값이 실제로 다수 표시된다.
    // R57 원 경로 자체를 교정하는 후속 라운드가 오면 이 수치는 갱신 대상이다.
    expect(estimates.filter(e => isWrong(e.f0)).length).toBeGreaterThan(30)
  })

  test('경쟁 모터 혼입(613 Hz, 상대 진폭 0.5): 전 프레임 반값 표시', () => {
    const interferer: TonePartial[] = [
      {freqHz: 613, amplitude: 0.5, phase: 1.1},
      {freqHz: 1226, amplitude: 0.4, phase: 0.4},
    ]
    const estimates = runEngine(noisyMix(interferer, 10), {noiseAcquisition: false})
    expect(estimates.filter(e => isCorrect(e.f0)).length).toBe(0)
    expect(estimates.filter(e => isWrong(e.f0)).length).toBeGreaterThan(100)
  })
})

describe('R67 on — YIN 무성 사각지대(2 dB)에서 스펙트럼 증거로 획득', () => {
  const estimates = runEngine(noisyMix([], 2))
  const numeric = estimates.filter(e => e.f0 !== null)

  test('2초 안에 획득한다 (EMA 4프레임 + 연속 합의 6프레임 ≈ 0.5 s 예산)', () => {
    expect(numeric.length).toBeGreaterThan(0)
    expect(numeric[0]!.frameEndSec).toBeLessThan(2.0)
  })

  test('오값 0 — 표시된 모든 수치가 참값 ±5% 이내', () => {
    assertNoWrongValue(estimates)
    expect(numeric.length).toBeGreaterThan(0)
  })

  test('획득 후 표시가 이어진다 — 후반 2초 수치 커버리지 ≥ 70%', () => {
    const tail = estimates.filter(e => e.frameEndSec >= 2.0)
    const covered = tail.filter(e => e.f0 !== null).length / Math.max(1, tail.length)
    expect(covered).toBeGreaterThanOrEqual(0.7)
  })

  test('정밀도 — 수치 중앙값이 참값 ±3 Hz 이내', () => {
    const values = numeric.map(e => e.f0!).sort((a, b) => a - b)
    const median = values[Math.floor(values.length / 2)]!
    expect(Math.abs(median - MOTOR_F0_HZ)).toBeLessThan(3)
  })
})

describe('R67 on — ÷2 슬립 구간이 정상값으로 교정된다 (라인 실재 가드 + fallback)', () => {
  test('순수 pink 2.5 dB (off는 전 프레임 반값): 오값 0 + 정상 획득', () => {
    const estimates = runEngine(noisyMix([], 2.5))
    assertNoWrongValue(estimates)
    expect(estimates.filter(e => isCorrect(e.f0)).length).toBeGreaterThan(50)
  })

  test('경쟁 모터 혼입 0.5 (off는 전 프레임 반값): 오값 0 + 정상 획득', () => {
    const interferer: TonePartial[] = [
      {freqHz: 613, amplitude: 0.5, phase: 1.1},
      {freqHz: 1226, amplitude: 0.4, phase: 0.4},
    ]
    const estimates = runEngine(noisyMix(interferer, 10))
    assertNoWrongValue(estimates)
    expect(estimates.filter(e => isCorrect(e.f0)).length).toBeGreaterThan(50)
  })

  test('험/방송음 혼입(187 Hz, 0.7 — off는 전 프레임 반값): 증거 부족이면 반값 대신 미표시', () => {
    const estimates = runEngine(noisyMix([{freqHz: 187, amplitude: 0.7, phase: 2.0}], 10))
    assertNoWrongValue(estimates)
  })
})

describe('R67 안전 하한 — 증거가 못 미치는 심잡음에서는 여전히 weak-signal', () => {
  test('0 dB: 전 구간 weak-signal (fixture ⑤ 오값 금지 계약의 연장)', () => {
    const estimates = runEngine(noisyMix([], 0))
    expect(estimates.length).toBeGreaterThan(100)
    for (const e of estimates) {
      expect(e.status, `t=${e.frameEndSec.toFixed(3)}s f0=${String(e.f0)}`).toBe('weak-signal')
    }
  })
})
