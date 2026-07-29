// 도메인 상수 단일 원천 (api-schema v2 §1 — revision-v2-brief 반영본)
// 모든 enum 저장값은 영문 snake_case 안정 식별자, 한국어 라벨은 라벨 맵에서만 —
// 어휘 교체 시 라벨 맵 1곳만 수정한다(교체 지점 1곳 원칙).
// v2 제거: MOTOR_STATUS_GRADES(+LABELS)·RUN_RESULTS(+LABELS)·GUIDE_MIN_SATISFIED·
// WIDE_VARIANCE_THRESHOLD·MOTOR_MEMO_MAX_LENGTH (api-schema §7 — 잔존 시 결함).

// ── 모터 종류 (T-1 확정: 9종 enum — 저장은 안정 식별자, 표시는 라벨 맵)
export const MOTOR_KINDS = [
  'm130',
  'atomic',
  'torque',
  'rev',
  'hyper_dash',
  'power_dash',
  'sprint_dash',
  'ultra_dash',
  'mach_dash',
] as const
export type MotorKind = (typeof MOTOR_KINDS)[number]
export const MOTOR_KIND_LABELS: Record<MotorKind, string> = {
  m130: '130',
  atomic: '아토믹튠',
  torque: '토크튠',
  rev: '렙튠',
  hyper_dash: '하이퍼대시',
  power_dash: '파워대시',
  sprint_dash: '스프린트대시',
  ultra_dash: '울트라대시',
  mach_dash: '마하대시',
}

// ── 레이스 결과 (R-3 확정: 2택)
export const RACE_RESULTS = ['finished', 'retired'] as const
export type RaceResult = (typeof RACE_RESULTS)[number]
export const RACE_RESULT_LABELS: Record<RaceResult, string> = {
  finished: '완주',
  retired: '이탈',
}

// ── 측정 기록 rolling 상한 (T-3 확정: 모터당 최대 10건, 초과 시 최고(最古) 자동 삭제 — INV-20)
export const MEASURE_RECORD_LIMIT = 10

// ── 레이스 랩타임 상한 (SC2-A2: ≤1시간 — 미니카 랩타임 sanity 상한, 상수 1곳)
export const LAP_TIME_MAX_MS = 3_600_000

// ── 전압 (A5 baseline — v1 유지)
export const VOLTAGE_RANGE = {min: 0.1, max: 9.9, step: 0.1, maxDecimals: 2} as const

// ── 표시 라벨 (CP-2 확정 — v1 유지. M-4: 파노가 주지표로 승격, 라벨 자체는 무변경)
export const PANO_LABEL = '파노'

// ── 입력 길이 상한 (AS-1 — v1 유지. statusMemo 제거로 name 1건만)
export const MOTOR_NAME_MAX_LENGTH = 30

// ── 파노(f₀) 탐색 대역 (analysis-algorithm v2 canonical — v1 유지)
// write-strict 검증(shared/lib/schema/pano.ts panoHzWriteSchema)과 M-4 게이지 눈금이 이 상수 1곳을 공유한다.
// rehydrate(read)는 완화 검증(유한 양수 ≤ F0_REHYDRATE_MAX) — 대역 상수 변경이
// 기존 정상 데이터를 corrupt로 오판하지 않게 하는 write-strict/read-lenient 이원화 계약(SC-A8).
export const F0_RANGE = {min: 170, max: 620} as const
export const F0_REHYDRATE_MAX = 2_000
