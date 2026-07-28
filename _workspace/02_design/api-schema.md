# API Schema — minicar-motor-lab (도메인 데이터 계약)

> Phase 2 Wave 1 산출물. 입력: `project-brief.md` · `feature-plan.md`(§4 command/query 인벤토리 canonical) · `checkpoint-phase1.md`(CP-1~CP-3, D1/D2/D4, F-1~F-4) · `analysis-algorithm.md` v2(§7 Measurement 출력 계약) · `tech-stack.md`(zod 4.3.0 · idb 8 · TanStack Query 5.90 로컬 정책).
> **이 앱에는 HTTP API·서버·MSW가 없다** (AD-10 미도입 확정, axios 미설치, fetch 호출 0건). 따라서 이 문서는 REST 명세가 아니라 **IndexedDB 기반 도메인 command/query 계약의 단일 소스**다. REST endpoint·`ResponseSuccessType<T>` HTTP 봉투·`api.ts`(axios) 계약·MSW 핸들러는 전부 **해당 없음** — 유일한 응답 봉투는 `Result<T, DomainError>`이고, mock 경계는 합성 신호 fixture + fake-indexeddb seed다(DL-006).
> 소비자: Phase 3 **entity-query-builder**(queryOptions factory)와 **feature-mutation-builder**(command→mutation 어댑터)가 이 문서를 API 명세 대신 소비한다. mock-api-builder 산출물(MSW handlers/browser.ts)은 이 프로젝트에 존재하지 않는다.

## 0. 계약 총람 (REST 엔드포인트 목록 대체)

| 종류 | 이름 | 소유 slice | 입력 | 반환 | 화면/REQ |
|---|---|---|---|---|---|
| command | `initPersistence` | `shared/lib/persistence` | — | `Promise<PersistenceStatus>` | 전역 부트스트랩 / REQ-F-007 |
| command | `resetAllData` | `shared/lib/persistence` | — | `Promise<Result<void>>` | 복구 UI / REQ-ST-005(C-6) |
| helper | `withTransaction` | `shared/lib/persistence` | stores·mode·fn | `Promise<Result<T>>` | 내부 / REQ-ST-007 |
| command | `createMotor` | `entities/motor/api` | `CreateMotorInput` | `Promise<Result<Motor>>` | S3 시트 / REQ-F-003 |
| command | `updateMotor` | `entities/motor/api` | id + `UpdateMotorPatch` | `Promise<Result<Motor>>` | S3/S4 시트 / REQ-F-003 |
| command | `deleteMotorCascade` | `entities/motor/api` | id | `Promise<Result<{deletedRecordCount}>>` | confirm / REQ-ST-007, CP-3 |
| command | `createRecord` | `entities/run-record/api` | `CreateRecordDraft` | `Promise<Result<RunRecord>>` | S2 / REQ-F-004 |
| command | `deleteRecord` | `entities/run-record/api` | id | `Promise<Result<void>>` | S4 confirm / REQ-ST-007 |
| command | `setConfirmedMeasurement` | `entities/measurement/model` | `Measurement` | `void` (동기·무실패) | S1 stable / REQ-F-008 |
| command | `takeConfirmedMeasurement` | `entities/measurement/model` | — | `Measurement \| null` | S2 진입 / REQ-F-008(H-5) |
| command | `clearConfirmedMeasurement` | `entities/measurement/model` | — | `void` | S1/S2 / UX-A1·A3 |
| command | `startCapture` | `features/measure-session` | — | `Promise<Result<CaptureSession>>` | S1 / REQ-F-001, REQ-ST-001/002 |
| command | `stopCapture` | `features/measure-session` | — | `void` | S1 / UX-A1·A2 |
| command | `retryPermission` | `features/measure-session` | — | `Promise<Result<void>>` | S1 / REQ-ST-001 |
| command | `resumeAudio` | `features/measure-session` | — | `Promise<Result<void>>` | S1 / REQ-ST-004 |
| query | `listMotors` | `entities/motor/api` | — | `Promise<Motor[]>` (throw) | S2/S5 선택 / REQ-F-003/005 |
| query | `getMotorById` | `entities/motor/api` | id | `Promise<Motor \| undefined>` (throw) | S4 헤더 / REQ-F-005 |
| query | `countRecordsByMotor` | `entities/motor/api` | motorId | `Promise<number>` (throw) | cascade confirm / REQ-ST-007 |
| query | `listRecordsByMotor` | `entities/run-record/api` | motorId | `Promise<RunRecord[]>` (throw) | S4 / REQ-F-005/009 |
| query | `listMotorSummaries` | `entities/run-record/api` | — | `Promise<MotorSummary[]>` (throw) | S3 카드 / REQ-F-005 |
| query | `listSatisfiedRecords` | `entities/run-record/api` | motorId | `Promise<RunRecord[]>` (throw) | S5 입력 / REQ-F-006 |
| 순수 함수 | `computeGuide` | `features/voltage-guide/model` | `readonly RunRecord[]` | `GuideResult` (동기·무IO) | S5 / REQ-F-006, REQ-ST-006 |

command 14건 + query 6건 + 순수 함수 1건 + 내부 helper 1건 — feature-plan §4 인벤토리 전수 승계, **신규 command 없음**.

### 채널 규약 (봉투 통일)

- **command(mutation)**: `Result<T, DomainError>` 반환 — 실패를 값으로 전파, throw로 UI를 관통하지 않는다. React 계층에서는 `unwrap()` 어댑터가 `ok:false`를 throw로 변환해 `useMutation`의 error 채널·invalidation과 접속한다.
- **query(read)**: 성공 값을 직접 반환하고 실패는 `DomainError`를 **throw** — TanStack Query error 상태로 수렴한다(`retry:false`, 재시도는 명시 `refetch` 버튼). **읽기 실패 시 빈 배열 반환(위장) 금지**(D-10). `getMotorById`의 `undefined`는 오류가 아니라 "부재"라는 정상 도메인 결과다.
- **측정 세션 command**: `Result` 실패의 `capture-*` 코드를 F2 상태 머신이 `MeasureStatus`(`no-permission`/`suspended` 등)로 매핑한다. query 캐시와 무관.
- **measurement handoff**: 동기 in-memory single-slot — 실패 경로 없음, `Result` 봉투 불필요.

```ts
// src/shared/lib/result/index.ts
export type Result<T, E = DomainError> = { ok: true; value: T } | { ok: false; error: E }

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })

/** mutationFn 어댑터: ok:false면 DomainError를 throw — useMutation error 채널 접속용 */
export function unwrap<T>(result: Result<T, DomainError>): T {
  if (!result.ok) throw result.error
  return result.value
}
```

