// measure-session model segment 공개 API (F2) — 명시적 named export만, export * 금지.
// slice 루트 index.ts 조립(ui 재수출 포함)은 slice owner 소관 — 본 segment는 model만 소유한다.

// 셀렉터 훅 (component-spec §2.1 — store 직접 구독은 pages/measure만)
export {useMeasureAnnouncement, useMeasureView} from './store'

// 세션 command 4건 + settingsHelp 토글 (api-schema §4.5 — 전부 비영속 세션 command)
export {
  resumeAudio,
  retryPermission,
  startCapture,
  stopCapture,
  toggleSettingsHelp,
} from './session'
export type {CaptureSession} from './session'

// UI 계약 타입 (canonical handoff — ui/measure-view.ts 재수출, 중복 정의 금지)
export type {MeasureView} from './view'

// 순수 전이 가드·매핑 (unit 테스트 대상 — REQ-ST-002/003/004 evidence)
export {
  INSTANT_DENIAL_MS,
  canStartCapture,
  clampConfidence,
  classifyCaptureError,
  createIdleSnapshot,
  resolveDenialPermanence,
  roundStableEstimate,
  toEngineFrame,
  toMeasureView,
} from './machine'
export type {
  DenialContext,
  EngineFrameView,
  MachineSnapshot,
  NoPermissionCause,
  SessionPhase,
} from './machine'

// sr 알림 순수 계층 (component-spec §2.6 — debounce·중복 억제 판정 unit 대상)
export {
  ANNOUNCE_DEBOUNCE_MS,
  announcementKey,
  buildAnnouncement,
  shouldDebounceAnnouncement,
} from './announcement'
export type {AnnouncementKey} from './announcement'
