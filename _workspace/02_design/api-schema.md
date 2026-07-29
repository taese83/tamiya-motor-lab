# API Schema — minicar-motor-lab (도메인 데이터 계약) v2

> **v2 개정 (2026-07-29)**. canonical 입력: `revision-v2-brief.md`(확정 결정 RV-1~RV-4 · M/T/R 사양 · 데이터 모델 v2) — 충돌 시 brief가 v1 plan 문서를 이긴다. 보조 입력: v1 본 문서(구조·봉투·오류 taxonomy 승계) · `state-contract.md` v1(SC-A8 write-strict/read-lenient 승계) · `analysis-algorithm.md` v2 · `tech-stack.md`(zod 4.3.0 · idb 8 · TanStack Query 5.90 로컬 정책 + v2 신규 @dnd-kit 2종은 tech-stack 갱신 소관).
> **이 앱에는 HTTP API·서버·MSW가 없다** (AD-10 미도입 확정, axios 미설치, fetch 호출 0건). 이 문서는 REST 명세가 아니라 **IndexedDB 기반 도메인 command/query 계약의 단일 소스**다. REST endpoint·`ResponseSuccessType<T>` HTTP 봉투·MSW 핸들러는 전부 **해당 없음** — 유일한 응답 봉투는 `Result<T, DomainError>`이고, mock 경계는 합성 신호 fixture + fake-indexeddb seed다(DL-006).
> 소비자: Phase 3 **entity-query-builder**(queryOptions factory)와 **feature-mutation-builder**(command→mutation 어댑터)가 이 문서를 API 명세 대신 소비한다.
> **데이터 초기화(RV-3)**: 마이그레이션 없음 — DB `mml-db` schemaVersion **v2** 재정의, 구버전(v1) DB 감지 시 **전체 삭제 후 재생성**. 구버전 데이터는 `data-corrupt`가 아니다(§3 참고).

## 0. 계약 총람 (REST 엔드포인트 목록 대체)

| 종류 | 이름 | 소유 slice | 입력 | 반환 | 화면/근거 |
|---|---|---|---|---|---|
| command | `initPersistence` | `shared/lib/persistence` | — | `Promise<PersistenceStatus>` | 전역 부트스트랩 / RV-3 (v2 재생성) |
| command | `resetAllData` | `shared/lib/persistence` | — | `Promise<Result<void>>` | 복구 UI / C-6 (모터 포함 전체 파기) |
| command | `resetAllRecords` | `shared/lib/persistence` | — | `Promise<Result<{deletedMeasureCount, deletedRaceCount}>>` | 레이스 [초기화] / R-6 · RV-A2 (모터 유지) |
| helper | `withTransaction` | `shared/lib/persistence` | stores·mode·fn | `Promise<Result<T>>` | 내부 / 원자성 |
| command | `createMotor` | `entities/motor/api` | `CreateMotorInput` | `Promise<Result<Motor>>` | 모터 등록 / T-1 |
| command | `updateMotor` | `entities/motor/api` | id + `UpdateMotorPatch` | `Promise<Result<Motor>>` | 모터 편집 / T-1 |
| command | `deleteMotorCascade` | `entities/motor/api` | id | `Promise<Result<{deletedRecordCount}>>` | confirm / cascade(Measure+Race) |
| command | `reorderMotors` | `entities/motor/api` | `ReorderMotorsInput` | `Promise<Result<void>>` | 드래그앤드롭 / T-6 (단일 트랜잭션) |
| command | `collectMeasureRecord` | `entities/measure-record/api` | `CollectMeasureInput` | `Promise<Result<MeasureRecord>>` | 측정 [기록]·레이스 왕복 자동 수집 / M-6 · RV-1 · T-3 rolling 10 |
| command | `createRaceRecord` | `entities/race-record/api` | `CreateRaceRecordDraft` | `Promise<Result<RaceRecord>>` | 레이스 입력 폼 / R-3·R-4 |
| command | `deleteRaceRecord` | `entities/race-record/api` | id | `Promise<Result<void>>` | 레이스 행 삭제 / RV-A3 |
| command | `startCapture` | `features/measure-session` | — | `Promise<Result<CaptureSession>>` | 측정 / M-1 자동 시작 + 탭 fallback |
| command | `stopCapture` | `features/measure-session` | — | `void` | 측정 / M-2 자동 정지 전용 |
| command | `retryPermission` | `features/measure-session` | — | `Promise<Result<void>>` | 측정 / REQ-ST-001 |
| command | `resumeAudio` | `features/measure-session` | — | `Promise<Result<void>>` | 측정 / M-1 "탭하여 시작" fallback |
| query | `listMotors` | `entities/motor/api` | — | `Promise<Motor[]>` (throw) | 전 리스트 — **sortOrder 오름차순** / T-6 |
| query | `getMotorById` | `entities/motor/api` | id | `Promise<Motor \| undefined>` (throw) | 차트·레이스 페이지 헤더 |
| query | `countRecordsByMotor` | `entities/motor/api` | motorId | `Promise<{measureCount: number; raceCount: number}>` (throw) | cascade confirm — n·m **분리 고지** (D-1: component-spec 정합, 2026-07-28) |
| query | `listMotorSummaries` | `entities/motor/api` | — | `Promise<MotorSummary[]>` (throw) | 모터 리스트·레이스 진입 리스트 / T-4 · R-1 |
| query | `listMeasureRecordsByMotor` | `entities/measure-record/api` | motorId | `Promise<MeasureRecord[]>` (throw) | 기록 표시·라인 차트 / T-4·T-5 (≤10) |
| query | `listRaceRecordsByMotor` | `entities/race-record/api` | motorId | `Promise<RaceRecord[]>` (throw) | 레이스 기록 리스트 / R-2 (최신순) |

**영속 command 9종**(createMotor·updateMotor·deleteMotorCascade·reorderMotors·collectMeasureRecord·createRaceRecord·deleteRaceRecord·resetAllRecords·resetAllData) + 부트스트랩 1(initPersistence) + 비영속 세션 command 4종 + 내부 helper 1 + **query 6종**. v1 대비 제거 계약은 §7.

### 채널 규약 (봉투 통일 — v1 무변경)

- **command(mutation)**: `Result<T, DomainError>` 반환 — 실패를 값으로 전파, throw로 UI를 관통하지 않는다. React 계층에서는 `unwrap()` 어댑터가 `ok:false`를 throw로 변환해 `useMutation`의 error 채널·invalidation과 접속한다.
- **query(read)**: 성공 값을 직접 반환하고 실패는 `DomainError`를 **throw** — TanStack Query error 상태로 수렴(`retry:false`, 재시도는 명시 refetch). **읽기 실패 시 빈 배열 반환(위장) 금지**(D-10). `getMotorById`의 `undefined`는 오류가 아니라 "부재"라는 정상 도메인 결과다.
- **측정 세션 command**: `Result` 실패의 `capture-*` 코드를 F2 상태 머신이 `MeasureStatus`로 매핑한다. query 캐시와 무관.
- **레이스 왕복(RV-1) 세션 상태**: 폼 보존·자동 확정·자동 복귀는 **비영속 세션 상태 — state-contract 소유**(§7). 본 문서는 그 세션이 최종 호출하는 영속 command(`collectMeasureRecord`)만 계약한다.

