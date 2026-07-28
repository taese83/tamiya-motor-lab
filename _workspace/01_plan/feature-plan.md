# Feature Plan — minicar-motor-lab (미니카 모터 RPM 측정 모바일 웹앱)

> Phase 1 Wave 3 산출물. 입력: `requirements.md`(Must 14건), `ux-brief.md`(S1~S5 + 오버레이 2, 탭 3 + 스택), `planning-context.md`(split 권고), `decision-log.md`(DL-001~006), `analysis-algorithm.md` v2(estimateFrame/refine/track 계층).
> 아키텍처 전제(변경 금지): WEB_PROFILE react-vite-spa · FSD · 앱 위치 `workspace/minicar-motor-lab` · **서버·HTTP API 없음** — IndexedDB가 유일한 authoritative store(LOCAL_DOMAIN_STATE_MODE). REST endpoint 대신 도메인 command/query로 데이터 계약을 기술한다. 정식 invariant·migration 계약은 Phase 2 `state-contract-designer`가 확정한다 — 본 문서는 slice 소유권·데이터 모델·command 인벤토리까지.
> 분석 엔진은 UI와 분리된 순수 TypeScript 모듈 + Web Worker(v2 §2·§5)로 실행한다. Mock은 MSW가 아니다 — 합성 오디오 fixture + IndexedDB seed(fake-indexeddb)가 대체한다 (DL-006).

## 0. 설계 요지

- **수직 slice 3묶음**: (A) 측정 — 분석 엔진 + 측정 세션 + S1, (B) 기록 — persistence + 모터/기록 CRUD + S2~S4, (C) 판단 — 가이드 + S5. planning-context `split` 권고에 따라 A를 먼저 검증한다 (측정 신뢰성이 무너지면 B·C의 가치가 없음).
- **책임 분리 원칙**:
  - 분석 엔진(`shared/lib/audio-analysis`)은 DOM·store·브라우저 권한을 모른다. 순수 함수 + Worker 엔트리만.
  - status 6종 중 `measuring·stable·weak-signal`은 엔진(track)이 산출하고, `idle·no-permission·suspended`는 측정 세션 상태 머신이 소유한다. 하나의 canonical 타입(`MeasureStatus`)을 shared에 정의하되 산출 주체를 분리한다.
  - **고빈도 스트림 상태(실시간 f₀/RPM 프레임)는 전역 store·영속 store에 넣지 않는다** — `features/measure-session` 내부 로컬 상태로만 유지. 전역으로 넘어가는 것은 stable 확정 시점의 Measurement 값 객체 1건뿐.
  - historical 데이터(IndexedDB 기록)와 realtime 측정 스트림은 서로 다른 소유자·다른 hook — 같은 hook에 숨기지 않는다.
- **구조 필드 보호**: `Motor.id/createdAt`, `RunRecord.id/motorId/createdAt`은 일반 `Partial<Entity>` update 대상에서 제외. 삭제·cascade는 전용 command로만 수행. RunRecord는 **immutable**(생성·삭제만, 수정 기능 없음 — requirements에 기록 수정 요구 없음, 측정 신뢰성 보호 UX-A3와 정합).
- MVP에 목록 필터/검색/가상화 없음(A7 규모 1,000건을 단순 목록으로 수용) → view ID ↔ canonical ID 변환 문제는 발생하지 않으며, 모든 목록 행은 entity `id`를 key로 직접 사용한다. REQ-F-009 도입 이후 필터가 생기면 state-contract에서 재검증(요구사항 REQ-ST-007 단서 승계).

## 1. Feature 분해 (10건)

