// F1 분석 엔진 fixture 수용 테스트 — analysis-algorithm.md v2 §3 fixture 8종이 canonical.
// 합격 수치는 feature-plan.md F1 완료 조건을 그대로 사용한다. 구현에 맞춘 기준 완화 금지 —
// 여기서 실패하면 테스트가 아니라 구현이 계약을 어긴 것이다.
//
// 전 신호는 __fixtures__/synth.ts 의 결정적(seeded PRNG) 생성기만 사용한다 (재현성).
// 엔진 스트리밍 경계(청크 분할·필터 상태 유지)를 함께 검증하기 위해 1024 샘플 청크로 공급한다.

import {describe, expect, test} from 'vitest'

import {
  CHIRP_END_HZ,
  FIXTURE_SAMPLE_RATE,
  HARMONIC_SET,
  OCTAVE_F0_HZ,
  PURE_TONE_HZ,
  chirpTrueF0,
  fixtureContaminated,
  fixtureHarmonicDominant,
  fixtureOctaveTemptation,
  fixturePureTone,
  fixtureSilence,
  fixtureSnr,
  fixtureSpinUpChirp,
} from './__fixtures__/synth'
import {createFrameAnalyzer} from './analyze-frame'
import {createAnalysisEngine} from './engine'
import {estimateFrame} from './pyin'
import {DEFAULT_TUNING, resolveEngineOptions} from './types'
import type {DisplayEstimate} from './types'

/** 필터·추적 과도 구간 제외 시점 (s) — 첫 프레임 0.2 s + 수렴 여유 */
const WARMUP_SEC = 0.5
/** 스핀업 추적 지연 판정의 측정 잡음 여유 (Hz) — 지연 예산 0.5 s(=75 Hz)와 별개 */
const TRACKING_NOISE_MARGIN_HZ = 10

/** fixture ②~⑤의 기본 주파수 — HARMONIC_SET canonical 값에서 파생 (300 Hz) */
const HARMONIC_F0_HZ = HARMONIC_SET[0]!.freqHz

interface TimedEstimate {
  /** 이 추정이 나온 프레임의 종료 시각 (s, 데시메이션 타임라인 기준) */
  frameEndSec: number
  f0: number | null
  rpm: number | null
  confidence: number
  status: DisplayEstimate['status']
}

function atLabel(e: TimedEstimate): string {
  return `t=${e.frameEndSec.toFixed(3)}s status=${e.status}`
}

/**
 * 출력 계약 불변식 (v2 §1 출력 / REQ-ST-003) — 모든 추정에 대해 무조건 성립해야 한다:
 * - weak-signal ⇒ f0 === null && rpm === null (수치 미표시를 값으로 강제)
 * - 수치 상태(measuring/stable) ⇒ f0/rpm 존재, rpm === round(f0 × 60)
 * - confidence ∈ [0, 1]
 */
function assertDisplayInvariant(est: DisplayEstimate, frameEndSec: number): void {
  const at = `t=${frameEndSec.toFixed(3)}s status=${est.status}`
  if (est.status === 'weak-signal') {
    if (est.f0 !== null || est.rpm !== null) {
      throw new Error(
        `weak-signal인데 수치 노출 (${at}, f0=${String(est.f0)}, rpm=${String(est.rpm)}) — REQ-ST-003 위반`,
      )
    }
  } else {
    if (est.f0 === null || est.rpm === null) {
      throw new Error(`${est.status} 상태인데 f0/rpm이 null (${at})`)
    }
    if (est.rpm !== Math.round(est.f0 * 60)) {
      throw new Error(`rpm !== round(f0×60) (${at}, f0=${est.f0}, rpm=${est.rpm})`)
    }
  }
  if (!(est.confidence >= 0 && est.confidence <= 1)) {
    throw new Error(`confidence 범위 이탈 (${at}, confidence=${est.confidence})`)
  }
  // 순간 편차(바늘 떨림 신호) 계약: weak-signal이면 반드시 null. 값이 있으면 유한하고,
  // stabilityCv와 같은 창 게이팅(둘 다 창이 차야 non-null)이라 한쪽만 null일 수 없다.
  if (est.status === 'weak-signal') {
    if (est.microVariation !== null) {
      throw new Error(`weak-signal인데 microVariation 노출 (${at}, ${String(est.microVariation)})`)
    }
  } else if (est.microVariation !== null) {
    if (!Number.isFinite(est.microVariation)) {
      throw new Error(`microVariation 비유한 (${at}, ${String(est.microVariation)})`)
    }
    if (est.stabilityCv === null) {
      throw new Error(`microVariation 있는데 stabilityCv null — 창 게이팅 불일치 (${at})`)
    }
  }
}

