// 도메인 상수 단일 원천 (api-schema v2 §1 — revision-v2-brief 반영본)
// 모든 enum 저장값은 영문 snake_case 안정 식별자, 한국어 라벨은 라벨 맵에서만 —
// 어휘 교체 시 라벨 맵 1곳만 수정한다(교체 지점 1곳 원칙).
// v2 제거: MOTOR_STATUS_GRADES(+LABELS)·RUN_RESULTS(+LABELS)·GUIDE_MIN_SATISFIED·
// WIDE_VARIANCE_THRESHOLD·MOTOR_MEMO_MAX_LENGTH (api-schema §7 — 잔존 시 결함).

// ── 모터 종류 (v2.6: 10종 enum — 저장은 안정 식별자, 표시는 라벨 맵)
// 배열 순서 = 표시 순서(종류 선택 그리드·필터 칩)로, 실제 제품 라인업의 출력 순서를 따른다.
// `light_dash`는 v2.6 신설 — enum **추가만** 하므로 기존 저장 행의 rehydrate 검증은 그대로 통과한다
// (제거·개명이면 저장된 모터가 data-corrupt로 판정되어 마이그레이션이 필요했다).
export const MOTOR_KINDS = [
  'm130',
  'torque',
  'atomic',
  'rev',
  'light_dash',
  'hyper_dash',
  'power_dash',
  'sprint_dash',
  'ultra_dash',
  'mach_dash',
] as const
export type MotorKind = (typeof MOTOR_KINDS)[number]
export const MOTOR_KIND_LABELS: Record<MotorKind, string> = {
  m130: '130',
  torque: '토크튠',
  atomic: '아토믹튠',
  rev: '렙튠',
  light_dash: '라이트대시',
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

// ── 측정 기록 rolling 상한 (T-3·INV-20: 모터당 최대 N건, 초과 시 최고령(最古) 자동 삭제)
// v2.21(사용자): 10 → 20으로 상향. rolling·eviction 로직은 상수만 참조하므로 값 변경으로 족하다
// (INV-20의 "N건 유지·초과 시 최고령 삭제" 불변식 자체는 불변, 경계값만 20).
export const MEASURE_RECORD_LIMIT = 20

// ── 레이스 랩타임 상한 (SC2-A2: ≤1시간 — 미니카 랩타임 sanity 상한, 상수 1곳)
export const LAP_TIME_MAX_MS = 3_600_000

// ── 전압 (A5 baseline — v1 유지)
export const VOLTAGE_RANGE = {min: 0.1, max: 9.9, step: 0.1, maxDecimals: 2} as const

// ── 표시 라벨 (CP-2 확정 — v1 유지. M-4: 파노가 주지표로 승격, 라벨 자체는 무변경)
export const PANO_LABEL = '파노'

// ── 측정 최소 지속시간 (v2.18)
// 엔진의 stable 판정은 1.5초 CV 기반이라 신호가 좋으면 매우 빨리 stable이 된다. 그런데 모터는
// 초기 회전이 안정되기까지 시간이 걸려서, 빠르게 확정하면 "엔진 기준으로는 안정이지만 모터
// 기준으로는 아직 덜 돌아간" 값이 남는다. 그래서 엔진 판정과 별개로 **연속 측정 시간의 하한**을
// 둔다. 누적이 아니라 연속이다 — 신호가 끊기면 0부터 다시 센다(끊긴 구간을 합치면 하한의
// 의미가 없다). 기록 버튼과 왕복 자동 확정(RV-1) 둘 다 이 하한을 통과해야 한다.
export const MIN_MEASURE_DURATION_MS = 5000

// ── 입력 길이 상한 (AS-1 — v1 유지. statusMemo 제거로 name 1건만)
export const MOTOR_NAME_MAX_LENGTH = 30

// ── 파노(f₀) 탐색 대역 (analysis-algorithm v2 canonical — v1 유지)
// write-strict 검증(shared/lib/schema/pano.ts panoHzWriteSchema)과 M-4 게이지 눈금이 이 상수 1곳을 공유한다.
// rehydrate(read)는 완화 검증(유한 양수 ≤ F0_REHYDRATE_MAX) — 대역 상수 변경이
// 기존 정상 데이터를 corrupt로 오판하지 않게 하는 write-strict/read-lenient 이원화 계약(SC-A8).
export const F0_RANGE = {min: 170, max: 620} as const
export const F0_REHYDRATE_MAX = 2_000