```ts
// src/shared/lib/result/index.ts — v1 무변경
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

모든 enum 저장값은 **영문 snake_case 안정 식별자**, 한국어 라벨은 라벨 맵에서만 — 어휘 교체 시 라벨 맵 1곳만 수정(교체 지점 1곳 원칙).

```ts
// src/shared/config/domain.ts (v2)
// ── 모터 종류 (T-1 확정: 9종 enum — 저장은 안정 식별자, 표시는 라벨 맵)
export const MOTOR_KINDS = [
  'm130', 'atomic', 'torque', 'rev',
  'hyper_dash', 'power_dash', 'sprint_dash', 'ultra_dash', 'mach_dash',
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

// ── 측정 기록 rolling 상한 (T-3 확정: 모터당 최대 10건, 초과 시 최고(最古) 자동 삭제)
export const MEASURE_RECORD_LIMIT = 10

// ── 전압 (A5 baseline — v1 유지)
export const VOLTAGE_RANGE = { min: 0.1, max: 9.9, step: 0.1, maxDecimals: 2 } as const

// ── 표시 라벨 (CP-2 확정 — v1 유지. M-4: 파노가 주지표로 승격, 라벨 자체는 무변경)
export const PANO_LABEL = '파노'

// ── 입력 길이 상한 (AS-1 — v1 유지)
export const MOTOR_NAME_MAX_LENGTH = 30
```

- **제거(v2)**: `MOTOR_STATUS_GRADES`·`MOTOR_STATUS_GRADE_LABELS`(statusGrade 필드 제거) · `RUN_RESULTS`·`RUN_RESULT_LABELS`(RunRecord 제거 — `RACE_RESULTS` 2택으로 대체) · `GUIDE_MIN_SATISFIED`·`WIDE_VARIANCE_THRESHOLD`(RV-2 가이드 완전 제거) · `MOTOR_MEMO_MAX_LENGTH`(statusMemo 필드 제거).
- **참조 유지**: 파노 탐색 대역 `F0_RANGE`(170~620 Hz, `shared/config` — analysis-algorithm v2 canonical, **무변경**). §2의 write-strict 검증과 M-4 게이지 눈금이 이 상수 1곳을 공유한다.

## 2. 엔티티 zod 스키마 (rehydrate = 외부 입력 검증, AD-7)

IndexedDB persisted 데이터는 **외부 입력으로 취급** — 읽기 경로에서 zod 검증하고 type assertion을 금지한다. UI 인라인 검증·command precondition·rehydrate가 **동일 스키마 정의를 공유**하되, panoHz는 SC-A8 이원화를 승계한다(§2.1).

### 2.1 필드 규칙 (전 엔티티 공통)

| 규칙 | 내용 |
|---|---|
| ID | UUID v4, `crypto.randomUUID()` — command가 생성, 호출자 지정 불가 |
| 시각 | ISO 8601 **UTC `Z` 고정** (`new Date().toISOString()`), `z.iso.datetime()` 검증. 표시 변환은 `Intl.DateTimeFormat('ko-KR')` 표시 계층 전담. 정렬 = ISO 문자열 비교, **동률 시 2차 키 `id`** |
| `null` vs 생략 | v2 영속 모델에 **nullable 필드 없음**. 필드 **생략(optional)** = "항목 자체가 선택"(`lapTimeMs` 미측정). undefined 필드는 IndexedDB에 저장하지 않는다 |
| pagination | **없음** — page/size/totalCount 미적용. MeasureRecord는 rolling 10으로 자체 상한, 모터·레이스 목록은 전체 표시(A7 규모 수용) |
| enum evolution | 저장값은 안정 식별자 — **라벨 교체는 자유**(라벨 맵 1곳). 값 **추가**는 additive(구 데이터 rehydrate 통과). 값 **제거·개명**은 schemaVersion bump 필수 — 단 RV-3 정책상 v1→v2는 migration이 아니라 **전체 재생성** |
| unknown key | rehydrate 시 알 수 없는 키는 strip(zod 기본) — additive 전방 호환 허용 |
| **panoHz 이원화 (SC-A8 승계)** | **write-strict**: 신규 측정 수집 시 `F0_RANGE`(170~620 Hz) + 소수 1자리(AS-3) 엄격 검증. **read-lenient**: rehydrate 시 완화(유한 양수 ≤ 2,000) — 대역 상수 변경이 기존 정상 데이터를 corrupt로 오판하지 않게. 쌍 불변식(`rpm === round(panoHz×60)`)·voltage 범위·enum·UUID·ISO datetime은 **양쪽 모두 엄격** |

> **필드명 표준화(NR-1 승계)**: 파노 필드는 `panoHz` canonical(엔진 내부 `DisplayEstimate.f0`만 analysis-algorithm v2대로 유지 — F2가 확정 시 `f0 → panoHz` 매핑). state-contract·Phase 3 빌더는 `panoHz`만 사용한다.

### 2.0 panoHz 공유 스키마 (정의 1곳 — shared 승격)

```ts
// src/shared/lib/schema/pano.ts — measure-record·race-record 양쪽이 소비하므로 v2에서 shared 승격 확정
import { z } from 'zod'
import { F0_RANGE } from '@shared/config' // 170~620 Hz — analysis-algorithm v2 canonical

/** write-strict: 신규 측정값 수집 경로 (엔진 stable 확정값) */
export const panoHzWriteSchema = z.number()
  .min(F0_RANGE.min, `파노는 ${F0_RANGE.min} Hz 이상이어야 합니다`)
  .max(F0_RANGE.max, `파노는 ${F0_RANGE.max} Hz 이하여야 합니다`)
  .refine(v => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9, '파노는 소수 첫째 자리까지 저장합니다') // AS-3

/** read-lenient: rehydrate 경로 (SC-A8 — 대역·정밀도 상수 변경이 구 데이터를 corrupt로 오판하지 않게) */
export const panoHzStoredSchema = z.number().positive().finite().max(2000)

/** 쌍 불변식 — write·rehydrate 양쪽 엄격 (CP-2: rpm = 파노 × 60 반올림 정수) */
export const panoRpmPair = (r: { panoHz: number; rpm: number }) => r.rpm === Math.round(r.panoHz * 60)
```

### 2.2 Motor

```ts
// src/entities/motor/model/schema.ts
import { z } from 'zod'
import { MOTOR_KINDS, MOTOR_NAME_MAX_LENGTH } from '@shared/config/domain'

export const motorKindSchema = z.enum(MOTOR_KINDS) // T-1 — 상수 1곳 참조

export const motorSchema = z.object({
  id: z.uuid(),                                     // 구조 필드 — 생성 후 불변
  name: z.string().trim().min(1, '이름을 입력해 주세요').max(MOTOR_NAME_MAX_LENGTH),
  kind: motorKindSchema,                            // 필수 — null/생략 없음 (T-1)
  sortOrder: z.number().int().min(0),               // T-6 — 리스트 순서 영속, reorderMotors 전용 변경
  createdAt: z.iso.datetime(),                      // 구조 필드 — 불변
  updatedAt: z.iso.datetime(),                      // updateMotor 성공 시에만 갱신
})
export type Motor = z.infer<typeof motorSchema>

// command 입력 — 구조 필드(id·createdAt·updatedAt)와 sortOrder는 command가 부여
export const createMotorInputSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요').max(MOTOR_NAME_MAX_LENGTH),
  kind: motorKindSchema,
})
export type CreateMotorInput = z.input<typeof createMotorInputSchema>

export const updateMotorPatchSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요').max(MOTOR_NAME_MAX_LENGTH),
  kind: motorKindSchema,
}).partial()                                        // 편집 필드 = name·kind만. sortOrder는 reorderMotors 전용
export type UpdateMotorPatch = z.infer<typeof updateMotorPatchSchema>

