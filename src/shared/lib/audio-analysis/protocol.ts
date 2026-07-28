// Worker 메시지 프로토콜 타입 (feature-plan §4 / api-schema §4.5 canonical):
// in = {pcm: Float32Array(transferable), sampleRate}, out = DisplayEstimate (≥ 10 Hz).
// 타입 정의만 존재한다 — Worker 런타임 엔트리는 캡처 소유자(F2, features/measure-session)가
// 이 계약을 소비해 구성한다 (엔진은 브라우저 전역 접근 0건, AD-12).

import type {DisplayEstimate, EngineOptions} from './types'

/** 메인 → Worker */
export type EngineWorkerRequest =
  | {type: 'configure'; options: EngineOptions}
  | {type: 'pcm'; pcm: Float32Array}
  | {type: 'reset'}

/** Worker → 메인 */
export type EngineWorkerResponse =
  | {type: 'ready'; decimatedRate: number}
  | {type: 'estimate'; estimate: DisplayEstimate}
  | {type: 'error'; message: string}
