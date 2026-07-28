// F2 측정 세션 command 계층 (api-schema §4.5 / state-contract §측정 세션 commands) —
// getUserMedia·AudioContext·AudioWorklet·엔진 Worker 수명을 소유하는 유일한 모듈.
//
// - startCapture/retryPermission/resumeAudio는 반드시 사용자 탭 핸들러 내에서 호출된다
//   (iOS 제스처 요건 D-1 — resume()이 제스처 체인 안에서 실행되도록 이 모듈이 순서를 보장).
// - capture-* 오류는 Result로 반환하되 상태 머신이 MeasureStatus로 소비한다 —
//   전역 오류 UI·query 캐시로 보내지 않는다 (api-schema §채널 규약).
// - 고빈도 프레임·권한 감지 상태(cause·denialCount)는 전부 이 모듈의 세션 로컬(비영속) —
//   INV-15/INV-17. 새로고침 시 idle로 초기화되고 영구 거부 여부를 저장하지 않는다.

import {clearConfirmedMeasurement, setConfirmedMeasurement} from '@entities/measurement'

import {DOMAIN_ERROR_MESSAGES, DomainError} from '@shared/lib/errors'
import {err, ok} from '@shared/lib/result'

import {CAPTURE_WORKLET_NAME, CAPTURE_WORKLET_SOURCE} from './capture-worklet'
import {
  canStartCapture,
  clampConfidence,
  classifyCaptureError,
  createIdleSnapshot,
  resolveDenialPermanence,
  roundStableEstimate,
  toEngineFrame,
} from './machine'
import {publishSnapshot} from './store'

import type {
  DisplayEstimate,
  EngineWorkerRequest,
  EngineWorkerResponse,
} from '@shared/lib/audio-analysis'
import type {DomainErrorCode} from '@shared/lib/errors'
import type {Result} from '@shared/lib/result'
import type {MachineSnapshot} from './machine'

/** startCapture 성공 반환 계약 (api-schema §4.5 types.ts 참고 형태) */
export interface CaptureSession {
  /** 실제 AudioContext.sampleRate — 엔진 configure에 그대로 전달된 값 (48 kHz 가정 금지) */
  sampleRate: number
  stop(): void
}

// ─── 세션 로컬 상태 (비영속 — 페이지 수명) ───────────────────────────────────

interface ActiveResources {
  stream: MediaStream
  ctx: AudioContext
  source: MediaStreamAudioSourceNode | null
  workletNode: AudioWorkletNode | null
  worker: Worker | null
}

let machine: MachineSnapshot = createIdleSnapshot(globalThis.isSecureContext === true)
let active: ActiveResources | null = null
/** getUserMedia 진행 중 가드 — 재요청 더블 탭의 동시 프롬프트 방지 (H-4 상응) */
let acquiring = false
/** 세션 내 누적 거부 횟수 (F-2 fallback ≥2회 승격) — INV-17 비영속 */
let denialCount = 0
/** no-permission 중 granted 전환 감지 구독 (Permissions API 가용 시 — F-2 ①) */
let permissionWatcher: PermissionStatus | null = null

function commit(next: MachineSnapshot): void {
  machine = next
  publishSnapshot(next)
}

function captureError(code: DomainErrorCode, cause?: unknown): DomainError {
  return cause === undefined
    ? new DomainError(code, DOMAIN_ERROR_MESSAGES[code])
    : new DomainError(code, DOMAIN_ERROR_MESSAGES[code], {cause})
}

const CAPTURE_CONSTRAINTS: MediaStreamConstraints = {
  // DSP off + mono — 모터 고주파 배음 보존 (REQ-F-001 캡처 계약)
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
  },
  video: false,
}

// ─── 공개 command 4건 + settingsHelp 토글 ────────────────────────────────────

/**
 * startCapture — status ∈ {idle, stable} 가드 · isSecureContext 사전 차단(REQ-ST-002) ·
 * slot clear(INV-14 ②) 후 getUserMedia(DSP-off·mono) + resume() + 엔진 파이프라인 구동.
 * 성공 시 capturing(첫 추정 전까지 view는 activating 유지 — 0 RPM·이전 값 노출 금지).
 */
