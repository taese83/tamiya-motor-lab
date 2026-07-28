// 합성 신호 fixture 생성기 (v2 §3 / feature-plan §6 canonical 경로).
// 전 생성기는 결정적(seeded RNG) — 테스트 재현성을 보장한다. MSW 없음(DL-006): 이 fixture와
// fake-indexeddb seed가 mock 경계다. 엔진 unit은 이 파일만으로 8종 수용 기준을 검증한다.

export const FIXTURE_SAMPLE_RATE = 48000

/** mulberry32 — 결정적 PRNG (0..1) */
export function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box-Muller 백색 Gaussian 잡음 */
export function whiteNoise(length: number, rng: () => number): Float32Array {
  const out = new Float32Array(length)
  for (let i = 0; i < length; i += 2) {
    const u1 = Math.max(rng(), 1e-12)
    const u2 = rng()
    const r = Math.sqrt(-2 * Math.log(u1))
    out[i] = r * Math.cos(2 * Math.PI * u2)
    if (i + 1 < length) out[i + 1] = r * Math.sin(2 * Math.PI * u2)
  }
  return out
}

/** Paul Kellet economy 3-pole 근사 pink noise (−3 dB/oct) */
export function pinkNoise(length: number, rng: () => number): Float32Array {
  const white = whiteNoise(length, rng)
  const out = new Float32Array(length)
  let b0 = 0
  let b1 = 0
  let b2 = 0
  for (let i = 0; i < length; i++) {
    const w = white[i]!
    b0 = 0.99765 * b0 + w * 0.099046
    b1 = 0.963 * b1 + w * 0.2965164
    b2 = 0.57 * b2 + w * 1.0526913
    out[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25
  }
  return out
}

export interface TonePartial {
  freqHz: number
  amplitude: number
  phase?: number
}

/** 정현파 합 — 각 partial은 독립 위상 */
export function toneSet(
  partials: readonly TonePartial[],
  seconds: number,
  sampleRate: number = FIXTURE_SAMPLE_RATE,
): Float32Array {
  const length = Math.round(seconds * sampleRate)
  const out = new Float32Array(length)
  for (const {freqHz, amplitude, phase = 0} of partials) {
    const omega = (2 * Math.PI * freqHz) / sampleRate
    for (let i = 0; i < length; i++) out[i] = out[i]! + amplitude * Math.sin(omega * i + phase)
  }
  return out
}

export function signalPower(x: Float32Array): number {
  let sum = 0
  for (let i = 0; i < x.length; i++) sum += x[i]! * x[i]!
  return sum / Math.max(1, x.length)
}

/** signal 대비 목표 SNR(dB)이 되도록 noise를 스케일해 합성 */
export function addNoiseAtSnr(signal: Float32Array, noise: Float32Array, snrDb: number): Float32Array {
  const ps = signalPower(signal)
  const pn = signalPower(noise)
  const scale = Math.sqrt(ps / (pn * Math.pow(10, snrDb / 10)))
  const out = new Float32Array(signal.length)
  for (let i = 0; i < signal.length; i++) out[i] = signal[i]! + scale * noise[i % noise.length]!
  return out
}

// ── v2 §3 fixture 8종 ─────────────────────────────────────────────────────────

/** ① 순음 300 Hz — 합격: f0 오차 < 0.3 Hz */
export const PURE_TONE_HZ = 300
export function fixturePureTone(
  seconds = 3,
  sampleRate: number = FIXTURE_SAMPLE_RATE,
): Float32Array {
  return toneSet([{freqHz: PURE_TONE_HZ, amplitude: 0.8}], seconds, sampleRate)
}

/** ② 배음 지배: 약한 300 + 강한 900/1800 — 합격: f0=300 채택 (3·6배 오판 금지) */
export const HARMONIC_SET: readonly TonePartial[] = [
  {freqHz: 300, amplitude: 0.12},
  {freqHz: 900, amplitude: 1.0, phase: 0.7},
  {freqHz: 1800, amplitude: 0.7, phase: 1.9},
]
export function fixtureHarmonicDominant(
  seconds = 3,
  sampleRate: number = FIXTURE_SAMPLE_RATE,
): Float32Array {
  return toneSet(HARMONIC_SET, seconds, sampleRate)
}

/** ③ 고조파 오염: 배음 세트 + 1805 Hz 독립 톤 — 합격: 일치도 검사가 6차 제외, f0 유지 */
export const CONTAMINANT_HZ = 1805
export function fixtureContaminated(
  seconds = 3,
  sampleRate: number = FIXTURE_SAMPLE_RATE,
): Float32Array {
  return toneSet(
    [
      {freqHz: 300, amplitude: 0.6},
      {freqHz: 900, amplitude: 1.0, phase: 0.7},
      {freqHz: CONTAMINANT_HZ, amplitude: 0.8, phase: 2.4},
    ],
    seconds,
    sampleRate,
  )
}

/** ④·⑤ 잡음 SNR: 배음 세트 + pink noise — 10 dB는 f0 오차 < 0.5 Hz, 0 dB는 weak-signal */
export function fixtureSnr(
  snrDb: number,
  seconds = 3,
  sampleRate: number = FIXTURE_SAMPLE_RATE,
  seed = 20260728,
): Float32Array {
  const signal = toneSet(HARMONIC_SET, seconds, sampleRate)
  const noise = pinkNoise(signal.length, createRng(seed))
  return addNoiseAtSnr(signal, noise, snrDb)
}

/** ⑥ 무음 — 합격: weak-signal, 0 RPM 표시 금지 */
export function fixtureSilence(
  seconds = 1.5,
  sampleRate: number = FIXTURE_SAMPLE_RATE,
): Float32Array {
  return new Float32Array(Math.round(seconds * sampleRate))
}

/** ⑦ 스핀업 chirp: f0 200→500 Hz / 2 s 후 500 Hz 유지 — 합격: 추적 지연 < 0.5 s, 점프 없음 */
export const CHIRP_START_HZ = 200
export const CHIRP_END_HZ = 500
export const CHIRP_SECONDS = 2
export const CHIRP_HOLD_SECONDS = 1
/** 스핀업의 시각 t에서 진짜 f0 (추적 지연 assert용) */
export function chirpTrueF0(tSeconds: number): number {
  if (tSeconds <= 0) return CHIRP_START_HZ
  if (tSeconds >= CHIRP_SECONDS) return CHIRP_END_HZ
  return CHIRP_START_HZ + ((CHIRP_END_HZ - CHIRP_START_HZ) * tSeconds) / CHIRP_SECONDS
}
export function fixtureSpinUpChirp(sampleRate: number = FIXTURE_SAMPLE_RATE): Float32Array {
  const length = Math.round((CHIRP_SECONDS + CHIRP_HOLD_SECONDS) * sampleRate)
  const out = new Float32Array(length)
  // 스핀업은 기본파 우세 구성(회전 성분이 먼저 성장) — 위상은 f0 적분으로 생성
  const partials: readonly {k: number; amplitude: number}[] = [
    {k: 1, amplitude: 1.0},
    {k: 3, amplitude: 0.5},
    {k: 6, amplitude: 0.25},
  ]
  let phase = 0
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    phase += (2 * Math.PI * chirpTrueF0(t)) / sampleRate
    let sample = 0
    for (const {k, amplitude} of partials) sample += amplitude * Math.sin(k * phase)
    out[i] = 0.5 * sample
  }
  return out
}

