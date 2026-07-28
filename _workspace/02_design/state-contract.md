# State Contract — minicar-motor-lab

> Phase 2 Wave 1 산출물 (state-contract-designer). 구현 전 상태 계약 — 소스 코드 아님(타입·시그니처 스케치는 사양).
> 입력: `_workspace/01_plan/` project-brief(§state-contract 위임 4건) · feature-plan(§3~§5 데이터 모델·command 인벤토리) · requirements(REQ-ST-005/007, REQ-F-007, REQ-NFR-006) · checkpoint-phase1(CP-1/CP-3, F-1~F-4 전달 지시) · plan-review(F-1~F-4) · ux-brief · `local-domain-state.md` 계약.
> 결정 반영: **CP-1**(Motor = statusGrade enum + statusMemo 병행) · **CP-3**(모터 삭제 = confirm 후 cascade 확정) · **D2**(측정값 nullable) · **FP-A3**(UUID v4 + createdAt 정렬, 동률 2차 키 id) · **FP-A4**(RunRecord immutable — ASSUMPTION 등재).

## Mode

LOCAL_DOMAIN_STATE_MODE: **true**

- IndexedDB가 도메인 데이터(motors·records·meta)의 **유일한 authoritative store**. 서버·HTTP API 없음 — 본 문서의 command/query 계약이 REST 계약을 대체한다.
- 적용 범위 한정 (해당 없음 근거): MVP에 **필터·검색·가상화·reorder·다중 선택이 없다**(feature-plan §0 — A7 규모 1,000건을 단순 목록으로 수용, 정렬은 createdAt 파생 고정이며 사용자 reorder 없음). 따라서 filtered-view index 변환·hidden-data 삭제·multi-selection stale ID 불변식은 **N/A**이며, 해당 기능 도입 시(REQ-F-009 확장 등) 본 계약을 재검증한다(§Verification Matrix에 조건 명시).
- localStorage 사용 **0건** (theme·설정 영속 없음). storage key는 IndexedDB DB 이름 하나뿐(§Persistence).

## State Ownership

| State | Authoritative Owner | Derived Views (영속·캐시 금지) | Persistence |
|---|---|---|---|
| Motor 컬렉션 | IndexedDB `motors` — `entities/motor/api` | S3 모터 요약 카드(기록 수·최근 기록), "최근 사용순" 정렬(FP-A1) | IndexedDB v1 |
| RunRecord 컬렉션 | IndexedDB `records` — `entities/run-record/api` | S4 모터별 시간 역순 이력, S5 가이드 추천 범위·분포·근거(`computeGuide` 매 진입 재계산) | IndexedDB v1 |
| DB meta | IndexedDB `meta` — `shared/lib/persistence` | — | IndexedDB v1 |
| Persistence 가용성 (`InitResult`) | `app/` 부트스트랩 상태 (initPersistence 결과값) | 전역 배너(unavailable) / 복구 UI(corrupted) 분기 | 비영속 — 부팅 시 probe |
| Measurement 확정값 | in-memory **single-slot** — `entities/measurement` | S2 읽기전용 측정값 카드 | 비영속 (§Commands F3 — slot 수명 규칙) |
| 측정 세션 상태(`MeasureStatus` 6종 중 idle·no-permission·suspended) + 실시간 f₀/RPM 프레임 | `features/measure-session` 세션 로컬 store (zustand feature-scope) | S1 상태 라벨·수치 표시 | 비영속 — 세션 수명과 함께 소멸 |
| 권한 거부 감지 상태(cause·denialCount — F-2) | `features/measure-session` 세션 로컬 | no-permission 문구·버튼 분기 | **비영속** — 새로고침 시 초기화, 영구 거부 여부를 저장하지 않음(브라우저 설정이 SoT) |
| react-query 캐시 | 파생 view 캐시 — authoritative 아님 | 모든 목록·집계 화면 | 비영속. `staleTime: Infinity` + mutation commit 후 명시 invalidation(AD-4a) |

### Derived view 무결성 — mutation → invalidation 계약

"만족 기록 삭제 시 가이드 집계 즉시 반영"(위임 4)은 이 표로 보장한다. mutation **commit 성공 후에만** invalidate — 실패/abort 시 캐시 불변.

| Command (commit 성공 시) | Invalidated query keys |
|---|---|
| `createMotor` / `updateMotor` | `motors`, `motorSummaries`, `motorById(id)` |
| `deleteMotorCascade` | `motors`, `motorSummaries`, `motorById(id)`, `recordsByMotor(id)`, `satisfiedRecords(id)`, `recordCount(id)` |
| `createRecord` | `recordsByMotor(motorId)`, `satisfiedRecords(motorId)`, `recordCount(motorId)`, `motorSummaries` |
| `deleteRecord` | `recordsByMotor(*)`, `satisfiedRecords(*)`, `recordCount(*)`, `motorSummaries` (record→motorId 역참조 없이 predicate invalidation — 규모상 비용 무시 가능) |
| `resetAllData` | 전체 캐시 clear |

가이드 결과(`GuideResult`)는 query 캐시조차 두지 않는다 — `listSatisfiedRecords` 캐시 + 렌더 시 `computeGuide` 순수 계산(stale 집계 구조적 차단, REQ-F-006).

## Storage Schema v1 (IndexedDB)

### DB Identity

- DB 이름: `minicar-motor-lab` / IDB native version: **1** / `SCHEMA_VERSION = 1` (`shared/lib/persistence` 상수)
- 라이브러리: idb 8.0.0 typed `DBSchema` + `upgrade` 콜백 (AD-6)

| Store | keyPath | Index | 내용 |
|---|---|---|---|
| `motors` | `id` | (없음 — 최대 규모 30, 전건 스캔 충분) | Motor 행 |
| `records` | `id` | `by-motorId`(motorId, non-unique) · `by-createdAt`(createdAt, non-unique) | RunRecord 행 |
| `meta` | (out-of-line, 고정 key `'app'`) | (없음) | `{ schemaVersion: number }` 단일 행 |

