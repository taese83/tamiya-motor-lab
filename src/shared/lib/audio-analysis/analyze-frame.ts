// 프레임 단위 파이프라인 조립 (v2 §1):
// pYIN 후보 → 1·3·6차 comb 점수 → VP 정밀 추정 → 일치도 검사(불일치 고조파 제외 후
// VP 재추정) → 신뢰 게이트. 스펙트럼·FFT 버퍼는 analyzer 생성 시 1회 할당해 재사용한다.

import {
  checkHarmonicConsistency,
  computeGateMetrics,
  measureHarmonics,
  scoreCandidates,
  type CombOptions,
} from './harmonics'
import {estimateFrame} from './pyin'
import {refine} from './refine'
import {createSpectrumAnalyzer, findTopPeaks, medianNoiseFloor} from './spectrum'
import type {
  FrameAnalysis,
  HarmonicMeasurement,
  ResolvedEngineOptions,
  ScoredCandidate,
  TrackCandidate,
} from './types'

export interface FrameAnalyzer {
  readonly frameLength: number
  analyze(frame: Float32Array): FrameAnalysis
}

function emptyAnalysis(rms: number): FrameAnalysis {
  return {
    gatePassed: false,
    f0: null,
    candidates: [],
    voicedProb: 0,
    snrDb: -30,
    detectedHarmonics: [],
    usedHarmonics: [],
    rms,
    topPeaks: [],
    candidateF0: null,
  }
}

/** 진단용 상위 피크 추출 (판정 비관여) — 실제 배음 구조 확인 목적. 주파수 오름차순 */
const DIAGNOSTIC_PEAK_COUNT = 5
function collectTopPeaks(
  power: Float64Array,
  binHz: number,
  sampleRate: number,
  options: CombOptions,
): FrameAnalysis['topPeaks'] {
  const lo = 0.8 * options.fMin
  const hi = Math.min(6.5 * options.fMax, 0.47 * sampleRate)
  return findTopPeaks(power, binHz, lo, hi, DIAGNOSTIC_PEAK_COUNT)
    .map(p => ({
      freq: Math.round(p.freq),
      snrDb:
        Math.round(
          10 *
            Math.log10(
              p.power / medianNoiseFloor(power, binHz, p.freq, Math.max(4 * binHz, 0.03 * p.freq)),
            ) *
            10,
        ) / 10,
    }))
    .sort((a, b) => a.freq - b.freq)
}

/* ── 옥타브 하향 오판 교정 (v2.x — 실기기 확정) ──────────────────────────────── *
 * 증상: 같은 모터인데 폰을 밀착하면 후보 583Hz(정답), 떼면 후보 291Hz(=583/2)로 미끄러진다.
 * 판별 근거: 291의 배음을 보면 582(2배)·1747(6배)·2329(8배)·3493(12배)로 **짝수 배만** 있고
 * 홀수 배(873=3배·1455=5배)에는 에너지가 없다. 진짜 기본파라면 3배·5배에도 에너지가 있어야
 * 하므로, "짝수 배만 강하다"는 것은 실제 기본파가 2f0라는 직접 증거다.
 * 반례 보호: 정상 모터(기본파 514)는 3배(1542, 32dB)가 뚜렷해 교정되지 않는다. */
const OCTAVE_EVEN_MIN_SNR_DB = 12
const OCTAVE_ODD_MARGIN_DB = 10

function correctOctaveDown(
  power: Float64Array,
  binHz: number,
  sampleRate: number,
  f0: number,
  fMax: number,
): number {
  const doubled = 2 * f0
  if (doubled > fMax) return f0 // 대역 밖으로는 승격하지 않는다
  const [h2, h4] = measureHarmonics(power, binHz, sampleRate, f0, [2, 4])
  const [h3, h5] = measureHarmonics(power, binHz, sampleRate, f0, [3, 5])
  const evenSnr = Math.max(h2?.snrDb ?? 0, h4?.snrDb ?? 0)
  const oddSnr = Math.max(h3?.snrDb ?? 0, h5?.snrDb ?? 0)
  const evenDominant = evenSnr >= OCTAVE_EVEN_MIN_SNR_DB && oddSnr < evenSnr - OCTAVE_ODD_MARGIN_DB
  return evenDominant ? doubled : f0
}

/** 검출 고조파 피크들의 f0 환산 가중 평균 — VP 탐색 시작점을 서브빈 정밀도로 당긴다 */
function peakWeightedF0(candidate: ScoredCandidate): number {
  let weightSum = 0
  let acc = 0
  for (const h of candidate.harmonics) {
    if (h.peakFreq === null || h.snrDb < 6) continue
    const implied = h.peakFreq / h.k
    if (Math.abs(implied - candidate.f0) > 0.03 * candidate.f0) continue
    acc += h.snrDb * implied
    weightSum += h.snrDb
  }
  return weightSum > 0 ? acc / weightSum : candidate.f0
}

