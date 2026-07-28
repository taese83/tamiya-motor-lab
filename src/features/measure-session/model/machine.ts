// F2 측정 세션 상태 머신 — 순수 전이 가드·매핑 계층 (unit 테스트 대상, REQ-ST-002/003/004).
// 브라우저 API·store 접근 0건: getUserMedia/AudioContext/Worker 부수효과는 session.ts가 소유하고,
// 이 모듈은 스냅샷 → MeasureView 매핑과 판정 함수만 제공한다 (component-spec §2.1 "가드는 순수 함수로 분리").
//
// status 6종 원천 분리 (state-contract §측정 세션 commands):
//   - 엔진 산출 3종 measuring·stable·weak-signal — Worker의 DisplayEstimate(track)가 결정
//   - 세션 소유 3종 idle·no-permission·suspended — 이 머신(phase)이 결정

import {F0_RANGE} from '@shared/config/domain'

import type {DisplayEstimate} from '@shared/lib/audio-analysis'

import type {MeasureView} from './view'

/**
 * 세션 내부 phase — MeasureView status와 1:1이 아니다.
 * activating: getUserMedia·파이프라인 준비 중 (view는 idle+activating — <1s, component-spec §2.2)
 * capturing: 캡처 활성 — view status는 최신 엔진 frame(measuring/weak-signal)이 결정
 */
export type SessionPhase =
  | 'idle'
  | 'activating'
  | 'capturing'
  | 'stable'
  | 'no-permission'
  | 'suspended'

/**
 * no-permission의 원인 분류 (SC-A5) — status enum 확장 금지 계약에 따라
 * 장치 오류(NotFoundError/NotReadableError)도 status는 no-permission으로 수렴하고
 * cause로만 구분한다. MeasureView(ui 계약)에는 cause 필드가 없어 세션 상태로만 유지된다.
 */
export type NoPermissionCause = 'denied' | 'device-error'

/** capturing 중 최신 엔진 프레임의 view 투영 — weak-signal이면 수치 없음 (INV-13 타입 강제) */
export type EngineFrameView =
  | {kind: 'measuring'; rpm: number; panoHz: number}
  | {kind: 'weak-signal'}

export interface MachineSnapshot {
  readonly phase: SessionPhase
  readonly secureContext: boolean
  /** capturing 중 최신 엔진 산출 — null이면 아직 첫 추정 전(준비 중 표시 유지) */
  readonly frame: EngineFrameView | null
  /** stable 확정 잠금 수치 — phase==='stable'일 때만 의미 (이후 불변) */
  readonly stableFigures: {readonly rpm: number; readonly panoHz: number} | null
  readonly cause: NoPermissionCause
  readonly permanent: boolean
  readonly settingsHelpOpen: boolean
}

export function createIdleSnapshot(secureContext: boolean): MachineSnapshot {
  return {
    phase: 'idle',
    secureContext,
    frame: null,
    stableFigures: null,
    cause: 'denied',
    permanent: false,
    settingsHelpOpen: false,
  }
}

/** startCapture 진입 가드 — idle(첫 세션)·stable([다시 측정])에서만 (state-contract F2 표) */
export function canStartCapture(phase: SessionPhase): boolean {
  return phase === 'idle' || phase === 'stable'
}

/**
 * 스냅샷 → MeasureView 단일 매핑 (두 원천 병합 지점).
 * - capturing + frame null: 첫 추정 전 — idle(activating) 유지. measuring view는 수치가
 *   필수 필드라 0·placeholder 수치를 만들 수 없다 (0 RPM·이전 값 노출 금지, REQ-ST-003).
 * - stable + stableFigures null: 계약상 도달 불가 — 방어적으로 idle을 반환한다.
 */
export function toMeasureView(snapshot: MachineSnapshot): MeasureView {
  switch (snapshot.phase) {
    case 'idle':
      return {status: 'idle', secureContext: snapshot.secureContext, activating: false}
    case 'activating':
      return {status: 'idle', secureContext: true, activating: true}
    case 'capturing':
      if (snapshot.frame === null) return {status: 'idle', secureContext: true, activating: true}
      return snapshot.frame.kind === 'measuring'
        ? {status: 'measuring', rpm: snapshot.frame.rpm, panoHz: snapshot.frame.panoHz}
        : {status: 'weak-signal'}
    case 'stable':
      return snapshot.stableFigures
        ? {status: 'stable', rpm: snapshot.stableFigures.rpm, panoHz: snapshot.stableFigures.panoHz}
        : {status: 'idle', secureContext: snapshot.secureContext, activating: false}
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
 * 엔진 DisplayEstimate → capturing frame 투영.
 * measuring인데 수치가 null이면 weak-signal로 강등 — INV-13(weak-signal ⇒ 수치 null)의
 * 역방향 방어로, 어떤 경로로도 null 수치가 measuring view에 실리지 않는다.
 */
export function toEngineFrame(estimate: DisplayEstimate): EngineFrameView {
  if (estimate.status === 'measuring' && estimate.f0 !== null && estimate.rpm !== null) {
    return {kind: 'measuring', rpm: estimate.rpm, panoHz: estimate.f0}
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

/** CD-A3: 재요청이 OS 프롬프트 없이 즉시 실패했다고 보는 임계 (ms) — 상수 1곳 */
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

/**
 * stable 확정값 반올림 (AS-3·CP-2): panoHz = f0 소수 1자리 반올림, rpm = round(panoHz×60).
 * F0_RANGE clamp는 방어적 — 엔진이 탐색 대역(170~620 Hz)을 보장하지만, 반올림 후에도
 * measurementSchema(write-strict)를 반드시 통과하도록 경계를 고정한다.
 */
export function roundStableEstimate(f0: number): {panoHz: number; rpm: number} {
  const clamped = Math.min(Math.max(f0, F0_RANGE.min), F0_RANGE.max)
  const panoHz = Math.round(clamped * 10) / 10
  return {panoHz, rpm: Math.round(panoHz * 60)}
}

/** confidence 0~1 클램프 — 엔진 산출 방어 (measurementSchema min/max 정합) */
export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 1)
}
