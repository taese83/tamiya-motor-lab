// F2 측정 세션 command 계층 v2 (state-contract v2 M-1~3) —
// getUserMedia·AudioContext·AudioWorklet·엔진 Worker 수명을 소유하는 유일한 모듈.
//
// - 전 command는 Promise<void>/void — 결과는 store 스냅샷 게시가 유일한 채널이다.
//   Result 반환·전역 오류 UI·query 캐시 사용 금지 (api-schema §채널 규약 v2).
// - startCapture는 페이지 마운트 시 자동 호출(M-1) — 제스처 여부는 phase로만 판정한다
//   (awaiting-gesture에서의 재시도 = [탭하여 시작] 탭 핸들러 경로뿐).
// - 연속 측정(M-3): 엔진 stable에서도 캡처를 멈추지 않는다 — 확정·기록은 소비자(page) 소유.
// - visibilitychange 배선은 페이지 소유 — 이 모듈은 stopCaptureForHidden/
//   restartCaptureOnVisible 진입점만 제공한다 (UX-A2).
// - 고빈도 프레임·권한 감지 상태(cause·denialCount)는 전부 이 모듈의 세션 로컬(비영속) —
//   INV-15/INV-17. 새로고침 시 idle로 초기화되고 영구 거부 여부를 저장하지 않는다.

import {CAPTURE_WORKLET_NAME, CAPTURE_WORKLET_SOURCE} from './capture-worklet'
import {
  canStartCapture,
  classifyCaptureError,
  createIdleSnapshot,
  isMeasuringEstimate,
  resolveStartFailure,
  toEngineFrame,
} from './machine'
import {clearEngineDiagnostics, setEngineDiagnostics} from './diagnostics-store'
import {publishSnapshot} from './store'

import type {
  DisplayEstimate,
  EngineWorkerRequest,
  EngineWorkerResponse,
} from '@shared/lib/audio-analysis'
import type {MachineSnapshot} from './machine'

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
/** 세션 내 누적 거부 횟수 (F-2 fallback ≥2회 승격) — INV-17 비영속. awaiting-gesture 판정은 미계상 */
let denialCount = 0
/**
 * v2.18 — **연속** measuring 시작 시각(ms). phase가 running을 벗어나면 null로 리셋된다.
 *
 * v2.x(사용자: 깜빡이며 측정이 끊겨 타이머가 리셋되고 무한 측정) — 짧은 게이트 실패에는
 * 리셋하지 않는다. 신뢰 게이트는 실기기 소음·마이크 AGC로 수백 ms 단위로 깜빡일 수 있는데,
 * 그때마다 0으로 되돌리면 하한(3s/5s)에 영영 도달하지 못한다. MEASURING_GAP_TOLERANCE_MS
 * 이내의 끊김은 같은 연속 측정으로 간주하고, 그보다 길면 회전이 실제로 바뀐 것으로 보고 리셋한다.
 */
let measuringSinceMs: number | null = null
/** 마지막 measuring 프레임 시각 — 끊김 길이 판정 기준 */
let lastMeasuringAtMs: number | null = null
/** 이 시간 이내의 신호 끊김은 연속 측정으로 간주한다 (v2.x — 800ms로도 부족해 1200ms로 상향) */
const MEASURING_GAP_TOLERANCE_MS = 1200
/** no-permission 중 granted 전환 감지 구독 (Permissions API 가용 시 — F-2 ①) */
let permissionWatcher: PermissionStatus | null = null

