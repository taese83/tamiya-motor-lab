# Component Spec — minicar-motor-lab

> Phase 2 Wave 2 산출물 (component-designer).
> 입력: `design-system.md`(상태 6종 토큰·수치 타이포·theme — canonical) · `layout-spec.md`(S1 3단 골격 Z1/Z2/Z3·슬롯 계약·route meta — canonical) · `project-brief.md`(§component-designer, F10) · `ux-brief.md`(§5 상태 표·§6 matrix·§7 플로우) · `checkpoint-phase1.md`(CP-1/CP-1a·CP-3·F-1·F-2) · `plan-review.md`(F-1/F-2) · `analysis-algorithm.md`(§1 출력 계약: 파노 Hz 소수 1자리·RPM 정수·confidence UI 비노출·status 6종).
> **미참조**: `state-contract.md` · `api-schema.md` — 본 wave 병렬 작성 중으로 존재하지 않아 읽지 못함. 스키마·command 관련 계약은 checkpoint-phase1 + plan-review 기준으로 작성했고, 정합 필요 항목을 §7.1에 전수 나열했다(해당 wave 산출 후 상호 검증 필수).
> 소비자: state-contract-designer(§7.1 정합) · Phase 3 component-builder / feature-builder / app-shell-builder.

---

## 0. 재사용 원칙 (변경 금지)

1. **MUI 기본 우선** — 커스텀 컴포넌트는 본 문서 §1 인벤토리가 전부다. **새 컴포넌트 발명 금지.** 필요해 보이면 MUI 조합 또는 기존 킷 props 확장으로 해결하고, 불가하면 spec 개정을 먼저 한다.
2. **스타일 규칙**: theme(§design-system §8)·export 토큰(`measureStatusTokens`·`numericTypography`·`layoutTokens`·`motionTokens`) 경유만 허용. 컴포넌트에서 hex 직접 사용 금지. sx 사용 시 공개 slot/`classes`/theme API 우선 — MUI generated class substring selector(`.MuiButton-root > div` 류) 금지.
3. **boolean prop 조합 금지 원칙**: 상태가 3개 이상 분기하면 명시적 discriminated union(예: `MeasureView`, `MeasurementFillState`)으로 설계한다.
4. **접근성 공통**: 모든 인터랙티브 요소 44×44px 이상(theme 오버라이드가 기본 보장), 아이콘 `aria-hidden="true"` + 병행 텍스트, focus ring은 전역 outline(개별 컴포넌트에서 outline 제거 금지), 색 단독 상태 구분 금지.
5. **명명 정합 (design-system §9 ↔ 본 문서 — 본 문서가 최종 export 명 확정)**:

| design-system §9 | 본 문서 확정 명 | 사유 |
|---|---|---|
| StatusLabel | **MeasureStatusLabel** | `MeasureStatus` enum 결속을 이름에 명시 (범용 라벨로 오용 방지) |
| BigNumber | BigNumber (동일) | — |
| 측정값 카드 | **MeasurementFillBlock** | 두 모드(자동 채움/직접 입력) 캡슐임을 명시 |
| SegmentControl | SegmentControl + 도메인 바인딩 **ResultSegment**·**GradeSegment** | 도메인 enum·라벨 맵을 `shared/config` 1곳에 결속 |
| 만족 토글(feature 조립) | **SatisfiedToggle** — 컨트롤 자체는 shared/ui로 승격 | F10 킷 요구. 폼 행 조립은 여전히 feature 소유 |
| 전역 상태 배너 | **StatusBanner**(프리젠테이션) + `app/ui/GlobalPersistenceBanner`(조립) | 표시/판정 분리 |
| (layout-spec §8 복구 패널) | **RecoveryPanel** | resetAllData 유일 진입점 캡슐 |

---

## 1. FSD 소유권 & Public API

의존 방향 app→pages→features→entities→shared. feature 간 직접 import 금지 — 측정→기록 handoff는 `entities/measurement` 경유.

### 1.1 shared/ui — F10 공용 킷 (12 slice / 15 export)

| 컴포넌트 (export) | slice 경로 | MUI 기반 | 용도 / 소비 화면 | REQ |
|---|---|---|---|---|
| `MeasureStatusLabel` | `shared/ui/measure-status-label` | 커스텀 (Box+SVG+펄스 점) | S1 Z1 — 라벨+색+아이콘 3요소 캡슐 + sr 알림 단일 채널 | REQ-NFR-003, REQ-ST-001~004 |
| `BigNumber` | `shared/ui/big-number` | 커스텀 (Box) | S1 수치 행·S5 추천 범위 — tabular-nums, "—" placeholder | REQ-F-002/006 |
| `SegmentControl`, `ResultSegment`, `GradeSegment` | `shared/ui/segment-control` | ToggleButtonGroup | S2 주행 결과 3택 / 모터 시트 등급 4택 | REQ-F-003/004 |
| `VoltageStepper` | `shared/ui/voltage-stepper` | OutlinedInput+IconButton×2 | S2 세팅 전압 (A5) | REQ-F-004 |
| `SatisfiedToggle` | `shared/ui/satisfied-toggle` | Switch `color="success"` | S2 만족 토글 | REQ-F-004/006 |
| `ConfirmDialog` | `shared/ui/confirm-dialog` | Dialog | destructive 계약 3소비자(기록 삭제·cascade·resetAllData) | REQ-ST-007, F-1 |
| `ToastHost`, `useToast` | `shared/ui/toast` | Snackbar | 성공 확인 전용("저장됨") — 오류 Toast 금지 | REQ-ST-005 |
| `BottomSheet` | `shared/ui/bottom-sheet` | Drawer anchor=bottom | 모터 등록/수정 시트 컨테이너 | REQ-F-003 |
| `StatusBanner` | `shared/ui/status-banner` | Alert | 전역 배너(unavailable/corrupt) 프리젠테이션 | REQ-ST-005 |
| `EmptyState` | `shared/ui/empty-state` | 커스텀 (Box+Button) | S3/S4/S5 빈 상태·in-place not-found | REQ-F-005 |
| `RecoveryPanel` | `shared/ui/recovery-panel` | 커스텀 (Paper+Button+ConfirmDialog) | corrupt 시 본문 대체 — **resetAllData 유일 진입점** | REQ-F-007, F-1 |
| `PageHeader` | `shared/ui/page-header` | 커스텀 (Box+IconButton) | 전 화면 헤더 [H] | REQ-NFR-002/003 |

각 slice는 `index.ts`에서 컴포넌트+Props 타입만 export. 내부 구현(스타일 상수·서브 컴포넌트)은 비공개.

### 1.2 entities UI (2 slice / 4 export)

| 컴포넌트 | slice | 용도 | REQ |
|---|---|---|---|
| `MotorListItem` | `entities/motor/ui` | S3 모터 카드 행 (요약 뷰모델 표시 전용) | REQ-F-005 |
| `MotorRadioList` | `entities/motor/ui` | S2·S5 공통 모터 선택 라디오 (최근 사용순은 데이터 계층 소관) | REQ-F-004/006 |
| `GradeChip` | `entities/motor/ui` | 등급 표시 outlined Chip — 중립색, 가치판단 색 금지 (DS §4) | CP-1 |
| `RecordRow` | `entities/run-record/ui` | S4 기록 행·S5 근거 목록 공용 (텍스트 1~2줄, immutable) | REQ-F-005/009 |

### 1.3 features UI (4 slice / 7 export + 조립 훅)