```ts
// shared/lib/persistence/schema.ts — DBSchema 스케치 (사양)
interface MotorLabDB extends DBSchema {
  motors: { key: string; value: Motor }
  records: { key: string; value: RunRecord; indexes: { 'by-motorId': string; 'by-createdAt': string } }
  meta: { key: 'app'; value: { schemaVersion: number } }
}
```

### 엔티티 필드 계약 (v1)

```ts
// entities/motor — CP-1 확정: statusGrade + statusMemo 병행
const MOTOR_STATUS_GRADES = ['new', 'breaking_in', 'prime', 'aged'] as const // CP-1a baseline: 신품·길들이기중·전성기·노화
type MotorStatusGrade = (typeof MOTOR_STATUS_GRADES)[number]                 // 라벨 맵은 shared/config — 상수 1곳 교체

interface Motor {
  id: string                            // 구조 필드 — UUID v4(crypto.randomUUID), 생성 후 불변
  name: string                          // 편집 필드 — trim 후 1~30자 (SC-A2)
  statusGrade: MotorStatusGrade | null  // 편집 필드 — null = 미지정 (필수 아님, SC-A1)
  statusMemo: string                    // 편집 필드 — 0~200자, 기본 '' (SC-A2)
  createdAt: string                     // 구조 필드 — ISO 8601, 불변
  updatedAt: string                     // command 관리 메타 — updateMotor 성공 시에만 갱신, 호출자 지정 불가
}

// entities/run-record — FP-A4: immutable (생성·삭제만)
const RUN_RESULTS = ['finished', 'course_out', 'not_run'] as const // D4 baseline
interface RunRecord {
  id: string             // 구조 필드 — UUID v4, 불변
  motorId: string        // 구조 필드 — FK, commit 시점에 motors에 존재 필수 (INV-03)
  voltage: number        // 0.1~9.9 V, 소수 ≤2자리 (A5 — shared/config VOLTAGE_RANGE)
  panoHz: number | null  // D2: null 허용. 비null 시 엔진 산출값만 (UX-A3 — 수동 입력 경로 없음)
  rpm: number | null     // 불변식: (panoHz===null)===(rpm===null) ∧ 비null 시 rpm===round(panoHz×60)
  result: RunResult
  satisfied: boolean     // 가이드 집계의 유일 원천 — result와 독립
  createdAt: string      // 구조 필드 — 정렬 키, 불변
}

// shared/lib/persistence — meta
interface DbMeta { schemaVersion: number } // IDB native version과 이중 기록 — §Persistence 참조
```

### zod rehydrate 계약 (persisted JSON = 외부 입력)

- 스키마는 `entities/*/model`에 **단일 정의** — command precondition 검증과 rehydrate 검증이 같은 zod 스키마를 공유한다(AD-7). **TypeScript type assertion으로 rehydrate 금지.**
- 검증 시점 2중: ① **부팅 full-scan** — `initPersistence`가 motors·records·meta 전 행을 zod parse + 참조 무결성(INV-03) 검사(max fixture 1,030행, 1회성 — §Fixtures 예산). 실패 시 `corrupted`. ② **read 경계** — 모든 query가 반환 전 행 단위 zod parse(다른 탭의 신버전 쓰기 등 런타임 오염 방어). 실패 시 D-10 경로(빈 목록 위장 금지).
- **write-strict / read-lenient 이원화 (SC-A8)**: `panoHz`는 write 시 탐색 대역(170~620 Hz, shared/config `F0_RANGE`) 엄격 검증, rehydrate 시 완화 검증(유한 양수 ≤ 2,000). 근거 — 알고리즘 대역 상수 변경이 기존 정상 데이터를 corrupt로 오판하지 않게. 쌍 불변식(INV-06)·voltage 범위·enum·UUID·ISO datetime은 양쪽 모두 엄격.

### 구조 필드 vs 편집 필드 분리 (Non-Negotiable)

| Entity | 구조 필드 (어떤 patch로도 변경 불가) | 편집 필드 (일반 edit command) | 구조 변경 command |
|---|---|---|---|
| Motor | `id`, `createdAt` (+ `updatedAt`은 command 전용 메타) | `name`, `statusGrade`, `statusMemo` — `updateMotor` patch 타입이 이 3개만 허용 | `createMotor`, `deleteMotorCascade` |
| RunRecord | **전 필드** (FP-A4 immutable) | 없음 — update command 부재. 수정 필요 시 삭제+재생성(사용자 절차) | `createRecord`, `deleteRecord` |
| Measurement | 값 객체 전체 교체만 (필드 patch 없음) | 없음 | `set/take/clearConfirmedMeasurement` |

`update(Entity, Partial<Entity>)` 형태의 범용 update는 **금지** — patch 타입에 구조 필드가 컴파일 타임에 존재하지 않고, command 계층이 런타임(zod)으로 재검증한다.

## Invariants

Severity: **hard** = 위반 시 release hard stop(qa-state 게이트) / **policy** = 계약 위반이나 즉시 데이터 손상 아님(수정 필수).

