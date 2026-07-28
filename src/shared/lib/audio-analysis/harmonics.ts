// 교정된 1·3·6차 고조파 점수 + 고조파별 일치도 검사 + 신뢰 게이트 계측 (v2 §1).
// 핵심 위험(v2 §0): 최강 성분이 3f0/6f0인 경우 max-bin은 3·6배 오판 — comb 점수는
// 후보의 고조파 위치 SNR 가중 합산에서 비고조파(정수배가 아닌) 피크를 감산해 이를 해소한다.

import {bandPower, bandPowerUnion, findPeakNear, findTopPeaks, medianNoiseFloor} from './spectrum'
import type {FrameCandidate, HarmonicMeasurement, ScoredCandidate} from './types'

const SNR_CLAMP_DB = 40
const PEAK_SIGNIFICANT_RATIO = 4 // ≈ 6 dB — 검출·페널티 대상 최소 국소 SNR
/** 가정 f₀ 대비 이 비율보다 낮은 피크는 하위 고조파(=f₀ 가정 반증)로 본다 */
const SUB_HARMONIC_TOLERANCE = 0.08

export interface CombOptions {
  fMin: number
  fMax: number
  scoredHarmonics: readonly number[]
  harmonicWeights: readonly number[]
  nonHarmonicPenaltyWeight: number
  /** 가정 f₀보다 낮은 유의 피크에 적용하는 가중치 (하위 고조파 veto — 일반 간섭보다 크다) */
  subHarmonicPenaltyWeight: number
}

function clampSnrDb(ratio: number): number {
  if (!(ratio > 0)) return 0
  return Math.min(SNR_CLAMP_DB, Math.max(0, 10 * Math.log10(ratio)))
}

/** 후보 f0의 k차 고조파 위치에서 국소 피크와 노이즈 플로어 대비 SNR을 계측한다 */
export function measureHarmonics(
  power: Float64Array,
  binHz: number,
  sampleRate: number,
  f0: number,
  harmonics: readonly number[],
): HarmonicMeasurement[] {
  return harmonics.map(k => {
    const target = k * f0
    if (target >= 0.47 * sampleRate) return {k, snrDb: 0, peakFreq: null, peakPower: 0}
    const tolHz = Math.max(3 * binHz, 0.015 * target)
    const peak = findPeakNear(power, binHz, target, tolHz)
    if (peak === null) return {k, snrDb: 0, peakFreq: null, peakPower: 0}
    const floor = medianNoiseFloor(power, binHz, target, Math.max(4 * binHz, 0.03 * target))
    return {k, snrDb: clampSnrDb(peak.power / floor), peakFreq: peak.freq, peakPower: peak.power}
  })
}

/**
 * comb 점수: Σₖ wₖ·SNRₖ(dB) − penalty·Σ(비고조파 피크 SNR).
 * 비고조파 판정: 피크/f0 비율이 정수배(±8%)가 아니면 페널티 — 3f0 후보는 진짜 f0 피크가
 * 1/3 비율(비정수)로 잡혀 감점되고, 진짜 f0 후보는 모든 배음이 정수배라 무페널티.
 */
export function scoreCandidates(
  power: Float64Array,
  binHz: number,
  sampleRate: number,
  candidates: readonly FrameCandidate[],
  options: CombOptions,
): ScoredCandidate[] {
  const searchLo = 0.8 * options.fMin
  const searchHi = Math.min(6.5 * options.fMax, 0.47 * sampleRate)
  const peaks = findTopPeaks(power, binHz, searchLo, searchHi, 12)
  const significantPeaks = peaks
    .map(p => ({
      freq: p.freq,
      snrDb: clampSnrDb(
        p.power / medianNoiseFloor(power, binHz, p.freq, Math.max(4 * binHz, 0.03 * p.freq)),
      ),
    }))
    .filter(p => p.snrDb >= clampSnrDb(PEAK_SIGNIFICANT_RATIO))

  const scored = candidates.map(candidate => {
    const harmonics = measureHarmonics(
      power,
      binHz,
      sampleRate,
      candidate.f0,
      options.scoredHarmonics,
    )
    let base = 0
    for (let i = 0; i < harmonics.length; i++) {
      base += (options.harmonicWeights[i] ?? 1) * harmonics[i]!.snrDb
    }
    // 비고조파 처벌 + 하위 고조파 veto.
    // 가정 f₀보다 **낮은** 주파수의 유의 피크는 단순 간섭이 아니라 "f₀가 틀렸다"는 직접 증거다
    // (회전원은 회전수보다 낮은 성분을 만들지 못한다). 2f₀가 기본파보다 커지는 구간에서
    // f₀ 가정이 살아남는 옥타브 점프를 막는 판별 근거이므로 별도의 큰 가중치를 쓴다.
    let penalty = 0
    let subHarmonicPenalty = 0
    for (const peak of significantPeaks) {
      const ratio = peak.freq / candidate.f0
      const nearest = Math.round(ratio)
      if (ratio < 1 - SUB_HARMONIC_TOLERANCE) subHarmonicPenalty += peak.snrDb
      else if (nearest < 1 || Math.abs(ratio - nearest) > 0.08) penalty += peak.snrDb
    }
    return {
      f0: candidate.f0,
      combScore:
        base -
        options.nonHarmonicPenaltyWeight * penalty -
        options.subHarmonicPenaltyWeight * subHarmonicPenalty,
      harmonics,
      voicedProb: candidate.voicedProb,
      salience: candidate.salience,
    }
  })
  return scored.sort((a, b) => b.combScore - a.combScore)
}