function commit(next: MachineSnapshot): void {
  machine = next
  publishSnapshot(next)
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

// ─── 공개 command ────────────────────────────────────────────────────────────

/**
 * startCapture — phase ∈ {idle, awaiting-gesture} 가드 · isSecureContext 사전 차단(REQ-ST-002) ·
 * getUserMedia(DSP-off·mono) + resume() + 엔진 파이프라인 구동.
 * 제스처 여부 = 현재 phase가 awaiting-gesture인지로 판정 — [탭하여 시작] 탭 핸들러 경로뿐이다.
 * 성공 시 running(첫 추정 전까지 view는 starting 유지 — 0 RPM·이전 값 노출 금지).
 */
export async function startCapture(): Promise<void> {
  if (acquiring || !canStartCapture(machine.phase)) return
  if (globalThis.isSecureContext !== true) {
    // D-4: 진입 자체 차단 — 권한 오류(no-permission)와 혼용 금지.
    // secureContext=false 스냅샷은 toMeasureView가 insecure로 최우선 투영한다.
    commit(createIdleSnapshot(false))
    return
  }
  const gesture = machine.phase === 'awaiting-gesture'
  unwatchPermissionRecovery()
  commit({...machine, phase: 'starting', frame: null, secureContext: true})
  await acquireCapture({gesture, isRetry: false})
}

/**
 * stopCapture — 트랙·Worker·AudioContext 정리 후 idle. 실패 없음(멱등).
 * 호출처: 라우트 이탈 · stopCaptureForHidden(페이지 visibility 배선 — UX-A2).
 * idle은 자동 시작 전 과도 상태 — view로는 starting에 흡수된다(M-2).
 */
export function stopCapture(): void {
  teardownResources()
  unwatchPermissionRecovery()
  commit({
    ...machine,
    phase: 'idle',
    frame: null,
    settingsHelpOpen: false,
    secureContext: globalThis.isSecureContext === true,
  })
}

/**
 * stopCaptureForHidden — visibilitychange hidden 배선용 진입점 (배선은 페이지 소유, UX-A2).
 * 활성 세션(starting·running·suspended)만 종료 — no-permission·awaiting-gesture 안내는 유지.
 * suspended도 마이크 트랙이 살아 있으므로 함께 종료한다 (백그라운드 녹음 없음).
 */
export function stopCaptureForHidden(): void {
  if (
    machine.phase === 'starting' ||
    machine.phase === 'running' ||
    machine.phase === 'suspended'
  ) {
    stopCapture()
  }
}

/**
 * restartCaptureOnVisible — visibilitychange visible 배선용 진입점 (배선은 페이지 소유).
 * hidden 종료로 idle인 경우에만 자동 재시작(M-2) — no-permission·awaiting-gesture·suspended는
 * 사용자 행동(제스처) 대기 상태라 건드리지 않는다.
 */
export async function restartCaptureOnVisible(): Promise<void> {
  if (machine.phase !== 'idle') return
  await startCapture()
}

/**
 * retryPermission — no-permission에서 getUserMedia 재시도 (제스처 내).
 * 거부 시 denialCount+1, 세션 내 누적 ≥2회 또는 <300ms 즉시 실패면 permanent 승격(F-2/CD-A3).
 * permanent 승격 후에도 호출을 막지 않는다 — 오판 시 사용자가 재시도로 복구 가능(CD-A3).
 */
export async function retryPermission(): Promise<void> {
  if (acquiring || machine.phase !== 'no-permission') return
  unwatchPermissionRecovery()
  commit({...machine, phase: 'starting', frame: null, settingsHelpOpen: false})
  await acquireCapture({gesture: true, isRetry: true})
}

/**
 * resumeAudio — suspended에서 ctx.resume() (제스처 내). running 확인 후에만 측정 재개(D-5) —
 * 아니면 suspended 유지(복구 버튼 상시 원칙 — 상태 채널만으로 전달, 반환값 없음).
 * 재개 시 엔진 reset — 중단 전 stale 추적 상태로 수치를 이어붙이지 않는다.
 */
export async function resumeAudio(): Promise<void> {
  const resources = active
  if (machine.phase !== 'suspended' || resources === null) return
  try {
    await resources.ctx.resume()
  } catch {
    // 아래 state 검사로 수렴 — suspended 유지
  }
  if (active !== resources || machine.phase !== 'suspended') return // 경합: 이미 종료·전이됨
  if (resources.ctx.state !== 'running') return // D-5: suspended 유지 — [탭하여 다시 시작] 유지
  try {
    await ensurePipeline(resources)
  } catch {
    teardownResources()
    commit({
      ...machine,
      phase: 'no-permission',
      cause: 'device-error',
      permanent: false,
      settingsHelpOpen: false,
    })
    return
  }
  if (active !== resources || machine.phase !== 'suspended') return
  if (resources.worker !== null) {
    postToWorker(resources.worker, {type: 'reset'})
  }
  commit({...machine, phase: 'running', frame: null})
}

/** no-permission(영구) [설정 방법 보기] 토글 — view.settingsHelpOpen (component-spec §2.2) */
export function toggleSettingsHelp(): void {
  if (machine.phase !== 'no-permission') return
  commit({...machine, settingsHelpOpen: !machine.settingsHelpOpen})
}

// ─── 캡처 획득·파이프라인 ────────────────────────────────────────────────────

interface CaptureAttempt {
  /** 사용자 제스처 체인 내 시도 여부 — resolveStartFailure gesture 분기·suspended 판정에 사용 */
  gesture: boolean
  isRetry: boolean
}

async function acquireCapture(attempt: CaptureAttempt): Promise<void> {
  acquiring = true
  try {
    const requestedAt = performance.now()
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia(CAPTURE_CONSTRAINTS)
    } catch (error) {
      await handleCaptureFailure(error, attempt, performance.now() - requestedAt)
      return
    }
    if (machine.phase !== 'starting') {
      // 경합 방어: await 중 stopCaptureForHidden 등으로 전이됨 — 획득 스트림 즉시 반납 후 폐기
      for (const track of stream.getTracks()) track.stop()
      return
    }

    const ctx = new AudioContext()
    active = {stream, ctx, source: null, workletNode: null, worker: null}
    ctx.addEventListener('statechange', handleStateChange)
    try {
      // 제스처 체인 내 resume (iOS D-1) — 실패해도 아래 state 검사가 판정
      await ctx.resume()
    } catch {
      // suspended/awaiting-gesture 판정으로 수렴
    }
    if (machine.phase !== 'starting') {
      teardownResources()
      return
    }
    if (ctx.state !== 'running') {
      if (attempt.gesture) {
        // D-5 가드: 제스처 시도인데도 running 실패 — 자원 유지, resumeAudio가 잇는다
        commit({...machine, phase: 'suspended', frame: null})
      } else {
        // M-1: 자동 시도의 resume 실패 = 제스처 부재 — 마이크 즉시 해제 후 [탭하여 시작] fallback
        teardownResources()
        commit({...machine, phase: 'awaiting-gesture', frame: null})
      }
      return
    }

    try {
      await ensurePipeline(active)
    } catch {
      teardownResources()
      commit({
        ...machine,
        phase: 'no-permission',
        cause: 'device-error',
        permanent: false,
        settingsHelpOpen: false,
      })
      return
    }
    if (machine.phase !== 'starting') {
      teardownResources()
      return
    }

    commit({...machine, phase: 'running', frame: null})
  } finally {
    acquiring = false
  }
}

