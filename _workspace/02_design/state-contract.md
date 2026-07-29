# State Contract — minicar-motor-lab (v2)

> Revision v2 산출물 (state-contract-designer). 구현 전 상태 계약 — 소스 코드 아님(타입·시그니처 스케치는 사양).
> **canonical 입력: `_workspace/01_plan/revision-v2-brief.md`** (충돌 시 이 브리프가 feature-plan v1·requirements v1을 이긴다) + v1 state-contract의 승계 계약(트랜잭션 원자성·zod rehydrate·corrupted 판정·LWW).
> 확정 결정 반영: **RV-1**(레이스 [측정] 왕복 — 안정 판정 시 자동 확정·자동 복귀) · **RV-2**(전압 추천 완전 제거) · **RV-3**(마이그레이션 없음 — 구버전 DB 삭제 후 재생성) · **RV-A1**(MeasureRecord 개별 삭제 없음) · **RV-A2**(resetAllRecords는 모터 유지) · **RV-A3**(RaceRecord 개별 삭제 있음).
> v1 대비 제거·신설 총람은 문서 말미 §Changelog(v1→v2) 참조.

## Mode

LOCAL_DOMAIN_STATE_MODE: **true**

- IndexedDB가 도메인 데이터(motors·measureRecords·raceRecords·meta)의 **유일한 authoritative store**. 서버·HTTP API 없음 — 본 문서의 command/query 계약이 REST 계약을 대체한다.
- 적용 범위: v2에서 **사용자 reorder(모터 드래그앤드롭, T-6)가 신설**되어 order 불변식(연속성·중복 금지)이 계약에 편입된다. 필터·검색·가상화·다중 선택은 여전히 없다 — 해당 N/A 근거와 재검증 조건은 §Verification Matrix에 유지.
- localStorage 사용 **0건**. storage key는 IndexedDB DB 이름 하나뿐(§Persistence). 레거시 DB 이름(`minicar-motor-lab`)은 부팅 시 삭제 대상(RV-3).

## State Ownership

| State | Authoritative Owner | Derived Views (영속·캐시 금지) | Persistence |
|---|---|---|---|
| Motor 컬렉션 (sortOrder 포함) | IndexedDB `motors` — `entities/motor/api` | 모터 리스트(sortOrder순)·모터 선택 팝업(M-6)·레이스 모터 리스트(R-1) | IndexedDB v2 |
| MeasureRecord 컬렉션 | IndexedDB `measureRecords` — `entities/measure-record/api` | 모터별 기록 리스트(T-4, 최신순 ≤10)·라인 차트(T-5)·레이스 폼 파노 자동 입력값(R-3①) | IndexedDB v2 |
| RaceRecord 컬렉션 | IndexedDB `raceRecords` — `entities/race-record/api` | 모터별 레이스 리스트(R-2, 최신순)·마지막 레이스 요약(R-1) | IndexedDB v2 |
| DB meta | IndexedDB `meta` — `shared/lib/persistence` | — | IndexedDB v2 |
| Persistence 가용성 (`InitResult`) | `app/` 부트스트랩 상태 | 전역 배너(unavailable) / 복구 UI(corrupted) / 1회성 재생성 고지(recreated) | 비영속 — 부팅 시 probe |
| **레이스 왕복 handoff (RV-1)** — `{motorId, draft, startedAt}` single-slot | in-memory feature-scope store (`features/race-measure-handoff`) | 측정 화면의 raceReturn 모드 표시([기록] 버튼 제거·모드 배지), 복귀 시 레이스 폼 복원 | **비영속** — 새로고침 시 소실(SC2-A1), §Commands 왕복 계약의 slot 수명 규칙 |
| 레이스 입력 폼 draft (결과·전압·랩타임) | 폼 로컬 상태. **[측정] 왕복 중에는 handoff slot이 소유권 인계** — 복귀 시 반환 | 레이스 입력 폼 | 비영속 |
| 측정 세션 상태(`idle·measuring·weak-signal·no-permission·suspended`) + 실시간 파노/RPM 프레임 + **내부 안정 판정 신호(isStable)** | `features/measure-session` 세션 로컬 store | 게이지(주=파노 170~620 Hz, 보조=RPM — M-4)·상태 라벨(M-7)·[기록] 활성 판단(M-5)·raceReturn 자동 확정 트리거(RV-1) | 비영속 — 세션 수명과 함께 소멸. **stable은 v2에서 UI 상태가 아니라 내부 신호**(M-3) |
| 권한 거부 감지 상태(cause·denialCount) | `features/measure-session` 세션 로컬 | no-permission 문구·버튼 분기 | 비영속 — 브라우저 설정이 SoT (v1 승계) |
| react-query 캐시 | 파생 view 캐시 — authoritative 아님 | 모든 목록·요약 화면 | 비영속. `staleTime: Infinity` + commit 후 명시 invalidation (v1 승계) |

### Derived view 무결성 — mutation → invalidation 계약

mutation **commit 성공 후에만** invalidate — 실패/abort 시 캐시 불변 (v1 승계).

| Command (commit 성공 시) | Invalidated query keys |
|---|---|
| `createMotor` / `updateMotor` | `motors`, `motorById(id)`, `raceMotorSummaries` |
| `reorderMotors` | `motors`, `raceMotorSummaries` (정렬 원본 공유) |
| `deleteMotorCascade` | `motors`, `motorById(id)`, `measureRecordsByMotor(id)`, `raceRecordsByMotor(id)`, `recordCounts(id)`, `raceMotorSummaries` |
| `collectMeasureRecord` | `measureRecordsByMotor(motorId)`, `recordCounts(motorId)` |
| `createRaceRecord` | `raceRecordsByMotor(motorId)`, `raceMotorSummaries` |
| `deleteRaceRecord` | `raceRecordsByMotor(*)`, `raceMotorSummaries` (record→motorId 역참조 없이 predicate invalidation — 규모상 비용 무시 가능) |
| `resetAllRecords` | `measureRecordsByMotor(*)`, `raceRecordsByMotor(*)`, `recordCounts(*)`, `raceMotorSummaries` — `motors`·`motorById`는 불변(모터 유지, RV-A2) |
| `resetAllData` | 전체 캐시 clear |

마지막 레이스 요약(R-1)·차트 점 좌표(T-5)는 query 결과에서 렌더 시 파생 — 별도 영속·캐시 금지(INV-09).

## Storage Schema v2 (IndexedDB)

### DB Identity

- DB 이름: **`mml-db`** / IDB native version: **2** / `SCHEMA_VERSION = 2` (`shared/lib/persistence` 상수)
- 레거시 DB 이름 `minicar-motor-lab`(v1): 부팅 시 `indexedDB.deleteDatabase`로 제거 시도 — §Persistence.
- 라이브러리: idb typed `DBSchema` + `upgrade` 콜백 (v1 승계)

| Store | keyPath | Index | 내용 |
|---|---|---|---|
| `motors` | `id` | (없음 — 최대 규모 30, 전건 스캔 충분. sortOrder 정렬은 메모리 정렬) | Motor 행 |
| `measureRecords` | `id` | `by-motorId`(non-unique) | MeasureRecord 행 (모터당 ≤10 rolling) |
| `raceRecords` | `id` | `by-motorId`(non-unique) | RaceRecord 행 |
| `meta` | (out-of-line, 고정 key `'app'`) | (없음) | `{ schemaVersion: number }` 단일 행 |

