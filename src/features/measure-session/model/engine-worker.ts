// 분석 엔진 Worker 엔트리 (AD-11) — shared/lib/audio-analysis/protocol.ts 계약을 그대로 소비한다.
// in: EngineWorkerRequest {configure|pcm|reset} / out: EngineWorkerResponse {ready|estimate|error}.
// 엔진은 브라우저 전역 접근 0건(AD-12)이라 이 엔트리가 메시지 배선만 담당한다.
// configure의 sampleRate는 세션이 실제 AudioContext.sampleRate로 전달한다 — 48 kHz 가정 금지(v2 §2).

import {createAnalysisEngine} from '@shared/lib/audio-analysis'

import type {
  AnalysisEngine,
  EngineWorkerRequest,
  EngineWorkerResponse,
} from '@shared/lib/audio-analysis'

// DedicatedWorkerGlobalScope 타입은 DOM lib와 충돌(webworker lib 중복 전역)하므로
// 이 엔트리가 실제로 쓰는 표면만 좁혀 선언한다.
interface EngineWorkerScope {
  onmessage: ((event: MessageEvent<EngineWorkerRequest>) => void) | null
  postMessage(message: EngineWorkerResponse): void
}

const scope = self as unknown as EngineWorkerScope

let engine: AnalysisEngine | null = null

scope.onmessage = event => {
  const message = event.data
  switch (message.type) {
    case 'configure':
      try {
        engine = createAnalysisEngine(message.options)
        scope.postMessage({type: 'ready', decimatedRate: engine.decimatedRate})
      } catch (error) {
        engine = null
        scope.postMessage({
          type: 'error',
          message: error instanceof Error ? error.message : String(error),
        })
      }
      break
    case 'pcm':
      if (engine !== null) {
        // hop(25 ms)마다 1건 — 청크당 0~2건. 산출 즉시 전달해 표시 ≥10 Hz를 유지한다.
        for (const estimate of engine.process(message.pcm)) {
          scope.postMessage({type: 'estimate', estimate})
        }
      }
      break
    case 'reset':
      // suspended → resume 재개 시 stale 추적 상태(Viterbi 격자·안정 창) 폐기
      engine?.reset()
      break
  }
}
