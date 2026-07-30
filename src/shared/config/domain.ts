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

// ── 레이스 목표/우선순위 (v2.31 — 전압 추천 입력). result(완주/이탈=지난 결과)와 별개 개념:
// 이번 주행에서 무엇을 우선할지의 **목표**다. 저장은 안정 식별자, 표시는 라벨 맵.
// 'finish'(완주 우선=보수적)·'stability'(안정=중간)·'speed'(속도=공격적)로 전압 기준선이 갈린다.
export const RACE_GOALS = ['finish', 'stability', 'speed'] as const
export type RaceGoal = (typeof RACE_GOALS)[number]
export const RACE_GOAL_LABELS: Record<RaceGoal, string> = {
  finish: '완주',
  stability: '안정',
  speed: '속도',
}

// ── 측정 기록 rolling 상한 (T-3·INV-20: 모터당 최대 N건, 초과 시 최고령(最古) 자동 삭제)
// v2.21(사용자): 10 → 20으로 상향. rolling·eviction 로직은 상수만 참조하므로 값 변경으로 족하다
// (INV-20의 "N건 유지·초과 시 최고령 삭제" 불변식 자체는 불변, 경계값만 20).
export const MEASURE_RECORD_LIMIT = 20

// ── 레이스 랩타임 상한 (SC2-A2: ≤1시간 — 미니카 랩타임 sanity 상한, 상수 1곳)
export const LAP_TIME_MAX_MS = 3_600_000

// ── 전압 (A5 baseline — v1 유지)
export const VOLTAGE_RANGE = {min: 0.1, max: 9.9, step: 0.1, maxDecimals: 2} as const

// ── 전압 추천(권장) 대역 (v2.34 — 입력 허용 대역과 별개). 실사용상 풀충 배터리로도 ~3.2V가
// 상한(모터 밀어넣기로 간신히 도달, 배터리 부담)이고 하한은 2.6V다. 추천기(휴리스틱·LLM)는
// 이 대역으로만 제안하고, 속도 목표라도 3.2V를 넘겨야 더 빨라지는 상황이면 안정으로 낮춘다.
export const VOLTAGE_ADVICE_RANGE = {min: 2.6, max: 3.2, step: 0.02} as const

// ── 레이스 분석 가중치 (v2.37) — 가장 오래된 기록=1, 최근일수록 지수적으로 큰 중요도.
// weight(rank) = GROWTH^rank (rank: 오래된 0 → 최근 n-1). 추천기(휴리스틱 가중 최소제곱·LLM 프롬프트)가
// 이 weight를 분석 중요도로 사용한다.
export const RACE_WEIGHT_GROWTH = 1.5

// ── 표시 라벨 (CP-2 확정 — v1 유지. M-4: 파노가 주지표로 승격, 라벨 자체는 무변경)
export const PANO_LABEL = '파노'

// ── 왕복 자동 확정 지속시간 (v2.18 → v2.x 개정: 3초 grace 안정-우선 + 5초 타임아웃)
// 왕복(모터 상세·레이스 진입) 자동 확정의 **연속 측정 시간**. 누적이 아니라 연속이다 —
// 신호가 끊기면 0부터 다시 센다(끊긴 구간을 합치면 의미가 없다).
//
// v2.x(사용자): 두 임계로 나눈다.
//  ① MIN(3초): 초기 3초(스핀업 과도)는 안정 판정을 **무시**하고, 3초 이후 **안정(isStable)**이면
//     즉시 확정하고 멈춘다 — 좋은 모터는 5초를 다 기다리지 않는다.
//  ② MAX(5초): 5초까지 **안정에 도달하지 못해도** 그 시점 마지막 측정값으로 확정한다. stable에만
//     의존하면 CV가 계속 1.5% 이상인 "흔들림 큼" 모터가 왕복 경로로 아예 기록 안 되는 사각지대가
//     생긴다(컨디션 추적 대상이 정작 안 잡힘) — 타임아웃이 그걸 막는다. 불안정 모터는 높은 CV 그대로 기록.
// standalone [기록](측정 탭 직접)은 이 하한 미적용 — measuring이면 즉시 기록(v2.23).
export const MIN_MEASURE_DURATION_MS = 3000
export const MAX_MEASURE_DURATION_MS = 5000

// ── 입력 길이 상한 (AS-1 — v1 유지. statusMemo 제거로 name 1건만)
export const MOTOR_NAME_MAX_LENGTH = 30

