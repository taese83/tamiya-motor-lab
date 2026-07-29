# Component Spec — minicar-motor-lab (v2 — 측정·모터·레이스 개편 + 디자인 v3 병합)

> **v2 개정판** (component-designer, 2026-07-29).
> canonical 입력: `_workspace/01_plan/revision-v2-brief.md`(M/T/R/RV — 충돌 시 v1 plan을 이긴다) · `layout-spec.md` **v2**(화면 골격·라우트 — 인라인 차트 채택, `/motors/:id`·`/record/new`·`/guide` 제거) · `state-contract.md` **v2**(command/query·왕복 handoff·INV-19~22) · `api-schema.md` **v2**(MOTOR_KINDS 9종·zod 스키마·Result 봉투) · `design-system.md` **v3**(라임 시그니처·컷코너·히어로·편집디자인 리듬 — RV-4로 Oxanium 숫자 폰트·페이지 페이드 **둘 다 ON**).
> 소비자: Phase 3 component-builder · feature-builder · route-builder · qa-state.
> v1 구조(FSD 소유권 표·컴포넌트별 props 계약·a11y 계약) 유지 개정. **현행 `src/` 실제 파일 목록 대조 완료** — §1.0 유지/개정/신설/삭제 분류가 파일 단위 계약이다.

---

## 0. 재사용 원칙 (변경 금지 — v1 승계)

1. **MUI 기본 우선 + 기존 킷 최대 재사용** — 공용 킷(ConfirmDialog·BottomSheet·VoltageStepper·Toast·EmptyState·RecoveryPanel·PageHeader·ThemeToggle·BigNumber·StatusBanner·SegmentControl)은 그대로 소비한다. 신설은 §1.0 표에 열거된 것이 전부 — **표 밖 새 컴포넌트 발명 금지**, 필요 시 spec 개정 선행.
2. **스타일 규칙**: theme(design-system v3 §8)·export 토큰(`measureStatusTokens`·`numericTypography`·`layoutTokens`·`motionTokens`·`shapeTokens`) 경유만. hex 직접 사용 금지. sx는 공개 slot/`classes`/theme API 우선 — generated class substring selector(`.MuiButton-root > div` 류) 금지.
3. **boolean prop 조합 금지**: 3분기 이상은 discriminated union(`MeasureView`·`MeasureAction`·`RaceEntryPano` 등).
4. **접근성 공통**: 인터랙티브 요소 44×44 이상(테마 기본 보장) · 아이콘 `aria-hidden` + 병행 텍스트 · 전역 focus ring 훼손 금지 · **색 단독 구분 금지(REQ-NFR-003)** · 클릭 가능한 행·스와치·세그먼트는 native button/radio 시맨틱 우선.
5. **수치 계약**: 전부 tabular-nums(`numericTypography`), 값 없음은 `EM_DASH('—')` — 0·빈 문자열·이전 값 위장 금지. 대형 수치는 Oxanium 서브셋(`font-display: optional` — 스왑 layout shift 금지, RV-4).
6. **고정 높이 계약**: S1 존 높이(Z1 48 / Z2 `measureValueMinHeight` / Z3 56)·목록 행 min 56·차트 160px — 상태 전환으로 어떤 요소도 이동하지 않는다(layout-spec §4.1).
7. **mutation 이벤트 키 = stable entity id(UUID)** — 렌더 index 사용 금지(LOCAL_DOMAIN_STATE_MODE Non-Negotiable). 파생 값(최신 파노·요약·차트 좌표)은 렌더 시 계산 — 영속·캐시 금지(INV-09).

---

## 1. FSD 소유권 & Public API

의존 방향 app→pages→features→entities→shared. feature 간 직접 import 금지 — 왕복 handoff는 `features/race-measure-handoff` store를 **page가 조립**해 연결한다(feature→feature import 없음).

### 1.0 파일 단위 분류 — 유지 / 개정 / 신설 / 삭제 (현행 `src/` 대조)

#### 유지 (public props·역할 무변경 — v3 테마 자동 적용)

| 파일 | 비고 |
|---|---|
| `src/shared/ui/confirm-dialog/ConfirmDialog.tsx` | props 불변 — 소비자·copy만 v2 4종으로 교체(§3.1, copy는 호출부 소유) |
| `src/shared/ui/bottom-sheet/BottomSheet.tsx` | props 불변. 시트 위 시트 금지 — 7.1→7.2 "교체" 패턴은 호출부 소유(§3.4) |
| `src/shared/ui/voltage-stepper/VoltageStepper.tsx` | RaceEntrySheet가 재사용(§6.3). 롱프레스·clamp·a11y 계약 v1 그대로 |
| `src/shared/ui/empty-state/EmptyState.tsx` | 소비처만 교체(§3.5) |
| `src/shared/ui/status-banner/StatusBanner.tsx` | unavailable/corrupt 배너 — 무변경 |
| `src/shared/ui/recovery-panel/RecoveryPanel.tsx` | resetAllData 유일 진입점 — 무변경(“모든 모터와 기록…” copy 유지) |
| `src/shared/ui/segment-control/SegmentControl.tsx` | generic 유지 — RaceEntrySheet 결과 2택이 직접 소비(§6.3) |
| `src/shared/ui/theme-toggle/ThemeToggle.tsx` | 무변경 |
| `src/pages/not-found/**` | §layout 2.5 무변경 |

#### 개정 (파일 유지, 계약 변경 — 본 문서가 새 계약)

| 파일 | 개정 내용 | § |
|---|---|---|
| `src/shared/ui/measure-status-label/MeasureStatusLabel.tsx` | status 집합 v2(8 view-status → 토큰 6키 매핑 내장), announcement 표 v2 | §2.3·§2.6 |
| `src/shared/ui/big-number/BigNumber.tsx` | v3 베젤 블록 제거(`darkColor` import 삭제 — DS §10) · **소비 역전**: 파노 주지표가 `size="rpm"`(display 스케일) 사용. props 시그니처 불변 | §3.6 |
| `src/shared/ui/toast/ToastHost.tsx` (+index) | `useToast`에 `showInfo(message)` 추가 — DB v2 재생성 1회 고지(RV-3). 성공/정보 2톤, 오류 토스트 금지 유지 | §3.3 |
| `src/shared/ui/page-header/PageHeader.tsx` | v3 2단(유틸 행 조건부 + 디스플레이 타이틀 행) — props 불변(DS §9.2) | — |
| `src/shared/ui/icons/icons.tsx` | additive: `drag-handle`·`chevron-down`·`plus` (기존 16종 유지) | §1.5 |
| `src/shared/ui/segment-control/index.ts` | export 축소 — ResultSegment·GradeSegment 제거 | — |
| `src/shared/lib/format/index.ts` | additive: `formatPanoValue(n)`(단위 없는 "309.0")·`formatLapTimeSec(ms)`("32.45s")·`formatDateTimeShort(iso)`("07-26 09:11"). 기존 4종 유지 | §1.5 |
| `src/features/measure-session/ui/RpmGauge.tsx` | **개명 `PanoGauge.tsx`** — 파노 170~620 Hz 눈금 재설계(M-4) | §2.4 |
| `src/features/measure-session/ui/MeasureFigures.tsx` | 히어로 존 소유(베젤·비네트) + 주지표 파노/보조 rpm 역전 + 문구 슬롯 | §2.5 |
| `src/features/measure-session/ui/MeasureActionDock.tsx` | Z3 단일 슬롯 — `MeasureAction` union(기록/탭하여 시작/권한/설정/재시작/레이스로 돌아가기) | §2.7 |
| `src/features/measure-session/ui/measure-view.ts`·`constants.ts`·`model/*` | `MeasureView` v2(stable 제거·자동 시작) — canonical 전이는 state-contract v2 소유, 본 문서는 UI 계약만 | §2.1 |
| `src/features/motor-management/ui/MotorFormSheet.tsx` | 필드 = 이름 + 종류 9택(`MotorKindSelect`)만 — grade·memo 행 제거(T-1) | §5.4 |
| `src/features/motor-management/model/use-motor-delete-flow.ts` | cascade confirm 문구 v2(측정 n·레이스 m 분리 고지) | §3.1 |
| `src/features/motor-management/api/mutations.ts` | grade/memo patch 제거 + `useReorderMotors` 추가(낙관 UI·permutation 실패 처리) | §5.3 |
| `src/pages/measure/**` · `src/pages/motors/**` | v2 조립(§9 매트릭스) — route-builder/page 소관 | — |
| `src/app/routes/**` | layout-spec §2.3 계약 — route-builder 소관 | — |

#### 신설

