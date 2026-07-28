// F2 세션 UI store (zustand 5) — 세션 로컬·비영속 (INV-15: 고빈도 프레임은 이 feature 밖으로
// 나가지 않는다. persist 미들웨어 금지 — 세션 수명과 함께 소멸, 새로고침 시 idle).
// store에는 UI가 소비하는 파생 상태(view·announcement)만 담고, 머신 스냅샷·캡처 자원은
// session.ts 모듈 상태로 유지한다 — store 직접 구독은 pages/measure의 셀렉터 훅 경유만.

import {create} from 'zustand'

import {
  ANNOUNCE_DEBOUNCE_MS,
  announcementKey,
  buildAnnouncement,
  shouldDebounceAnnouncement,
} from './announcement'
import {toMeasureView} from './machine'

import type {AnnouncementKey} from './announcement'
import type {MachineSnapshot} from './machine'
import type {MeasureView} from './view'

interface MeasureSessionUiState {
  view: MeasureView
  /** 상태 전이 시에만 갱신 — MeasureStatusLabel announcement prop 원천 (§2.6 단일 채널) */
  announcement: string
}

const INITIAL_VIEW: MeasureView = {
  status: 'idle',
  secureContext: globalThis.isSecureContext === true,
  activating: false,
}

/** 내부 store — 공개 API는 아래 셀렉터 훅 2개와 session.ts의 command 뿐 */
export const useMeasureSessionStore = create<MeasureSessionUiState>()(() => ({
  view: INITIAL_VIEW,
  announcement: buildAnnouncement(INITIAL_VIEW),
}))

/** S1 조립(pages/measure)용 셀렉터 훅 — MeasureView discriminated union (component-spec §2.1) */
export function useMeasureView(): MeasureView {
  return useMeasureSessionStore(state => state.view)
}

/** MeasureStatusLabel announcement — 전이 시점에만 새 문자열로 교체 (수치 갱신으로 불변) */
export function useMeasureAnnouncement(): string {
  return useMeasureSessionStore(state => state.announcement)
}

// ─── snapshot 게시 (session.ts 전용) ─────────────────────────────────────────
// announcement 규칙 (§2.6): 직전과 동일 문구 재발화 금지 + measuring↔weak-signal 1s debounce.
// debounce 중 같은 도착 상태의 프레임이 반복 유입돼도 타이머를 재시작하지 않는다
// (매 프레임 리셋되면 왕복 경계에서 영원히 발화하지 못한다).

let announcedKey: AnnouncementKey = announcementKey(INITIAL_VIEW)
let pendingKey: AnnouncementKey | null = null
let pendingTimer: ReturnType<typeof setTimeout> | null = null

function clearPendingAnnouncement(): void {
  if (pendingTimer !== null) clearTimeout(pendingTimer)
  pendingTimer = null
  pendingKey = null
}

function publishAnnouncement(view: MeasureView): void {
  const key = announcementKey(view)
  if (key === announcedKey) {
    clearPendingAnnouncement()
    return
  }
  if (pendingKey === key) return // 같은 도착 상태로 이미 debounce 진행 중 — 타이머 유지
  clearPendingAnnouncement()
  const apply = (): void => {
    pendingTimer = null
    pendingKey = null
    announcedKey = key
    useMeasureSessionStore.setState({announcement: buildAnnouncement(view)})
  }
  if (shouldDebounceAnnouncement(announcedKey, key)) {
    pendingKey = key
    pendingTimer = setTimeout(apply, ANNOUNCE_DEBOUNCE_MS)
    return
  }
  apply()
}

/** 머신 스냅샷 → view·announcement 반영 — session.ts commit 경로의 유일한 게시 지점 */
export function publishSnapshot(snapshot: MachineSnapshot): void {
  const view = toMeasureView(snapshot)
  useMeasureSessionStore.setState({view})
  publishAnnouncement(view)
}