// ── 파노(f₀) 탐색 대역 (analysis-algorithm v2 canonical — v1 유지)
// write-strict 검증(shared/lib/schema/pano.ts panoHzWriteSchema)과 M-4 게이지 눈금이 이 상수 1곳을 공유한다.
// rehydrate(read)는 완화 검증(유한 양수 ≤ F0_REHYDRATE_MAX) — 대역 상수 변경이
// 기존 정상 데이터를 corrupt로 오판하지 않게 하는 write-strict/read-lenient 이원화 계약(SC-A8).
export const F0_RANGE = {min: 170, max: 620} as const
export const F0_REHYDRATE_MAX = 2_000

// ── 회전 안정도 · 컨디션 (v2.x 2축 판정 — 사용자 확정) ─────────────────────────
// 절대 스케일("지금 상태가 괜찮은가")과 자기 기준선 추세("나빠지고 있는가")를 함께 쓴다.
// 기준선 3건이 이미 흔들리는 상태면 추세 비교가 '양호'로 위장하는 맹점(사용자 지적)을
// 절대 스케일이 막는다: 기준선 자체가 high 구간이면 추세 판정보다 신뢰도 경고를 우선한다.
//
// [1축 — 절대 스케일] 변동률(CV) 자체의 4구간 (사용자 확정, 2026-07-30). 앵커의 근거 강도:
//   high 하한 1.5% = 엔진 안정 판정 임계(DEFAULT_TUNING.stabilityCv)와 동일 — **확실한 내부 근거**
//   (이 수준이면 엔진이 안정 선언조차 못 하는 흔들림).
//   excellent 상한 0.2% = 회전 오디오 기기 규격(W&F) 상급 경계에서 차용 — 길들이기 완료 확인 용도.
//   good 상한 0.5% = 설계 추정. excellent·good 경계는 **실측 캘리브레이션 대상**(ASSUMPTION:
//   실기기 좋은/나쁜 모터 통상값 확인 후 조정, 상수 1곳).
export const STABILITY_LEVELS = ['excellent', 'good', 'fair', 'high'] as const
export type StabilityLevel = (typeof STABILITY_LEVELS)[number]
export const STABILITY_LEVEL_LABELS: Record<StabilityLevel, string> = {
  excellent: '매우 좋음',
  good: '좋음',
  fair: '보통',
  high: '흔들림 큼',
}
export const STABILITY_EXCELLENT_MAX_CV = 0.002 // < 0.2% → 매우 좋음 (W&F 상급 차용 — 캘리브레이션 대상)
export const STABILITY_GOOD_MAX_CV = 0.005 // < 0.5% → 좋음 (설계 추정 — 캘리브레이션 대상)
export const STABILITY_HIGH_MIN_CV = 0.015 // ≥ 1.5% → 흔들림 큼 (엔진 안정 임계 정렬 — 확정 근거)

export function stabilityLevelOf(cv: number): StabilityLevel {
  if (cv < STABILITY_EXCELLENT_MAX_CV) return 'excellent'
  if (cv < STABILITY_GOOD_MAX_CV) return 'good'
  if (cv < STABILITY_HIGH_MIN_CV) return 'fair'
  return 'high'
}

// [2축 — 자기 기준선 추세] Portescap 백서의 baseline 모니터링 방식(마모=β>1 점진 악화).
// 기준선(v2.x 개정 2 — 사용자 확정): 보관 기록 중 **가장 좋은(낮은) CV STABILITY_BASELINE_COUNT건의
// 중앙값** = 그 모터의 최상 컨디션. 초기 3건 방식의 오염(서툰 초기 측정)·rolling 삭제 드리프트를
// 해소한다. 파생값 — 영속 금지. 표시(사용자 확정: 조용한 추세): ok는 침묵, watch/inspect만 발화.
export const STABILITY_BASELINE_COUNT = 3 // 기준선 표본 수 — 백서 권고(최소 3개 표본)와 정렬
export const CONDITION_LEVELS = ['ok', 'watch', 'inspect'] as const
export type ConditionLevel = (typeof CONDITION_LEVELS)[number]
export const CONDITION_LEVEL_LABELS: Record<ConditionLevel, string> = {
  ok: '양호',
  watch: '주의',
  inspect: '점검 권장',
}
export const CONDITION_WATCH_RATIO = 1.5 // 최상 기준선 대비 1.5배 이상 → 주의
export const CONDITION_INSPECT_RATIO = 2.0 // 최상 기준선 대비 2배 이상 → 점검 권장

/** 기준선 대비 컨디션 판정 — baseline이 아직 없으면(표본 수집 중) null */
export function conditionLevelOf(currentCv: number, baselineCv: number | null): ConditionLevel | null {
  if (baselineCv === null || baselineCv <= 0) return null
  const ratio = currentCv / baselineCv
  if (ratio >= CONDITION_INSPECT_RATIO) return 'inspect'
  if (ratio >= CONDITION_WATCH_RATIO) return 'watch'
  return 'ok'
}