## 1. shared/config 도메인 상수 (enum 단일 원천)

모든 enum 저장값은 **영문 snake_case 안정 식별자**, 한국어 라벨은 라벨 맵에서만 — D4·CP-1a 어휘 교체 시 라벨 맵 1곳만 수정한다(교체 지점 1곳 원칙, feature-plan §8).

```ts
// src/shared/config/domain.ts
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

// ── 주행 결과 (D4 baseline: 완주·코스아웃·미주행(측정만) — Phase 3 전 어휘 재확인 가능, 라벨 맵만 교체)
export const RUN_RESULTS = ['finished', 'course_out', 'not_run'] as const
export type RunResult = (typeof RUN_RESULTS)[number]
export const RUN_RESULT_LABELS: Record<RunResult, string> = {
  finished: '완주',
  course_out: '코스아웃',
  not_run: '미주행(측정만)',
}

// ── 전압 (A5 baseline)
export const VOLTAGE_RANGE = { min: 0.1, max: 9.9, step: 0.1, maxDecimals: 2 } as const

// ── 가이드 (D1 / A6 baseline)
export const GUIDE_MIN_SATISFIED = 3
export const WIDE_VARIANCE_THRESHOLD = 0.5 // V — (max − min) ≥ 임계 시 분산 큼 보조 문구

// ── 표시 라벨 (CP-2 확정: 파노 = f₀ Hz — 라벨/환산식만 이곳에서 교체)
export const PANO_LABEL = '파노'

// ── 입력 길이 상한 (AS-1 신규 baseline — 요구 문서에 상한 없음, 임의 확정 아님·검토 대상)
export const MOTOR_NAME_MAX_LENGTH = 30
export const MOTOR_MEMO_MAX_LENGTH = 200
```

## 2. 엔티티 zod 스키마 (rehydrate = 외부 입력 검증, AD-7)

IndexedDB persisted 데이터는 **외부 입력으로 취급** — 읽기 경로에서 zod 검증하고 type assertion을 금지한다(REQ-F-007/NFR-006). UI 인라인 검증·command precondition·rehydrate가 **동일 스키마를 공유**한다.

### 2.1 필드 규칙 (전 엔티티 공통)

| 규칙 | 내용 |
|---|---|
| ID | UUID v4, `crypto.randomUUID()` — command가 생성, 호출자 지정 불가 (FP-A3) |
| 시각 | ISO 8601 **UTC `Z` 고정** (`new Date().toISOString()`), `z.iso.datetime()` 검증. 표시 변환은 `Intl.DateTimeFormat('ko-KR')` 표시 계층 전담. 정렬 = ISO 문자열 비교, **동률 시 2차 키 `id`** (FP-A3) |
| `null` vs 생략 | `null` = "값 없음이 도메인 사실"(측정 없이 기록 — D2). 필드 **생략(optional)** = "항목 자체가 선택"(statusMemo). undefined 필드는 IndexedDB에 저장하지 않는다 |
| pagination | **없음** — 목록 query에 page/size/totalCount 미적용 (A7 규모 모터 30·기록 1,000을 단순 전체 목록으로 수용, feature-plan §0) |
| enum evolution | 저장값은 안정 식별자 — **라벨 교체는 자유**(라벨 맵 1곳). 값 **추가**는 additive(구 데이터 rehydrate 통과). 값 **제거·개명**은 schemaVersion bump + data migration 필수(state-contract 위임 ②) |
| unknown key | rehydrate 시 알 수 없는 키는 strip(zod 기본) — additive migration 전방 호환 허용 |

> **필드명 표준화(NR-1)**: feature-plan §3 초안의 `fanoHz` 표기를 파노(pano) romanization에 맞는 **`panoHz`로 정정·표준화**한다. 본 문서가 필드명 canonical — state-contract·Phase 3 빌더는 `panoHz`만 사용한다. 같은 이유로 Measurement 값 객체의 `f0`도 `panoHz`로 통일한다(엔진 내부 `DisplayEstimate.f0`는 analysis-algorithm v2 canonical대로 유지 — F2가 stable 확정 시 `f0 → panoHz` 매핑).

### 2.2 Motor

```ts
// src/entities/motor/model/schema.ts
import { z } from 'zod'
import {
  MOTOR_STATUS_GRADES,
  MOTOR_NAME_MAX_LENGTH, MOTOR_MEMO_MAX_LENGTH,
} from '@shared/config/domain'

export const motorStatusGradeSchema = z.enum(MOTOR_STATUS_GRADES) // CP-1a — 상수 1곳 참조

export const motorSchema = z.object({
  id: z.uuid(),                                     // 구조 필드 — 생성 후 불변
  name: z.string().trim().min(1, '이름을 입력해 주세요').max(MOTOR_NAME_MAX_LENGTH),
  statusGrade: motorStatusGradeSchema.nullable(),   // CP-1: 선택형 enum — null=미지정 (checkpoint-phase2)
  statusMemo: z.string().trim().min(1).max(MOTOR_MEMO_MAX_LENGTH).optional(), // CP-1: 자유 텍스트 병행 — '' 저장 금지(생략)
  createdAt: z.iso.datetime(),                      // 구조 필드 — 불변
  updatedAt: z.iso.datetime(),                      // updateMotor 성공 시에만 갱신
})
export type Motor = z.infer<typeof motorSchema>

// command 입력 — 구조 필드(id·createdAt·updatedAt)는 타입 차원에서 배제
export const createMotorInputSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요').max(MOTOR_NAME_MAX_LENGTH),
  statusGrade: motorStatusGradeSchema.nullable().default(null),
  statusMemo: z.string().trim().max(MOTOR_MEMO_MAX_LENGTH).optional()
    .transform(v => (v === '' ? undefined : v)),    // 빈 문자열 → 생략 정규화
})
export type CreateMotorInput = z.input<typeof createMotorInputSchema>

export const updateMotorPatchSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요').max(MOTOR_NAME_MAX_LENGTH),
  statusGrade: motorStatusGradeSchema.nullable(),   // null 지정 = 등급 해제(재탭 deselect → 미지정 복귀)
  statusMemo: z.string().trim().max(MOTOR_MEMO_MAX_LENGTH).optional()
    .transform(v => (v === '' ? undefined : v)),
}).partial()                                        // 편집 필드만 — 구조 필드 불변식은 스키마가 강제
export type UpdateMotorPatch = z.infer<typeof updateMotorPatchSchema>
```

파생 값(기록 수·최근 기록 요약·"최근 사용순" 정렬 키)은 **영속·캐시 금지** — records에서 매번 계산(이중 원본 금지, FP-A1).

### 2.3 RunRecord (immutable — 생성·삭제만, FP-A4)