| 파일 | 컴포넌트/모듈 | § |
|---|---|---|
| `src/features/measure-session/ui/PanoGauge.tsx` | **PanoGauge** (RpmGauge 개정·개명) | §2.4 |
| `src/features/collect-measure/ui/RecordButton.tsx` | **RecordButton** — S1 [기록] | §4.1 |
| `src/features/collect-measure/ui/MotorPickSheet.tsx` | **MotorPickSheet** — 모터 선택 시트(M-6) | §4.2 |
| `src/features/collect-measure/model/use-collect-flow.ts` | 스냅샷→시트→collect 오케스트레이션 훅 | §4.3 |
| `src/features/collect-measure/api/use-collect-measure.ts` | `collectMeasureRecord` mutation 래퍼 | §4.3 |
| `src/features/race-measure-handoff/model/store.ts` | begin/consume/cancel single-slot (state-contract 계약 구현) | §7 |
| `src/features/race-measure-handoff/ui/RaceMeasureStrip.tsx` | **RaceMeasureStrip** — S1 왕복 모드 배너 | §7.1 |
| `src/features/motor-management/ui/MotorList.tsx` | **MotorList** — DnD 컨텍스트(@dnd-kit) 소유 | §5.1 |
| `src/features/motor-management/ui/MotorRow.tsx` | **MotorRow** — 행 + 인라인 확장(차트·기록·수정/삭제) | §5.2 |
| `src/features/motor-management/ui/PanoLineChart.tsx` | **PanoLineChart** — 커스텀 SVG (T-5) | §5.5 |
| `src/features/motor-management/ui/MotorKindSelect.tsx` | **MotorKindSelect** — 종류 9택 3열 그리드 | §5.4 |
| `src/entities/motor/ui/MotorKindChip.tsx` | **MotorKindChip** — 종류 표시 Chip(GradeChip 대체) | §3.7 |
| `src/features/race-record/ui/RaceMotorList.tsx` | **RaceMotorList** — S5 모터 목록(마지막 레이스 요약) | §6.1 |
| `src/features/race-record/ui/RaceRecordRow.tsx` | **RaceRecordRow** — S6 기록 행 + [삭제] | §6.2 |
| `src/features/race-record/ui/RaceEntrySheet.tsx` | **RaceEntrySheet** — 레이스 입력 시트(R-3) | §6.3 |
| `src/features/race-record/ui/ResetRecordsBlock.tsx` | **ResetRecordsBlock** — [기록 초기화] + confirm | §6.4 |
| `src/features/race-record/model/use-race-entry.ts` · `use-race-delete-flow.ts` · `use-reset-records-flow.ts` | 폼·삭제·초기화 흐름 훅 | §6 |
| `src/features/race-record/api/mutations.ts` | createRaceRecord·deleteRaceRecord·resetAllRecords 래퍼 | — |
| `src/pages/race/**` · `src/pages/race-detail/**` | S5·S6 조립 — route-builder 소관 | — |
| (`src/entities/measure-record/**` · `src/entities/race-record/**`) | model/api 신설 — entity-query-builder 소관(api-schema §9). **ui 없음** | — |

#### 삭제 (잔존 시 결함 — import 잔존 0건 확인)

| 파일 | 대체 |
|---|---|
| `src/features/record-entry/**` (RecordEntryForm·MeasurementFillBlock·use-record-entry-form·schema·mutations 전체) | 화면 소멸 — 수집은 S1 [기록]→MotorPickSheet |
| `src/features/voltage-guide/**` (GuideResult·GuideInsufficient·compute-guide·keys 전체) | 기능 제거(RV-2) — 대체 없음 |
| `src/shared/ui/satisfied-toggle/**` (SatisfiedToggle) | 만족 개념 소멸 |
| `src/shared/ui/segment-control/ResultSegment.tsx` | 완주/이탈 2택은 RaceEntrySheet 내부에서 generic SegmentControl 직접 소비(§6.3) |
| `src/shared/ui/segment-control/GradeSegment.tsx` | statusGrade 필드 제거(T-1) |
| `src/features/motor-management/ui/GradeChip.tsx` | `entities/motor/ui/MotorKindChip` |
| `src/features/motor-management/ui/MotorListItem.tsx` | `MotorRow`(§5.2) |
| `src/features/motor-management/model/use-record-delete-flow.ts` | MeasureRecord 개별 삭제 없음(RV-A1) |
| `src/entities/motor/ui/MotorRadioList.tsx` | 모터 선택은 MotorPickSheet(§4.2) |
| `src/entities/run-record/**` (RecordRow 포함 전체 slice) | entities/measure-record + race-record 분리 |
| `src/entities/measurement/**` (single-slot handoff 전체) | 왕복은 `features/race-measure-handoff`(비영속) |
| `src/pages/record-new/**` · `src/pages/guide/**` · `src/pages/motor-detail/**` | 라우트 제거(layout §2.1) |

### 1.1 shared/ui — 공용 킷 v2 (11 slice)

| 컴포넌트 (export) | slice | MUI 기반 | 용도 / 소비 화면 | v2 상태 |
|---|---|---|---|---|
| `MeasureStatusLabel` | `shared/ui/measure-status-label` | 커스텀 | S1 Z1 — 라벨+아이콘+색 3요소 + sr 단일 채널 | 개정 |
| `BigNumber` | `shared/ui/big-number` | 커스텀 | S1 파노 주지표(`size="rpm"`)·rpm 보조(`size="fano"`) | 개정 |
| `SegmentControl` | `shared/ui/segment-control` | ToggleButtonGroup | RaceEntrySheet 결과 2택 | 유지 |
| `VoltageStepper` | `shared/ui/voltage-stepper` | OutlinedInput+IconButton | RaceEntrySheet 전압 | 유지 |
| `ConfirmDialog` | `shared/ui/confirm-dialog` | Dialog | destructive 4소비자(§3.1) | 유지 |
| `ToastHost`, `useToast` | `shared/ui/toast` | Snackbar | 성공+정보(recreated) — 오류 토스트 금지 | 개정 |
| `BottomSheet` | `shared/ui/bottom-sheet` | Drawer bottom | 시트 3종 컨테이너(§7.1~7.3 오버레이) | 유지 |
| `StatusBanner` | `shared/ui/status-banner` | Alert | 전역 배너 | 유지 |
| `EmptyState` | `shared/ui/empty-state` | 커스텀 | S3/S5/S6 빈 상태·in-place not-found·404 | 유지 |
| `RecoveryPanel` | `shared/ui/recovery-panel` | 커스텀 | corrupt 복구 — resetAllData 유일 진입점 | 유지 |
| `PageHeader` | `shared/ui/page-header` | 커스텀 | v3 2단 헤더 | 개정 |

삭제: `satisfied-toggle` slice · `ResultSegment`·`GradeSegment` export.

### 1.2 entities UI (1 slice / 1 export)

| 컴포넌트 | slice | 용도 |
|---|---|---|
| `MotorKindChip` | `entities/motor/ui` | 종류 라벨 Chip — MotorRow·MotorPickSheet·RaceMotorList 공용 표시 전용 |

`entities/measure-record`·`entities/race-record`는 model/api 전용 — ui 없음(표시는 feature 소유).

### 1.3 features UI

| 컴포넌트/훅 | slice | 역할 | 근거 |
|---|---|---|---|
| `MeasureFigures` | `features/measure-session/ui` | S1 Z2 히어로 존 — 높이 고정 소유, PanoGauge+수치+문구 슬롯 | M-4·§2.5 |
| `PanoGauge` | 〃 | 220° 파노 게이지 SVG(장식) | M-4·§2.4 |
| `MeasureActionDock` | 〃 | Z3 단일 슬롯 — `MeasureAction` 렌더 | M-5·§2.7 |
| `useMeasureView` | `features/measure-session/model` | 세션 store 셀렉터(v2 — stable UI 상태 없음) | M-1~3·§2.1 |
| `RecordButton` | `features/collect-measure/ui` | [기록] primary — 스냅샷 캡처 트리거 | M-5·§4.1 |
| `MotorPickSheet` | 〃 | 모터 선택 시트 — 행 탭 즉시 수집, 0개면 등록 유도 | M-6·§4.2 |
| `useCollectFlow` | `features/collect-measure/model` | 스냅샷→시트→collect→토스트 상태 머신 | §4.3 |
| `RaceMeasureStrip` | `features/race-measure-handoff/ui` | S1 [R] 왕복 모드 배너(role=status) | R-5·§7.1 |
| handoff store | `features/race-measure-handoff/model` | begin/consume/cancel — INV-21 | state-contract |
| `MotorList` / `MotorRow` / `PanoLineChart` / `MotorKindSelect` / `MotorFormSheet` | `features/motor-management/ui` | S3 목록+DnD+인라인 확장+등록/수정 | T-1~7·§5 |
| `useMotorDeleteFlow` / `useReorderMotors` | `features/motor-management/{model,api}` | cascade confirm(n·m) / DnD commit·롤백 | §3.1·§5.3 |
| `RaceMotorList` / `RaceRecordRow` / `RaceEntrySheet` / `ResetRecordsBlock` | `features/race-record/ui` | S5·S6 레이스 UI 전체 | R-1~7·§6 |
| `useRaceEntry` / `useRaceDeleteFlow` / `useResetRecordsFlow` | `features/race-record/model` | 폼 draft·왕복 발진/복귀 접속·삭제·초기화 흐름 | §6 |

### 1.4 pages / app (조립 전용 — 신규 커스텀 UI 금지)