export const reorderMotorsInputSchema = z.object({
  orderedIds: z.array(z.uuid()).min(1),             // 전체 모터 id의 순열 — 순열 여부는 command precondition에서 실측 검증
})
export type ReorderMotorsInput = z.infer<typeof reorderMotorsInputSchema>
```

제거된 필드: `statusGrade`·`statusMemo`(T-1). 파생 값(기록 수·최근 측정·마지막 레이스 요약)은 **영속·캐시 금지** — record store에서 매번 계산(이중 원본 금지). 리스트 순서의 단일 원천은 `sortOrder`다(v1의 "최근 사용순" 파생 정렬 폐기).

### 2.3 MeasureRecord (immutable — 수집 전용, T-2)

생성 경로는 **측정 화면 [기록](M-6)과 레이스 왕복 자동 수집(RV-1)의 `collectMeasureRecord` 단일 command뿐** — 수동 입력·수정 command는 존재하지 않는다. 삭제는 rolling 자동 삭제(T-3)·`deleteMotorCascade`·`resetAllRecords`/`resetAllData`뿐, **개별 삭제 없음**(RV-A1).

```ts
// src/entities/measure-record/model/schema.ts
import { z } from 'zod'
import { panoHzStoredSchema, panoHzWriteSchema, panoRpmPair } from '@shared/lib/schema/pano'

// rehydrate(read-lenient) — 저장 데이터 검증
export const measureRecordSchema = z.object({
  id: z.uuid(),                                  // 구조 필드 — 불변
  motorId: z.uuid(),                             // FK 구조 필드 — dangling 금지
  panoHz: panoHzStoredSchema,                    // SC-A8 완화 (유한 양수 ≤2,000)
  rpm: z.number().int().positive(),
  measuredAt: z.iso.datetime(),                  // 구조 필드 — 차트 X축·rolling 삭제 순서 키
}).refine(panoRpmPair, { path: ['rpm'], message: 'RPM은 파노 × 60 반올림 정수여야 합니다' })
export type MeasureRecord = z.infer<typeof measureRecordSchema>

// command 입력(write-strict) — id/measuredAt은 command가 생성. panoHz·rpm은 F2 stable 확정값
export const collectMeasureInputSchema = z.object({
  motorId: z.uuid(),
  panoHz: panoHzWriteSchema,                     // F0_RANGE 엄격 + 소수 1자리 (AS-3)
  rpm: z.number().int().positive(),
}).refine(panoRpmPair, { path: ['rpm'], message: 'RPM은 파노 × 60 반올림 정수여야 합니다' })
export type CollectMeasureInput = z.input<typeof collectMeasureInputSchema>
```

### 2.4 RaceRecord (immutable — 생성·개별 삭제만, RV-A3)

```ts
// src/entities/race-record/model/schema.ts
import { z } from 'zod'
import { RACE_RESULTS, VOLTAGE_RANGE } from '@shared/config/domain'
import { panoHzStoredSchema } from '@shared/lib/schema/pano'

export const raceResultSchema = z.enum(RACE_RESULTS) // R-3 — 상수 1곳 참조

// A5: 0.1~9.9 V, 소수 최대 2자리 — float 안전 검사(× 100 후 정수 근접 비교, `% 1` 직접 비교 금지) — v1 무변경
export const voltageSchema = z.number()
  .min(VOLTAGE_RANGE.min, `전압은 ${VOLTAGE_RANGE.min} V 이상이어야 합니다`)
  .max(VOLTAGE_RANGE.max, `전압은 ${VOLTAGE_RANGE.max} V 이하여야 합니다`)
  .refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9, '전압은 소수 둘째 자리까지 입력할 수 있습니다')

// 랩타임 — 옵션, 양의 정수 ms (생략 = 미측정, null 아님)
export const lapTimeMsSchema = z.number().int('랩타임은 ms 정수로 입력합니다').positive()

export const raceRecordSchema = z.object({
  id: z.uuid(),                                  // 구조 필드 — 불변
  motorId: z.uuid(),                             // FK 구조 필드 — dangling 금지
  panoHz: panoHzStoredSchema,                    // R-3①: 최신 MeasureRecord 인용 or 왕복 즉석 측정값
  result: raceResultSchema,                      // 완주/이탈 2택
  voltage: voltageSchema,
  lapTimeMs: lapTimeMsSchema.optional(),         // 옵션 — undefined는 저장하지 않음
  createdAt: z.iso.datetime(),                   // 구조 필드 — 최신순 정렬 키
})
export type RaceRecord = z.infer<typeof raceRecordSchema>

// command 입력 — id/createdAt은 command가 생성
export const createRaceRecordDraftSchema = z.object({
  motorId: z.uuid(),
  panoHz: panoHzStoredSchema,                    // 주의: write에도 stored(완화) 적용 — §2.4 각주
  result: raceResultSchema,
  voltage: voltageSchema,
  lapTimeMs: lapTimeMsSchema.optional(),
})
export type CreateRaceRecordDraft = z.input<typeof createRaceRecordDraftSchema>
```

> **RaceRecord.panoHz가 write에서도 stored(완화) 스키마인 이유**: 이 값의 출처는 항상 기존 MeasureRecord 인용(자동 입력) 또는 방금 수집된 MeasureRecord(RV-1 왕복 — 그 시점에 이미 write-strict를 통과)다. 대역 상수(`F0_RANGE`) 변경 후에도 **기존 정상 측정값의 인용 입력이 막히지 않게** 완화 스키마를 쓴다(SC-A8 근거와 동일). rpm은 RaceRecord에 저장하지 않는다 — 필요 시 표시 계층이 `round(panoHz×60)` 파생.

### 2.5 DbMeta·파생 view 타입

```ts
// src/shared/lib/persistence/schema.ts
export const dbMetaSchema = z.object({ schemaVersion: z.number().int().positive() }) // v2 = 2
export type DbMeta = z.infer<typeof dbMetaSchema>
export type PersistenceStatus = 'ready' | 'unavailable' | 'corrupt'

// src/entities/motor/model/types.ts — 파생 view (영속·캐시 금지, 매 조회 계산)
export interface MotorSummary {
  motor: Motor
  measureCount: number          // ≤ MEASURE_RECORD_LIMIT
  lastMeasure?: MeasureRecord   // max measuredAt — 모터 리스트 보조 표시(T-4 파노 주·rpm 부)
  raceCount: number
  lastRace?: RaceRecord         // max createdAt — 레이스 진입 리스트 "마지막 레이스 요약" (R-1)
}
```

IndexedDB object store (v2): `motors`(keyPath `id`) / `measure-records`(keyPath `id`, index `by-motorId`, `by-measuredAt`) / `race-records`(keyPath `id`, index `by-motorId`, `by-createdAt`) / `meta`. **v1 store(`records`)는 upgrade에서 파기** — RV-3, migration 없음. schemaVersion v2 정의·재생성 절차·invalid-state recovery는 **state-contract v2 위임** — 본 문서는 스키마 표면만 고정한다.

## 3. DomainError Taxonomy (HTTP 없음 — 상태 코드·axios 매핑 해당 없음)

HTTP가 없으므로 400/404/500 상태 코드, `api.ts` AppError, HTTP retry 로직은 **전부 해당 없음**. 오류는 아래 단일 taxonomy로 수렴한다 — **v2에서 코드 11종 무변경**, 발생 지점·UI 매핑만 개정.

```ts
// src/shared/lib/errors/domain-error.ts — v1 무변경
export type DomainErrorCode =
  // ── persistence·command 계열 (Result 봉투로 전파)
  | 'validation'            // zod/precondition 실패 — fieldErrors 동반
  | 'not-found'             // 대상 entity 부재 (update/delete/FK 확인)
  | 'storage-unavailable'   // IndexedDB open 불가 — private 모드 등 (C-5)
  | 'quota-exceeded'        // 쓰기 quota 초과 (C-4)
  | 'transaction-failed'    // 트랜잭션 abort — 부분 반영 없음 보장 (C-3/C-4)
  | 'data-corrupt'          // v2 DB rehydrate zod 검증 실패 (C-6) — ⚠️ 구버전(v1) DB는 corrupt 아님: RV-3 재생성 경로
  // ── capture 계열 (F2 상태 머신이 MeasureStatus로 매핑 — 전역 오류 UI로 보내지 않음)
  | 'capture-insecure-context'            // isSecureContext===false (D-4)
  | 'capture-permission-denied'           // 일시 거부 (D-2)
  | 'capture-permission-denied-permanent' // 영구 거부 — Permissions API 가용 시 감지, iOS fallback: 재요청 실패 반복 시 승격 (D-3)
  | 'capture-suspended'                   // AudioContext.state !== 'running' — M-1 자동 시작 거부 시 "탭하여 시작" fallback의 원천
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