```ts
// src/entities/run-record/model/schema.ts
import { z } from 'zod'
import { RUN_RESULTS, VOLTAGE_RANGE } from '@shared/config/domain'

export const runResultSchema = z.enum(RUN_RESULTS) // D4 — 상수 1곳 참조

// A5: 0.1~9.9 V, 소수 최대 2자리 — float 안전 검사(× 100 후 정수 근접 비교, `% 1` 직접 비교 금지)
export const voltageSchema = z.number()
  .min(VOLTAGE_RANGE.min, `전압은 ${VOLTAGE_RANGE.min} V 이상이어야 합니다`)
  .max(VOLTAGE_RANGE.max, `전압은 ${VOLTAGE_RANGE.max} V 이하여야 합니다`)
  .refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9, '전압은 소수 둘째 자리까지 입력할 수 있습니다')

// 파노 저장 정밀도 = 소수 1자리 (v2 출력 계약과 저장 일치 — AS-3), 탐색 대역 검증은 엔진 계층 소관
export const panoHzSchema = z.number().positive().finite()
  .refine(v => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9, '파노는 소수 첫째 자리까지 저장합니다')

const measurementPairInvariant = (
  r: { panoHz: number | null; rpm: number | null },
  ctx: z.RefinementCtx,
) => {
  if ((r.panoHz === null) !== (r.rpm === null)) {
    ctx.addIssue({ code: 'custom', path: ['rpm'], message: '측정값은 파노·RPM 쌍으로만 존재합니다' })
  } else if (r.panoHz !== null && r.rpm !== Math.round(r.panoHz * 60)) {
    ctx.addIssue({ code: 'custom', path: ['rpm'], message: 'RPM은 파노 × 60 반올림 정수여야 합니다' }) // CP-2/A2
  }
}

export const runRecordSchema = z.object({
  id: z.uuid(),                                  // 구조 필드 — 불변
  motorId: z.uuid(),                             // FK 구조 필드 — dangling 금지 (REQ-ST-007)
  voltage: voltageSchema,
  panoHz: panoHzSchema.nullable(),               // D2 확정: 측정 없이 null 허용
  rpm: z.number().int().positive().nullable(),   // 불변식: (panoHz===null)===(rpm===null) && rpm===round(panoHz×60)
  result: runResultSchema,
  satisfied: z.boolean(),                        // 가이드 집계의 유일 원천 — result와 독립
  createdAt: z.iso.datetime(),                   // 구조 필드 — 시간 역순 정렬 키
}).superRefine(measurementPairInvariant)
export type RunRecord = z.infer<typeof runRecordSchema>

// command 입력 — id/createdAt은 command가 생성
export const createRecordDraftSchema = z.object({
  motorId: z.uuid(),
  voltage: voltageSchema,
  panoHz: panoHzSchema.nullable().default(null),
  rpm: z.number().int().positive().nullable().default(null),
  result: runResultSchema,
  satisfied: z.boolean(),
}).superRefine(measurementPairInvariant)
export type CreateRecordDraft = z.input<typeof createRecordDraftSchema>
```

### 2.4 Measurement 값 객체 (비영속 — IndexedDB에 저장하지 않음)

```ts
// src/entities/measurement/model/schema.ts
import { z } from 'zod'
import { panoHzSchema } from '@entities/run-record' // 재사용 불가 시 shared로 승격 — 중복 정의 금지

export const measurementSchema = z.object({
  panoHz: z.number().positive().finite(),  // 엔진 DisplayEstimate.f0 — stable 확정 중앙값, 소수 1자리 반올림(F2 책임)
  rpm: z.number().int().positive(),        // Math.round(panoHz × 60) — CP-2
  confidence: z.number().min(0).max(1),    // 내부 게이트 판정용 — UI 비노출, RunRecord에 저장 안 함 (FP-A2)
  capturedAt: z.iso.datetime(),            // stable 확정 시각 — handoff 신선도 표시용, RunRecord에 저장 안 함 (FP-A2)
}).refine(m => m.rpm === Math.round(m.panoHz * 60), 'RPM은 파노 × 60 반올림 정수여야 합니다')
export type Measurement = z.infer<typeof measurementSchema>
```

> `panoHzSchema` 공유 참고: entities 간 직접 import가 FSD 규칙에 걸리면 `shared/lib/schema/pano.ts`로 승격한다(스키마 정의는 1곳 원칙). 구현 시 entity-query-builder가 위치를 확정하되 **중복 정의는 금지**.

### 2.5 DbMeta·파생 view 타입

```ts
// src/shared/lib/persistence/schema.ts
export const dbMetaSchema = z.object({ schemaVersion: z.number().int().positive() })
export type DbMeta = z.infer<typeof dbMetaSchema>
export type PersistenceStatus = 'ready' | 'unavailable' | 'corrupt'

// src/entities/run-record/model/types.ts — 파생 view (영속·캐시 금지, 매 조회 계산)
export interface MotorSummary {
  motor: Motor
  recordCount: number
  lastRecord?: RunRecord   // max createdAt — "최근 사용순" 정렬 키 원천 (FP-A1)
}
```

IndexedDB object store: `motors`(keyPath `id`) / `records`(keyPath `id`, index `by-motorId`, `by-createdAt`) / `meta`. schemaVersion v1 정의·migration·invalid-state recovery 절차는 **state-contract-designer 위임 ②** — 본 문서는 스키마 표면만 고정한다.

## 3. DomainError Taxonomy (HTTP 없음 — 상태 코드·axios 매핑 해당 없음)

HTTP가 없으므로 400/404/500 상태 코드, `api.ts` AppError, QUERY_CLIENT 템플릿의 HTTP retry 로직은 **전부 해당 없음**(AD-4a에서 제거 대상 명시). 오류는 아래 단일 taxonomy로 수렴한다.

