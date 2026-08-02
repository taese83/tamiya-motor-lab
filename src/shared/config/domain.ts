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

// ── 이탈 사유 taxonomy (retire-reason-chipset Phase 1 — DL-015~020, D-R1·D-R5 확정)
// 재귀 트리(섹션→세부, n단 확장 가능). 저장은 항상 **가장 구체적으로 고른 leaf key 하나** —
// 트리가 그 key로 경로·인과 메타(speedRelated·causal)를 복원한다. key는 **append-only 안정
// 식별자**(리네임·삭제 금지) — 과거 저장 데이터가 항상 유효해야 한다. 섹션이 leaf→branch로
// 자라면 기존 leaf key는 그 섹션의 "그 외" leaf로 살아남는다(growth 규칙).

/** 이탈 사유 트리 노드 — children 있으면 branch(저장 불가), 없으면 leaf(저장 가능) */
export interface RetireReasonNode {
  readonly key: string
  readonly label: string // 드릴다운 표시용(섹션/세부)
  readonly speedRelated?: boolean // AI: 전압 처방 가능 여부. 미지정 시 부모 상속
  readonly causal?: string // AI 힌트
  readonly children?: readonly RetireReasonNode[] // 있으면 branch(저장 불가), 없으면 leaf(저장 가능)
}

// 현재 트리 인스턴스 (D-R1 확정 — 속도형 5섹션 + 기계형 2 + escape 1. 현재는 점프만 2단).
// as const로 리터럴 타입을 유지해 leaf key 유니온을 타입 수준에서 파생하고,
// satisfies로 노드 구조를 검증한다(design-tokens.ts와 같은 관례).
export const RETIRE_REASON_TREE = [
  {key: 'corner', label: '코너 이탈', speedRelated: true, causal: '속도 과다'},
  {
    key: 'jump',
    label: '점프',
    speedRelated: true,
    children: [
      {key: 'jump_overshoot', label: '비거리 김', causal: '순수 속도 → 전압↓ 1순위'},
      {key: 'jump_attitude', label: '공중 자세 무너짐', causal: '밸런스/댐퍼(속도 약함)'},
      {key: 'jump_rebound', label: '착지 후 튐', causal: '속도+댐퍼'},
      {key: 'jump_other', label: '그 외 점프', causal: '미상'},
    ],
  },
  {key: 'down_step', label: '다운 한칸 실패', speedRelated: true, causal: '속도 or 밸런스'},
  {key: 'wave', label: '웨이브 이탈', speedRelated: true, causal: '속도 or 댐퍼'},
  {key: 'lane_change', label: '레인체인지 실패', speedRelated: true, causal: '속도 과다'},
  {key: 'parts', label: '파츠 이탈·파손', speedRelated: false, causal: '전압 무관'},
  {key: 'stall', label: '멈춤', speedRelated: false, causal: '전압 무관'},
  {key: 'other', label: '기타·기억 안 남', speedRelated: false, causal: '미상'},
] as const satisfies readonly RetireReasonNode[]

// (내부 타입 유틸) 트리 리터럴에서 leaf key 유니온을 재귀 추출 —
// children 있으면 branch(자기 key 제외, 하위로 재귀), 없으면 leaf(자기 key 채택).
type RetireReasonLeafKeyOf<N> = N extends {readonly children: readonly (infer C)[]}
  ? RetireReasonLeafKeyOf<C>
  : N extends {readonly key: infer K extends string}
    ? K
    : never
type RetireReasonTreeLeafKey = RetireReasonLeafKeyOf<(typeof RETIRE_REASON_TREE)[number]>

// (내부) leaf key 튜플 ↔ 트리 정합을 컴파일 타임에 양방향 검사하는 항등 헬퍼.
//  ① K extends readonly RetireReasonTreeLeafKey[] — 오타·branch key(jump 등) 차단
//  ② [RetireReasonTreeLeafKey] extends [K[number]] — 누락 차단(누락 시 에러 타입에 빠진 key 표시)
// 트리에 leaf를 추가하면 아래 튜플에도 추가해야 컴파일된다(단일 출처는 트리, 튜플은 검증된 사본).
function assertAllRetireReasonLeafKeys<K extends readonly RetireReasonTreeLeafKey[]>(
  keys: K &
    ([RetireReasonTreeLeafKey] extends [K[number]]
      ? unknown
      : ['RETIRE_REASON_TREE leaf 누락:', Exclude<RetireReasonTreeLeafKey, K[number]>]),
): K {
  return keys
}

// 저장 가능한 leaf key 튜플(트리 순회 순서) — retireReason enum·검증의 입력(z.enum).
// 리터럴 튜플이어야 스키마가 리터럴 유니온을 얻는다(런타임 트리 순회 파생은 리터럴 타입을 잃어
// string[]으로 넓어짐) → 직접 나열 + 위 헬퍼로 트리와의 정합을 컴파일 타임에 보장한다.
// key는 append-only 안정 식별자(리네임·삭제 금지) — 과거 저장 데이터의 rehydrate가 항상 통과.
export const RETIRE_REASON_LEAF_KEYS = assertAllRetireReasonLeafKeys([
  'corner',
  'jump_overshoot',
  'jump_attitude',
  'jump_rebound',
  'jump_other',
  'down_step',
  'wave',
  'lane_change',
  'parts',
  'stall',
  'other',
] as const)
export type RetireReason = (typeof RETIRE_REASON_LEAF_KEYS)[number]