/** 엔진을 생성해 청크 스트리밍으로 전체 신호를 공급하고, 프레임 종료 시각을 붙여 수집한다 */
function runEngine(pcm: Float32Array, sampleRate: number, chunkSize = 1024): TimedEstimate[] {
  const engine = createAnalysisEngine({sampleRate})
  const out: TimedEstimate[] = []
  let produced = 0
  for (let offset = 0; offset < pcm.length; offset += chunkSize) {
    const chunk = pcm.subarray(offset, Math.min(offset + chunkSize, pcm.length))
    for (const est of engine.process(chunk)) {
      const frameEndSec = (engine.frameLength + produced * engine.hopLength) / engine.decimatedRate
      assertDisplayInvariant(est, frameEndSec)
      out.push({frameEndSec, ...est})
      produced += 1
    }
  }
  return out
}

function estimatesAfter(estimates: readonly TimedEstimate[], fromSec: number): TimedEstimate[] {
  return estimates.filter(e => e.frameEndSec >= fromSec)
}

/** 수치가 있어야 하는 추정에서 f0를 꺼낸다 — weak-signal이면 즉시 실패 */
function f0Of(e: TimedEstimate): number {
  if (e.f0 === null) {
    throw new Error(`수치 추정을 기대했으나 f0=null (${atLabel(e)})`)
  }
  return e.f0
}

/** 연속 수치 추정 간 최대 |log2 비율| (옥타브) — 점프 검출용. weak 구간은 사슬을 끊는다 */
function maxOctaveStep(estimates: readonly TimedEstimate[]): number {
  let max = 0
  let prev: number | null = null
  for (const e of estimates) {
    if (e.f0 === null) {
      prev = null
      continue
    }
    if (prev !== null) max = Math.max(max, Math.abs(Math.log2(e.f0 / prev)))
    prev = e.f0
  }
  return max
}

describe('fixture ① 순음 300 Hz — f0 오차 < 0.3 Hz', () => {
  const estimates = runEngine(fixturePureTone(3), FIXTURE_SAMPLE_RATE)

  test('정착 후 모든 표시값이 300 ± 0.3 Hz', () => {
    const settled = estimatesAfter(estimates, WARMUP_SEC)
    expect(settled.length).toBeGreaterThan(80)
    for (const e of settled) {
      expect(Math.abs(f0Of(e) - PURE_TONE_HZ), atLabel(e)).toBeLessThan(0.3)
    }
  })

  test('안정 판정(stable)에 도달하고 잠금값도 오차 한도 내', () => {
    // 안정 창 1.5 s가 채워지는 최초 시점은 ≈ 1.7 s — 2.0 s 이후엔 stable이 존재해야 한다
    const tail = estimatesAfter(estimates, 2.0)
    const stable = tail.filter(e => e.status === 'stable')
    expect(stable.length).toBeGreaterThan(0)
    for (const e of stable) {
      expect(Math.abs(f0Of(e) - PURE_TONE_HZ), atLabel(e)).toBeLessThan(0.3)
    }
  })
})