```ts
// src/shared/lib/errors/domain-error.ts
export type DomainErrorCode =
  // ── persistence·command 계열 (Result 봉투로 전파)
  | 'validation'            // zod/precondition 실패 — fieldErrors 동반
  | 'not-found'             // 대상 entity 부재 (update/delete/FK 확인)
  | 'storage-unavailable'   // IndexedDB open 불가 — private 모드 등 (C-5)
  | 'quota-exceeded'        // 쓰기 quota 초과 (C-4)
  | 'transaction-failed'    // 트랜잭션 abort — 부분 반영 없음 보장 (C-3/C-4)
  | 'data-corrupt'          // rehydrate zod 검증 실패·migration 불가 (C-6)
  // ── capture 계열 (F2 상태 머신이 MeasureStatus로 매핑 — 전역 오류 UI로 보내지 않음)
  | 'capture-insecure-context'            // isSecureContext===false (D-4)
  | 'capture-permission-denied'           // 일시 거부 (D-2)
  | 'capture-permission-denied-permanent' // 영구 거부 — Permissions API 가용 시 감지, iOS fallback: 재요청 실패 반복 시 승격 (D-3, CP F-2)
  | 'capture-suspended'                   // AudioContext.state !== 'running' (D-5)
  | 'capture-device-error'                // 마이크 장치 없음·getUserMedia 기타 실패

export class DomainError extends Error {
  readonly code: DomainErrorCode
  readonly fieldErrors?: Readonly<Record<string, string>>
  constructor(code: DomainErrorCode, message: string,
    options?: { cause?: unknown; fieldErrors?: Record<string, string> }) {
    super(message, { cause: options?.cause })
    this.name = 'DomainError'
    this.code = code
    this.fieldErrors = options?.fieldErrors
  }
}
export const isDomainError = (e: unknown): e is DomainError => e instanceof DomainError

/** z.ZodError → DomainError('validation') — issue.path.join('.') → message 매핑 */
export function fromZodError(error: z.ZodError): DomainError { /* 구현: Phase 3 */ }
```

### 코드 ↔ 사용자 메시지 ↔ UI 처리 매핑

| code | 발생 지점 | 기본 사용자 메시지 | UI 처리 (ux-brief 계약) |
|---|---|---|---|
| `validation` | command precondition·zod | (fieldErrors를 필드 인라인으로) "입력값을 확인해 주세요" | 필드 인라인 오류, 입력 유지, 저장 버튼 재활성 (H-2) |
| `not-found` | updateMotor/delete*/createRecord FK | "대상을 찾을 수 없습니다. 목록을 새로고침해 주세요" | 토스트 + 관련 query invalidate (stale 목록 정정) |
| `storage-unavailable` | DB open·write (private 모드) | "기록 저장을 사용할 수 없습니다 (측정은 가능)" | 전역 고정 배너 (C-5) — 측정 기능은 정상 동작 |
| `quota-exceeded` | write 시 QuotaExceededError | "저장 공간이 부족합니다. 오래된 기록을 삭제해 주세요" | 입력 유지 + 오류 배너 + [다시 저장] (C-4) |
| `transaction-failed` | tx abort (cascade·FK 확인 포함) | "저장 중 오류가 발생했습니다. 다시 시도해 주세요" | 입력 유지 + 재시도. **부분 반영 없음**(원자성 — 위임 ①) |
| `data-corrupt` | rehydrate 검증·migration 실패 | "저장된 데이터를 읽을 수 없습니다" | 복구 UI 진입 (C-6, `resetAllData` 경로) — crash loop 금지 |
| `capture-insecure-context` | startCapture 진입 가드 | "HTTPS 연결에서만 측정할 수 있습니다" | S1 활성화 불가 상태 (D-4) — 권한 오류와 혼용 금지 |
| `capture-permission-denied` | getUserMedia 거부 | "마이크 권한이 필요합니다" + [다시 요청] | S1 `no-permission`(일시) (D-2) |
| `capture-permission-denied-permanent` | 영구 거부 감지 | "브라우저 설정에서 마이크 권한을 허용해 주세요" + [설정 안내] | S1 `no-permission`(영구) (D-3) |
| `capture-suspended` | AudioContext suspended | "탭하여 다시 시작" | S1 `suspended` 전용 상태 (D-5) |
| `capture-device-error` | 장치 부재·기타 | "마이크를 사용할 수 없습니다" | S1 idle 복귀 + 토스트 |

메시지 문자열은 `shared/lib/errors/messages.ts`의 `DOMAIN_ERROR_MESSAGES: Record<DomainErrorCode, string>` 1곳에서 관리 — command는 기본 메시지를 쓰고 문맥 메시지가 필요하면 생성 시 override한다. `weak-signal`은 오류가 아니라 **MeasureStatus 상태**(수치 미표시)임에 주의 — 이 taxonomy에 포함되지 않는다.

## 4. Command 계약 전수 (14건)

공통 postcondition: 영속 command 성공 시 §6 invalidation 매트릭스대로 query 캐시를 무효화한다. 검증은 **UI 인라인 + command precondition 이중 수행**(동일 zod 스키마 공유) — UI 검증에만 의존 금지.

### 4.1 Persistence — `shared/lib/persistence` (F4)

| command | 시그니처 | precondition | postcondition / 오류 | invalidate |
|---|---|---|---|---|
| `initPersistence` | `() => Promise<PersistenceStatus>` | 없음 — app 부트스트랩 1회 | `'ready'`(open+version 확인+migrate 성공) / `'unavailable'`(open 불가 — 측정 가능 배너) / `'corrupt'`(migrate·검증 실패 — 복구 UI). **throw하지 않음** — 실패도 상태 값으로 수렴(crash loop 금지) | — |
| `resetAllData` | `() => Promise<Result<void>>` | REQ-ST-007급 confirm 완료(CP F-1: 명시 확인 + 삭제 범위 고지 + 초기 포커스 [취소]) — confirm은 호출 feature 책임 | 전 store 비움 + meta 현행 schemaVersion 재기록. 오류: `storage-unavailable`·`transaction-failed` | `queryClient.clear()` 후 재조회 |
| `withTransaction` (내부 helper) | `<T>(storeNames: StoreName[], mode: IDBTransactionMode, fn: (tx) => Promise<T>) => Promise<Result<T>>` | — | fn 내 오류 시 `tx.abort()` → `transaction-failed`(부분 반영 없음). quota는 `quota-exceeded`로 구분 매핑. 원자성·롤백 상세 계약은 **state-contract 위임 ①** | — (호출 command가 담당) |

### 4.2 Motor — `entities/motor/api` (F5)

| command | 입력 스키마 | precondition | postcondition / 오류 | invalidate |
|---|---|---|---|---|
| `createMotor(input)` → `Promise<Result<Motor>>` | `createMotorInputSchema` | name trim 후 1자 이상 (C-7) | id=`crypto.randomUUID()`, createdAt=updatedAt=now — command가 생성. 오류: `validation`·`storage-unavailable`·`quota-exceeded`·`transaction-failed` | `motorKeys.root` |
| `updateMotor(id, patch)` → `Promise<Result<Motor>>` | `z.uuid()` + `updateMotorPatchSchema` | 대상 존재. patch는 **편집 필드만**(name·statusGrade·statusMemo) — 구조 필드(id·createdAt)는 타입에서 제외 | updatedAt만 추가 갱신. 오류: `validation`·`not-found`·`storage-unavailable`·`quota-exceeded`·`transaction-failed` | `motorKeys.root` |
| `deleteMotorCascade(id)` → `Promise<Result<{deletedRecordCount: number}>>` | `z.uuid()` | 대상 존재(부재 → `not-found`). confirm("기록 n건이 함께 삭제됩니다", n=`countRecordsByMotor` **직전 실측치**)은 feature 책임, precondition 재검증은 command 책임 (CP-3 확정) | motors+records **단일 트랜잭션**(`withTransaction(['motors','records'],'readwrite')`) — 완료 후 dangling reference 0건, 취소·실패 시 무변경 (C-3). 오류: `not-found`·`storage-unavailable`·`transaction-failed` | `motorKeys.root` + `recordKeys.root` + `guideKeys.root` |