| 컴포넌트/훅 | slice | 역할 | REQ |
|---|---|---|---|
| `MeasureFigures` | `features/measure-session/ui` | S1 Z2 수치 존 — 6-status 내용 매핑, 높이 고정 | REQ-F-002, REQ-ST-001~004 |
| `MeasureActionDock` | `features/measure-session/ui` | S1 Z3 슬롯 [A]/[B] — 상태별 버튼 교체 | 〃 |
| `useMeasureView`, actions | `features/measure-session/model` | zustand store — 6-status 상태 머신 + view 셀렉터 | REQ-F-001, REQ-ST-001~004 |
| `MeasurementFillBlock` | `features/record-entry/ui` | S2 측정값 카드 — filled/empty 2모드 | REQ-F-008, UX-A3 |
| `RecordEntryForm` | `features/record-entry/ui` | S2 폼 5항목 조립 루트 + 저장 도크 + 검증 | REQ-F-004, REQ-ST-005 |
| `MotorFormSheet` | `features/motor-management/ui` | 모터 등록/수정 시트 (BottomSheet 소비) | REQ-F-003, C-7 |
| `useMotorDeleteFlow`, `useRecordDeleteFlow` | `features/motor-management/model` | ConfirmDialog 조립 훅 — count 조회→confirm→command (새 컴포넌트 아님) | REQ-ST-007, CP-3 |
| `GuideResult`, `GuideInsufficient` | `features/voltage-guide/ui` | S5 추천 결과 / 부족 안내 | REQ-F-006, REQ-ST-006 |

### 1.4 pages / app (조립 전용 — 신규 커스텀 UI 금지)

| 모듈 | 조립 내용 |
|---|---|
| `pages/measure` | `useMeasureView` 구독 → `MeasureStatusLabel`+`MeasureFigures`+`MeasureActionDock` 3존 렌더. CTA 탭 시 `entities/measurement.setConfirmedMeasurement` + `navigate('/record/new')` |
| `pages/record-new` | `PageHeader`(←) + `RecordEntryForm`. 진입 시 `takeConfirmedMeasurement()` 1회 소비 → `initialMeasurement` 주입. 저장 성공 시 pop(+딥링크면 `/motors` replace)+`useToast` |
| `pages/motors` | `PageHeader`+`MotorListItem` 목록+`EmptyState`+`MotorFormSheet` 오케스트레이션. corrupt면 본문=`RecoveryPanel` |
| `pages/motor-detail` | `PageHeader`(←/수정/삭제)+요약 행+`RecordRow` 목록+`useMotorDeleteFlow`/`useRecordDeleteFlow`+in-place not-found(`EmptyState`) |
| `pages/guide` | `MotorRadioList`+`GuideResult`/`GuideInsufficient`/`EmptyState` |
| `app/ui/BottomTabBar` | BottomNavigation ×3 — 아이콘+라벨 상시, `aria-current="page"`, handle.tab 활성 |
| `app/ui/GlobalPersistenceBanner` | `initPersistence` 3-상태 → `StatusBanner` 조립 ('ready'면 null) |
| `app/layouts/RootErrorFallback` | 렌더 crash 전용 — h1 "문제가 발생했습니다"+[새로고침] |

### 1.5 shared/lib 표시 계약 (컴포넌트 아님 — 소비 필수)

| 유틸 | 경로 | 계약 (DS §3.3) |
|---|---|---|
| `formatRpm(n)` → `"18,540"` | `shared/lib/format` | 정수·천단위 `Intl.NumberFormat('ko-KR')` |
| `formatFanoHz(n)` → `"309.0 Hz"` | 〃 | 소수 1자리 고정 |
| `formatVoltage(v)` / `formatVoltageRange(a,b)` → `"2.8 V"` / `"2.8 ~ 3.0 V"` | 〃 | 소수 1자리 표시 (입력 허용은 ≤2자리 — A5) |
| `EM_DASH = '—'` | 〃 | 값 없음 placeholder — 0·빈문자열·이전 값 금지 |
| `RUN_RESULTS`+라벨 맵(D4) · `MOTOR_GRADES`+라벨 맵(CP-1a) · `VOLTAGE_RANGE`(A5) · `GUIDE_MIN_SATISFIED`(D1) | `shared/config` | 도메인 상수 1곳 — 컴포넌트는 이 상수만 참조(하드코딩 금지) |

---

## 2. S1 측정 화면 컴포넌트 (최중요)

### 2.1 MeasureView 모델 — 상태 머신 소유

status enum(`idle · measuring · stable · weak-signal · no-permission · suspended`)의 **원천 분리** (feature-plan 계약):
- **엔진 상태 3종** `measuring · stable · weak-signal` — 분석 엔진 `track` 출력(Worker 메시지)이 산출. `features/measure-session` zustand store가 수신·반영.
- **세션 상태 3종** `idle · no-permission · suspended` — 같은 store 내 세션 상태 머신(getUserMedia/AudioContext 수명)이 소유.

store는 두 원천을 병합해 **단일 discriminated union**으로 UI에 노출한다. UI 컴포넌트 3종은 이 union만 받는 순수 렌더러다(store 직접 구독은 `pages/measure`만).

```ts
// features/measure-session/model/view.ts — UI 계약 (MeasureStatus enum 자체는 shared 소유, §7.1-1)
export type MeasureView =
  | { status: 'idle'; secureContext: boolean; activating: boolean } // activating: getUserMedia 대기 <1s
  | { status: 'measuring'; rpm: number; fanoHz: number }            // 실시간 갱신 ≥10Hz
  | { status: 'weak-signal' }                                       // 수치 없음 — 타입으로 강제 (REQ-ST-003)
  | { status: 'stable'; rpm: number; fanoHz: number }               // 확정 잠금 — 이후 불변
  | { status: 'no-permission'; permanent: boolean; settingsHelpOpen: boolean } // F-2
  | { status: 'suspended' }

export function useMeasureView(): MeasureView // 셀렉터 훅 (public API)
```

`confidence`는 view에 포함하지 않는다 — UI 비노출 확정(analysis-algorithm §1, ux-brief §5).

**전이 표** (가드는 순수 함수로 분리 — unit 테스트 대상):

| 현재 | 이벤트 | 다음 | 원천 |
|---|---|---|---|
| idle | `startCapture` 탭 → 성공 | measuring | 세션 (`activating` true→false 경유, <1s) |
| idle | `startCapture` → NotAllowedError | no-permission (`permanent`는 아래 F-2 판정) | 세션 |
| idle | `startCapture` → AudioContext `state!=='running'` | suspended | 세션 |
| measuring | 엔진 게이트 미달 프레임 | weak-signal | 엔진 |
| weak-signal | 엔진 게이트 회복 | measuring (자동 왕복 D-9 — 버튼 불변) | 엔진 |
| measuring | 엔진 안정 판정 (1.5s 창 CV<1.5%) | stable + **캡처 자동 정지** (UX-A1) | 엔진→세션 |
| measuring / weak-signal | [측정 중지] · 라우트 이탈 · `visibilitychange: hidden` | idle (`stopCapture`) — UX-A2 | 세션 |
| stable | [다시 측정] | 새 세션 `startCapture` → measuring (기존 확정 slot clear — §7.1-4) | 세션 |
| stable | 탭 전환 후 복귀 | stable 유지 (캡처 이미 정지 — 메모리 세션 내). 새로고침이면 idle | 세션 |
| no-permission (일시) | [권한 다시 요청] 성공 | measuring | 세션 |
| no-permission (일시) | 재요청 즉시 실패 반복 | no-permission `permanent: true` 승격 | 세션 (F-2) |
| suspended | [탭하여 다시 시작] `resume()` 성공 | measuring | 세션 |
| suspended | `resume()` 실패 | suspended 유지 (버튼 유지 — 복구 버튼 상시 원칙) | 세션 |