| 모듈 | 조립 내용 |
|---|---|
| `pages/measure` | `useMeasureView` + handoff slot 구독 → `RaceMeasureStrip?`+`MeasureStatusLabel`+`MeasureFigures`+`MeasureActionDock`. 일반 모드: `useCollectFlow`+`MotorPickSheet`(+0개 시 `MotorFormSheet` 교체 오픈). 왕복 모드: 자동 확정→복귀(§7.2). visually-hidden h1 "측정" |
| `pages/motors` | `PageHeader`(+[+ 등록])+`MotorList`+`EmptyState`+`MotorFormSheet`+`useMotorDeleteFlow`. corrupt → `RecoveryPanel` |
| `pages/race` | `PageHeader`+`RaceMotorList`+`EmptyState`+`ResetRecordsBlock`(모터>0일 때만) |
| `pages/race-detail` | `PageHeader`([←]+[+ 입력])+`RaceRecordRow` 목록+`RaceEntrySheet`+왕복 발진/복귀+in-place not-found(`EmptyState`) |
| `app` (route-builder) | RootLayout(PageFade·BottomTabBar 3탭·GlobalPersistenceBanner)·router — layout-spec §2.3 계약 |

### 1.5 shared/lib·config 표시 계약 (소비 필수)

| 항목 | 계약 |
|---|---|
| `formatPanoValue(n)` → `"309.0"` | 소수 1자리, 단위 분리(히어로 단위 행 별도) — **신설** |
| `formatFanoHz(n)` → `"309.0 Hz"` | 인라인 표기(행 수치) — 유지 |
| `formatRpm(n)` → `"18,540"` | 정수 천단위 — 유지 |
| `formatVoltage(v)` → `"3.1 V"` | 유지 |
| `formatLapTimeSec(ms)` → `"32.45s"` | ms→초 소수 ≤2자리 — **신설** |
| `formatDateTimeShort(iso)` → `"07-26 09:11"` | `Intl.DateTimeFormat('ko-KR')` 파생 — **신설** |
| `EM_DASH` | 값 없음 placeholder — 유지 |
| `MOTOR_KINDS`+`MOTOR_KIND_LABELS`·`RACE_RESULTS`+`RACE_RESULT_LABELS`·`VOLTAGE_RANGE`·`MEASURE_RECORD_LIMIT`·`F0_RANGE` | `shared/config` 1곳 — 컴포넌트 하드코딩 금지(api-schema §1) |
| 아이콘 | 기존 16종 + **additive 3종**: `drag-handle`(≡)·`chevron-down`(확장 캐럿)·`plus`. 24×24 currentColor `aria-hidden` |

---

## 2. S1 측정 화면 (최중요 — 자동 시작·연속 측정·파노 주지표)

### 2.1 MeasureView v2 — UI 계약 union

canonical 세션 enum(`idle·measuring·weak-signal·no-permission·suspended` + 내부 `isStable`)은 state-contract v2 소유. UI는 아래 **view-status 8종**으로 파생(파생 함수는 store 셀렉터 — unit 대상):

```ts
// features/measure-session/model/view.ts (v2)
export type MeasureView =
  | { status: 'starting' }                          // 자동 시작 시도·권한 프롬프트 중 (idle+activating 흡수)
  | { status: 'insecure' }                          // isSecureContext===false — 권한 문구와 혼용 금지
  | { status: 'awaiting-gesture' }                  // iOS 자동 시작 거부(M-1 fallback) — 오류 아님, 중립 톤
  | { status: 'measuring'; panoHz: number; rpm: number }  // 연속 갱신 — 잠금 없음(M-3). 값 비null 보장
  | { status: 'weak-signal' }                       // 수치 없음 — 타입으로 강제(INV-13)
  | { status: 'no-permission'; permanent: boolean; settingsHelpOpen: boolean }
  | { status: 'suspended' }                         // 세션 중 오디오 중단 — [탭하여 다시 시작]

export function useMeasureView(): MeasureView
```

- v1의 `idle`(수동 시작)·`stable`(잠금) **제거**. `isStable`은 view에 노출하지 않는다 — 소비처는 왕복 자동 확정(§7.2) 1곳뿐.
- `awaiting-gesture` vs `suspended` 판별: **자동 시작 경로의 `capture-suspended` = awaiting-gesture / 실행 중 세션의 중단 = suspended** — 판별 플래그는 store 소유(순수 함수 unit).
- [기록] 활성 = `status === 'measuring'` **&& persistence ready** (M-5 — measuring이면 표시값 비null이 타입 보장).
- 수명(M-2): visibilitychange hidden·라우트 이탈 → 자동 정지 / 복귀 → `starting`부터 자동 재시작. 중지 버튼 없음.

### 2.2 view-status × 존 매핑 (layout-spec §4.2와 1:1 — 골격 불변)

| view | Z1 라벨(토큰 키) | Z2 히어로 | 문구 슬롯(1줄 고정) | Z3 `MeasureAction` |
|---|---|---|---|---|
| `starting` | "측정 준비 중…" (`idle`) | 게이지 dim, "—" | (빈 줄) | `{kind:'record', disabled:true}` |
| `insecure` | "측정 불가" (`idle`) | 게이지 dim, "—" | "HTTPS에서만 측정할 수 있습니다" | `{kind:'record', disabled:true}` |
| `awaiting-gesture` | "시작 대기" (`idle` — **오류 톤 금지**) | 게이지 dim, "—" | "탭하여 측정을 시작하세요" | `{kind:'tap-to-start'}` primary |
| `measuring` | "● 측정 중" (`measuring` 라임 펄스) | 파노 대형+rpm 보조 연속 갱신, 진행 아크·바늘 라임 | (빈 줄) | `{kind:'record', disabled:false}` |
| `weak-signal` | "신호 약함" (`weak-signal`) | "—"(동일 스케일), 바늘·아크 숨김 | "신호가 약합니다. 모터에 더 가까이 대세요" | `{kind:'record', disabled:true}` |
| `no-permission` 일시 | "마이크 권한 필요" (`no-permission`) | dim, "—" | "마이크 권한이 거부되었습니다" | `{kind:'retry-permission'}` primary |
| `no-permission` 영구 | 〃 | dim, "—" + 설정 경로 Collapse(Z2 내부 스크롤 — 높이 불변) | "브라우저 설정에서 마이크 권한을 허용해야 합니다" | `{kind:'settings-help', expanded}` |
| `suspended` | "오디오 일시 중지됨" (`suspended`) | dim, "—" | "iOS 정책으로 오디오가 중지되었습니다" | `{kind:'resume'}` primary |

왕복 모드(슬롯 존재)에서는 **모든 상태에서 Z3만 `{kind:'back-to-race'}`로 치환**되고(§7.1) `record` action은 렌더되지 않는다(INV-21 — [기록] 진입점 0개).

### 2.3 MeasureStatusLabel — `shared/ui/measure-status-label` (개정)

```ts
export type MeasureViewStatus =
  | 'starting' | 'insecure' | 'awaiting-gesture' | 'measuring'
  | 'weak-signal' | 'no-permission' | 'suspended'

interface MeasureStatusLabelProps {
  status: MeasureViewStatus
  /** 상태 전이 시에만 갱신 — §2.6 표. 수치 갱신으로 변경 금지 */
  announcement: string
}
```

- **토큰 매핑 내장**(view 8종 → `measureStatusTokens` 6키): `starting·insecure·awaiting-gesture → idle` / 나머지 동명 키. `stable` 토큰 키는 **소비처 0**(design-tokens 6키 구조는 불변 — 잔존 무해, DS 계약 유지).
- 라벨 문구는 §2.2 표를 내부 상수로 소유. 3요소(라벨+아이콘+fg/bg) 동시 렌더 — 아이콘 없는 사용 금지.
- sr 단일 채널: 내부 visually-hidden `role="status"`에 `announcement`만 — 시각 라벨에 live 속성 금지(v1 계약 승계). 높이 48px 고정. props 순수 렌더.

### 2.4 PanoGauge — `features/measure-session/ui` (RpmGauge 개정·개명)

```ts
interface PanoGaugeProps {
  /** null → dim 트랙(바늘·진행 아크 미표시). 값 있음 = measuring */
  panoHz: number | null
}
```

| 항목 | 사양 |
|---|---|
| 기하 | 220° 아크 · viewBox `0 0 200 120` — v1 승계, **매핑만 파노 `F0_RANGE`(170~620 Hz) 교체**. 대역 상수는 `shared/config` 소비(하드코딩 금지) |
| 주 눈금 | 100 Hz 간격 — **200·300·400·500·600 라벨**(overline 톤, `text.secondary`) + 끝점 170/620 무라벨 틱 |
| 보조 눈금 | 25 Hz 간격 hairline stroke (계기판 밀도) |
| 캡션 | `"Hz"` overline 톤 |
| 레드라인 | **580~620 Hz** `error.main` 단색 밴드(strokeWidth 5, opacity 0.9) — 장식(DS-A15), 시맨틱 의미 없음 |
| 진행 아크 | `panoHz != null`일 때 최소점(170)→현재 값, 라임(`--mml-status-measuring-fg`), strokeWidth 4, `stroke-dashoffset` transition `needleMs`(100ms) linear |
| 바늘 | `panoHz != null`일 때만 — CSS rotate 100ms linear(rAF/JS 보간 금지). dim 시 미렌더 |
| dim | `panoHz === null` — 트랙·눈금만 저채도(opacity), 진행 요소 없음 |
| 모션 | reduced-motion: 바늘·아크 즉시 이동(0ms) |
| a11y | **SVG 전체 `aria-hidden`** — canonical 수치는 MeasureFigures의 텍스트 노드. 상태 판별 비관여 |