/** ⑧ 옥타브 유혹: f0=300과 2f0=600의 진폭이 반전 교차 — 합격: 추적 출력에 옥타브 점프 없음 */
export const OCTAVE_F0_HZ = 300
export function fixtureOctaveTemptation(
  seconds = 4,
  sampleRate: number = FIXTURE_SAMPLE_RATE,
): Float32Array {
  const length = Math.round(seconds * sampleRate)
  const out = new Float32Array(length)
  const w1 = (2 * Math.PI * OCTAVE_F0_HZ) / sampleRate
  const w2 = (2 * Math.PI * OCTAVE_F0_HZ * 2) / sampleRate
  const fadeStart = seconds * 0.25
  const fadeEnd = seconds * 0.75
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const mix = Math.min(1, Math.max(0, (t - fadeStart) / (fadeEnd - fadeStart)))
    const a1 = 1.0 - 0.9 * mix // 1.0 → 0.1
    const a2 = 0.1 + 0.9 * mix // 0.1 → 1.0
    out[i] = 0.6 * (a1 * Math.sin(w1 * i) + a2 * Math.sin(w2 * i + 0.9))
  }
  return out
}

/** CRLB sanity 입력: 순음 + 백색잡음 (v2 §3 — VP 분산이 이론치 3배 이내인지 확인) */
export function pureToneWithWhiteNoise(
  freqHz: number,
  snrDb: number,
  lengthSamples: number,
  sampleRate: number,
  seed: number,
): Float32Array {
  const rng = createRng(seed)
  const out = new Float32Array(lengthSamples)
  const omega = (2 * Math.PI * freqHz) / sampleRate
  const amplitude = 1
  const sigma = Math.sqrt((amplitude * amplitude) / 2 / Math.pow(10, snrDb / 10))
  const noise = whiteNoise(lengthSamples, rng)
  const phase = 2 * Math.PI * rng()
  for (let i = 0; i < lengthSamples; i++) {
    out[i] = amplitude * Math.cos(omega * i + phase) + sigma * noise[i]!
  }
  return out
}