/**
 * 고조파별 일치도 검사 (v2 §1): 검출된 k차 국소 피크가 k·f0와 기본 주파수 영역
 * 절대 오차 tolRatio·f0 이내로 일치하는지 확인, 불일치 고조파(공진·환경음 오염)는
 * VP 재추정에서 제외한다. 1805 Hz 오염(6f0=1800 대비 5 Hz > 0.5%·300=1.5 Hz)을 배제한다.
 */
export function checkHarmonicConsistency(
  harmonics: readonly HarmonicMeasurement[],
  f0: number,
  tolRatio: number,
): number[] {
  const used: number[] = []
  for (const h of harmonics) {
    if (h.peakFreq === null || h.snrDb < clampSnrDb(PEAK_SIGNIFICANT_RATIO)) {
      used.push(h.k) // 미검출 고조파는 오염 증거가 없으므로 유지 (VP에서 잡음만 흡수)
      continue
    }
    // 허용 편차는 기본 주파수 영역 절대값 tolRatio·f0 (k와 무관) — 1805 Hz는 6·300=1800에서
    // 5 Hz(> 0.5%·300 = 1.5 Hz) 벗어나므로 제외된다 (§3 fixture 판별 기준)
    if (Math.abs(h.peakFreq - h.k * f0) <= tolRatio * f0) {
      used.push(h.k)
    }
  }
  return used.length > 0 ? used : [1]
}

export interface GateMetrics {
  /** 고조파 대역(정수배 1..6 합집합) 전력 vs 잔여 대역 전력 (dB) */
  snrDb: number
  /** scoredHarmonics 중 대역 전력 기준 검출된 차수 */
  detectedHarmonics: number[]
}

const GATE_MAX_MULTIPLE = 6
const GATE_BAND_RATIO = 0.1
const GATE_BAND_MIN_HZ = 20

/**
 * 신뢰 게이트 계측 (v2 §1): 고조파 SNR은 f0 정수배(1..6) 대역 합집합 전력 대 잔여 광대역
 * 전력의 비 — 스핀업 chirp의 프레임 내 스미어(±150 Hz/s·0.1 s·k)를 대역폭이 흡수하도록
 * 반폭 = max(10%·k·f0, 20 Hz)로 잡는다. 2f0 등 비채점 정수배도 신호 증거로 계상해
 * 옥타브 교차 신호가 잡음으로 오인되지 않게 한다.
 */
export function computeGateMetrics(
  power: Float64Array,
  binHz: number,
  sampleRate: number,
  f0: number,
  options: CombOptions,
): GateMetrics {
  const searchLo = 0.8 * options.fMin
  const searchHi = Math.min(6.5 * options.fMax, 0.47 * sampleRate)
  const intervals: [number, number][] = []
  for (let k = 1; k <= GATE_MAX_MULTIPLE; k++) {
    const center = k * f0
    if (center >= 0.47 * sampleRate) break
    const half = Math.max(GATE_BAND_RATIO * center, GATE_BAND_MIN_HZ, 3 * binHz)
    intervals.push([Math.max(searchLo, center - half), Math.min(searchHi, center + half)])
  }
  const harmonicPower = bandPowerUnion(power, binHz, intervals)
  const totalPower = bandPower(power, binHz, searchLo, searchHi)
  const noisePower = Math.max(totalPower - harmonicPower, totalPower * 1e-5, 1e-30)
  const snrDb = Math.min(
    SNR_CLAMP_DB,
    Math.max(-30, 10 * Math.log10(harmonicPower / noisePower)),
  )

  const bandsWidth = intervals.reduce((acc, [lo, hi]) => acc + (hi - lo), 0)
  const noiseDensity = noisePower / Math.max(searchHi - searchLo - bandsWidth, 1)
  const detectedHarmonics: number[] = []
  for (const k of options.scoredHarmonics) {
    const center = k * f0
    if (center >= 0.47 * sampleRate) continue
    const half = Math.max(GATE_BAND_RATIO * center, GATE_BAND_MIN_HZ, 3 * binHz)
    const p = bandPower(power, binHz, center - half, center + half)
    if (p >= PEAK_SIGNIFICANT_RATIO * noiseDensity * 2 * half) detectedHarmonics.push(k)
  }
  return {snrDb, detectedHarmonics}
}