상태 전수: dim(null) / active(값) 2종 — 그 외 상태 분기는 상위(`MeasureFigures`)가 값 null화로 전달.

### 2.5 MeasureFigures — `features/measure-session/ui` (개정 — 히어로 존 소유)

```ts
interface MeasureFiguresProps { view: MeasureView }
```

- **높이 고정 소유**: Z2 = `layoutTokens.measureValueMinHeight`(v3 재클램프) — view 8종 전부 동일. 재계산은 resize/회전 시에만.
- **히어로 프레임**(DS §9.4): 1px `hairlineStrong` 베젤 링(radius 4) + 상태 bg(`--mml-status-*-bg`) + `--mml-hero-vignette` overlay(absolute·`aria-hidden`·pointer-events none). BigNumber는 순수 수치(베젤 없음).
- 내부 구성(위→아래): `PanoGauge`(aria-hidden) → **파노 대형 수치** `BigNumber size="rpm"`(Oxanium, `formatPanoValue`) → 단위 overline `"Hz"` → **rpm 보조** `"{formatRpm} rpm"`(`fanoValue` 스케일 — M-4 역전) → 문구 슬롯 1줄(없으면 빈 줄 유지).
- `measuring`: 연속 갱신 — 잠금·tint 전환 없음(stable UI 소멸). `weak-signal`·dim 상태: 파노 자리 `BigNumber value={null}` → "—"(동일 타이포·높이) + sr-only "측정값 없음", rpm 행도 "—".
- 토큰 소비: `bg`·`valueFg`만 — `measureStatusTokens` 소비자는 본 컴포넌트+MeasureStatusLabel 2곳 유지.
- **aria-live 없음** — 수치 갱신(≥10Hz) announce 금지. no-permission 영구 Collapse: Z2 내부 `overflow-y:auto`, `aria-controls`는 dock 버튼과 연결.

### 2.6 aria-live 계약 v2 (S1 단일 채널)

원칙 v1 승계: 채널은 MeasureStatusLabel 내부 hidden `role="status"` 1곳 + 왕복 스트립 진입 1회(§7.1 — 별개 요소, 중복 알림 금지 검증 대상).

| 전이 도착 | announcement | 시점 |
|---|---|---|
| starting | `"측정 준비 중"` | 진입·재시작 시 |
| measuring | `"측정 중"` | 즉시 (weak→measuring 복귀는 1s debounce) |
| weak-signal | `"신호가 약합니다. 모터에 더 가까이 대세요"` | 1s debounce(왕복 스팸 방지) |
| awaiting-gesture | `"탭하여 측정을 시작하세요"` | 즉시 — 오류 어휘 금지 |
| no-permission 일시/영구 | v1 문구 유지 | 즉시 |
| suspended | `"오디오가 일시 중지되었습니다. 탭하여 다시 시작하세요"` | 즉시 |
| insecure | `"HTTPS에서만 측정할 수 있습니다"` | 진입 시 1회 |

`buildAnnouncement(prev, next)` 순수 함수(중복 문구 재발화 금지) 유지. stable 항목 삭제.

### 2.7 MeasureActionDock — `features/measure-session/ui` (개정 — 단일 슬롯)

```ts
export type MeasureAction =
  | { kind: 'record'; disabled: boolean }   // 일반 모드 [기록] — RecordButton 렌더(§4.1)
  | { kind: 'tap-to-start' }                // [탭하여 시작] primary — 1탭 계약(M-1, QA 대상)
  | { kind: 'retry-permission' }            // [권한 다시 요청] primary
  | { kind: 'settings-help'; expanded: boolean } // [설정 방법 보기] — aria-expanded 토글
  | { kind: 'resume' }                      // [탭하여 다시 시작] primary
  | { kind: 'back-to-race'; motorName: string } // 왕복 모드 — [레이스로 돌아가기] secondary

interface MeasureActionDockProps {
  action: MeasureAction
  onRecord: () => void            // RecordButton 탭 — 스냅샷 캡처는 collect-flow(§4.3)
  onTapToStart: () => void        // resumeAudio — 탭 핸들러 내 호출(제스처 요건)
  onRetryPermission: () => void
  onToggleSettingsHelp: () => void
  onResume: () => void
  onBackToRace: () => void        // cancelRaceMeasure + navigate(-1) — draft 보존(§7.3)
}
```

- Z3 h56 고정 단일 슬롯 — v1의 [B] 세션 슬롯 폐지(다시 측정 없음, M-3). `action` 산출은 순수 함수 `deriveMeasureAction(view, raceReturnActive, persistenceReady)` — unit 대상.
- `tap-to-start`는 **primary 라임 컷코너**(실패 톤 금지 — M-1 계약). `back-to-race`는 outlined secondary.
- 슬롯 교체 시 교체 직전 포커스가 슬롯 내부였으면 새 버튼으로 programmatic focus(v1 계약 승계).
- persistence `unavailable` → `record.disabled=true` 상시(사유는 전역 배너 소관).

---

## 3. 공용 킷 v2 계약

### 3.1 ConfirmDialog — destructive 계약 (props 불변, 소비자 4곳 v2)

v1 계약 전량 유지(`role="alertdialog"` · 초기 포커스 [취소] · pending 중 ESC/backdrop 차단 · errorMessage 인라인 `role="alert"`+재시도 · 트리거 소멸 시 focus 승계 · red contained는 이 계약 내에서만).

| 소비자 | title | impact | confirmLabel |
|---|---|---|---|
| RaceRecord 개별 삭제 (S6, LD-4) | "이 레이스 기록을 삭제할까요?" | "되돌릴 수 없습니다." | 삭제 |
| 모터 cascade (S3 확장 [삭제]) | "'{모터명}' 모터를 삭제할까요?" | n+m≥1: "'{모터명}'과 측정 기록 {n}건, 레이스 기록 {m}건이 함께 삭제됩니다. 되돌릴 수 없습니다." / n+m=0: "'{모터명}'이(가) 삭제됩니다. 되돌릴 수 없습니다." | 삭제 |
| [기록 초기화] (S5, R-6·RV-A2) | "모든 기록을 초기화할까요?" | "모든 측정 기록과 레이스 기록이 삭제됩니다. 등록된 모터 {k}대는 유지됩니다. 되돌릴 수 없습니다." | 초기화 |
| resetAllData (RecoveryPanel — 유일 진입점) | "모든 데이터를 초기화할까요?" | "모든 모터와 기록이 삭제되며 되돌릴 수 없습니다." | 초기화 |

- n·m·k는 **store 실측**(`countRecordsByMotor`·모터 수) — 렌더 행 수로 판단 금지. dialog 열기 전 조회 완료(내부 loading 없음). 조회 실패 시 dialog 미오픈 + 트리거 인근 인라인 오류+[다시 시도].
- [기록 초기화]와 resetAllData는 **문구로 범위 구분**(모터 유지 vs 전체) — 혼용 금지(layout §8).

### 3.2 BottomSheet (유지) — 시트 교체 패턴

- 시트 위 시트 금지. MotorPickSheet(0개)→MotorFormSheet는 **닫고 열기 교체** — 교체 시 focus는 새 시트 첫 필드, 최종 닫힘 후 원 트리거([기록])로 복귀. 교체 오케스트레이션은 `useCollectFlow`(§4.3) 소유.
- ESC/backdrop/스와이프 다운 = onClose(수집·저장 없음). safe-area·radius 20·max-width 480 theme 소관.

### 3.3 Toast (개정)

```ts
interface UseToast {
  showSuccess(message: string): void   // "'{모터명}'에 기록됨" · "저장됨" · "초기화되었습니다"
  showInfo(message: string): void      // "데이터 형식이 변경되어 초기화되었습니다" (RV-3 recreated 1회)
}
```
오류 토스트 금지 유지 — 오류는 인라인 Alert+재시도. 연속 호출 교체(큐 없음).

### 3.4 (VoltageStepper — 유지) / 3.5 (EmptyState — 유지, 소비처 v2)

EmptyState 소비처: S3 모터 0("첫 모터를 등록하세요"+[+ 등록]) / S5 모터 0("모터를 먼저 등록하세요"+[모터로 이동]) / S6 기록 0("아직 레이스 기록이 없습니다"+[+ 입력]) / S6 in-place not-found("모터를 찾을 수 없습니다"+[레이스 목록으로]) / 404. 오류 위장 금지.

### 3.6 BigNumber (개정 — props 불변)