```ts
// shared/lib/persistence/schema.ts — DBSchema 스케치 (사양)
interface MmlDB extends DBSchema {
  motors: { key: string; value: Motor }
  measureRecords: { key: string; value: MeasureRecord; indexes: { 'by-motorId': string } }
  raceRecords: { key: string; value: RaceRecord; indexes: { 'by-motorId': string } }
  meta: { key: 'app'; value: { schemaVersion: number } }
}
```

### 엔티티 필드 계약 (v2)

```ts
// entities/motor — T-1: 이름 + 종류만. statusGrade/statusMemo 제거
const MOTOR_KINDS = [
  'm130', 'atomic', 'torque', 'rev', 'hyper_dash',
  'power_dash', 'sprint_dash', 'ultra_dash', 'mach_dash',
] as const // 저장은 안정 식별자, 표시 라벨 맵(130·아토믹튠·…·마하대시)은 shared/config — 상수 1곳
type MotorKind = (typeof MOTOR_KINDS)[number]

interface Motor {
  id: string          // 구조 필드 — UUID v4(crypto.randomUUID), 생성 후 불변
  name: string        // 편집 필드 — trim 후 1~30자 (SC-A2 승계)
  kind: MotorKind     // 편집 필드 — enum 9종
  sortOrder: number   // 순서 필드 — 0..n-1 연속 정수. reorderMotors 전용(updateMotor patch에 부재), 생성 시 말미 append
  createdAt: string   // 구조 필드 — ISO 8601, 불변
  updatedAt: string   // command 관리 메타 — updateMotor 성공 시에만 갱신. reorderMotors는 미갱신(SC2-A4)
}

// entities/measure-record — T-2: 수집 전용 immutable, 수동 입력·수정·개별 삭제 없음(RV-A1)
interface MeasureRecord {
  id: string          // 구조 필드 — UUID v4, 불변
  motorId: string     // 구조 필드 — FK, commit 시점에 motors 존재 필수 (INV-03)
  panoHz: number      // 비null 필수 — 엔진 산출값만. write 시 F0_RANGE(170~620), rehydrate 완화(SC-A8 승계)
  rpm: number         // 비null 필수 — rpm === Math.round(panoHz × 60) (INV-06)
  measuredAt: string  // 구조 필드 — ISO 8601, 정렬·rolling eviction 키
}

// entities/race-record — immutable + 개별 삭제 허용(RV-A3)
const RACE_RESULTS = ['finished', 'retired'] as const // 완주 / 이탈 2택 (R-3②)
interface RaceRecord {
  id: string          // 구조 필드 — UUID v4, 불변
  motorId: string     // 구조 필드 — FK (INV-03)
  panoHz: number      // 비null 필수 — 최신 MeasureRecord 자동 입력 또는 RV-1 왕복 측정값 (SC2-A6)
  result: (typeof RACE_RESULTS)[number]
  voltage: number     // 0.1~9.9 V, 소수 ≤2자리 (VOLTAGE_RANGE — v1 A5 승계)
  lapTimeMs?: number  // 옵션 — 양의 정수 ms, ≤ 3,600,000 (SC2-A2)
  createdAt: string   // 구조 필드 — 정렬 키, 불변
}

// shared/lib/persistence — meta
interface DbMeta { schemaVersion: number } // IDB native version과 이중 기록 — §Persistence
```

### zod rehydrate 계약 (persisted JSON = 외부 입력 — v1 전면 승계)

- 스키마는 `entities/*/model`에 **단일 정의** — command precondition 검증과 rehydrate 검증이 같은 zod 스키마를 공유. **TypeScript type assertion으로 rehydrate 금지** (INV-16).
- 검증 2중: ① **부팅 full-scan** — `initPersistence`가 4개 store 전 행 zod parse + 참조 무결성(INV-03) + sortOrder 연속성(INV-19) 검사. 실패 시 `corrupted`. ② **read 경계** — 모든 query가 반환 전 행 단위 zod parse. 실패 시 D-10 경로(빈 목록 위장 금지).
- **write-strict / read-lenient (SC-A8 승계)**: `panoHz`(MeasureRecord·RaceRecord 공통)는 write 시 F0_RANGE(170~620 Hz) 엄격, rehydrate 시 완화(유한 양수 ≤2,000). 쌍 불변식(INV-06)·voltage 범위·enum·UUID·ISO datetime·sortOrder 정수성은 양쪽 모두 엄격.

### 구조 필드 vs 편집 필드 분리 (Non-Negotiable)

| Entity | 구조 필드 (어떤 patch로도 변경 불가) | 편집 필드 (일반 edit command) | 구조 변경 command |
|---|---|---|---|
| Motor | `id`, `createdAt`, **`sortOrder`** (+ `updatedAt`은 command 전용 메타) | `name`, `kind` — `updateMotor` patch 타입이 이 2개만 허용 | `createMotor`, `deleteMotorCascade`, **`reorderMotors`**(순서 필드의 유일 진입점) |
| MeasureRecord | **전 필드** (immutable — T-2) | 없음 — update·개별 delete command 부재(RV-A1). 삭제 경로는 rolling eviction·cascade·resetAllRecords·resetAllData뿐 | `collectMeasureRecord` (생성+eviction) |
| RaceRecord | **전 필드** (immutable) | 없음 — 수정 없음(R-7). 오입력 복구는 삭제+재입력 | `createRaceRecord`, `deleteRaceRecord`(RV-A3) |
| 왕복 handoff | slot 객체 전체 교체만 (필드 patch 없음) | 없음 | `beginRaceMeasure` / `consumeRaceMeasureReturn` / `cancelRaceMeasure` |

`update(Entity, Partial<Entity>)` 형태의 범용 update **금지** — patch 타입에 구조 필드가 컴파일 타임에 존재하지 않고, command 계층이 런타임(zod)으로 재검증한다 (v1 승계).

## Invariants

Severity: **hard** = 위반 시 release hard stop(qa-state 게이트) / **policy** = 계약 위반이나 즉시 데이터 손상 아님(수정 필수).