describe('fixture ② 배음 지배(약한 300 + 강한 900/1800) — f0=300 채택, 3·6배 오판 금지', () => {
  const estimates = runEngine(fixtureHarmonicDominant(3), FIXTURE_SAMPLE_RATE)

  test('pYIN 후보에 ÷3·÷6 확장으로 기본 주파수 후보가 포함된다', () => {
    // 데시메이션 rate(12 kHz)에서 직접 합성한 1프레임(200 ms)으로 후보 계층 단독 검증
    const frame = fixtureHarmonicDominant(DEFAULT_TUNING.frameSeconds, 12000)
    const candidates = estimateFrame(frame, 12000, {
      fMin: DEFAULT_TUNING.fMin,
      fMax: DEFAULT_TUNING.fMax,
      maxCandidates: DEFAULT_TUNING.maxCandidates,
    })
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.some(c => Math.abs(c.f0 - HARMONIC_F0_HZ) < 6)).toBe(true)
  })

  test('추적 출력이 300 Hz를 채택하고 900/1800 Hz로 오판하지 않는다', () => {
    const settled = estimatesAfter(estimates, WARMUP_SEC)
    expect(settled.length).toBeGreaterThan(80)
    for (const e of settled) {
      // ±3 Hz면 채택 판정에 충분하며, 900(3f0)/1800(6f0) 오판은 원천 배제된다
      expect(Math.abs(f0Of(e) - HARMONIC_F0_HZ), atLabel(e)).toBeLessThan(3)
    }
  })

  test('stable 도달 시 잠금값 300 ± 1 Hz', () => {
    const stable = estimatesAfter(estimates, 2.0).filter(e => e.status === 'stable')
    expect(stable.length).toBeGreaterThan(0)
    for (const e of stable) {
      expect(Math.abs(f0Of(e) - HARMONIC_F0_HZ), atLabel(e)).toBeLessThan(1)
    }
  })
})

describe('fixture ③ 고조파 오염(+1805 Hz 독립 톤) — 일치도 검사가 6차 제외, f0 유지', () => {
  test('프레임 분석: usedHarmonics에서 6차가 제외되고 1·3차는 유지된다', () => {
    // 1805 Hz는 6f0=1800에서 5 Hz(> 0.5%·300 = 1.5 Hz) 벗어난 오염원 — 제외돼야 한다
    const resolved = resolveEngineOptions({sampleRate: 12000, targetDecimatedRate: 12000})
    const analyzer = createFrameAnalyzer(12000, resolved)
    const frame = fixtureContaminated(resolved.frameSeconds, 12000)
    expect(frame.length).toBe(analyzer.frameLength)

    const analysis = analyzer.analyze(frame)
    expect(analysis.gatePassed).toBe(true)
    expect(analysis.usedHarmonics).toContain(1)
    expect(analysis.usedHarmonics).toContain(3)
    expect(analysis.usedHarmonics).not.toContain(6)
    expect(analysis.f0).not.toBeNull()
    expect(Math.abs((analysis.f0 ?? Number.NaN) - HARMONIC_F0_HZ)).toBeLessThan(0.5)
  })

  test('엔진 출력: 오염에도 f0가 300 Hz에 유지된다 (오차 < 0.5 Hz)', () => {
    const estimates = runEngine(fixtureContaminated(3), FIXTURE_SAMPLE_RATE)
    const settled = estimatesAfter(estimates, WARMUP_SEC)
    expect(settled.length).toBeGreaterThan(80)
    for (const e of settled) {
      expect(Math.abs(f0Of(e) - HARMONIC_F0_HZ), atLabel(e)).toBeLessThan(0.5)
    }
  })
})

describe('fixture ④ 잡음 SNR 10 dB — f0 오차 < 0.5 Hz, 게이트 통과', () => {
  const estimates = runEngine(fixtureSnr(10), FIXTURE_SAMPLE_RATE)

  test('정착 후 게이트를 통과하며 오차 < 0.5 Hz', () => {
    const settled = estimatesAfter(estimates, WARMUP_SEC)
    expect(settled.length).toBeGreaterThan(80)
    for (const e of settled) {
      expect(e.status, atLabel(e)).not.toBe('weak-signal')
      expect(Math.abs(f0Of(e) - HARMONIC_F0_HZ), atLabel(e)).toBeLessThan(0.5)
    }
  })

  test('잡음 하에서도 안정 판정에 도달한다', () => {
    const stable = estimatesAfter(estimates, 2.0).filter(e => e.status === 'stable')
    expect(stable.length).toBeGreaterThan(0)
  })
})

describe('fixture ⑤ 잡음 SNR 0 dB — weak-signal 반환, 오값 표시 금지', () => {
  test('모든 추정이 weak-signal이고 수치가 한 번도 노출되지 않는다', () => {
    const estimates = runEngine(fixtureSnr(0), FIXTURE_SAMPLE_RATE)
    expect(estimates.length).toBeGreaterThan(80)
    for (const e of estimates) {
      expect(e.status, atLabel(e)).toBe('weak-signal')
      expect(e.f0, atLabel(e)).toBeNull()
      expect(e.rpm, atLabel(e)).toBeNull()
    }
  })
})

