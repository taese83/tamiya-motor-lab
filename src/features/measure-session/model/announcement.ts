// S1 스크린리더 알림 문구 계약 v2 (component-spec v2 §2.6) — 순수 함수 계층 (unit 테스트 대상).
// 알림 채널은 MeasureStatusLabel 내부 hidden role="status" 1곳뿐이며, 이 모듈은
// "상태 전이 도착 시점의 문구"와 "debounce·중복 억제 판정"만 계산한다.
// 수치 갱신(≥10 Hz)은 절대 announce하지 않는다. isStable 신호도 announce 금지(M-3 내부 신호) —
// measuring 문구는 stable 여부와 무관하게 동일하다.

import type {MeasureView} from './view'

/** measuring↔weak-signal 자동 왕복 알림 debounce (CD-A1 — SR 스팸 방지, 상수 1곳) */
export const ANNOUNCE_DEBOUNCE_MS = 1_000

/** 알림 중복 억제 키 — no-permission은 일시/영구 문구가 달라 별도 키 (§2.6 표와 1:1) */
export type AnnouncementKey =
  | 'starting'
  | 'insecure'
  | 'awaiting-gesture'
  | 'measuring'
  | 'weak-signal'
  | 'no-permission-temporary'
  | 'no-permission-permanent'
  | 'suspended'

export function announcementKey(view: MeasureView): AnnouncementKey {
  if (view.status === 'no-permission') {
    return view.permanent ? 'no-permission-permanent' : 'no-permission-temporary'
  }
  return view.status
}

/** 전이 도착 상태 → 알림 문구 (component-spec v2 §2.6 표 고정 copy) */
export function buildAnnouncement(view: MeasureView): string {
  switch (view.status) {
    case 'starting':
      return '측정 준비 중'
    case 'insecure':
      return 'HTTPS에서만 측정할 수 있습니다'
    case 'awaiting-gesture':
      return '탭하여 측정을 시작하세요'
    case 'measuring':
      return '측정 중'
    case 'weak-signal':
      return '신호 약함' // 실기기 피드백: 시각 안내 문구 제거에 맞춰 SR도 상태만 간결 전달
    case 'no-permission':
      return view.permanent
        ? '브라우저 설정에서 마이크 권한을 허용해야 합니다'
        : '마이크 권한이 거부되었습니다'
    case 'suspended':
      return '오디오가 일시 중지되었습니다. 탭하여 다시 시작하세요'
  }
}

/**
 * measuring↔weak-signal 자동 왕복(D-9)만 1s debounce — 그 외 전이는 즉시 발화 (§2.6).
 * 양방향 모두: measuring→weak-signal 진입도, weak-signal→measuring 자동 복귀도 지연한다.
 */
export function shouldDebounceAnnouncement(prev: AnnouncementKey, next: AnnouncementKey): boolean {
  return (
    (prev === 'measuring' && next === 'weak-signal') ||
    (prev === 'weak-signal' && next === 'measuring')
  )
}
