// 추적 계층 (v2 §1): 후보 격자 fixed-lag Viterbi(lag 5, 옥타브/고조파 점프 전이 페널티)
// → 상수속도 Kalman 평활 → 안정 판정(1.5 s 창 CV < 1.5% → 중앙값 잠금).
// 역할 분리: Viterbi = 이산 모호성(옥타브·3/6배 점프 억제), Kalman = 연속 평활.
// status는 엔진 소유 3종(measuring/stable/weak-signal)만 산출한다 (feature-plan §0).

import type {
  DisplayEstimate,
  EstimateDebug,
  FrameAnalysis,
  ResolvedEngineOptions,
  TrackCandidate,
  WeakReason,
} from './types'

export interface Tracker {
  push(analysis: FrameAnalysis): DisplayEstimate
  reset(): void
}

interface Layer {
  candidates: TrackCandidate[]
  metric: Float64Array
  back: Int32Array
}

const EMISSION_SCALE_DB = 10 // comb 점수 차이 → emission log 단위 환산
const KALMAN_ACCEL_STD = 400 // Hz/s² — 스핀업(150 Hz/s) 추종 여유
const KALMAN_MEASUREMENT_VAR = 0.25 // (0.5 Hz)² — VP 프레임 추정 분산 상한
const KALMAN_RELOCK_OCTAVES = 0.25 // Viterbi 출력이 이 이상 점프하면 재잠금

function weakEstimate(
  confidence: number,
  weakReason: WeakReason,
  debug: EstimateDebug,
): DisplayEstimate {
  // weak-signal이면 f0/rpm은 반드시 null — 무음에서 0 RPM·임의 값 반환 금지 (REQ-ST-003)
  return {
    f0: null,
    rpm: null,
    confidence,
    status: 'weak-signal',
    stabilityCv: null,
    microVariation: null,
    weakReason,
    debug,
  }
}

/** R53 진단 계측 — 프레임 분석 지표를 estimate에 그대로 실어 오버레이가 소비한다 */
function debugOf(analysis: FrameAnalysis): EstimateDebug {
  return {
    rms: analysis.rms,
    snrDb: analysis.snrDb,
    voicedProb: analysis.voicedProb,
    harmonicCount: analysis.detectedHarmonics.length,
    rejects: analysis.rejects,
    evalF0: analysis.evalF0,
  }
}