| ID | Aggregate | Invariant | Severity |
|---|---|---|---|
| INV-01 | Motor | `id`는 UUID v4, `motors` 내 중복 0건 | hard |
| INV-02 | MeasureRecord·RaceRecord | `id`는 UUID v4, 각 store 내 중복 0건 | hard |
| INV-03 | 참조 | 모든 commit된 시점에 `measureRecords.motorId ∈ motors.id` ∧ `raceRecords.motorId ∈ motors.id` — dangling reference 0건. cascade 범위 = **두 record store 전부** | hard |
| INV-04 | Motor | 구조 필드 `id`·`createdAt` 불변. `updatedAt`은 `updateMotor` 성공 시에만. `sortOrder`는 `createMotor`(append)·`reorderMotors`·`deleteMotorCascade`(compaction) 외 변경 불가 | hard |
| INV-05 | MeasureRecord·RaceRecord | 전체 immutable — 필드 변경 command 자체가 없음 | hard |
| INV-06 | MeasureRecord | `rpm === Math.round(panoHz × 60)` ∧ 둘 다 비null (v2: null 쌍 허용 제거 — 수집은 유효 측정값에서만) | hard |
| INV-07 | RaceRecord | write 시 `voltage ∈ [0.1, 9.9]` ∧ 소수 ≤2자리 · `result ∈ RACE_RESULTS` · `lapTimeMs` 있으면 양의 정수 ≤3,600,000 · `panoHz` 비null | hard |
| INV-08 | 목록 정렬 | 정렬 전순서 결정적 — motors: `sortOrder` 오름차순(동률은 INV-19 위반이나 방어적 2차 키 `id` 사전순) / measureRecords: `measuredAt` 내림차순·동률 `id` 오름차순 / raceRecords: `createdAt` 내림차순·동률 `id` 오름차순. 모든 query 동일 비교자 | hard |
| INV-09 | 파생 값 | 마지막 레이스 요약·기록 수·차트 좌표·정렬 결과를 IndexedDB/localStorage에 영속하지 않음 (이중 원본 금지) | hard |
| INV-11 | meta | ready 상태에서 `meta['app'].schemaVersion === 2`, 정확히 1행 | hard |
| INV-12 | 트랜잭션 | 다중 행/다중 store mutation(`deleteMotorCascade`·`reorderMotors`·`collectMeasureRecord`·`resetAllRecords`)은 단일 IDB 트랜잭션 — 부분 commit 관찰 불가, abort 시 무변경 | hard |
| INV-13 | 측정 표시 | `status==='weak-signal'` ⇒ 파노/RPM 표시값 null (`DisplayEstimate` 타입 강제 — 0 RPM·이전 값 표시 금지, v1 승계) | hard |
| INV-16 | rehydrate | persisted JSON은 외부 입력 — 모든 read 경계 zod 검증, type assertion 금지 | hard |
| INV-17 | 권한 감지 | cause·denialCount는 세션 한정 비영속 (v1 승계) | policy |
| INV-18 | 텍스트 상한 | `name` ≤30자 (statusMemo 제거로 항목 축소) | policy |
| **INV-19** | Motor 순서 | 모든 commit된 시점에 `motors`의 `sortOrder` 집합 = `{0, 1, …, n−1}` — **중복 0건·gap 0건**. 재정렬·compaction은 단일 tx(INV-12) | hard |
| **INV-20** | MeasureRecord rolling | 모든 commit된 시점에 각 motorId의 MeasureRecord **≤ 10건**. 11번째 수집은 최고령(`measuredAt` 오름차순, 동률 `id` 오름차순) 1건 삭제 + 신규 add를 **같은 트랜잭션**으로 수행 — 11건 상태·9건 손실 상태 모두 관찰 불가 | hard |
| **INV-21** | 왕복 handoff | slot ≤1건·비영속. raceReturn 모드는 slot 존재와 동치 — URL 파라미터 단독으로 모드 성립 불가. 소비는 1회(consume 직후 slot=null). raceReturn 모드의 측정 화면에 [기록] 진입점 0개(RV-1) | hard |
| **INV-22** | MeasureRecord 생성 경로 | MeasureRecord는 `collectMeasureRecord`로만 생성(측정 화면 [기록] 또는 RV-1 자동 확정) — 수동 입력 UI·시드 외 생성 경로 0개 (T-2) | hard |

## Commands

### 공통 계약 (v1 승계)

- 전 command는 `Result<T, DomainError>` 반환 — **throw로 UI를 관통하지 않는다**. query도 동일(읽기 실패를 값으로 전파 — D-10).
- 검증 이중화: UI 인라인 + command precondition(zod 재검증).
- persistence 게이트: `initPersistence`가 `ready`일 때만 수행. `unavailable`이면 `{kind:'storage', cause:'unavailable'}` 실패(배너 사전 고지 + 저장 시도 시 명시 실패 — 성공 오표시 금지).
- typed failure taxonomy:

```ts
type DomainError =
  | { kind: 'validation'; field: string; code: 'required' | 'range' | 'format' | 'pair' | 'enum' | 'max-length' | 'permutation' }
  | { kind: 'not-found'; entity: 'motor'; id: string }
  | { kind: 'storage'; cause: 'unavailable' | 'quota' | 'io' }
  | { kind: 'corrupt-read' }
```

`permutation` = `reorderMotors`의 orderedIds가 현재 모터 id 집합과 불일치(동시 탭 추가/삭제 경합) — UI는 목록 refetch 후 재시도 안내.

### 다중 store 트랜잭션 원자성 (v1 승계 — 무변경)

`shared/lib/persistence`의 `withTransaction(stores, mode, fn)`이 유일한 다중 store 진입점. ① 단일 IDBTransaction ② tx 개시 전 모든 비-IDB async(id·시각 생성·zod) 완료, fn 내 IDB 외 await 금지(auto-commit 방어) ③ 실패 = abort = 무변경, commit 성공 후에만 ok+invalidation ④ 같은 store를 겹치는 readwrite tx는 IDB가 cross-tab 포함 직렬화 — FK 확인·rolling count·permutation 검증을 mutation과 같은 tx에서 수행하므로 어떤 교차 실행에서도 INV-03·INV-19·INV-20이 성립한다 ⑤ cascade의 타 store 접근은 이 helper 경유(entity 간 코드 import 금지).

### Persistence commands

| Command | Preconditions | Atomic Updates | Postconditions | Failure |
|---|---|---|---|---|
| `initPersistence() → InitResult` | 없음 (부팅 진입점, 멱등 — 재호출 시 캐시된 연결 반환) | ① 레거시 DB `minicar-motor-lab` 존재 시 `deleteDatabase` (best-effort, SC2-A5) ② `openDB('mml-db', 2, {upgrade})` — `upgrade(oldVersion)`: `oldVersion===0`이면 4개 store 신설 + `meta.put({schemaVersion:2})`; `0<oldVersion<2`면 기존 store 전부 drop 후 v2 신설(**데이터 이관 없음 — RV-3**) ③ meta 검증(INV-11) ④ 전 행 full-scan zod + INV-03 + INV-19 검사 | ready 시: 연결 캐시, 전 행 유효. `detail:'recreated'`면 구버전 데이터 폐기 후 재생성됨(1회성 고지 가능) | throw 없음 — 항상 상태값. open 불가/API 부재 → `unavailable`. upgrade 실패·scan 실패·meta 불일치·VersionError → `corrupted` |
| `resetAllData() → Result<void>` | **복구 UI(corrupted)에서만 진입** + confirm 통과(§Destructive) | `deleteDatabase('mml-db')` → `initPersistence` 재실행으로 v2 빈 스키마 재생성 | motors=0·measureRecords=0·raceRecords=0·meta.schemaVersion=2, `ready`, 전체 캐시 clear | storage io → 복구 UI 유지 + 오류 표시 + 수동 재시도 (crash loop 금지) |
| `withTransaction(stores, mode, fn)` (내부 helper) | 연결 ready | 위 원자성 계약 | all-or-nothing | abort ⇒ 무변경 + storage io |

```ts
type InitResult =
  | { status: 'ready'; detail: 'ok' | 'recreated' }   // recreated = 구버전 감지 → 폐기 후 재생성 (RV-3, 'migrated' 대체)
  | { status: 'unavailable'; reason: 'no-indexeddb' | 'open-failed' }
  | { status: 'corrupted' }
```

### Motor commands