**F-2 권한 일시/영구 감지 전략** (checkpoint 지시 — UI 계약은 `permanent: boolean` 하나로 흡수):
1. `navigator.permissions.query({ name: 'microphone' })` 가용 시: `state === 'denied'` → `permanent: true`. `prompt` → 일시.
2. 미가용/실패(iOS Safari fallback): 첫 NotAllowedError는 일시. **[권한 다시 요청]이 OS 프롬프트 없이 즉시(<300ms) NotAllowedError로 재실패하면 영구로 승격**(프롬프트가 떴다면 사용자 응답 시간이 걸린다는 휴리스틱). 판정 함수는 store 내 순수 함수 — 실동작은 실기기 세션(D-3)에서 검증, 문구만 바뀌므로 오판 피해는 안내 문구 수준.

### 2.2 6-status × 컴포넌트 props 매핑 (골격 불변 — layout-spec §4.2와 1:1)

| view | Z1 `MeasureStatusLabel` | Z2 `MeasureFigures` | Z3-[A] | Z3-[B] |
|---|---|---|---|---|
| `idle` (secure) | status=idle → "측정 대기"+`mic` | 안내 1줄 수직 중앙: "모터를 공회전시키고 폰을 가까이 대세요" | [녹음 활성화] primary L(56px)+`mic` → `onActivate` | 빈 슬롯(높이 예약) |
| `idle` `secureContext:false` | 〃 | "HTTPS에서만 측정할 수 있습니다" (권한 문구와 혼용 금지 — REQ-ST-002) | [녹음 활성화] **disabled** | 빈 슬롯 |
| `idle` `activating:true` | 〃 | 안내 유지 | [마이크 준비 중…] disabled | 빈 슬롯 |
| `measuring` | "측정 중"+펄스 점(blue700) | ①`formatRpm` gray600 ②"RPM" ③`formatFanoHz` ④⑤ 빈 줄 유지 | [측정 중지] secondary(44px, 슬롯 [A] 점유) → `onStop` | 빈 슬롯 |
| `weak-signal` | "신호 약함"+`signal-low`(amber800), bg amber50 | ① "—"(rpmValue 타이포 동일 행) ②③ 빈 값 ④ "신호가 약합니다. 모터에 더 가까이 대세요" | [측정 중지] — measuring과 **동일 버튼·동일 위치** (D-9 왕복 시 불변) | 빈 슬롯 |
| `stable` | "측정 완료 · 확정"+`lock`(blue900) | ①`formatRpm` **gray900** ②"RPM" ③파노 — bg white→blue50 tint 1회(400ms, reduced-motion 0ms), 이후 갱신 없음 | **[이 측정으로 기록 만들기]** primary L → `onCreateRecord` | **[다시 측정]** secondary(44px) → `onRemeasure` |
| `no-permission` `permanent:false` | "마이크 권한 필요"+`mic-off`(red800), bg red50 | "마이크 권한이 거부되었습니다" | **[권한 다시 요청]** primary L → `onRetryPermission` | 빈 슬롯 |
| `no-permission` `permanent:true` | 〃 | "브라우저 설정에서 마이크 권한을 허용해야 합니다" + 설정 경로 Collapse(Z2 내부 스크롤 — 높이 불변) | **[설정 방법 보기]** primary L, `aria-expanded` → `onToggleSettingsHelp` | 빈 슬롯 |
| `suspended` | "오디오 일시 중지됨"+`pause`(gray700), bg gray100 | "iOS 정책으로 오디오가 중지되었습니다" | **[탭하여 다시 시작]** primary L → `onResume` (탭 핸들러 내 `resume()`) | 빈 슬롯 |

모든 상태에서 primary 버튼 정확히 1개(ux-brief §9). 6-status 어느 전환에서도 존 높이·위치 불변(layout-spec §4.1).

### 2.3 MeasureStatusLabel — `shared/ui/measure-status-label`

```ts
import type { MeasureStatus } from '@/shared/config' // state-contract 확정 대상 (§7.1-1)

interface MeasureStatusLabelProps {
  status: MeasureStatus
  /** 상태 전이 시에만 갱신되는 sr 알림 문구 — §2.6 문구 표. 수치 갱신으로 변경 금지 */
  announcement: string
}
```

- 렌더: `measureStatusTokens[status]`의 `fg`+`icon`을 라벨 텍스트와 **항상 3요소 동시** 렌더(아이콘 없는 사용 금지 — DS §2 규칙 1). 라벨 문구는 DS §2 표(“측정 대기” 등)를 내부 상수로 소유.
- `measuring` 펄스 점: 아이콘이 아니라 CSS 원 + `motionTokens.pulsePeriodMs` 애니메이션. `prefers-reduced-motion`이면 정지 점. `aria-hidden="true"`.
- **sr 알림 단일 채널**: 시각 라벨은 live 속성 없음(중복 알림 금지 — layout-spec §10). 내부 visually-hidden `<div role="status">`(암시 aria-live=polite)에 `announcement`만 렌더. `role="status"`는 이 hidden 영역에만 부여한다 — layout-spec §4.1 Z1 서술의 구체화.
- 높이 48px 고정(Z1 계약 — rem 기반).
- 상태: props 순수 렌더 — 내부 상태 없음.

### 2.4 MeasureFigures — `features/measure-session/ui`

```ts
interface MeasureFiguresProps {
  view: MeasureView
}
```

- **높이 고정 소유**: Z2 컨테이너에 `--s1-figure-h`(layout-spec §4.1 baseline, `layoutTokens.measureValueMinHeight` 토큰과 동기) 적용 — min/max 동일. 6-status 전부 동일 높이. BigNumber 자체는 높이를 갖지 않는다(§3.8 — DS §9의 "BigNumber 고정 높이"를 존 소유로 구체화, layout-spec §4.1 우선).
- 내부 5행 슬롯(①RPM 대형 ②단위 "RPM" ③파노 ④⑤보조 2줄) — 수치 없는 상태는 안내 문구 수직 중앙, 빈 행도 높이 유지.
- 토큰 소비: `measureStatusTokens[status]`의 `bg`(존 배경)·`valueFg`(수치/— 색). fg·icon은 MeasureStatusLabel 소비 — **measureStatusTokens 소비자는 이 2개 컴포넌트뿐**(DS §9 "유일 소비자"의 구체화, 그 외 소비 금지).
- 수치 렌더: `BigNumber size="rpm"`(①)+`size="fano"`(③), 값은 `formatRpm`/`formatFanoHz` 경유. `weak-signal`은 `BigNumber value={null}` → "—"(동일 rpmValue 타이포 — 높이 동일) + sr 텍스트 "측정값 없음".
- stable 진입: 배경 tint 전환 1회(`motionTokens.stableTransitionMs`, 반복 금지, reduced-motion 0ms). 수치 색 gray600→gray900 전환.
- **aria-live 없음** — 실시간 수치 갱신(≥10Hz)은 절대 announce하지 않는다(§2.6). 영역 전체는 일반 텍스트로 SR 탐색 가능.
- no-permission 영구: 설정 경로 안내 MUI `Collapse` — 펼침 콘텐츠는 Z2 내부 `overflow-y:auto`(높이 불변). 콘텐츠 id는 dock 버튼의 `aria-controls`와 연결.
- 상태: props 순수 렌더. loading/empty/error 별도 없음 — 6-status 매핑이 전부.

### 2.5 MeasureActionDock — `features/measure-session/ui`

```ts
interface MeasureActionDockProps {
  view: MeasureView
  onActivate: () => void            // idle → startCapture (탭 핸들러 내 getUserMedia+resume — REQ-F-001)
  onStop: () => void                // measuring | weak-signal → stopCapture
  onCreateRecord: () => void        // stable → page가 handoff set + navigate
  onRemeasure: () => void           // stable → 새 세션
  onRetryPermission: () => void     // no-permission 일시
  onToggleSettingsHelp: () => void  // no-permission 영구 — view.settingsHelpOpen 토글
  onResume: () => void              // suspended — 탭 핸들러 내 resume()
}
```