| ID | Aggregate | Invariant | Severity |
|---|---|---|---|
| INV-01 | Motor | `id`는 UUID v4, `motors` 내 중복 0건 (keyPath + add 시맨틱) | hard |
| INV-02 | RunRecord | `id`는 UUID v4, `records` 내 중복 0건 | hard |
| INV-03 | 참조 | 모든 commit된 시점에 `records.motorId ∈ motors.id` — dangling reference 0건 | hard |
| INV-04 | Motor | 구조 필드 `id`·`createdAt` 생성 후 불변, `updatedAt`은 `updateMotor` 성공 시에만 갱신 | hard |
| INV-05 | RunRecord | 전체 immutable — 필드 변경 command 자체가 없음 (FP-A4) | hard |
| INV-06 | RunRecord | `(panoHz===null)===(rpm===null)` ∧ 비null 시 `rpm===Math.round(panoHz×60)` | hard |
| INV-07 | RunRecord | write 시 `voltage ∈ [0.1, 9.9]` ∧ 소수 ≤2자리 (A5) | hard |
| INV-08 | 목록 전체 | 정렬 전순서 결정적: `createdAt` 내림차순, 동률 시 `id` 사전순 오름차순 (FP-A3) — 모든 목록 query 동일 비교자 | hard |
| INV-09 | 파생 값 | 기록 수·최근 기록 요약·최근 사용순 키·가이드 결과를 IndexedDB/localStorage에 영속하지 않음 (이중 원본 금지) | hard |
| INV-10 | 가이드 | `satisfied`가 집계의 유일 원천. mutation commit 후 stale 집계 관찰 불가(§invalidation 계약 + 가이드 무캐시) | hard |
| INV-11 | meta | ready 상태에서 `meta['app'].schemaVersion === SCHEMA_VERSION`, 정확히 1행 | hard |
| INV-12 | 트랜잭션 | 다중 store mutation(`deleteMotorCascade`·`createRecord`)은 단일 IDB 트랜잭션 — 부분 commit 관찰 불가, abort 시 무변경 | hard |
| INV-13 | 측정 표시 | `status==='weak-signal'` ⇒ `f0===null ∧ rpm===null` (`DisplayEstimate` 타입 강제 — 0 RPM·이전 값 표시 금지) | hard |
| INV-14 | Measurement slot | slot ≤ 1건. `set`은 stable 확정 시에만. `take`는 소비(직후 slot=null, 1회). 새 세션 시작(`startCapture`)·비-CTA S1 이탈 시 clear — stale 자동 채움 0건 | hard |
| INV-15 | 세션 스트림 | 고빈도 f₀/RPM 프레임은 `features/measure-session` 로컬 상태만 — 전역 store·영속 금지 | hard |
| INV-16 | rehydrate | persisted JSON은 외부 입력 — 모든 read 경계 zod 검증, type assertion 금지 | hard |
| INV-17 | 권한 감지 | 일시/영구 거부 감지 상태(cause·denialCount)는 세션 한정 비영속 — 영속 시 브라우저 설정 변경과 어긋난 오표시 위험 | policy |
| INV-18 | 텍스트 상한 | `name` ≤30자, `statusMemo` ≤200자 (SC-A2 — quota 예산·UI 계약 공용) | policy |

## Commands

### 공통 계약

- 전 command는 `Result<T, DomainError>` 반환 — **throw로 UI를 관통하지 않는다**. query 6건도 동일하게 Result 반환(읽기 실패를 값으로 전파해야 D-10 "빈 목록 위장 금지"가 성립).
- 검증 이중화: UI 인라인(즉시 피드백) + command precondition(zod 재검증) — UI 검증에만 의존 금지.
- persistence 게이트: repository command/query는 `initPersistence`가 `ready`일 때만 수행. `unavailable`이면 `{kind:'storage', cause:'unavailable'}` 실패(전역 배너 사전 고지 + 저장 시도 시 명시 실패 — 성공 오표시 금지, C-5).
- typed failure taxonomy:

```ts
type DomainError =
  | { kind: 'validation'; field: string; code: 'required' | 'range' | 'format' | 'pair' | 'enum' | 'max-length' }
  | { kind: 'not-found'; entity: 'motor'; id: string }
  | { kind: 'storage'; cause: 'unavailable' | 'quota' | 'io' }   // quota = DOMException 'QuotaExceededError'
  | { kind: 'corrupt-read' }                                     // read 경계 zod 실패 → D-10 UI
```

### 다중 store 트랜잭션 원자성 (위임 1 — 확정)

`shared/lib/persistence`의 `withTransaction(stores, mode, fn)`이 유일한 다중 store 진입점이다.

1. **단일 IDBTransaction**: 나열된 store 전체를 한 트랜잭션으로 연다. `fn` 내부의 모든 read/write는 이 tx 파생 request만 사용.
2. **auto-commit 위험 차단**: tx를 열기 전에 모든 비-IDB async 작업(id 생성·zod 검증·시각 생성)을 완료한다. `fn` 내부에서 IDB request 외의 promise를 await하지 않는다(마이크로태스크 경계에서 IDB가 자동 commit되는 스펙 동작 방어).
3. **실패 = 무변경**: `fn` throw/reject 또는 개별 request 오류 ⇒ `tx.abort()` ⇒ 해당 tx의 모든 변경이 폐기된다(rollback은 IDB 엔진 보장). commit 성공 후에만 `ok` 반환 + invalidation 수행. abort 시 캐시도 불변.
4. **직렬화 보장**: 같은 store를 겹치는 readwrite 트랜잭션은 IDB가 (cross-tab 포함) 직렬화한다. 따라서 `createRecord`의 FK 확인과 `deleteMotorCascade`가 경합해도 — createRecord 선commit이면 cascade가 그 기록까지 삭제, cascade 선commit이면 createRecord가 not-found 실패. **어느 순서든 INV-03 성립** — dangling이 생기는 교차 실행은 존재하지 않는다.
5. entity 간 import 금지 유지: `deleteMotorCascade`는 `entities/motor/api` 소유로 이 helper를 통해 `records` store에 접근한다(entity 코드 import가 아닌 store 접근).

### Persistence commands (F4)

| Command | Preconditions | Atomic Updates | Postconditions | Failure |
|---|---|---|---|---|
| `initPersistence() → InitResult` | 없음 (부팅 진입점, 멱등 — 재호출 시 캐시된 연결 반환) | ① `openDB(name, 1, {upgrade})` ② upgrade 필요 시 v-migration(단일 upgrade tx) ③ meta 검증 ④ 전 행 full-scan zod + INV-03 검사 | ready 시: 연결 캐시, INV-11 성립, 전 행 유효. `detail:'migrated'`면 데이터가 신 스키마로 변환 완료 | throw 없음 — 항상 상태값 반환. open 불가/API 부재 → `unavailable`, upgrade 실패·scan 실패·VersionError → `corrupted` (§Persistence recovery) |
| `resetAllData() → Result<void>` | **복구 UI에서만 진입 가능**(라우팅 상 다른 진입점 없음) + F-1 confirm 통과(§Destructive Actions) | `indexedDB.deleteDatabase(name)` → `initPersistence` 재실행으로 v1 재생성 (deleteDatabase는 스펙상 원자적) | motors=0건·records=0건·meta.schemaVersion=1, InitResult=`ready(ok)`, 전체 캐시 clear | storage io → 복구 UI 유지 + 오류 표시 + 수동 재시도 (crash loop 금지) |
| `withTransaction(stores, mode, fn)` (내부 helper) | 연결 ready | 위 원자성 계약 1~4 | all-or-nothing | abort ⇒ 무변경 + storage io |

