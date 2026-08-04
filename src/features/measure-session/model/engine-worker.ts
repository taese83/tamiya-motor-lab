// 분석 엔진 Worker 엔트리 (AD-11) — shared/lib/audio-analysis/protocol.ts 계약을 그대로 소비한다.
// in: EngineWorkerRequest {configure|pcm|pcm-port|reset} / out: EngineWorkerResponse {ready|estimate|error}.
// 엔진은 브라우저 전역 접근 0건(AD-12)이라 이 엔트리가 메시지 배선만 담당한다.
// configure의 sampleRate는 세션이 실제 AudioContext.sampleRate로 전달한다 — 48 kHz 가정 금지(v2 §2).
//
// PCM 유입 경로 2종:
// - 'pcm-port' 핸드오프 이후: 캡처 worklet과의 직결 MessagePort로 raw Float32Array가 직접 온다
//   (메인 스레드 미경유 — 메인 잰크가 분석 지연으로 전이되지 않는다).
// - 핸드오프 전 초기 청크·fallback: 종전 {type:'pcm'} 중계.

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
let sampleRate = 0
let directPort: MessagePort | null = null

// ─── 오디오 클록·백프레셔 (실시간 미달 기기 안전장치) ────────────────────────
// audioMs = 수신 샘플 누적 / sampleRate — estimate에 실어 세션의 연속성 판정 기준이 된다.
// backlog = (벽시계 경과 − 오디오 경과) − 관측 최솟값(전달 지연 상수분 제거). 분석이
// 실시간을 못 따라가면 큐 적체만큼 backlog가 자라므로, 한계 초과 시 엔진을 리셋하고
// 청크를 버려 따라잡는다 — 지연이 세션 내내 누적되는 최악 케이스를 차단한다.
const BACKLOG_LIMIT_MS = 1000
const BACKLOG_DRAIN_TARGET_MS = 100

let totalSamples = 0
let wallStartMs: number | null = null
let baselineLagMs = Infinity
let dropping = false

function resetClock(): void {
  totalSamples = 0
  wallStartMs = null
  baselineLagMs = Infinity
  dropping = false
}

function handlePcm(pcm: Float32Array): void {
  if (engine === null || sampleRate <= 0) return
  const now = performance.now()
  wallStartMs ??= now
  totalSamples += pcm.length
  const audioMs = (totalSamples / sampleRate) * 1000
  const lagMs = now - wallStartMs - audioMs
  if (lagMs < baselineLagMs) baselineLagMs = lagMs
  const backlogMs = lagMs - baselineLagMs
  if (dropping) {
    if (backlogMs > BACKLOG_DRAIN_TARGET_MS) return // 청크 폐기 — 큐를 빠르게 비워 따라잡는다
    dropping = false
  } else if (backlogMs > BACKLOG_LIMIT_MS) {
    // 적체 한계 초과 — 추적 상태를 접고(불연속 프레임의 오추정 방지) 배출 모드 진입
    dropping = true
    engine.reset()
    return
  }
  // hop(25 ms)마다 1건 — 청크당 0~2건. 산출 즉시 전달해 표시 ≥10 Hz를 유지한다.
  for (const estimate of engine.process(pcm)) {
    scope.postMessage({type: 'estimate', estimate, audioMs})
  }
}

scope.onmessage = event => {
  const message = event.data
  switch (message.type) {
    case 'configure':
      try {
        engine = createAnalysisEngine(message.options)
        sampleRate = message.options.sampleRate
        resetClock()
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
      handlePcm(message.pcm)
      break
    case 'pcm-port':
      // 직결 포트 핸드오프 — 이후 PCM은 이 포트로 raw Float32Array가 직접 흐른다
      directPort?.close()
      directPort = message.port
      directPort.onmessage = (portEvent: MessageEvent<Float32Array>) => {
        handlePcm(portEvent.data)
      }
      break
    case 'reset':
      // suspended → resume 재개 시 stale 추적 상태(Viterbi 격자·안정 창) 폐기.
      // 오디오 클록도 함께 리셋 — 중단 동안 벽시계만 흘러 backlog가 오탐되는 것을 막고,
      // audioMs가 0부터 다시 시작함을 세션(측정 타이머 리셋)과 약속한다.
      engine?.reset()
      resetClock()
      break
  }
}
