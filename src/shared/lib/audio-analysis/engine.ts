// 스트리밍 엔진 조립: 전처리(대역통과+데시메이션) → 200 ms 프레임/25 ms hop 프레이밍 →
// 프레임 분석 → 추적 (v2 §1). Float32Array in → DisplayEstimate out — DOM·브라우저 API 무접근.
// 실제 캡처 sampleRate를 옵션으로 받으며 48 kHz를 가정하지 않는다 (v2 §2).

import {createFrameAnalyzer} from './analyze-frame'
import {createPreprocessor} from './preprocess'
import {createTracker} from './track'
import {resolveEngineOptions} from './types'
import type {DisplayEstimate, EngineOptions} from './types'

export interface AnalysisEngine {
  readonly sampleRate: number
  readonly decimatedRate: number
  /** 프레임 길이 (데시메이션 후 샘플 수) */
  readonly frameLength: number
  /** hop 길이 (데시메이션 후 샘플 수) */
  readonly hopLength: number
  /**
   * 캡처 PCM 청크를 밀어 넣고, 완성된 hop마다 1건씩 산출된 추정치를 반환한다.
   * 첫 추정치는 첫 프레임(기본 0.2 s)이 채워진 뒤 나온다.
   */
  process(pcm: Float32Array): DisplayEstimate[]
  reset(): void
}

export function createAnalysisEngine(options: EngineOptions): AnalysisEngine {
  const resolved = resolveEngineOptions(options)
  const preprocessor = createPreprocessor(resolved.sampleRate, resolved.targetDecimatedRate)
  const decimatedRate = preprocessor.decimatedRate
  const analyzer = createFrameAnalyzer(decimatedRate, resolved)
  const frameLength = analyzer.frameLength
  const hopLength = Math.max(1, Math.round(resolved.hopSeconds * decimatedRate))
  const tracker = createTracker(resolved, hopLength / decimatedRate)

  // 버퍼 재사용 (v2 §4 성능 예산): 프레임·데시메이션 scratch는 상주, 누적 버퍼는 필요 시 grow
  let buffer = new Float32Array(frameLength * 4)
  let bufferFill = 0
  let scratch = new Float32Array(4096)
  const frame = new Float32Array(frameLength)

  return {
    sampleRate: resolved.sampleRate,
    decimatedRate,
    frameLength,
    hopLength,
    process(pcm) {
      const needed = Math.ceil(pcm.length / preprocessor.decimationFactor) + 2
      if (scratch.length < needed) scratch = new Float32Array(needed)
      const written = preprocessor.process(pcm, scratch)
      if (bufferFill + written > buffer.length) {
        const grown = new Float32Array(Math.max(buffer.length * 2, bufferFill + written))
        grown.set(buffer.subarray(0, bufferFill))
        buffer = grown
      }
      buffer.set(scratch.subarray(0, written), bufferFill)
      bufferFill += written

      const estimates: DisplayEstimate[] = []
      while (bufferFill >= frameLength) {
        frame.set(buffer.subarray(0, frameLength))
        // R54: 추적 중 f0를 hint로 되먹인다 — 전 후보 엄격 게이트 기각 시 hint 부근 후보를
        // 완화 임계(추적 유지 게이트)로 승인해 track 연속성을 지킨다 (analyze-frame 참조)
        estimates.push(tracker.push(analyzer.analyze(frame, tracker.currentF0())))
        buffer.copyWithin(0, hopLength, bufferFill)
        bufferFill -= hopLength
      }
      return estimates
    },
    reset() {
      preprocessor.reset()
      tracker.reset()
      bufferFill = 0
    },
  }
}
