// 전처리: 대역통과 120 Hz ~ 5 kHz (Butterworth IIR) 후 12 kHz 데시메이션 (v2 §1).
// LP 4차(비쿼드 2단, Butterworth Q) + HP 2차. 5 kHz 상한이 데시메이션 anti-alias를 겸한다
// (6·f0max = 3.72 kHz < 5 kHz < Nyquist 6 kHz).

interface BiquadCoeffs {
  b0: number
  b1: number
  b2: number
  a1: number
  a2: number
}

/** RBJ cookbook 저역통과 비쿼드 */
function designLowPass(sampleRate: number, cutoffHz: number, q: number): BiquadCoeffs {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate
  const cosW0 = Math.cos(w0)
  const alpha = Math.sin(w0) / (2 * q)
  const a0 = 1 + alpha
  return {
    b0: (1 - cosW0) / 2 / a0,
    b1: (1 - cosW0) / a0,
    b2: (1 - cosW0) / 2 / a0,
    a1: (-2 * cosW0) / a0,
    a2: (1 - alpha) / a0,
  }
}

/** RBJ cookbook 고역통과 비쿼드 */
function designHighPass(sampleRate: number, cutoffHz: number, q: number): BiquadCoeffs {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate
  const cosW0 = Math.cos(w0)
  const alpha = Math.sin(w0) / (2 * q)
  const a0 = 1 + alpha
  return {
    b0: (1 + cosW0) / 2 / a0,
    b1: -(1 + cosW0) / a0,
    b2: (1 + cosW0) / 2 / a0,
    a1: (-2 * cosW0) / a0,
    a2: (1 - alpha) / a0,
  }
}

/** Direct Form 2 Transposed — 스트리밍 상태 유지 */
class Biquad {
  private z1 = 0
  private z2 = 0
  constructor(private readonly c: BiquadCoeffs) {}

  process(x: number): number {
    const {b0, b1, b2, a1, a2} = this.c
    const y = b0 * x + this.z1
    this.z1 = b1 * x - a1 * y + this.z2
    this.z2 = b2 * x - a2 * y
    return y
  }

  reset(): void {
    this.z1 = 0
    this.z2 = 0
  }
}

export interface Preprocessor {
  readonly decimatedRate: number
  readonly decimationFactor: number
  /**
   * 캡처 rate PCM 청크를 필터링·데시메이션해 out 앞부분에 기록하고 기록 개수를 반환한다.
   * out 길이는 ceil(input.length / factor) + 1 이상이어야 한다. 청크 경계 상태는 내부 유지.
   */
  process(input: Float32Array, out: Float32Array): number
  reset(): void
}

export const BANDPASS_HIGHPASS_HZ = 120
export const BANDPASS_LOWPASS_HZ = 5000

// 4차 Butterworth 저역통과의 비쿼드 Q 분해값
const BUTTERWORTH4_Q1 = 0.5411961
const BUTTERWORTH4_Q2 = 1.30656296

export function createPreprocessor(sampleRate: number, targetDecimatedRate: number): Preprocessor {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new RangeError(`sampleRate must be positive: ${sampleRate}`)
  }
  const decimationFactor = Math.max(1, Math.round(sampleRate / targetDecimatedRate))
  const decimatedRate = sampleRate / decimationFactor
  // 실제 데시메이션 rate가 낮으면 LP 상한을 Nyquist 아래로 당긴다 (48 kHz 가정 금지, v2 §2)
  const lowPassHz = Math.min(BANDPASS_LOWPASS_HZ, 0.45 * decimatedRate)
  const stages = [
    new Biquad(designHighPass(sampleRate, BANDPASS_HIGHPASS_HZ, Math.SQRT1_2)),
    new Biquad(designLowPass(sampleRate, lowPassHz, BUTTERWORTH4_Q1)),
    new Biquad(designLowPass(sampleRate, lowPassHz, BUTTERWORTH4_Q2)),
  ]
  let phase = 0

  return {
    decimatedRate,
    decimationFactor,
    process(input, out) {
      let written = 0
      const s0 = stages[0]!
      const s1 = stages[1]!
      const s2 = stages[2]!
      for (let i = 0; i < input.length; i++) {
        const y = s2.process(s1.process(s0.process(input[i]!)))
        if (phase === 0) {
          out[written] = y
          written += 1
        }
        phase += 1
        if (phase === decimationFactor) phase = 0
      }
      return written
    },
    reset() {
      for (const stage of stages) stage.reset()
      phase = 0
    },
  }
}