- 구조: 슬롯 [A](h56, primary 위치)+[B](h44) — 빈 상태여도 높이 예약(투명 placeholder). 슬롯 내용은 §2.2 표가 유일한 가변 요소.
- 버튼 매핑: [A] primary는 `Button variant="contained" size="large" fullWidth`, [측정 중지]는 `variant="outlined"`(secondary 스타일이지만 [A] 슬롯 점유), [B] [다시 측정]은 `variant="text"` h44.
- disabled 계약: `idle+!secureContext` → [녹음 활성화] disabled(`aria-disabled`, 사유는 Z2 안내가 전달). `activating` → disabled+"마이크 준비 중…" 라벨 교체(스피너 없음 — <1s).
- **stable 전환 오탭 가드 — LO-3 판정: 가드 없음 확정.** 근거: UX-A1로 stable 진입 시점에 캡처가 이미 정지되어 [측정 중지]의 의도는 시스템이 수행 완료 — 오탭 최악 피해는 S2 진입 후 뒤로가기 1회. 입력 무시 window는 의도된 빠른 CTA 탭(핵심 여정 2, 6탭 목표)을 지연시켜 손해가 더 크다.
- 키보드: 전 버튼 tab 도달, 슬롯 교체 시 포커스가 사라지는 요소에 있었으면 [A] 슬롯의 새 버튼으로 이동시키지 않고 **document body로 자연 이탈 허용 안 함** — 교체 직전 포커스가 [A] 내부였다면 새 [A] 버튼으로 programmatic focus 이동(키보드 사용자 연속 조작 보장).

### 2.6 aria-live 계약 (S1 단일 채널)

**원칙**: ① 알림 채널은 MeasureStatusLabel 내부 hidden `role="status"` 1곳뿐 — 다른 어떤 S1 요소도 live 속성 금지. ② **수치 갱신은 억제** — measuring 중 rpm/fano 텍스트 변경은 live 영역 밖에서만 일어난다. ③ **상태 전환만 announce** — `announcement` prop은 전이 시점에만 새 문자열로 교체.

| 전이 도착 상태 | announcement 문구 | 발화 시점 |
|---|---|---|
| measuring | `"측정 중"` | 즉시. 단 weak-signal→measuring 자동 복귀는 1s debounce |
| weak-signal | `"신호가 약합니다. 모터에 더 가까이 대세요"` | measuring→weak-signal은 1s debounce(왕복 스팸 방지 — D-9) |
| stable | `"측정 완료, {formatRpm(rpm)} RPM"` (예: "측정 완료, 18,540 RPM") | 즉시 |
| no-permission (일시) | `"마이크 권한이 거부되었습니다"` | 즉시 |
| no-permission (영구) | `"브라우저 설정에서 마이크 권한을 허용해야 합니다"` | 즉시 |
| suspended | `"오디오가 일시 중지되었습니다. 탭하여 다시 시작하세요"` | 즉시 |
| idle (중지·세션 종료) | `"측정 대기"` | 즉시 |

- debounce·중복 억제(직전과 동일 문구 재발화 금지)는 store 셀렉터 계층에서 구현(`buildAnnouncement(prev, next): string` 순수 함수 — unit 테스트).
- stable 문구에 수치가 포함되는 것은 전이 1회 알림이므로 "수치 갱신 억제" 원칙과 충돌하지 않는다.

---

## 3. 공용 킷 F10 상세

### 3.1 ConfirmDialog — destructive 계약 (유일한 red contained 사용처)

```ts
interface ConfirmDialogProps {
  open: boolean
  title: string                    // 질문형 1줄 — aria-labelledby
  impact: string                   // 영향 고지: 삭제 범위·건수·불가역 — aria-describedby
  confirmLabel: '삭제' | '초기화'   // destructive 액션 어휘 고정
  pending?: boolean                // command 실행 중 — 두 버튼 disabled + confirmLabel "{label} 중…"
  errorMessage?: string | null     // store-side rejection — dialog 내 인라인 Alert(error)+버튼 재활성
  onConfirm: () => void
  onCancel: () => void
}
```

**계약 (전 소비자 공통 — 위반 금지)**
1. `role="alertdialog"` `aria-modal="true"`, `aria-labelledby`=title, `aria-describedby`=impact.
2. 버튼 순서: **[취소](좌, `variant="text"`) → [삭제/초기화](우, `color="error" variant="contained"` — 흰 글자 5.6:1)**.
3. **초기 포커스 = [취소]** (Enter 오폭 방지). focus trap(MUI 기본). ESC/backdrop = onCancel. `pending` 중에는 ESC·backdrop 닫기 차단.
4. 닫힘 후 포커스는 트리거 요소로 복귀(MUI 기본). **트리거가 소멸한 경우**(삭제 성공으로 행 제거): 다음 행의 [삭제] 버튼 → 없으면 목록 섹션 heading으로 programmatic 이동.
5. `errorMessage` 표시 시 `role="alert"` 인라인 Alert — dialog는 열린 채 유지, [삭제] 재활성(재시도 가능), 성공 위장 금지.
6. red contained 버튼은 이 dialog 계약 밖에서 사용 금지(DS §4).

**소비자 3곳 — copy 고정** (n은 `countRecordsByMotor` 실측, dialog 열기 전에 조회 완료 — dialog 내 loading 없음):

| 소비자 | title | impact | confirmLabel |
|---|---|---|---|
| 기록 삭제 (S4) | "이 기록을 삭제할까요?" | "되돌릴 수 없습니다." | 삭제 |
| 모터 cascade (S4, CP-3) | "'{모터명}' 모터를 삭제할까요?" | n≥1: "'{모터명}'과 기록 {n}건이 함께 삭제됩니다. 되돌릴 수 없습니다." / n=0: "'{모터명}'이(가) 삭제됩니다. 되돌릴 수 없습니다." | 삭제 |
| resetAllData (RecoveryPanel, F-1) | "모든 데이터를 초기화할까요?" | "모든 모터와 기록이 삭제되며 되돌릴 수 없습니다." | 초기화 |

count 조회 자체가 실패하면 dialog를 열지 않고 트리거 인근 인라인 오류 "삭제 대상을 확인하지 못했습니다"+[다시 시도].

### 3.2 VoltageStepper

```ts
interface VoltageStepperProps {
  value: string                     // 원시 입력 문자열 (제어형 — 빈 문자열 허용)
  onChange: (raw: string) => void   // 타이핑·스텝 공통. 검증은 zod 스키마 공유 (UI+command 이중)
  error?: string | null             // 인라인 오류 슬롯 — 필드 아래 고정 위치
  disabled?: boolean
}
```

- 구조: `[−] [OutlinedInput inputmode="decimal"] V [+]`. ± 버튼 각 **48×48**(44 하한 초과), input은 `type="text" inputmode="decimal"`.
- 스텝: ±0.1V. 동작 = parse → `VOLTAGE_RANGE`(0.1~9.9, A5) clamp → `toFixed(1)` 문자열로 `onChange`. 경계 도달 시 해당 버튼 disabled(+진행 중 반복 정지).
- **빈 값에서 ± 는 no-op**(disabled 시각) — 숫자 입력 후 미세조정이 기본 흐름. 초기 기본값은 빈 문자열(스테퍼 기본값·범위 조정은 ux-brief §14-5 실사용 확인 후 — 상수 1곳).
- **롱프레스 반복**: pointerdown 400ms 유지 후 100ms 간격 반복, pointerup/pointercancel/pointerleave/경계 도달 시 정지. 키보드: 버튼 Enter/Space 단일 스텝, input에서 ArrowUp/Down = ±0.1(포인터와 동등 조작).
- 표시 타이포: `numericTypography.listValue`(tabular-nums).
- 검증·오류: 비수치/범위 밖/소수 3자리 이상 → `error` 문구("0.1~9.9 V 범위로 입력하세요" / "숫자를 입력하세요") — `aria-describedby`로 input에 연결, `aria-invalid`. 오류 중 저장 거부는 폼(§5.2) 소관.
- a11y: 전체 `role="group"` aria-label "세팅 전압", ± 버튼 aria-label "0.1볼트 올리기"/"0.1볼트 내리기".
- 상태: normal / error / disabled. 내부 상태는 롱프레스 타이머뿐 — 값은 완전 제어형.

