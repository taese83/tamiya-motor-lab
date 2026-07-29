// F2 측정 세션 상태 머신 v2 — 순수 전이 가드·매핑 계층 (unit 테스트 대상, REQ-ST-002/003/004).
// 브라우저 API·store 접근 0건: getUserMedia/AudioContext/Worker 부수효과는 session.ts가 소유하고,
// 이 모듈은 스냅샷 → MeasureView 매핑과 판정 함수만 제공한다 (component-spec §2.1 "가드는 순수 함수로 분리").
//
// v1 대비 (state-contract v2 M-1~3):
// - stable phase·확정 잠금 폐지 — 연속 측정. 엔진 stable 판정은 frame.isStable 신호로만 접힌다.
// - idle은 자동 시작 전 과도 상태 — view로는 starting에 흡수된다 (수동 대기 화면 없음, M-2).
// - awaiting-gesture 신설 — 자동 시작이 제스처 부재로 거부된 iOS fallback (오류 아님, M-1).
// - insecure는 phase가 아니라 secureContext 필드의 최우선 투영 — 권한 문구와 혼용 금지(D-4).

import type {DisplayEstimate} from '@shared/lib/audio-analysis'

import type {MeasureView} from './view'

/**
 * 세션 내부 phase — MeasureView status와 1:1이 아니다.
 * idle: 자동 시작 트리거 전(마운트 직후·hidden 종료 후) — view는 starting
 * starting: getUserMedia·파이프라인 준비 중 — view는 starting
 * running: 캡처 활성 — view status는 최신 엔진 frame(measuring/weak-signal)이 결정
 * awaiting-gesture: 자동 시작이 제스처 부재로 실패 — [탭하여 시작] 1탭 경로(M-1)
 */
export type SessionPhase =
  | 'idle'
  | 'starting'
  | 'running'
  | 'awaiting-gesture'
  | 'no-permission'
  | 'suspended'

/**
 * no-permission의 원인 분류 (SC-A5) — status enum 확장 금지 계약에 따라
 * 장치 오류(NotFoundError/NotReadableError)도 status는 no-permission으로 수렴하고
 * cause로만 구분한다. MeasureView(ui 계약)에는 cause 필드가 없어 세션 상태로만 유지된다.
 */
export type NoPermissionCause = 'denied' | 'device-error'

/**
 * running 중 최신 엔진 프레임의 view 투영 — weak-signal이면 수치 없음 (INV-13 타입 강제).
 * isStable: 엔진 DisplayEstimate.status==='stable'(1.5s CV 판정)의 접힘 — UI 상태가 아니라
 * 내부 신호(M-3). 렌더 분기·수치 잠금·announce 사용 금지, 소비처는 RV-1 자동 확정 트리거뿐.
 */
export type EngineFrameView =
  | {kind: 'measuring'; rpm: number; panoHz: number; isStable: boolean}
  | {kind: 'weak-signal'}

export interface MachineSnapshot {
  readonly phase: SessionPhase
  readonly secureContext: boolean
  /** running 중 최신 엔진 산출 — null이면 아직 첫 추정 전(준비 중 표시 유지) */
  readonly frame: EngineFrameView | null
  readonly cause: NoPermissionCause
  readonly permanent: boolean
  readonly settingsHelpOpen: boolean
}

export function createIdleSnapshot(secureContext: boolean): MachineSnapshot {
  return {
    phase: 'idle',
    secureContext,
    frame: null,
    cause: 'denied',
    permanent: false,
    settingsHelpOpen: false,
  }
}

/** startCapture 진입 가드 — idle(자동 시작)·awaiting-gesture([탭하여 시작])에서만 (M-1/M-2) */
export function canStartCapture(phase: SessionPhase): boolean {
  return phase === 'idle' || phase === 'awaiting-gesture'
}

/**
 * 스냅샷 → MeasureView 단일 매핑 (두 원천 병합 지점).
 * - !secureContext 최우선: 어떤 phase든 insecure — HTTPS 안내 전용, 권한 문구 혼용 금지(D-4).
 * - idle|starting: 자동 시작 전·준비 중 모두 starting — 수동 대기 화면 없음(M-2).
 * - running + frame null: 첫 추정 전 — starting 유지. measuring view는 수치가 필수 필드라
 *   0·placeholder 수치를 만들 수 없다 (0 RPM·이전 값 노출 금지, REQ-ST-003).
 */
export function toMeasureView(snapshot: MachineSnapshot): MeasureView {
  if (!snapshot.secureContext) return {status: 'insecure'}
  switch (snapshot.phase) {
    case 'idle':
    case 'starting':
      return {status: 'starting'}
    case 'running':
      if (snapshot.frame === null) return {status: 'starting'}
      return snapshot.frame.kind === 'measuring'
        ? {
            status: 'measuring',
            rpm: snapshot.frame.rpm,
            panoHz: snapshot.frame.panoHz,
            isStable: snapshot.frame.isStable,
          }
        : {status: 'weak-signal'}
    case 'awaiting-gesture':
      return {status: 'awaiting-gesture'}
    case 'no-permission':
      return {
        status: 'no-permission',
        permanent: snapshot.permanent,
        settingsHelpOpen: snapshot.settingsHelpOpen,
      }
    case 'suspended':
      return {status: 'suspended'}
  }
}