| Command | Preconditions | Atomic Updates | Postconditions | Failure |
|---|---|---|---|---|
| `createMotor({name, kind}) → Result<Motor>` | ready · zod: name trim 1~30자 · kind ∈ MOTOR_KINDS | tx[`motors`] rw: 현재 n 산출(전건 read — 같은 tx) → `add({id: randomUUID(), name, kind, sortOrder: n, createdAt=updatedAt=now})` — id·sortOrder 호출자 지정 불가 | 말미 append, INV-01/04/19 성립, invalidation | `validation`(name required/max-length, kind enum) / `storage`(quota·io) |
| `updateMotor(id, patch: {name?, kind?}) → Result<Motor>` | ready · patch 타입에 구조·순서 필드 부재(컴파일) + zod 재검증 · 대상 존재(동일 tx get) | tx[`motors`] rw: get → name·kind만 merge → `updatedAt=now` put | `id`·`createdAt`·`sortOrder` 불변(INV-04), 편집 2필드+updatedAt 외 변경 0, invalidation | `not-found`(동시 탭 선삭제 — draft 유지+오류+목록 갱신, C-8 승계) / `validation` / `storage` |
| `deleteMotorCascade(id) → Result<{deletedMeasureCount, deletedRaceCount}>` | UI: ConfirmDialog 통과 — n = `countRecordsByMotor` **실측치**(measure+race 합산 "기록 n건" 문구 유지) · command: ready | **tx[`motors`,`measureRecords`,`raceRecords`] rw 단일 트랜잭션**: ① `by-motorId`로 measureRecords 전건 delete ② 동일하게 raceRecords 전건 delete ③ motors.delete(id) ④ **compaction** — `sortOrder > 삭제 대상.sortOrder`인 모터 전건 `sortOrder−1` put | 모터 부재 ∧ 해당 motorId 기록 0건(두 store — INV-03, tx 내 재조회 기준이므로 confirm n이 stale이어도 잔존 없음) ∧ sortOrder 연속(INV-19) · 타 행 name 등 불변 · invalidation | abort ⇒ **전량 잔존·순서 불변**(무변경) + `storage` io. 대상 부재 시 멱등 성공 `{0,0}` — dangling 기록도 index 기준 정리되는 self-healing (SC-A4 승계) |
| `reorderMotors(orderedIds: string[]) → Result<void>` | ready · zod: UUID 배열·배열 내 중복 없음 | **tx[`motors`] rw 단일 트랜잭션**: ① 전건 getAll ② **집합 동일성 검증** — `set(orderedIds) === set(현재 id)` (개수·원소 완전 일치), 불일치 시 abort ③ 각 모터 `sortOrder = orderedIds.indexOf(id)` put (updatedAt 미갱신 — SC2-A4) | sortOrder = 0..n−1 연속·중복 0(INV-19), 순서 = orderedIds와 일치, invalidation | `validation`(field='orderedIds', code='permutation' — 동시 탭이 모터 추가/삭제한 경합. UI: 목록 refetch + "목록이 갱신되었습니다" 안내, DnD 결과 폐기) / `storage` io ⇒ 무변경(기존 순서 유지) |

DnD UI 규칙: 드래그 결과는 **entity id 배열**로만 command에 전달 — 렌더된 view index를 canonical index로 사용 금지(local-domain-state Non-Negotiable). 드롭 확정 전 낙관적 재배열은 UI 로컬 — commit 실패 시 서버 상태(=IDB)로 롤백 렌더.

### MeasureRecord command (수집 전용 — T-2·T-3)

| Command | Preconditions | Atomic Updates | Postconditions | Failure |
|---|---|---|---|---|
| `collectMeasureRecord(motorId, panoHz, rpm) → Result<MeasureRecord>` | ready · zod: motorId UUID · panoHz ∈ F0_RANGE(write-strict) · `rpm === Math.round(panoHz×60)`(INV-06) · 호출 경로는 M-6 팝업 선택 또는 RV-1 자동 확정뿐(INV-22) · **값은 [기록] 탭 시점 스냅샷**(SC2-A3 — 팝업 열림 중 실시간 갱신값 아님) | **tx[`motors`,`measureRecords`] rw 단일 트랜잭션**: ① motors.get(motorId) — 부재 시 abort ② `by-motorId` 전건 read → count ≥10이면 최고령(measuredAt asc·동률 id asc) **(count−9)건** delete ③ `add({id: randomUUID(), motorId, panoHz, rpm, measuredAt=now})` — FK 확인·eviction·add가 같은 tx | commit 시점 count ≤10(INV-20)·신규 기록 최신·INV-03 성립. cap 상태였다면 최고령 1건만 소멸, 아니었다면 삭제 0건. invalidation | `validation`(pair/range) / `not-found`(motor — M-6 팝업: 오류 토스트+팝업 닫기+목록 갱신 / RV-1 모드: §왕복 계약 실패 분기) / `storage`(quota·io — 실패 명시, 성공 토스트 오표시 금지) |
| (개별 삭제 없음) | — | — | MeasureRecord 삭제 경로는 rolling eviction·cascade·`resetAllRecords`·`resetAllData` 4개뿐 (RV-A1) | — |

### RaceRecord commands (R-2~R-7)

| Command | Preconditions | Atomic Updates | Postconditions | Failure |
|---|---|---|---|---|
| `createRaceRecord({motorId, panoHz, result, voltage, lapTimeMs?}) → Result<RaceRecord>` | ready · zod: motorId UUID · panoHz 비null ∈ F0_RANGE(자동 입력값도 재검증 — SC2-A6: 파노 없으면 [입력] 비활성, command도 required 거부) · result ∈ RACE_RESULTS · voltage INV-07 · lapTimeMs 있으면 양의 정수 ≤3,600,000 · feature 계층 제출 single-flight 가드(H-4 승계) | **tx[`motors`,`raceRecords`] rw**: motors.get(motorId) → 부재 시 abort / 존재 시 `add({id: randomUUID(), createdAt=now, …})` — FK 확인과 add 같은 tx | commit 시점 INV-03, 리스트 최신순 선두 반영, invalidation | `validation`(field 단위) / `not-found`(motor — 폼 유지+오류 표시) / `storage`(quota·io — **입력 유지+오류+[다시 저장]**, C-4 승계) |
| `deleteRaceRecord(id) → Result<void>` | UI: confirm 통과(RV-A3 — 행 단위, §Destructive) · command: ready | tx[`raceRecords`] rw: delete(id) | 기록 부재, 요약(R-1) invalidation 즉시 반영, 취소 시 무변경 | 멱등 — 부재면 성공(SC-A4). `storage` io |
| `resetAllRecords() → Result<void>` | UI: 레이스 화면 [초기화] → confirm(명시 확인 + **삭제 범위 고지** — R-6) · command: ready | **tx[`measureRecords`,`raceRecords`] rw 단일 트랜잭션**: 두 store `clear()` | measureRecords=0 ∧ raceRecords=0 ∧ **motors 전건·sortOrder 불변**(RV-A2), invalidation(§표 — motors 캐시 유지) | abort ⇒ 무변경(두 store 모두 잔존 — 한쪽만 비는 상태 관찰 불가, INV-12) + `storage` io |

### Queries (전건 Result 반환, INV-08 정렬, read 경계 zod)

| Query | Preconditions | 계약 (Postconditions) | Failure |
|---|---|---|---|
| `listMotors() → Result<Motor[]>` | ready | 전 모터 **sortOrder asc**(INV-08·INV-19). 모터 화면 리스트·M-6 선택 팝업·R-1 레이스 리스트 공용 원본 | `corrupt-read`/`storage` → **D-10**: 빈 목록 위장 금지, 오류+[다시 시도] |
| `getMotorById(id) → Result<Motor \| undefined>` | ready | 부재는 `ok(undefined)` — `/race/:motorId`(및 존치 시 `/motors/:id`) 라우트 가드가 처리 | 동일 |
| `listMeasureRecords(motorId) → Result<MeasureRecord[]>` | ready | 해당 모터 기록 **measuredAt desc·id asc, 항상 ≤10건**(INV-20). T-4 리스트·T-5 차트(렌더 시 X=measuredAt·Y=panoHz 좌표 파생)·레이스 폼 파노 자동 입력(선두 1건) 공용 | 동일 (D-10) |
| `listRaceRecords(motorId) → Result<RaceRecord[]>` | ready | 해당 모터 레이스 기록 createdAt desc·id asc (R-2) | 동일 |
| `listMotorSummaries() → Result<{motor, lastRace?: {result, voltage, panoHz, createdAt, lapTimeMs?}}[]>` | ready | 파생 join(영속 금지 — INV-09). 정렬 = motors sortOrder asc. `lastRace` = 해당 모터 raceRecords의 createdAt 최댓값 행(동률 id asc의 역) — R-1 "마지막 레이스 요약" | 동일 |
| `countRecordsByMotor(motorId) → Result<{measureCount, raceCount}>` | ready | `by-motorId` index count ×2 — cascade confirm "기록 n건"(n=합산) 실측치 | 동일 |