| # | Feature | 대상 화면 | 소유 slice | 사용 command/query | REQ | 우선순위 | 크기 |
|---|---|---|---|---|---|---|---|
| F1 | **분석 엔진 파이프라인 v2** (최대 작업 항목) | S1(Worker 경유) | `shared/lib/audio-analysis` | (순수 함수) `estimateFrame` / `refine` / `track` | REQ-F-002, REQ-ST-003, REQ-NFR-001/005 | **P0** | L |
| F2 | **측정 세션** (마이크 권한·캡처·상태 머신) | S1 | `features/measure-session` (+ `pages/measure`) | `startCapture` `stopCapture` `retryPermission` `resumeAudio` (비영속 세션 command) | REQ-F-001/002, REQ-ST-001/002/003/004 | **P0** | M |
| F3 | **측정→기록 연결** (확정값 handoff·자동 채움) | S1→S2 | `entities/measurement` (+ F2 CTA, F6 prefill) | `setConfirmedMeasurement` `takeConfirmedMeasurement` | REQ-F-008 | P1 | S |
| F4 | **IndexedDB persistence 계층** (schema/version/복구) | 전역 | `shared/lib/persistence` | `initPersistence` `resetAllData` (+ 내부 transaction helper) | REQ-F-007, REQ-ST-005, REQ-NFR-006 | **P0** | M |
| F5 | **모터 CRUD** (cascade 삭제 포함) | S3/S4 + 등록 시트 + confirm | `features/motor-management`, `entities/motor` | `createMotor` `updateMotor` `deleteMotorCascade` `countRecordsByMotor` | REQ-F-003, REQ-ST-007 | **P0** | S |
| F6 | **기록 CRUD** (입력 폼·검증·삭제) | S2, S4 + confirm | `features/record-entry`, `entities/run-record` | `createRecord` `deleteRecord` | REQ-F-004, REQ-ST-005/007 | **P0** | M |
| F7 | **목록·이력 조회** (모터 목록·모터별 모아보기) | S3, S4 | `pages/motors`, `pages/motor-detail` | `listMotorSummaries` `listMotors` `getMotorById` `listRecordsByMotor` | REQ-F-005 (REQ-F-009는 P1 부분) | **P0** | S |
| F8 | **전압 가이드 계산·표시** | S5 | `features/voltage-guide` (+ `pages/guide`) | `listSatisfiedRecords` + 순수 함수 `computeGuide` | REQ-F-006, REQ-ST-006 | **P0** | S |
| F9 | **앱 셸·탭 네비게이션** | 전 화면 | `app/` | `initPersistence` 결과 소비 (배너·복구 UI 분기) | REQ-NFR-002, REQ-ST-005(C-5/C-6 진입점), UX-A2 | **P0** | S |
| F10 | **공용 UI 킷** (confirm·토스트·시트·스테퍼·상태 라벨) | 전 화면 | `shared/ui` | — | REQ-NFR-003, REQ-ST-007(confirm 계약) | **P0** | S |

Could(이후 단계, 본 계획 범위 외 backlog): REQ-F-010 모터별 캘리브레이션 프로필, REQ-F-011 10 ms hop 고급 옵션 — 둘 다 F1의 파라미터 계층에 hook만 남긴다(엔진 옵션 객체로 주입 가능하게).

### 완료 조건 (feature별)

