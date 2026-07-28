// radix-2 반복형 FFT — 외부 의존성 없이 직접 구현 (v2 §5).
// 성능 예산(v2 §4): twiddle/bit-reversal 테이블과 작업 버퍼를 plan 생성 시 1회 할당하고 재사용한다.

export function nextPow2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

export class FftPlan {
  readonly size: number
  private readonly cosTable: Float64Array
  private readonly sinTable: Float64Array
  private readonly reverse: Uint32Array

  constructor(size: number) {
    if (size < 2 || (size & (size - 1)) !== 0) {
      throw new RangeError(`FFT size must be a power of two >= 2: ${size}`)
    }
    this.size = size
    const half = size / 2
    this.cosTable = new Float64Array(half)
    this.sinTable = new Float64Array(half)
    for (let i = 0; i < half; i++) {
      const angle = (-2 * Math.PI * i) / size
      this.cosTable[i] = Math.cos(angle)
      this.sinTable[i] = Math.sin(angle)
    }
    this.reverse = new Uint32Array(size)
    const bits = Math.log2(size)
    for (let i = 0; i < size; i++) {
      let r = 0
      for (let b = 0; b < bits; b++) r |= ((i >>> b) & 1) << (bits - 1 - b)
      this.reverse[i] = r >>> 0
    }
  }

  /** in-place 복소 FFT — re/im 길이는 size와 같아야 한다 */
  transform(re: Float64Array, im: Float64Array): void {
    const n = this.size
    const rev = this.reverse
    for (let i = 0; i < n; i++) {
      const j = rev[i]!
      if (j > i) {
        const tr = re[i]!
        re[i] = re[j]!
        re[j] = tr
        const ti = im[i]!
        im[i] = im[j]!
        im[j] = ti
      }
    }
    for (let len = 2; len <= n; len *= 2) {
      const half = len / 2
      const step = n / len
      for (let start = 0; start < n; start += len) {
        for (let i = 0; i < half; i++) {
          const twiddle = i * step
          const wr = this.cosTable[twiddle]!
          const wi = this.sinTable[twiddle]!
          const even = start + i
          const odd = even + half
          const or_ = re[odd]!
          const oi = im[odd]!
          const tr = or_ * wr - oi * wi
          const ti = or_ * wi + oi * wr
          re[odd] = re[even]! - tr
          im[odd] = im[even]! - ti
          re[even] = re[even]! + tr
          im[even] = im[even]! + ti
        }
      }
    }
  }
}