export async function startCapture(): Promise<Result<CaptureSession>> {
  if (acquiring || !canStartCapture(machine.phase)) {
    return err(captureError('validation'))
  }
  if (globalThis.isSecureContext !== true) {
    // D-4: 진입 자체 차단 — 권한 오류(no-permission)와 혼용 금지, idle 유지
    commit(createIdleSnapshot(false))
    return err(captureError('capture-insecure-context'))
  }
  // INV-14 ②: 새 세션 시작 = 확정 slot clear ([다시 측정] 경로 포함)
  clearConfirmedMeasurement()
  unwatchPermissionRecovery()
  commit({...machine, phase: 'activating', frame: null, stableFigures: null, secureContext: true})
  return await acquireCapture(false)
}

/**
 * stopCapture — 트랙·Worker·AudioContext 정리 후 idle. 실패 없음(멱등).
 * 호출처: [측정 중지] · 라우트 이탈 · visibilitychange hidden(UX-A2 — 이 모듈이 자체 배선).
 * slot은 건드리지 않는다 — stable 확정분 유지, 비-CTA 이탈 clear(INV-14 ③)는 page 소유.
 */
export function stopCapture(): void {
  teardownResources()
  unwatchPermissionRecovery()
  commit({
    ...machine,
    phase: 'idle',
    frame: null,
    stableFigures: null,
    settingsHelpOpen: false,
    secureContext: globalThis.isSecureContext === true,
  })
}

/**
 * retryPermission — no-permission에서 getUserMedia 재시도 (제스처 내).
 * 거부 시 denialCount+1, 세션 내 누적 ≥2회 또는 <300ms 즉시 실패면 permanent 승격(F-2/CD-A3).
 * permanent 승격 후에도 호출을 막지 않는다 — 오판 시 사용자가 재시도로 복구 가능(CD-A3).
 */
export async function retryPermission(): Promise<Result<void>> {
  if (acquiring || machine.phase !== 'no-permission') {
    return err(captureError('validation'))
  }
  unwatchPermissionRecovery()
  const result = await acquireCapture(true)
  return result.ok ? ok(undefined) : err(result.error)
}

/**
 * resumeAudio — suspended에서 ctx.resume() (제스처 내). running 확인 후에만 측정 재개(D-5) —
 * 아니면 suspended 유지 + capture-suspended 반환(버튼 유지 — 복구 버튼 상시 원칙).
 * 재개 시 엔진 reset — 중단 전 stale 추적 상태로 수치를 이어붙이지 않는다.
 */
export async function resumeAudio(): Promise<Result<void>> {
  const resources = active
  if (machine.phase !== 'suspended' || resources === null) {
    return err(captureError('validation'))
  }
  try {
    await resources.ctx.resume()
  } catch {
    // 아래 state 검사로 수렴 — suspended 유지
  }
  if (resources.ctx.state !== 'running') {
    return err(captureError('capture-suspended'))
  }
  try {
    await ensurePipeline(resources)
  } catch (error) {
    teardownResources()
    commit({
      ...machine,
      phase: 'no-permission',
      cause: 'device-error',
      permanent: false,
      settingsHelpOpen: false,
    })
    return err(captureError('capture-device-error', error))
  }
  if (resources.worker !== null) {
    postToWorker(resources.worker, {type: 'reset'})
  }
  commit({...machine, phase: 'capturing', frame: null})
  return ok(undefined)
}

/** no-permission(영구) [설정 방법 보기] 토글 — view.settingsHelpOpen (component-spec §2.2) */
export function toggleSettingsHelp(): void {
  if (machine.phase !== 'no-permission') return
  commit({...machine, settingsHelpOpen: !machine.settingsHelpOpen})
}

// ─── 캡처 획득·파이프라인 ────────────────────────────────────────────────────