export function createFrameAnalyzer(
  decimatedRate: number,
  options: ResolvedEngineOptions,
): FrameAnalyzer {
  const frameLength = Math.round(options.frameSeconds * decimatedRate)
  const spectrum = createSpectrumAnalyzer(frameLength, decimatedRate)
  const combOptions: CombOptions = {
    fMin: options.fMin,
    fMax: options.fMax,
    scoredHarmonics: options.scoredHarmonics,
    harmonicWeights: options.harmonicWeights,
    nonHarmonicPenaltyWeight: options.nonHarmonicPenaltyWeight,
    subHarmonicPenaltyWeight: options.subHarmonicPenaltyWeight,
  }

  return {
    frameLength,
    analyze(frame) {
      let sumSq = 0
      for (let i = 0; i < frame.length; i++) sumSq += frame[i]! * frame[i]!
      const rms = Math.sqrt(sumSq / Math.max(1, frame.length))
      // 무음 가드: 0 RPM·임의 값 표시 금지 (REQ-ST-003) — 분석 자체를 생략.
      // 근접 필터(v2.1): 절대 음량 하한 미달 = 원거리 소음 — 측정 대상 아님(weak-signal).
      // 하한을 넘는 신호가 여럿이면 comb 채점이 고조파 에너지 최강(가장 크게 들리는
      // 모터)을 선택한다 — "비슷하면 더 큰 소리 기준" 사용자 확정 동작.
      if (rms < Math.max(options.silenceRms, options.proximityRms)) return emptyAnalysis(rms)

      const pyinCandidates = estimateFrame(frame, decimatedRate, {
        fMin: options.fMin,
        fMax: options.fMax,
        maxCandidates: options.maxCandidates,
        divisors: options.pitchDivisors,
      })
      if (pyinCandidates.length === 0) return emptyAnalysis(rms)

      spectrum.compute(frame)
      // 진단 전용(판정 비관여) — 실제 배음 구조를 그대로 실어 보낸다
      const topPeaks = collectTopPeaks(spectrum.power, spectrum.binHz, decimatedRate, combOptions)
      const scored = scoreCandidates(
        spectrum.power,
        spectrum.binHz,
        decimatedRate,
        pyinCandidates,
        combOptions,
      )
      const winner = scored[0]
      if (winner === undefined) return emptyAnalysis(rms)
      const voicedProb = winner.voicedProb

      // 일치도 검사 기준은 **VP 이전** 값이어야 한다 (v2 §1).
      // VP를 먼저 전 고조파로 돌리면 오염 성분(예: 6f₀ 근처 독립 톤)까지 함께 적합되어
      // f₀가 오염 쪽으로 끌려가고, 그 결과 오염 성분이 스스로 "일치"하는 것으로 판정된다.
      // 피크 가중 평균은 각 고조파의 implied f₀를 독립 평균하므로 그 결합이 없다.
      // 옥타브 하향 오판 교정을 VP·게이트보다 **먼저** 적용한다 — 이후 일치도 검사·정밀 추정·
      // 게이트가 모두 교정된 f₀ 기준으로 계산돼야 SNR·고조파 판정이 정상화된다.
      const start = options.octaveCorrection
        ? correctOctaveDown(
            spectrum.power,
            spectrum.binHz,
            decimatedRate,
            peakWeightedF0(winner),
            options.fMax,
          )
        : peakWeightedF0(winner)
      const measured: HarmonicMeasurement[] = measureHarmonics(
        spectrum.power,
        spectrum.binHz,
        decimatedRate,
        start,
        options.scoredHarmonics,
      )
      const usedHarmonics = checkHarmonicConsistency(
        measured,
        start,
        options.consistencyTolRatio,
      )

      // VP 정밀 추정: 일치 판정된 고조파만으로 comb 승자 ±1 bin 탐색 (v2 §1)
      const final = refine(frame, decimatedRate, start, {
        harmonics: usedHarmonics,
        searchHalfWidthHz: 1.5 * spectrum.binHz,
      })

      // 신뢰 게이트 (v2 §1): SNR ≥ 8 dB & 검출 고조파 ≥ 2 & voicing 임계.
      // 예외: 순음(§3 fixture 1)은 고조파가 1개뿐이므로 강한 SNR(≥ gateStrongSnrDb)이면 통과.
      const gate = computeGateMetrics(
        spectrum.power,
        spectrum.binHz,
        decimatedRate,
        final.f0,
        combOptions,
      )
      const harmonicCountOk =
        gate.detectedHarmonics.length >= options.gateMinHarmonics ||
        (gate.detectedHarmonics.length >= 1 && gate.snrDb >= options.gateStrongSnrDb)
      const gatePassed =
        voicedProb >= options.gateVoicingThreshold &&
        gate.snrDb >= options.gateSnrDb &&
        harmonicCountOk

      if (!gatePassed) {
        return {
          gatePassed: false,
          f0: null,
          candidates: [],
          voicedProb,
          snrDb: gate.snrDb,
          detectedHarmonics: gate.detectedHarmonics,
          usedHarmonics,
          rms,
          topPeaks,
          candidateF0: final.f0,
        }
      }

      // Viterbi 후보 격자: 승자는 VP 정밀값, 나머지는 피크 가중값 (전량 VP는 예산 초과, v2 §4)
      const candidates: TrackCandidate[] = scored.map((c, i) => ({
        f0: i === 0 ? final.f0 : peakWeightedF0(c),
        score: c.combScore,
      }))
      return {
        gatePassed: true,
        f0: final.f0,
        candidates,
        voicedProb,
        snrDb: gate.snrDb,
        detectedHarmonics: gate.detectedHarmonics,
        usedHarmonics,
        rms,
        topPeaks,
        candidateF0: final.f0,
      }
    },
  }
}
