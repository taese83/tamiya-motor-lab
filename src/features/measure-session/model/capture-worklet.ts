// 캡처 AudioWorkletProcessor 모듈 소스 — Blob URL로 audioWorklet.addModule에 주입한다.
//
// 인라인 소스를 쓰는 이유: Vite는 `new Worker(new URL(...))` 구문만 정적으로 워커 번들로
// 변환하고, `audioWorklet.addModule(new URL('./x.ts', ...))`의 TS 모듈은 build 산출물에서
// 변환 없이 asset으로 남아 프로덕션에서 깨진다. 처리 내용이 "128-frame 블록을 청크로
// 모아 전달"뿐인 소형 JS라 인라인 문자열이 dev/build 양쪽에서 결정적으로 동작한다.
//
// 역할: AudioWorklet 렌더 콜백(128 frames)마다 mono 입력을 누적하고, 청크가 차면
// Float32Array를 transferable로 메인 스레드에 post한다. 메인(session.ts)이 이를 그대로
// 엔진 Worker의 {type:'pcm'} 메시지로 중계한다 — 분석은 전부 Worker에서(REQ-NFR-001).

export const CAPTURE_WORKLET_NAME = 'mml-capture'

/** 청크 크기 (샘플) — 48 kHz 기준 ≈21 ms: 엔진 hop(25 ms)·표시 주기(≥10 Hz) 대비 충분히 촘촘 */
export const CAPTURE_CHUNK_SAMPLES = 1024

export const CAPTURE_WORKLET_SOURCE = `
class MmlCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = new Float32Array(${CAPTURE_CHUNK_SAMPLES})
    this.fill = 0
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (!channel) return true
    let offset = 0
    while (offset < channel.length) {
      const take = Math.min(channel.length - offset, this.buffer.length - this.fill)
      this.buffer.set(channel.subarray(offset, offset + take), this.fill)
      this.fill += take
      offset += take
      if (this.fill === this.buffer.length) {
        const chunk = this.buffer
        this.port.postMessage(chunk, [chunk.buffer])
        this.buffer = new Float32Array(${CAPTURE_CHUNK_SAMPLES})
        this.fill = 0
      }
    }
    return true
  }
}
registerProcessor('${CAPTURE_WORKLET_NAME}', MmlCaptureProcessor)
`