- **F1 분석 엔진** — v2 §3 fixture 8종 전부 Vitest 합격(순음<0.3 Hz / 배음 지배 f₀ 채택 / 고조파 오염 6차 제외 / SNR10dB<0.5 Hz / SNR0dB→`weak-signal` / 무음→`weak-signal`·0 RPM 금지 / 스핀업 추적 지연<0.5 s / 옥타브 점프 없음) + VP CRLB sanity(이론 분산 3배 이내). 신뢰 게이트(SNR≥8 dB & 고조파≥2 & voicing) 미달 시 수치 없는 `weak-signal` 반환. 안정 판정(1.5 s 창 CV<1.5%→중앙값 잠금) 포함. `sampleRate` 파라미터화(48 kHz 가정 금지). Worker에서 25 ms hop 구동 시 모바일 1코어 20% 미만·확정 3 s 이내(실기기 device 검증은 Phase 2). DOM/브라우저 API import 0건.
- **F2 측정 세션** — 상태 머신 6종 전이가 unit으로 검증됨(가드: `state !== 'running'`이면 측정 시작 금지). 탭 핸들러 내 `getUserMedia`(echoCancellation/noiseSuppression/autoGainControl off, mono)+`resume()` (D-1). 권한 일시/영구 거부 분리 표시(D-2/D-3), `isSecureContext===false` 사전 차단(D-4), suspended 재개 동선(D-5), weak-signal↔measuring 회복 재전이·stale 값 없음(D-8/D-9). stable 확정 시 캡처 자동 정지(UX-A1), measuring 중 탭 전환·백그라운드 시 세션 종료(UX-A2). 실시간 수치는 세션 로컬 상태로만 흐르고 aria-live로 status 전이 알림(F-1).
- **F3 측정→기록 연결** — stable 확정값만 single-slot으로 게시, S2 진입 시 1회 소비(take) 후 읽기전용 카드 채움. `weak-signal`·미측정이면 절대 채우지 않음(H-5). 자동 채움 값은 수정 불가·비우기만 허용(UX-A3).
- **F4 persistence 계층** — DB open/version/migrate 단일 진입점. rehydrate 시 persisted 데이터를 외부 입력으로 검증(type assertion 금지), 손상/구버전 seed에서 migrate 또는 복구 UI 연결·crash loop 없음(C-6). 사용 불가(private 모드) 감지 → `unavailable` 상태 반환(C-5). write 실패/quota를 command 실패 결과로 전파(C-4). fake-indexeddb 기반 unit 통과.
- **F5 모터 CRUD** — 이름 필수 인라인 검증, 저장 즉시 목록 반영(C-1). `updateMotor`는 편집 필드(name, statusMemo)만 — 구조 필드 불변 unit 검증. `deleteMotorCascade`는 "기록 n건 함께 삭제" confirm(n=`countRecordsByMotor` 실측치) 후 모터+소속 기록을 **단일 트랜잭션**으로 삭제, dangling reference 0건(C-3), 취소 시 무변경. 빈 상태 등록 유도(E-1).
- **F6 기록 CRUD** — 모터 미선택/전압 비수치·범위 밖(A5) 저장 거부·필드 오류(H-2). D2: 측정값 없이 null 저장(H-3). 저장 중 버튼 비활성으로 중복 기록 방지(H-4). write 실패 시 입력 유지+오류 배너+재시도, 성공 오표시 금지(C-4). 기록 삭제 confirm 후 목록·가이드 즉시 반영(C-2). command 계층에서 검증 재수행(UI 검증에만 의존 금지).
- **F7 목록·이력 조회** — S3 모터 카드(이름·메모·기록 수·최근 기록 요약), S4 시간 역순 기록 행. 재방문 persistence(E-6). 읽기 실패 시 빈 목록 위장 금지·오류+재시도(REQ-F-005). max seed(모터 30·기록 1,000)에서 상호작용 p95<200 ms(E-5).
- **F8 전압 가이드** — 만족 기록 ≥3건(D1): min~max 범위(A6)+분포 텍스트+근거 목록(E-3). <3건: 추천 미표시+"n건 더 필요 (n/3)"(E-2). 범위 폭 ≥0.5 V 보조 문구(E-4). 기록 추가/삭제 후 재진입 시 재계산 — 추천값을 어디에도 영속·캐시하지 않음(stale 금지). seed 0·1·2·3건 + 분산 케이스 unit.
- **F9 앱 셸** — 탭 3(측정/이력/가이드) + 스택 라우트(`/record/new`, `/motors/:id`). 시작 시 `initPersistence` → `unavailable`이면 전역 배너 "기록 저장 불가 (측정은 가능)"(C-5), `corrupt`이면 복구 UI(reset 경로). 콘텐츠 max-width ~480px 중앙 정렬(REQ-NFR-002). 탭 전환 시 측정 세션 종료 hook 연결(UX-A2).
- **F10 공용 UI 킷** — ConfirmDialog(destructive 스타일, 초기 포커스=취소, focus trap, 닫힘 후 트리거 복귀), Toast, BottomSheet, SegmentControl(3택), VoltageStepper(decimal 키패드+±0.1), StatusLabel(텍스트+색+아이콘 3중), 대형 수치 표시(높이 고정 — layout shift 금지). 전 컴포넌트 keyboard 조작·44×44px 타깃(F-1).

## 2. FSD 슬라이스 맵