// (내부) 트리 깊이 우선 탐색으로 루트→leaf 노드 경로를 찾는다. branch key는 매칭하지 않는다 —
// 저장 대상은 leaf뿐이고, leaf였던 섹션이 branch로 자라 기존 key가 하위 "그 외" leaf로 이동해도
// 경로 탐색이 자연히 새 위치를 찾는다(growth 규칙과 정합).
function findRetireReasonNodePath(
  nodes: readonly RetireReasonNode[],
  key: string,
): readonly RetireReasonNode[] | null {
  for (const node of nodes) {
    if (node.children) {
      const childPath = findRetireReasonNodePath(node.children, key)
      if (childPath) return [node, ...childPath]
      continue
    }
    if (node.key === key) return [node]
  }
  return null
}

function retireReasonNodePath(key: RetireReason): readonly RetireReasonNode[] {
  const path = findRetireReasonNodePath(RETIRE_REASON_TREE, key)
  // RetireReason ⊆ 트리 leaf 집합이 컴파일 타임에 보장되므로 실제로는 도달 불가(방어선)
  if (!path) throw new Error(`RETIRE_REASON_TREE에 없는 이탈 사유 leaf key: ${key}`)
  return path
}

/** 루트→leaf 라벨 경로 — 드릴다운 breadcrumb·행 표시용(예: ['점프', '비거리 김']) */
export function reasonPath(key: RetireReason): readonly string[] {
  return retireReasonNodePath(key).map(node => node.label)
}

/**
 * 목록 행 표시 라벨 (D-R3) — branch 하위 leaf는 섹션 문맥 병기('점프 · 비거리 김'),
 * top-level leaf는 라벨 그대로('코너 이탈'). n단으로 자라도 전체 경로를 ' · '로 잇는다.
 */
export function retireReasonRowLabel(key: RetireReason): string {
  return reasonPath(key).join(' · ')
}

/**
 * AI 계약: leaf부터 부모로 올라가며 speedRelated 첫 정의값 반환(미지정 시 부모 상속).
 * 경로 전체에 정의가 없으면 false(전압 처방 제외가 안전한 기본). 이번 라운드 UI 미사용.
 */
export function resolveSpeedRelated(key: RetireReason): boolean {
  const path = retireReasonNodePath(key)
  for (const node of [...path].reverse()) {
    if (node.speedRelated !== undefined) return node.speedRelated
  }
  return false
}

// ── 이탈 사유 → 주행 전 점검 항목 (race-autofill Phase 1 — requirements §핵심 산출 2, DL-038)
// 트리 causal 메타의 실행형 도메인 지식 — 화면별 카피가 아니라 leaf당 정비 상식 1~2항목(AF-A1:
// 문구는 사용자 검토로 조정 가능, 이 맵 1곳 수정). 앱이 측정하지 않는 세팅은 단정하지 않는다
// ("~확인" 수준). key는 트리와 동일하게 **append-only** — Record<RetireReason, ...> 타입이
// leaf 추가 시 맵 누락을 컴파일 에러로 강제한다.
// **전압 항목 전 leaf 미포함**: 전압 수치의 단독 출처는 advisor(DL-034)이고 시트에 이미
// 프리필+rationale이 있어 체크리스트에 담으면 중복·상충 채널이 된다 — speedRelated=true
// 계열도 비전압 정비 항목만 담는다.
export const RETIRE_REASON_PRERUN_ITEMS: Record<RetireReason, readonly string[]> = {
  corner: ['롤러 상태·스태빌라이저 확인'],
  jump_overshoot: ['브레이크 세팅 확인'],
  jump_attitude: ['댐퍼 상태 확인', '무게중심(배터리 위치) 확인'],
  jump_rebound: ['댐퍼 작동 확인', '타이어 상태 확인'],
  jump_other: ['점프 세팅(브레이크·댐퍼) 전반 확인'],
  down_step: ['브레이크·무게중심 확인'],
  wave: ['댐퍼·롤러 폭 확인'],
  lane_change: ['브레이크·롤러 각도 확인'],
  parts: ['롤러·기어 체결(나사 조임) 확인'],
  stall: ['배터리 잔량·접점 확인', '기어 물림·이물질 확인'],
  other: ['차체 전반 체결·배터리 확인'],
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

// ── AI 분석 전용 가중치 (R28/DL-032) — 추천용(1.5)과 **분리**한다.
// 추천기의 윈도우는 짧아(최근 완주까지·폴백 5건) 1.5^4 ≈ 5:1이지만, AI 분석은 최대 20건을 보내
// 같은 계수를 쓰면 1.5^19 ≈ **2217:1**이 되어 오래된 기록이 사실상 무의미해진다. 분석의 핵심은
// "회차 간 반복 사유 패턴 탐지"라 과거 기록이 근거로 살아 있어야 하므로 완만한 계수를 쓴다
// (1.1^19 ≈ 6:1 — 최신 우선 신호는 유지). 추천 품질 보존을 위해 위 상수는 건드리지 않는다.
export const ANALYZE_WEIGHT_GROWTH = 1.1

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

// ── 파노(f₀) 저장·표시 대역 (analysis-algorithm v2 canonical)
// write-strict 검증(shared/lib/schema/pano.ts panoHzWriteSchema)과 M-4 게이지 눈금이 이 상수 1곳을 공유한다.
// rehydrate(read)는 완화 검증(유한 양수 ≤ F0_REHYDRATE_MAX) — 대역 상수 변경이
// 기존 정상 데이터를 corrupt로 오판하지 않게 하는 write-strict/read-lenient 이원화 계약(SC-A8).
// 주의: 엔진 탐색 대역(DEFAULT_TUNING.fMin/fMax = 기본주파수 170~620)과 이 대역은 별개다 —
// 표시·저장값에 배수(PANO_DISPLAY_MULTIPLE)가 적용되면 그만큼 넓어야 한다.
export const F0_RANGE = {min: 170, max: 1400} as const
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