### 4.3 RunRecord — `entities/run-record/api` (F6)

| command | 입력 스키마 | precondition | postcondition / 오류 | invalidate |
|---|---|---|---|---|
| `createRecord(draft)` → `Promise<Result<RunRecord>>` | `createRecordDraftSchema` | ① motor 존재를 **동일 트랜잭션에서 확인**(motors+records rw — dangling 금지, 위임 ①) ② voltage A5 재검증 ③ panoHz/rpm 쌍·파생 불변식 ④ D2: 측정값 생략 시 null 저장 | id/createdAt은 command 생성. 오류: `validation`·`not-found`(motor 부재)·`storage-unavailable`·`quota-exceeded`·`transaction-failed`. 실패 시 폼 입력 유지 + [다시 저장] (C-4/H-4는 UI 계약) | `recordKeys.root` + `motorKeys.summaries()` + `guideKeys.root` |
| `deleteRecord(id)` → `Promise<Result<void>>` | `z.uuid()` | confirm 후 호출(feature 책임). 대상 부재 → `not-found`(stale 목록 감지 계기) | 삭제 즉시 목록·가이드 파생값 반영 (C-2). 오류: `not-found`·`storage-unavailable`·`transaction-failed` | `recordKeys.root` + `motorKeys.summaries()` + `guideKeys.root` |

RunRecord update command는 **존재하지 않는다** (immutable — FP-A4, 측정 신뢰성 보호).

### 4.4 Measurement handoff — `entities/measurement/model` (F3, 비영속 in-memory single-slot)

| command | 시그니처 | 계약 |
|---|---|---|
| `setConfirmedMeasurement` | `(m: Measurement) => void` | F2가 **stable 확정 시에만** 호출. `measurementSchema` 검증 후 single-slot 덮어쓰기. weak-signal·measuring 값 게시 금지 |
| `takeConfirmedMeasurement` | `() => Measurement \| null` | S2 진입 시 **1회 소비**(slot 비움). null → "측정값 없음" 카드 (H-5) — 절대 이전 값·오값을 반환하지 않음 |
| `clearConfirmedMeasurement` | `() => void` | [다시 측정]·측정값 비우기(UX-A1/A3) 시 slot 비움 |

동기·무실패 — `Result` 봉투·query 캐시 무관. 저장소는 zustand 또는 모듈 스코프 변수(전역 영속 store 금지).

### 4.5 측정 세션 — `features/measure-session` (F2, 비영속)

| command | 시그니처 | precondition / 오류 → 상태 매핑 |
|---|---|---|
| `startCapture` | `() => Promise<Result<CaptureSession>>` | **사용자 탭 핸들러 내 호출**(iOS 제스처) + `isSecureContext`(아니면 `capture-insecure-context`). getUserMedia(echoCancellation/noiseSuppression/autoGainControl **off**, mono) + `resume()`. 실제 `AudioContext.sampleRate`를 Worker에 전달(48 kHz 가정 금지). 거부 → `capture-permission-denied(-permanent)`. 성공 postcondition: AudioContext `running`, `DisplayEstimate` 스트림 ≥10 Hz |
| `stopCapture` | `() => void` | stable 확정 시 자동 호출(UX-A1)·탭 전환/백그라운드 시 호출(UX-A2). 실패 없음 |
| `retryPermission` | `() => Promise<Result<void>>` | `no-permission`(일시)에서만. 실패 반복 시 영구 안내로 승격 (CP F-2 — Permissions API 가용 시 우선 사용, iOS fallback) |
| `resumeAudio` | `() => Promise<Result<void>>` | `suspended`에서만. 성공 시 `state==='running'` 확인 후 measuring 복귀 — 아니면 측정 시작 금지(D-5) |

```ts
// features/measure-session/model/types.ts (참고 형태 — 확정은 state-contract)
interface CaptureSession { sampleRate: number; stop(): void }
```

`capture-*` 오류는 상태 머신이 소비해 `MeasureStatus`로 전환할 뿐 전역 오류 UI·query 캐시로 가지 않는다. Worker 프로토콜(in: `{pcm: Float32Array(transferable), sampleRate}` / out: `DisplayEstimate`)은 analysis-algorithm v2 + `shared/lib/audio-analysis/protocol.ts` canonical — 본 문서 범위 외.

## 5. Query 계약 전수 (6건)

전 query 공통: 실패 시 `DomainError` throw(`storage-unavailable`·`data-corrupt`·`transaction-failed`) — **빈 목록 위장 금지**(D-10). rehydrate 검증: 반환 전 `z.array(스키마)` 파싱, 실패 → `data-corrupt`.

| query | 시그니처 | 계약 요점 | query key |
|---|---|---|---|
| `listMotors` | `() => Promise<Motor[]>` | S2/S5 모터 선택 리스트 원본. 정렬은 소비 측 파생 계산("최근 사용순" — FP-A1) | `motorKeys.list()` |
| `getMotorById` | `(id: string) => Promise<Motor \| undefined>` | S4 헤더. `undefined` = 부재(정상 결과 — S4 not-found UI 분기), throw = 읽기 실패 | `motorKeys.detail(id)` |
| `countRecordsByMotor` | `(motorId: string) => Promise<number>` | cascade confirm "기록 n건" **실측치** — 캐시하지 않고 confirm 직전 직접 호출(stale 건수 고지 방지) | 없음 (명령형 호출) |
| `listRecordsByMotor` | `(motorId: string) => Promise<RunRecord[]>` | `by-motorId` index → createdAt **역순**(동률 시 id 역순) — S4 이력·가이드 근거 공용 | `recordKeys.byMotor(motorId)` |
| `listMotorSummaries` | `() => Promise<MotorSummary[]>` | S3 카드용 파생 view — motors+records 조인 계산, 영속·캐시 금지. 정렬: 최근 사용순(lastRecord.createdAt ?? motor.createdAt 내림차순) | `motorKeys.summaries()` |
| `listSatisfiedRecords` | `(motorId: string) => Promise<RunRecord[]>` | `satisfied === true`만 — 가이드 입력. 단독 화면 소비 없음(가이드 queryFn 내부 합성 전용 — 별도 키 없음) | (guide key에 합성) |