| 레이어 | 슬라이스 | 역할 (세그먼트) | 의존 |
|---|---|---|---|
| app | `app/` | 라우터(탭 3+스택 2), 프로바이더, persistence 부트스트랩, 전역 배너·복구 UI, 에러 바운더리 | pages/*, shared/lib/persistence |
| pages | `pages/measure` (S1, `/`) | 측정 화면 조립 — 상태 라벨/수치 영역/액션 영역 | features/measure-session, entities/measurement, shared/ui |
| pages | `pages/record-new` (S2, `/record/new`) | 기록 입력 화면 조립 | features/record-entry, entities/motor, entities/measurement |
| pages | `pages/motors` (S3, `/motors`) | 모터 목록 + 등록 시트 + "+기록" 진입 | features/motor-management, entities/motor, entities/run-record |
| pages | `pages/motor-detail` (S4, `/motors/:id`) | 모터별 이력 모아보기 + 수정/삭제 액션 | features/motor-management, features/record-entry, entities/run-record |
| pages | `pages/guide` (S5, `/guide`) | 가이드 화면 조립 | features/voltage-guide, entities/motor |
| features | `features/measure-session` | ui: 상태별 액션 버튼·수치 표시 / model: 6-status 상태 머신, 세션 로컬 스트림 상태 / api: getUserMedia 래퍼, AudioWorklet 캡처, Worker 브리지 | shared/lib/audio-analysis, entities/measurement(확정값 게시) |
| features | `features/record-entry` | ui: 폼 5항목·측정값 카드·저장 버튼 / model: 폼 상태·필드 검증(A5)·제출 중 가드 / api: createRecord·deleteRecord 호출 | entities/run-record, entities/motor, entities/measurement, shared/ui |
| features | `features/motor-management` | ui: 등록/수정 시트, cascade confirm 오케스트레이션 / model: 이름 검증 / api: motor command 호출 | entities/motor, entities/run-record(건수), shared/ui |
| features | `features/voltage-guide` | ui: 모터 선택·추천 범위·근거 블록 / model: `computeGuide` 순수 함수(D1/A6 상수 소비) | entities/run-record, entities/motor, shared/config |
| entities | `entities/motor` | model: Motor 타입·검증 스키마 / api: motors store repository(command/query) | shared/lib/persistence |
| entities | `entities/run-record` | model: RunRecord 타입·RunResult enum(D4)·검증 스키마 / api: records store repository (createRecord는 motor 존재를 동일 트랜잭션에서 확인) | shared/lib/persistence |
| entities | `entities/measurement` | model: Measurement 값 객체 + 비영속 single-slot 확정값 store (set/take/clear) | — (의존 없음) |
| shared | `shared/lib/audio-analysis` | 순수 엔진: 대역통과·데시메이션, pYIN 후보(÷3·÷6 확장), 1·3·6차 고조파 점수, VP 정밀 추정, 일치도 검사, 신뢰 게이트, Viterbi+Kalman 추적, 안정 판정 / `worker.ts` 엔트리 / `protocol.ts` 메시지 타입 / `__fixtures__/` 합성 신호 | (없음 — zero-dependency 순수 모듈) |
| shared | `shared/lib/persistence` | DB open/schema version/migration/validate-rehydrate/availability probe/트랜잭션 helper/resetAllData | — |
| shared | `shared/ui` | ConfirmDialog, Toast, BottomSheet, SegmentControl, VoltageStepper, StatusLabel, BigNumber 등 | — |
| shared | `shared/config` | 도메인 상수(D1/D4/A5/A6 교체 지점 — §8), 라우트 경로 | — |

의존 방향은 FSD 규칙(app→pages→features→entities→shared) 준수. feature 간 직접 의존 없음 — 측정→기록 handoff는 `entities/measurement`를 경유해 결합을 끊는다. `deleteMotorCascade`는 motors·records 두 store를 걸치므로 `entities/motor/api`가 소유하되 `shared/lib/persistence`의 다중 store 트랜잭션 helper를 사용한다(entity 간 import 금지 유지 — 원자성 계약은 state-contract-designer가 확정).

**병렬 작업 단위**: ① F1(순수 모듈 — 앱과 독립) ② F4+F5+F6+F7(데이터 계층 수직) ③ F9+F10(셸·UI 킷) 은 상호 의존이 얇아 3트랙 병렬 가능. F2는 F1의 protocol 확정 후, F3은 F2+F6 후, F8은 F6 후.

## 3. 데이터 모델

모든 영속 entity의 시각 필드는 ISO 8601 문자열, ID는 UUID v4(충돌·정렬 요구 없음 — 정렬 키는 createdAt).

```ts
// entities/motor/model/types.ts
interface Motor {
  id: string          // 구조 필드 — 생성 후 불변 (REQ-F-003, local-domain-state 불변식)
  name: string        // 필수, trim 후 1자 이상 — 미입력 저장 거부 (REQ-F-003)
  statusMemo: string  // 선택 상태 메모, 기본 '' — 길들이기/마모 등 자유 텍스트 (REQ-F-003, A4)
  createdAt: string   // 구조 필드 — 불변 (REQ-F-003 "구조 필드 변경 금지")
  updatedAt: string   // updateMotor 성공 시에만 갱신 (편집 메타)
}
// 파생 값(영속 금지): 기록 수, 최근 기록 요약, "최근 사용" 정렬 키(소속 기록 max createdAt,
// 기록 없으면 motor.createdAt) — records에서 매번 계산 (이중 원본 금지)

// entities/run-record/model/types.ts
const RUN_RESULTS = ['finished', 'course_out', 'not_run'] as const // D4 baseline: 완주·코스아웃·미주행(측정만)
type RunResult = (typeof RUN_RESULTS)[number]                      // 라벨 매핑은 shared/config — enum 교체 지점 §8

interface RunRecord {
  id: string             // 구조 필드 — 불변
  motorId: string        // FK — 구조 필드, 존재하는 Motor 필수, dangling 금지 (REQ-F-004, REQ-ST-007)
  voltage: number        // 필수, A5: 0.1~9.9 V·소수 최대 2자리 — command 계층 재검증 (REQ-F-004)
  fanoHz: number | null  // 파노 = f₀ Hz — D2 baseline: 측정 없이 null 허용 (REQ-F-004/008, DL-002/A1)
  rpm: number | null     // f₀×60 반올림 정수 (A2). 불변식: (fanoHz===null)===(rpm===null) — 쌍으로만 존재
  result: RunResult      // 주행 결과 (REQ-F-004, A4/D4)
  satisfied: boolean     // 만족 체크 — 가이드 집계의 유일한 원천, result와 독립 (REQ-F-006)
  createdAt: string      // 구조 필드 — 시간 역순 정렬 키 (REQ-F-005/009)
}
// RunRecord는 immutable — update command 없음 (수정 요구 없음, 측정 신뢰성 보호 UX-A3 정합)

// entities/measurement/model/types.ts — 값 객체, IndexedDB에 영속하지 않음
interface Measurement {
  f0: number          // Hz, 소수 1자리 표시 (v2 출력 계약)
  rpm: number         // f0×60 정수
  confidence: number  // 0~1 — 내부 게이트 판정용, UI 비노출 (ux-brief §5), RunRecord에 저장 안 함 (FP-A2)
  capturedAt: string  // stable 확정 시각 — handoff 신선도 표시용, RunRecord에 저장 안 함 (FP-A2)
}

// shared/lib/persistence — meta store
interface DbMeta { schemaVersion: number } // REQ-F-007/NFR-006 — migration 상세는 state-contract

// shared/lib/audio-analysis — 엔진 산출 타입 (v2 §1·§5)
type MeasureStatus = 'idle' | 'measuring' | 'stable' | 'weak-signal' | 'no-permission' | 'suspended'
type EngineStatus = Extract<MeasureStatus, 'measuring' | 'stable' | 'weak-signal'> // 엔진이 내는 부분집합
interface FrameCandidate { f0: number; salience: number; voicedProb: number }
interface DisplayEstimate { f0: number | null; rpm: number | null; confidence: number; status: EngineStatus }
// weak-signal이면 f0/rpm은 반드시 null — "수치 미표시"를 타입으로 강제 (REQ-ST-003)
```

IndexedDB object store 구성(기능 기준 — 확정은 state-contract): `motors`(keyPath `id`) / `records`(keyPath `id`, index `by-motorId`, `by-createdAt`) / `meta`(schemaVersion).

## 4. 도메인 Command/Query 인벤토리 (REST 대체 — 데이터 계약)

서버·HTTP API 없음. 아래가 Phase 2 state-contract·설계의 입력이다. 모든 command는 `Result<T, DomainError>`를 반환하고 실패를 값으로 전파한다(throw로 UI를 뚫지 않음). 검증은 UI(인라인)와 command 계층(precondition) 이중 수행.

### Persistence (shared/lib/persistence) — F4

| 종류 | 시그니처 | 계약 요점 | REQ |
|---|---|---|---|
| command | `initPersistence() → 'ready' \| 'unavailable' \| 'corrupt'` | open+version 확인+migrate 시도. `unavailable`=private 모드 등(측정은 가능 고지), `corrupt`=복구 UI 분기. crash loop 금지 | REQ-F-007, REQ-ST-005 |
| command | `resetAllData() → Result<void>` | 복구 UI 전용 destructive reset 경로 | REQ-ST-005(C-6) |
| 내부 | `withTransaction(stores[], mode, fn)` | 다중 store 원자성 helper — cascade·FK 확인이 사용 | REQ-ST-007, REQ-F-007 |

### Motor (entities/motor/api) — F5

| 종류 | 시그니처 | 계약 요점 | REQ |
|---|---|---|---|
| command | `createMotor({ name, statusMemo? }) → Result<Motor>` | name trim 필수. id/createdAt은 command가 생성 — 호출자 지정 불가 | REQ-F-003 |
| command | `updateMotor(id, patch: { name?; statusMemo? }) → Result<Motor>` | **편집 필드만** — 구조 필드(id, createdAt)는 타입에서 제외. 대상 부재 시 실패 | REQ-F-003 |
| command | `deleteMotorCascade(id) → Result<{ deletedRecordCount: number }>` | **전용 구조 command** (D3 baseline). 모터+소속 기록을 단일 트랜잭션 삭제, 완료 후 dangling 0건. confirm은 feature 책임, precondition 재검증은 command 책임 | REQ-ST-007 |
| query | `listMotors() → Motor[]` | S2/S5 선택 리스트 원본 (정렬은 파생 계산) | REQ-F-003/005 |
| query | `getMotorById(id) → Motor \| undefined` | S4 헤더 | REQ-F-005 |
| query | `countRecordsByMotor(motorId) → number` | cascade confirm "기록 n건" 실측치 | REQ-ST-007 |

### RunRecord (entities/run-record/api) — F6·F7

| 종류 | 시그니처 | 계약 요점 | REQ |
|---|---|---|---|
| command | `createRecord(draft: { motorId; voltage; fanoHz?; rpm?; result; satisfied }) → Result<RunRecord>` | precondition: motor 존재(동일 트랜잭션 확인 — dangling 금지), voltage A5 범위, fanoHz/rpm 쌍 불변식. D2: 측정값 생략 시 null 저장. id/createdAt은 command 생성 | REQ-F-004 |
| command | `deleteRecord(id) → Result<void>` | confirm 후 호출. 삭제 즉시 목록·가이드 파생값에 반영 | REQ-ST-007 |
| query | `listRecordsByMotor(motorId) → RunRecord[]` | createdAt 역순 — S4 이력·가이드 근거 공용 | REQ-F-005/009 |
| query | `listMotorSummaries() → { motor: Motor; recordCount: number; lastRecord?: RunRecord }[]` | S3 카드용 파생 view — 영속·캐시하지 않음 | REQ-F-005 |
| query | `listSatisfiedRecords(motorId) → RunRecord[]` | `satisfied === true`만 — 가이드 입력 | REQ-F-006 |

### Guide (features/voltage-guide/model) — F8

| 종류 | 시그니처 | 계약 요점 | REQ |
|---|---|---|---|
| 순수 함수 | `computeGuide(satisfied: RunRecord[]) → GuideResult` | IO 없음 — seed 배열만으로 unit 검증. D1: `satisfied.length < GUIDE_MIN_SATISFIED(3)`이면 `insufficient(needed = 3 − n)`. A6: 범위 = 전압 min~max. 분포 `전압×건수` 텍스트 데이터, `wideVariance = (max−min) ≥ 0.5` | REQ-F-006, REQ-ST-006 |

```ts
type GuideResult =
  | { kind: 'recommendation'; rangeMin: number; rangeMax: number; satisfiedCount: number;
      distribution: { voltage: number; count: number }[]; wideVariance: boolean; evidence: RunRecord[] }
  | { kind: 'insufficient'; satisfiedCount: number; needed: number }
```

### Measurement handoff (entities/measurement/model) — F3 (비영속·in-memory)

| 종류 | 시그니처 | 계약 요점 | REQ |
|---|---|---|---|
| command | `setConfirmedMeasurement(m: Measurement)` | stable 확정 시에만 호출(F2). single-slot 덮어쓰기 | REQ-F-008 |
| command | `takeConfirmedMeasurement() → Measurement \| null` | S2 진입 시 1회 소비 — weak-signal·미측정이면 null → "측정값 없음" 카드 | REQ-F-008(H-5) |
| command | `clearConfirmedMeasurement()` | 다시 측정·측정값 비우기 시 | UX-A1/A3 |

### 측정 세션 command (features/measure-session — 비영속) — F2

`startCapture()`(탭 핸들러 내 getUserMedia+resume, 실제 sampleRate 전달) / `stopCapture()` / `retryPermission()` / `resumeAudio()`. 전이 가드: `isSecureContext===false`→활성화 불가, `AudioContext.state!=='running'`→`suspended`, 게이트 미달 프레임→`weak-signal`(수치 null). Worker 프로토콜: in=`{ pcm: Float32Array(transferable), sampleRate }`, out=`DisplayEstimate`(≥10 Hz).

## 5. Local Domain State 소유권

| Aggregate | Authoritative Owner | Derived Views (영속 금지) | Structural Commands |
|---|---|---|---|
| Motor 컬렉션 | IndexedDB `motors` — `entities/motor/api` | 모터 요약 카드(기록 수·최근 기록), "최근 사용순" 정렬 | `createMotor`, `deleteMotorCascade` (id·createdAt 불변, update는 name/statusMemo만) |
| RunRecord 컬렉션 | IndexedDB `records` — `entities/run-record/api` | 모터별 시간 역순 이력, 가이드 추천 범위·분포·근거(매 진입 재계산 — stale 금지) | `createRecord`(motorId 생성 시 고정), `deleteRecord` (immutable — update 없음) |
| Measurement 확정값 | in-memory single-slot — `entities/measurement` (영속·전역 스트림 아님) | S2 읽기전용 측정값 카드 | `set/take/clearConfirmedMeasurement` |
| 실시간 측정 스트림 | `features/measure-session` 세션 로컬 상태 (Worker→hook, 전역 store 금지) | S1 수치·status 표시 | — (세션 수명과 함께 소멸) |
| DB meta | IndexedDB `meta` — `shared/lib/persistence` | — | migration만 갱신 (state-contract에서 확정) |

## 6. Fixture / Seed 파일 목록 (MSW 없음 — DL-006)

- `src/shared/lib/audio-analysis/__fixtures__/synth.ts` — 합성 신호 생성기: 순음 300 Hz / 배음 지배(300+900/1800) / 고조파 오염(+1805 Hz) / pink noise SNR 10·0 dB / 무음 / 스핀업 chirp 200→500 Hz·2 s / 옥타브 유혹 / CRLB sanity용 순음+백색잡음 (v2 §3 — REQ-NFR-005 수용 기준 그대로)
- `src/shared/testing/seeds/motors.seed.ts` — empty(0개) / normal(2~3개) / max(30개, A7)
- `src/shared/testing/seeds/records.seed.ts` — 만족 기록 0·1·2·3건(D1 E-2) / 전압 분산 큰 케이스(E-4) / 측정값 null 기록(D2 H-3) / max(1,000건, E-5) / 손상·구버전 스키마 seed(C-6)
- unit 환경: Vitest + fake-indexeddb (entities repository·persistence·computeGuide), 브라우저 자동화는 seed 주입 helper 공용

## 7. Requirement Traceability (Must 14건 전수 + Should)

| REQ | 화면 | Owner slice | Command/Query | Evidence (시나리오) |
|---|---|---|---|---|
| REQ-F-001 캡처 계약 | S1 | features/measure-session | `startCapture` `resumeAudio` | browser+device D-1 / unit: 상태 가드 |
| REQ-F-002 측정→수치 표시 | S1 | shared/lib/audio-analysis + features/measure-session | `estimateFrame/refine/track` | unit fixture D-6/D-7/D-9 + device |
| REQ-F-003 모터 등록·관리 | S3/시트 | features/motor-management, entities/motor | `createMotor` `updateMotor` | unit+browser C-1, E-1 |
| REQ-F-004 기록 입력 | S2 | features/record-entry, entities/run-record | `createRecord` | unit+browser H-1~H-4 |
| REQ-F-005 목록 조회 | S3/S4 | pages/motors, pages/motor-detail | `listMotorSummaries` `listRecordsByMotor` | browser E-1/E-5/E-6 + 읽기 실패 상태 |
| REQ-F-006 전압 가이드 | S5 | features/voltage-guide | `listSatisfiedRecords` `computeGuide` | unit seed E-3/E-4 + browser |
| REQ-F-007 영속·안전 복구 | 전역 | shared/lib/persistence | `initPersistence` `resetAllData` | unit C-6 (invalid seed) |
| REQ-ST-001 권한 거부·영구 거부 | S1 | features/measure-session | `retryPermission` | browser(권한 mock) D-2 / device D-3 |
| REQ-ST-002 비보안 컨텍스트 | S1 | features/measure-session | (진입 가드) | browser D-4 |
| REQ-ST-003 weak-signal | S1 | shared/lib/audio-analysis(게이트) + measure-session(표시) | `track` → f0/rpm null | unit 무음·SNR0dB D-8 + browser |
| REQ-ST-004 suspended | S1 | features/measure-session | `resumeAudio` | device D-5 + unit 가드 |
| REQ-ST-005 IndexedDB 실패·quota·private | S2/전역 | shared/lib/persistence + features/record-entry + app | `initPersistence` 실패 전파 | unit C-4 / browser+device C-5 / unit C-6 |
| REQ-ST-006 만족 기록 부족 | S5 | features/voltage-guide | `computeGuide` insufficient | unit seed 0·1·2건 E-2 + browser |
| REQ-ST-007 삭제 destructive | S3/S4/confirm | features/motor-management + entities/motor·run-record + shared/ui | `deleteMotorCascade` `deleteRecord` `countRecordsByMotor` | unit+browser C-2/C-3 |
| REQ-F-008 자동 채움 (Should) | S1→S2 | entities/measurement | `set/takeConfirmedMeasurement` | browser H-5 |
| REQ-F-009 모터별 이력 (Should) | S4 | pages/motor-detail | `listRecordsByMotor` | browser |
| REQ-NFR-001/005 성능·측정 품질 | S1·목록 | shared/lib/audio-analysis, pages | — | unit fixture 8종 + E-5 max seed + device |
| REQ-NFR-003 접근성 | 전 화면 | shared/ui + 각 feature | — | browser a11y F-1 |

UX Check critical state 연결: S1 수치 영역(높이 고정·0 RPM 금지)→F1+F2, 활성화 버튼(제스처·문구 분리)→F2, S1→S2 CTA(stable에서만)→F3, S2 폼(검증·중복 탭·입력 유지)→F6, 삭제 cascade→F5, 가이드 부족 안내→F8 — 전 항목 owner·evidence 부여 완료.

## 8. 미결 승계와 상수 교체 지점 (baseline 그대로 사용)

| 항목 | Baseline | 교체 지점 (1곳 원칙) |
|---|---|---|
| D1 가이드 최소 건수 | 3건 미만 → 추천 미표시 + "n건 더 필요" | `shared/config/domain.ts` `GUIDE_MIN_SATISFIED = 3` — computeGuide·안내 문구가 이 상수만 참조 |
| D2 직접 입력 | 허용 — fanoHz/rpm nullable | 스키마 nullable + S2 "측정값 없음" 카드. 불허로 바뀌면 createRecord precondition 1곳 + S3 "+기록" 진입 제거 |
| D3 모터 삭제 | cascade confirm("기록 n건 함께 삭제") | `deleteMotorCascade` command 내부 정책 — 차단형으로 바뀌면 command 구현·confirm 문구만 교체 (호출부 불변) |
| D4 주행 결과 enum | `finished · course_out · not_run` | `RUN_RESULTS` 상수 + `shared/config` 라벨 맵 — 세그먼트·S4/S5 표시가 라벨 맵만 참조 |
| A5 전압 범위 | 0.1~9.9 V, 소수 ≤2자리 | `shared/config` `VOLTAGE_RANGE` — UI 검증·command precondition 공용 |
| A6 추천 규칙 | min~max, 분산 문구 임계 0.5 V | `computeGuide` 내부 + `WIDE_VARIANCE_THRESHOLD` 상수 |
| A1 파노=f₀ | 표시 라벨/환산식 분리 | 표시 계층 라벨 상수 — 엔진 산출값(f0)은 불변 |

## 9. 구현 순서 (Delivery Slices — split 권고 반영)

| Order | 가시적 사용자 결과 | 포함 feature | 의존 | Critical states 포함 | Effort driver |
|---|---|---|---|---|---|
| 1 | (내부 게이트) 합성 신호 8종에서 f₀·RPM·weak-signal이 정확히 판정됨 — **fixture unit과 함께 최우선** | F1 | 없음 (앱과 독립 — 즉시 착수) | weak-signal 게이트, 배음/옥타브 오판 금지 | **최대** — pYIN·VP·Viterbi 직접 구현 (v2 §5) |
| 2 | **smallest visible review**: 측정 화면 단독 — 녹음 활성화→실시간 수치→stable 확정 + 실패 상태 전환 | F2 (+F9·F10 최소분) | F1 protocol | no-permission(일시/영구)·HTTPS·suspended·weak-signal | 상태 머신 6종 + iOS 제스처 |
| 3 | 모터를 등록하고 브라우저를 껐다 켜도 남아 있음, cascade 삭제 동작 | F4, F5, F7(S3/S4) | F9 라우트 | 읽기 실패·복구 UI·private 모드·cascade confirm | schema/migration 골격 |
| 4 | 측정 확정→기록 저장 한 흐름(6탭 이내), 직접 입력도 가능 | F6, F3 | 2·3 | write 실패 입력 유지·중복 탭·D2 | 폼 검증 + handoff |
| 5 | 만족 기록 3건부터 추천 범위와 근거가 보임 + max seed 성능·a11y 마감 | F8 + E-5/F-1 검증 | 4 | 기록 부족·분산 큼 | 낮음 (순수 계산) |

Order 1과 2가 planning-context split의 전반부(측정 파이프라인+측정 화면), 3~5가 후반부(기록+가이드)다. Order 1·3·(F9/F10)은 상호 독립이라 팀 병렬 가능. 실기기 검증(device evidence: D-1/D-3/D-5, 실모터 실측)은 Phase 2 사용자 참여 세션(DL-006)으로 Order 2 완료 후 첫 회 수행.

## 10. Open Items (본 wave 신규)

### ASSUMPTION (검토 시 이의 없으면 유지)

- **FP-A1. "최근 사용순" 정렬 키** (ux-brief S2/S5 모터 라디오 리스트): 소속 기록의 max `createdAt`, 기록 없으면 `motor.createdAt`. 파생 계산 — 별도 필드 영속 안 함. 교체 시 `listMotorSummaries` 정렬 비교자 1곳.
- **FP-A2. 측정 메타 비영속**: `Measurement.confidence`·`capturedAt`은 RunRecord에 저장하지 않는다 (confidence는 UI 비노출 원칙과 정합, 기록 시각은 `record.createdAt`으로 충분). 저장이 필요해지면 records 스키마 additive migration으로 확장 — state-contract에서 version 경로 확보.
- **FP-A3. ID 체계 UUID v4 + 정렬 키 createdAt** — 단일 기기·오프라인이라 충돌 위험 없음. `createdAt` 동률(같은 ms) 시 2차 정렬 키는 id — state-contract에서 명문화.

### state-contract-designer 위임 (Phase 2 입력)

1. `deleteMotorCascade`·`createRecord`(FK 확인)의 다중 store 트랜잭션 원자성·실패 롤백 계약
2. schema v1 정의·version bump·migration·invalid-state recovery 절차 (REQ-NFR-006)
3. 동시 탭 마지막 쓰기 정책 (requirements Scenario Review 단서)
4. command별 precondition/postcondition 전수 + fixture 매핑 상세

### BLOCKER

- 신규 없음. 승계: 실기기 검증 사용자 참여(Phase 2, DL-006), harness 산출물 경로 정책(오케스트레이터 결정 사항 — 본 문서는 허용 경로 `_workspace/01_plan/`에 작성).
