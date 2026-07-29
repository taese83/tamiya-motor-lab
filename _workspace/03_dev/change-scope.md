# Change Scope — v2 기능 개편 + v3 UI 병합 (2026-07-28)

> 이전 라운드(v2 다크 테마, v3 증보)는 push 완료로 종결. 본 계약이 현행 유일 계약이다.

## TARGET_BEHAVIOR
`_workspace/01_plan/revision-v2-brief.md`가 canonical — 측정(자동 시작·연속 측정·파노 주지표·[기록]→모터 선택 팝업), 모터(종류 9종·rolling 10·인라인 라인 차트·DnD 정렬), 레이스(가이드 대체·왕복 측정·기록 초기화), 스키마 v2(`mml-db`, 구버전 삭제 재생성), design-system v3(라임 시그니처·컷코너·히어로·Oxanium 숫자 폰트·페이지 페이드) 동시 구현.

## ALLOWED_PATHS
- `src/**` 전 계층 (라우트·엔티티·피처·페이지·공용 킷 재편 — 삭제 포함)
- `index.html`, `package.json`(의존성 4종 추가), `pnpm-lock.yaml`(broker 경유), `vite.config.ts`(폰트 자산 처리 필요 시)
- `_workspace/02_design/*.md` v2/v3 문서 동기화
- 삭제 대상: `src/pages/record-new`·`src/pages/guide`·`src/pages/motor-detail`·`src/features/record-entry`·`src/features/voltage-guide`·`src/entities/run-record`·`src/entities/measurement`(왕복 handoff로 대체) — component-spec v2 분류표 기준

## PUBLIC_CONTRACTS_TO_PRESERVE
- 분석 엔진 `shared/lib/audio-analysis` **무변경**(안정 판정 내부 재사용) — 엔진 테스트 22건 회귀 기준선
- persistence 공용 계약(withTransaction·Result 봉투·DomainError 11코드)·FSD 경계·ESLint 규칙
- WCAG AA(다크/라이트)·44px·tabular-nums·수치 고정 높이·색 단독 구분 금지
- 다크 기본+라이트 토글(`mml-mode` 결속)·Vercel 배포 계약(vercel.json)

## NON_GOALS
- 엔진 알고리즘 변경, 추천 기능 부활, 서버/계정/동기화, 차트 라이브러리(라인 차트는 커스텀 SVG), 애니메이션 라이브러리, Oxanium 외 추가 폰트

## CHANGE_BUDGET
- 신규 의존성 4: @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0, @dnd-kit/utilities 3.2.2, @fontsource-variable/oxanium 5.3.0 (tech-stack 확정)
- 번들 예산: 초기 로드 gzip +45KB 이내(폰트 woff2 별도 ≤25KB, preload)

## TEST_EVIDENCE
- 엔진 22건 회귀 없음 + persistence/rolling/reorder 신규 unit + typecheck/lint/build 클린
- preview 스모크: 자동 시작 fallback·기록 수집·rolling 10·DnD·차트·레이스 왕복(폼 보존)·초기화 confirm·다크/라이트

## v2.1 증보 (2026-07-29 실기기 피드백 라운드)
- 약신호 안내 문구 제거 · 핀치/더블탭 줌 차단(WCAG 1.4.4 트레이드오프 인지) · 테마 storage 키 v2(다크 재시작) · [기록] disabled 대비 수정(컷코너 ::before 레이어)
- **엔진 수정 허용(기존 '무변경' 계약 해제 — 사용자 요구)**: 다중 모터 환경 대응 ① 근접 필터(proximityRms — 절대 음량 하한) ② 지배성 검사(비고조파 관계 2위 후보가 1위에 근접하면 수치 유보). 기존 fixture 22건 회귀 없음이 수용 기준, 상수는 DEFAULT_TUNING에서 조정 가능(실기기 튜닝 대상)

## v2.3 라운드 (2026-07-29 — 초기화 버그·레이스 수정·차트 라이브러리)

세 건의 사용자 요구. 이전 라운드의 두 NON_GOAL을 **명시적으로 해제**한다.

### TARGET_BEHAVIOR
1. **초기화 버그 정정**: `/race/:motorId` 하단 초기화가 해당 모터의 **레이스 기록만** 삭제한다. 이전 v2.2는 측정(파노) 기록까지 삭제해 모터 상세 파노 그래프 데이터가 사라졌다 — 그 동작을 정정.
2. **레이스 기록 수정**: RaceRecord immutable(INV-05) 해제 — `result·voltage·lapTimeMs`만 편집. panoHz(측정값)·motorId·id·createdAt은 command가 보존(순서 불변).
3. **파노 그래프**: 커스텀 SVG → `@mui/x-charts` LineChart 교체(시각 품질 개선). 공개 props·aria-hidden 계약 유지.