```ts
interface BigNumberProps {
  value: string | null           // null → "—" + sr-only "측정값 없음"
  unit?: string
  size: 'rpm' | 'fano' | 'guide' // numericTypography 토큰 1:1 — 이름은 토큰 계약상 불변
  valueColor?: string
}
```
- v3: 개별 베젤 제거(순수 수치 렌더). Oxanium 서브셋은 `rpmValue`·`guideRange` 토큰 fontFamily로 적용(RV-4 — 컴포넌트 무관여).
- **소비 역전(M-4)**: S1 주지표 **파노**가 `size="rpm"`(display 스케일), 보조 rpm은 `size="fano"` 자리. `guide` 소비처는 v2에 없음(토큰·prop은 유지).

### 3.7 MotorKindChip — `entities/motor/ui` (신설)

```ts
interface MotorKindChipProps { kind: MotorKind }   // 라벨은 MOTOR_KIND_LABELS 경유 — 하드코딩 금지
```
`Chip variant="outlined" size="small"` 중립색(text.secondary/`--mml-outline`) — 종류에 가치판단 색 금지. 표시 전용·비인터랙티브. 소비: MotorRow·MotorPickSheet 행·RaceMotorList 행·S6 헤더 메타.

---

## 4. 수집 흐름 (M-5·M-6) — `features/collect-measure`

### 4.1 RecordButton (신설)

```ts
interface RecordButtonProps {
  disabled: boolean        // = !(view.status==='measuring' && persistence ready)
  onPress: () => void      // 탭 시점 스냅샷 캡처는 useCollectFlow 소유(§4.3)
}
```
- `Button variant="contained" size="large" fullWidth`(컷코너 h56) 라벨 "기록". Z3 슬롯 점유(`MeasureAction kind:'record'`).
- disabled여도 **상시 렌더**(M-5 — 자리 이동 없음). `aria-disabled`, 사유 전달은 Z2 문구/전역 배너 소관(버튼 자체 설명 금지 — 단일 채널).
- 상태: enabled / disabled 2종.

### 4.2 MotorPickSheet (신설)

```ts
interface MotorPickItem {
  id: string
  name: string
  kind: MotorKind
  lastPanoHz: number | null       // MotorSummary.lastMeasure 파생 — null → "기록 없음"
}

interface MotorPickSheetProps {
  open: boolean
  /** [기록] 탭 시점 고정 스냅샷(SC2-A3·LO-6) — 시트 열림 중 측정이 계속돼도 이 값이 기록된다 */
  snapshot: { panoHz: number; rpm: number } | null
  motors: ReadonlyArray<MotorPickItem>   // sortOrder 순 — 정렬은 데이터 계층
  pendingMotorId: string | null          // 수집 중 행 — 전 행 탭 차단(single-flight)
  errorMessage: string | null            // 수집 실패 — 시트 유지 + role="alert" 배너 + 행 재탭 가능
  onSelect: (motorId: string) => void    // 행 탭 → 즉시 collectMeasureRecord
  onRequestRegister: () => void          // 모터 0개 — MotorFormSheet로 교체(§3.2)
  onClose: () => void
}
```
- `BottomSheet` 소비. h2 "기록할 모터" + 스냅샷 표시 행 `"{formatFanoHz} · {formatRpm} rpm"`(listValue tabular) — **표시-기록 일치 계약**.
- 행: `ListItemButton`(native button, h≥56) — 이름 + `MotorKindChip` + 우측 최신 파노(`formatFanoHz` | "기록 없음" 중립). accessible name은 자연 텍스트.
- 모터 0개: 본문 = "등록된 모터가 없습니다" + [모터 등록] primary → 등록 시트 교체 → 저장 성공 시 **그 모터로 즉시 수집**(선택 단계 생략) + 토스트.
- 상태 전수: populated / empty(등록 유도) / pending(행 spinner 없이 전 행 disabled + 선택 행 "기록 중…" 라벨) / error(배너+재탭) / closed.

### 4.3 useCollectFlow — `features/collect-measure/model`

상태 머신: `idle → snapshot-open(스냅샷 고정) → collecting(motorId) → (success: 시트 닫힘+토스트 "'{모터명}'에 기록됨" | error: snapshot-open+errorMessage) | register-detour(시트 교체) → collecting(신규 모터 즉시 수집)`.
- 스냅샷은 [기록] 탭 시점 1회 캡처 — 시트 수명 동안 불변(MR-2). 닫힘(취소) 시 파기.
- `not-found`(동시 탭 모터 삭제): 오류 토스트 금지 규칙에 따라 시트 내 배너 + 목록 invalidate 갱신.
- 실패 시 성공 오표시 금지(C-4′) — mutation 래퍼는 api-schema §6.4 invalidation 준수.

---

## 5. S3 모터 (`/motors`) — 목록 + DnD + 인라인 확장

### 5.1 MotorList (신설 — DnD 컨텍스트 소유)

```ts
interface MotorListProps {
  summaries: ReadonlyArray<MotorSummary>       // sortOrder asc (listMotorSummaries)
  expandedIds: ReadonlySet<string>             // 다중 확장 허용(LO-5 확정) — 휘발(§5.2)
  onToggleExpand: (motorId: string) => void
  onReorder: (orderedIds: string[]) => void    // 드롭 확정 — entity id 순열만(view index 금지)
  onEdit: (motorId: string) => void
  onDelete: (motorId: string) => void
}
```
- `DndContext` + `SortableContext(verticalListSortingStrategy)` 소유. 센서: `PointerSensor`(activationConstraint `{distance: 8}` — 핸들 전용이므로 스크롤 경합 없음, 방어적) + `KeyboardSensor`(`sortableKeyboardCoordinates`).
- **드래그/들기 시작 시 확장 패널 전부 접힘**(onDragStart → 상위 `expandedIds` clear 콜백 — 프리뷰 높이 안정, LD-1 트레이드오프 해소). 드롭 시 `onReorder(orderedIds)` — 낙관 재배열은 로컬, commit 실패 시 IDB 순서로 롤백 렌더 + 토스트(§5.3).
- **키보드 재정렬(a11y 필수 계약 — QA gate)**: 핸들 focus → **Space/Enter 들기 → ↑/↓ 이동 → Space 놓기 / Esc 취소**.
- **SR 안내(한국어 — dnd-kit accessibility 주입)**:
  - `screenReaderInstructions`: "순서 변경 핸들입니다. Space 또는 Enter로 들어 올리고, 위/아래 화살표로 이동한 뒤 다시 Space로 놓습니다. Escape로 취소합니다."
  - `announcements`: onDragStart "'{모터명}' 들어 올림, 현재 {i}번째 / 총 {n}개" · onDragOver "'{모터명}' {i}번째 위치" · onDragEnd "'{모터명}' {i}번째 위치에 놓음" · onDragCancel "순서 변경을 취소했습니다".
- reduced-motion: 드롭 애니메이션 0ms. 드래그 중 자동 스크롤 dnd-kit 기본.
- 상태 전수: populated / empty(상위 EmptyState — 본 컴포넌트 미렌더) / dragging(전 행 접힘) / reorder-pending(입력 차단 없음 — 낙관) / reorder-error(롤백+토스트 "순서를 저장하지 못했습니다" / permutation: "목록이 갱신되었습니다" + refetch).

### 5.2 MotorRow (신설 — MotorListItem 대체)

```ts
interface MotorRowProps {
  summary: MotorSummary            // motor + measureCount + lastMeasure? + raceCount + lastRace?
  expanded: boolean
  onToggleExpand: (motorId: string) => void
  onEdit: (motorId: string) => void
  onDelete: (motorId: string) => void
  records: ReadonlyArray<MeasureRecord> | undefined  // 확장 시에만 주입(measuredAt asc ≤10)
  recordsError?: boolean           // 확장 내 읽기 실패 — 오류 블록+[다시 시도]
  onRetryRecords?: () => void
}
```
- 내부에서 `useSortable(summary.motor.id)` 사용(transform/transition/setNodeRef).
- **접힘 행**(min-h 56, Paper outlined): `[≡ 핸들]` + 이름 + `MotorKindChip` + 최신 파노(`formatFanoHz(lastMeasure.panoHz)` | "—", listValue) + 확장 캐럿(`chevron-down`, expanded 시 회전).
  - **핸들**: 44×44 독립 button, `{...attributes}{...listeners}` 핸들에만 부착(핸들 전용 활성화 — 행 본체는 스크롤·확장에 귀속). `aria-label="'{모터명}' 순서 변경"`. `aria-roledescription="정렬 가능"`(dnd-kit 기본).
  - **행 본체** = `aria-expanded`/`aria-controls` 토글 button(핸들과 타깃 중첩 금지). accessible name = "{이름}, {종류}, 최신 파노 {값}".