### 코드 ↔ 사용자 메시지 ↔ UI 처리 매핑 (v2 개정)

| code | 발생 지점 (v2) | 기본 사용자 메시지 | UI 처리 |
|---|---|---|---|
| `validation` | command precondition·zod | (fieldErrors 필드 인라인) "입력값을 확인해 주세요" | 필드 인라인 오류, 입력 유지, 저장 버튼 재활성 |
| `not-found` | updateMotor/deleteMotorCascade/collectMeasureRecord/createRaceRecord FK·deleteRaceRecord | "대상을 찾을 수 없습니다. 목록을 새로고침해 주세요" | 토스트 + 관련 query invalidate |
| `storage-unavailable` | DB open·write (private 모드) | "기록 저장을 사용할 수 없습니다 (측정은 가능)" | 전역 고정 배너 (C-5) — 측정 기능 정상 동작 |
| `quota-exceeded` | write 시 QuotaExceededError | "저장 공간이 부족합니다" | 입력 유지 + 오류 배너 + [다시 저장]. rolling 10이 measure 증식을 자체 억제 |
| `transaction-failed` | tx abort (cascade·rolling·reorder 포함) | "저장 중 오류가 발생했습니다. 다시 시도해 주세요" | 입력 유지 + 재시도. **부분 반영 없음** |
| `data-corrupt` | v2 DB rehydrate 검증 실패 | "저장된 데이터를 읽을 수 없습니다" | 복구 UI(`resetAllData`) — crash loop 금지. **구버전 DB 감지는 이 경로가 아니라 조용한 재생성(RV-3)** |
| `capture-insecure-context` | startCapture 진입 가드 | "HTTPS 연결에서만 측정할 수 있습니다" | 측정 화면 활성화 불가 상태 (D-4) |
| `capture-permission-denied` | 자동 시작(M-1)·재요청 거부 | "마이크 권한이 필요합니다" + [다시 요청] | `no-permission`(일시) — M-1: 진입 즉시 권한 요청 후의 거부 상태 |
| `capture-permission-denied-permanent` | 영구 거부 감지 | "브라우저 설정에서 마이크 권한을 허용해 주세요" + [설정 안내] | `no-permission`(영구) (D-3) |
| `capture-suspended` | 자동 시작이 제스처 요구로 거부됨(iOS)·suspended | "탭하여 시작" | **M-1 fallback 계약**: 오류로 표시하지 않음 — 1탭 UI, 탭 → `resumeAudio`. QA 대상 |
| `capture-device-error` | 장치 부재·기타 | "마이크를 사용할 수 없습니다" | idle 복귀 + 토스트 |

메시지 문자열은 `shared/lib/errors/messages.ts`의 `DOMAIN_ERROR_MESSAGES: Record<DomainErrorCode, string>` 1곳에서 관리. `weak-signal`은 오류가 아니라 **MeasureStatus 상태**(M-7 신호 약함 표시)임에 주의 — taxonomy에 포함되지 않는다.

## 4. Command 계약 전수 (영속 9 + 부트스트랩 1 + 세션 4)

공통 postcondition: 영속 command 성공 시 §6 invalidation 매트릭스대로 query 캐시를 무효화한다. 검증은 **UI 인라인 + command precondition 이중 수행**(동일 zod 스키마 공유).

### 4.1 Persistence — `shared/lib/persistence` (F4)

| command | 시그니처 | precondition | postcondition / 오류 | invalidate |
|---|---|---|---|---|
| `initPersistence` | `() => Promise<PersistenceStatus>` | 없음 — app 부트스트랩 1회 | `'ready'` / `'unavailable'`(open 불가 — 측정 가능 배너) / `'corrupt'`(v2 데이터 검증 실패 — 복구 UI). **구버전(v1) DB 감지 시**: upgrade 경로에서 구 store 전부 파기 후 v2 store 생성(RV-3 — migration 없음, corrupt 아님·사용자 오류 표시 없음). **throw하지 않음** | — |
| `resetAllRecords` | `() => Promise<Result<{deletedMeasureCount: number; deletedRaceCount: number}>>` | R-6 confirm 완료(명시 확인 + 삭제 범위 고지 "측정·레이스 기록 전체가 삭제됩니다") — confirm은 호출 feature 책임 | `measure-records`+`race-records` **두 store 단일 트랜잭션** 비움 — **motors·meta 유지**(RV-A2: 모터 등록은 보존). 오류: `storage-unavailable`·`transaction-failed` | `measureKeys.root` + `raceKeys.root` + `motorKeys.summaries()` |
| `resetAllData` | `() => Promise<Result<void>>` | 복구 UI confirm 완료(C-6 경로 전용 — 레이스 [초기화]가 아님) | **전 store**(motors 포함) 비움 + meta 현행 schemaVersion(2) 재기록. 오류: `storage-unavailable`·`transaction-failed` | `queryClient.clear()` 후 재조회 |
| `withTransaction` (내부 helper) | `<T>(storeNames: StoreName[], mode: IDBTransactionMode, fn: (tx) => Promise<T>) => Promise<Result<T>>` | — | fn 내 오류 시 `tx.abort()` → `transaction-failed`(부분 반영 없음). quota는 `quota-exceeded` 구분 매핑. 원자성 상세는 state-contract 위임 | — (호출 command 담당) |

### 4.2 Motor — `entities/motor/api` (F5)

| command | 입력 스키마 | precondition | postcondition / 오류 | invalidate |
|---|---|---|---|---|
| `createMotor(input)` → `Promise<Result<Motor>>` | `createMotorInputSchema` | name trim 후 1자 이상 · kind는 `MOTOR_KINDS` 9종 중 1 | id=`crypto.randomUUID()`, createdAt=updatedAt=now, **sortOrder=현재 max+1**(리스트 끝 추가 — 입력 지정 불가, 빈 목록이면 0). 오류: `validation`·`storage-unavailable`·`quota-exceeded`·`transaction-failed` | `motorKeys.root` |
| `updateMotor(id, patch)` → `Promise<Result<Motor>>` | `z.uuid()` + `updateMotorPatchSchema` | 대상 존재. patch는 **name·kind만** — sortOrder(reorderMotors 전용)·구조 필드는 타입에서 제외 | updatedAt만 추가 갱신. 오류: `validation`·`not-found`·`storage-unavailable`·`quota-exceeded`·`transaction-failed` | `motorKeys.root` |
| `deleteMotorCascade(id)` → `Promise<Result<{deletedRecordCount: number}>>` | `z.uuid()` | 대상 존재(부재 → `not-found`). confirm("측정 기록 n건·레이스 기록 m건이 함께 삭제됩니다" — `countRecordsByMotor` **직전 실측치** n·m 분리 고지, D-1)은 feature 책임, 재검증은 command 책임 | motors+measure-records+race-records **3-store 단일 트랜잭션** — 완료 후 dangling reference 0건, 실패 시 무변경. `deletedRecordCount` = measure+race 합산. 오류: `not-found`·`storage-unavailable`·`transaction-failed` | `motorKeys.root` + `measureKeys.root` + `raceKeys.root` |
| `reorderMotors(input)` → `Promise<Result<void>>` | `reorderMotorsInputSchema` | `orderedIds`가 **현재 전체 모터 id의 순열**임을 트랜잭션 내 실측 검증(개수 일치 + 전건 존재 + 중복 없음 — 불일치 → `validation`, 드래그 중 다른 탭 변경 감지 계기) | **`motors` 단일 트랜잭션**에서 전 행 sortOrder를 배열 인덱스(0..n−1)로 재부여 — 부분 반영 없음. updatedAt은 **갱신하지 않음**(내용 편집 아님 — 배치 메타). 오류: `validation`·`storage-unavailable`·`transaction-failed` | `motorKeys.root` |

