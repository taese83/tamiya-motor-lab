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
import {estimateFrame, pickYinPitch} from './pyin'
import {refine} from './refine'
import {createSpectrumAnalyzer} from './spectrum'
import type {
  FrameAnalysis,
  GateReject,
  HarmonicMeasurement,
  ResolvedEngineOptions,
  ScoredCandidate,
  TrackCandidate,
} from './types'

export interface FrameAnalyzer {
  readonly frameLength: number
  /**
   * @param hintF0 추적 계층이 현재 잠근 f0 (없으면 null) — R54 추적 유지 게이트의 기준.
   *   전 후보가 엄격 게이트에 기각돼도 hint ±continueTolRatio 안의 후보는 완화 임계로 승인한다.
   */
  analyze(frame: Float32Array, hintF0?: number | null): FrameAnalysis
}

function emptyAnalysis(rms: number, reject: GateReject): FrameAnalysis {
  return {
    gatePassed: false,
    rejects: [reject],
    evalF0: null,
    f0: null,
    candidates: [],
    voicedProb: 0,
    snrDb: -30,
    detectedHarmonics: [],
    usedHarmonics: [],
    rms,
  }
}


/* ── R56 소리원 그룹 선택 (사용자 확정: "가장 크게 들리는 소리원 안에서 최고 파노") ── *
 * pYIN/자기상관의 태생상 가짜 후보는 **아래 방향**(÷2·÷3 lag 배수 dip)으로 생긴다. 스펙트럼
 * 피크 {546, 1092}를 설명하는 후보는 182·273·546 모두지만 최대공약수인 546이 진짜 기본파다.
 * 그래서 게이트 통과 후보를 정수배 관계(같은 소리원)로 묶고, 그룹 간에는 comb(소리 크기)로
 * 소리원을 고른 뒤(다중 모터 계약: 가장 크게 들리는 모터 우선), 그룹 안에서는 최고 f0를
 * 채택한다. ×2/×3 서브하모닉 승격 휴리스틱(R55)은 이 선택 규칙이 대체한다.
 *
 * 단 "무조건 최고"는 역방향 오판이 있다: 2배음이 강한 저속 모터(f0<400이면 2f0가 대역 안)는
 * 2f0에도 dip·게이트 통과가 생겨 그룹 최고가 2f0가 된다. 그래서 그룹 안에서 내려갈지는
 * **실제 스펙트럼 증거**로 판정한다 — 하위 후보 p(=top/n)가 top과 공유하지 않는 배음
 * (n의 배수가 아닌 k·p 대역)에 강한 에너지를 가지면 p가 진짜 기본파고 top은 그 배음이다.
 * 예: {300, 600} 그룹에서 300의 1배(300 자체)가 강하면 600은 2배음 → 300 채택.
 *     {546, 182} 그룹에서 182의 1·2·4·5배(182·364·728·910)가 비면 182는 인공물 → 546 채택.
 * 마모 모터의 약한 하위 사이드밴드(584 모터의 292 성분)는 상대 마진(-10dB)이 걸러낸다. */
const GROUP_EVIDENCE_MIN_SNR_DB = 12
const GROUP_EVIDENCE_MARGIN_DB = 10
/**
 * R63 상향 오판 하강의 전력 문턱 — f0/n 비공유 대역 피크 전력이 메인 라인(f0)의 이 비율
 * 이상이어야 "진짜 기본파의 실증거"로 인정한다(≈ −10dB). 합성 fixture처럼 노이즈 플로어가
 * 0에 가까우면 SNR이 40dB로 포화돼 상대 마진이 무의미해지므로, 전력 **비율**로 판정한다.
 * 마모 모터의 약한 반차수 사이드밴드(584의 292: 전력 ≈5%, 582의 291: ≈9%)는 걸러진다.
 */
const DESCEND_EVIDENCE_POWER_RATIO = 0.1
/** R65: 하강 목적지(f0/n)가 추적값에서 이 비율 이내일 때만 하강 허용 (YIN_HINT_TOL_RATIO와 동일) */
const DESCEND_HINT_TOL_RATIO = 0.08
/** 정수배 관계 판정 허용 오차 (배수당 상대) — VP 정밀값 기준이라 좁게 잡는다 */
const GROUP_RATIO_TOL = 0.05
/** 그룹핑·증거 검사에 쓰는 최대 배수 (게이트 대역과 동일 범위) */
const GROUP_MAX_MULTIPLE = 6