- **확장 패널**(id는 aria-controls 대상): hairlineStrong 룰 → `PanoLineChart`(records ≥1) 또는 "아직 기록 없음 — 측정 탭에서 [기록]으로 수집하세요" 텍스트 블록 → 기록 리스트 ≤10행(**canonical 텍스트 채널**): `01 {formatDateTimeShort} {formatFanoHz} · {formatRpm} rpm` — 회차 인덱스 overline(오래된 순 01부터 — 차트 X축과 정렬 일치), 행 액션 없음(T-2·RV-A1) → 푸터 [수정](outlined h44) [삭제](outlined error 톤 h44 — contained 금지, red contained는 ConfirmDialog 전용).
- 확장 전환 `enterMs`·reduced-motion 0ms. 확장 상태 휘발(새로고침 전부 접힘). 다중 확장 허용.
- 상태 전수: collapsed / expanded(records) / expanded-empty(기록 0) / expanded-error / dragging(접힘 강제) / keyboard-lifted.

### 5.3 useReorderMotors — `features/motor-management/api`

- 드롭 확정 → `reorderMotors({orderedIds})`(id 순열만). 성공 → invalidate(`motorKeys.root`). 실패:
  - `storage` → 로컬 낙관 순서 폐기, IDB 순서 재렌더 + 토스트 "순서를 저장하지 못했습니다".
  - `validation(permutation)`(동시 탭 경합) → refetch + 안내 "목록이 갱신되었습니다" — DnD 결과 폐기(SO-2).
- 키보드 경로도 동일 commit 경로(들기~놓기 완료 시 1회 호출).

### 5.4 MotorFormSheet (개정) + MotorKindSelect (신설)

```ts
interface MotorFormValues { name: string; kind: MotorKind | null }

interface MotorFormSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: MotorFormValues
  pending: boolean                 // [저장] disabled "저장 중…" (single-flight)
  errorMessage: string | null      // 저장 실패 인라인 Alert + 재활성. not-found(동시 탭 삭제): 시트 유지+오류+목록 갱신(C-8)
  onSubmit: (values: { name: string; kind: MotorKind }) => void
  onClose: () => void
}

interface MotorKindSelectProps {
  value: MotorKind | null
  onChange: (kind: MotorKind) => void   // 필수 항목 — 해제 없음
  error?: boolean                        // 그룹 외곽 error — 문구는 폼 소유
}
```
- 시트 title "모터 등록"/"모터 수정"(h2). 필드: 이름(TextField 필수, trim 1~30 — 스키마 상수 소비) → **종류 9택 3열 그리드** → [저장] primary + [취소]. grade·memo 행 **삭제**(T-1).
- **MotorKindSelect**: `ToggleButtonGroup` 비exclusive 아님 — **radio 시맨틱**: `role="radiogroup"` aria-label "모터 종류" + 각 셀 `ToggleButton`(native button)에 `aria-checked` 반영 또는 MUI exclusive group 사용(`aria-pressed`) — **exclusive ToggleButtonGroup 채택**(테마 직각·라임 선택·w800 자동). 3열 CSS grid, 셀 min-h 44, 긴 라벨("스프린트대시") 2줄 wrap 허용. 라벨 = `MOTOR_KIND_LABELS`, 저장 값 = 안정 식별자.
  - 선택 표시 3중: 라임 bg + w800 + `check` 아이콘 병행(비선택 동일 폭 투명 placeholder — 폭 흔들림 금지). 키보드: Tab 그룹 진입, 버튼별 Tab/Enter/Space(ToggleButton 기본) — 320px에서도 3열 유지(layout §10).
- 검증: 이름 미입력/초과 → 인라인 오류+input focus. **종류 미선택 저장 → 인라인 오류 "종류를 선택하세요" + 그리드 첫 버튼 focus**.
- edit: 기존 name·kind 채움, 구조 필드 미노출. 초기 포커스 이름 input. 닫힘 = 폼 파기 + 트리거 복귀.
- 상태 전수: editing / validating-error / pending / submit-error / closed.

### 5.5 PanoLineChart (신설 — 커스텀 SVG, T-5)

```ts
interface PanoLineChartProps {
  /** measuredAt asc, ≤10건 — listMeasureRecordsByMotor 결과 그대로(재정렬 금지) */
  points: ReadonlyArray<{ id: string; measuredAt: string; panoHz: number }>
}
```
- 크기: width 100% × **height 160px 고정**(viewBox 비율 유지, preserveAspectRatio 없이 width 기준 스케일). 차트 라이브러리 금지.
- 축: X = measuredAt **실제 시간 축**(등간격 아님), Y = panoHz(도메인 = 점 min/max에 5% 패딩, 점 1개면 중앙). 라벨: Y min/max 2개(overline 톤) + X 처음/끝 날짜 2개(`formatDateTimeShort` 날짜부). 그리드 hairline 수평 ≤2줄.
- 표현: 라임 라인 strokeWidth 2 + 점 r3(마지막 점 r4 강조). 점 1개 → 점만. 애니메이션 트윈 금지(패널 enter 페이드에 포함).
- **a11y**: SVG 전체 `aria-hidden="true"` — **canonical 데이터 = 아래 기록 리스트 텍스트(§5.2)**, 차트는 추세 보조(중복 채널 금지 — layout §5.2 확정). 차트 단독 사용 금지(기록 리스트 없는 소비 금지).
- 상태 전수: points ≥2(라인) / points=1(점) / points=0은 렌더하지 않음(상위가 "아직 기록 없음" 블록 — h160 비유지, layout §5.1).

---

## 6. S5 레이스 목록 · S6 레이스 페이지 — `features/race-record`

### 6.1 RaceMotorList (신설)

```ts
interface RaceMotorListProps {
  summaries: ReadonlyArray<MotorSummary>   // sortOrder asc — S3와 동일 순서(화면 간 불일치 금지)
  onSelect: (motorId: string) => void      // → /race/:motorId (navigate는 page)
}
```
- 행(`ListItemButton` h≥56, Paper outlined): 행1 = 이름 + `MotorKindChip` / 행2 = 마지막 레이스 요약 `"마지막 레이스 {formatDateTimeShort(lastRace.createdAt)} {RACE_RESULT_LABELS[result]} · {formatVoltage} · {formatFanoHz}"`(+lapTime 있으면 `· {formatLapTimeSec}`) — `lastRace` 없으면 "레이스 기록 없음"(중립 text.secondary, 오류 위장 금지).
- 결과 라벨은 **중립 텍스트**(DS-A5) — finished/retired에 시맨틱 색 금지.
- 상태: populated / empty(상위 EmptyState) / per-row no-race.

### 6.2 RaceRecordRow (신설)

```ts
interface RaceRecordRowProps {
  record: RaceRecord
  index: number                     // 회차 번호 — 최신 행 = 총 건수(내림차순 번호), 표시 전용
  onDelete: (id: string) => void    // stable id — confirm은 useRaceDeleteFlow
  deletePending: boolean
}
```
- 행1: 회차 인덱스(overline, "05") + `formatDateTimeShort(createdAt)` + 우측 **[삭제] 44×44 IconButton**(`trash`, `aria-label "{일시} 레이스 기록 삭제"`) — 행 텍스트와 타깃 중첩 금지(LD-4 — 스와이프 없음).
- 행2: `"{결과 라벨} · {formatVoltage} · {formatFanoHz}"` + lapTime 있으면 `" · {formatLapTimeSec}"` — listValue tabular. 결과 중립색.
- 행 본체 비인터랙티브(immutable — 수정 없음 R-7). 상태: normal / delete-pending(버튼 disabled).
- `useRaceDeleteFlow`: [삭제] → ConfirmDialog(§3.1) → `deleteRaceRecord(id)` → invalidate(리스트·요약). 삭제 성공 시 focus 승계(다음 행 [삭제] → 없으면 목록 h1 — CD-A5 유틸 재사용). 멱등(부재=성공 — stale 목록 자연 수렴).

### 6.3 RaceEntrySheet (신설 — BottomSheet, R-3·LD-3)