### 4.3 MeasureRecord — `entities/measure-record/api` (F6-M, 수집 전용 T-2)

| command | 입력 스키마 | precondition | postcondition / 오류 | invalidate |
|---|---|---|---|---|
| `collectMeasureRecord(input)` → `Promise<Result<MeasureRecord>>` | `collectMeasureInputSchema` (write-strict: `panoHzWriteSchema` + 쌍 불변식) | ① motor 존재를 **동일 트랜잭션에서 확인**(부재 → `not-found`) ② panoHz F0_RANGE·소수 1자리 ③ rpm=round(panoHz×60) | id=`crypto.randomUUID()`, measuredAt=now — command 생성. **rolling 10 (T-3)**: 삽입 후 해당 motorId 건수 > `MEASURE_RECORD_LIMIT`이면 **가장 오래된 기록(measuredAt 오름차순, 동률 시 id 오름차순)부터 초과분 삭제 — 삽입과 삭제가 `['motors','measure-records']` 단일 트랜잭션**(중간 실패 시 삽입도 롤백, 11건 상태 관측 불가). postcondition: 해당 모터 건수 ≤ 10. 오류: `validation`·`not-found`·`storage-unavailable`·`quota-exceeded`·`transaction-failed` | `measureKeys.root` + `motorKeys.summaries()` |

호출자 2곳(M-6 모터 선택 팝업 · RV-1 레이스 왕복 자동 확정)이 **같은 command**를 사용한다 — 왕복 모드의 자동 호출·복귀 시퀀스는 state-contract v2 소유. update·개별 delete command는 **존재하지 않는다**(T-2·RV-A1).

### 4.4 RaceRecord — `entities/race-record/api` (F6-R)

| command | 입력 스키마 | precondition | postcondition / 오류 | invalidate |
|---|---|---|---|---|
| `createRaceRecord(draft)` → `Promise<Result<RaceRecord>>` | `createRaceRecordDraftSchema` | ① motor 존재를 **동일 트랜잭션에서 확인**(`['motors','race-records']` rw — dangling 금지) ② voltage A5 재검증 ③ lapTimeMs 지정 시 양의 정수 ④ panoHz는 완화 스키마(§2.4 각주) | id/createdAt은 command 생성. 실패 시 폼 입력 유지 + [다시 저장](UI 계약). 오류: `validation`·`not-found`·`storage-unavailable`·`quota-exceeded`·`transaction-failed` | `raceKeys.root` + `motorKeys.summaries()` |
| `deleteRaceRecord(id)` → `Promise<Result<void>>` | `z.uuid()` | confirm 후 호출(feature 책임 — RV-A3 오입력 복구 수단). 대상 부재 → `not-found`(stale 목록 감지 계기) | 삭제 즉시 리스트·요약 반영. 오류: `not-found`·`storage-unavailable`·`transaction-failed` | `raceKeys.root` + `motorKeys.summaries()` |

RaceRecord update command는 **존재하지 않는다**(immutable — 측정·기록 신뢰성 보호, v1 FP-A4 정신 승계).

### 4.5 측정 세션 — `features/measure-session` (F2, 비영속)

| command | 시그니처 | precondition / 오류 → 상태 매핑 (v2 개정) |
|---|---|---|
| `startCapture` | `() => Promise<Result<CaptureSession>>` | **M-1: 페이지 진입 시 자동 호출 시도**(제스처 없이 호출 허용) + `isSecureContext`(아니면 `capture-insecure-context`). getUserMedia(echoCancellation/noiseSuppression/autoGainControl **off**, mono) + `resume()`. 실제 `AudioContext.sampleRate`를 Worker에 전달(48 kHz 가정 금지). 브라우저가 제스처 요구로 거부(iOS Safari) → `capture-suspended` → **"탭하여 시작" 1탭 fallback**(오류 표시 아님 — 계약·QA 대상). 권한 거부 → `capture-permission-denied(-permanent)`. 성공 postcondition: AudioContext `running`, `DisplayEstimate` 스트림 ≥10 Hz — **M-3: stable 잠금 없이 연속 갱신**(안정 판정은 내부 유지 — RV-1 자동 확정·[기록] 활성 판단에만 사용) |
| `stopCapture` | `() => void` | **M-2: 중지 버튼 없음** — 탭 이탈·백그라운드 시 자동 호출 전용(복귀 시 자동 `startCapture` 재시도). v1의 "stable 확정 시 자동 stop"은 **폐기**(연속 측정). 실패 없음 |
| `retryPermission` | `() => Promise<Result<void>>` | `no-permission`(일시)에서만. 실패 반복 시 영구 안내로 승격(Permissions API 가용 시 우선, iOS fallback) |
| `resumeAudio` | `() => Promise<Result<void>>` | `suspended`("탭하여 시작" fallback 포함)에서만. 성공 시 `state==='running'` 확인 후 measuring 진입 — 아니면 측정 시작 금지 |

```ts
// features/measure-session/model/types.ts (참고 형태 — 확정은 state-contract v2)
interface CaptureSession { sampleRate: number; stop(): void }
```

`capture-*` 오류는 상태 머신이 소비해 `MeasureStatus`로 전환할 뿐 전역 오류 UI·query 캐시로 가지 않는다. Worker 프로토콜은 analysis-algorithm v2 + `shared/lib/audio-analysis/protocol.ts` canonical — 본 문서 범위 외. **레이스 왕복 모드**(raceReturn — [기록] 버튼 숨김·자동 확정·자동 복귀·폼 보존)는 비영속 세션 상태로 **state-contract v2 소유** — 본 문서는 그 모드가 stable 확정 시 `collectMeasureRecord`를 호출한다는 접점만 계약한다.

## 5. Query 계약 전수 (6건)

전 query 공통: 실패 시 `DomainError` throw(`storage-unavailable`·`data-corrupt`·`transaction-failed`) — **빈 목록 위장 금지**(D-10). rehydrate 검증: 반환 전 `z.array(스키마)` 파싱(read-lenient), 실패 → `data-corrupt`.

| query | 시그니처 | 계약 요점 | query key |
|---|---|---|---|
| `listMotors` | `() => Promise<Motor[]>` | **sortOrder 오름차순**(동률 시 createdAt·id 오름차순 — 자가 치유 여지, 정상 상태에선 동률 없음). 모터 선택 팝업(M-6)·레이스 진입 리스트의 순서 원천 (T-6) | `motorKeys.list()` |
| `getMotorById` | `(id: string) => Promise<Motor \| undefined>` | 차트/레이스 페이지(`/race/:motorId`) 헤더. `undefined` = 부재(정상 결과 — not-found UI 분기), throw = 읽기 실패 | `motorKeys.detail(id)` |
| `countRecordsByMotor` | `(motorId: string) => Promise<{measureCount: number; raceCount: number}>` | cascade confirm "측정 n건·레이스 m건" **분리 실측치**(D-1) — 캐시하지 않고 confirm 직전 명령형 호출(stale 건수 고지 방지) | 없음 (명령형 호출) |
| `listMotorSummaries` | `() => Promise<MotorSummary[]>` | 파생 view — motors+measure-records+race-records 조인 계산, 영속·캐시 금지. **정렬: sortOrder 오름차순**(listMotors와 동일 순서 — 화면 간 순서 불일치 금지). 소비: 모터 리스트(측정 요약 T-4)·레이스 진입 리스트(lastRace 요약 R-1, 부재 시 "레이스 기록 없음") | `motorKeys.summaries()` |
| `listMeasureRecordsByMotor` | `(motorId: string) => Promise<MeasureRecord[]>` | `by-motorId` index → **measuredAt 오름차순**(동률 시 id 오름차순) — 라인 차트 X축(T-5) 원천, 항상 ≤ `MEASURE_RECORD_LIMIT`(10). **최신 파노 = 마지막 요소** — 레이스 폼 자동 입력(R-3①)은 이 query 캐시 파생, 별도 query 없음(이중 원본 금지) | `measureKeys.byMotor(motorId)` |
| `listRaceRecordsByMotor` | `(motorId: string) => Promise<RaceRecord[]>` | `by-motorId` index → **createdAt 역순**(동률 시 id 역순) — 레이스 기록 리스트 최신순 (R-2) | `raceKeys.byMotor(motorId)` |