async function handleCaptureFailure(
  error: unknown,
  attempt: CaptureAttempt,
  elapsedMs: number,
): Promise<void> {
  if (machine.phase !== 'starting') return // 경합 방어 — 이미 다른 전이가 수행됨
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
    return
  }
  const permissionState = await queryMicrophonePermissionState()
  if (machine.phase !== 'starting') return // await 후 재검사
  const resolution = resolveStartFailure({
    permissionState,
    denialCount: denialCount + 1, // 이번 거부 포함 후보값 — no-permission 확정 시에만 계상
    isRetry: attempt.isRetry,
    elapsedMs,
    gesture: attempt.gesture,
  })
  if (resolution.kind === 'awaiting-gesture') {
    // 거부가 아니라 제스처 부재로 해석(M-1) — denialCount 미계상, 오류 표현 금지
    commit({...machine, phase: 'awaiting-gesture', frame: null})
    return
  }
  denialCount += 1
  commit({
    ...machine,
    phase: 'no-permission',
    cause,
    permanent: resolution.permanent,
    settingsHelpOpen: false,
  })
  watchPermissionRecovery()
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
      // 엔진 구성 실패(계약 위반급) — 세션 종료. v2에는 수동 대기 화면(idle)이 없어
      // no-permission(device-error)로 수렴한다 — [권한 다시 요청]이 전체 파이프라인 재구동 경로.
      if (machine.phase === 'running') {
        teardownResources()
        unwatchPermissionRecovery()
        commit({
          ...machine,
          phase: 'no-permission',
          cause: 'device-error',
          permanent: false,
          settingsHelpOpen: false,
        })
      }
      return
  }
}