```ts
export type RaceEntryPano =
  | { kind: 'auto'; panoHz: number }       // 최신 MeasureRecord 파생(캐시 select — 전용 query 금지, AR-5)
  | { kind: 'measured'; panoHz: number }   // 왕복 복귀 갱신값(§7.2) — "방금 측정" 배지
  | { kind: 'none' }                       // 측정 기록 없음 — [입력] 비활성, [측정] 유도(SC2-A6)

interface RaceEntryDraft {
  result: RaceResult | null
  voltageRaw: string                       // VoltageStepper 원시 문자열
  lapTimeRaw: string                       // 초 단위 원시 문자열("32.45") — ms 변환은 제출 시(state-contract)
}

interface RaceEntrySheetProps {
  open: boolean
  motorName: string
  pano: RaceEntryPano
  draft: RaceEntryDraft                    // 제어형 — 왕복 복원을 위해 상위(useRaceEntry)가 소유
  onDraftChange: (patch: Partial<RaceEntryDraft>) => void
  onMeasure: () => void                    // beginRaceMeasure(motorId, draft) + navigate('/') — §7
  onSubmit: () => void
  pending: boolean                         // [입력] disabled "저장 중…" (single-flight, H-4)
  errorMessage: string | null              // 저장 실패 — 시트 내 role="alert" 배너 + 입력 유지 + [다시 저장]
  fieldErrors: Partial<Record<'result' | 'voltage' | 'lapTime', string>>
  /** 왕복 자동 복귀 직후 1회 true — sr 고지(아래) 후 상위가 해제 */
  justMeasured: boolean
  onClose: () => void
}
```
- 구성(= focus order, layout §6.3): h2 "레이스 입력 — {모터명}" → **① 파노(자동)**: 읽기전용 값 행(`formatFanoHz`, listValue) + [측정] outlined h44 / `none`이면 값 자리 "측정 기록 없음"(중립) + [측정] 유도 → **② 결과(필수)**: `SegmentControl` 2택(`RACE_RESULTS`+라벨 맵, 각 h44, aria-label "레이스 결과") — 시맨틱 색 없음(선택 표시는 라임+check, DS-A5) → **③ 전압(필수)**: `VoltageStepper` 재사용 → **④ 랩타임(옵션)**: TextField `inputmode="decimal"` suffix "s" — 검증 0 < 초 ≤ 3600·소수 ≤2자리(ms 정수 변환·상한은 SC2-A2) → **[입력]** primary(파노·결과·전압 충족 시 활성) + [취소].
- 인라인 오류 슬롯 각 필드 아래 예약(높이 고정 — 오류 등장으로 필드 이동 없어야 함: 슬롯 1줄 상시 확보).
- **왕복 SR 고지**: `justMeasured`가 true로 열리면 시트 내부 visually-hidden `role="status"`에 1회 "측정 완료 — 파노 {formatFanoHz}로 갱신되었습니다" (자동 복귀 시 폼 파노 갱신 고지 계약). 수동 복귀(취소)면 미발화(파노 원값 유지).
- 저장 성공: 시트 닫힘 + 리스트 최상단 반영(invalidate) + 토스트 "저장됨". [+]로 반복(R-4). `not-found`(모터 삭제): 시트 유지 + 오류 배너 — 상위가 목록 invalidate(§7.3의 왕복 not-found와 별개).
- 닫기(취소·ESC·backdrop): draft 파기(왕복 중이 아닐 때). confirm 없음(필드 3개 — LD-2 근거와 동일).
- 상태 전수: editing(auto/measured/none pano 변주) / validating-error / pending / submit-error / just-measured / closed.

### 6.4 ResetRecordsBlock (신설 — R-6·RV-A2·LD-5)

```ts
interface ResetRecordsBlockProps {
  motorCount: number                       // 실측 k — confirm 문구 "모터 등록 {k}대는 유지됩니다"
  onReset: () => Promise<boolean>          // resetAllRecords — true=성공(상위 토스트 "초기화되었습니다")
}
```
- `/race` 목록 **스크롤 최하단**(sectionGap 아래) — `[기록 초기화]` outlined destructive 톤(error 보더·텍스트, contained 금지) h44.
- 내부 상태 머신: `idle → confirm-open → pending → (success: 닫힘 | error: confirm-open + errorMessage "초기화하지 못했습니다 — 다시 시도해주세요")`. ConfirmDialog §3.1 [기록 초기화] copy — **범위 고지 "모터는 유지됩니다" 필수**, 초기 포커스 [취소].
- 모터 0개면 **미렌더**(상위 조건 — 초기화 대상 없음). §8 복구 패널 resetAllData(모터 포함 전체)와 진입점·문구 분리 유지.
- 상태 전수: idle / confirm-open / pending / error / hidden.

---

## 7. 레이스 [측정] 왕복 (RV-1) — `features/race-measure-handoff`

slot 구조·수명·소비 시점은 **state-contract v2 소유**(`{motorId, draft, startedAt}` 메모리 single-slot, INV-21). 본 절은 UI 계약만.

### 7.1 RaceMeasureStrip (신설)

```ts
interface RaceMeasureStripProps { motorName: string }
```
- S1 [G]와 Z1 사이 [R] 스트립: `"'{모터명}' 레이스 측정 — 수치가 안정되면 자동으로 돌아갑니다"` — `role="status"`(진입 시 1회 발화, 이후 무변경 — Z1 채널과 중복 알림 금지).
- **취소/복귀 버튼은 스트립이 아니라 Z3 슬롯**(`MeasureAction kind:'back-to-race'` — [레이스로 돌아가기] secondary): 파괴적이지 않은 단일 탈출구, 타임아웃 자동 복귀 없음(LO-7 종결 — §11). *(작업 지시의 "스트립 내 [취소하고 돌아가기]"는 layout-spec §4.1/§6.4 확정 배치를 따름 — §11 미결 D-5 참조)*
- 페이지 수명 내 등장/소멸 없음(모드 종료 = 라우트 이동) — 레이아웃 안정 계약 양립. 상태: 표시/미렌더 2종.

### 7.2 자동 확정·자동 복귀 (page 조립 계약)

1. raceReturn 모드에서 엔진 `isStable` 신호 → 그 시점 파노/rpm **스냅샷** → `collectMeasureRecord(slot.motorId, …)`. **왕복 1회당 1회 소비**(single-flight — 중복 수집 금지, RT-1).
2. 성공: `consumeRaceMeasureReturn()` → `navigate(-1)`(페이드만) → S6 mount가 슬롯 반환값으로 **시트 재오픈 + draft 복원 + `pano={kind:'measured'}` 갱신 + `justMeasured=true`**(§6.3 sr 고지) + 토스트 "'{모터명}'에 기록됨".
3. storage 실패: 복귀는 수행 — 파노 갱신+draft 복원 + **비차단 고지 "측정 이력 저장 실패"**(시트 내 배너, 성공 오표시 금지). MeasureRecord 미생성.
4. not-found(왕복 중 모터 삭제): slot clear → `/race` 복귀 + 토스트 대신 화면 상단 안내 "모터가 삭제되었습니다"(StatusBanner 아님 — 페이지 인라인 1회 알림, role=status). draft 폐기.
5. 수동 복귀([레이스로 돌아가기]·브라우저 back): `cancelRaceMeasure`가 아니라 **슬롯 생존 복귀** — S6 mount 시 슬롯 있으면 시트 재오픈+draft 복원(파노 원값), 소비(clear). 비-raceReturn 이탈(하단 탭 등): cancel + draft 소실 허용.
6. 새로고침: 슬롯 소실 — S1 일반 모드 부팅([기록] 표시), S6은 시트 닫힘(LD-2·SC2-A1).

### 7.3 왕복 모드 S1 표시 규칙

- Z3 = `back-to-race` 고정 — **어느 view-status에서도 [기록] 미렌더**(INV-21). 그 외 Z1·Z2 표시는 §2.2 동일.
- 안정 도달 불가 장기 체류: 상태 표시 그대로, 강제 복귀 없음 — [레이스로 돌아가기]가 탈출구.

---

## 8. 전역 배너·복구 (v1 계약 승계 + v2 변경분)

- `GlobalPersistenceBanner`(app): `ready(ok)` → null / `ready(recreated)` → null + **`showInfo` 1회**(RV-3 고지 — 배너 아님) / `unavailable` → StatusBanner warning(측정 가능 고지, S1 [기록] 상시 disabled) / `corrupted` → StatusBanner error + S3/S5/S6 본문 `RecoveryPanel`.
- RecoveryPanel·resetAllData copy·상태 머신 v1 그대로(§3.1 표 4행).

---

## 9. Interaction Matrix (LOCAL_DOMAIN_STATE_MODE)

canonical = IndexedDB `mml-db` v2(motors·measureRecords·raceRecords·meta) / visible = react-query 캐시(staleTime ∞ + commit 후 명시 invalidate). mutation 키 전부 stable UUID.