function maxSnr(measurements: readonly HarmonicMeasurement[]): number {
  let best = 0
  for (const m of measurements) best = Math.max(best, m.snrDb)
  return best
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

  // R54: 후보 1개의 전체 평가 파이프라인 (옥타브 교정 → 일치도 → VP 정밀 → 게이트 계측).
  // 종전에는 comb 1위만 평가해, 1위가 틀리면(÷3 미끄러짐) 프레임 전체가 기각됐다.
  interface CandidateEvaluation {
    finalF0: number
    usedHarmonics: number[]
    snrDb: number
    detectedHarmonics: number[]
    voicedProb: number
    /** 엄격 게이트 기각 사유 — 빈 배열이면 통과 */
    rejects: GateReject[]
  }

  return {
    frameLength,
    analyze(frame, hintF0 = null) {
      let sumSq = 0
      for (let i = 0; i < frame.length; i++) sumSq += frame[i]! * frame[i]!
      const rms = Math.sqrt(sumSq / Math.max(1, frame.length))
      // 무음 가드: 0 RPM·임의 값 표시 금지 (REQ-ST-003) — 분석 자체를 생략.
      // 근접 필터(v2.1): 절대 음량 하한 미달 = 원거리 소음 — 측정 대상 아님(weak-signal).
      // 하한을 넘는 신호가 여럿이면 comb 채점이 고조파 에너지 최강(가장 크게 들리는
      // 모터)을 선택한다 — "비슷하면 더 큰 소리 기준" 사용자 확정 동작.
      if (rms < Math.max(options.silenceRms, options.proximityRms)) {
        return emptyAnalysis(rms, 'rms')
      }

      const pyinCandidates = estimateFrame(frame, decimatedRate, {
        fMin: options.fMin,
        fMax: options.fMax,
        maxCandidates: options.maxCandidates,
        divisors: options.pitchDivisors,
      })
      if (pyinCandidates.length === 0) return emptyAnalysis(rms, 'no-dip')

      spectrum.compute(frame)

      // 일치도 검사 기준은 **VP 이전** 값이어야 한다 (v2 §1).
      // VP를 먼저 전 고조파로 돌리면 오염 성분(예: 6f₀ 근처 독립 톤)까지 함께 적합되어
      // f₀가 오염 쪽으로 끌려가고, 그 결과 오염 성분이 스스로 "일치"하는 것으로 판정된다.
      // 피크 가중 평균은 각 고조파의 implied f₀를 독립 평균하므로 그 결합이 없다.
      const evaluate = (candidate: ScoredCandidate): CandidateEvaluation => {
        const start = peakWeightedF0(candidate)
        const measured: HarmonicMeasurement[] = measureHarmonics(
          spectrum.power,
          spectrum.binHz,
          decimatedRate,
          start,
          options.scoredHarmonics,
        )
        const usedHarmonics = checkHarmonicConsistency(measured, start, options.consistencyTolRatio)
        // VP 정밀 추정: 일치 판정된 고조파만으로 후보 ±1 bin 탐색 (v2 §1)
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
        // R53 진단: 신뢰 게이트는 조건별 동시 기각이 가능 — 실패한 조건을 전부 계상한다
        const rejects: GateReject[] = []
        if (candidate.voicedProb < options.gateVoicingThreshold) rejects.push('voicing')
        if (gate.snrDb < options.gateSnrDb) rejects.push('snr')
        if (!harmonicCountOk) rejects.push('harmonics')
        return {
          finalF0: final.f0,
          usedHarmonics,
          snrDb: gate.snrDb,
          detectedHarmonics: gate.detectedHarmonics,
          voicedProb: candidate.voicedProb,
          rejects,
        }
      }

      // ── R57 tuner 모드 (기본) — 파노튜너 방식: **표준 YIN 규칙**(대역 내 dip 중 임계 이하
      // 최단 lag = 최고 주파수)을 그대로 채택한다. 시간영역 주기성은 스펙트럼 기본파 라인이
      // 약해도 유지되므로(300대 모터: 900·1500 홀수 배음이 300-주기를 강제) comb 채점이
      // 만들던 ÷3 미끄러짐·저파노 기각이 없고, 약한 하위 실성분(584 모터의 292)은 임계가
      // 걸러 ÷2로도 내려가지 않는다(pickYinPitch 주석 참조). 검증은 rms(위)·YIN 임계 자체 —
      // "무음에서 임의 값 금지" 계약 유지. SNR·고조파는 게이트가 아니라 계측으로만 실어
      // 신뢰도 미터·진단이 계속 동작한다. comb 경로는 pitchMode:'comb'으로 보존.
      if (options.pitchMode === 'tuner') {
        const voicedProb = pyinCandidates[0]!.voicedProb
        const yin = pickYinPitch(frame, decimatedRate, {
          fMin: options.fMin,
          fMax: options.fMax,
          threshold: options.yinThreshold,
          hintF0, // R62 서브하모닉 제외 — 추적값의 1/2~1/6 부근 dip은 측정하지 않는다
        })
        if (yin === null) {
          // dip은 있으나 임계 이하 명료 주기가 없음 — 무성(voicing) 기각
          return {
            gatePassed: false,
            rejects: ['voicing'],
            evalF0: null,
            f0: null,
            candidates: [],
            voicedProb,
            snrDb: -30,
            detectedHarmonics: [],
            usedHarmonics: [],
            rms,
          }
        }
        // R63 상향 오판 하강(사용자: 위로 잘못되는 경우를 잡아야 함) — 픽 f0가 사실 진짜
        // 기본파의 n배(2·3)라면, f0/n의 **비공유 배음 대역**(n=2: 0.5·1.5·2.5f0 / n=3:
        // 1/3·2/3·4/3·5/3f0 — f0 계열에는 존재할 수 없는 자리)에 실제 에너지가 있어야 한다.
        // 시간영역 dip으로는 구분 불가(n배 주기 신호의 1/n dip은 수학적으로 동일)라 이 검사만이
        // 판별 근거다. 조건: 국소 SNR ≥12dB(실피크) **그리고** 메인 라인 대비 전력 ≥10%.
        // R65 힌트 게이트: 하강 목적지(f0/n)가 **현재 추적값 부근일 때만** 하강한다 — 이 검사는
        // "추적 중인 값에서 위로 튄 픽을 되돌리는" 방어이지 새 값을 만드는 게 아니다. R62가
        // 추적값의 서브하모닉으로 미끄러지는 걸 막는 것과 상하 대칭 원리. 게이트가 없으면
        // 반차수 사이드밴드가 순간 10%를 넘는 프레임에서 정상 추적(445)이 반토막(222)으로
        // 하강해 버린다(실기기 확인). 추적이 없으면 하강 없음 — 초기 획득은 YIN 최단 lag +
        // 비정수배 반증 가드가 담당한다.
        const descendFundamental = (f0: number): number => {
          if (hintF0 === null || hintF0 <= 0) return f0
          const main = measureHarmonics(spectrum.power, spectrum.binHz, decimatedRate, f0, [1])[0]
          const mainPower = main?.peakPower ?? 0
          if (mainPower <= 0) return f0
          for (const n of [2, 3]) {
            const base = f0 / n
            if (base < options.fMin) continue
            if (Math.abs(base / hintF0 - 1) > DESCEND_HINT_TOL_RATIO) continue
            const ks = n === 2 ? [1, 3, 5] : [1, 2, 4, 5]
            const evidence = measureHarmonics(spectrum.power, spectrum.binHz, decimatedRate, base, ks)
            for (const h of evidence) {
              if (h.snrDb < GROUP_EVIDENCE_MIN_SNR_DB) continue
              if (h.peakPower >= DESCEND_EVIDENCE_POWER_RATIO * mainPower) return base
            }
          }
          return f0
        }
        const pickedF0 = descendFundamental(yin.f0)

        const topScored: ScoredCandidate = {
          f0: pickedF0,
          combScore: 0,
          harmonics: measureHarmonics(
            spectrum.power,
            spectrum.binHz,
            decimatedRate,
            pickedF0,
            options.scoredHarmonics,
          ),
          voicedProb,
          salience: 1 - yin.depth,
        }
        const evaluation = evaluate(topScored)
        // Viterbi 후보 격자: 채택(YIN 픽)은 VP 정밀값 + 최상위 emission, 나머지 pYIN 후보는
        // salience 환산 — 추적기가 지배 주기를 따르되 전이 페널티로 순간 점프는 계속 눌린다.
        const candidates: TrackCandidate[] = [
          {f0: evaluation.finalF0, score: 20},
          ...pyinCandidates
            .filter(c => Math.abs(Math.log2(c.f0 / yin.f0)) > 0.05)
            .map(c => ({f0: c.f0, score: c.salience * 10})),
        ]
        return {
          gatePassed: true,
          rejects: [],
          evalF0: evaluation.finalF0,
          f0: evaluation.finalF0,
          candidates,
          voicedProb,
          snrDb: evaluation.snrDb,
          detectedHarmonics: evaluation.detectedHarmonics,
          usedHarmonics: evaluation.usedHarmonics,
          rms,
        }
      }

      // ── comb 모드 (레거시, v2 §1 원안) — 스펙트럼 comb 채점 + 엄격 게이트 + 그룹 선택
      const scored = scoreCandidates(
        spectrum.power,
        spectrum.binHz,
        decimatedRate,
        pyinCandidates,
        combOptions,
      )
      const winner = scored[0]
      if (winner === undefined) return emptyAnalysis(rms, 'no-winner')

      // R56: 통과 후보 → 소리원 그룹핑(정수배 관계) → 그룹 간 comb(소리 크기) →
      // 그룹 내 증거 기반 최고 f0 선택 (파일 상단 R56 주석 참조)
      const selectBySourceGroups = (
        passing: readonly number[],
        all: readonly CandidateEvaluation[],
      ): number => {
        interface SourceGroup {
          memberIdx: number[]
          bestScore: number
        }
        const sorted = [...passing].sort((a, b) => all[b]!.finalF0 - all[a]!.finalF0)
        const groups: SourceGroup[] = []
        for (const idx of sorted) {
          const f0 = all[idx]!.finalF0
          let attached = false
          for (const group of groups) {
            const top = all[group.memberIdx[0]!]!.finalF0
            const ratio = top / f0
            const n = Math.round(ratio)
            if (n >= 1 && n <= GROUP_MAX_MULTIPLE && Math.abs(ratio - n) <= GROUP_RATIO_TOL * n) {
              group.memberIdx.push(idx)
              group.bestScore = Math.max(group.bestScore, scored[idx]!.combScore)
              attached = true
              break
            }
          }
          if (!attached) groups.push({memberIdx: [idx], bestScore: scored[idx]!.combScore})
        }
        // 소리원 선택: comb 최고 = 가장 크게 들리는 모터 (다중 모터 계약 유지)
        let best = groups[0]!
        for (const group of groups) {
          if (group.bestScore > best.bestScore) best = group
        }
        // 그룹 내: 최고 f0에서 시작해, 하위 멤버(top/n)가 top과 공유하지 않는 배음 대역에
        // 강한 실증거를 가질 때만 내려간다 — {300,600}은 300의 1배 실피크로 300 채택,
        // {546,182}는 182의 1·2·4·5배 공백으로 546 유지. 약한 사이드밴드는 마진이 거른다.
        let pickIdx = best.memberIdx[0]!
        for (let m = 1; m < best.memberIdx.length; m++) {
          const lowIdx = best.memberIdx[m]!
          const pickF0 = all[pickIdx]!.finalF0
          const lowF0 = all[lowIdx]!.finalF0
          const n = Math.round(pickF0 / lowF0)
          if (n < 2 || n > GROUP_MAX_MULTIPLE) continue
          const nonSharedKs: number[] = []
          for (let k = 1; k <= GROUP_MAX_MULTIPLE; k++) {
            if (k % n !== 0) nonSharedKs.push(k)
          }
          const evidenceSnr = maxSnr(
            measureHarmonics(spectrum.power, spectrum.binHz, decimatedRate, lowF0, nonSharedKs),
          )
          const pickFundamentalSnr = maxSnr(
            measureHarmonics(spectrum.power, spectrum.binHz, decimatedRate, pickF0, [1]),
          )
          if (
            evidenceSnr >= GROUP_EVIDENCE_MIN_SNR_DB &&
            evidenceSnr >= pickFundamentalSnr - GROUP_EVIDENCE_MARGIN_DB
          ) {
            pickIdx = lowIdx
          }
        }
        return pickIdx
      }

      // R54 다후보 게이트: 전 후보를 평가한다 — 1위가 틀려도(÷3 미끄러짐) 옳은 차순위
      // 후보가 살아남고, 통과 후보 전체가 그룹 선택(R56)의 입력이 된다.
      const evaluations: CandidateEvaluation[] = scored.map(candidate => evaluate(candidate))
      const passingIdx: number[] = []
      for (let i = 0; i < evaluations.length; i++) {
        if (evaluations[i]!.rejects.length === 0) passingIdx.push(i)
      }

      let chosenIdx = -1
      if (passingIdx.length > 0) {
        chosenIdx = options.octaveCorrection
          ? selectBySourceGroups(passingIdx, evaluations)
          : passingIdx[0]! // 레거시(fixture ⑧ 하위 옥타브 고정): comb 순위 첫 통과 유지
      }

      // R54 추적 유지 게이트: 전 후보가 엄격 게이트에 기각돼도, 추적 중 f0(hint) ±tol 안의
      // 후보는 완화 임계(continueSnrDb·continueMinHarmonics)로 승인해 track을 잇는다.
      // 신규 획득은 여전히 엄격 게이트 전용 — ÷3 후보는 hint에서 1.58옥타브 밖이라 대상 아님.
      if (chosenIdx < 0 && hintF0 !== null && hintF0 > 0) {
        let bestIdx = -1
        for (let i = 0; i < evaluations.length; i++) {
          const evaluation = evaluations[i]!
          if (Math.abs(evaluation.finalF0 - hintF0) > options.continueTolRatio * hintF0) continue
          if (evaluation.voicedProb < options.gateVoicingThreshold) continue
          if (evaluation.snrDb < options.continueSnrDb) continue
          if (evaluation.detectedHarmonics.length < options.continueMinHarmonics) continue
          if (bestIdx < 0 || evaluation.snrDb > evaluations[bestIdx]!.snrDb) bestIdx = i
        }
        chosenIdx = bestIdx
      }

      if (chosenIdx < 0) {
        // 전 후보 기각 — 계측·기각 사유는 comb 1위 기준으로 보고한다 (진단 관측성 유지)
        const first = evaluations[0]!
        return {
          gatePassed: false,
          rejects: first.rejects,
          evalF0: first.finalF0,
          f0: null,
          candidates: [],
          voicedProb: first.voicedProb,
          snrDb: first.snrDb,
          detectedHarmonics: first.detectedHarmonics,
          usedHarmonics: first.usedHarmonics,
          rms,
        }
      }

      const chosen = evaluations[chosenIdx]!
      // Viterbi 후보 격자: 채택 후보는 VP 정밀값, 나머지는 피크 가중값 (전량 VP는 예산 초과, v2 §4).
      // R55: 채택 후보에 **격자 최상위 emission**을 부여한다 — comb 순위가 ÷3으로 미끄러진
      // 프레임에서 게이트는 옳은 후보를 채택해도, 격자에 comb 점수를 그대로 실으면 Viterbi가
      // 최고점(÷3) 경로에 눌러앉아 표시가 틀린 값에 고정된다(실기기: ev 544 통과에도 181.5 표시).
      // 게이트(엄격/추적 유지)를 통과한 후보가 더 강한 증거이므로 emission이 comb 순위를 이긴다.
      const topScore = scored[0]!.combScore
      const CHOSEN_SCORE_MARGIN = 10 // EMISSION_SCALE_DB 1단위 — lag 5 내 오경로 탈출 보장
      const candidates: TrackCandidate[] = scored.map((c, i) => ({
        f0: i === chosenIdx ? chosen.finalF0 : peakWeightedF0(c),
        score: i === chosenIdx ? topScore + CHOSEN_SCORE_MARGIN : c.combScore,
      }))
      return {
        gatePassed: true,
        rejects: [],
        evalF0: chosen.finalF0,
        f0: chosen.finalF0,
        candidates,
        voicedProb: chosen.voicedProb,
        snrDb: chosen.snrDb,
        detectedHarmonics: chosen.detectedHarmonics,
        usedHarmonics: chosen.usedHarmonics,
        rms,
      }
    },
  }
}