## 6. TanStack Query 설계 (entity-query-builder 입력)

### 6.1 로컬 정책 재확인 (AD-4a — 고정, v2 무변경)

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

오프라인에서도 전 query 정상 동작이 수용 기준이다.

### 6.2 Query Key Factory

```ts
// src/entities/motor/api/keys.ts
export const motorKeys = {
  root: ['motors'] as const,
  list: () => [...motorKeys.root, 'list'] as const,
  detail: (id: string) => [...motorKeys.root, 'detail', id] as const,
  summaries: () => [...motorKeys.root, 'summaries'] as const, // record 파생 — record mutation도 invalidate
}

// src/entities/measure-record/api/keys.ts
export const measureKeys = {
  root: ['measure-records'] as const,
  byMotor: (motorId: string) => [...measureKeys.root, 'by-motor', motorId] as const,
}

// src/entities/race-record/api/keys.ts
export const raceKeys = {
  root: ['race-records'] as const,
  byMotor: (motorId: string) => [...raceKeys.root, 'by-motor', motorId] as const,
}
```

`guideKeys`는 **제거**(RV-2).

### 6.3 queryOptions Factory (규약 예시)

```ts
// src/entities/motor/api/queries.ts
import { queryOptions } from '@tanstack/react-query'

export const motorQueries = {
  list: () => queryOptions({ queryKey: motorKeys.list(), queryFn: listMotors }),
  detail: (id: string) => queryOptions({ queryKey: motorKeys.detail(id), queryFn: () => getMotorById(id) }),
  summaries: () => queryOptions({ queryKey: motorKeys.summaries(), queryFn: listMotorSummaries }),
}

// src/entities/measure-record/api/queries.ts
export const measureQueries = {
  byMotor: (motorId: string) =>
    queryOptions({ queryKey: measureKeys.byMotor(motorId), queryFn: () => listMeasureRecordsByMotor(motorId) }),
}

// src/entities/race-record/api/queries.ts
export const raceQueries = {
  byMotor: (motorId: string) =>
    queryOptions({ queryKey: raceKeys.byMotor(motorId), queryFn: () => listRaceRecordsByMotor(motorId) }),
}
```

레이스 폼의 "최신 파노 자동 입력"(R-3①)은 `measureQueries.byMotor(motorId)` 결과의 **마지막 요소를 select 파생** — 전용 query·전용 캐시를 만들지 않는다.

### 6.4 Mutation → Invalidation 매트릭스 (feature-mutation-builder 입력)

| command | invalidate 대상 (전부 `await queryClient.invalidateQueries({queryKey})`) |
|---|---|
| `createMotor` | `motorKeys.root` |
| `updateMotor` | `motorKeys.root` |
| `deleteMotorCascade` | `motorKeys.root` · `measureKeys.root` · `raceKeys.root` |
| `reorderMotors` | `motorKeys.root` |
| `collectMeasureRecord` | `measureKeys.root` · `motorKeys.summaries()` |
| `createRaceRecord` | `raceKeys.root` · `motorKeys.summaries()` |
| `deleteRaceRecord` | `raceKeys.root` · `motorKeys.summaries()` |
| `resetAllRecords` | `measureKeys.root` · `raceKeys.root` · `motorKeys.summaries()` (motors 캐시는 유효 유지 — RV-A2) |
| `resetAllData` | `queryClient.clear()` (전체 캐시 파기 후 재조회) |
| 세션 4건 (`startCapture` 등) | 없음 (query 캐시 밖) |

mutation 어댑터 규약: `mutationFn: (input) => unwrap(command(input))` — `ok:false`가 throw로 변환되어 `onError`에서 `isDomainError` 분기(§3 매핑), `onSuccess`에서 위 매트릭스 invalidate. 파생 값(기록 수·최근 측정·마지막 레이스 요약)은 invalidation으로만 갱신 — `setQueryData` 수동 캐시 조작 금지. 단, **reorderMotors의 드래그 낙관 UI**는 로컬 컴포넌트 상태로 처리(드롭 확정 시 command → invalidate) — 캐시 직접 조작이 아니므로 허용.

## 7. v1 대비 제거 계약 (구현에서 삭제 — 잔존 시 결함)

| 제거 대상 | v1 위치 | 대체 |
|---|---|---|
| `createRecord`·`deleteRecord` command, `listRecordsByMotor`·`listSatisfiedRecords`·(v1형)`listMotorSummaries` query | `entities/run-record` | `entities/measure-record` + `entities/race-record` 분리 계약(§4.3/§4.4/§5) |
| `RunRecord` 스키마(voltage+satisfied+result 3택+null 측정쌍) | `entities/run-record/model` | `MeasureRecord`(측정 전용)·`RaceRecord`(주행 전용) — null 측정쌍 개념 소멸 |
| `computeGuide` 순수 함수·`GuideResult`/`GuideInsufficient`·`guideKeys`/`guideQueries`·voltage-guide slice 전체 | `features/voltage-guide` | **대체 없음 — 기능 제거**(RV-2) |
| Measurement handoff 3 command(`setConfirmedMeasurement`/`takeConfirmedMeasurement`/`clearConfirmedMeasurement`)·`measurementSchema` 값 객체·S2 소비 경로 | `entities/measurement/model` | `/record/new`(S2) 라우트 자체가 제거됨. **레이스 왕복(RV-1)은 비영속 세션 상태 — state-contract v2 소유로 위임**. 영속 접점은 `collectMeasureRecord` 1곳(§4.3) |
| `MOTOR_STATUS_GRADES`·`RUN_RESULTS`·`GUIDE_MIN_SATISFIED`·`WIDE_VARIANCE_THRESHOLD`·`MOTOR_MEMO_MAX_LENGTH` 상수 | `shared/config/domain.ts` | §1 v2 상수 블록 |
| `records` object store·schemaVersion v1 | `shared/lib/persistence` | v2 store 3종 — 구버전 DB는 파기 후 재생성(RV-3) |

## 8. 샘플 Fixture (단위 테스트 · Playwright seed 공유 canonical) — v2 모델

`src/shared/testing/seeds/`에 위치. **이 값이 canonical** — unit(fake-indexeddb)과 Playwright seed 주입 helper가 동일 상수를 import한다. 변형 시나리오(empty/max/손상 seed)는 이 normal seed 기준 파생 생성. ID는 결정적 UUID v4 형식(version 4·variant 8 — `z.uuid()` 통과). 전 기록이 스키마 불변식을 만족한다: `rpm === Math.round(panoHz × 60)`, panoHz 170~620 Hz 내, 전압 소수 ≤1자리, lapTimeMs 양의 정수.