## 6. TanStack Query 설계 (entity-query-builder 입력)

### 6.1 로컬 정책 재확인 (AD-4a — 고정, 변경 금지)

```ts
// src/app/providers/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',   // 기본 'online'은 오프라인에서 IndexedDB 쿼리를 pause — 로컬 데이터에 치명
      staleTime: Infinity,     // 데이터 변경 경로는 자체 command뿐 — mutation 후 명시 invalidate가 유일한 갱신
      retry: false,            // IndexedDB 오류에 자동 재시도 무의미 — 명시 [다시 시도] 버튼이 refetch
      refetchOnWindowFocus: false,
    },
    mutations: { networkMode: 'always', retry: false },
  },
})
```

project-init QUERY_CLIENT 템플릿의 AppError/HTTP retry 로직은 제거한다. 오프라인에서도 전 query 정상 동작이 수용 기준이다.

### 6.2 Query Key Factory

```ts
// src/entities/motor/api/keys.ts
export const motorKeys = {
  root: ['motors'] as const,
  list: () => [...motorKeys.root, 'list'] as const,
  detail: (id: string) => [...motorKeys.root, 'detail', id] as const,
  summaries: () => [...motorKeys.root, 'summaries'] as const, // records 파생 — record mutation도 invalidate
}

// src/entities/run-record/api/keys.ts
export const recordKeys = {
  root: ['records'] as const,
  byMotor: (motorId: string) => [...recordKeys.root, 'by-motor', motorId] as const,
}

// src/features/voltage-guide/api/keys.ts
export const guideKeys = {
  root: ['guide'] as const,
  byMotor: (motorId: string) => [...guideKeys.root, motorId] as const,
}
```

### 6.3 queryOptions Factory (규약 예시)

```ts
// src/entities/motor/api/queries.ts
import { queryOptions } from '@tanstack/react-query'

export const motorQueries = {
  list: () => queryOptions({ queryKey: motorKeys.list(), queryFn: listMotors }),
  detail: (id: string) => queryOptions({ queryKey: motorKeys.detail(id), queryFn: () => getMotorById(id) }),
  summaries: () => queryOptions({ queryKey: motorKeys.summaries(), queryFn: listMotorSummaries }),
}

// src/entities/run-record/api/queries.ts
export const recordQueries = {
  byMotor: (motorId: string) =>
    queryOptions({ queryKey: recordKeys.byMotor(motorId), queryFn: () => listRecordsByMotor(motorId) }),
}

// src/features/voltage-guide/api/queries.ts — listSatisfiedRecords + computeGuide 합성 (추천값 캐시는 in-memory query 캐시뿐 — 영속 금지 준수)
export const guideQueries = {
  byMotor: (motorId: string) =>
    queryOptions({
      queryKey: guideKeys.byMotor(motorId),
      queryFn: async () => computeGuide(await listSatisfiedRecords(motorId)),
    }),
}
```

### 6.4 Mutation → Invalidation 매트릭스 (feature-mutation-builder 입력)

| command | invalidate 대상 (전부 `await queryClient.invalidateQueries({queryKey})`) |
|---|---|
| `createMotor` | `motorKeys.root` |
| `updateMotor` | `motorKeys.root` |
| `deleteMotorCascade` | `motorKeys.root` · `recordKeys.root` · `guideKeys.root` |
| `createRecord` | `recordKeys.root` · `motorKeys.summaries()` · `guideKeys.root` |
| `deleteRecord` | `recordKeys.root` · `motorKeys.summaries()` · `guideKeys.root` |
| `resetAllData` | `queryClient.clear()` (전체 캐시 파기 후 재조회) |
| measurement handoff 3건·세션 4건 | 없음 (query 캐시 밖) |

mutation 어댑터 규약: `mutationFn: (input) => unwrap(command(input))` — `ok:false`가 throw로 변환되어 `onError`에서 `isDomainError` 분기(§3 UI 처리 매핑), `onSuccess`에서 위 매트릭스 invalidate. 파생 값(기록 수·최근 요약·추천 범위)은 invalidation으로만 갱신 — 수동 캐시 조작(setQueryData) 금지(stale 위험 < 단순성).

## 7. computeGuide 순수 함수 계약 (F8)

```ts
// src/features/voltage-guide/model/compute-guide.ts
import { GUIDE_MIN_SATISFIED, WIDE_VARIANCE_THRESHOLD } from '@shared/config/domain'

export type GuideResult =
  | {
      kind: 'recommendation'
      rangeMin: number                 // 만족 기록 전압 min (A6)
      rangeMax: number                 // 만족 기록 전압 max (A6)
      satisfiedCount: number
      distribution: readonly { voltage: number; count: number }[] // 전압 오름차순 그룹
      wideVariance: boolean            // 폭 ≥ 0.5 V → 보조 문구 (E-4)
      evidence: readonly RunRecord[]   // 근거 기록 — createdAt 역순(동률 시 id 역순)
    }
  | { kind: 'insufficient'; satisfiedCount: number; needed: number } // needed = GUIDE_MIN_SATISFIED − n

export function computeGuide(satisfied: readonly RunRecord[]): GuideResult
```

| 항목 | 계약 |
|---|---|
| 입력 | `listSatisfiedRecords` 결과(만족 기록 배열). 방어적으로 `satisfied !== true` 항목은 무시(멱등) |
| IO | 없음 — 부수효과·비동기·전역 접근 금지. seed 배열만으로 Vitest 검증 |
| 부족 판정 | `n < GUIDE_MIN_SATISFIED(3)` → `{ kind:'insufficient', satisfiedCount:n, needed: 3−n }` — UI 문구 "n건 더 필요 (n/3)" (D1/E-2) |
| 추천 범위 | 전압 min~max (A6). 평균·중앙값 아님 — 근거 투명성 원칙 |
| 분포 | 동일 전압 그룹핑 `{voltage, count}`, 전압 오름차순 — S5 "2.8 V × 1 · 2.9 V × 1 · 3.0 V × 2" 텍스트 원천 |
| wideVariance | **float 안전 비교 필수**: `Math.round((max−min)*100) >= Math.round(WIDE_VARIANCE_THRESHOLD*100)` — `2.9−2.4=0.4999…` 같은 부동소수 오차로 임계 경계가 뒤집히는 결함 방지 |
| 측정값 null | 가이드는 voltage·satisfied만 사용 — panoHz/rpm null 기록도 동등하게 집계(D2 정합) |
| 캐시 | 결과를 IndexedDB·전역 store에 영속 금지 — TanStack Query in-memory 캐시 + invalidation만 (stale 금지) |

