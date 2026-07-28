// 도메인 상수 단일 원천 (api-schema §1 · checkpoint-phase2 반영본)
// 모든 enum 저장값은 영문 snake_case 안정 식별자, 한국어 라벨은 라벨 맵에서만 —
// D4·CP-1a 어휘 교체 시 라벨 맵 1곳만 수정한다(교체 지점 1곳 원칙, feature-plan §8).

// ── Motor 상태 등급 (CP-1 확정: 선택형 enum + 메모 병행 / CP-1a: 4단계 baseline — 값은 사용자 미확정, 이 상수 1곳 교체)
export const MOTOR_STATUS_GRADES = ['new', 'breaking_in', 'prime', 'worn'] as const
export type MotorStatusGrade = (typeof MOTOR_STATUS_GRADES)[number]
export const MOTOR_STATUS_GRADE_LABELS: Record<MotorStatusGrade, string> = {
  new: '신품',
  breaking_in: '길들이기중',
  prime: '전성기',
  worn: '노화',
}
// 기본값 상수 없음 — 등급 생략 시 null(미지정) 저장 (checkpoint-phase2: AS-2 기각, SC-A1 채택)
// DEFAULT_MOTOR_STATUS_GRADE 생성 금지 (CP2-3) — 등급 UI 초기값은 항상 미선택.

// ── 주행 결과 (D4 baseline: 완주·코스아웃·미주행(측정만) — Phase 3 전 어휘 재확인 가능, 라벨 맵만 교체)
export const RUN_RESULTS = ['finished', 'course_out', 'not_run'] as const
export type RunResult = (typeof RUN_RESULTS)[number]
export const RUN_RESULT_LABELS: Record<RunResult, string> = {
  finished: '완주',
  course_out: '코스아웃',
  not_run: '미주행(측정만)',
}

// ── 전압 (A5 baseline)
export const VOLTAGE_RANGE = {min: 0.1, max: 9.9, step: 0.1, maxDecimals: 2} as const

// ── 가이드 (D1 / A6 baseline)
export const GUIDE_MIN_SATISFIED = 3
export const WIDE_VARIANCE_THRESHOLD = 0.5 // V — (max − min) ≥ 임계 시 분산 큼 보조 문구

// ── 표시 라벨 (CP-2 확정: 파노 = f₀ Hz — 라벨/환산식만 이곳에서 교체)
export const PANO_LABEL = '파노'

// ── 입력 길이 상한 (AS-1 → CP2-4 확정: name 30자 통일, memo 200자)
export const MOTOR_NAME_MAX_LENGTH = 30
export const MOTOR_MEMO_MAX_LENGTH = 200

// ── 파노(f₀) 탐색 대역 (analysis-algorithm 대역 — write-strict 검증용, state-contract SC-A8)
// panoHz는 write 시 이 대역으로 엄격 검증하고, rehydrate(read)는 완화 검증(유한 양수 ≤ F0_REHYDRATE_MAX)한다 —
// 대역 상수 변경이 기존 정상 데이터를 corrupt로 오판하지 않게 하는 write-strict/read-lenient 이원화 계약.
export const F0_RANGE = {min: 170, max: 620} as const
export const F0_REHYDRATE_MAX = 2_000