/**
 * 연속 캡처(M-3): stable에서도 정지·확정하지 않는다 — toEngineFrame이 isStable 신호로 접고,
 * 자동 확정 트리거(RV-1)·기록은 소비자(page)가 view로 판단한다.
 */
function handleEstimate(estimate: DisplayEstimate): void {
  // teardown 이후 큐에 남은 잔여 메시지 방어 — running에서만 소비
  if (machine.phase !== 'running') return

  // 진단 계측 기록 (v2.x 임시) — 게이트 실패 프레임 포함 매 프레임. 판정 비관여.
  setEngineDiagnostics(estimate.diagnostics)

  // v2.18 연속 측정 지속시간 — **모터 소리 입력(첫 measuring 프레임) 순간부터** 잰다.
  // v2.x(사용자: 깜빡임으로 타이머가 리셋돼 무한 측정): 게이트가 잠깐 실패해도 즉시 0으로
  // 되돌리지 않는다. MEASURING_GAP_TOLERANCE_MS를 넘게 끊겼을 때만 연속이 깨진 것으로 본다.
  const now = Date.now()
  if (!isMeasuringEstimate(estimate)) {
    const gapMs = lastMeasuringAtMs === null ? Infinity : now - lastMeasuringAtMs
    if (gapMs > MEASURING_GAP_TOLERANCE_MS) {
      measuringSinceMs = null
      lastMeasuringAtMs = null
    }
    // 끊김 중에도 view는 weak-signal(수치 미표시) — 누적 시간만 유예 구간 동안 보존한다
    commit({...machine, frame: toEngineFrame(estimate, 0)})
    return
  }
  measuringSinceMs ??= now
  lastMeasuringAtMs = now
  commit({...machine, frame: toEngineFrame(estimate, now - measuringSinceMs)})
}

// ─── 세션 수명 이벤트 ────────────────────────────────────────────────────────

function handleStateChange(): void {
  const resources = active
  if (resources === null) return
  if (machine.phase === 'running' && resources.ctx.state !== 'running') {
    // iOS 인터럽션 등 — 측정 중단, 자원 유지 (resumeAudio 재개 대상)
    commit({...machine, phase: 'suspended', frame: null})
  }
}

function teardownResources(): void {
  // 연속 측정 타이머 리셋(v2.x 버그 수정): measuringSinceMs는 무신호 프레임에서만 null이 됐다.
  // 그래서 모터가 계속 도는 채로 왕복 복귀(언마운트→stopCapture→teardown) 후 재측정하면,
  // 파이프라인은 새로 만들어져도 옛 시작 시각이 남아(??= 가 non-null이라 안 덮음) measuredMs가
  // 즉시 5초를 넘겨 **즉시 확정**되는 버그가 있었다. 파이프라인 파기 = 측정 종료이므로 여기서
  // 타이머를 초기화해, 다음 세션 첫 measuring 프레임이 시작 시각을 새로 잡게 한다.
  measuringSinceMs = null
  lastMeasuringAtMs = null
  clearEngineDiagnostics()
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

/**
 * no-permission 중 브라우저 설정에서 허용으로 바뀌면 idle commit 후 자동 재시작(M-2) —
 * granted면 getUserMedia가 프롬프트 없이 성공하고, prompt로의 복귀도 startCapture가
 * resolveStartFailure로 재판정한다(제스처 요건이면 awaiting-gesture로 수렴).
 */
function watchPermissionRecovery(): void {
  if (permissionWatcher !== null) return
  void queryMicrophonePermission().then(status => {
    if (status === null || machine.phase !== 'no-permission' || permissionWatcher !== null) return
    permissionWatcher = status
    status.onchange = () => {
      if (status.state !== 'denied' && machine.phase === 'no-permission') {
        unwatchPermissionRecovery()
        commit({...machine, phase: 'idle', settingsHelpOpen: false})
        void startCapture()
      }
    }
  })
}

function unwatchPermissionRecovery(): void {
  if (permissionWatcher === null) return
  permissionWatcher.onchange = null
  permissionWatcher = null
}