describe('fixture ⑥ 무음 — weak-signal, 0 RPM 표시 금지', () => {
  test('f0/rpm이 명시적으로 null이며 rpm=0으로 대체되지 않는다', () => {
    const estimates = runEngine(fixtureSilence(), FIXTURE_SAMPLE_RATE)
    expect(estimates.length).toBeGreaterThan(30)
    for (const e of estimates) {
      expect(e.status, atLabel(e)).toBe('weak-signal')
      expect(e.f0, atLabel(e)).toBeNull()
      expect(e.rpm, atLabel(e)).toBeNull()
      // 0 RPM 반환 금지 (REQ-ST-003) — null 확인과 별도로 명시 검증
      expect(e.rpm, atLabel(e)).not.toBe(0)
    }
  })
})

describe('fixture ⑦ 스핀업 chirp 200→500 Hz / 2 s — 추적 지연 < 0.5 s, 점프 오작동 없음', () => {
  const estimates = runEngine(fixtureSpinUpChirp(), FIXTURE_SAMPLE_RATE)

  test('전 구간에서 표시값이 0.5 s 전 진값과 현재 진값 사이를 유지한다', () => {
    const settled = estimatesAfter(estimates, WARMUP_SEC)
    expect(settled.length).toBeGreaterThan(80)
    for (const e of settled) {
      const f0 = f0Of(e)
      // 지연 < 0.5 s ⇔ 표시값 ≥ 진f0(t − 0.5); 상한은 현재 진값(과도 overshoot 여유 포함)
      const lower = chirpTrueF0(e.frameEndSec - 0.5) - TRACKING_NOISE_MARGIN_HZ
      const upper = chirpTrueF0(e.frameEndSec) + TRACKING_NOISE_MARGIN_HZ
      expect(f0, atLabel(e)).toBeGreaterThanOrEqual(lower)
      expect(f0, atLabel(e)).toBeLessThanOrEqual(upper)
    }
  })

  test('Viterbi 점프 오작동 없음 + 유지 구간에서 500 Hz 수렴', () => {
    const settled = estimatesAfter(estimates, WARMUP_SEC)
    expect(maxOctaveStep(settled)).toBeLessThan(0.3)
    const last = settled[settled.length - 1]
    if (last === undefined) throw new Error('추정이 비어 있음')
    expect(Math.abs(f0Of(last) - CHIRP_END_HZ), atLabel(last)).toBeLessThan(2)
  })
})

describe('fixture ⑧ 옥타브 유혹(300↔600 진폭 반전 교차) — 추적 출력에 옥타브 점프 없음', () => {
  // 계약(v2 §3 ⑧)은 "옥타브 점프 없음"이지 "항상 수치를 낸다"가 아니다.
  // 기본파가 소멸하는 교차 후반부에서 게이트가 수치를 거부(weak-signal)하는 것은
  // "신뢰 게이트 미달 시 수치 미표시"(v2 §1) 원칙 그대로이며 오값 표시보다 안전하다.
  // 따라서 검증 대상은 ① 보고된 수치는 반드시 300 Hz 근방 ② 600 Hz 보고 0건
  // ③ 거부는 반드시 null(오값·0 RPM 금지) ④ 기본파가 지배적인 구간에서는 수치가 나온다.
  test('보고된 수치는 전부 300 Hz 근방 — 600 Hz로 점프하지 않는다', () => {
    const estimates = runEngine(fixtureOctaveTemptation(), FIXTURE_SAMPLE_RATE)
    const settled = estimatesAfter(estimates, WARMUP_SEC)
    expect(settled.length).toBeGreaterThan(100)

    const numeric = settled.filter(e => e.f0 !== null)
    for (const e of numeric) {
      expect(e.f0!, atLabel(e)).toBeGreaterThan(OCTAVE_F0_HZ * 0.9)
      expect(e.f0!, atLabel(e)).toBeLessThan(OCTAVE_F0_HZ * 1.1)
    }
    // 거부 프레임은 수치가 완전히 비어 있어야 한다 (0 RPM·이전 값 재노출 금지)
    for (const e of settled.filter(e => e.f0 === null)) {
      expect(e.status, atLabel(e)).toBe('weak-signal')
      expect(e.rpm, atLabel(e)).toBeNull()
    }
    expect(maxOctaveStep(numeric)).toBeLessThan(0.3)

    // 기본파가 아직 지배적인 교차 전반부(fadeStart=1.0s 이전)에서는 수치가 나와야 한다
    const earlyNumeric = numeric.filter(e => e.frameEndSec < 1)
    expect(earlyNumeric.length).toBeGreaterThan(10)
  })
})

