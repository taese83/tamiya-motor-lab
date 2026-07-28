// VP(variable projection) 정밀 추정 sanity — analysis-algorithm.md v2 §3:
// "VP 정밀도는 CRLB 대비 sanity 테스트(순음+백색잡음, 이론 분산의 3배 이내)로 확인."
// feature-plan F1 완료 조건에 포함된 항목. 전 신호는 seeded PRNG로 결정적이다.

import {describe, expect, test} from 'vitest'

import {pureToneWithWhiteNoise, toneSet} from './__fixtures__/synth'
import {refine} from './refine'

// 엔진의 VP는 데시메이션(12 kHz) 후 200 ms 프레임에서 수행된다 (v2 §1·§4)
const SAMPLE_RATE = 12000
const FRAME_LENGTH = 2400
const FRAME_SECONDS = FRAME_LENGTH / SAMPLE_RATE

describe('refine — VP 정밀 추정', () => {
  test('무잡음 off-grid 순음에서 서브 0.1 Hz 정밀도 (v2 §1 "서브 0.1 Hz")', () => {
    const trueHz = 313.37 // FFT bin격자(2.93 Hz)에 맞지 않는 주파수
    const frame = toneSet([{freqHz: trueHz, amplitude: 1}], FRAME_SECONDS, SAMPLE_RATE)
    const result = refine(frame, SAMPLE_RATE, 312.5, {harmonics: [1], searchHalfWidthHz: 3})
    expect(Math.abs(result.f0 - trueHz)).toBeLessThan(0.05)
  })

  test('배음 세트(약한 1차 + 강한 3·6차)에서 다중 고조파 VP가 f0를 복원한다', () => {
    const trueHz = 301.3
    const frame = toneSet(
      [
        {freqHz: trueHz, amplitude: 0.12},
        {freqHz: 3 * trueHz, amplitude: 1, phase: 0.7},
        {freqHz: 6 * trueHz, amplitude: 0.7, phase: 1.9},
      ],
      FRAME_SECONDS,
      SAMPLE_RATE,
    )
    const result = refine(frame, SAMPLE_RATE, 300, {harmonics: [1, 3, 6], searchHalfWidthHz: 3})
    expect(Math.abs(result.f0 - trueHz)).toBeLessThan(0.05)
    expect(result.usedHarmonics).toEqual([1, 3, 6])
  })

  test('CRLB sanity: 순음+백색잡음(SNR 20 dB)에서 추정 분산이 이론치 3배 이내', () => {
    const trueHz = 300
    const snrDb = 20
    const trials = 24
    const errors: number[] = []
    for (let i = 0; i < trials; i++) {
      // seed만 바꿔 잡음·위상을 재추첨 — 결정적 반복 시행
      const signal = pureToneWithWhiteNoise(trueHz, snrDb, FRAME_LENGTH, SAMPLE_RATE, 1000 + i)
      const result = refine(signal, SAMPLE_RATE, trueHz, {harmonics: [1], searchHalfWidthHz: 3})
      errors.push(result.f0 - trueHz)
    }
    const mean = errors.reduce((acc, e) => acc + e, 0) / trials
    const variance = errors.reduce((acc, e) => acc + (e - mean) ** 2, 0) / (trials - 1)

    // 실수 정현파 단일 주파수 CRLB (백색잡음, Rife & Boorstyn 1974):
    //   var(f̂) ≥ 6·fs² / (π²·η·N·(N²−1)),  η = A²/(2σ²) (선형 SNR)
    // 주의: 12/((2π)²) = 3/π² 는 **복소 지수**의 CRLB이며 실수 정현파는 그 2배다.
    // (실수 신호는 ±f 두 성분에 전력이 나뉘어 주파수 정보량이 절반)
    const eta = Math.pow(10, snrDb / 10)
    const n = FRAME_LENGTH
    const crlb = (6 * SAMPLE_RATE ** 2) / (Math.PI ** 2 * eta * n * (n * n - 1))
    expect(variance).toBeLessThan(3 * crlb)
    // 계통 bias 없음 (위상은 seed별 랜덤 — 잔여 평균 오차는 표준오차 수준이어야 한다)
    expect(Math.abs(mean)).toBeLessThan(0.01)
  })
})