### 레이스 [측정] 왕복 계약 (RV-1 — `features/race-measure-handoff`, 비영속 single-slot)

**상태 소유**: handoff slot이 왕복 중 유일한 authoritative 상태. `{ motorId: string, draft: { result?, voltage?, lapTimeMs? }, startedAt: number }`. raceReturn 모드 = slot 존재와 동치(INV-21) — URL `?raceReturn=1`은 시각 표시·딥링크 방어용 보조일 뿐, slot 없이 파라미터만 있으면 **일반 측정 모드로 fallback**(파라미터 제거).

| Command | Preconditions | Atomic Updates | Postconditions | Failure |
|---|---|---|---|---|
| `beginRaceMeasure(motorId, draft)` | 레이스 입력 폼의 [측정] 탭 · motorId는 현재 폼의 모터 | slot ← {motorId, draft, startedAt} (전체 교체) → 측정 화면 내비게이션 | slot 1건, 측정 화면 raceReturn 모드([기록] 버튼 없음 — INV-21, 모드 표시 + 복귀 수단) | 없음 (동기 in-memory) |
| `consumeRaceMeasureReturn() → {motorId, draft} \| null` | 안정 판정 자동 확정 흐름 또는 사용자 복귀 | read-and-clear (1회 소비) | 직후 slot=null. 반환값으로 `/race/:motorId` 폼 복원 | 없음 — 빈 slot이면 null(왕복 아님) |
| `cancelRaceMeasure()` | 멱등 | slot ← null | raceReturn 모드 해제 | 없음 |

**자동 확정·자동 복귀 흐름 (안정 판정 = 기존 엔진 stable 신호 재사용, M-3)**:

1. raceReturn 모드에서 엔진 stable 신호 발생 → 그 시점 파노/RPM **스냅샷** → `collectMeasureRecord(slot.motorId, panoHz, rpm)` 호출. stable 신호는 왕복 1회당 1회만 소비(자동 확정 single-flight — 중복 수집 금지).
2. **성공**: `consumeRaceMeasureReturn()` → `/race/:motorId` 복귀 → 폼 복원 = draft(결과·전압·랩타임 보존) + **panoHz 필드 ← 스냅샷 값 갱신** + 수집 성공 토스트.
3. **storage 실패**: 측정값 자체는 유효하므로 **복귀는 수행** — 폼 파노 갱신 + draft 복원 + "측정 이력 저장 실패" 비차단 고지(성공 오표시 금지). MeasureRecord는 미생성(rolling 불변식 무관).
4. **not-found (왕복 중 다른 탭이 모터 삭제 — LWW 표면화)**: slot clear → `/race`(모터 리스트) 복귀 + "모터가 삭제되었습니다" 고지. draft는 대상 상실로 폐기(예고 고지가 곧 표면화 — C-8 정신 승계).

**slot 수명 규칙 (stale 방지)**: slot은 `beginRaceMeasure`부터 다음 중 **최초 발생**까지 — ① 자동 확정 성공/실패 복귀(consume) ② 측정 화면의 복귀/취소 수단(cancel — draft 보존한 채 폼 복귀) ③ raceReturn 외 경로로 측정 화면 이탈(하단 탭 내비게이션 등 — cancel + draft 소실 허용) ④ **새로고침 — in-memory 소실(SC2-A1)**: 측정 화면은 일반 모드로 부팅([기록] 버튼 표시), 레이스 draft 소실. 미소비 slot이 다른 모터의 레이스 폼이나 일반 [기록] 흐름에 채워지는 경로는 구조적으로 없다.

### 측정 세션 계약 변경점 (M-1~M-7 — `features/measure-session`, 비영속)

v1 세션 머신을 승계하되 다음만 개정한다 (엔진 F1 무변경 — 안정 판정 내부 재사용):

- **상태 집합에서 `stable` UI 상태 제거** (M-3): `idle·measuring·weak-signal·no-permission·suspended` 5종. 안정 판정은 세션 내부 신호(`isStable`)로 강등 — UI 상태·수치 잠금 없음, 값은 연속 갱신. 소비처 2곳뿐: RV-1 자동 확정 트리거. ([기록] 활성은 stable이 아니라 **표시값 비null** — M-5.)
- **자동 시작** (M-1): 페이지 진입 시 `startCapture` 자동 시도(권한 없으면 즉시 요청). 브라우저가 제스처 없는 AudioContext 시작을 거부하면(iOS Safari) **오류가 아니라 "탭하여 시작" 1탭 fallback UI** — `suspended`류 상태로 흡수, 오류 표시 금지. 이 fallback은 계약이며 QA 대상.
- **중지 버튼 없음** (M-2): `stopCapture`는 사용자 진입점이 아니라 시스템 트리거 전용 — 탭 이탈·백그라운드 시 자동 정지, 복귀(visibilitychange) 시 자동 재시작 시도(제스처 요구 시 위 fallback).
- stable → 캡처 자동 정지(v1 UX-A1)·`setConfirmedMeasurement` 호출 **제거** — Measurement single-slot handoff(F3) 폐기.
- 권한 감지 전략(F-2: Permissions API probe + NotAllowedError 2회 승격)·`isSecureContext` 가드·suspended 처리·INV-13은 v1 그대로 승계.

## Destructive Actions

| Action | Hidden Data Policy | Confirm/Undo | Cascade |
|---|---|---|---|
| `deleteRaceRecord` (RV-A3) | 필터·검색 없음 → 숨겨진 대상 없음. 대상은 **행의 entity id**로만 지정(view index 금지) | confirm "이 레이스 기록을 삭제할까요?" → 확인 시에만 실행, 취소 무변경. undo 미제공(SC-A3 승계 — confirm으로 갈음) | 없음. commit 후 리스트·마지막 레이스 요약(R-1) 즉시 반영 |
| `deleteMotorCascade` | 삭제 대상 기록(측정+레이스)은 **화면에 보이지 않아도 전건 삭제** — 건수는 렌더 행이 아닌 `countRecordsByMotor` 실측 합산 고지("기록 n건" 문구 유지). tx 내 재조회 기준이라 stale confirm도 잔존 없음 | ConfirmDialog: "'{모터명}'과 기록 {n}건이 함께 삭제됩니다. 되돌릴 수 없습니다." · destructive 스타일 · **초기 포커스=[취소]** · focus trap · 닫힘 후 트리거 복귀. undo 미제공 | motors 1건 + measureRecords + raceRecords 전건 + **sortOrder compaction** — 단일 트랜잭션. abort ⇒ 전량 잔존 |
| `resetAllRecords` (R-6 · RV-A2) | 전체 기록 — 화면 표시 여부 무관 전량. **모터는 유지**(범위를 confirm에 명시) | REQ-ST-007급 confirm: 명시 확인 + **"모든 측정 기록과 레이스 기록이 삭제됩니다. 등록된 모터는 유지됩니다. 되돌릴 수 없습니다."** · 초기 포커스=[취소]. undo 불가 명시 | measureRecords + raceRecords 두 store clear — 단일 트랜잭션(한쪽만 빈 상태 관찰 불가) |
| `resetAllData` | 전체 DB 전량 — **복구 UI(corrupted)에서만 진입**, 정상 화면 트리거 없음 (v1 승계) | "모든 모터·기록이 삭제되며 복구할 수 없습니다" + 초기 포커스=[취소] | 전체 store → v2 빈 스키마 재생성 |
| MeasureRecord 개별 삭제 | **제공하지 않음** (RV-A1) — rolling eviction은 사용자 액션이 아닌 계약상 자동 동작(confirm 불요, T-3 규칙을 UI에 사전 고지) | — | — |