### 3.3 SegmentControl / ResultSegment / GradeSegment

```ts
interface SegmentOption<T extends string> { value: T; label: string }

interface SegmentControlProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>
  value: T | null
  onChange: (value: T | null) => void
  allowDeselect?: boolean       // 선택 항목 재탭 시 해제 — GradeSegment만 true
  wrap?: '2x2' | null           // 4택 320px 대응 (각 타깃 h44 유지, 줄바꿈 금지 — fontSize 13px 축소 허용)
  'aria-label': string
  error?: boolean               // 그룹 외곽 error 표시 (문구는 폼 소유)
}

// 도메인 바인딩 (shared/config 상수 1곳 결속 — 라벨 하드코딩 금지)
interface ResultSegmentProps {
  value: RunResult | null                 // 'finished' | 'course_out' | 'not_run' (D4 — 라벨 맵 교체만으로 어휘 변경)
  onChange: (value: RunResult) => void    // 필수 항목 — 해제 불가
  error?: string | null
}
interface GradeSegmentProps {
  value: MotorGrade | null                // CP-1a baseline 4단계: 신품·길들이기중·전성기·노화 (enum 값 키는 state-contract 확정)
  onChange: (value: MotorGrade | null) => void  // 선택 항목 — 재탭 해제 허용, 기본값 정책은 state-contract 소관
}
```

- MUI `ToggleButtonGroup exclusive fullWidth`(theme 기본) — native button + `aria-pressed` 시맨틱 확보.
- **선택 상태 3중 표시**: 배경 blue700 + fontWeight 700 + **`check` 아이콘 병행**(forced-colors·색각 대응 — DS §9). 선택 항목 라벨 앞 16px 아이콘, 비선택은 동일 폭 투명 placeholder(폭 흔들림 금지).
- ResultSegment: 3택 1행. 결과에 시맨틱 색 금지 — 코스아웃 red 금지(DS-A5).
- GradeSegment: 4택, 320px에서 2×2 wrap(`wrap="2x2"`), 등급에 가치판단 색 금지. **CP-1a 등급 라벨 4종은 사용자 노출 확인 대상**(§7.2).
- 상태: unselected(초기) / selected / error(그룹 red800 외곽 + 폼 오류 문구) / disabled.

### 3.4 SatisfiedToggle

```ts
interface SatisfiedToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}
```

- `FormControlLabel` + `Switch color="success"`. 라벨 "이 세팅에 만족" 상시(색·위치 단독 구분 금지).
- **success 색+아이콘 병행**: on 상태에서 라벨 옆 `star`(green800) 아이콘 표시, off는 아이콘 없음(빈 별 금지 — DS §4). 아이콘 `aria-hidden` — 상태는 switch role의 checked가 전달.
- 행 높이 ≥44px, 행 전체 탭 타깃. positive=green은 만족 전용 예약(DS §4).

### 3.5 StatusBanner

```ts
interface StatusBannerProps {
  tone: 'warning' | 'error'      // unavailable=warning(정보 지속형) / corrupt=error
  message: string
  actionLabel?: string           // corrupt: "복구 옵션"
  onAction?: () => void          // → /motors 이동 (조립부 소유)
}
```

- MUI `Alert` standard variant(amber50/red50 배경 — theme 오버라이드). `role="status"`(landmark 아님 — layout-spec §1). 닫기 버튼 없음(상태 지속형). sticky top + `--mml-safe-top` 패딩.
- 조립·판정은 `app/ui/GlobalPersistenceBanner` — `initPersistence` 결과 `'ready'`면 null, `'unavailable'` → warning "이 브라우저에서는 기록이 저장되지 않습니다 (측정은 가능)", `'corrupt'` → error "저장된 데이터를 읽을 수 없습니다"+[복구 옵션]. **부팅 시 1회 결정 — 측정 상태 전환으로 나타나거나 사라지지 않음**(S1 layout stability 전제).

### 3.6 EmptyState

```ts
interface EmptyStateProps {
  title: string                  // 예: "첫 모터를 등록하세요"
  description?: string
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
}
```

- 안내 1~2줄 `text.secondary` + primary 버튼 최대 1개. **오류로 위장 금지**(E-1) — error 색·아이콘 사용 금지.
- 소비처: S3 모터 0개 / S4 기록 0건(버튼 없음 — LO-4 baseline 유지) / S5 모터 0개 / S4 in-place not-found("모터를 찾을 수 없습니다"+[이력으로 이동]) / 클라이언트 404.

### 3.7 RecoveryPanel — resetAllData 유일 진입점 (F-1)

```ts
interface RecoveryPanelProps {
  onRetry: () => void                     // initPersistence 재시도 — 결과는 상위 persistence 상태 재렌더로 반영
  retryPending: boolean
  onResetAllData: () => Promise<boolean>  // ConfirmDialog 확인 후에만 호출. true=성공(상위가 ready 전환+토스트 "초기화되었습니다")
}
```

- 구조: h2 "데이터를 읽을 수 없습니다" + 본문 "앱은 계속 사용할 수 있지만 저장된 기록에 접근할 수 없습니다." + [다시 시도](primary h56) + [모든 데이터 초기화](secondary, `color="error" variant="outlined"` — contained는 dialog 확인 버튼 전용).
- 내부 상태 머신: `idle → confirm-open → reset-pending → (성공: 닫힘·상위 전환 | 실패: confirm-open + errorMessage "초기화하지 못했습니다 — 다시 시도해주세요")`. ConfirmDialog(§3.1 resetAllData copy) 재사용 — **동일 destructive 계약 소비**(cascade와 같은 컴포넌트·같은 규칙).
- resetAllData 진입점은 이 패널이 유일(설정 화면 없음 — layout-spec §8). 다른 어떤 컴포넌트에서도 resetAllData 호출 금지.
- 소비처: S3/S4/S5 본문 대체(corrupt). ErrorBoundary 경유 아님 — Result 값 전파(crash loop 금지).

### 3.8 BigNumber

```ts
interface BigNumberProps {
  value: string | null           // 사전 포맷 문자열(shared/lib/format 경유). null → "—" + sr-only "측정값 없음"
  unit?: string                  // "RPM" — caption·text.secondary, 수치보다 작게
  size: 'rpm' | 'fano' | 'guide' // numericTypography 토큰 1:1 (rpmValue/fanoValue/guideRange)
  valueColor?: string            // measureStatusTokens.valueFg 주입용 — 기본 text.primary
}
```

- 전 size `tabular-nums`(layout shift 금지). "—"는 `value=null`일 때 동일 타이포로 렌더 — `aria-hidden` dash + visually-hidden "측정값 없음".
- **고정 높이는 갖지 않는다** — S1 존 높이는 MeasureFigures(§2.4) 소유(DS §9 서술의 구체화 — layout-spec §4.1 `--s1-figure-h` 우선).
- 소비처: S1(Z2 내부), S5 추천 범위(`size="guide"`, `formatVoltageRange` 값).

### 3.9 Toast / BottomSheet / PageHeader