### ALLOWED_PATHS
- `src/shared/lib/persistence/reset.ts`·`index.ts` (per-motor 초기화를 race-only로)
- `src/entities/race-record/**` (updateRaceRecord command + updateRaceRecordPatchSchema + 배럴)
- `src/features/race-record/**` (update mutation, useRaceEntry edit 모드, RaceEntrySheet edit, RaceRecordRow [수정], ResetRecordsBlock 문구)
- `src/features/motor-management/ui/PanoLineChart.tsx` (차트 라이브러리 교체)
- `src/pages/race-detail/ui/RaceDetailPage.tsx` (배선·주석)
- `package.json`·`pnpm-lock.yaml` (@mui/x-charts 1종 추가)

### PUBLIC_CONTRACTS_TO_PRESERVE
- `resetAllRecords`·`resetAllData`(전체/복구 초기화)는 무변경 — 측정 포함 삭제가 정당
- `deleteMotorCascade`(모터 삭제 시 measure+race cascade) 무변경
- PanoLineChart 공개 props(`PanoLineChartPoint`·`PanoLineChartProps`)·aria-hidden 장식 계약
- persistence 봉투·DomainError 코드·FSD 경계·WCAG AA·44px 타깃

### NON_GOALS (이전 라운드에서 해제)
- ~~차트 라이브러리 금지~~ → **해제**: @mui/x-charts 채택 (사용자 요구)
- ~~RaceRecord update 없음(INV-05)~~ → **완화**: result·voltage·lapTimeMs 편집 허용
- panoHz 수정, 측정 기록 수정, 초기화 UX 재설계, 애니메이션 라이브러리는 여전히 범위 밖

### CHANGE_BUDGET
- 신규 의존성 1: @mui/x-charts 9.10.1 (peer @mui/material ^7.3.0 충족)

### TEST_EVIDENCE
- Node 22: tsc·eslint·vite build 클린. 엔진 22건 회귀 없음.
- preview 스모크(가능 시): 초기화 후 파노 그래프 잔존 / 레이스 기록 수정 왕복 / 차트 렌더·다크·라이트

## v2.4 라운드 (2026-07-29 — 모터 목록 종류 필터)

### TARGET_BEHAVIOR
`/motors` 목록에서 모터 종류로 필터한다. 종류 칩 **다중선택**(가로 스크롤 행), 선택 0개 = 전체.
필터가 걸린 동안 **DnD 정렬은 잠근다** — `reorderMotors`가 전체 모터 id의 완전한 순열을 요구하므로
필터된 부분집합을 전송하면 순열 검증에 실패한다(SO-2). 사용자 결정: 잠금 + 안내 문구.
필터 상태는 URL search param에 보존해 상세 진입→뒤로 복귀 시 유지한다.

### ALLOWED_PATHS
- `src/features/motor-management/model/use-motor-kind-filter.ts` (신규)
- `src/features/motor-management/ui/MotorKindFilter.tsx` (신규)
- `src/features/motor-management/ui/MotorList.tsx`·`MotorRow.tsx` (reorderDisabled 전달)
- `src/features/motor-management/{ui,model}/index.ts` (배럴)
- `src/pages/motors/ui/MotorsPage.tsx` (조립)

### PUBLIC_CONTRACTS_TO_PRESERVE
- `reorderMotors` 전체 순열 계약·INV-19(sortOrder 연속)·낙관 재배열/롤백 동작
- `MotorList`/`MotorRow` 기존 props 하위호환(reorderDisabled는 optional additive)
- 전체 0건 EmptyState 경로(E-1)와 필터 0건 경로를 구분 — 오류·빈 상태 위장 금지
- 44px 타깃·색 단독 구분 금지·다크/라이트 WCAG AA·키보드 정렬 경로

### NON_GOALS
- 레이스 진입 목록('/race')·측정 모터 선택 팝업 필터(사용자 결정: 모터 목록만)
- 이름 검색, 정렬 기준 변경(파노·기록수 정렬), 필터 프리셋 저장
- 필터된 상태에서의 부분 정렬 커밋(명시적으로 기각)

### CHANGE_BUDGET
- 신규 의존성 0 — react-router useSearchParams와 기존 MUI Chip 재사용