### 8.1 모터 3개 (종류 3종 · sortOrder 0/1/2)

```ts
// src/shared/testing/seeds/motors.seed.ts
import type { Motor } from '@entities/motor'

export const MOTOR_SEED: readonly Motor[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: '마하대시 결전용',
    kind: 'mach_dash',                          // 마하대시
    sortOrder: 0,
    createdAt: '2026-07-01T09:00:00.000Z',
    updatedAt: '2026-07-25T04:30:00.000Z',      // 이름 수정 이력 있음
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: '하이퍼대시 연습 1호',
    kind: 'hyper_dash',                         // 하이퍼대시
    sortOrder: 1,
    createdAt: '2026-07-10T02:30:00.000Z',
    updatedAt: '2026-07-10T02:30:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: '아토믹튠 길들이기',
    kind: 'atomic',                             // 아토믹튠
    sortOrder: 2,
    createdAt: '2026-07-18T10:00:00.000Z',
    updatedAt: '2026-07-18T10:00:00.000Z',
  },
]
```

### 8.2 MeasureRecord 14건 (M1 = 10건 **rolling 상한 경계** · M2 = 3건 · M3 = 1건)

```ts
// src/shared/testing/seeds/measure-records.seed.ts
import type { MeasureRecord } from '@entities/measure-record'

const M1 = '00000000-0000-4000-8000-000000000001' // mach_dash — 상한 10건 (rolling 삭제 경계 검증)
const M2 = '00000000-0000-4000-8000-000000000002' // hyper_dash — 3건 (차트 소수 점)
const M3 = '00000000-0000-4000-8000-000000000003' // atomic — 1건 (단일 점 차트 케이스)

export const MEASURE_SEED: readonly MeasureRecord[] = [
  // ── 모터 1 (10건 = MEASURE_RECORD_LIMIT): 길들이기 진행으로 파노 상승 추세 — 차트 스토리
  { id: '00000000-0000-4000-8000-000000000201', motorId: M1, panoHz: 495.3, rpm: 29718, measuredAt: '2026-07-10T05:10:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000202', motorId: M1, panoHz: 498.1, rpm: 29886, measuredAt: '2026-07-11T05:40:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000203', motorId: M1, panoHz: 499.8, rpm: 29988, measuredAt: '2026-07-13T04:20:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000204', motorId: M1, panoHz: 501.4, rpm: 30084, measuredAt: '2026-07-15T06:05:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000205', motorId: M1, panoHz: 503.6, rpm: 30216, measuredAt: '2026-07-17T07:30:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000206', motorId: M1, panoHz: 505.2, rpm: 30312, measuredAt: '2026-07-19T03:00:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000207', motorId: M1, panoHz: 506.4, rpm: 30384, measuredAt: '2026-07-21T03:10:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000208', motorId: M1, panoHz: 507.9, rpm: 30474, measuredAt: '2026-07-23T09:45:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000209', motorId: M1, panoHz: 509.1, rpm: 30546, measuredAt: '2026-07-25T10:15:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000210', motorId: M1, panoHz: 511.7, rpm: 30702, measuredAt: '2026-07-26T08:00:00.000Z' },

  // ── 모터 2 (3건): 완만한 변동
  { id: '00000000-0000-4000-8000-000000000211', motorId: M2, panoHz: 402.5, rpm: 24150, measuredAt: '2026-07-16T08:20:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000212', motorId: M2, panoHz: 405.8, rpm: 24348, measuredAt: '2026-07-20T12:50:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000213', motorId: M2, panoHz: 404.1, rpm: 24246, measuredAt: '2026-07-24T05:35:00.000Z' },

  // ── 모터 3 (1건): 신품 첫 측정 — 단일 점 차트 케이스
  { id: '00000000-0000-4000-8000-000000000214', motorId: M3, panoHz: 298.4, rpm: 17904, measuredAt: '2026-07-19T11:05:00.000Z' },
]
```

### 8.3 RaceRecord 5건 (finished/retired 혼합 · lapTimeMs 생략 2건 · M3 = 0건)

```ts
// src/shared/testing/seeds/race-records.seed.ts
import type { RaceRecord } from '@entities/race-record'

const M1 = '00000000-0000-4000-8000-000000000001' // 3건 — 최신 finished가 R-1 요약
const M2 = '00000000-0000-4000-8000-000000000002' // 2건 — 최신 retired(lapTime 생략)가 R-1 요약
// M3: 0건 — "레이스 기록 없음" 요약 케이스

export const RACE_SEED: readonly RaceRecord[] = [
  // ── 모터 1: 전압 탐색 스토리 — 3.0 완주 → 3.2 과전압 이탈 → 3.1 완주(랩 단축)
  { id: '00000000-0000-4000-8000-000000000301', motorId: M1, panoHz: 503.6, result: 'finished',
    voltage: 3.0, lapTimeMs: 21875, createdAt: '2026-07-20T06:10:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000302', motorId: M1, panoHz: 507.9, result: 'retired',
    voltage: 3.2, createdAt: '2026-07-23T10:30:00.000Z' },                  // 이탈 — lapTimeMs 생략
  { id: '00000000-0000-4000-8000-000000000303', motorId: M1, panoHz: 511.7, result: 'finished',
    voltage: 3.1, lapTimeMs: 21432, createdAt: '2026-07-26T08:40:00.000Z' }, // 최신 — R-1 요약 원천

  // ── 모터 2: 완주 후 승압 이탈
  { id: '00000000-0000-4000-8000-000000000304', motorId: M2, panoHz: 405.8, result: 'finished',
    voltage: 2.8, lapTimeMs: 23120, createdAt: '2026-07-22T07:00:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000305', motorId: M2, panoHz: 404.1, result: 'retired',
    voltage: 3.0, createdAt: '2026-07-25T09:20:00.000Z' },                  // 최신 — lapTime 없는 요약 케이스
]
```

### 8.4 Seed 기반 기대값 (unit assert canonical)

| 검증 대상 | 입력 | 기대값 |
|---|---|---|
| `listMotors` 정렬 | seed 전체 | sortOrder 오름차순: M1 → M2 → M3 |
| `reorderMotors` | `{orderedIds: [M3, M1, M2]}` | 성공 후 sortOrder: M3=0, M1=1, M2=2 — listMotors 순서 즉시 반영, 부분 반영 없음 |
| `reorderMotors` 순열 위반 | `{orderedIds: [M1, M2]}` (누락) | `validation` — 무변경 |
| `collectMeasureRecord` rolling | M1(10건 상태)에 `{panoHz: 513.2, rpm: 30792}` 수집 | 성공, **건수 10 유지** — 최고(最古) `…201`(07-10) 삭제 + 신규 삽입이 단일 트랜잭션. `listMeasureRecordsByMotor(M1)` 첫 요소 = `…202` |
| `listMeasureRecordsByMotor(M1)` | seed | measuredAt 오름차순 10건: 201 → … → 210. 마지막 요소(511.7) = 레이스 폼 자동 입력값 |
| `countRecordsByMotor` | M1 / M2 / M3 | **13 / 5 / 1** (Measure+Race 합산) — cascade confirm "기록 13건이 함께 삭제됩니다"(M1) |
| `deleteMotorCascade(M1)` | seed | `{ deletedRecordCount: 13 }`, measure·race 양쪽 store에 motorId=M1 잔존 0건 |
| `listRaceRecordsByMotor(M1)` | seed | createdAt 역순: 303 → 302 → 301. 302는 lapTimeMs 필드 부재(undefined 미저장) |
| `listMotorSummaries` | seed 전체 | sortOrder 순 3건. M1: measureCount 10·lastMeasure 210·raceCount 3·lastRace 303(완주 3.1 V) / M2: 3·213·2·305(이탈, lapTime 없음) / M3: 1·214·0·**lastRace undefined**("레이스 기록 없음") |
| `resetAllRecords` | seed | `{ deletedMeasureCount: 14, deletedRaceCount: 5 }` — motors 3건 유지(RV-A2), meta 유지 |
| rehydrate 완화 (SC-A8) | panoHz 650.0(현 대역 밖·소수 1자리 아님도 포함) 저장 행 | `measureRecordSchema` **통과**(≤2,000 완화) — `collectMeasureInputSchema`는 **거부**(write-strict) |