**Toast** — `useToast(): { showSuccess(message: string): void }` + `ToastHost`(app providers에 1개 mount).
- Snackbar bottom-center, 탭 바 위 offset(theme), autoHide 3000ms. **성공 확인 전용** — 오류는 인라인 Alert+재시도 버튼(성공 위장·오류 toast 금지). 소비: "저장됨"(S2·시트), "초기화되었습니다"(reset). 연속 호출은 교체(큐 없음 — 심플).

**BottomSheet**
```ts
interface BottomSheetProps { open: boolean; title: string; onClose: () => void; children: ReactNode }
```
- Drawer `anchor="bottom"`(theme: radius 16·safe-area·max-width 480 중앙). `aria-modal` + `aria-labelledby`=title(h2). focus trap, 초기 포커스는 첫 입력 필드, 닫힘 후 트리거 복귀. ESC/backdrop 닫기 — 닫기 = 폼 파기(confirm 없음, 필드 2~3개 — LO-2와 동일 원칙).

**PageHeader**
```ts
interface PageHeaderProps {
  title: string                 // h1 정확히 1개 (heading 계약)
  onBack?: () => void           // 있으면 [←] chevron-left 48×48, aria-label "뒤로"
  actions?: ReactNode           // 우측 버튼들 — 각 44×44 이상 (호출부 책임)
}
```
- h 56px, AppBar 미사용(장식 배제). title truncate. S1은 미사용(Z1이 겸함 — S1 h1은 visually-hidden "측정", `pages/measure` 소유).

---

## 4. entities UI

### 4.1 MotorListItem — `entities/motor/ui`

```ts
interface MotorSummaryView {         // listMotorSummaries 파생 뷰모델 — 영속·캐시 금지(읽기 시 계산)
  motorId: string                    // stable UUID — 이벤트는 index가 아니라 id 사용
  name: string
  gradeLabel: string | null          // shared/config 라벨 맵 통과 값
  statusMemo: string                 // '' 허용 — 빈 값이면 행 생략
  recordCount: number
  lastRecord: {
    dateLabel: string                // Intl.DateTimeFormat('ko-KR')
    voltageLabel: string             // "2.9 V"
    rpmLabel: string | null          // null = 측정값 없음 (D2)
    resultLabel: string
    satisfied: boolean
  } | null                           // 기록 0건이면 null → 행 3은 "기록 0건"만
}

interface MotorListItemProps {
  summary: MotorSummaryView
  onSelect: (motorId: string) => void   // 행 전체 탭 → /motors/:id
}
```

- `ListItemButton`(행 전체 단일 탭 타깃, min-height 56px, Paper outlined). 행 내 보조 버튼 없음(수정·삭제는 S4).
- 행 구성: ①이름+`GradeChip` ②메모 1줄 truncate(없으면 생략) ③"기록 {n}건 · 최근 {date} {voltage}" + 요약 줄. 수치는 `listValue` 타이포. 만족 최근 기록은 `star`(green800) 아이콘+sr 텍스트 "만족".
- 접근성: accessible name = "{이름}, {등급}, 기록 {n}건" 수준으로 자연 텍스트 구성(별도 aria-label 불요 — 텍스트가 곧 이름).
- 상태: props 순수 렌더. 목록 loading/empty/error는 페이지 소유(§6).

### 4.2 MotorRadioList — `entities/motor/ui`

```ts
interface MotorRadioListProps {
  motors: ReadonlyArray<{ id: string; name: string; gradeLabel: string | null }>
  value: string | null               // motorId — LO-1: S5는 미선택(null)으로 시작 확정 (§5.4)
  onChange: (motorId: string) => void
  legend: string                     // "모터 선택" — fieldset/legend 또는 radiogroup aria-label
  error?: string | null              // S2 미선택 저장 시도 — 그룹에 aria-describedby 연결
}
```

- `RadioGroup`+`FormControlLabel`+`Radio`(패딩 오버라이드로 44px 타깃). 행 높이 ≥56px, 행 전체 탭. native radio 시맨틱(키보드 화살표 이동 기본 제공).
- 정렬(최근 사용순 FP-A1)은 데이터 계층 소관 — 컴포넌트는 주어진 순서 그대로.
- error 시 그룹 외곽 error 표시 + 문구, 폼 저장 시도 시 첫 라디오로 focus 이동은 폼(§5.2) 소유.

### 4.3 GradeChip — `entities/motor/ui`

```ts
interface GradeChipProps { label: string }   // shared/config 라벨 맵 통과 값만
```

- `Chip variant="outlined" size="small"` — gray700 텍스트/gray500 테두리 중립색. 가치판단 색 금지(노화≠나쁨 — DS-A5). 표시 전용, 인터랙션 없음.

### 4.4 RecordRow — `entities/run-record/ui`

```ts
interface RecordRowView {
  id: string                         // stable UUID — 삭제 이벤트 키
  dateTimeLabel: string              // "07-25 14:02"
  voltageLabel: string
  rpmLabel: string | null            // null → "측정값 없음" 중립 문구 (D2 — 오류 아님)
  resultLabel: string
  satisfied: boolean
}

interface RecordRowProps {
  record: RecordRowView
  onDelete?: (id: string) => void    // S4에서만 전달. 미전달(S5 근거 목록) 시 삭제 버튼 미렌더
}
```

- 텍스트 1~2줄: 행1 `{dateTimeLabel}` + 만족 시 `star`(green800)+sr "만족" / 행2 `{voltage} · {rpm|측정값 없음} · {result}`(`listValue` 타이포).
- **행 자체는 비인터랙티브**(RunRecord immutable — 행 탭 액션 없음, FP-A4). [삭제]는 행 우측 **44×44 독립 타깃** IconButton(`trash`), aria-label "{dateTimeLabel} 기록 삭제" — 행 텍스트와 타깃 중첩 금지.
- 시간 역순 정렬은 데이터 계층 소관.

---

## 5. features 컴포넌트 (S2~S5)

### 5.1 MeasurementFillBlock — `features/record-entry/ui`

```ts
type MeasurementFillState =
  | { mode: 'filled'; rpm: number; fanoHz: number }   // S1 handoff take 성공
  | { mode: 'empty' }                                  // 직접 입력 / 새로고침 소실 / [비우기] 후

interface MeasurementFillBlockProps {
  state: MeasurementFillState
  onClear: () => void                // filled에서만 — empty로 전환. 폼 내 복구 불가 (slot 이미 소비)
}
```

- Paper `variant="outlined"` — **두 모드 카드 외형·높이 동일, 내용만 교체**(layout-spec §5).
- `filled`: 제목 "측정값 (읽기전용)" + `{formatRpm} RPM · {formatFanoHz}`(`listValue`) + [비우기] 텍스트 버튼(44px 타깃, aria-label "측정값 비우기"). **수치 수정 UI 없음**(UX-A3 — 입력 필드 아님, 정적 텍스트). weak-signal·미측정 값은 애초에 filled로 진입 불가(H-5 — handoff는 stable 확정값만 set).
- `empty`: 중립 문구 "측정값 없음 (직접 입력 기록)" — 오류 톤 금지(D2는 정상 경로).
- [비우기]는 즉시 적용·undo 없음(저장 전 폼 입력 조작 — destructive confirm 대상 아님). 비운 후 focus는 [비우기] 소멸로 카드 다음 필드(전압 input)로 이동.

### 5.2 RecordEntryForm — `features/record-entry/ui` (조립 루트)

```ts
interface RecordEntryFormProps {
  initialMeasurement: { rpm: number; fanoHz: number } | null  // page가 takeConfirmedMeasurement() 결과 주입
  onSaved: () => void            // 성공 시 — pop(+딥링크 replace)·토스트는 page 소유
}
```