export function createTracker(options: ResolvedEngineOptions, hopSeconds?: number): Tracker {
  const dt = hopSeconds ?? options.hopSeconds
  const stabilityCount = Math.max(2, Math.round(options.stabilitySeconds / dt))
  const q00 = KALMAN_ACCEL_STD ** 2 * dt ** 4 * 0.25
  const q01 = KALMAN_ACCEL_STD ** 2 * dt ** 3 * 0.5
  const q11 = KALMAN_ACCEL_STD ** 2 * dt ** 2

  let layers: Layer[] = []
  let missCount = 0
  let hasTrack = false
  let lastConfidence = 0
  // Kalman 상태 [f, ḟ]와 공분산 (p00, p01, p11)
  let kf = 0
  let kv = 0
  let p00 = 0
  let p01 = 0
  let p11 = 0
  const stability = new Float64Array(stabilityCount)
  const stabilityScratch = new Float64Array(stabilityCount)
  let stabilityIdx = 0
  let stabilityFill = 0

  function clearTrack(): void {
    layers = []
    hasTrack = false
    missCount = 0
    stabilityIdx = 0
    stabilityFill = 0
  }

  function initKalman(f: number): void {
    kf = f
    kv = 0
    p00 = 4
    p01 = 0
    p11 = 2500
    hasTrack = true
  }

  function kalmanPredict(): void {
    kf += kv * dt
    p00 += 2 * dt * p01 + dt * dt * p11 + q00
    p01 += dt * p11 + q01
    p11 += q11
  }

  function kalmanUpdate(z: number): void {
    kalmanPredict()
    const innovation = z - kf
    const s = p00 + KALMAN_MEASUREMENT_VAR
    const k0 = p00 / s
    const k1 = p01 / s
    kf += k0 * innovation
    kv += k1 * innovation
    const np00 = (1 - k0) * p00
    const np01 = (1 - k0) * p01
    const np11 = p11 - k1 * p01
    p00 = np00
    p01 = np01
    p11 = np11
  }

  /** 전이 비용: 연속 드리프트는 저비용, 큰 점프는 고정 페널티 + 옥타브/×3/×6 근접 시 가중 */
  function transitionCost(fi: number, fj: number): number {
    const x = Math.abs(Math.log2(fj / fi))
    if (x <= options.jumpCostThresholdOctaves) return options.driftCostWeight * x
    let cost = options.jumpPenalty
    const ratio = fj > fi ? fj / fi : fi / fj
    for (const m of [2, 3, 6]) {
      if (Math.abs(ratio - m) < 0.07 * m) {
        cost += options.harmonicJumpExtraPenalty
        break
      }
    }
    return cost
  }

  function pushLayer(candidates: TrackCandidate[]): number {
    let maxScore = -Infinity
    for (const c of candidates) maxScore = Math.max(maxScore, c.score)
    const metric = new Float64Array(candidates.length)
    const back = new Int32Array(candidates.length)
    const prev = layers[layers.length - 1]
    for (let j = 0; j < candidates.length; j++) {
      const emission = (candidates[j]!.score - maxScore) / EMISSION_SCALE_DB
      if (prev === undefined) {
        metric[j] = emission
        back[j] = -1
        continue
      }
      let best = -Infinity
      let bestI = 0
      for (let i = 0; i < prev.candidates.length; i++) {
        const value =
          prev.metric[i]! - transitionCost(prev.candidates[i]!.f0, candidates[j]!.f0)
        if (value > best) {
          best = value
          bestI = i
        }
      }
      metric[j] = emission + best
      back[j] = bestI
    }
    // 누적 metric 정규화 (수치 발산 방지)
    let top = -Infinity
    for (let j = 0; j < metric.length; j++) top = Math.max(top, metric[j]!)
    for (let j = 0; j < metric.length; j++) metric[j] = metric[j]! - top

    layers.push({candidates, metric, back})
    if (layers.length > options.viterbiLag) layers.shift()

    // fixed-lag 결정: 최신 층 최적 노드에서 최고(最古) 층까지 역추적
    const last = layers[layers.length - 1]!
    let bestJ = 0
    for (let j = 1; j < last.metric.length; j++) {
      if (last.metric[j]! > last.metric[bestJ]!) bestJ = j
    }
    let idx = bestJ
    for (let l = layers.length - 1; l > 0; l--) {
      idx = layers[l]!.back[idx]!
      if (idx < 0) idx = 0
    }
    return layers[0]!.candidates[idx]?.f0 ?? last.candidates[bestJ]!.f0
  }

  function pushStability(value: number): void {
    stability[stabilityIdx] = value
    stabilityIdx = (stabilityIdx + 1) % stabilityCount
    if (stabilityFill < stabilityCount) stabilityFill += 1
  }

  function stabilityStats(): {full: boolean; cv: number; median: number} {
    if (stabilityFill < stabilityCount) return {full: false, cv: Infinity, median: kf}
    let mean = 0
    for (let i = 0; i < stabilityCount; i++) mean += stability[i]!
    mean /= stabilityCount
    let varAcc = 0
    for (let i = 0; i < stabilityCount; i++) {
      const d = stability[i]! - mean
      varAcc += d * d
    }
    const cv = mean > 1e-9 ? Math.sqrt(varAcc / stabilityCount) / mean : Infinity
    stabilityScratch.set(stability)
    stabilityScratch.sort()
    const mid = Math.floor(stabilityCount / 2)
    const median =
      stabilityCount % 2 === 1
        ? stabilityScratch[mid]!
        : 0.5 * (stabilityScratch[mid - 1]! + stabilityScratch[mid]!)
    return {full: true, cv, median}
  }

  // 순간 편차 — 현재 kf가 창 중앙값에서 벗어난 부호 있는 상대량. 창 미충족이면 null(중앙값 미확립).
  // stabilityCv(1.5s 평균)와 같은 null 게이팅 — 둘 다 창이 차야 의미가 생긴다.
  function microOf(full: boolean, median: number): number | null {
    if (!full || median <= 1e-9) return null
    return (kf - median) / median
  }

  return {
    push(analysis) {
      if (!analysis.gatePassed || analysis.candidates.length === 0) {
        missCount += 1
        if (hasTrack && missCount <= options.missTolerance) {
          // 짧은 게이트 결손은 예측 유지 (표시 깜빡임 방지) — 초과 시 즉시 weak-signal (D-9)
          // R52: coast 프레임은 안정 창에 **넣지 않는다** — 정지된 예측값(kf)이 상수로 쌓이면
          // CV가 인위적으로 낮아져, 결손 직후 실측 없이 가짜 stable(자동 확정 트리거)이 뜰 수 있다.
          kalmanPredict()
          lastConfidence *= 0.7
          // coast 프레임: 창이 차 있으면 직전 CV 유지 노출 (게이트 결손 중 새 판정 없음)
          const coast = stabilityStats()
          return {
            f0: kf,
            rpm: Math.round(kf * 60),
            confidence: lastConfidence,
            status: 'measuring',
            stabilityCv: coast.full ? coast.cv : null,
            microVariation: microOf(coast.full, coast.median),
            debug: debugOf(analysis),
          }
        }
        clearTrack()
        lastConfidence = Math.min(0.2, 0.2 * analysis.voicedProb)
        // R27: 근접 게이트 미만이면 'too-quiet'(더 가까이), 레벨은 있으나 피치 없음이면 'no-pitch'(잡음·간섭)
        const weakReason: WeakReason = analysis.rms < options.proximityRms ? 'too-quiet' : 'no-pitch'
        return weakEstimate(lastConfidence, weakReason, debugOf(analysis))
      }

      missCount = 0
      const viterbiF0 = pushLayer(analysis.candidates)
      if (!hasTrack) {
        initKalman(viterbiF0)
      } else if (Math.abs(Math.log2(viterbiF0 / kf)) > KALMAN_RELOCK_OCTAVES) {
        // Viterbi가 이산 점프를 확정한 경우: 재잠금 + 안정 창 초기화
        initKalman(viterbiF0)
        stabilityIdx = 0
        stabilityFill = 0
      } else {
        kalmanUpdate(viterbiF0)
      }
      pushStability(kf)

      const {full, cv, median} = stabilityStats()
      const isStable = full && cv < options.stabilityCv
      const displayF0 = isStable ? median : kf

      const snrFactor = Math.min(1, Math.max(0, (analysis.snrDb - 4) / 16))
      let confidence = Math.min(1, Math.max(0, analysis.voicedProb)) * (0.4 + 0.6 * snrFactor)
      if (analysis.detectedHarmonics.length >= options.gateMinHarmonics) {
        confidence = Math.min(1, confidence * 1.1)
      }
      if (isStable) confidence = Math.max(confidence, 0.9)
      lastConfidence = confidence

      return {
        f0: displayF0,
        rpm: Math.round(displayF0 * 60),
        confidence,
        status: isStable ? 'stable' : 'measuring',
        // 컨디션 지표(v2.x): 1.5s 창 CV — 창 미충족(스핀업 직후 등)이면 null
        stabilityCv: full ? cv : null,
        // 순간 편차(바늘 실시간 떨림용) — 현재 kf가 창 중앙값에서 벗어난 부호 있는 상대량.
        // isStable(displayF0=median)이어도 kf는 계속 추종하므로 이 값은 프레임마다 떨린다.
        microVariation: microOf(full, median),
        debug: debugOf(analysis),
      }
    },
    reset() {
      clearTrack()
      lastConfidence = 0
    },
  }
}

/** track(estimates) → display (v2 §5 인터페이스 계층) — 프레임 분석 열을 일괄 추적 */
export function track(
  analyses: readonly FrameAnalysis[],
  options: ResolvedEngineOptions,
  hopSeconds?: number,
): DisplayEstimate[] {
  const tracker = createTracker(options, hopSeconds)
  return analyses.map(a => tracker.push(a))
}