### TEST_EVIDENCE
- Node 22 typecheck·lint·build 클린, vitest 회귀 없음
- 브라우저: 다중선택 필터 · 필터 중 핸들 비활성+안내 · 필터 0건 문구 · 상세 왕복 후 필터 유지 · 다크/라이트

## v2.5 라운드 (2026-07-29 — 모터 상세 측정 왕복)

### TARGET_BEHAVIOR
모터 상세('/motors/:motorId') 하단 [측정] → S1 측정 화면 왕복 → 수치 안정 시 자동 확정으로
해당 모터에 MeasureRecord 수집 → 자동 복귀. 레이스 측정(RV-1)과 같은 방식으로 동작한다.

### 설계 판단 — 단일 slot 재사용
왕복 slot은 "slot 존재 = 왕복 모드"가 불변식(INV-21)이라 별도 slot을 추가하면 두 slot이 동시에
존재해 S1이 대상을 판별할 수 없다. 따라서 기존 slot에 `origin: 'race' | 'motor'` 판별자를 추가해
재사용하고 single-flight(_markMeasuredPending)·liveness(startedAt) 가드를 그대로 승계한다.
`navigate(-1)` 복귀는 이미 origin 무관하게 동작하므로 분기 지점은 문구·모터삭제 복귀 대상뿐이다.

### ALLOWED_PATHS
- `src/features/race-measure-handoff/model/store.ts` (origin union + beginMotorMeasure)
- `src/features/race-measure-handoff/ui/RaceMeasureStrip.tsx` (origin별 문구)
- `src/features/race-measure-handoff/index.ts` (배럴)
- `src/features/measure-session/ui/MeasureActionDock.tsx` (back-to-race → back-to-origin)
- `src/pages/measure/ui/MeasurePage.tsx` (origin 전달·모터삭제 복귀 대상)
- `src/pages/motor-detail/ui/MotorDetailPage.tsx` ([측정] 버튼 + 복귀 소비)
- `src/pages/race-detail/ui/RaceDetailPage.tsx` (consume에 origin 가드)

### PUBLIC_CONTRACTS_TO_PRESERVE
- 레이스 왕복(RV-1) 동작 무변경 — 폼 draft 보존·pano measured 갱신·토스트
- INV-21(왕복 중 [기록] 진입점 0개)·INV-22(수집 경로는 collectMeasureRecord 단일)
- rolling 10(INV-20)·측정값 재반올림 금지·startedAt 세대 가드
- 오류 Toast 금지(ToastApi는 성공 전용) — 실패는 인라인 Alert

### NON_GOALS
- 모터 상세에서 수동 수치 입력, 측정 기록 개별 삭제·수정
- 왕복 slot의 영속화(새로고침 시 소실이 계약)
- `race-measure-handoff` 슬라이스 디렉토리 rename(요청 범위 밖 — 별도 정리 대상)

### CHANGE_BUDGET
- 신규 의존성 0

### TEST_EVIDENCE
- Node 22 typecheck·lint·build·vitest 클린
- 브라우저: 모터 상세 왕복(자동 복귀·기록 +1·차트 갱신) · 레이스 왕복 회귀 없음 · origin 교차 오소비 없음

## v2.6 라운드 (2026-07-29 — 헤더 버튼 정리 + 종류 뱃지 색상 + 라이트대시 추가)

### TARGET_BEHAVIOR
1. 헤더 버튼 위계 정리: 주 행동([+ 모터]·[+ 기록])은 라임 contained(컷코너), 보조·파괴
   ([수정]·[삭제])는 text 톤. 56px 헤더에서 제목 폭 잠식과 파괴 액션의 과도한 시선 끌기를 줄인다.
2. 모터 종류 뱃지에 식별색 적용(사용자 지정 색상표 10종). 라벨은 항상 동반 — 색 단독 구분 아님.
3. `light_dash`(라이트대시) enum **추가**. MOTOR_KINDS 표시 순서를 제품 라인업 순서로 재배열.

### 설계 판단
- enum은 추가만 한다: 제거·개명이면 저장된 모터 행이 rehydrate에서 data-corrupt로 판정돼
  복구 화면에 빠지고 마이그레이션이 필요했다. 배열 순서 변경은 표시 순서만 바꾸고 저장값에 무영향.