```ts
type InitResult =
  | { status: 'ready'; detail: 'ok' | 'migrated' }               // 위임 2의 3-상태 중 ok/migrated
  | { status: 'unavailable'; reason: 'no-indexeddb' | 'open-failed' } // private 모드 등 — 복구 대상 아님(데이터 없음), 배너 고지
  | { status: 'corrupted' }                                       // 3-상태 중 corrupted → 복구 UI
```

위임 2의 3-상태(ok/migrated/corrupted)는 `ready(ok)`/`ready(migrated)`/`corrupted`로 대응하고, feature-plan의 `unavailable`은 복구 축과 직교하는 가용성 상태로 함께 유지한다(측정은 가능 — 저장만 불가).

### Motor commands (F5)

| Command | Preconditions | Atomic Updates | Postconditions | Failure |
|---|---|---|---|---|
| `createMotor({name, statusGrade?, statusMemo?}) → Result<Motor>` | ready · zod: name trim 1~30자(C-7) · statusGrade ∈ enum ∪ null · statusMemo ≤200자 | tx[`motors`] rw: `add({id: randomUUID(), …, createdAt=updatedAt=now})` — id/createdAt 호출자 지정 불가 | 모터 존재·조회 가능, 목록 count+1, INV-01/04 성립, invalidation 수행 | `validation`(C-7: field='name', code='required') / `storage`(quota·io — C-4) |
| `updateMotor(id, patch: {name?, statusGrade?, statusMemo?}) → Result<Motor>` | ready · patch 타입에 구조 필드 부재(컴파일) + zod 재검증(런타임) · 대상 존재(동일 tx 내 get) | tx[`motors`] rw: get → 편집 3필드만 merge → `updatedAt=now`로 put | `id`·`createdAt` 불변(INV-04), 편집 필드+updatedAt 외 변경 0, invalidation | `not-found`(동시 탭 선삭제 — C-8: draft 유지+오류 표시+목록 갱신) / `validation` / `storage` |
| `deleteMotorCascade(id) → Result<{deletedRecordCount}>` | UI: ConfirmDialog 통과(n=`countRecordsByMotor` 실측, §Destructive) · command: ready (존재 여부는 tx 내 판정) | **tx[`motors`,`records`] rw 단일 트랜잭션**: `by-motorId` getAllKeys → 전건 delete → motors.delete(id) | 모터 부재 ∧ 해당 motorId 기록 0건(INV-03 — tx 내 재조회 건수 기준이므로 confirm 표시 n이 stale이어도 **잔존 없음**) · 타 행 불변 · invalidation | abort ⇒ **무변경**(모터·기록 모두 잔존, C-3 취소와 동일 상태) + `storage` io. 대상 부재 시 멱등 성공 `{deletedRecordCount:0}` (SC-A4 — LWW 수렴, 잔존 dangling 기록도 index 기준 정리되는 self-healing) |

### RunRecord commands (F6)

| Command | Preconditions | Atomic Updates | Postconditions | Failure |
|---|---|---|---|---|
| `createRecord(draft) → Result<RunRecord>` | ready · zod: motorId UUID / voltage INV-07(H-2) / result ∈ RUN_RESULTS / satisfied boolean / 측정값 쌍 INV-06(둘 다 있거나 둘 다 null·생략, 비null 시 panoHz ∈ F0_RANGE ∧ rpm 재계산 일치) · **feature 계층 제출 중 single-flight 가드**(H-4 — command는 호출마다 새 id를 생성하므로 중복 방지는 제출 가드가 계약) | **tx[`motors`,`records`] rw 단일 트랜잭션**: motors.get(motorId) → 부재 시 abort / 존재 시 records.add({id: randomUUID(), createdAt=now, …}) — FK 확인과 add가 같은 tx (위임 1 계약 4) | commit 시점 INV-03 성립, 기록 조회 가능, D2: 측정값 생략 시 panoHz=rpm=null 저장(H-3), invalidation | `validation`(H-2 field 단위) / `not-found`(motor — 폼에 오류 표시, 입력 유지) / `storage`(quota·io — **C-4: 입력 유지+오류 배너+[다시 저장], 성공 오표시 금지**) |
| `deleteRecord(id) → Result<void>` | UI: confirm 통과(C-2) · command: ready | tx[`records`] rw: delete(id) | 기록 부재, invalidation(가이드 집계 **즉시 반영** — INV-10), 취소 시 무변경 | 멱등 — 이미 부재면 성공(SC-A4). `storage` io |

### Queries (F5·F7·F8 — 전건 Result 반환, INV-08 정렬, read 경계 zod)

| Query | Preconditions | 계약 (Postconditions) | Failure |
|---|---|---|---|
| `listMotors() → Result<Motor[]>` | ready | 전 모터, createdAt desc·id asc(INV-08). S2/S5 선택 리스트 원본(최근 사용순은 summaries에서 파생) | `corrupt-read`/`storage` → **D-10**: 빈 목록 위장 금지, 오류+[다시 시도] |
| `getMotorById(id) → Result<Motor \| undefined>` | ready | 부재는 `ok(undefined)`(오류 아님 — S4 라우트 가드가 처리) | 동일 |
| `countRecordsByMotor(motorId) → Result<number>` | ready | `by-motorId` index count — cascade confirm의 n 실측치 | 동일 |
| `listRecordsByMotor(motorId) → Result<RunRecord[]>` | ready | 해당 모터 기록, createdAt desc·id asc — S4 이력·가이드 근거 공용 | 동일 (D-10) |
| `listMotorSummaries() → Result<{motor, recordCount, lastRecord?}[]>` | ready | 파생 join(영속 금지 — INV-09). 정렬 = 최근 사용순(FP-A1: 소속 기록 max createdAt, 없으면 motor.createdAt, desc·id asc) | 동일 |
| `listSatisfiedRecords(motorId) → Result<RunRecord[]>` | ready | `satisfied===true`만, createdAt desc — `computeGuide` 입력 | 동일 |