## 8. 샘플 Fixture (단위 테스트 · Playwright seed 공유 canonical)

`src/shared/testing/seeds/`에 위치. **이 값이 canonical** — unit(fake-indexeddb)과 Playwright seed 주입 helper가 동일 상수를 import한다. 변형 시나리오(empty/max 30·1,000건/손상 seed — feature-plan §6)는 이 normal seed를 기준으로 파생 생성한다. ID는 결정적 UUID v4 형식(version 4·variant 8 — `z.uuid()` 통과).

### 8.1 모터 3개 (등급 다양)

```ts
// src/shared/testing/seeds/motors.seed.ts
import type { Motor } from '@entities/motor'

export const MOTOR_SEED: readonly Motor[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: '하이퍼대시 3 대회용',
    statusGrade: 'prime',                       // 전성기
    statusMemo: '길들이기 완료, 대회 주력',
    createdAt: '2026-07-01T09:00:00.000Z',
    updatedAt: '2026-07-12T04:30:00.000Z',      // 등급 갱신 이력 있음
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: '레브튠 2번',
    statusGrade: 'breaking_in',                 // 길들이기중
    statusMemo: '7월 구입, 저전압 길들이기 진행 중',
    createdAt: '2026-07-15T02:30:00.000Z',
    updatedAt: '2026-07-15T02:30:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: '아토믹튠 노랑',
    statusGrade: 'worn',                        // 노화
    // statusMemo 생략 — optional 필드 부재 케이스 (rehydrate 검증 커버)
    createdAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-07-19T13:00:00.000Z',
  },
]
```

### 8.2 기록 12건 (만족 9 / 불만족 3 · 측정값 null 2건 · 전압 2.4~3.2 V · 결과 3종 전부)

```ts
// src/shared/testing/seeds/records.seed.ts
import type { RunRecord } from '@entities/run-record'

const M1 = '00000000-0000-4000-8000-000000000001' // prime — 만족 4건 → 정상 추천 (E-3)
const M2 = '00000000-0000-4000-8000-000000000002' // breaking_in — 만족 2건 → 부족 (E-2)
const M3 = '00000000-0000-4000-8000-000000000003' // worn — 만족 3건·폭 0.6 V → 분산 큼 (E-4)

export const RECORD_SEED: readonly RunRecord[] = [
  // ── 모터 1 (5건): 만족 전압 2.8/2.9/3.0/3.0 → 추천 2.8~3.0, wideVariance false
  { id: '00000000-0000-4000-8000-000000000101', motorId: M1, voltage: 2.8, panoHz: 305.2, rpm: 18312,
    result: 'finished', satisfied: true,  createdAt: '2026-07-05T05:10:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000102', motorId: M1, voltage: 2.9, panoHz: 312.4, rpm: 18744,
    result: 'finished', satisfied: true,  createdAt: '2026-07-08T05:40:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000103', motorId: M1, voltage: 3.0, panoHz: 320.8, rpm: 19248,
    result: 'finished', satisfied: true,  createdAt: '2026-07-12T04:20:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000104', motorId: M1, voltage: 3.2, panoHz: 341.5, rpm: 20490,
    result: 'course_out', satisfied: false, createdAt: '2026-07-15T06:05:00.000Z' }, // 과전압 → 코스아웃
  { id: '00000000-0000-4000-8000-000000000105', motorId: M1, voltage: 3.0, panoHz: null, rpm: null,
    result: 'finished', satisfied: true,  createdAt: '2026-07-20T07:30:00.000Z' },   // D2: 측정 없이 직접 입력

  // ── 모터 2 (4건): 만족 2건 → insufficient, "1건 더 필요 (2/3)"
  { id: '00000000-0000-4000-8000-000000000106', motorId: M2, voltage: 2.4, panoHz: 288.6, rpm: 17316,
    result: 'not_run', satisfied: false, createdAt: '2026-07-16T03:00:00.000Z' },    // 길들이기 벤치 측정만
  { id: '00000000-0000-4000-8000-000000000107', motorId: M2, voltage: 2.5, panoHz: 295.0, rpm: 17700,
    result: 'finished', satisfied: true,  createdAt: '2026-07-18T03:10:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000108', motorId: M2, voltage: 2.6, panoHz: 301.3, rpm: 18078,
    result: 'finished', satisfied: true,  createdAt: '2026-07-22T09:45:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000109', motorId: M2, voltage: 2.7, panoHz: null, rpm: null,
    result: 'course_out', satisfied: false, createdAt: '2026-07-24T10:15:00.000Z' }, // D2: 측정 없이 주행만

  // ── 모터 3 (3건): 만족 3건 전압 2.6/2.9/3.2 → 추천 2.6~3.2, 폭 0.6 ≥ 0.5 → wideVariance true
  { id: '00000000-0000-4000-8000-000000000110', motorId: M3, voltage: 2.6, panoHz: 279.4, rpm: 16764,
    result: 'finished', satisfied: true,  createdAt: '2026-06-25T08:00:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000111', motorId: M3, voltage: 2.9, panoHz: 298.7, rpm: 17922,
    result: 'finished', satisfied: true,  createdAt: '2026-07-02T08:20:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000112', motorId: M3, voltage: 3.2, panoHz: 322.1, rpm: 19326,
    result: 'finished', satisfied: true,  createdAt: '2026-07-19T12:50:00.000Z' },
]
```

전 기록이 스키마 불변식을 만족한다: `rpm === Math.round(panoHz × 60)`(CP-2), panoHz 탐색 대역 170~620 Hz 내, RPM 10,000~37,000 내, 전압 소수 ≤1자리(A5 내), null 쌍 일치.

### 8.3 Measurement handoff 샘플 (비영속)

```ts
// src/shared/testing/seeds/measurement.seed.ts
import type { Measurement } from '@entities/measurement'

export const MEASUREMENT_SEED: Measurement = {
  panoHz: 312.4,          // 소수 1자리
  rpm: 18744,             // 312.4 × 60
  confidence: 0.93,       // UI 비노출
  capturedAt: '2026-07-08T05:39:20.000Z',
}
```

### 8.4 Seed 기반 기대값 (unit assert canonical)

