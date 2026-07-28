// 다중 고조파 variable-projection 정밀 추정 (v2 §1):
// s(t) = Σₖ aₖcos(2πkf₀t) + bₖsin(2πkf₀t), k∈{1,3,6}.
// 고조파 간 근사 직교성(200 ms 창에서 교차항 ~1/68)으로 선형 계수를 고조파별 직교 투영으로
// 소거하고, f₀ 1차원 포착 에너지를 golden-section으로 최대화 → CRLB 근접, 서브 0.1 Hz.
// 주의: 창 함수는 모델에 없으므로 VP는 비가공(raw) 프레임에서 수행한다.

import type {RefineResult} from './types'

export interface RefineOptions {
  /** 투영할 고조파 차수 — 일치도 검사 제외 반영 지점 (기본 [1,3,6]) */
  harmonics?: readonly number[]
  /** f₀ 탐색 반경 (Hz) — 기본 3 Hz ≈ comb 승자 ±1 bin (12 kHz·4096 FFT 기준, v2 §1) */
  searchHalfWidthHz?: number
  /** golden-section 반복 수 (기본 30 — 최종 구간 < 1e-5 Hz) */
  iterations?: number
}

const DEFAULT_HARMONICS: readonly number[] = [1, 3, 6]
const GOLDEN = (Math.sqrt(5) - 1) / 2

/**
 * 주어진 f0에서 각 고조파의 직교 투영 에너지(c²+s²)를 계산한다.
 * cos/sin은 회전 점화식으로 생성 — 샘플당 초월함수 호출 없이 성능 예산(v2 §4)을 지킨다.
 * outPowers가 주어지면 고조파별 전력 추정치 aₖ²/2 (= 2(c²+s²)/N²)를 기록한다.
 */
export function projectHarmonics(
  frame: Float32Array,
  sampleRate: number,
  f0: number,
  harmonics: readonly number[],
  outPowers?: Float64Array,
): number {
  const n = frame.length
  let energy = 0
  for (let h = 0; h < harmonics.length; h++) {
    const k = harmonics[h]!
    const freq = k * f0
    if (freq >= 0.48 * sampleRate) {
      if (outPowers !== undefined) outPowers[h] = 0
      continue
    }
    const omega = (2 * Math.PI * freq) / sampleRate
    const cosStep = Math.cos(omega)
    const sinStep = Math.sin(omega)
    let cr = 1
    let ci = 0
    let c = 0
    let s = 0
    for (let t = 0; t < n; t++) {
      const x = frame[t]!
      c += x * cr
      s += x * ci
      const nr = cr * cosStep - ci * sinStep
      ci = cr * sinStep + ci * cosStep
      cr = nr
    }
    const e = c * c + s * s
    energy += e
    if (outPowers !== undefined) outPowers[h] = (2 * e) / (n * n)
  }
  return energy
}

/**
 * refine(candidate) → f₀ (v2 §5 인터페이스 계층).
 * candidateHz ± searchHalfWidthHz 범위에서 포착 에너지를 golden-section 최대화한다.
 */
export function refine(
  frame: Float32Array,
  sampleRate: number,
  candidateHz: number,
  options: RefineOptions = {},
): RefineResult {
  const harmonics = options.harmonics ?? DEFAULT_HARMONICS
  const halfWidth = options.searchHalfWidthHz ?? 3
  const iterations = options.iterations ?? 30
  const lo = Math.max(1, candidateHz - halfWidth)
  const hi = candidateHz + halfWidth

  let a = lo
  let b = hi
  let x1 = b - GOLDEN * (b - a)
  let x2 = a + GOLDEN * (b - a)
  let e1 = projectHarmonics(frame, sampleRate, x1, harmonics)
  let e2 = projectHarmonics(frame, sampleRate, x2, harmonics)
  for (let i = 0; i < iterations; i++) {
    if (e1 < e2) {
      a = x1
      x1 = x2
      e1 = e2
      x2 = a + GOLDEN * (b - a)
      e2 = projectHarmonics(frame, sampleRate, x2, harmonics)
    } else {
      b = x2
      x2 = x1
      e2 = e1
      x1 = b - GOLDEN * (b - a)
      e1 = projectHarmonics(frame, sampleRate, x1, harmonics)
    }
  }
  const f0 = (a + b) / 2

  const powers = new Float64Array(harmonics.length)
  projectHarmonics(frame, sampleRate, f0, harmonics, powers)
  const usedHarmonics: number[] = []
  const harmonicPowers: number[] = []
  let capturedPower = 0
  for (let h = 0; h < harmonics.length; h++) {
    if (harmonics[h]! * f0 < 0.48 * sampleRate) {
      usedHarmonics.push(harmonics[h]!)
      harmonicPowers.push(powers[h]!)
      capturedPower += powers[h]!
    }
  }
  return {f0, usedHarmonics, harmonicPowers, capturedPower}
}