### 순수 함수 `computeGuide` (F8 — IO 없음)

- pre: 입력은 `listSatisfiedRecords` 결과 배열(satisfied만). post(결정적): `n < GUIDE_MIN_SATISFIED(3)` ⇒ `{kind:'insufficient', satisfiedCount:n, needed:3−n}`(E-2, 0·1·2건 동일 계약) / `n ≥ 3` ⇒ `{kind:'recommendation', rangeMin=min(voltage), rangeMax=max(voltage), distribution: 전압 오름차순 ×건수, wideVariance=(max−min)≥WIDE_VARIANCE_THRESHOLD(0.5), evidence: createdAt desc}`(E-3/E-4). 실패 없음(순수 계산) — 상수는 전부 `shared/config`.

### Measurement handoff (F3 — 비영속 single-slot, `entities/measurement`)

| Command | Preconditions | Atomic Updates | Postconditions | Failure |
|---|---|---|---|---|
| `setConfirmedMeasurement(m)` | 호출자는 F2 stable 확정 전이 시점만(INV-14) · m: f0 ∈ F0_RANGE 유한, rpm===round(f0×60), capturedAt=now | slot ← m (전체 교체 — 새 stable이 이전 값 덮어씀) | slot 1건 | 없음 (동기 in-memory) |
| `takeConfirmedMeasurement() → Measurement \| null` | 없음 | read-and-clear (원자적 소비) | **직후 slot=null** — 1회 소비(H-5) | 없음 — 빈 slot이면 null → S2 "측정값 없음" 카드 |
| `clearConfirmedMeasurement()` | 없음 (멱등) | slot ← null | slot=null | 없음 |

**slot 수명 규칙 (stale 방지 — 위임 지시)**: slot은 stable 확정(set) 시점부터 다음 중 **최초 발생**까지만 유효 — ① S1 stable CTA 경유 S2 진입 시 take(소비 후 clear) ② [다시 측정] = `startCapture`(새 세션이 clear — INV-14) ③ CTA가 아닌 경로로 S1 이탈(탭 전환 등) 시 clear. 따라서 S3 "+기록" 직접 진입은 항상 "측정값 없음"이며, weak-signal·미측정 상태에서 채워지는 경로가 구조적으로 없다. S2 내 측정값 카드 "비우기"는 폼 로컬 상태 조작(slot은 이미 소비됨).

### 측정 세션 commands (F2 — 비영속, `features/measure-session`)

| Command | Preconditions (가드) | Atomic Updates (세션 상태) | Postconditions | Failure |
|---|---|---|---|---|
| `startCapture()` | status ∈ {idle, stable} · `isSecureContext===true`(아니면 진입 자체 차단 — D-4, 권한 오류와 혼용 금지) · **사용자 제스처 핸들러 내** 호출 | slot clear(INV-14) → `getUserMedia`(DSP-off·mono) → `AudioContext.resume()` → 실제 sampleRate로 엔진 초기화 | 성공: `measuring` + 프레임 스트림 시작. `state!=='running'`: `suspended`(측정 미시작 — D-5 가드) | `NotAllowedError` → `no-permission` + F-2 분류. `NotFoundError`/`NotReadableError` → `no-permission` + cause=`device-error` 별도 문구(SC-A5) |
| `stopCapture()` | 활성 세션 존재 | 트랙 정지·Worker 정지·프레임 폐기 | `idle`. slot은 stable 확정분만 유지(measuring/weak-signal 중단은 set된 적 없음) | 없음 |
| `retryPermission()` | status===`no-permission` ∧ cause===`temporary` · 제스처 내 | getUserMedia 재시도 | 허용 → `measuring`. 거부 → denialCount+1, **세션 내 누적 ≥2회 ⇒ cause=`permanent` 승격**(F-2 fallback) | 위와 동일 매핑 |
| `resumeAudio()` | status===`suspended` · 제스처 내 | `ctx.resume()` | `running` ⇒ `measuring` 재개, 아니면 `suspended` 유지(+안내) | 없음 (상태 유지) |

**상태 전이표** (6-status — `measuring·stable·weak-signal`은 엔진 track 산출, `idle·no-permission·suspended`는 세션 머신 소유):

| From → To | Trigger / Guard |
|---|---|
| idle → measuring | `startCapture` 성공 |
| idle → no-permission / suspended | 권한 거부 / `state!=='running'` |
| measuring ↔ weak-signal | 신뢰 게이트 통과/미달 (엔진 — 수치는 INV-13, 세션 유지·자동 복귀 D-9) |
| measuring → stable | 안정 판정(엔진) — **동시에 캡처 자동 정지(UX-A1) + `setConfirmedMeasurement`** |
| measuring/weak-signal → idle | `stopCapture` / 탭 전환·백그라운드(UX-A2 — 세션 종료, 백그라운드 녹음 없음) |
| measuring → suspended | AudioContext statechange ≠ running |
| stable → measuring | [다시 측정] = `startCapture`(새 세션, slot clear 후 재확정 시 재set) |
| no-permission → measuring | `retryPermission` 허용 |
| suspended → measuring | `resumeAudio` 성공 |

**F-2 권한 일시/영구 감지 전략 (확정)**:
1. `navigator.permissions.query({name:'microphone'})`을 try/catch로 probe — **가용 시** `PermissionStatus` 구독: `denied` ⇒ cause=`permanent`(설정 안내 문구+[설정 방법 보기]), `prompt` ⇒ `temporary`(+[권한 다시 요청]), `onchange`로 granted 전환 감지 시 no-permission 해제(idle 복귀 — 캡처 시작은 여전히 제스처 필요).
2. **미가용 fallback (iOS Safari — getUserMedia가 두 경우 모두 NotAllowedError)**: 세션 내 NotAllowedError 누적 **2회 이상**이면 영구 거부 안내로 승격. 승격은 안내 강도 조정일 뿐 — [권한 다시 요청]은 계속 제공(오판 시 사용자가 재시도로 복구 가능).
3. 감지 상태(cause·denialCount)는 **세션 상태(비영속)** — INV-17. 실동작 검증은 D-3 실기기 세션(mock 재현 불가).