UI 계층 규칙 (v1 승계): destructive 가능 여부·건수를 UI의 숨김·필터·렌더 결과로 판단하지 않는다 — confirm 건수는 항상 store 실측.

## Persistence

### schema/version

- storage key: IndexedDB DB 이름 **`mml-db`** 단 1개 (localStorage 0건). 레거시 키: 구 DB 이름 `minicar-motor-lab` — 부팅 시 삭제 시도 대상(아래).
- IDB native version **2** = 구조 버전 / `meta['app'].schemaVersion = 2` = 데이터 형태 버전. 함께 bump, meta 부재/불일치는 corruption 신호 (v1 이중 기록 승계).

### migration — **없음 (RV-3)**

- **구버전 처리 = 폐기 후 재생성**: ① 레거시 DB `minicar-motor-lab`은 부팅 시 `deleteDatabase` best-effort(실패 비치명 — 잔존해도 v2 동작 무관, 다음 부팅 재시도, SC2-A5) ② `mml-db`를 native version 2로 open — `upgrade(oldVersion)`에서 `oldVersion === 0`이면 신규 생성, `0 < oldVersion < 2`이면 기존 object store 전부 drop 후 v2 스키마 신설(**데이터 이관 코드 0줄**). 두 경우 모두 결과는 `ready(detail:'recreated' | 'ok')` — recreated 시 1회성 고지 가능.
- v1의 fallthrough migration 절차·`ready(migrated)` 상태·additive-first 확장 경로(FP-A4)는 **삭제**. 향후 v3부터는 additive-first 원칙을 재도입한다(이번 라운드는 사용자가 초기화를 확정).
- **downgrade**: 구버전 코드가 v2 DB를 열면 `VersionError` → `corrupted` 분류·복구 UI("새로고침" 우선 안내) — v1 승계.

### invalid-state recovery (v1 승계 + v2 판정 조건 추가)

- `initPersistence` 상태: `ready(ok)` / `ready(recreated)` / `corrupted` + 직교 `unavailable`.
- **corrupted 판정 조건**: open/upgrade 실패(비-가용성) · VersionError · meta 부재/불일치 · 부팅 full-scan에서 zod 실패 · dangling reference(두 record store) · **sortOrder 중복/gap(INV-19 위반)** · **모터당 MeasureRecord >10건(INV-20 위반)**. 판정 단위 = DB 전체(SC-A6 승계 — row quarantine 없음).
- **복구 UI**: 상태값 렌더(crash loop 금지). [다시 시도](자동 재시도 최대 1회, 이후 수동) / [모든 데이터 삭제 후 초기화](`resetAllData`, confirm 필수). 측정은 persistence와 무관하게 동작함을 고지.
- `unavailable`: 복구 대상 아님 — 전역 배너 "이 브라우저에서는 기록이 저장되지 않습니다 (측정은 가능)", 저장 command 명시 실패.

### quota/size/count budget

