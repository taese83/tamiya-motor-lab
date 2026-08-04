// pYIN 후보 추출 (v2 §1): CMNDF 임계 분포로 상위 후보 + 확률.
// lag 탐색은 f0 ∈ [fMin, 6·fMax]로 확장 — 강한 dip이 3f0/6f0에 맺히는 경우를 위해
// 후보 ÷3·÷6 확장을 포함한다 (배음 지배 신호의 max-bin 3·6배 오판 방지, v2 §0).

import type {FrameCandidate} from './types'

export interface EstimateFrameOptions {
  fMin?: number
  fMax?: number
  maxCandidates?: number
  /** 하위-복원 제수 — dip을 이 값들로 나눠 후보 확장 (v2.x). 기본 [1]=지배 피치 그대로 */
  divisors?: readonly number[]
}

const DEFAULT_FMIN = 100
const DEFAULT_FMAX = 700
const DEFAULT_MAX_CANDIDATES = 5
const DEFAULT_DIVISORS: readonly number[] = [1]

// pYIN 임계 분포: Beta(2,18) 근사 가중 (저임계에 질량 집중 — pYIN 원 논문 파라미터)
const THRESHOLD_COUNT = 24
const THRESHOLDS = new Float64Array(THRESHOLD_COUNT)
const THRESHOLD_WEIGHTS = new Float64Array(THRESHOLD_COUNT)
{
  let total = 0
  for (let i = 0; i < THRESHOLD_COUNT; i++) {
    const t = 0.02 + (i * (0.9 - 0.02)) / (THRESHOLD_COUNT - 1)
    THRESHOLDS[i] = t
    const w = t * Math.pow(1 - t, 17)
    THRESHOLD_WEIGHTS[i] = w
    total += w
  }
  for (let i = 0; i < THRESHOLD_COUNT; i++) THRESHOLD_WEIGHTS[i] = THRESHOLD_WEIGHTS[i]! / total
}

interface Dip {
  lag: number
  freq: number
  depth: number
  prob: number
}

/** CMNDF dip 수집 (YIN step 2~3 + 국소 최소 포물선 보간) — estimateFrame·pickYinPitch 공용 */
function collectDips(
  frame: Float32Array,
  sampleRate: number,
  fMin: number,
  fMax: number,
  maxDivisor: number,
): Dip[] {
  const n = frame.length
  const lagMax = Math.min(Math.floor(sampleRate / fMin), Math.floor(n / 2))
  const lagMin = Math.max(2, Math.floor(sampleRate / (fMax * maxDivisor)))
  if (lagMax <= lagMin + 1) return []

  // 차분 함수 d(τ), τ ∈ [1, lagMax] — W = n − lagMax 고정 창 (YIN step 2)
  const w = n - lagMax
  const cmndf = new Float64Array(lagMax + 1)
  cmndf[0] = 1
  let cumulative = 0
  for (let lag = 1; lag <= lagMax; lag++) {
    let d = 0
    for (let t = 0; t < w; t++) {
      const diff = frame[t]! - frame[t + lag]!
      d += diff * diff
    }
    cumulative += d
    // CMNDF (YIN step 3): d'(τ) = d(τ)·τ / Σ_{j≤τ} d(j) — 무음이면 1로 고정
    cmndf[lag] = cumulative > 1e-12 ? (d * lag) / cumulative : 1
  }

  // 국소 최소 dip 수집 + 포물선 보간 (lag 서브샘플 정밀화)
  const dips: Dip[] = []
  for (let lag = Math.max(lagMin, 2); lag < lagMax; lag++) {
    const prev = cmndf[lag - 1]!
    const cur = cmndf[lag]!
    const next = cmndf[lag + 1]!
    if (cur < prev && cur <= next && cur < 0.9) {
      const denom = prev - 2 * cur + next
      const offset = denom > 1e-12 ? Math.min(0.5, Math.max(-0.5, (0.5 * (prev - next)) / denom)) : 0
      const refinedLag = lag + offset
      const depth = Math.max(0, cur - 0.25 * (prev - next) * offset)
      const freq = sampleRate / refinedLag
      if (freq >= fMin * 0.98 && freq <= fMax * maxDivisor * 1.02) {
        dips.push({lag: refinedLag, freq, depth, prob: 0})
      }
    }
  }
  return dips
}

export interface YinPickOptions {
  fMin?: number
  fMax?: number
  /** dip 깊이 절대 임계 — 이하만 유효 주기로 인정 (YIN step 4, 튜너 관행 0.1~0.3) */
  threshold?: number
}

export interface YinPick {
  f0: number
  /** 채택 dip의 CMNDF 깊이 (작을수록 명료) */
  depth: number
}

/** 비정수배 반증 판정의 정수비 허용 오차 (배수당 상대) */
const YIN_INTEGER_RATIO_TOL = 0.05