## Destructive Actions

| Action | Hidden Data Policy | Confirm/Undo | Cascade |
|---|---|---|---|
| `deleteRecord` | MVP에 필터·검색 없음 → 숨겨진 대상 없음. 대상은 **탭한 행의 entity id**로만 지정(view index 사용 금지) | confirm "이 기록을 삭제할까요?" → 확인 시에만 실행, 취소 시 무변경(C-2). undo 미제공(SC-A3 — confirm으로 갈음) | 없음. commit 후 목록·가이드 즉시 반영(INV-10) |
| `deleteMotorCascade` (CP-3 확정) | 삭제 대상 기록은 **화면에 보이지 않아도** 전건 삭제됨 — 건수는 렌더된 행이 아닌 `countRecordsByMotor` **실측치**로 고지. tx 내 재조회 기준 삭제이므로 confirm 후 다른 탭이 추가한 기록도 잔존하지 않음(INV-03) | ConfirmDialog: "'{모터명}'과 기록 {n}건이 함께 삭제됩니다. 되돌릴 수 없습니다." · destructive 스타일 · **초기 포커스=[취소]** · focus trap · 닫힘 후 트리거 복귀(REQ-NFR-003). 취소 ⇒ 무변경. undo 미제공 | motors 1건 + records n건 — **단일 트랜잭션**(위임 1). abort ⇒ 전량 잔존 |
| `resetAllData` (F-1 확정) | 전체 DB — 화면 표시 여부와 무관한 전량 삭제. **복구 UI(corrupted 상태)에서만 진입 가능** — 정상 화면 어디에도 트리거 없음 | REQ-ST-007급 confirm: 명시 확인 + **"모든 모터·기록이 삭제되며 복구할 수 없습니다"** 고지(export Won't — 기록이 유일 자산임을 전제) + **초기 포커스=[취소]**. undo 불가 명시 | 전체 store(motors·records·meta) → v1 빈 스키마 재생성 |
| 측정값 카드 "비우기" (S2) | — | confirm 불요 — 영속 데이터 아닌 폼 로컬 조작(UX-A3) | 없음 |

UI 계층 규칙: destructive 가능 여부를 UI의 숨김·필터 결과 개수로 판단하지 않는다(MVP는 해당 view가 없고, confirm 건수는 항상 store 실측).

## Persistence

### schema/version

- storage key: IndexedDB DB 이름 `minicar-motor-lab` 단 1개 (localStorage 0건). IDB native version **1** = 구조(store·index) 버전 — `upgrade(oldVersion)` 트리거. `meta['app'].schemaVersion = SCHEMA_VERSION(1)` = 데이터 형태 버전 — 부팅 검증(INV-11)과 zod 스키마 선택 기준. 두 값은 v1에서 동일하며 함께 bump한다(이중 기록 이유: meta 부재/불일치 자체가 corruption 신호).

### migration

- **upgrade 절차**: `upgrade(db, oldVersion, newVersion, tx)`에서 `switch(oldVersion)` **fallthrough**(case 0 → case 1 → …)로 순차 적용. v0→1: `motors`(keyPath id)·`records`(keyPath id + by-motorId·by-createdAt index)·`meta` 생성 + `meta.put({schemaVersion:1},'app')`. upgrade 콜백 전체가 **단일 versionchange 트랜잭션** — 실패 시 스펙상 전량 abort되어 구버전이 그대로 남고, `initPersistence`가 `corrupted`를 반환한다(반쯤 migrate된 상태 불가).
- **additive-first 원칙**: 향후 버전은 ① 새 필드는 optional/nullable + read-시 zod `.default()` ② 기존 필드 의미 변경 금지 ③ 데이터 rewrite가 필요하면 upgrade tx 내 cursor로 수행. **FP-A4 확장 경로**: RunRecord update가 필요해지면 v2에서 `updatedAt` 필드 additive 추가 + `updateRecord` command 신설 — 기존 데이터 rewrite 불요.
- **downgrade**: 구버전 코드가 신버전 DB를 열면 IDB가 `VersionError` — `corrupted`로 분류해 복구 UI로 연결(자동 reset 금지, 메시지로 "앱을 새로고침하세요" 우선 안내 — static-cdn no-cache index.html 정책상 희귀 케이스).

### invalid-state recovery

- `initPersistence` 결과 3-상태(위임 2): `ready(ok)` / `ready(migrated)` / `corrupted` + 직교 상태 `unavailable`(§Commands).
- **corrupted 판정 조건**: open/upgrade 실패(비-가용성 원인) · VersionError · meta 부재/불일치 · 부팅 full-scan에서 zod parse 실패 또는 dangling reference 발견. 판정 단위는 DB 전체(SC-A6 — row quarantine 없음).
- **복구 UI(F9)**: 실패는 예외가 아니라 상태값이므로 error boundary crash가 아닌 전용 화면 렌더 — crash loop 금지. 액션 2개: [다시 시도](initPersistence 재실행 — 자동 재시도는 최대 1회, 이후 수동만) / [모든 데이터 삭제 후 초기화](`resetAllData`, F-1 confirm 필수). 측정(S1)은 persistence와 무관하게 동작 가능함을 함께 고지.
- `unavailable`: 복구 대상 아님(데이터 자체가 없음) — 전역 고정 배너 "이 브라우저에서는 기록이 저장되지 않습니다 (측정은 가능)"(C-5), 저장 command는 명시 실패.

### quota/size/count budget

- 행 크기 추정: Motor ≤ 400 B(name 50 + memo 200 상한 — INV-18), RunRecord ≤ 300 B. max fixture(모터 30·기록 1,000) 총 ≈ **0.5 MB 미만** — 브라우저 quota(수십 MB~GB) 대비 무시 가능 수준이라 선제 eviction·`storage.estimate` 감시는 도입하지 않는다.
- count 하드 상한은 강제하지 않는다(SC-A7 — A7의 30/1,000은 성능 fixture 규모이지 제한이 아님).
- **quota 실패 UX**: 그래도 write가 `QuotaExceededError`로 실패하면 `{kind:'storage', cause:'quota'}` — C-4 계약(실패 명시 + 입력값 유지 + [다시 저장], 성공 오표시 금지, 데이터 소실 금지). 부팅·읽기에는 quota 경로 없음.
- 브라우저 데이터 삭제 시 소실은 허용(A3 — export Won't, 소실 위험은 UI 고지).

### 동시 탭 정책 (위임 3 — 확정)

- **마지막 쓰기 승리(last-write-wins)**: 같은 DB를 연 복수 탭의 mutation은 IDB 트랜잭션 직렬화에 따라 commit 순서대로 적용되고, 나중 commit이 이긴다. 충돌 병합·버전 벡터·잠금은 도입하지 않는다.
- **탭 간 즉시 동기화는 비요구**: BroadcastChannel·storage 이벤트 브리지·`versionchange` 핸들러 동기화를 구현하지 않는다. **근거** — 단일 사용자 개인 도구(A3)로 동시 탭은 비정상 사용 패턴이고, requirements Scenario Review가 카테고리 I(동시성/실시간)를 명시 배제하며 "마지막 쓰기 정책 명문화"로 범위를 축소했다. 다른 탭의 변경은 해당 탭의 다음 read(재진입·refetch·invalidation)에서 자연 반영된다.
- **안전 경계는 유지**: ① 원자성·FK는 탭 수와 무관(위임 1 계약 4 — cross-tab 직렬화로 INV-03 보장) ② 편집 중 외부 삭제는 `updateMotor` not-found 실패로 표면화 — **미저장 draft는 시트에 유지**한 채 오류 표시+목록 갱신(예고 없는 draft 소실 금지, C-8) ③ stale confirm 건수는 tx 내 재조회로 무해(§Destructive).

## Fixtures & Interaction Budget

| Fixture | 구성 (shared/testing/seeds) | 용도 |
|---|---|---|
| empty | 모터 0 / 기록 0 | E-1 빈 상태, 첫 사용 |
| normal | 모터 2~3 / 기록 수 건 (만족 0·1·2·3건 변주, 측정값 null 포함, 전압 분산 케이스) | E-2/E-3/E-4, H-3, C-2/C-3 |
| max | **모터 30 / 기록 1,000** (A7) | E-5 성능, 부팅 scan 예산 |
| invalid | 손상 행(zod 불합격)·구버전 스키마·meta 불일치·dangling 기록 seed | C-6 recovery, migrated 경로 |

Interaction budget: max fixture에서 목록 렌더·가이드 계산·삭제 반영 **p95 < 200 ms**(REQ-NFR-001) / 부팅 `initPersistence`(open+scan) **< 500 ms**(1회성 — SC-A9, E-5와 함께 측정) / 측정 계열 예산(1코어<20%, ≥10 Hz, 확정≤3 s)은 엔진 계약(F1) 소관.

## Verification Matrix

### local-domain-state 필수 matrix 인스턴스화

| View state | Mutation | 적용 | Assertion / N/A 근거 | Evidence |
|---|---|---|---|---|
| filter/search active | delete | **N/A** | MVP에 필터·검색·가상화 없음(feature-plan §0) — 삭제 대상은 항상 entity id. **재검증 조건**: 목록 필터 도입 시(REQ-F-009 확장) 본 행을 활성화 | — (도입 시 신규 시나리오) |
| filter/search active | move/reorder | **N/A** | reorder 기능 없음 — 정렬은 createdAt 파생 고정(INV-08), 사용자 순서 변경 UI 부재 | — |
| multi-selection | delete/move | **N/A** | 다중 선택 없음 — 삭제는 단건 confirm뿐 | — |
| detail edit active | external/domain update | 적용 | 동시 탭이 대상 모터 삭제 → `updateMotor`가 not-found 실패, **미저장 draft 예고 없이 소실 금지**(시트 유지+오류+목록 갱신) — LWW 정책의 표면화 | **C-8**: unit(fake-indexeddb — 삭제 후 update → not-found) + component(jsdom — draft 유지) |
| persisted old/invalid state | rehydrate | 적용 | invalid seed → `corrupted` → 복구 UI(crash loop 금지) / 구버전 seed → upgrade → `ready(migrated)` / type assertion 경로 0건 | **C-6**: unit(fake-indexeddb invalid·구버전 seed) |
| max fixture | frequent update | 적용 | 30/1,000 seed에서 목록·가이드·삭제 상호작용 p95<200 ms + 부팅 scan<500 ms | **E-5**: browser(Playwright max seed 주입) |

### Requirement ↔ Scenario ↔ Test Level ↔ Evidence

| Requirement | Scenario | Test Level | Evidence |
|---|---|---|---|
| REQ-F-003 모터 등록·수정 | C-1 정상 등록/수정 + 구조 필드 불변(INV-04) | unit + browser | fake-indexeddb: updateMotor 후 id/createdAt 불변 assert / Playwright 등록→목록 반영 |
| REQ-F-003 이름 검증 실패 | **C-7** (F-4 부여): 이름 미입력/공백/30자 초과 → validation 실패·저장 안 됨 | unit + component | zod required·max-length / 시트 인라인 오류 표시 |
| REQ-F-004 기록 저장 | H-1 정상 / H-2 검증 실패(전압·모터 미선택) / H-3 측정값 null(D2) / H-4 중복 탭 | unit + browser | createRecord pre/post + INV-06 쌍 / single-flight 가드 browser |
| REQ-F-005 목록·재방문 | E-1 empty / E-6 재방문 persistence | browser | seed 주입 + 재로드 |
| REQ-F-005 읽기 실패 | **D-10** (F-4 부여): IDB 읽기/parse 실패 → **빈 목록 위장 금지** + 오류+[다시 시도] | unit + component | read 실패 주입 → Result 실패 전파 / 오류 상태 렌더+refetch 버튼 |
| REQ-F-006 / REQ-ST-006 가이드 | E-2 부족(0·1·2건) / E-3 3+건 추천 / E-4 분산 큼 | unit(seed) + browser | computeGuide 순수 unit + S5 표시 |
| REQ-F-007 / REQ-NFR-006 rehydrate | C-6 손상·구버전 → migrate 또는 복구 UI | unit | fake-indexeddb invalid seed, crash loop 부재 |
| REQ-ST-005 write 실패·quota | C-4 실패 명시+입력 유지+재시도 / C-5 unavailable 배너 | unit + browser(+device) | write 실패 주입 / private 모드 |
| REQ-ST-005 전체 reset | **C-9** (본 문서 신규): 복구 UI 진입 → F-1 confirm(고지 문구·초기 포커스 취소) → 전량 삭제 → ready(ok). confirm 취소 시 무변경 | unit + component | resetAllData post-state / ConfirmDialog 계약 |
| REQ-ST-007 기록 삭제 | C-2 confirm 후 삭제·가이드 즉시 반영·취소 무변경 | unit + browser | INV-10 invalidation assert |
| REQ-ST-007 cascade | C-3 confirm(n 실측 고지) → 단일 tx 삭제 → dangling 0(INV-03) / abort 시 무변경(INV-12) | unit + browser | fake-indexeddb: tx abort 주입 → 전량 잔존 assert / Playwright confirm 흐름 |
| REQ-F-008 자동 채움 | H-5 stable→S2 채움, weak-signal·미측정 시 미채움 | browser | Playwright fake media |
| REQ-F-008 slot stale 방지 | **H-6** (본 문서 신규): take 1회 소비 후 재진입 미채움 / 다시 측정·비-CTA 이탈 시 clear(INV-14) | unit + browser | slot store unit + 내비게이션 시나리오 |
| REQ-ST-001 권한 감지(F-2) | D-2 일시 거부(browser 권한 mock) / D-3 영구 거부·fallback 승격(2회 누적) | unit + browser + device | denialCount 승격 로직 unit / Permissions API mock / iOS 실기기 |
| REQ-ST-002/004 세션 가드 | D-4 비보안 컨텍스트 / D-5 suspended 시 측정 미시작 | unit + browser(+device) | 전이 가드 순수 함수 unit |
| REQ-ST-003 weak-signal null | D-8 무음·SNR0dB → f0/rpm null(INV-13) | unit + browser | fixture + 타입 강제 |
| REQ-NFR-001 max 성능 | E-5 p95<200 ms + 부팅 scan 예산 | browser | max seed |
| 동시 탭 LWW | **C-8** (본 문서 신규): 위 필수 matrix 행 | unit + component | 상동 |

신규 부여 시나리오 ID: **C-7·D-10**(plan-review F-4 지시 이행), **C-8·C-9·H-6**(본 계약이 요구하는 검증 공백 보강 — QA 계획에 승계 요망).

## Assumptions and Blockers

### ASSUMPTION (검토 시 이의 없으면 baseline 유지)

| ID | 내용 | 검증/영향 |
|---|---|---|
| **FP-A4** (plan-review F-3 승격 등재) | RunRecord는 **immutable** — 생성·삭제만, update command 없음. 전압 오타·만족 재평가는 삭제+재생성으로 수행 | 사용자 마찰 발생 시 v2 additive migration(updatedAt 추가+updateRecord 신설)으로 확장 — 데이터 rewrite 불요(§migration). Phase 2 검토 목록 |
| SC-A1 | `statusGrade`는 nullable(null=미지정), 저장 시 기본 등급 자동 부여 없음 — CP-1 "필수 아님" 해석. UI 기본 선택 여부는 component-spec 소관(스키마 영향 없음) | CP-1a enum 값과 함께 component-spec 검토 시 사용자 확인 |
| SC-A2 | 텍스트 상한 name ≤30자 / statusMemo ≤200자 — quota 예산·UI 계약 공용 baseline | 상수 1곳(`shared/config`), 조정 시 zod max만 교체 |
| SC-A3 | 삭제 undo 미제공 — confirm으로 갈음(ux-brief 전 화면에 undo 부재, 개인 도구·즉시 cascade 정합) | 사용자 이의 시 soft-delete 설계 필요(스키마 영향) — 현 baseline 유지 |
| SC-A4 | delete 계열은 멱등(대상 부재=성공, cascade는 index 기준 self-healing) — LWW 수렴 정합 | unit으로 고정 |
| SC-A5 | getUserMedia 비권한 오류(NotFound/NotReadable)는 `no-permission` status + cause=`device-error` 별도 문구 — status enum 확장 없음 | component-spec에 문구 위임 |
| SC-A6 | corrupted 판정 단위 = DB 전체(row quarantine 없음) — export Won't 환경에서 부분 구제 경로가 없어 복잡도 대비 이득 없음 | 실사용 손상 사례 발생 시 재검토 |
| SC-A7 | count 하드 상한 미강제 — A7(30/1,000)은 성능 fixture 규모. quota 실패는 C-4 경로가 전담 | 실사용 규모 확인(A7)과 함께 |
| SC-A8 | panoHz 검증 이원화: write 엄격(F0_RANGE) / rehydrate 완화(유한 양수 ≤2,000) — 대역 상수 변경이 기존 데이터를 corrupt로 오판하지 않게 | 상수 변경 시 회귀 unit |
| SC-A9 | 부팅 full-scan 검증 채택(corrupted 결정적 판정) + 예산 <500 ms @max fixture | E-5에서 함께 측정, 초과 시 lazy 검증으로 전환(계약 재설계) |

### BLOCKER

- **신규 없음.** PB-C1(CP-1)·D3(CP-3)·A1(CP-2)은 체크포인트에서 해소, D1·D2·D4는 baseline 진행 확인됨. 승계 운영 항목: 실기기 검증 세션(B1 — D-3/D-5 device evidence, owner: 사용자)만 유지.