- 뱃지 색에 모드별 변종을 두지 않는다: 채워진 뱃지는 bg↔fg 대비를 자체 만족해 텍스트 가독성이
  모드와 무관하다. 모드에 걸리는 유일한 문제는 면 분리(라이트 배경의 흰 뱃지, 다크 배경의 검정
  뱃지)이고, fg를 옅게 깐 border가 자동으로 반대 톤 윤곽을 만들어 분기 없이 해결한다.
- 기존 MotorKindChip은 테마 무관 라이트 hex 고정으로 다크에서 저대비였던 결함이 있었다 — 함께 정정.

### ALLOWED_PATHS
- `src/shared/config/domain.ts` (MOTOR_KINDS +light_dash·순서·라벨)
- `src/shared/config/design-tokens.ts` (motorKindColors 신설)
- `src/entities/motor/ui/MotorKindChip.tsx` (색 적용)
- `src/pages/{motors,motor-detail,race-detail}/ui/*.tsx` (헤더 버튼 톤)
- 9종 → 10종 stale 주석 3곳

### PUBLIC_CONTRACTS_TO_PRESERVE
- MotorKindChip 공개 props(kind·size)·소비처 4곳 무변경
- 저장된 motor 행의 kind 값·rehydrate 검증·sortOrder 불변식
- 44px 타깃·색 단독 구분 금지·bg↔fg WCAG AA 4.5:1·다크/라이트 양립
- 종류 선택 3중 표시(라임 bg + w800 + check)·필터 칩 동작

### NON_GOALS
- 뱃지 모양·크기 변경, 종류별 아이콘 도입
- 헤더를 아이콘 버튼으로 전환(파괴 액션 아이콘 단독 금지 — 라벨 유지)
- 시맨틱 red/amber/green 팔레트 재정의

### CHANGE_BUDGET
- 신규 의존성 0

### TEST_EVIDENCE
- Node 22 typecheck·lint·build·vitest 클린
- 브라우저: 10종 뱃지 색·다크/라이트 양쪽 · 흰색·검정 뱃지 면 분리 · 헤더 위계 · 종류 선택 10택 · 필터 칩

## v2.7 라운드 (2026-07-29 — 측정 기록 3종: 즉시·10초 후·1분 후)

### TARGET_BEHAVIOR
측정 탭('/')의 단일 [기록]을 3종으로 나눈다: 즉시 / 10초 후 / 1분 후.
지연은 [기록] 탭 시점부터 센다([기록]은 measuring일 때만 활성이므로 탭 시점 = 기록 가능 시점).
대기 중 Z3에 남은 초와 [취소]를 표시하고, 만료 시점의 수치를 기록한다(탭 시점 값이 아니다).

### 설계 판단
- **기존 수집 경로를 그대로 재사용**하고 앞에 카운트다운 게이트만 끼운다. 지연 타입은
  "스냅샷을 언제 고정할지"만 바꾸며 모터 선택·저장·rolling(INV-20)·invalidation 계약은 무변경
  (스냅샷 고정 계약 SC2-A3·MR-2 계승, 재반올림 없음 = 표시-기록 일치).
- 만료 시각에 불안정하면 **실패로 끝내지 않고 다음 안정 시점까지 대기**한다. 값 없이 기록하거나
  낡은 값을 기록하는 것보다 안전하고, 오류 표면이 불필요해 Z1/Z2/Z3 고정 높이도 흔들리지 않는다.
  무한 대기는 [취소]가 해소한다.
- `capture-pending`은 view.status보다 **먼저** 판정한다: 카운트다운 중 신호가 흔들려 measuring을
  벗어나도 대기 표시와 [취소]가 사라지면 사용자가 진행 상황과 취소 수단을 잃는다.
- 기록 3버튼은 §2.7 "단일 Button 노드" 포커스 연속성 계약을 record 상태에서 의도적으로 벗어난다.
  존 높이 h56과 폭은 유지해 레이아웃은 불변이고 각 버튼은 44px 이상 타깃을 확보한다.

### ALLOWED_PATHS
- `src/shared/config/domain.ts` (RECORD_DELAY_OPTIONS)
- `src/features/collect-measure/model/use-delayed-capture.ts` (신규) + 배럴
- `src/features/measure-session/ui/MeasureActionDock.tsx` (3버튼·capture-pending)
- `src/pages/measure/ui/MeasurePage.tsx` (배선)
- 신규 테스트 2파일

### PUBLIC_CONTRACTS_TO_PRESERVE
- useCollectFlow 계약 전체(스냅샷 고정 → 선택 → 저장, single-flight, 실패 인라인 배너)
- INV-20 rolling 10 · INV-22 수집 경로 단일(collectMeasureRecord) · 오류 Toast 금지
- INV-21 왕복 중 기록 진입점 0개 — 왕복이 지연 대기보다 우선
- Z3 존 높이 h56 고정 · 44px 타깃 · 소프트 비활성(자리 이동 없음, M-5)