- 행 크기 추정: Motor ≤ 250 B(name 30 + kind 식별자) · MeasureRecord ≤ 200 B · RaceRecord ≤ 250 B.
- 구조적 상한: MeasureRecord는 **모터 30 × 10 = 최대 300행**(INV-20이 하드캡). RaceRecord만 무상한 — max fixture 1,000행 기준 총 ≈ **0.4 MB 미만**. 선제 eviction·`storage.estimate` 감시 불요 (v1 결론 유지).
- RaceRecord count 하드 상한 미강제(SC-A7 승계). quota 실패는 `{kind:'storage', cause:'quota'}` — 실패 명시+입력 유지+[다시 저장], 성공 오표시·데이터 소실 금지.
- 브라우저 데이터 삭제 시 소실 허용(export Won't — UI 고지, v1 승계).

### 동시 탭 정책 (v1 승계 — LWW)

- **last-write-wins**: IDB tx 직렬화 순서대로 적용, 나중 commit 승리. 병합·버전 벡터·잠금·BroadcastChannel 동기화 없음(단일 사용자 개인 도구). 다른 탭 변경은 다음 read에서 자연 반영.
- 안전 경계: ① 원자성·FK·순서·rolling은 탭 수와 무관(같은 tx 내 검증 — INV-03/19/20) ② 편집 중 외부 삭제 → `updateMotor` not-found로 표면화, **미저장 draft 예고 없는 소실 금지**(시트 유지+오류+목록 갱신, C-8) ③ **재정렬 경합** → `reorderMotors` permutation 실패로 표면화(목록 refetch + DnD 결과 폐기 — 조용한 순서 손상 금지) ④ **왕복 중 모터 삭제** → collect not-found → `/race` 복귀+고지(§왕복 계약 4).

## Fixtures & Interaction Budget

| Fixture | 구성 (shared/testing/seeds) | 용도 |
|---|---|---|
| empty | 모터 0 / 기록 0 | 빈 상태·첫 사용·M-6 "모터 0개 → 등록 유도" |
| normal | 모터 3(kind 변주, sortOrder 0..2) / MeasureRecord 0·3·10건 변주 / RaceRecord 0·수건(finished·retired·lapTime 유무 변주) | 목록·차트·레이스 요약·confirm 흐름 |
| rolling-cap | 특정 모터 MeasureRecord **정확히 10건** | MR-1 경계(10→11) 검증 전용 |
| max | **모터 30 / MeasureRecord 300(=30×10 하드캡) / RaceRecord 1,000** | 성능·부팅 scan 예산 |
| invalid | 손상 행(zod 불합격)·sortOrder 중복/gap·모터당 11건 measure seed·dangling 기록·meta 불일치·레거시 DB 이름 존재 | recovery·recreated 경로 |

Interaction budget: max fixture에서 목록 렌더·기록 반영·삭제 반영 **p95 < 200 ms**(REQ-NFR-001 승계) / **재정렬 commit(모터 30) p95 < 200 ms** / 부팅 `initPersistence`(open+scan) **< 500 ms**(SC-A9 승계) / 차트는 점 ≤10 커스텀 SVG — 별도 예산 불요 / 측정 계열 예산은 엔진 계약(F1) 소관.

## Verification Matrix

### local-domain-state 필수 matrix 인스턴스화

| View state | Mutation | 적용 | Assertion / N/A 근거 | Evidence |
|---|---|---|---|---|
| filter/search active | delete | **N/A** | v2에도 필터·검색·가상화 없음 — 삭제 대상은 항상 entity id. 재검증 조건: 목록 필터 도입 시 활성화 | — |
| filter/search active | move/reorder | **N/A(필터)** + 적용(reorder 일반칙) | 필터는 없으나 reorder는 존재 — `reorderMotors`가 **id 순열 기반**(view index 비사용)임을 계약으로 고정, 화면 대상=실제 mutation 대상 | **SO-1**: unit(순열 검증) + browser(DnD 후 순서 영속) |
| multi-selection | delete/move | **N/A** | 다중 선택 없음 — 삭제는 단건 confirm뿐 | — |
| detail edit active | external/domain update | 적용 | 동시 탭 모터 삭제 → updateMotor not-found, draft 예고 없는 소실 금지 / **왕복 중 모터 삭제** → 안전 복귀+고지 | **C-8**(승계): unit+component / **RT-2**: unit(handoff not-found 분기) |
| persisted old/invalid state | rehydrate | 적용 | invalid seed → `corrupted` → 복구 UI(crash loop 금지) / **구버전(v1 DB·mml-db oldVersion 1) → 폐기 후 재생성 `ready(recreated)`** — migrate 경로 없음 확인 / type assertion 0건 | **C-6′**: unit(fake-indexeddb — invalid·구버전·레거시 이름 seed) |
| max fixture | frequent reorder/update | 적용 | 30/300/1,000 seed에서 목록·재정렬·기록 반영 p95<200 ms + 부팅 scan<500 ms | **E-5′**: browser(Playwright max seed 주입) |

### Requirement ↔ Scenario ↔ Test Level ↔ Evidence

Requirement 앵커는 revision-v2-brief의 M/T/R/RV ID(canonical). 잔존 REQ-*는 v1 requirements 중 브리프가 "불변 유지"로 지정한 항목.

| Requirement | Scenario | Test Level | Evidence |
|---|---|---|---|
| T-1 모터 등록·수정 | MO-1: 이름+종류 등록 → sortOrder 말미 append(INV-19) / 수정 시 구조·순서 필드 불변(INV-04) / 이름 검증 실패(required·30자 초과)·kind enum 위반 거부 | unit + component + browser | fake-indexeddb pre/post / 시트 인라인 오류 / Playwright 등록→목록 |
| T-3 rolling 10 | **MR-1**: rolling-cap fixture(10건)에서 11번째 수집 → 최고령 1건 삭제+신규 add **단일 tx**, 결과 10건·최신 포함·최고령 부재(INV-20). **abort 주입 → 기존 10건 전량 잔존(신규 없음·삭제 없음)**. 9건→10번째 수집은 삭제 0건 | unit | fake-indexeddb: 경계 10→11 + tx abort 주입 |
| T-2·M-6 수집 경로 | **MR-2**: [기록] 탭 시점 스냅샷 수집(SC2-A3 — 팝업 열림 중 값 변동 무영향) / 모터 0개 → 등록 유도 / 팝업 선택 후 성공 토스트 / 수동 입력·수정 UI 부재(INV-22) | unit + browser | 스냅샷 고정 unit / Playwright fake media 흐름 |
| M-5 [기록] 활성 | ME-1: 표시값 비null일 때만 활성 — weak-signal(null, INV-13)·no-permission·suspended에서 비활성 | unit + browser | DisplayEstimate 타입 + 상태 변주 |
| M-1·M-2 자동 시작/정지 | ME-2: 진입 자동 시작 / 제스처 거부(iOS) 시 "탭하여 시작" fallback(오류 표시 금지) / 백그라운드 자동 정지·복귀 재시작 | browser + device | Playwright visibility 시뮬 + iOS 실기기(B1 승계) |
| M-3 연속 측정 | ME-3: stable UI 상태·수치 잠금 부재 — 값 연속 갱신, 내부 isStable 신호만 존재 | unit + browser | 세션 머신 unit(상태 5종) |
| T-6 재정렬 | **SO-1**: reorderMotors 순열 적용 → sortOrder 0..n−1 연속·중복 0(INV-19)·재로드 후 순서 영속 / **SO-2 동시성**: orderedIds ≠ 현재 집합(경합 add/delete) → `permutation` 실패·무변경·목록 refetch 안내 | unit + browser | fake-indexeddb 순열/경합 / Playwright DnD(키보드 경로 포함 — a11y는 component-spec 소관) |
| T-5 차트 | CH-1: listMeasureRecords(≤10) → 렌더 파생 좌표만 — 좌표·요약 영속 0건(INV-09) | unit + component | query 계약 + SVG 렌더 |
| R-1·R-2 레이스 목록 | RA-1: 모터 리스트+마지막 레이스 요약(파생 join) → 항목 탭 → `/race/:motorId` 리스트 최신순 / 모터 부재 라우트 가드(ok(undefined)) | browser | seed 주입 + 내비게이션 |
| R-3·R-4 레이스 입력 | **RC-1**: 파노 자동 입력(최신 MeasureRecord) / 파노 부재 시 [입력] 비활성 + command required 거부(SC2-A6) / result·voltage·lapTimeMs 검증(INV-07) / 저장 실패 시 입력 유지+[다시 저장] / single-flight | unit + component + browser | createRaceRecord pre/post / 폼 오류 표시 |
| RV-1 왕복 | **RT-1**: [측정] → draft(결과·전압·랩타임) 보존 → raceReturn 모드([기록] 버튼 0개 — INV-21) → stable → 자동 collect(1회) + 자동 복귀 + 폼 파노 갱신 + draft 복원 / stable 신호 중복 발생 시 수집 1건뿐 | unit + browser | handoff store unit + Playwright fake media 왕복 |
| RV-1 왕복 실패 분기 | **RT-2**: storage 실패 → 복귀+파노 갱신+비차단 고지(기록 미생성) / 모터 삭제(not-found) → `/race` 복귀+고지+slot clear / **새로고침 → slot 소실 → 일반 모드 fallback(SC2-A1)** / 비-raceReturn 이탈 시 slot clear | unit + browser | 실패 주입 unit + 재로드 시나리오 |
| RV-A3 레이스 개별 삭제 | **RC-2**: confirm 후 삭제·요약 즉시 반영·취소 무변경·멱등(부재=성공) | unit + component | deleteRaceRecord post + ConfirmDialog |
| R-6·RV-A2 기록 초기화 | **RS-1**: [초기화] confirm(범위 고지 문구 — 모터 유지 명시·초기 포커스 [취소]) → 두 store 0건 + **motors·sortOrder 불변** 단일 tx / abort → 두 store 전량 잔존 / 취소 → 무변경 | unit + component + browser | resetAllRecords post-state + tx abort 주입 |
| REQ-ST-007 cascade | **CC-1**: confirm(n=measure+race 실측 합산 고지) → 3-store 단일 tx 삭제 + **sortOrder compaction**(INV-19 잔존 모터 연속) → dangling 0건(두 store — INV-03) / abort → 전량 잔존·순서 불변(INV-12) | unit + browser | fake-indexeddb abort 주입 / Playwright confirm 흐름 |
| RV-3 스키마 재생성 | **C-6′**: 레거시 DB 이름 존재 → 삭제 시도 + `mml-db` v2 생성 / mml-db oldVersion<2 → store drop 후 재생성 `ready(recreated)`(데이터 이관 없음 확인) / invalid seed(INV-19/20 위반 포함) → `corrupted` → 복구 UI / VersionError → corrupted | unit | fake-indexeddb seed 변주, crash loop 부재 |
| REQ-ST-005 write 실패·quota | C-4′: 실패 명시+입력 유지+재시도(collect·race 생성 공통) / C-5 unavailable 배너 | unit + browser(+device) | write 실패 주입 / private 모드 |
| REQ-ST-005 전체 reset | C-9′: 복구 UI → confirm → 전량 삭제 → ready. 취소 무변경 | unit + component | resetAllData post-state |
| REQ-F-005 읽기 실패 | D-10(승계): 읽기/parse 실패 → 빈 목록 위장 금지 + 오류+[다시 시도] — 전 query 공통 | unit + component | Result 실패 전파 / 오류 렌더 |
| REQ-ST-001~004·NFR-003 측정 세션 | D-2/D-3(권한)·D-4(비보안)·D-5(suspended)·D-8(weak-signal null) — v1 승계, stable 상태 제거 반영 재검증 | unit + browser + device | v1 evidence 재사용 + ME-3 |
| 동시 탭 LWW | C-8(승계) + SO-2 + RT-2 모터 삭제 분기 | unit + component | 상동 |
| REQ-NFR-001 성능 | E-5′: max(30/300/1,000)에서 목록·재정렬·수집 p95<200 ms + 부팅 scan<500 ms | browser | max seed |

신규 시나리오 ID: **MR-1·MR-2·ME-1~3·SO-1·SO-2·CH-1·RA-1·RC-1·RC-2·RT-1·RT-2·RS-1·CC-1·C-6′·E-5′** — QA 계획(qa-state)에 승계 요망. v1의 E-2~E-4(가이드)·H-1~H-6(RunRecord·slot)·C-2(RunRecord 삭제) 시나리오는 기능 제거로 **폐기**.

## Assumptions and Blockers

### ASSUMPTION (검토 시 이의 없으면 baseline 유지)

| ID | 내용 | 검증/영향 |
|---|---|---|
| **RV-A1** (브리프 등재) | MeasureRecord 개별 삭제 없음 — 삭제 경로는 eviction·cascade·초기화뿐 | 이의 시 `deleteMeasureRecord` command+confirm 추가(스키마 무영향) |
| **RV-A2** (브리프 등재) | `resetAllRecords` 범위 = 전체 MeasureRecord+RaceRecord, **모터 유지** | 이의 시 전체 삭제로 변경(confirm 문구·invalidation·post-state 3곳 수정) |
| **RV-A3** (브리프 등재) | RaceRecord 개별 삭제 제공(오입력 복구 수단) — 트리거(스와이프/버튼)는 layout 소관 | 이의 시 command 제거 |
| **SC2-A1** | 왕복 handoff는 **in-memory 비영속** — 새로고침 시 모드·draft 소실, 측정 화면은 일반 모드 fallback(sessionStorage 미사용). 근거: 왕복은 수 초 내 단일 흐름, 영속 시 stale 모드 부활 위험이 이득보다 큼 | 사용자 마찰 시 sessionStorage+TTL로 확장(계약 재설계) |
| **SC2-A2** | `lapTimeMs` 상한 = 양의 정수 ≤3,600,000 ms(1시간) — 입력 UI 단위 변환(초 표기 등)은 component-spec 소관 | 상수 1곳(`shared/config`) |
| **SC2-A3** | [기록] 수집값 = **[기록] 탭 시점 스냅샷**(모터 선택 팝업 열림 중 실시간 갱신값 아님) — 사용자가 본 값과 저장 값의 일치 보장 | MR-2로 고정 |
| **SC2-A4** | `reorderMotors`는 `updatedAt` 미갱신 — 순서는 컬렉션 소유 속성이지 개별 모터 편집이 아님 | 이의 시 갱신으로 변경(회귀 unit 1건) |
| **SC2-A5** | 레거시 DB(`minicar-motor-lab`) 삭제는 부팅 시 best-effort — 실패해도 비치명(v2 동작 무관), 다음 부팅 재시도 | C-6′에서 존재 seed 검증 |
| **SC2-A6** | RaceRecord `panoHz` 필수 비null — 최신 MeasureRecord 부재 + 미측정이면 [입력] 비활성(측정 유도). 근거: 브리프 데이터 모델이 panoHz를 비옵션으로 명시 | 이의 시 nullable화(스키마·차트·요약 영향) |
| SC-A2′ (승계 축소) | name ≤30자 — statusMemo 제거로 텍스트 상한 1건 | 상수 1곳 |
| SC-A3 (승계) | 삭제 undo 미제공 — confirm으로 갈음 | 이의 시 soft-delete 설계 필요 |
| SC-A4 (승계) | delete 계열 멱등(부재=성공, cascade self-healing) — LWW 수렴 정합 | unit 고정 |
| SC-A6 (승계) | corrupted 판정 단위 = DB 전체(row quarantine 없음) | 실사용 손상 사례 시 재검토 |
| SC-A7′ (승계) | RaceRecord count 하드 상한 미강제 — quota 실패는 C-4′ 경로 전담. MeasureRecord는 INV-20이 구조적 상한 | 실사용 규모 확인과 함께 |
| SC-A8 (승계) | panoHz write-strict(F0_RANGE)/read-lenient(≤2,000) — MeasureRecord·RaceRecord 공통 적용 | 상수 변경 시 회귀 unit |
| SC-A9 (승계) | 부팅 full-scan(+INV-19/20 검사) 채택, 예산 <500 ms @max | E-5′ 측정, 초과 시 lazy 전환 |

### BLOCKER

- **신규 없음.** RV-1~4·RV-A1~A3은 브리프에서 확정/등재 완료. 승계 운영 항목: 실기기 검증 세션(B1 — M-1 자동 시작 fallback·권한 감지 device evidence, owner: 사용자)만 유지.

## Changelog (v1 → v2)

**제거** — RunRecord 엔티티·`records` store·`by-createdAt` index / `satisfied`·`statusGrade`·`statusMemo` 필드 / `createRecord`·`deleteRecord`·`updateMotor`의 grade·memo patch / `computeGuide`·`GuideResult`·`GUIDE_MIN_SATISFIED`·`listSatisfiedRecords`·가이드 invalidation(INV-10) / Measurement single-slot handoff(F3 — set/take/clear, INV-14·15의 slot 조항)와 S2 소비 경로 / `stable` UI 상태·stable 시 캡처 자동 정지(UX-A1) / migration 절차(fallthrough·additive-first v2 경로)·`ready(migrated)` / v1 시나리오 E-2~4·H-1~6·C-2.

**신설** — MeasureRecord·RaceRecord 엔티티와 store 2개 / `MotorKind` enum 9종·`sortOrder` / `reorderMotors`·`collectMeasureRecord`(rolling eviction 내장)·`createRaceRecord`·`deleteRaceRecord`·`resetAllRecords` / 레이스 왕복 handoff 계약(begin/consume/cancel + 실패 분기 + slot 수명) / INV-19(순서 연속성)·INV-20(rolling ≤10)·INV-21(handoff)·INV-22(수집 전용 경로) / DB `mml-db` v2 + 레거시 폐기 재생성(`ready(recreated)`) / rolling-cap fixture / 시나리오 MR·ME·SO·CH·RA·RC·RT·RS·CC 계열.

**승계** — withTransaction 원자성 5계약 / zod rehydrate 2중 검증·write-strict/read-lenient / corrupted 판정·복구 UI·unavailable 직교 상태 / LWW 동시 탭 정책·C-8 draft 보호 / Result 봉투·DomainError taxonomy(+`permutation` 코드 추가) / 멱등 delete·confirm 정책(초기 포커스 [취소]) / D-10 빈 목록 위장 금지 / 성능 예산(p95 200 ms·부팅 500 ms).