| View State | Action | Canonical Target | UI Result | Browser Scenario |
|---|---|---|---|---|
| S1 진입 | (자동) startCapture | 없음(비영속) | starting → measuring / awaiting-gesture(중립 1탭) / no-permission | ME-2 / D-2~5 |
| S1 measuring | [기록] 탭 | 없음(스냅샷 캡처만) | MotorPickSheet 오픈 + 스냅샷 고정 표시 | MR-2 |
| MotorPickSheet | 행 탭 | `collectMeasureRecord(motorId, snapshot)` — rolling ≤10 단일 tx | 성공: 시트 닫힘+토스트 "'{모터명}'에 기록됨" / 실패: 시트 유지+배너+재탭 / not-found: 배너+목록 갱신 | MR-1 / MR-2 / C-4′ |
| MotorPickSheet (모터 0) | [모터 등록] → 저장 | `createMotor` | 시트 교체 → 저장 성공 시 그 모터로 즉시 수집+토스트 | MR-2 |
| S1 왕복 모드 | isStable 신호 | `collectMeasureRecord`(1회) | 자동 복귀+시트 재오픈+파노 갱신+sr 고지+토스트 | RT-1 |
| S1 왕복 모드 | [레이스로 돌아가기] / back | 없음(slot 생존→소비) | 시트 재오픈+draft 복원(파노 원값) — 자동 수집 없음 | RT-2 |
| S1 왕복 중 새로고침 | — | slot 소실(메모리) | 일반 모드 부팅+[기록] 표시, draft 파기 | RT-2 |
| S3 목록 | 핸들 드래그/키보드 들기 | — (낙관 로컬) | 확장 전부 접힘 + SR announcements | SO-1 |
| S3 드롭/놓기 | `reorderMotors(orderedIds)` | 단일 tx sortOrder 재부여(INV-19) | 성공: 순서 확정 / storage 실패: 롤백+토스트 / permutation: refetch+"목록이 갱신되었습니다"+결과 폐기 | SO-1 / SO-2 |
| S3 행 본체 탭 | 확장 토글 | 없음(휘발) | 차트+기록 ≤10행+[수정][삭제] — 다중 확장 허용 | CH-1 |
| S3 확장 [수정] → 저장 | `updateMotor(id, {name?, kind?})` | 편집 2필드만 patch | 시트 닫힘+목록 갱신 / not-found: 시트 유지+오류+목록 갱신(draft 보존) | MO-1 / C-8 |
| S3 확장 [삭제] → confirm | `countRecordsByMotor`(실측) → `deleteMotorCascade` 3-store 단일 tx + compaction | n·m 분리 고지 → 성공: 목록 갱신(라우트 이동 없음)+focus 승계 / abort: 전량 잔존+dialog 오류 | CC-1 |
| S5 목록 | 행 탭 | — | `/race/:motorId` push | RA-1 |
| S5 하단 | [기록 초기화] → confirm | `resetAllRecords` 2-store clear 단일 tx | 모터·sortOrder 불변, 요약 "레이스 기록 없음" 수렴+토스트 / abort: 두 store 전량 잔존 | RS-1 |
| S6 | [+ 입력] → [입력] | `createRaceRecord` (FK 동일 tx) | pending "저장 중…" → 성공: 닫힘+최상단 반영+토스트 / 실패: 입력 유지+배너+[다시 저장] | RC-1 |
| S6 파노 없음 | — | — | [입력] 비활성 + "측정 기록 없음" + [측정] 유도 | RC-1(SC2-A6) |
| S6 | [측정] | `beginRaceMeasure(motorId, draft)` slot | S1 왕복 모드 진입([기록] 0개) | RT-1 |
| S6 행 [삭제] → confirm | `deleteRaceRecord(id)` | 리스트·S5 요약 즉시 반영, 멱등 / 취소 무변경 | RC-2 |
| S6 딥링크 미존재 id | `getMotorById` → undefined | — | in-place not-found + [레이스 목록으로] | RA-1 |
| 전 목록 | 읽기 실패 | query throw | 해당 영역만 오류 블록+[다시 시도](명시 refetch) — 빈 목록 위장 금지 | D-10 |
| 부팅 | 구버전 DB | drop 후 v2 재생성 | `showInfo` 1회 — 오류 표시 없음 | C-6′ |
| 부팅 corrupt | — | — | 배너+RecoveryPanel → resetAllData confirm | C-9′ |

필터·검색·가상화·다중 선택 없음(N/A 근거·재검증 조건은 state-contract §Verification Matrix 준거).

---

## 10. 반응형·a11y 컴포넌트 계약 요약 (QA gate 대상)

- 320px/400% zoom: 종류 9택 3열 유지(2줄 wrap·셀 min-h 44) · 파노 clamp 하한 64px · 차트 width 100% 축소 · 가로 스크롤 0.
- 키보드: DnD 재정렬 키보드 경로(§5.1) **필수 게이트** · 시트 3종 focus trap+트리거 복귀 · 시트 교체 시 focus 규칙(§3.2) · 슬롯 교체 focus 승계(§2.7) · confirm 초기 포커스 [취소].
- SR: S1 단일 채널(§2.6) + 왕복 스트립 1회(§7.1) + 왕복 복귀 시트 고지 1회(§6.3) + DnD announcements(§5.1) — 그 외 live 영역 금지.
- 색 단독 구분 금지: 상태 3요소(라벨+아이콘+bg) · 결과/종류 중립색 · 선택 표시 3중(라임+w800+check) · destructive는 문구+confirm.
- 모션: 펄스·아크·페이드·시트·press scale·DnD 드롭 전부 reduced-motion 0ms/정적.
- 고정 높이: S1 존 3종 · 목록 행 56 · 차트 160 · 인라인 오류 슬롯 상시 1줄(§6.3).

---

## 11. 미결·정합 대장

### 11.1 문서 간 불일치 — Phase 3 전 정합 필요 (owner 병기)

| ID | 항목 | 본 문서 baseline | 정합 대상 |
|---|---|---|---|
| D-1 | `countRecordsByMotor` 반환: state-contract `{measureCount, raceCount}` vs api-schema `number`(합산) | **분리 반환 채택** — cascade confirm이 측정 n·레이스 m 분리 고지(layout §5.4) | api-schema §0/§5 1행 수정 (entity-query-builder 전 확정) |
| D-2 | 요약 query 명칭: state-contract `listRaceMotorSummaries` vs api-schema `listMotorSummaries`+`motorKeys.summaries()` | **api-schema 명칭 채택**(빌더 입력 문서) | state-contract 표기 정리 |
| D-3 | `deleteMotorCascade` 반환: `{deletedMeasureCount, deletedRaceCount}` vs `{deletedRecordCount}` | UI는 미소비(confirm은 사전 실측) — 어느 쪽이든 무영향, **api-schema 형 채택** | 기록만 |
| D-4 | cascade confirm 문구: brief "기록 n건 유지" vs layout n·m 분리 | **layout 분리 문구**(범위에 레이스 포함 명시 — brief 의도 충족) | 사용자 체크포인트에서 이의 시 합산 1문구로 롤백(copy 1곳) |
| D-5 | RaceMeasureStrip 취소 버튼 위치: 작업 지시(스트립 내) vs layout §4.1(Z3 슬롯) | **Z3 슬롯 [레이스로 돌아가기]**(고정 높이 계약·단일 액션 존 유지) | 이의 시 스트립에 이동(strip에 onCancel prop 추가 — 1컴포넌트) |
| D-6 | IDB store 명명: state-contract `measureRecords` vs api-schema `measure-records` | 구현 상수 1곳(`shared/lib/persistence/schema`) — UI 무관 | persistence 빌더가 확정 |

### 11.2 판정 완료 (본 문서 종결)

| ID | 판정 | 근거 |
|---|---|---|
| LO-5 | S3 인라인 확장 **다중 허용** 확정 | 모터 간 비교가 목록 핵심 용도 — 단일 강제 시 왕복 비용 증가(§5.1) |
| LO-7 | 왕복 장기 체류 타임아웃 **없음** 확정 | 자동 이동은 예측 불가성 추가 — [레이스로 돌아가기] 단일 탈출구(§7.3) |

### 11.3 ASSUMPTION (검토 시 이의 없으면 유지)

| ID | 내용 | 되돌리기 |
|---|---|---|
| CD2-A1 | 확장 기록 리스트 정렬 = **measuredAt asc(오래된 순 01~)** — 차트 X축과 시각 일치(layout §5.1 도면 준거). state-contract "최신순" 표기와 상충 | 최신순 요구 시 리스트만 역순+인덱스 역부여(차트 무변경) |
| CD2-A2 | `PanoLineChart`·`MotorRow` 배치 = `features/motor-management/ui`(소비처 1곳 — entities/measure-record/ui 승격 안 함) | 소비처 2곳 발생 시 entity ui 승격 |
| CD2-A3 | MotorKindSelect = MUI exclusive ToggleButtonGroup(`aria-pressed`) — radiogroup 커스텀 대신 테마 정합 우선 | SR 혼선 보고 시 radio 시맨틱 재구현 |
| CD2-A4 | 랩타임 UI 검증 = 0 < 초 ≤ 3600·소수 ≤2자리 → 제출 시 `Math.round(초×1000)` ms (SC2-A2 정합) | 상수 1곳 |
| CD2-A5 | 왕복 not-found 복귀 고지 = `/race` 페이지 인라인 role=status 1회(토스트 아님 — 오류성 정보) | 토스트 정보 톤으로 변경 가능(copy 1곳) |
| CD2-A6 | RecordButton 스냅샷 소유 = `useCollectFlow`(버튼은 onPress만) — 표시-기록 일치는 시트 스냅샷 행이 보장 | — |
| CD2-A7 | DnD PointerSensor activationConstraint `{distance: 8}` — 핸들 전용이지만 스크롤 오발동 방어 | 실기기 확인 후 조정(상수 1곳) |
| CD-A1·A3·A5 (승계) | live debounce 1s / 권한 영구 승격 휴리스틱 / confirm focus 승계 유틸 | v1 그대로 |

### 11.4 사용자 확인 대상 (체크포인트)

- 종류 9종 **한국어 라벨**(130·아토믹튠·…·마하대시) 노출 확인 — 변경 시 `MOTOR_KIND_LABELS` 1곳.
- D-4 cascade confirm 분리 문구 / LD-5 [기록 초기화] 위치(LO-8) — layout 승계 항목 재확인.
- RV-4 채택 확인(Oxanium·페이드 ON) — 이의 시 각 1곳 롤백(design-system §3.6·§6).