- 폼 5항목 고정 순서(= DOM = focus order): ①`MotorRadioList`(필수) ②`MeasurementFillBlock` ③`VoltageStepper`(필수) ④`ResultSegment`(필수) ⑤`SatisfiedToggle` + 하단 고정 도크 [저장](primary h56, +safe-area).
- 폼 상태는 로컬 `useState`+zod(react-hook-form 미설치). 검증은 UI+command 이중 — 스키마는 entities/run-record 소유 스키마 공유.
- **모터 0개**: 항목 ① 자리에 인라인 카드 "등록된 모터가 없습니다"+[모터 등록] → `MotorFormSheet`(§5.3) 열기 → 저장 성공 시 목록 즉시 반영+**해당 모터 자동 선택**.
- **제출 상태 머신**: `editing → validating → submitting → (saved | submit-error)`
  - validating 실패: 첫 오류 필드로 focus 이동(모터 미선택 → 라디오 그룹 첫 radio). 오류 문구: "모터를 선택하세요" / "0.1~9.9 V 범위로 입력하세요" / "주행 결과를 선택하세요".
  - submitting: [저장] 즉시 disabled + "저장 중…"(H-4 중복 탭 방지). 폼 필드 disabled 아님(값 표시 유지).
  - submit-error(C-4/quota): 도크 위 오류 배너 `role="alert"` "저장하지 못했습니다 — {사유}" + **입력값 전부 유지** + 버튼 재활성·라벨 [다시 저장](REQ-ST-005). 성공 위장 금지. 도크 배너는 S2에서 유일하게 허용된 높이 변화 지점.
  - saved: `onSaved()` — page가 pop+토스트 "저장됨".
- createRecord 계약: FK(motorId) 동일 트랜잭션 확인·A5 재검증·측정값 null 허용(D2) — command 상세는 state-contract 소관(§7.1-3).
- unavailable(private 모드): 전역 배너가 사전 고지 — 폼 레이아웃 변화 없음, 저장 실패 계약이 커버.

### 5.3 MotorFormSheet — `features/motor-management/ui`

```ts
interface MotorFormValues { name: string; grade: MotorGrade | null; memo: string }

interface MotorFormSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: MotorFormValues          // edit 시 기존 값 채움
  pending: boolean                   // createMotor/updateMotor 실행 중 — [저장] disabled "저장 중…"
  errorMessage?: string | null       // 저장 실패 인라인 Alert + [저장] 재활성
  onSubmit: (values: MotorFormValues) => void
  onClose: () => void
}
```

- `BottomSheet` 소비. title: "모터 등록" / "모터 수정"(h2). 필드 순서: 이름(TextField, 필수) → `GradeSegment`(선택, 2×2 wrap) → 메모(TextField 1줄, 선택) → [저장](primary)+[취소].
- **C-7 이름 검증**: trim 후 1자 미만 → 인라인 오류 "이름을 입력하세요" + input focus, 저장 거부. 최대 길이·중복 허용 여부는 state-contract 스키마 소관(§7.1-5) — UI는 스키마 상수를 소비만.
- 등급: 미선택 허용(CP-1a), 재탭 해제 가능. 기본값 정책은 state-contract 소관.
- 초기 포커스: 이름 입력. 닫힘(취소·ESC·backdrop) = 폼 파기, 트리거로 focus 복귀.
- edit 모드에서 구조 필드(id·createdAt)는 폼에 노출하지 않음 — `updateMotor`는 편집 필드만 patch.

### 5.4 GuideResult / GuideInsufficient — `features/voltage-guide/ui`

```ts
interface GuideResultProps {
  guide: {
    minV: number; maxV: number       // 추천 범위 = 만족 기록 min~max (A6) — 좁혀 보정 금지
    satisfiedCount: number
    distribution: ReadonlyArray<{ voltage: number; count: number }>  // 오름차순
    wideVariance: boolean            // (maxV-minV) >= WIDE_VARIANCE_THRESHOLD(0.5V, A6)
  }
  records: ReadonlyArray<RecordRowView>  // 근거 기록 — RecordRow 재사용 (onDelete 미전달)
}

interface GuideInsufficientProps {
  satisfiedCount: number             // 0·1·2 동일 계약 (REQ-ST-006)
  requiredCount: number              // GUIDE_MIN_SATISFIED = 3 (D1)
  onGoMeasure: () => void            // [측정하러 가기] → 탭 ① 전환
}
```

**GuideResult**
- h2 "추천 세팅 전압" + `BigNumber size="guide"` value=`추천 {formatVoltageRange(minV,maxV)}` — S1 다음 크기 위계.
- `wideVariance`: 보조 문구 "기록 간 전압 편차가 큽니다 — 근거 기록을 확인하세요" — **`text.secondary` 중립 텍스트, warning 색 금지**(정보이지 경고 아님 — DS §4).
- h2 "근거": "만족 기록 {n}건 기준" + 분포 **텍스트** `2.8V ×2 · 2.9V ×1 · 3.0V ×3`(tabular-nums, 시각화 금지) + 근거 기록 목록(RecordRow).
- 계산은 선택 시 1회 순수 함수 `computeGuide` — loading 시각 요소 없음(순간). 높이 고정 계약 없음(S1 전용).

**GuideInsufficient**
- 문구: "기록 부족 — 만족 기록 {requiredCount - satisfiedCount}건 더 필요합니다 ({satisfiedCount}/{requiredCount})" + [측정하러 가기] primary. 오류 톤 금지(빈 상태 계열).

**LO-1 판정 — 미선택 시작 확정.** `/guide` 진입·새로고침 시 모터 자동 선택 없음. 근거: 자동 선택된 다른 모터의 추천을 현재 모터 것으로 오독하는 위험 > 탭 1회 절약. 라디오 목록이 짧아(≤30) 선택 비용 미미. 미선택 상태 본문: 안내 1줄 "모터를 선택하면 추천 전압을 보여드립니다"(`text.secondary`) — EmptyState 아님(빈 데이터가 아니라 미선택).

---

## 6. Interaction Matrix

LOCAL_DOMAIN_STATE_MODE: **canonical = IndexedDB store(motors·records·meta)**, visible = react-query 캐시(staleTime Infinity + mutation 후 명시 invalidate — AD-4a). 파생 값(기록 수·최근 요약·추천)은 읽기 시 계산 — 캐시·영속 금지. mutation 이벤트 키는 전부 **stable UUID**(index 금지).