## 9. 구현 파일 계획 (Phase 3 — 본 wave에서는 생성하지 않음)

MSW handlers/browser.ts는 **해당 없음**. 아래는 entity-query-builder·feature-mutation-builder·persistence 구현 담당이 생성한다.

| 파일 | 내용 | 담당 |
|---|---|---|
| `src/shared/config/domain.ts` | §1 v2 상수·라벨 맵 전부 (제거 상수 5종 삭제 포함) | 최초 빌더 |
| `src/shared/lib/result/index.ts` | `Result`·`ok`·`err`·`unwrap` — v1 무변경 | 〃 |
| `src/shared/lib/errors/{domain-error,messages}.ts` | `DomainError` 11코드·메시지 맵·`fromZodError` | 〃 |
| `src/shared/lib/schema/pano.ts` | §2.0 `panoHzWriteSchema`·`panoHzStoredSchema`·`panoRpmPair` (정의 1곳) | 〃 |
| `src/shared/lib/persistence/{db,init,with-transaction,reset,schema}.ts` | idb open v2(구버전 파기 재생성)·`initPersistence`·`withTransaction`·`resetAllRecords`·`resetAllData` | persistence(F4) — 상세는 state-contract v2 |
| `src/entities/motor/model/{schema,types}.ts` | §2.2 + `MotorSummary` | entity-query-builder |
| `src/entities/motor/api/{repository,keys,queries}.ts` | command 4·query 4·`motorKeys`·`motorQueries` | 〃 |
| `src/entities/measure-record/model/{schema,types}.ts` | §2.3 | 〃 |
| `src/entities/measure-record/api/{repository,keys,queries}.ts` | `collectMeasureRecord`·`listMeasureRecordsByMotor`·`measureKeys`·`measureQueries` | 〃 |
| `src/entities/race-record/model/{schema,types}.ts` | §2.4 | 〃 |
| `src/entities/race-record/api/{repository,keys,queries}.ts` | `createRaceRecord`·`deleteRaceRecord`·`listRaceRecordsByMotor`·`raceKeys`·`raceQueries` | 〃 |
| `src/app/providers/query-client.ts` | §6.1 로컬 정책 QueryClient — v1 무변경 | app(F9) |
| `src/shared/testing/seeds/{motors,measure-records,race-records}.seed.ts` | §8 fixture + 변형(empty/max/손상) 파생 helper | 테스트 빌더 (unit·Playwright 공용) |
| mutation hooks (`features/*/api/use-*.ts`) | §6.4 매트릭스 준수 `useMutation` 래퍼 (reorder 낙관 UI 포함) | feature-mutation-builder |

삭제 담당(§7 잔존 금지): `entities/run-record/**` · `entities/measurement/**` · `features/voltage-guide/**` · `/record/new` 라우트 — 구현 라운드에서 물리 삭제하고 import 잔존 0건을 확인한다.

## 10. 완료 조건 (이 계약의 수용 기준)

- 영속 command 9건·query 6건 전부에 입력 zod 스키마(해당 시)·반환 타입·precondition·오류 코드가 명세됨 — revision-v2-brief와 1:1
- 영속 command 전건이 `Result<T, DomainError>` 봉투를 사용하고, 매 mutation에 invalidation 대상 key가 정의됨 (stale 파생값 0건 경로)
- **rolling 10**(collectMeasureRecord 삽입+초과 삭제)과 **reorderMotors**(전 행 sortOrder 재부여)가 단일 트랜잭션 계약으로 명시됨 — 중간 상태 관측 불가
- persisted 데이터 경계(rehydrate)에 runtime zod 검증 + SC-A8 write-strict/read-lenient 이원화 + enum evolution·optional·시각/정렬 규칙이 명시됨
- 오류 taxonomy 11코드가 사용자 메시지·UI 처리와 매핑되고, 구버전 DB 재생성(RV-3)이 `data-corrupt`와 구분됨
- §7 제거 계약이 v1 잔존물(run-record·measurement handoff·voltage-guide·구 상수)을 전수 열거함
- fixture: 모터 3(종류 3종·sortOrder 0/1/2)·MeasureRecord 14(M1 rolling 상한 10 경계)·RaceRecord 5(완주/이탈 혼합·lapTimeMs 생략 2) + 기대값 11케이스(rolling·reorder·합산 count·요약·완화 rehydrate)가 결정적 수치로 assert 가능

## 11. Open Items (v2 신규·승계)

### 신규 (본 개정)

| ID | 내용 | 성격 | 처리 |
|---|---|---|---|
| AR-1 | `createMotor`의 sortOrder = 현재 max+1(리스트 끝 추가) — brief 미규정 위치 정책 | ASSUMPTION | 리스트 맨 앞 추가 요구 시 command 1곳 수정 |
| AR-2 | `RaceRecord.panoHz`는 write에도 stored(완화) 스키마 — 출처가 항상 기존/직전 MeasureRecord이므로 (§2.4 각주) | 설계 결정 | 본 문서로 확정 |
| AR-3 | `reorderMotors`는 updatedAt 미갱신(배치 메타 ≠ 내용 편집) | 설계 결정 | 본 문서로 확정 |
| AR-4 | `listMotorSummaries` 소유 slice = `entities/motor/api`(3-store 조인) — MeasureRecord/RaceRecord 타입 참조가 FSD cross-import 규칙에 걸리면 요약 필드 구조 타이핑(최소 필드 인라인)으로 완화 | 구현 위임 | entity-query-builder가 위치 확정, 이중 정의 금지만 계약 |
| AR-5 | 레이스 폼 "최신 파노" = `listMeasureRecordsByMotor` 캐시 마지막 요소 select 파생 — 전용 query 없음 | 설계 결정 | 이중 원본 금지 — 본 문서로 확정 |
| — | `countRecordsByMotor` = Measure+Race **합산**·명령형 호출(캐시 없음) — cascade confirm "기록 n건" 문구 유지 | 설계 결정 | v1 결정 승계 + 합산 범위 v2 확정 |

### brief ASSUMPTION 승계 (이의 시 계약 변경 지점)

| ID | 내용 | 이의 시 영향 |
|---|---|---|
| RV-A1 | MeasureRecord 개별 삭제 없음(rolling·cascade·초기화뿐) | `deleteMeasureRecord` command 1건 + invalidation 1행 추가 |
| RV-A2 | `resetAllRecords` 범위 = 기록만(모터 유지) | 전체 삭제로 바꾸면 `resetAllData` 재사용으로 축소 |
| RV-A3 | RaceRecord 개별 삭제 있음(기본) | 제거 시 `deleteRaceRecord` command 삭제 |

### state-contract v2 위임 (본 문서는 표면 계약만 고정)

① `deleteMotorCascade`(3-store)·`collectMeasureRecord`(rolling)·`reorderMotors` 트랜잭션 원자성·롤백 상세 ② schemaVersion v2·구버전 파기 재생성 절차(RV-3)·recovery ③ 동시 탭 마지막 쓰기 정책(reorder 순열 검증과의 상호작용 포함) ④ **레이스 왕복(RV-1) 세션 상태 전체**(raceReturn 진입·폼 보존·자동 확정·자동 복귀·[기록] 버튼 숨김 모드) ⑤ M-1/M-2 자동 시작·자동 정지 상태 머신 상세.