/**
 * 엔진 DisplayEstimate → running frame 투영.
 * status==='stable'은 별도 view 상태가 아니라 measuring + isStable=true로 접는다(M-3) —
 * 엔진의 1.5s CV 안정 판정을 그대로 신호화하고 세션은 재판정하지 않는다.
 * 수치가 null이면 weak-signal로 강등 — INV-13(weak-signal ⇒ 수치 null)의 역방향 방어로,
 * 어떤 경로로도 null 수치가 measuring view에 실리지 않는다.
 */
export function toEngineFrame(estimate: DisplayEstimate): EngineFrameView {
  if (
    (estimate.status === 'measuring' || estimate.status === 'stable') &&
    estimate.f0 !== null &&
    estimate.rpm !== null
  ) {
    return {
      kind: 'measuring',
      rpm: estimate.rpm,
      panoHz: estimate.f0,
      isStable: estimate.status === 'stable',
    }
  }
  return {kind: 'weak-signal'}
}

/**
 * getUserMedia 실패 분류 (SC-A5):
 * NotAllowedError/SecurityError = 권한 거부(denied), 그 외(NotFoundError/NotReadableError/
 * OverconstrainedError 등) = 장치 오류(device-error) — 둘 다 status는 no-permission.
 */
export function classifyCaptureError(error: unknown): NoPermissionCause {
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? (error as {name?: unknown}).name
      : undefined
  return name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'device-error'
}

/** CD-A3: 요청이 OS 프롬프트 없이 즉시 실패했다고 보는 임계 (ms) — 상수 1곳 */
export const INSTANT_DENIAL_MS = 300

export interface DenialContext {
  /** Permissions API 판독 결과 — null이면 API 미가용 (iOS Safari fallback 경로) */
  readonly permissionState: PermissionState | null
  /** 이번 거부를 포함한 세션 내 누적 거부 횟수 (비영속 — INV-17) */
  readonly denialCount: number
  /** retryPermission 경유 여부 (첫 startCapture 거부는 항상 일시) */
  readonly isRetry: boolean
  /** getUserMedia 호출 → 거부까지 경과 (ms) */
  readonly elapsedMs: number
}

/**
 * F-2 권한 일시/영구 판정 (state-contract F-2 + CD-A3):
 * ① Permissions API 가용: state==='denied'만 영구.
 * ② 미가용 fallback: 세션 내 누적 거부 ≥2회 승격, 또는 재요청이 300ms 미만 즉시 실패 시 승격.
 * 승격은 안내 강도 조정일 뿐 — [권한 다시 요청] 재시도 경로는 유지된다(오판 복구 가능).
 */
export function resolveDenialPermanence(context: DenialContext): boolean {
  if (context.permissionState === 'denied') return true
  if (context.permissionState !== null) return false
  if (context.denialCount >= 2) return true
  return context.isRetry && context.elapsedMs < INSTANT_DENIAL_MS
}

export interface StartFailureContext extends DenialContext {
  /** 사용자 제스처 체인 내 시도 여부 — false면 자동 시작(M-1) */
  readonly gesture: boolean
}

export type StartFailureResolution =
  | {readonly kind: 'awaiting-gesture'}
  | {readonly kind: 'no-permission'; readonly permanent: boolean}

/**
 * getUserMedia 권한 거부의 도착 상태 판정 (M-1 자동 시작 분기).
 * - 제스처 시도: 프롬프트/판정을 실제로 거친 거부 — 항상 no-permission,
 *   일시/영구는 기존 resolveDenialPermanence 승계.
 * - 자동 시도(제스처 부재):
 *   · permissionState granted|prompt — 권한이 죽지 않았는데 실패 = 제스처 요건으로 해석,
 *     awaiting-gesture (오류 표현 금지, [탭하여 시작] 1탭 경로).
 *   · denied — API가 영구 거부를 확정, no-permission permanent.
 *   · API 미가용 + <INSTANT_DENIAL_MS 즉시 실패 — 프롬프트 없이 튕김 = 제스처 요건 추정,
 *     awaiting-gesture. 지연 실패는 사용자가 프롬프트를 보고 거부한 것 — no-permission.
 * awaiting-gesture 판정은 거부가 아니므로 denialCount에 계상하지 않는다 (호출측 계약).
 */
export function resolveStartFailure(context: StartFailureContext): StartFailureResolution {
  if (context.gesture) {
    return {kind: 'no-permission', permanent: resolveDenialPermanence(context)}
  }
  if (context.permissionState === 'granted' || context.permissionState === 'prompt') {
    return {kind: 'awaiting-gesture'}
  }
  if (context.permissionState === 'denied') {
    return {kind: 'no-permission', permanent: true}
  }
  if (context.elapsedMs < INSTANT_DENIAL_MS) {
    return {kind: 'awaiting-gesture'}
  }
  return {kind: 'no-permission', permanent: resolveDenialPermanence(context)}
}