| 검증 대상 | 입력 | 기대값 |
|---|---|---|
| `computeGuide` (모터 1) | 만족 4건 | `{ kind:'recommendation', rangeMin:2.8, rangeMax:3.0, satisfiedCount:4, distribution:[{voltage:2.8,count:1},{voltage:2.9,count:1},{voltage:3.0,count:2}], wideVariance:false }` — null 측정 기록(105)도 집계 포함 |
| `computeGuide` (모터 2) | 만족 2건 | `{ kind:'insufficient', satisfiedCount:2, needed:1 }` → UI "1건 더 필요 (2/3)" |
| `computeGuide` (모터 3) | 만족 3건 | `{ kind:'recommendation', rangeMin:2.6, rangeMax:3.2, satisfiedCount:3, distribution:[{voltage:2.6,count:1},{voltage:2.9,count:1},{voltage:3.2,count:1}], wideVariance:true }` |
| `countRecordsByMotor` | M1 / M2 / M3 | 5 / 4 / 3 — cascade confirm "기록 5건이 함께 삭제됩니다"(M1) |
| `listMotorSummaries` 정렬 | seed 전체 | 최근 사용순: M2(07-24) → M1(07-20) → M3(07-19) (FP-A1) |
| `listRecordsByMotor(M1)` | seed | createdAt 역순: 105 → 104 → 103 → 102 → 101 |
| `deleteMotorCascade(M1)` | seed | `{ deletedRecordCount: 5 }`, records에 motorId=M1 잔존 0건 |

## 9. 구현 파일 계획 (Phase 3 — 본 wave에서는 생성하지 않음)

MSW handlers/browser.ts는 **해당 없음**. 아래는 entity-query-builder·feature-mutation-builder·persistence 구현 담당이 생성한다.

| 파일 | 내용 | 담당 |
|---|---|---|
| `src/shared/config/domain.ts` | §1 상수·라벨 맵 전부 | 스캐폴딩 후 최초 빌더 |
| `src/shared/lib/result/index.ts` | `Result`·`ok`·`err`·`unwrap` | 〃 |
| `src/shared/lib/errors/{domain-error,messages}.ts` | `DomainError`·코드·메시지 맵·`fromZodError` | 〃 |
| `src/shared/lib/persistence/{db,init,with-transaction,reset,schema}.ts` | idb open/upgrade·`initPersistence`·`withTransaction`·`resetAllData`·`dbMetaSchema` | persistence(F4) — 상세는 state-contract 산출물 |
| `src/entities/motor/model/{schema,types}.ts` | §2.2 (types.ts는 z.infer 재수출) | entity-query-builder |
| `src/entities/motor/api/{repository,keys,queries}.ts` | command 3·query 3·`motorKeys`·`motorQueries` | 〃 |
| `src/entities/run-record/model/{schema,types}.ts` | §2.3 + `MotorSummary` | 〃 |
| `src/entities/run-record/api/{repository,keys,queries}.ts` | command 2·query 3·`recordKeys`·`recordQueries` | 〃 |
| `src/entities/measurement/model/{schema,store}.ts` | §2.4 + single-slot store(set/take/clear) | 〃 |
| `src/features/voltage-guide/model/compute-guide.ts` | §7 순수 함수 | feature 빌더 |
| `src/features/voltage-guide/api/{keys,queries}.ts` | `guideKeys`·`guideQueries` | 〃 |
| `src/app/providers/query-client.ts` | §6.1 로컬 정책 QueryClient | app(F9) |
| `src/shared/testing/seeds/{motors,records,measurement}.seed.ts` | §8 fixture + 변형(empty/max/손상) 파생 helper | 테스트 빌더 (unit·Playwright 공용) |
| mutation hooks (`features/*/api/use-*.ts`) | §6.4 매트릭스 준수 `useMutation` 래퍼 | feature-mutation-builder |

## 10. 완료 조건 (이 계약의 수용 기준)

- command 14건·query 6건 전부에 입력 zod 스키마(해당 시)·반환 타입·precondition·오류 코드가 명세됨 — feature-plan §4와 1:1, 신규 command 0건
- 영속 command 전건이 `Result<T, DomainError>` 봉투를 사용하고, 매 mutation에 invalidation 대상 key가 정의됨 (stale 파생값 0건 경로)
- persisted 데이터 경계(rehydrate)에 runtime zod 검증 + enum evolution·nullable/optional·시각/정렬 규칙이 명시됨
- 오류 taxonomy 11코드가 사용자 메시지·UI 처리와 매핑되고 HTTP 계열 계약 부재가 명시됨
- fixture: 모터 3(등급 3종)·기록 12(만족 9/불만족 3, null 측정 2, 전압 2.4~3.2, 결과 3종) + guide 기대값 3케이스(추천/부족/분산 큼)가 결정적 수치로 assert 가능
- `computeGuide`가 IO 없는 순수 함수로 seed만으로 검증 가능 (GUIDE_MIN_SATISFIED=3, wideVariance float 안전 비교 포함)

## 11. Open Items (본 wave 신규·승계)

### 신규 (본 문서)

| ID | 내용 | 성격 | 처리 |
|---|---|---|---|
| NR-1 | 필드명 `panoHz` 표준화 — feature-plan §3의 `fanoHz` 표기 정정, Measurement `f0`→`panoHz` 통일(엔진 내부 `DisplayEstimate.f0`는 유지) | 표기 정정 (결정 아님) | state-contract·Phase 3 빌더는 본 문서 표기를 따름 |
| AS-1 | 입력 길이 상한: name ≤30자, statusMemo ≤200자 | ASSUMPTION | 요구 문서에 상한 없음 — component-spec 검토 시 확인, 상수 1곳 교체 |
| AS-2 | **기각(checkpoint-phase2)** — 생략 시 `null`(미지정) 저장, 기본값 상수 없음(SC-A1 채택). 수정 시트에서 재탭 해제로 null 복귀 허용 | 확정 | §1 config·§2.2 스키마 개정 반영 완료 |
| AS-3 | panoHz 저장 정밀도 = 소수 1자리 반올림 값(표시 계약과 저장 일치, F2가 확정 시 반올림) | ASSUMPTION | 원값 저장 필요 시 스키마 refine 1곳 완화 |
| — | `countRecordsByMotor`는 query 캐시 미사용(confirm 직전 명령형 호출) | 설계 결정 | stale 건수 고지 방지 — 본 문서로 확정 |
| — | `panoHzSchema` 공유 위치(entities 간 import vs shared 승격) | 구현 위임 | 중복 정의 금지만 계약 — entity-query-builder가 위치 확정 |

### 승계 (state-contract-designer 위임 — 본 문서는 표면 계약만 고정)

① `deleteMotorCascade`·`createRecord` 다중 store 트랜잭션 원자성·롤백 상세 ② schemaVersion v1·migration·recovery 절차 ③ 동시 탭 마지막 쓰기 정책 ④ command별 pre/postcondition 전수 fixture 매핑 상세. CP-1a(등급 enum 값)·D4(결과 어휘)는 사용자 확인 대기 — 전부 `shared/config` 상수 1곳 교체로 흡수.
