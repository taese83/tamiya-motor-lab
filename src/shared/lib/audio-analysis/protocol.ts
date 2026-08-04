// Worker 메시지 프로토콜 타입 (feature-plan §4 / api-schema §4.5 canonical):
// in = {pcm: Float32Array(transferable), sampleRate}, out = DisplayEstimate (≥ 10 Hz).
// 타입 정의만 존재한다 — Worker 런타임 엔트리는 캡처 소유자(F2, features/measure-session)가
// 이 계약을 소비해 구성한다 (엔진은 브라우저 전역 접근 0건, AD-12).

import type {DisplayEstimate, EngineOptions} from './types'

/** 메인 → Worker */
export type EngineWorkerRequest =
  | {type: 'configure'; options: EngineOptions}
  | {type: 'pcm'; pcm: Float32Array}
  /**
   * 캡처 worklet과의 직결 포트 핸드오프 — 이후 PCM은 이 포트로 raw Float32Array가 직접
   * 흐른다(메인 스레드 미경유). 포트 도착 전 초기 청크는 종전 {type:'pcm'} 중계로 온다.
   */
  | {type: 'pcm-port'; port: MessagePort}
  | {type: 'reset'}

/** Worker → 메인 */
export type EngineWorkerResponse =
  | {type: 'ready'; decimatedRate: number}
  /**
   * audioMs: 이 추정이 소비한 캡처 스트림의 누적 오디오 시간(ms) — 수신 샘플 수 / sampleRate.
   * 세션의 연속성(gap)·측정 지속시간 판정은 메시지 도착 시각(Date.now)이 아니라 이 값을 쓴다 —
   * 메인 스레드 잰크·스로틀이 판정을 흔들지 못하게 하는 계약. 'reset' 시 0으로 되돌아간다.
   */
  | {type: 'estimate'; estimate: DisplayEstimate; audioMs: number}
  | {type: 'error'; message: string}