| View State | Action | Canonical Target | UI Result | Browser Scenario |
|---|---|---|---|---|
| S1 idle (HTTPS) | [녹음 활성화] 탭 | 없음 (비영속 세션) | activating(<1s) → measuring / no-permission(일시·영구) / suspended | D-1 / D-2 / D-5(device) |
| S1 idle (HTTP) | — | 없음 | 버튼 disabled + "HTTPS에서만 측정 가능" — 권한 문구 혼용 금지 | D-4 |
| S1 measuring | 엔진 안정 판정 | 없음 | stable 잠금 + 캡처 자동 정지(UX-A1) + [A]/[B] 슬롯 교체(골격 불변) + announce | D-6/D-7 unit + browser |
| S1 measuring↔weak-signal | 엔진 게이트 자동 왕복 | 없음 | 수치↔"—" 교체(높이 불변), [A] 버튼 불변, announce 1s debounce | D-8 / D-9 |
| S1 measuring | 탭 전환·백그라운드 | 없음 | 세션 종료 → 복귀 시 idle (UX-A2) — "중단 화면" 없음 | browser |
| S1 stable | [이 측정으로 기록 만들기] | `entities/measurement` slot **set** (비영속 single-slot) | `/record/new` push → S2 filled 카드. weak-signal·미측정 값 set 금지 | H-5 |
| S1 stable | [다시 측정] | slot clear (stale handoff 방지 — §7.1-4) | 새 세션 → measuring | browser |
| S2 filled | [비우기] | 없음 (slot 이미 take로 소비 — 폼 로컬) | empty 모드 전환, 복구 불가, focus → 전압 input | H-계열 |
| S2 (모터 0) | 인라인 [모터 등록] → 시트 저장 | `motors.add` | 목록 즉시 반영(invalidate) + 자동 선택 | C-1 |
| S2 | [저장] | `records.add` — FK 동일 트랜잭션 확인 + A5 재검증 | submitting(버튼 disabled "저장 중…") → 성공: pop+토스트 "저장됨" / 실패: 입력 유지+도크 배너+[다시 저장] | H-1~H-4 / C-4 |
| S2 | 새로고침·딥링크 | slot 소실 (메모리) | empty 모드로 정상 렌더 — 오류 아님(D2), 레이아웃 동일 | browser |
| S3 | [+ 모터] → 시트 저장 | `motors.add` | invalidate → 목록 반영 / 이름 검증 실패: 인라인 오류+저장 거부 | C-1 / C-7 |
| S3 (모터 0) | — | `listMotorSummaries` → [] | EmptyState "첫 모터를 등록하세요"+[+ 모터], 헤더 [+ 기록] disabled | E-1 |
| S4 | 기록 행 [삭제] → confirm | `records.delete(id)` | 목록·S3 요약·S5 집계 즉시 반영(invalidate). focus는 다음 행 [삭제]로 | C-2 |
| S4 | 헤더 [삭제] | `countRecordsByMotor`(read) → confirm(n 실측 고지) → `deleteMotorCascade`(단일 트랜잭션) | 성공: `/motors` **replace**(유령 상세 방지)+focus h1 / 실패: dialog 내 인라인 오류+재시도 | C-3 (CP-3) |
| S4 삭제 직후 뒤로가기 | `/motors/:id` 재진입 | `getMotorById` → null | in-place not-found (EmptyState+[이력으로 이동]) — 라우트 404 아님 | browser |
| S3/S4 목록 | 읽기 실패 (corrupt 아님) | query error | 목록 영역만 오류 블록 "기록을 불러오지 못했습니다"+[다시 시도]=명시 `refetch` — 빈 목록 위장 금지 | D-10 |
| S3/S4/S5 | 부팅 corrupt | `initPersistence` → 'corrupt' | 전역 배너(error) + 본문=RecoveryPanel | C-6 |
| RecoveryPanel | [모든 데이터 초기화] → confirm | `resetAllData` (전 store clear) | 성공: ready 전환+토스트 "초기화되었습니다" / 실패: dialog 내 오류+재시도 | F-1(plan-review) |
| S5 | 모터 선택 (미선택 시작 — LO-1) | `listSatisfiedRecords`(read) + `computeGuide`(순수) | ≥3건: GuideResult / <3건: GuideInsufficient / 분산≥0.5V: 보조 문구 | E-2 / E-3 / E-4 |
| S5 표시 중 | 타 화면에서 기록 추가·삭제 후 복귀 | invalidate → 재조회·재계산 | 항상 최신 집계 — stale 금지 | E-계열 |
| 전역 | private 모드 부팅 | `initPersistence` → 'unavailable' | warning 배너 고정, S1/S2 측정 기능 정상, 데이터 화면은 불가 안내 블록 | C-5 |

검색·필터·정렬 UI·multi-select 없음(요구 부재 — 페이징 없음 A7 예산 내). 동시 탭 마지막 쓰기 정책은 state-contract 위임 ③ — UI 추가 계약 없음.

---

## 7. 미결·정합 대장

### 7.1 state-contract-designer 정합 필요 (병렬 wave — 산출 후 상호 검증)

| # | 항목 | 본 문서 가정 (baseline) |
|---|---|---|
| 1 | `MeasureStatus` enum의 shared 단일 정의 위치·타입명 | `shared/config`(또는 shared/model) — `measureStatusTokens` 키와 `Record<MeasureStatus, …>` 결속 (DS §8 이식 주의) |
| 2 | `MotorGrade`·`RunResult` enum **값 키** 문자열 | RunResult = `finished·course_out·not_run`(D4). MotorGrade 값 키는 미정 — 본 문서는 라벨(신품·길들이기중·전성기·노화)만 고정, 키는 state-contract 확정 |
| 3 | command Result 타입·오류 코드 → UI 오류 문구 매핑 | `Result<T, DomainError>` — 컴포넌트는 `errorMessage: string` 최종 문자열만 수신(매핑은 feature model 계층) |
| 4 | [다시 측정] 시 확정 slot clear | 본 문서가 stale handoff 방지 목적으로 명세(§2.1) — `clearConfirmedMeasurement` pre/postcondition에 반영 요청 |
| 5 | 모터 이름 최대 길이·중복 허용, 등급 기본값(미선택 vs 특정 값) | UI는 스키마 상수 소비만 — 인라인 오류 문구 슬롯은 준비됨(§5.3) |
| 6 | `MotorSummaryView`(§4.1) 산출 query(`listMotorSummaries`)의 소유 slice | `entities/motor/api`(cascade 선례) 가정 — records store를 걸치므로 state-contract 확정 필요 |
| 7 | resetAllData pre/postcondition (F-1) | UI 계약(confirm copy·초기 포커스·성공/실패 표시)은 §3.1·§3.7로 확정 — command 계약과 접합 검증 |

`api-schema.md`(HTTP 없음 — 도메인 command/query 계약 문서로 예상) 산출 시 §6 Canonical Target 열과 대조 검증할 것.

### 7.2 사용자 확인 대상 (Phase 2 검토 접점)

| 항목 | 내용 |
|---|---|
| **CP-1a 등급 라벨** | `신품 · 길들이기중 · 전성기 · 노화` 4단계 — 본 spec 검토 시 사용자 노출 확인(checkpoint 지시). 변경 시 `shared/config` 라벨 맵 1곳 교체 |
| D4 결과 어휘 | `완주 · 코스아웃 · 미주행` — Phase 3 전 실기기 세션 재확인(라벨 맵 교체만) |
| LO-2 (S2 이탈 confirm 없음) · LO-4 (S4 empty [+ 기록] 미추가) | baseline 유지 — 사용자 검토 시 확인 |

### 7.3 component-designer 판정 완료 (본 문서에서 종결)

| ID | 판정 | 근거 위치 |
|---|---|---|
| LO-1 | `/guide` **미선택 시작** 확정 | §5.4 |
| LO-3 | stable 전환 오탭 가드 **없음** 확정 | §2.5 |

### 7.4 ASSUMPTION (검토 시 이의 없으면 유지)

| ID | 내용 | 근거·되돌리기 |
|---|---|---|
| CD-A1 | aria-live 왕복 debounce 1s (measuring↔weak-signal 한정) | SR 스팸 방지 — 상수 1곳, 실기기 SR 세션에서 조정 가능 |
| CD-A2 | VoltageStepper 롱프레스 지연 400ms/간격 100ms, 빈 값에서 ± no-op | 표준 스테퍼 관행 — 상수 1곳. 기본값은 A5 실사용 확인 후(ux-brief §14-5) |
| CD-A3 | F-2 fallback 휴리스틱: 재요청 <300ms 즉시 실패 = 영구 승격 | iOS Permissions API 미가용 대응 — 오판 피해는 안내 문구 수준, D-3 device 세션 검증 |
| CD-A4 | cascade confirm n=0 문구 변형("'{모터명}'이(가) 삭제됩니다") | "기록 0건" 어색함 회피 — copy 1곳 |
| CD-A5 | ConfirmDialog 트리거 소멸 시 focus 승계(다음 행 [삭제] → 목록 heading) | WCAG focus 유실 방지 — 구현 유틸 1곳 |