async function acquireCapture(isRetry: boolean): Promise<Result<CaptureSession>> {
  acquiring = true
  try {
    const requestedAt = performance.now()
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia(CAPTURE_CONSTRAINTS)
    } catch (error) {
      return await handleCaptureFailure(error, isRetry, performance.now() - requestedAt)
    }

    const ctx = new AudioContext()
    active = {stream, ctx, source: null, workletNode: null, worker: null}
    ctx.addEventListener('statechange', handleStateChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    try {
      // 제스처 체인 내 resume (iOS D-1) — 실패해도 아래 state 검사가 판정
      await ctx.resume()
    } catch {
      // suspended 판정으로 수렴
    }
    if (ctx.state !== 'running') {
      // D-5 가드: running이 아니면 측정을 시작하지 않는다 — 자원은 유지, resumeAudio가 잇는다
      commit({...machine, phase: 'suspended', frame: null})
      return err(captureError('capture-suspended'))
    }

    try {
      await ensurePipeline(active)
    } catch (error) {
      teardownResources()
      commit({
        ...machine,
        phase: 'no-permission',
        cause: 'device-error',
        permanent: false,
        settingsHelpOpen: false,
      })
      return err(captureError('capture-device-error', error))
    }

    commit({...machine, phase: 'capturing', frame: null})
    return ok({sampleRate: ctx.sampleRate, stop: stopCapture})
  } finally {
    acquiring = false
  }
}

async function handleCaptureFailure(
  error: unknown,
  isRetry: boolean,
  elapsedMs: number,
): Promise<Result<never>> {
  const cause = classifyCaptureError(error)
  if (cause === 'device-error') {
    // SC-A5: NotFoundError/NotReadableError 등 — status는 no-permission, cause로만 구분
    commit({
      ...machine,
      phase: 'no-permission',
      cause,
      permanent: false,
      settingsHelpOpen: false,
    })
    return err(captureError('capture-device-error', error))
  }
  denialCount += 1
  const permissionState = await queryMicrophonePermissionState()
  const permanent = resolveDenialPermanence({permissionState, denialCount, isRetry, elapsedMs})
  commit({...machine, phase: 'no-permission', cause, permanent, settingsHelpOpen: false})
  watchPermissionRecovery()
  const code: DomainErrorCode = permanent
    ? 'capture-permission-denied-permanent'
    : 'capture-permission-denied'
  return err(captureError(code, error))
}

/** 캡처 그래프·엔진 Worker 구성 — 이미 구성돼 있으면(중단 후 재개) no-op */
async function ensurePipeline(resources: ActiveResources): Promise<void> {
  if (resources.worker !== null) return

  const workletUrl = URL.createObjectURL(
    new Blob([CAPTURE_WORKLET_SOURCE], {type: 'application/javascript'}),
  )
  try {
    await resources.ctx.audioWorklet.addModule(workletUrl)
  } finally {
    URL.revokeObjectURL(workletUrl)
  }

  // AD-11: 엔진 Worker — Vite 네이티브 워커 번들 구문
  const worker = new Worker(new URL('./engine-worker.ts', import.meta.url), {type: 'module'})
  worker.onmessage = (event: MessageEvent<EngineWorkerResponse>) => {
    handleWorkerMessage(event.data)
  }
  // 실제 sampleRate로 엔진 초기화 (48 kHz 가정 금지) — 메시지 순서 보장으로 pcm보다 선행
  postToWorker(worker, {type: 'configure', options: {sampleRate: resources.ctx.sampleRate}})

  const source = resources.ctx.createMediaStreamSource(resources.stream)
  const workletNode = new AudioWorkletNode(resources.ctx, CAPTURE_WORKLET_NAME, {
    numberOfInputs: 1,
    numberOfOutputs: 0,
    channelCount: 1,
  })
  workletNode.port.onmessage = (event: MessageEvent<Float32Array<ArrayBuffer>>) => {
    const pcm = event.data
    worker.postMessage({type: 'pcm', pcm} satisfies EngineWorkerRequest, [pcm.buffer])
  }
  source.connect(workletNode)

  resources.worker = worker
  resources.source = source
  resources.workletNode = workletNode
}

function postToWorker(worker: Worker, message: EngineWorkerRequest): void {
  worker.postMessage(message)
}

// ─── 엔진 산출 소비 (두 원천 병합) ───────────────────────────────────────────

function handleWorkerMessage(message: EngineWorkerResponse): void {
  switch (message.type) {
    case 'ready':
      return
    case 'estimate':
      handleEstimate(message.estimate)
      return
    case 'error':
      // 엔진 구성 실패(계약 위반급) — 세션 종료 후 idle 복귀. capture-* 상태로 위장하지 않는다.
      if (machine.phase === 'capturing') stopCapture()
      return
  }
}

