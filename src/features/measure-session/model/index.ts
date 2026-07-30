// measure-session model segment 공개 API v2 (F2) — 명시적 named export만, export * 금지.
// slice 루트 index.ts 조립(ui 재수출 포함)은 slice owner 소관 — 본 segment는 model만 소유한다.

// 셀렉터 훅 (component-spec §2.1 — store 직접 구독은 pages/measure만)
export {useMeasureAnnouncement, useMeasureView} from './store'

// 게이트 진단 계측 (v2.x 임시 — 측정 끊김 원인 파악용. 원인 확정 후 제거)
export {useEngineDiagnostics} from './diagnostics-store'

// 세션 command (api-schema §4.5 v2 — 전부 비영속·상태는 store 단일 채널, 반환값 없음)
// stopCaptureForHidden/restartCaptureOnVisible: visibilitychange 배선은 페이지 소유 (UX-A2)
export {
  restartCaptureOnVisible,
  resumeAudio,
  retryPermission,
  startCapture,
  stopCapture,
  stopCaptureForHidden,
  toggleSettingsHelp,
} from './session'

// UI 계약 타입 (canonical handoff — ui/measure-view.ts 재수출, 중복 정의 금지)
export type {MeasureView} from './view'

// 순수 전이 가드·매핑 (unit 테스트 대상 — REQ-ST-002/003/004 evidence)
export {
  INSTANT_DENIAL_MS,
  canStartCapture,
  classifyCaptureError,
  createIdleSnapshot,
  resolveDenialPermanence,
  resolveStartFailure,
  toEngineFrame,
  toMeasureView,
} from './machine'
export type {
  DenialContext,
  EngineFrameView,
  MachineSnapshot,
  NoPermissionCause,
  SessionPhase,
  StartFailureContext,
  StartFailureResolution,
} from './machine'

// sr 알림 순수 계층 (component-spec §2.6 — debounce·중복 억제 판정 unit 대상)
export {
  ANNOUNCE_DEBOUNCE_MS,
  announcementKey,
  buildAnnouncement,
  shouldDebounceAnnouncement,
} from './announcement'
export type {AnnouncementKey} from './announcement'