### NON_GOALS
- 지연 타입을 레이스·모터 상세 왕복에도 적용(측정 탭 한정 — 사용자 지정 범위)
- 즉시·10초·1분 동시 3건 저장(1회 탭 = 1건)
- 지연 값 커스터마이즈, 반복 자동 기록

### CHANGE_BUDGET
- 신규 의존성 0

### TEST_EVIDENCE
- Node 22 typecheck·lint·build 클린, vitest 40건(신규 18건)
- **브라우저 한계 명시**: headless preview는 실제 오디오 입력이 없어 measuring에 도달하지 못한다
  (status='starting' → 기록 비활성). 따라서 카운트다운·안정대기·취소·최신값 캡처는 unit으로 검증하고,
  브라우저에서는 3버튼 렌더·라벨·비활성 시 탭 무시만 확인했다. 실기기 확인 필요 항목으로 남긴다.

## v2.8 라운드 (2026-07-29 — 모터 상세 고정 셸: 하단 [측정] 고정 + 기록만 스크롤)

### TARGET_BEHAVIOR
모터 상세를 뷰포트 높이 고정 셸로 바꾼다. 헤더·종류 칩·차트·[측정]은 스크롤을 타지 않고,
기록 목록만 내부 스크롤한다. 기록이 늘어도 [측정]이 화면 밖으로 밀리지 않는다.

### 설계 판단
- 높이는 `calc(100dvh - bottomNavHeight - safeAreaBottom)` — <main>이 이미 탭 바를 pb로 예약하므로
  같은 값을 빼면 문서 스크롤이 생기지 않는다(S1 MeasurePage와 동일 관례를 따랐다).
- 스크롤 컨테이너에 `minHeight: 0`이 필수다: flex 자식은 기본적으로 콘텐츠 높이만큼 부풀어
  이것 없이는 overflow가 동작하지 않고 문서가 늘어난다.
- `overscrollBehaviorY: contain` — 목록 끝에서 문서·상위로 스크롤이 연쇄되지 않게 한다.
- 알림(삭제 count 오류·왕복 수집 실패)은 스크롤 영역이 아니라 고정 상단에 둔다 — 스크롤로
  가려지면 놓칠 수 있다.
- 차트는 기록 0건이면 렌더하지 않는다(빈 축만 남기지 않는다) — 기존 동작 유지.
- 시트·다이얼로그는 고정 셸 밖에 둬 높이 계산에 끼어들지 않게 한다(portal 렌더).

### ALLOWED_PATHS
- `src/pages/motor-detail/ui/MotorDetailPage.tsx` (레이아웃 재구성 단독)

### PUBLIC_CONTRACTS_TO_PRESERVE
- 모든 분기 유지: corrupted(RecoveryPanel)·loading·읽기 오류(D-10)·in-place not-found·성공
- 기록 리스트 순서(오래된 순 01부터, 차트 X축과 정렬 일치 CD2-A1)·rolling 10
- 44px 타깃·[측정] 왕복 동작(v2.5)·다크/라이트

### NON_GOALS
- 다른 화면(모터 목록·레이스 상세·측정 탭) 레이아웃 변경
- 기록 목록 가상화·페이지네이션(rolling 10건 상한이라 불필요)
- 차트도 스크롤 대상에 포함(요청은 "측정 기록만 스크롤")

### CHANGE_BUDGET
- 신규 의존성 0

### TEST_EVIDENCE
- Node 22 typecheck·lint·build 클린, vitest 40건 회귀 없음
- 브라우저 실측(375×812): 문서 스크롤 없음(scrollHeight=clientHeight=812) · 목록 overflow auto ·
  [측정]이 탭 바 위 12px에 고정 · 차트 표시
- 브라우저 실측(375×600, 10건이 넘치는 높이): 목록 내부 스크롤 engaged(scrollTop 0→124,
  10행까지 도달) · **[측정] top 484 → 484 불변** · 문서 scrollTop 0 유지
- 타 화면 회귀 없음(모터 목록·레이스·측정 탭 정상 렌더)
- 스크린샷 도구가 이 라운드에서 timeout으로 실패해 시각 캡처는 없다 — 스크롤·고정 동작은
  위 좌표·치수 실측으로 검증했다(앱 콘솔 오류 0).