/**
 * R57 tuner 모드 선택기 — **표준 YIN 규칙 + 비정수배 반증 가드**:
 * 대역 내 dip 중 depth < threshold 인 것들을 lag 오름차순(=고주파부터)으로 보되,
 * 그보다 **더 깊은 dip이 비정수배 lag**에 존재하면 그 픽은 진짜 주기가 아니므로 기각하고
 * 다음 후보로 내려간다. 유효 픽이 없으면 null(무성 판정).
 *
 * pYIN salience(estimateFrame)와의 차이가 핵심이다: salience는 임계 분포(0.02까지)로
 * 집계해 **가장 깊은 dip**(=최저 주파수·전체 주기)에 질량이 몰린다. 실기기 모터는 브러시
 * 비대칭으로 약한 하위 성분(f0/2)이 실존하므로 전체 주기는 f0/2가 되고, salience 1위가
 * ÷2로 미끄러진다(584 모터의 292). 표준 YIN은 "충분히 주기적인 것 중 가장 짧은 주기"라
 * 약한 하위 성분(임계 이하의 얕은 오염)은 무시하고 기본파를 짚는다 — 파노튜너와 같은 동작.
 *
 * 비정수배 반증 가드(fixture ② 재현 — 토크튠 "500 찍힘"의 정체): 약한 300 + 강한 900/1800
 * 신호에서 450-lag(900의 2배 주기)도 임계 이하 dip이 된다(300 성분만이 반증인데 약하므로).
 * 그러나 더 깊은 dip이 300-lag(=1.5×450 lag, **비정수배**)에 있다는 것은 450이 참 주기가
 * 아니라는 직접 증거다 — 참 주기라면 더 깊은 주기성은 자신의 정수배 lag에만 나타난다.
 * 584의 292(2.0×, 정수배)는 반증이 아니므로 584가 유지된다.
 */
export function pickYinPitch(
  frame: Float32Array,
  sampleRate: number,
  options: YinPickOptions = {},
): YinPick | null {
  const fMin = options.fMin ?? DEFAULT_FMIN
  const fMax = options.fMax ?? DEFAULT_FMAX
  const threshold = options.threshold ?? 0.2
  const dips = collectDips(frame, sampleRate, fMin, fMax, 1)
  const eligible = dips
    .filter(dip => dip.depth < threshold && dip.freq >= fMin && dip.freq <= fMax)
    .sort((a, b) => a.lag - b.lag)
  for (const pick of eligible) {
    let refuted = false
    for (const other of dips) {
      if (other.lag <= pick.lag * (1 + YIN_INTEGER_RATIO_TOL)) continue
      if (other.depth >= pick.depth) continue // 유의하게 더 깊은 dip만 반증 자격
      const ratio = other.lag / pick.lag
      const n = Math.round(ratio)
      if (n < 1 || Math.abs(ratio - n) > YIN_INTEGER_RATIO_TOL * n) {
        refuted = true
        break
      }
    }
    if (!refuted) return {f0: pick.freq, depth: pick.depth}
  }
  return null
}

/** CMNDF 국소 최소 dip을 임계 분포로 집계하고 ÷3·÷6 확장한 후보를 반환한다 (순수 함수) */
export function estimateFrame(
  frame: Float32Array,
  sampleRate: number,
  options: EstimateFrameOptions = {},
): FrameCandidate[] {
  const fMin = options.fMin ?? DEFAULT_FMIN
  const fMax = options.fMax ?? DEFAULT_FMAX
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES
  const divisors = options.divisors ?? DEFAULT_DIVISORS
  // dip을 최대 제수까지 나눠 확장하므로, 탐색 상한도 fMax·maxDivisor까지 넓혀 그 고역 dip을 잡는다.
  const maxDivisor = Math.max(1, ...divisors)
  const dips = collectDips(frame, sampleRate, fMin, fMax, maxDivisor)
  if (dips.length === 0) return []

  // 임계 분포 집계 (pYIN): 각 임계에서 "최소 lag의 dip < t"가 선택된다 (YIN step 4)
  let voicedProb = 0
  for (let i = 0; i < THRESHOLD_COUNT; i++) {
    const t = THRESHOLDS[i]!
    const weight = THRESHOLD_WEIGHTS[i]!
    let selected: Dip | null = null
    for (const dip of dips) {
      if (dip.depth < t && (selected === null || dip.lag < selected.lag)) selected = dip
    }
    if (selected !== null) {
      selected.prob += weight
      voicedProb += weight
    }
  }

  // 제수 확장(기본 [1]=하위-복원 없음) 후 [fMin, fMax] 대역 내 후보만 채택
  const raw: {f0: number; salience: number}[] = []
  for (const dip of dips) {
    for (const divisor of divisors) {
      const f0 = dip.freq / divisor
      if (f0 >= fMin && f0 <= fMax) {
        // 확장 후보는 소폭 할인, dip 깊이(1−depth)를 하한 salience로 보전
        const base = divisor === 1 ? dip.prob : dip.prob * 0.9
        raw.push({f0, salience: Math.max(base, 0.15 * (1 - dip.depth))})
      }
    }
  }
  if (raw.length === 0) return []

  // 2% 이내 후보 병합 (확장 경로 중복 제거)
  raw.sort((a, b) => a.f0 - b.f0)
  const merged: {f0: number; salience: number}[] = []
  for (const cand of raw) {
    const last = merged[merged.length - 1]
    if (last !== undefined && cand.f0 / last.f0 < 1.02) {
      const total = last.salience + cand.salience
      last.f0 =
        total > 1e-12 ? (last.f0 * last.salience + cand.f0 * cand.salience) / total : last.f0
      last.salience = Math.min(1, total)
    } else {
      merged.push({...cand})
    }
  }

  merged.sort((a, b) => b.salience - a.salience)
  return merged.slice(0, maxCandidates).map(c => ({
    f0: c.f0,
    salience: c.salience,
    voicedProb,
  }))
}
