// 프레임 전력 스펙트럼과 피크 계측 유틸 — comb 점수·일치도 검사·신뢰 게이트의 공용 기반.
// Hann 창 + zero-pad FFT (v2 §4: 2400 샘플 → 4096), 버퍼는 analyzer 생성 시 1회 할당.

import {FftPlan, nextPow2} from './fft'

export interface SpectrumAnalyzer {
  readonly fftSize: number
  readonly binHz: number
  /** compute() 결과가 담기는 재사용 버퍼 (bin 0..fftSize/2) */
  readonly power: Float64Array
  compute(frame: Float32Array): void
}

export function createSpectrumAnalyzer(frameLength: number, sampleRate: number): SpectrumAnalyzer {
  let fftSize = nextPow2(frameLength)
  // zero-pad 여유가 1.6배 미만이면 한 단계 올린다 (보간 정밀도 확보)
  if (fftSize < frameLength * 1.6) fftSize *= 2
  const plan = new FftPlan(fftSize)
  const re = new Float64Array(fftSize)
  const im = new Float64Array(fftSize)
  const power = new Float64Array(fftSize / 2 + 1)
  const window = new Float64Array(frameLength)
  for (let i = 0; i < frameLength; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameLength - 1)))
  }
  return {
    fftSize,
    binHz: sampleRate / fftSize,
    power,
    compute(frame) {
      if (frame.length !== frameLength) {
        throw new RangeError(`frame length ${frame.length} !== ${frameLength}`)
      }
      re.fill(0)
      im.fill(0)
      for (let i = 0; i < frameLength; i++) re[i] = frame[i]! * window[i]!
      plan.transform(re, im)
      for (let i = 0; i <= fftSize / 2; i++) power[i] = re[i]! * re[i]! + im[i]! * im[i]!
    },
  }
}

/**
 * R67: 프레임 전력 스펙트럼의 지수이동평균 — Welch 시간 평균의 스트리밍 등가.
 * 모터 라인은 프레임마다 같은 bin에 있어 평균에서 살아남고, 광대역 잡음 요동은 깎인다.
 * α=0.15 ≈ 유효 창 ~13프레임(hop 25 ms ≈ 0.33 s) — Welch 권장(0.5~1 s)보다 짧게 잡아
 * 스핀업 chirp(150 Hz/s)의 평균 내 스미어를 ~50 Hz로 제한한다. 첫 push는 복사(콜드스타트
 * 편향 방지), reset 후 frames=0.
 */
export interface SpectrumEma {
  readonly power: Float64Array
  /** 누적 프레임 수 — 소비자는 최소 프레임 수를 요구한 뒤 사용한다 */
  readonly frames: number
  push(src: Float64Array): void
  reset(): void
}

export function createSpectrumEma(size: number, alpha: number): SpectrumEma {
  const power = new Float64Array(size)
  let frames = 0
  return {
    power,
    get frames() {
      return frames
    },
    push(src) {
      if (src.length !== size) {
        throw new RangeError(`spectrum length ${src.length} !== ${size}`)
      }
      if (frames === 0) {
        power.set(src)
      } else {
        for (let i = 0; i < size; i++) power[i] = (1 - alpha) * power[i]! + alpha * src[i]!
      }
      frames += 1
    },
    reset() {
      frames = 0
    },
  }
}

export interface SpectralPeak {
  freq: number
  power: number
}

/** log-power 포물선 보간 — bin 주변 서브빈 피크 위치·크기 */
function interpolatePeak(power: Float64Array, bin: number, binHz: number): SpectralPeak {
  const lo = Math.max(1, bin - 1)
  const hi = Math.min(power.length - 2, bin + 1)
  if (lo >= bin || hi <= bin) return {freq: bin * binHz, power: power[bin] ?? 0}
  const a = Math.log(power[bin - 1]! + 1e-30)
  const b = Math.log(power[bin]! + 1e-30)
  const c = Math.log(power[bin + 1]! + 1e-30)
  const denom = a - 2 * b + c
  const offset = Math.abs(denom) > 1e-12 ? Math.min(0.5, Math.max(-0.5, (0.5 * (a - c)) / denom)) : 0
  return {
    freq: (bin + offset) * binHz,
    power: Math.exp(b - 0.25 * (a - c) * offset),
  }
}

/** [freqHz − tolHz, freqHz + tolHz]에서 최대 전력 bin을 찾아 보간 피크를 반환 */
export function findPeakNear(
  power: Float64Array,
  binHz: number,
  freqHz: number,
  tolHz: number,
): SpectralPeak | null {
  const loBin = Math.max(1, Math.floor((freqHz - tolHz) / binHz))
  const hiBin = Math.min(power.length - 2, Math.ceil((freqHz + tolHz) / binHz))
  if (hiBin < loBin) return null
  let best = loBin
  for (let i = loBin + 1; i <= hiBin; i++) {
    if (power[i]! > power[best]!) best = i
  }
  if (power[best]! <= 0) return null
  return interpolatePeak(power, best, binHz)
}

/** [f·(1−span), f·(1+span)]에서 피크 주변 exclHz를 제외한 중앙값 노이즈 플로어 */
export function medianNoiseFloor(
  power: Float64Array,
  binHz: number,
  freqHz: number,
  exclHz: number,
  span = 0.18,
): number {
  const loBin = Math.max(1, Math.floor((freqHz * (1 - span)) / binHz))
  const hiBin = Math.min(power.length - 2, Math.ceil((freqHz * (1 + span)) / binHz))
  const values: number[] = []
  for (let i = loBin; i <= hiBin; i++) {
    if (Math.abs(i * binHz - freqHz) > exclHz) values.push(power[i]!)
  }
  if (values.length === 0) return 1e-30
  values.sort((a, b) => a - b)
  return Math.max(values[Math.floor(values.length / 2)]!, 1e-30)
}

/** [lo, hi] Hz 구간 적분 전력 */
export function bandPower(power: Float64Array, binHz: number, lo: number, hi: number): number {
  const loBin = Math.max(0, Math.floor(lo / binHz))
  const hiBin = Math.min(power.length - 1, Math.ceil(hi / binHz))
  let sum = 0
  for (let i = loBin; i <= hiBin; i++) sum += power[i]!
  return sum
}

/** 겹치는 구간을 합집합으로 병합해 적분 — 고조파 대역이 상호 중첩될 때 이중 계상 방지 */
export function bandPowerUnion(
  power: Float64Array,
  binHz: number,
  intervals: readonly (readonly [number, number])[],
): number {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0])
  let sum = 0
  let cursor = -Infinity
  for (const [lo, hi] of sorted) {
    const from = Math.max(lo, cursor)
    if (hi > from) {
      sum += bandPower(power, binHz, from, hi)
      cursor = hi
    }
  }
  return sum
}

/** [lo, hi] Hz의 상위 국소 피크 (내림차순, 최대 maxCount개) — 비고조파 페널티 입력 */
export function findTopPeaks(
  power: Float64Array,
  binHz: number,
  lo: number,
  hi: number,
  maxCount: number,
): SpectralPeak[] {
  const loBin = Math.max(1, Math.floor(lo / binHz))
  const hiBin = Math.min(power.length - 2, Math.ceil(hi / binHz))
  const peaks: SpectralPeak[] = []
  for (let i = loBin; i <= hiBin; i++) {
    if (power[i]! > power[i - 1]! && power[i]! >= power[i + 1]!) {
      peaks.push(interpolatePeak(power, i, binHz))
    }
  }
  peaks.sort((a, b) => b.power - a.power)
  return peaks.slice(0, maxCount)
}