function handleEstimate(estimate: DisplayEstimate): void {
  // teardown 이후 큐에 남은 잔여 메시지 방어 — capturing에서만 소비
  if (machine.phase !== 'capturing') return

  if (estimate.status === 'stable' && estimate.f0 !== null) {
    const figures = roundStableEstimate(estimate.f0)
    // UX-A1: stable 확정과 동시에 캡처 자동 정지 (백그라운드 녹음 없음)
    teardownResources()
    commit({...machine, phase: 'stable', frame: null, stableFigures: figures})
    try {
      // INV-14: stable 확정 전이 시점만 set — measuring/weak-signal 값은 이 경로에 오지 않는다
      setConfirmedMeasurement({
        panoHz: figures.panoHz,
        rpm: figures.rpm,
        confidence: clampConfidence(estimate.confidence),
        capturedAt: new Date().toISOString(),
      })
    } catch {
      // 스키마 검증 실패(계약 위반 방어) — 오값을 게시하느니 slot을 비워 둔다.
      // stable 표시는 유지되고 S2는 "측정값 없음" 경로로 진행된다 (성공 위장 금지).
    }
    return
  }

  commit({...machine, frame: toEngineFrame(estimate)})
}

// ─── 세션 수명 이벤트 ────────────────────────────────────────────────────────

function handleStateChange(): void {
  const resources = active
  if (resources === null) return
  if (machine.phase === 'capturing' && resources.ctx.state !== 'running') {
    // iOS 인터럽션 등 — 측정 중단, 자원 유지 (resumeAudio 재개 대상)
    commit({...machine, phase: 'suspended', frame: null})
  }
}

function handleVisibilityChange(): void {
  if (document.visibilityState !== 'hidden') return
  // UX-A2: 백그라운드 전환 시 세션 종료 — 백그라운드 녹음 없음.
  // suspended도 마이크 트랙이 살아 있으므로 함께 종료한다. stable은 이미 정지 상태라 유지.
  if (machine.phase === 'capturing' || machine.phase === 'suspended') {
    stopCapture()
  }
}

function teardownResources(): void {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  const resources = active
  if (resources === null) return
  active = null
  resources.ctx.removeEventListener('statechange', handleStateChange)
  if (resources.workletNode !== null) {
    resources.workletNode.port.onmessage = null
    resources.workletNode.disconnect()
  }
  resources.source?.disconnect()
  if (resources.worker !== null) {
    resources.worker.onmessage = null
    resources.worker.terminate()
  }
  for (const track of resources.stream.getTracks()) track.stop()
  void resources.ctx.close().catch(() => undefined)
}

// ─── 권한 감지 (F-2) ─────────────────────────────────────────────────────────

async function queryMicrophonePermission(): Promise<PermissionStatus | null> {
  try {
    // lib.dom PermissionName 버전에 따라 'microphone' 포함 여부가 달라 string 경유로 좁힌다
    const name: string = 'microphone'
    return await navigator.permissions.query({name: name as PermissionName})
  } catch {
    // Permissions API 미가용(iOS Safari)·'microphone' 미지원 — null = fallback 휴리스틱 경로
    return null
  }
}

async function queryMicrophonePermissionState(): Promise<PermissionState | null> {
  const status = await queryMicrophonePermission()
  return status?.state ?? null
}

/** no-permission 중 브라우저 설정에서 허용으로 바뀌면 idle 복귀 — 캡처 시작은 여전히 제스처 필요 */
function watchPermissionRecovery(): void {
  if (permissionWatcher !== null) return
  void queryMicrophonePermission().then(status => {
    if (status === null || machine.phase !== 'no-permission' || permissionWatcher !== null) return
    permissionWatcher = status
    status.onchange = () => {
      if (status.state !== 'denied' && machine.phase === 'no-permission') {
        unwatchPermissionRecovery()
        commit({...machine, phase: 'idle', settingsHelpOpen: false})
      }
    }
  })
}

function unwatchPermissionRecovery(): void {
  if (permissionWatcher === null) return
  permissionWatcher.onchange = null
  permissionWatcher = null
}