describe('sampleRate 파라미터화 — 48 kHz 하드코딩 금지 (v2 §2)', () => {
  test('44.1 kHz 캡처에서 데시메이션 rate·프레임 길이가 실측 기반으로 계산된다', () => {
    const engine = createAnalysisEngine({sampleRate: 44100})
    expect(engine.sampleRate).toBe(44100)
    expect(engine.decimatedRate).toBe(11025) // round(44100/12000)=4 → 44100/4
    expect(engine.frameLength).toBe(Math.round(DEFAULT_TUNING.frameSeconds * 11025))
  })

  test('44.1 kHz 순음에서도 f0 오차 < 0.3 Hz', () => {
    const estimates = runEngine(fixturePureTone(3, 44100), 44100)
    const settled = estimatesAfter(estimates, WARMUP_SEC)
    expect(settled.length).toBeGreaterThan(80)
    for (const e of settled) {
      expect(Math.abs(f0Of(e) - PURE_TONE_HZ), atLabel(e)).toBeLessThan(0.3)
    }
  })

  test('유효하지 않은 sampleRate는 즉시 거부된다', () => {
    expect(() => resolveEngineOptions({sampleRate: 0})).toThrow(RangeError)
    expect(() => resolveEngineOptions({sampleRate: Number.NaN})).toThrow(RangeError)
  })
})

describe('신뢰 게이트 상실 — 이전 값 노출 금지 (D-9 stale 방지)', () => {
  // v2 §1 게이트 계약: 미달 시 수치 미표시·weak-signal. 구현은 깜빡임 방지용 coast
  // (missTolerance 프레임 = 100 ms 예측 유지)를 두므로, 허용창이 지난 뒤에는 어떤 수치도
  // 다시 노출되면 안 된다 — 이전 확정값(300 Hz)의 잔류 표시를 여기서 잡는다.
  const toneSeconds = 1.5
  const silenceSeconds = 1.0
  const tone = fixturePureTone(toneSeconds)
  const pcm = new Float32Array(tone.length + Math.round(silenceSeconds * FIXTURE_SAMPLE_RATE))
  pcm.set(tone, 0)
  const estimates = runEngine(pcm, FIXTURE_SAMPLE_RATE)

  test('신호 구간에서는 정상 수치가 표시된다 (sanity)', () => {
    const active = estimates.filter(
      e => e.frameEndSec >= WARMUP_SEC && e.frameEndSec <= toneSeconds,
    )
    expect(active.length).toBeGreaterThan(10)
    for (const e of active) {
      expect(Math.abs(f0Of(e) - PURE_TONE_HZ), atLabel(e)).toBeLessThan(0.3)
    }
  })

  test('무음 전환 후 허용창이 지나면 영구히 weak-signal·null — stale 값 금지', () => {
    // 완전 무음 프레임의 최초 종료 시각 + (missTolerance + 1) hop + 여유
    const gateLossSec = toneSeconds + DEFAULT_TUNING.frameSeconds
    const deadline =
      gateLossSec + (DEFAULT_TUNING.missTolerance + 1) * DEFAULT_TUNING.hopSeconds + 0.03
    const tail = estimates.filter(e => e.frameEndSec >= deadline)
    expect(tail.length).toBeGreaterThan(10)
    for (const e of tail) {
      expect(e.status, atLabel(e)).toBe('weak-signal')
      expect(e.f0, atLabel(e)).toBeNull()
      expect(e.rpm, atLabel(e)).toBeNull()
    }
  })
})
