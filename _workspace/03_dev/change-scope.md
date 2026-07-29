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

## v2.9 라운드 (2026-07-29 — v2.7 기록 3종 철회)

### TARGET_BEHAVIOR
측정 탭의 기록을 **단일 [기록]으로 되돌린다**. 10초 후·1분 후 지연 기록을 제거하고
버튼 문구도 '즉시' → '기록'으로 복원한다(사용자 결정: v2.7 철회).

### 방법 — hand-edit 대신 부모 커밋에서 복원
v2.7(0ce8387)이 건드린 4개 source 파일이 그 이후 아무 커밋에서도 수정되지 않았음을 먼저 확인하고
(`git log 0ce8387..HEAD -- <path>`가 전부 공백), 부모 커밋 0bc0105에서 그대로 checkout했다.
손으로 되돌리면 주석·공백 수준의 흔적이 남기 쉬운데, 이 방식은 byte-exact 복원을 보장한다
(`git diff 0bc0105 -- <4파일>`이 공백으로 확인됨).
git revert를 쓰지 않은 이유: change-scope.md가 이후 v2.8에서 추가 append돼 충돌하고,
아래 테스트 판단도 revert로는 표현할 수 없다.

### 제거·보존 판단
- 제거: `use-delayed-capture.ts`(+테스트), `RECORD_DELAY_OPTIONS`, `capture-pending` 액션,
  `onCancelCapture`, 3버튼 그룹 렌더. 잔존 참조 0건을 grep으로 확인.
- **보존**: `MeasureActionDock.test.tsx`를 삭제하지 않고 복원된 단일 버튼 계약만 남겨 축소했다.
  deriveMeasureAction은 §2.7이 "unit 대상"으로 지정한 순수 함수인데 v2.7 전까지 테스트가
  0건이었고, 마이크 없는 브라우저 QA로는 measuring/record 활성 경로에 도달할 수 없다.
  기능 철회와 무관하게 유효한 커버리지라 남긴다(9건).

### ALLOWED_PATHS
- `src/shared/config/domain.ts`·`src/features/collect-measure/index.ts`·
  `src/features/measure-session/ui/MeasureActionDock.tsx`·`src/pages/measure/ui/MeasurePage.tsx` (복원)
- `src/features/collect-measure/model/use-delayed-capture.ts`(+test) 삭제
- `src/features/measure-session/ui/MeasureActionDock.test.tsx` 축소

### PUBLIC_CONTRACTS_TO_PRESERVE
- v2.8 모터 상세 고정 셸·v2.6 뱃지/헤더·v2.5 측정 왕복은 무변경(이 라운드가 건드리지 않음)
- 스냅샷 고정(SC2-A3·MR-2)·INV-20 rolling 10·INV-21 왕복 중 기록 진입점 0개

### NON_GOALS
- 지연 기록을 다른 형태(설정 값·프리셋)로 재도입
- 측정 화면의 다른 존(Z1/Z2) 변경

### CHANGE_BUDGET
- 신규 의존성 0 (제거도 없음 — 지연 기록은 표준 타이머만 사용했다)

### TEST_EVIDENCE
- Node 22 typecheck·lint·build 클린, vitest 31건(40건에서 지연 기록 9건 제거)
- 복원 4파일이 0bc0105와 byte-exact 동일 · 잔존 참조 grep 0건
- 브라우저: 측정 탭에 단일 [기록]만 노출(3버튼 그룹 부재 확인), 콘솔 오류 0

## v2.10 라운드 (2026-07-29 — 폼 디자인 정리 + 종류 선택 색상 + 레거시 DB 정리 코드 제거)

### TARGET_BEHAVIOR
1. 폼 컨트롤 높이를 **48px 하나로 통일**한다. 실측으로 44·48·52·55가 섞여 있었고 같은 행에서도
   버튼(48)과 입력(55)이 어긋나 있었다 — 이것이 "크기 제각각"의 실체다.
2. 전압 스테퍼를 **하나의 테두리**로 묶어 다른 필드와 좌우를 맞춘다. 이전에는 입력이 l=72→375로
   안쪽에 들어가고 ±가 필드 밖에 떠 보여 다른 행(l=16→431)과 격자가 어긋났다 — "정렬 안됨"의 실체.
3. 파노 읽기전용 값을 **입력과 같은 표면**(테두리·높이·라운드)으로 만든다. 테두리 없는 맨 텍스트 +
   우측 버튼이 "엉성한" 인상의 주 원인이었다.
4. 종류 선택(10택)에 **종류색 적용** — 비선택은 색 점, 선택은 종류색 채움. v2.6에서 MotorKindChip에만
   색을 넣고 이 컴포넌트를 빠뜨린 누락을 메운다.
5. 레거시 v1 DB(`minicar-motor-lab`) 정리 경로 제거 — 상용 배포 전이라 정리 대상 데이터가 없다.

### 설계 판단
- 높이를 컴포넌트마다 박지 않고 `layoutTokens.formControlHeight` 1곳 + theme override로 소유한다.
  이전에는 theme가 폼 높이를 전혀 소유하지 않아(MuiOutlinedInput은 테두리 색만 지정) 값이 흩어졌다.
- 입력 높이는 root의 height가 아니라 **input 패딩**으로 만든다 — root에 height를 박으면
  floating label(모터 이름)과 helper 정렬이 깨진다.
- ToggleButton은 `minHeight`(고정 height 금지) — 종류 10택은 2줄 라벨이 늘어나야 한다.
  단일 라벨인 SegmentControl만 `height` 고정.
- 스테퍼 내부 입력의 notchedOutline을 지운 대신 래퍼에 `:focus-within` 링을 둬 포커스 가시성을 보전한다.
- 종류 선택은 색 단독 구분이 되지 않게 3중 표시 유지(색 + w800 + check). 비선택에도 점을 노출해
  **선택 전에** 색을 알 수 있게 한다.

### ALLOWED_PATHS
- `src/shared/config/design-tokens.ts` (formControlHeight)
- `src/app/theme.ts` (MuiOutlinedInput 높이·MuiToggleButton minHeight, layoutTokens import)
- `src/shared/ui/segment-control/SegmentControl.tsx`·`src/shared/ui/voltage-stepper/VoltageStepper.tsx`
- `src/features/race-record/ui/RaceEntrySheet.tsx`·`src/features/motor-management/ui/MotorKindSelect.tsx`
- `src/shared/lib/persistence/{schema,db,init,index}.ts` (레거시 DB 경로 제거)

### PUBLIC_CONTRACTS_TO_PRESERVE
- 44px 최소 타깃(48 > 44로 자동 충족) · 포커스 가시성 · 색 단독 구분 금지 · 다크/라이트 양립
- VoltageStepper 롱프레스·키보드 조작·clamp·오류 슬롯 계약 · SegmentControl 3중 선택 표시
- 폼 검증·제출·왕복([측정]) 동작 무변경 — 이번 라운드는 시각/레이아웃만 건드린다
- 현행 `mml-db` v2 open·corrupted 판정·oldVersion<2 재생성 경로

### NON_GOALS
- 폼 구조·필드 순서·검증 규칙 변경, 시트 전환 애니메이션, 라운드/컷코너 체계 재설계
- 종류별 아이콘 도입, MotorFormSheet의 저장/취소 배치 변경

### CHANGE_BUDGET
- 신규 의존성 0

### TEST_EVIDENCE
- Node 22 typecheck·lint·build 클린, vitest 31건 회귀 없음
- 브라우저 실측(레이스 입력 시트): 컨트롤 9개의 `distinctHeights: [48]` — 이전 44/48/52/55에서 통일 확인
- 브라우저 실측: 모든 필드 행이 l=16→431 정렬(전압 그룹 포함, 이전 입력 72→375)
- 종류 10택: 옵션별 색 점 computed 값이 motorKindColors와 일치, 선택 시 종류색 채움 확인
- 다크·라이트 양쪽 스크린샷 확인, 콘솔 오류 0
- `LEGACY_DB_NAME`·`deleteLegacyDatabase` 잔존 참조 grep 0건

## v2.11 라운드 (2026-07-29 — 입력 필드 패턴: notched 라벨 + 인라인 액션)

### 근거 — 레퍼런스 벤치마킹
사용자가 Mobbin 참고 스크린샷을 제공했다(Spotify 다이얼로그 / Airbnb 탭 / Google Fit·Ultrahuman·
Fitbit·Apple Health 수면 / PLATA 목록 / 계정 편집 input). 사용자 결정: **구조만 채택**하고
표면 언어(컷코너·라임·카본)는 유지한다 — 레퍼런스의 pill·큰 radius는 가져오지 않는다.

이 라운드는 그중 **input 패턴**만 적용한다:
① 라벨을 테두리에 파넣기(notch) — 필드 위 별도 줄 제거로 세로 길이·시선 이동 감소
② 필드 안 우측 인라인 액션(레퍼런스 EDIT 위치) — [측정]을 필드 밖에서 안으로
③ 주/보조 버튼 가로 2열 — 세로 적층에서 전환(주 액션 flex 2 : 보조 1로 위계 유지)

### ALLOWED_PATHS
- `src/shared/ui/form-field/**` (신규 FormField — 라벨·면·오류 슬롯·인라인 액션 소유)
- `src/shared/ui/segment-control/SegmentControl.tsx`·`src/shared/ui/voltage-stepper/VoltageStepper.tsx`
  (`borderless` 추가 — FormField가 면을 소유할 때 자기 테두리·포커스링·오류슬롯을 넘긴다)
- `src/features/race-record/ui/RaceEntrySheet.tsx` (4행 FormField 전환, 로컬 헬퍼 3개 제거)

### 설계 판단
- notch는 라벨 뒤에 표면색을 깔아 테두리를 끊는다 → FormField는 `background.paper` 표면 위에서만
  정상 렌더된다(`surfaceColor`로 조정 가능). 이 제약을 컴포넌트 주석에 명시했다.
- 라벨 `zIndex: 1` 필수 — 내부 컨트롤이 면을 꽉 채우면(세그먼트) 라벨이 선택색에 묻힌다(실측 확인).
- 포커스 링은 `:focus-within`이 아니라 **입력 한정**(`:has(input:focus)` + `:has(.Mui-focused)`).
  `:focus-within`이면 인라인 액션 버튼 포커스에도 필드 전체가 링을 둘러 "편집 중"으로 오해된다.
- a11y: 텍스트 입력은 `labelFor`로 실제 `<label for>` 결속. 자체 aria-label을 가진 컨트롤
  (SegmentControl·VoltageStepper)은 라벨을 `aria-hidden`으로 둬 이중 낭독을 막고,
  오류는 `errorId`로 `aria-describedby` 결속을 유지한다(시각적 인접만으로는 낭독되지 않는다).
- 로컬 헬퍼(FieldLabel·FieldErrorSlot·readonlyFieldSx)는 FormField로 흡수돼 제거 — 중복 정의 금지.

### PUBLIC_CONTRACTS_TO_PRESERVE
- 폼 검증·제출·왕복([측정])·single-flight 동작 무변경 (시각/구조만 변경)
- v2.10 폼 공통 높이 48 · 44px 타깃 · 오류 슬롯 높이 예약(layout shift 금지)
- SegmentControl 3중 선택 표시 · VoltageStepper 롱프레스·키보드·clamp 계약

### NON_GOALS
- 레퍼런스의 라운드/pill 표면 채택 · 필드 순서·검증 규칙 변경
- 나머지 레퍼런스 영역(모터 상세 섹션, 목록 행, 다이얼로그, 탭 인디케이터) — 후속 라운드

### CHANGE_BUDGET
- 신규 의존성 0

### TEST_EVIDENCE
- Node 22 typecheck·lint·build 클린, vitest 31건 회귀 없음
- 브라우저 실측: 4개 필드 면의 좌우(221→669)·높이(50=48+테두리)가 **전부 동일**
- 라벨 z-index 1 적용 후 세그먼트 위에서도 라벨 렌더 확인
- 다크 모드 스크린샷으로 notch·인라인 액션·2열 버튼 확인
- **미검증(환경 한계)**: 포커스 링. preview 창이 OS 포커스를 갖지 못해(`document.hasFocus() === false`)
  `:focus` 계열이 이 환경에서 전혀 매칭되지 않는다. 선택자 구조 자체는 `:has(input)` 매칭으로 확인했고
  native `:focus`와 MUI `.Mui-focused` 두 신호를 함께 걸어 두었으나, **실기기 확인이 필요하다.**

## v2.12 라운드 (2026-07-29 — 모터 카드: 종류색 + 2열 레이아웃 + 스파크라인)

### TARGET_BEHAVIOR
모터 목록 카드를 종류색으로 구분하고 레이아웃을 2열로 재편한다. 카드 안에 파노 추세
스파크라인을 노출한다. (레퍼런스: 카테고리별 색 카드 / PLATA 목록 행 / 종목 행 미니 차트)

### 설계 판단
- **카드를 종류색으로 꽉 채우지 않는다.** 우리 종류색은 채도가 높아(빨강·검정·흰색) 솔리드면
  ① 글자 대비를 종류마다 따로 잡아야 하고 ② 다크 카본에서 흰 카드, 라이트에서 검정 카드가 튄다.
  대신 tint(16%) 면 + 좌측 solid accent bar로 나눈다 — 글자는 테마 전경색을 그대로 써서 양 모드
  대비가 안전하고, 배경에 가까운 종류(검정/흰색)도 bar에 border 링이 있어 윤곽이 남는다.
- **스파크라인 색은 종류색이 아니라 currentColor.** 종류색으로 그리면 검정 종류가 다크 카드에서,
  흰색 종류가 라이트 카드에서 선이 사라진다(실측 확인). 종류 식별은 tint·bar·라벨 3중으로 이미
  충족되므로 이 채널은 가독성을 우선한다.
- **스파크라인에 x-charts를 쓰지 않는다.** 축·툴팁·범례가 불필요한 장식인데 행마다(최대 30) 차트
  인스턴스를 만들면 렌더 비용이 크다. polyline 1개로 충분하다. 축·툴팁이 필요한 상세 화면 차트는
  계속 x-charts가 담당한다.
- **종류 칩 제거.** 색은 카드·bar가, 식별 텍스트는 종류 라벨이 담당하므로 칩은 중복이다
  (색 단독 구분 금지는 라벨 텍스트로 계속 충족). 칩 자체는 다른 소비처(레이스 목록·선택 시트·상세)에 유지.
- **panoTrend는 추가 IO 0.** listMotorSummaries가 이미 measureRecords 전건을 메모리로 읽어 롤업하므로,
  같은 스캔에서 행을 모아 정렬만 한다. 정렬 방향(오래된→최신)은 상세 차트와 일치시켜 두 화면의
  추세 방향이 어긋나지 않게 했다.
- 행 accessible name은 aria-label로 고정 — 2열 텍스트를 그대로 읽히면 순서가 산만하다.

### ALLOWED_PATHS
- `src/entities/motor/model/types.ts`·`api/repository.ts` (MotorSummary.panoTrend 추가)
- `src/shared/config/design-tokens.ts` (withAlpha·MOTOR_CARD_TINT_ALPHA)
- `src/shared/ui/sparkline/**` (신규)
- `src/features/motor-management/ui/MotorRow.tsx`

### PUBLIC_CONTRACTS_TO_PRESERVE
- DnD 핸들 독립 타깃·44px·잠금(v2.4) 동작 · 행 탭 → 상세 진입 · sortOrder 정렬
- INV-09(요약 파생 view 영속·캐시 금지) · INV-16 read 경계 zod 검증 · rolling 10
- 값 없음은 EM_DASH(0·이전 값 위장 금지) · 색 단독 구분 금지

### NON_GOALS
- 레이스 진입 목록·선택 시트 행 레이아웃 변경(별도 라운드)
- 스파크라인 상호작용(툴팁·탭) — 장식 채널 유지

### CHANGE_BUDGET
- 신규 의존성 0

### TEST_EVIDENCE
- Node 22 typecheck·lint·build 클린, vitest 31건 회귀 없음
- 브라우저: 6종(상승·하강·평탄·지그재그·상승·기록0건) 시드로 다크·라이트 양쪽 확인.
  6장 모두 tint·accent bar 구분 가능, 스파크라인 5개 렌더(기록 0건은 미렌더), 값 없음 EM_DASH.
- 결함 1건을 실측으로 잡아 수정: 스파크라인을 종류색으로 그렸을 때 울트라대시(검정)가
  다크 카드에서 소실 → currentColor로 교체.

## v2.13 라운드 (2026-07-29 — 폼 라벨 위로 회귀 · 게이지 개편 · placeholder·바늘 정정)

### TARGET_BEHAVIOR
1. **폼 라벨을 필드 위 굵은 텍스트로** (사용자 결정 A — 최신 레퍼런스 "Edit profile details").
   v2.11의 notch를 철회한다.
2. **측정 게이지 개편** (레퍼런스 게이지): 두꺼운 라운드 트랙 + 동일 두께 진행 아크 +
   대비색 바늘 + 링 허브 + sparse 라벨.
3. **BigNumber 값없음 placeholder 축소** — hero 사이즈 em dash가 검은 막대로 읽히는 문제 정정.
4. **dim 상태에서도 바늘 노출**(최소 위치) — 사용자 요청.

### 설계 판단
- notch 철회 근거: 이 앱 폼에는 텍스트 입력이 아닌 컨트롤(세그먼트·스테퍼)이 섞여 있어 notch를
  씌우면 라벨이 컨트롤 위에 겹쳐 z-index로 눌러야 했고, 라벨 뒤를 배경색으로 덮어야 해서
  "background.paper 표면 위에서만 정상 렌더"라는 제약이 생겼다. 라벨을 위로 빼면 둘 다 사라진다.
- 게이지 반지름을 두께에 맞춰 재계산했다(viewBox 고정 유지): 상단 CY−R−W/2=8.5, 하단
  CY+R·cos70°+W/2=119.5 ≤ 120. 트랙·레드라인·진행 아크를 **같은 두께**로 맞춰 진행분이 트랙을
  채우는 것으로 읽히게 했다(이전엔 트랙 2 위에 진행 4로 어긋났다).
- 레드라인은 별도 반지름 밴드가 아니라 **트랙 구간을 덮는다**(두꺼운 트랙 밖에 덧붙일 여유 없음).
  캡은 butt — round면 아크 끝을 넘어 부풀어 트랙 밖 혹처럼 보인다(실측 확인).
- 바늘 색은 라임이 아니라 text.primary — 두꺼워진 라임 진행 아크와 겹치면 바늘이 사라진다.
- 라벨을 2개(200·600)로 줄이고 반지름을 안쪽(40)으로 — 두꺼운 트랙 때문에 라벨이 안쪽으로
  들어오면서 주 눈금선이 글자를 관통했다(실측 확인).
- placeholder는 바깥에 typography를 유지한 채 **안쪽 span에서 em**으로 축소한다 — 바깥에 바로
  em을 주면 부모(16px) 기준으로 계산돼 글리프가 붕괴한다. 행 높이는 상위 Row가 고정하므로
  글리프만 줄여도 layout shift가 없다("동일 타이포" 규칙의 원래 목적은 시프트 방지였다).
- dim에서 바늘을 남기는 근거: 숨기면 빈 트랙만 남아 "고장난 계기판"으로 보인다. 값 없음은
  진행 아크 부재·중앙 placeholder·상태 라벨이 이미 전달하므로 시작점 바늘은 오해를 만들지 않는다.

### ALLOWED_PATHS
- `src/shared/ui/form-field/FormField.tsx` (라벨 위로·surfaceColor 제거)
- `src/features/measure-session/ui/PanoGauge.tsx` + 신규 `PanoGauge.test.tsx`
- `src/shared/ui/big-number/BigNumber.tsx`

### PUBLIC_CONTRACTS_TO_PRESERVE
- 게이지 viewBox 고정(layout shift 0) · 전체 aria-hidden(canonical은 BigNumber 텍스트) ·
  바늘 CSS 보간 100ms linear · reduced-motion 무효화 · F0_RANGE 상수 1곳 소비
- BigNumber sr-only "측정값 없음" 유지 · 폼 오류 결속(errorId) · 폼 공통 높이 48
- 값 없음에 0·이전 값을 표시하지 않는다(위장 금지)

### NON_GOALS
- 게이지 스윕 각도·대역·눈금 간격 변경 · 상태 tint 체계 변경
- 나머지 레퍼런스 영역(모터 상세 섹션, 다이얼로그, 탭 인디케이터) — 후속

### CHANGE_BUDGET
- 신규 의존성 0

### TEST_EVIDENCE
- Node 22 typecheck·lint·build·test 전부 exit 0, vitest 38건(게이지 신규 7건)
- **게이지 active 상태는 브라우저로 도달 불가**(마이크 없으면 measuring이 안 됨) → unit으로 고정:
  바늘 각도(min/중앙/max)·대역 밖 클램프·진행 아크 empty↔full·트랙/아크 동일 두께·aria-hidden·
  dim에서 아크 부재+바늘 최소 위치.
- 브라우저 실측: 트랙·레드라인 stroke-width 13 + round/butt 캡, 라벨 2개(200·600), 눈금 20개.
  스크린샷으로 라벨 관통·레드라인 혹 결함 2건을 잡아 수정 후 재확인.
- placeholder: 이전 99×142px 막대 → 축소·muted 확인(사용자 지적 재현 후 정정).

## v2.14 라운드 (2026-07-29 — 남은 레퍼런스 적용: 섹션 헤딩 · 목록 통일 · 다이얼로그)

### TARGET_BEHAVIOR
1. **모터 상세 섹션 구분** — "파노 추세"·"측정 기록 n건" 헤딩으로 블록을 끊는다.
   기록 행을 좌측(회차·일시)/우측(파노·rpm) 2열로 정렬한다.
2. **레이스 목록 통일** — RaceMotorList를 MotorRow와 같은 종류색 카드 패턴으로.
3. **ConfirmDialog** — Spotify 구조(중앙 정렬 제목·설명 → 풀폭 주 액션 → 텍스트 보조).
4. 탭 인디케이터는 **이미 구현돼 있어 작업 없음**(활성 탭 상단 24×2px 라임 바 — theme
   MuiBottomNavigationAction::before). 확인만 하고 건드리지 않았다.

### 설계 판단
- SectionHeading은 h2 타이포 토큰을 쓰지 않는다 — PageHeader의 h1보다 커지면 위계가 뒤집힌다.
  굵기로 구분한다(레퍼런스도 본문 크기 + bold). 장식 섹션(차트)은 `as="span"`으로 heading
  트리에서 빼 스크린리더 목차를 오염시키지 않는다(차트는 aria-hidden이고 canonical은 목록 텍스트).
- "측정 기록" 헤딩을 스크롤 영역 **안**에 둔다 — 고정 영역에 두면 기록 0건일 때도 남아
  "아직 기록 없음" 안내와 층이 중복된다.
- 기록 행 2열 정렬 근거: 이전에는 값·rpm이 한 줄에 이어 붙어 **일시 문자열 길이에 따라 값의 x
  위치가 행마다 흔들렸다**. 우측 정렬하면 값끼리 눈으로 비교된다(모터 카드와 같은 스캔 축).
- 행마다 테두리를 두르지 않고 구분선으로 한 목록으로 묶는다(레퍼런스 목록 패턴).
- RaceMotorList를 MotorRow와 같은 패턴으로 맞춘 근거: 같은 모터를 두 화면이 다르게 그리면
  동일 대상이라는 인식이 끊긴다. 우측 주값만 화면 관심사에 맞게 다르다(모터=최신 파노,
  레이스=마지막 레이스 파노).
- 다이얼로그: 이전에는 제목·설명이 좌측, 액션이 우측 하단 가로 배치라 시선이 좌상→우하로 튀었다.
  중앙 스택은 읽는 순서와 누르는 순서가 일치한다. 주 액션(파괴)이 위로 오지만
  **초기 포커스는 [취소] 유지** — Enter 오폭 방지 계약(§3.1)은 그대로다.

### ALLOWED_PATHS
- `src/shared/ui/section-heading/**` (신규)
- `src/pages/motor-detail/ui/MotorDetailPage.tsx`
- `src/features/race-record/ui/RaceMotorList.tsx`
- `src/shared/ui/confirm-dialog/ConfirmDialog.tsx`

### PUBLIC_CONTRACTS_TO_PRESERVE
- 고정 셸·스크롤 계약(v2.8) · 기록 정렬(오래된 순, 차트 X축과 일치 CD2-A1) · rolling 10
- ConfirmDialog 초기 포커스 [취소] · pending 중 닫기 차단 · 오류 인라인 Alert · role="alertdialog"
- 결과 라벨 중립색(DS-A5) · 값 없음 EM_DASH · 44px 타깃 · 화면 간 모터 순서 일치(INV-09)

### NON_GOALS
- 탭 바 재작업(이미 인디케이터 존재) · RaceRecordRow(레이스 기록 행) 레이아웃 — 별도 판단 필요
- 차트 종류·상호작용 변경

### CHANGE_BUDGET
- 신규 의존성 0

### TEST_EVIDENCE
- Node 22 typecheck·lint·build·test 전부 exit 0, vitest 38건 회귀 없음
- 브라우저(다크): 모터 상세 — "파노 추세"·"측정 기록 6건" 헤딩, 6행 값이 우측 정렬로 일치,
  구분선 렌더, 하단 [측정] 고정 유지
- 브라우저: 레이스 목록 3행(기록 있음 2 / 없음 1) — 종류색 카드·accent bar·2열,
  aria-label 3건이 의도한 문장으로 생성됨(기록 없음 행은 "레이스 기록 없음")
- 브라우저: ConfirmDialog 중앙 스택 확인 — 버튼 순서 [삭제, 취소], **초기 포커스 "취소"** 실측
- 콘솔 오류 0

---

## v2.15 — 레이스 입력 드로우어 가로 스크롤 제거 (bug-fix)

### TARGET_BEHAVIOR
- BottomSheet(레이스 입력/수정 시트)에 가로 스크롤이 생기지 않는다.

### 원인 (실측)
`paper.clientWidth 375 / scrollWidth 383` — **정확히 8px** 초과. 넘긴 요소는 시트 최상단의
스크린리더 전용 고지 `<Box role="status">`(자식 0개, `left 8 / width 375px / margin -8px`).

`RaceEntrySheet`의 sr-only 레시피가 **단위 없는 숫자**를 썼다. MUI `sx`는 이를 px로 읽지 않는다:
- `width: 1` → 0~1은 배수 → **100%**(=375px)
- `margin: -1` → **theme.spacing(-1) = -8px**

→ 폭 100% + 좌측 -8px ⇒ 오른쪽으로 8px 돌출. 같은 레시피의 나머지 3곳
(`BigNumber`·`MeasureStatusLabel`·`MeasurePage`)은 `'1px'`/`'-1px'` 문자열이라 정상이었고,
이 파일만 손으로 옮기며 단위가 빠졌다.

### 판단
증상만 덮는 `overflowX: 'hidden'`은 넣지 않았다 — 이후 실제 넘침이 생기면 콘텐츠가
**보이지도 닿지도 않게** 잘려 더 찾기 어려운 버그가 된다. 원인만 고친다.

4중 복제가 단위 실수를 허용한 구조라, 값이 동일한 나머지 3곳까지 `srOnlySx` 단일 출처로
합쳤다(값 변화 0 — 시각·낭독 동작 동일).

### ALLOWED_PATHS
- `src/shared/config/design-tokens.ts` (`srOnlySx` 신설)
- `src/features/race-record/ui/RaceEntrySheet.tsx` (버그 지점)
- `src/shared/ui/big-number/BigNumber.tsx`, `src/shared/ui/measure-status-label/MeasureStatusLabel.tsx`,
  `src/pages/measure/ui/MeasurePage.tsx` (복제 제거만)

### PUBLIC_CONTRACTS_TO_PRESERVE
- 왕복 복귀 sr 고지 1회(`role="status"`) · S1 visually-hidden h1 "측정"(layout-spec §1)
- BigNumber 값 없음 sr 문구 "측정값 없음" · MeasureStatusLabel live 단일 채널
- 시트 컴포넌트 공개 props·포커스 순서·pending 중 닫기 차단 전부 불변

### NON_GOALS
- 시트 레이아웃·필드 구성 변경 · `overflowX` 방어 코드 추가 · RaceRecordRow 레이아웃

### CHANGE_BUDGET
- 신규 의존성 0 · 동작 변경은 버그 지점 1곳(나머지는 상수 출처 이동)

### TEST_EVIDENCE
- Node 22 typecheck·lint·build·test 전부 exit 0, vitest 38건 회귀 없음
- 브라우저 375px: 입력 시트 `hScroll 0`(수정 전 8) · 넘친 요소 목록 0건 · sr Box 실측 1×1px
- 브라우저 320px(최협) × {입력, 수정} 모드 + 최대 길이 이름(30자) 조합 — 전부 `hScroll 0`
- `/`·`/motors`·`/race` 문서 레벨 가로 스크롤 0 · S1 h1 1×1 · 상태 live 1×1 · BigNumber sr 1×1
- 신규 error 리스너로 재검증: 시트 2모드 개폐 중 콘솔 오류 0건
  (앞선 `visuallyHiddenSx is not defined`는 import 추가 전 HMR 과도 상태의 흔적 — 모듈 타임스탬프로 확인)

---

## v2.16 — 목록 행 스와이프 액션 (ux-change, LD-4 번복)

### TARGET_BEHAVIOR
- 모터 목록(`/motors`)·레이스 기록 목록(`/race/:motorId`)의 행을 **왼쪽으로 밀면** 우측에
  [수정]·[삭제] 트레이가 열리고 그 자리에서 바로 실행할 수 있다.
- 방향은 사용자 결정에 따라 **왼쪽으로 밀기 → 액션 우측**(iOS 메일·Gmail 표준).

### 선행 결정 번복 (중요)
`layout-spec.md` LD-4는 스와이프를 **명시적으로 기각**했다(발견성 낮음 · 세로 스크롤 경합 ·
가시 버튼이 오입력 복구에 확실). 사용자 지시로 뒤집으면서 세 사유를 각각 막았고,
근거는 `layout-spec.md` LD-4′ 행과 `SwipeActions.tsx` 상단 주석에 남겼다.
스펙이 코드와 모순된 채로 남으면 다음 라운드가 오판하므로 문서를 함께 갱신했다.

### 판단해서 지킨 것
- **제스처의 최대 권한 = 트레이 열기.** 풀 스와이프 즉시 삭제는 만들지 않았다.
  모터 삭제는 cascade(측정·레이스 기록 동반 삭제)이고 그 건수는 목록 행에 보이지 않는다 —
  숨은 데이터를 제스처 하나로 지우는 경로는 두지 않는다. ConfirmDialog + 실측 건수 유지.
- **비제스처 경로 유지.** 트레이 액션은 항상 DOM에 있는 button이고 Tab 포커스 시 트레이가
  자동으로 열린다(보이지 않는 컨트롤에 포커스 금지 — WCAG 2.4.11). 아이콘 + 텍스트 라벨.
- **단일 열림을 목록이 소유**(`useSingleOpenRow`). 닫기는 자기 행일 때만 반영해
  A의 blur-close가 방금 열린 B를 닫는 순서 경합을 막았다.

### 부수 효과 — v2.14 미결 항목 해소
`RaceRecordRow`는 v2.14에서 "버튼과 값이 우측을 다퉈 별도 판단 필요"로 NON_GOAL이었다.
버튼이 트레이로 빠지면서 다른 목록과 같은 **좌측 식별 / 우측 수치** 2열이 됐다.

### ALLOWED_PATHS
- `src/shared/ui/swipe-actions/**` (신규 — SwipeActions·SwipeActionButton·useSingleOpenRow·테스트)
- `src/shared/ui/icons/{icons.tsx,index.ts}` (PencilIcon·TrashIcon 추가 — 파일 주석이 지정한 owner 경로)
- `src/features/motor-management/ui/{MotorRow,MotorList}.tsx`
- `src/features/race-record/ui/RaceRecordRow.tsx`
- `src/pages/motors/ui/MotorsPage.tsx` (edit 시트 + cascade 삭제 플로우 호스팅)
- `src/pages/race-detail/ui/RaceDetailPage.tsx` (단일 열림 소유)
- `_workspace/02_design/layout-spec.md` (LD-4′ 번복 근거)

### PUBLIC_CONTRACTS_TO_PRESERVE
- DnD 핸들 전용 활성화(§5.3) · 키보드 정렬(Space/↑↓/Esc) · 필터 중 정렬 잠금(SO-2)
- cascade 삭제 실측 건수 고지(CP-3) · ConfirmDialog 초기 포커스 [취소] · count 실패 시 dialog 미개방
- 행 본체 탭 → 상세 진입 · rolling 10(INV-20) · 기록 정렬(repository 보장, 재정렬 금지)
- 44px 타깃(REQ-NFR-003) · 색 단독 구분 금지(DS-A5)

### NON_GOALS
- `/race` 모터 카드(RaceMotorList) 스와이프 — 이 화면에는 모터 수정·삭제 의미가 없다
- 오른쪽 스와이프·양방향 · 풀 스와이프 즉시 실행 · 스와이프 애니메이션 고도화

### CHANGE_BUDGET
- 신규 의존성 0 (제스처는 pointer event로 직접 구현 — @dnd-kit은 이 용도에 부적합)

### TEST_EVIDENCE
- Node 22 typecheck·lint·build·test 전부 exit 0, vitest **55건**(38 → 55, 신규 17건)
- 신규 unit: 방향 락(가로/세로/오른쪽) · 임계 미달 · 핸들 제외 · gestureDisabled ·
  클릭 억제 · 열린 상태 탭=닫기 · 포커스 자동 열림 · ESC · 단일 열림 순서 경합 · 콘텐츠 불투명
- **실측으로 버그 2건 발견·수정**:
  ① `handlePointerUp`이 state(`dragOffset`)를 읽어, 빠른 플릭에서 마지막 move와 up이 한 프레임에
     합쳐지면 stale null을 보고 열리지 않았다 → `offsetRef`로 전환 + 회귀 테스트 고정
  ② 콘텐츠 레이어가 투명해 **닫힌 트레이가 카드(alpha 0.16 tint)를 통해 비쳐 수치와 겹쳤다**
     → 콘텐츠 레이어에 `background.default` 부여 + 불투명 invariant 테스트
- 브라우저(375px, 다크) 실측: 스와이프 열림 −112px · 단일 열림(다른 행 열면 이전 행 닫힘) ·
  세로 우세 제스처 무시 · cascade confirm "측정 기록 6건·레이스 기록 2건" + 초기 포커스 [취소] ·
  edit 시트 prefill(이름·종류) · 트레이 포커스 시 자동 열림/포커스 이탈 시 닫힘 · 행 내 Tab 순서
  [수정][삭제][핸들][본체] · 콘솔 오류 0
- **미검증(실기기 필요)**: 실제 손가락 터치의 관성·팜리젝션. preview는 합성 PointerEvent가
  React 위임 리스너에 도달하지 않아 핸들러 직접 호출로 검증했다(제품 로직은 동일 경로).

---

## v2.17 — 레이스 목록 종류 필터 + 필터 공유·영속 (ux-change)

### 요청 3건 중 2건은 이미 충족돼 있었다 (실측 확인)
- **"레이스 정렬 = 모터 정렬"** — 이미 동일하다. 두 화면이 같은 `motorQueries.summaries()`
  (sortOrder 오름차순 INV-08)를 소비한다. 브라우저 실측으로 두 화면의 행 순서 문자열이
  일치함을 확인했다. 새로 만든 것 없음.
- **"정렬 저장"** — 이미 저장된다. DnD 결과가 `reorderMotors`로 IndexedDB `sortOrder`에 영속.
- 없는 기능을 만들었다고 보고하지 않기 위해 두 항목은 코드가 아니라 실측으로 확인만 했다.

### TARGET_BEHAVIOR (실제 작업)
- `/race`에 모터 목록과 **같은** 종류 필터를 노출한다(같은 컴포넌트·같은 상태).
- 필터 선택은 두 화면이 **공유**하고 앱 재시작 후에도 **유지**된다(사용자 결정 2건).

### 설계 결정 — URL param 폐기
v2.4는 선택을 URL(`?kind=a,b`)에 뒀다. 두 요구가 그 설계를 무효화한다:
① 라우트가 다르면 URL도 달라 **공유가 성립하지 않는다** ② param은 세션과 함께 사라진다.
그래서 모듈 store(공유) + localStorage(영속)로 옮기고 param 경로를 **제거**했다 —
병행하면 같은 상태의 출처가 둘이 되어 어느 쪽이 이기는지 화면마다 갈린다.
잃는 것은 필터 딥링크뿐이고, 로컬 단일 사용자 앱이라 공유할 URL 개념이 없다.
v2.4가 param을 고른 실제 이유("상세 왕복 후 필터 유지")는 영속 store가 더 확실히 충족한다.

`useMotorKindFilter`의 **공개 형태는 그대로 유지**했다 — 저장 위치는 구현 세부다.
덕분에 MotorsPage는 무변경, MotorKindFilter도 무변경(완전 제어형)이다.

### 판단해서 지킨 것
- **localStorage는 외부 입력**이다(사용자 편집·구버전 잔존·다른 탭). rehydrate 경계에서
  MOTOR_KINDS로 검증하고 미지값은 버린다 — 잘못된 값 하나가 "모터가 없다"로 보이는
  빈 목록을 만들면 안 된다(D-10 정신). 순서도 MOTOR_KINDS로 정규화해 칩 순서가
  세션마다 흔들리지 않게 했다.
- **영속 필터의 최대 위험** = 재시작 시 아무것도 매칭하지 않는 상태로 시작하는 것.
  0건 분기를 전체 0건(EmptyState)과 분리하고 사유 문구 + [필터 해제]를 준다. 실측 확인.
- 필터는 view 상태이므로 도메인 저장소(IndexedDB)가 아니라 localStorage에 둔다.

### ALLOWED_PATHS
- `src/features/motor-management/model/kind-filter-store.ts` (신규) + `.test.ts`
- `src/features/motor-management/model/{use-motor-kind-filter.ts,index.ts}`
- `src/features/motor-management/ui/MotorKindFilter.tsx` (주석만 — 소비처 2곳 반영)
- `src/pages/race/ui/RacePage.tsx`

### PUBLIC_CONTRACTS_TO_PRESERVE
- `MotorKindFilter`·`useMotorKindFilter` 공개 형태 · MotorsPage 무변경
- 필터 중 DnD 정렬 잠금(SO-2) + 잠금 사유 인라인 고지 · 선택했지만 0건인 종류도 옵션 유지(해제 경로)
- 화면 간 순서 일치(INV-09·INV-08) · 정렬 진입점은 모터 목록 1곳(sortOrder 단일 소유)
- 44px 타깃 · 색 단독 구분 금지(filled/outlined + aria-pressed 이중화)

### NON_GOALS
- 정렬 기준 추가(파노순·이름순 등) — 요청은 "모터와 동일"이고 이미 동일하다
- `/race`에서의 재정렬 · 레이스 기록 목록(`/race/:motorId`) 필터 · 필터 딥링크 복원

### CHANGE_BUDGET
- 신규 의존성 0 (zustand `persist`는 기존 zustand 5.0.11의 서브모듈)

### TEST_EVIDENCE
- Node 22 typecheck·lint·build·test 전부 exit 0, vitest **63건**(55 → 63, 신규 8건)
- 신규 unit: 미지 종류 폐기 · 중복 제거 · MOTOR_KINDS 순서 정규화 ·
  비배열/null/문자열/객체/숫자배열 → 빈 선택 · toggle · 추가 선택 순서 · clear · 모듈 store 공유
- 브라우저 실측(다크):
  - `/race`에 필터 그룹 렌더(칩 4개 = 전체 + 종류 3)
  - **공유**: `/motors`에서 '하이퍼대시' 선택 → `/race` 행·선택 칩이 동일하게 반영
  - **영속**: `localStorage['mml-kind-filter-1'] = {"selected":["hyper_dash"]}`,
    전체 리로드 후에도 선택 유지
  - **sanitize**: `['m130','bogus_kind']` 주입 후 리로드 → `bogus_kind` 폐기, m130만 선택
  - **0건 분기**: "선택한 종류의 모터가 없습니다" + [필터 해제] 노출,
    EmptyState("모터를 먼저 등록하세요")로 위장되지 않음
  - 모터 화면 DnD 잠금 안내 유지 · [전체]로 해제 시 3행 복귀 · 콘솔 오류 0
- 알려진 잔여: sanitize는 **읽는 시점**에만 적용되므로 무효값이 localStorage에 남아 있을 수
  있다(다음 토글·해제 시 정리됨). 매 부팅 재기록은 하지 않았다 — 동작에 영향 없고
  원본 값이 남아 있어야 디버깅에 유리하다.

---

## v2.18 — 이름 자동 부여 + 측정 최소 5초 (ux-change / feature)

### TARGET_BEHAVIOR
1. 모터 추가 시 **이름은 옵션**. 비우면 `{종류 라벨} {n}`이 자동으로 붙는다.
   n은 아직 쓰이지 않은 가장 작은 1 이상 정수(이미 있으면 올린다).
2. 측정은 **연속 5초** 하한을 넘겨야 기록할 수 있고, 그 전에는 남은 시간이 보인다.

### 설계 결정
- **이름 생성은 command의 tx 안에서** 한다. `createMotor`가 이미 sortOrder 최대치 산출을 위해
  전 행을 읽으므로 같은 순회에서 이름까지 모아 **추가 IO는 0**이다. tx 밖에서 후보를 정하면
  탭 2개가 동시에 추가할 때 같은 번호가 두 번 붙는다.
- **번호는 빈 자리를 재사용**한다(max+1 아님). 추가·삭제를 반복하면 max+1은 '토크튠 37'처럼
  보유 수와 무관한 숫자를 남긴다 — 사용자가 매일 읽는 라벨이라 작은 수를 유지한다.
- 비교 대상은 **전체 이름**이다(같은 종류만 보지 않는다). 사용자가 다른 종류 모터에
  '토크튠 1'을 손으로 붙여둘 수 있다. 전역 이름 유일성은 불변식이 아니다(수동 중복 허용) —
  보장 범위는 "자동 부여가 기존 이름과 부딪히지 않는다"뿐이다.
- **부여될 이름을 폼에 미리 보여주지 않는다.** 실제 이름은 tx 안에서 다시 계산하므로
  다른 탭이 그 사이 추가하면 미리보기와 결과가 달라진다 — 지키지 못할 약속은 하지 않고
  규칙만 알린다("비워두면 종류에 맞춰 자동으로 붙습니다").
- 이름 옵션화는 **create 전용**이다. edit에서 비우면 기존 이름을 지우는 동작이 되고
  `updateMotorPatchSchema.name`은 이를 거부한다 — 폼 검증을 mode별로 분기했다.
- 저장 스키마(`motorSchema.name`)는 계속 `min(1)`이다. **빈 이름이 영속되는 경로는 없다** —
  옵션이 된 것은 command 입력이고, 이름 부여는 command 책임이다.
- **5초 하한은 연속이다**(누적 아님). 신호가 끊기면 0부터 다시 센다 — 끊긴 구간을 합치면
  "모터 회전이 안정됐다"는 하한의 의미가 사라진다.
- **왕복 자동 확정(RV-1)에도 같은 게이트를 걸었다.** 이 경로를 빼면 레이스 왕복이 여전히
  '너무 빠른' 값을 자동 기록해 요청의 핵심 문제가 그대로 남는다.
- 하한 대기 중 [기록]은 비활성이지만 **라벨에 남은 초를 노출**한다(`측정 중… 3초`) —
  이유 없는 비활성 금지 계약. persistence 불가는 이보다 우선한다(기다려도 풀리지 않는 사유라
  "기다리면 된다"는 잘못된 기대를 주지 않는다).
- create에서 **이름 input 자동 포커스를 제거**했다. 이름이 옵션이 된 지금 포커스를 주면
  모바일 키보드가 즉시 올라와 주 입력인 종류 그리드를 가린다 — "추가를 쉽게"와 어긋난다.
  edit은 이름 수정이 주 목적이라 유지.

### ALLOWED_PATHS
- `src/entities/motor/model/auto-name.ts` (신규) + `.test.ts`
- `src/entities/motor/model/schema.ts` (createMotorInputSchema name optional)
- `src/entities/motor/api/repository.ts` (createMotor — tx 내 이름 부여)
- `src/features/motor-management/ui/MotorFormSheet.tsx` (mode별 검증·라벨·포커스)
- `src/shared/config/domain.ts` (MIN_MEASURE_DURATION_MS)
- `src/features/measure-session/ui/measure-view.ts` (measuring.measuredMs)
- `src/features/measure-session/model/{machine.ts,session.ts}` (연속 지속시간 추적)
- `src/features/measure-session/ui/MeasureActionDock.tsx` (+ `.test.tsx`) — 5초 게이트·라벨
- `src/pages/measure/ui/MeasurePage.tsx` (RV-1 게이트)

### PUBLIC_CONTRACTS_TO_PRESERVE
- `motorSchema.name` min(1) — 빈 이름 영속 금지 · INV-04(구조 필드 불변) · INV-19(sortOrder 연속)
- INV-01(id 중복 add 실패) · AR-1(sortOrder = max+1 append)
- `isStable`은 내부 신호 — 렌더 분기·수치 잠금·announce 사용 금지, 소비처는 RV-1뿐
- Z1/Z2/Z3 존 높이 불변(layout shift 금지) · 무음 비활성 금지 · 44px 타깃
- edit 시트 이름 필수 · MotorFormSheet 공개 props 무변경

### NON_GOALS
- 전역 이름 유일성 강제(수동 중복은 계속 허용) · 기존 모터 이름 일괄 재부여
- 측정 하한을 사용자 설정으로 노출 · 경과시간을 Z1/Z2에 별도 표시(존 높이 계약 보호 —
  남은 시간은 Z3 버튼 라벨에만 담았다)

### CHANGE_BUDGET
- 신규 의존성 0

### TEST_EVIDENCE
- Node 22 typecheck·lint·build·test 전부 exit 0, vitest **76건**(63 → 76, 신규 13건)
- 신규 unit(이름): 첫 번호 · 한글 라벨 사용 · 번호 증가 · **빈 번호 재사용** · 다른 종류 무영향 ·
  수동 동일 문자열 충돌 회피 · 앞뒤 공백 정규화 · 무관 이름('토크튠'·'토크튠 10')이 1번을 막지 않음 ·
  30자 상한
- 신규 unit(5초): 하한 미달 → disabled + `waitRemainingMs` · **경계(정확히 5000ms) 포함 → 활성** ·
  초과 → 활성·남은시간 없음 · persistence 불가가 하한보다 우선
- 브라우저 실측(이름): 시트 라벨 `이름 (선택)`·`required=false`·헬퍼 "비워두면 종류에 맞춰
  자동으로 붙습니다"·이름 input 자동 포커스 없음(키보드 안 올라옴). 종류만 골라 저장 →
  DB에 **`토크튠 1`**, 한 번 더 → **`토크튠 2`**. 목록·필터 칩 반영 500ms 내(폴링 확인)
- 브라우저: 측정 화면 정상 렌더·콘솔 오류 0

### 미검증 (실기기 필요)
- **5초 게이트의 실제 동작 전체**. preview에는 마이크가 없어 `measuring` view에 도달하지
  못하고 `starting`/`no-permission`으로 귀결된다 — 경과시간 누적, 신호 끊김 시 0 리셋,
  버튼 라벨 카운트다운, 왕복 자동 확정 지연을 브라우저로 확인할 수 없었다.
  순수 함수 구간(`deriveMeasureAction`)은 unit으로 고정했고, **시간 추적(session.ts)과
  카운트다운 표시는 실기기 확인이 필요하다**.
- 조사 과정 메모: 초기 브라우저 시도에서 목록이 갱신되지 않아 invalidation 버그를 의심했으나,
  `button[type="submit"]`가 **종류 그리드 버튼**을 집은 내 테스트 방식 문제였다.
  정상 [저장] 경로는 500ms 내 반영되며 `motorKeys.root` prefix 무효화는 정상 동작한다.

---

## v2.19 — 게이지 범위 표기·아크 끝 정합·양 모드 가시성 (bug-fix)

### 사용자 신고 2건을 실측으로 판정했다
**① "측정값이 게이지 범위를 넘어서는 것 같다"**
클램프 자체는 정상이었다(`hzToDeg`·`hzToFraction` 양쪽 클램프, 엔진 `fMin/fMax`도 170/620으로
`F0_RANGE`와 일치 — 대역 밖 값은 애초에 나오지 않는다). 원인은 다른 두 곳이었다:
- **진행 아크의 round 캡**: 보이는 dash의 양 끝을 각각 `strokeWidth/2`(6.5단위 ≈ **10 Hz**)
  넘어 부풀어서 **라임 아크 끝이 바늘보다 앞서** 나갔다. r=73에서 6.5단위 ≈ 5.1°.
  → `butt`로 교정. 이 파일은 **레드라인에 대해 같은 버그를 이미 진단·수정("실측 확인")**
  해뒀는데 진행 아크만 round로 남아 있었다.
- **눈금 라벨이 200·600뿐**: 실제 대역은 170~620인데 끝점을 적지 않아 대역이 200~600으로
  읽혔다. 610 Hz 같은 정상값이 "600 라벨 밖"에 놓여 범위를 넘어선 것처럼 보인다.
  → 라벨을 **실제 끝점 170·620**으로 교체.

**② "라이트·다크 둘 다 가시성이 떨어진다"** — 실측 대비:
| 요소 | 이전 다크 | 이전 라이트 | 이후 다크 | 이후 라이트 |
|---|---|---|---|---|
| 트랙 | **1.18:1** | **1.09:1** | **4.65:1** | **3.08:1** |
| 보조 눈금 | **1.18:1** | **1.06:1** | 3.80:1 | 2.61:1 |
트랙이 `action.hover`(다크 8% / 라이트 4% 알파)였다 — 두께 13px 계기 트랙이 그 알파면
계기판이 아니라 빈 공간이다. 보조 눈금은 `divider`로 같은 문제.

### 설계 결정
- **고정 색 대신 `text.primary` + opacity.** text.primary는 모드에 따라 흑↔백으로 뒤집히므로
  알파 하나로 양 모드 대비를 함께 만족한다(모드별 하드코딩 불필요).
- `TRACK_OPACITY = 0.48`은 **실측으로 맞췄다.** 계산으로 0.42를 냈다가 라이트에서 2.61:1이
  나와 올렸다 — text.primary가 순수 흑이 아니라 rgb(28,27,31)이어서 합성이 예상보다 밝았다.
  계산이 아니라 실측이 기준이다.
- **dim(값 없음) 감쇠는 0.45 그대로 유지했다(올리지 않았다).** 게이지는 전경 텍스트의 장식
  배경층이고(`MeasureFigures`: absolute inset 0, aria-hidden), 값이 없는 상태에서만 긴 상태
  문구가 중앙에 놓여 **링을 가로지른다**. dim을 올리면 트랙이 그 문구와 겹쳐 읽기를 방해한다.
  measuring 상태의 전경은 중앙 큰 수치뿐이고 그 자리는 링 안쪽 빈 공간이라 충돌하지 않는다 —
  그래서 **active만 대비를 올리고 dim은 그대로** 두는 것이 맞다(실제로 0.6으로 올려봤다가
  스크린샷에서 문구와 겹치는 것을 확인하고 되돌렸다).
- 보조 눈금 2.61:1(라이트)은 3:1 미달이지만 **의도**다. 스케일 정보는 주 눈금(text.secondary
  5.74:1)과 끝점 라벨이 담당하고 보조 눈금은 밀도 장식이다 — 더 올리면 주 눈금과 위계가 섞인다.

### ALLOWED_PATHS
- `src/features/measure-session/ui/PanoGauge.tsx` (+ `PanoGauge.test.tsx`)

### PUBLIC_CONTRACTS_TO_PRESERVE
- 게이지 전체 `aria-hidden` 장식층 — canonical 수치는 BigNumber 텍스트 경로(DS-A15)
- viewBox 고정(200×120) → layout shift 0 · 220° 스윕 · 대역은 `F0_RANGE` 소비(하드코딩 금지)
- 대역 밖 값 끝점 클램프 · dim에서 바늘 유지(빈 트랙 = 고장난 계기판 금지)
- 바늘 색 = text.primary(라임 아크와 겹칠 때 사라짐 방지) · reduced-motion 0ms

### NON_GOALS
- 대역(F0_RANGE) 변경 · 게이지 스윕·크기 변경 · 라이트 모드 vignette 신설
  (다크 vignette은 텍스트 스크림이 아니라 **가장자리 어둡게**용 — 텍스트 가독성 장치가 아니다)
- 레드라인 구간(580~620) 변경

### CHANGE_BUDGET
- 신규 의존성 0 · 단일 파일 + 테스트

### TEST_EVIDENCE
- Node 22 typecheck·lint·build·test 전부 exit 0, vitest **80건**(76 → 80, 신규 4건)
- 신규 unit: 진행 아크 `butt` 캡 · 라벨이 끝점(170·620) · 대역 밖 클램프(하한 → dashoffset =
  dasharray 전체·상한 → 0) · 트랙이 전경색+opacity(0.3~1)
- 브라우저 실측(375px, **라이트·다크 양쪽**): 위 대비 표 수치 그대로. 라벨 `["170","620","Hz"]`,
  레드라인 캡 `butt`, dim group opacity 0.45
- 스크린샷 양 모드 — 트랙이 계기 링으로 읽히고 끝점 라벨·레드라인·바늘이 모두 식별됨

### 미검증 (실기기 필요)
- **active(measuring) 상태의 실제 모습.** preview에 마이크가 없어 `panoHz`가 null이라
  진행 아크·바늘 이동을 브라우저에서 볼 수 없다. 아크 캡·클램프는 unit으로 고정했고
  대비 수치는 dim 상태에서 측정한 트랙 색 자체(opacity 1 기준 환산)라 active 값과 동일하다.
  **라임 진행 아크가 강해진 트랙 위에서 충분히 구분되는지는 실기기 확인이 필요하다.**

---

## v2.20 — 권한 안내를 게이지 위 인라인 Collapse → Dialog (ui-change)

### TARGET_BEHAVIOR
[설정 방법 보기]가 게이지를 가리지 않고 **팝업(Dialog)** 으로 열린다.

### 원인
안내가 Z2 히어로 존 **안에서** Collapse로 펼쳐졌다. 그 존은 게이지를 장식 배경층(absolute
inset 0, aria-hidden)으로 깔고 전경에 수치를 얹는 구조라, 펼친 5줄이 게이지 눈금·라벨과
겹쳤다. v2.19에서 트랙 대비를 1.1:1 → 3:1↑로 올리자 그 충돌이 눈에 띄게 드러났다.

### 부수적으로 정리된 것
- Z2의 `scrollable` 특수 분기(`no-permission && permanent`일 때만 flex-start + overflow auto)를
  **삭제**했다. 존은 이제 어떤 view에서도 중앙 정렬 고정 높이다 — 상태별 레이아웃 분기 1개 감소.
- 안내가 길어져도 히어로 존 높이 계약(layout shift 0)에 영향이 없다.

### a11y 결정
트리거의 **`aria-expanded`·`aria-controls`를 제거**했다. 열리는 것이 인접 영역이 아니라
대화상자이므로 disclosure 패턴을 그대로 두면 스크린리더에 잘못된 구조를 알린다.
포커스 트랩·ESC·트리거 복귀는 MUI Dialog 기본. 파괴 액션이 없어 `alertdialog`가 아닌 `dialog`다.
열림 상태는 세션 store의 기존 `settingsHelpOpen`을 그대로 쓴다 — 새 상태를 만들지 않았다.

### ALLOWED_PATHS
- `src/features/measure-session/ui/PermissionHelpDialog.tsx` (신규) + `.test.tsx`
- `src/features/measure-session/ui/MeasureFigures.tsx` (인라인 안내·scrollable 분기 제거)
- `src/features/measure-session/ui/MeasureActionDock.tsx` (disclosure aria 제거)
- `src/features/measure-session/ui/index.ts` · `src/pages/measure/ui/MeasurePage.tsx` (배선)

### PUBLIC_CONTRACTS_TO_PRESERVE
- Z2 고정 높이·layout shift 0 · 게이지 aria-hidden 장식층 · 상태 문구 슬롯 1줄 유지
- `toggleSettingsHelp` 액션·`settingsHelpOpen` 상태 계약 무변경 · MeasureFigures 공개 props 무변경

### NON_GOALS
- 안내 문구 내용 변경 · 게이지 자체 변경(라이브러리 검토는 별건으로 리서치 진행)

### CHANGE_BUDGET
- 신규 의존성 0

### TEST_EVIDENCE
- Node 22 typecheck·lint·build·test 전부 exit 0, vitest **86건**(80 → 86, 신규 6건)
- 신규 unit: dialog role·접근 이름 · 닫힘 시 DOM 부재 · 안내 5항목 · [닫기] 콜백 ·
  **영구 거부 + 안내 열림 상태에서 MeasureFigures가 안내를 인라인 렌더하지 않음**(핵심 회귀 고정) ·
  안내 제거 후에도 게이지 SVG·상태 문구 유지
- 브라우저: 게이지 영역을 덮는 가시 텍스트가 의도된 placeholder("—") 1건뿐 —
  이전에 겹쳤던 안내 문구는 사라짐. 콘솔 오류 0

### 미검증 (실기기 필요)
- **실제 no-permission(영구) 상태에서 Dialog 열림.** preview에는 마이크 장치가 없어
  getUserMedia 거부가 2회 누적되지 않고 세션이 `starting`에서 멈춘다 —
  [설정 방법 보기] 버튼 자체가 노출되지 않아 실제 클릭 경로를 브라우저로 밟을 수 없었다.
  컴포넌트와 "존이 안내를 품지 않는다"는 계약은 unit으로 고정했다.

---

## v2.21 — 게이지: 라이브러리 검토 후 커스텀 유지 + 그라디언트 채움 + 0~700 스케일 (ui/tech)

### 라이브러리 결정 (실측 근거)
사용자 지시로 게이지를 라이브러리로 그리는 방안을 **실제 설치·구현·실측**했다.
- **react-gauge-component 2.0.29**: 눈금·라벨·밴드·바늘은 네이티브지만 ① **값 채움 아크 불가**
  (모델이 색구간+바늘) ② 트랙 기본 대비가 이전 버그(1.2~1.5:1) 재현 → color-mix 우회 필요
  ③ 측정 기반(ResizeObserver)이라 layout-shift-0 보장·헤드리스 테스트 불가 ④ +31KB gzip.
- **amCharts5**: bands·gradient-fill·needle 다 되지만 ① **freeware는 차트에 amCharts 로고
  강제**(제거는 개발자당 ~$180+ 상용) ② unpacked 25MB·트리셰이킹해도 ~200KB+ gzip.
- **결론: 커스텀 SVG 유지가 우위.** 사용자도 "커스텀 + 그라디언트 채움"을 선택. 라이브러리는
  롤백(pnpm remove)했고 번들은 +0으로 복귀. amCharts gradient-fill 데모의 룩만 SVG
  linearGradient로 진행 아크에 얹었다.

### TARGET_BEHAVIOR (사용자 req 5·6·7 + opt1)
- 진행 채움 아크에 라임 **그라디언트**(어두→밝) 적용 (opt1 — amCharts gradient-fill 룩)
- 게이지 스케일 **0~700, 100단위 라벨** (req5)
- 파노 주지표·rpm 보조 유지 + 중앙 수치를 게이지 **안쪽**에 두되 그래프와 **겹치지 않게** (req6)
- 트랙 색 강화 — "너무 흐림" 개선 (req7)

### 설계 결정
- **눈금 라벨을 아크 바깥 코너로 이동.** 0~700 100단위 8개를 안쪽에 찍으면 300·400이 12시
  근처에서 **중앙 파노 수치와 겹친다**. 라벨을 트랙 바깥으로 빼면 아크 내부가 비어 중앙 수치가
  겹침 없이 들어앉는다(req6 — "숫자는 안쪽, 그래프와 안 겹치게"를 동시 충족). 지오메트리 재튜닝:
  TRACK_R 73→58, STROKE 13→12, CY 88→84, LABEL_R = 트랙 바깥, 바늘 팁 60→46.
- **게이지 표시 스케일과 측정 유효 대역(F0_RANGE 170~620) 분리.** 게이지는 aria-hidden 장식이라
  판정에 관여하지 않으므로 0~700 표시가 유효성 검증(스키마)에 영향 없다. PanoGauge는 F0_RANGE를
  더 이상 import하지 않는다.
- 트랙 opacity 0.48→0.6(req7). text.primary라 모드별 흑↔백 반전 유지 → 양 모드 대비 함께 상승.
- 그라디언트는 `userSpaceOnUse` + 트랙 span 좌표에 고정 → dashoffset 변해도 색 위치 불변.

### ALLOWED_PATHS
- `src/features/measure-session/ui/PanoGauge.tsx` (+ `.test.tsx`)
- `package.json`·`pnpm-lock.yaml` (react-gauge-component 추가→제거, 순변화 0)

### PUBLIC_CONTRACTS_TO_PRESERVE
- 게이지 aria-hidden 장식층 · 고정 viewBox layout-shift-0 · 220° 스윕 · 대역 밖 끝점 클램프
- dim에서 바늘 유지 · reduced-motion 0ms · 바늘 중성색 · PanoGauge 공개 props(panoHz) 무변경

### NON_GOALS
- react-gauge-component/amCharts 도입(실측 후 기각) · 측정 유효 대역(F0_RANGE) 변경

### CHANGE_BUDGET
- 신규 의존성 0 (라이브러리 추가했다가 롤백 — 최종 순변화 0)

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest 82건, 번들 354KB gzip(라이브러리 전과 동일)
- PanoGauge unit 재작성(0~700): 0/350/700 각도, 클램프, 채움 최소0/최대참, 100단위 라벨, 그라디언트 stroke
- 브라우저(375px, 라이트·다크): 라벨 0~700이 아크 **바깥**, 중앙 placeholder가 라벨과 겹치지 않음,
  레드라인 600~700, 바늘 0 위치. layout-shift 0(고정 viewBox)
- **미검증(마이크 필요)**: measuring 상태의 그라디언트 채움 실제 모습·바늘 이동. 순수 기하는 unit 고정.

---

## v2.22 — 측정 기록: 상한 20·최근 상단·차트 회차 축 (req1·4)

### TARGET_BEHAVIOR
- 측정 기록 rolling 상한 10 → **20** (req4 후단)
- 측정 기록 목록은 **최근이 위로**(내림차순) (req1)
- 모터 상세 파노 차트 X축을 **시간축 → 측정 회차(1..N)** (req4)

### 설계 결정
- **상한은 상수만 변경.** `MEASURE_RECORD_LIMIT` 10→20. rolling·eviction은 상수를 참조하므로
  로직 무변경, INV-20 불변식(N건 유지·초과 시 최고령 삭제)도 경계값만 바뀐다.
- **목록만 표시 시점에 역순.** 데이터층(measuredAt asc)은 재정렬하지 않고, MotorDetailPage가
  표시할 때만 `.reverse()`. 회차 번호는 오래된 것 01 → 최신 = 총 건수(RaceRecordRow와 동일 규칙),
  최신 행이 가장 큰 번호로 맨 위. 차트는 여전히 asc(왼→오)라 목록과 방향이 반대다 —
  목록은 "최근 먼저 훑기", 차트는 "시간 흐름"으로 관심사가 다르다.
- **차트 X축 point scale(회차).** 측정 간격이 불규칙해 time scale은 점이 몰려 추세가 안 보였다.
  1..N 등간격 회차 축으로 "몇 번째 측정에서 어떻게 변했나"를 곧게 보인다. 측정 시각은 툴팁
  헤더("N회차 · 시각")에 남겨 맥락 유지. canonical 데이터는 여전히 기록 리스트 텍스트.

### ALLOWED_PATHS
- `src/shared/config/domain.ts` (MEASURE_RECORD_LIMIT)
- `src/pages/motor-detail/ui/MotorDetailPage.tsx` (목록 역순·번호)
- `src/features/motor-management/ui/PanoLineChart.tsx` (X축 회차)

### PUBLIC_CONTRACTS_TO_PRESERVE
- INV-20(rolling·최고령 eviction) · 데이터층 정렬(asc) 불변 · 차트 aria-hidden·canonical=리스트
- 기록 0건 안내 경로 · 고정 셸·스크롤 계약(v2.8)

### NON_GOALS
- rolling 로직 재작성 · 목록 데이터 정렬 변경(표시만 역순) · 차트 상호작용 확대

### CHANGE_BUDGET
- 신규 의존성 0

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest 82건
- 브라우저(다크): 기록 9건 — 목록 09(최신 380Hz) 상단 → 01(최古) 하단, 차트 X축 1~9 회차,
  Y 파노. "측정 기록 9건" 헤딩·하단 [측정] 고정 유지
- 미검증: rolling 20 경계(21번째 삽입 시 최고령 삭제)는 마이크 수집 경로라 실측 못 함 — INV-20
  로직은 상수 참조라 값만 바뀌고 기존 eviction 테스트 커버(엔티티 단위 테스트 존재)

---

## v2.23 — 측정 흐름: standalone 즉시 기록 + 모터 선택 시트에 새 모터 추가 (req2·3)

### TARGET_BEHAVIOR
- **standalone 측정([기록])은 5초 하한 없이 즉시** 기록 (req3). 왕복(모터·레이스) 자동 확정의
  5초 하한은 유지.
- 모터 선택 시트(측정 후 [기록] → 리스트)에 **[+ 새 모터 추가]** 버튼을 리스트 아래 노출 (req2).

### 설계 결정 (req3)
- v2.18의 5초 게이트가 `deriveMeasureAction`의 `measuring` 케이스에 있었는데, **이 record
  액션은 handoffReturn===null일 때만 도달**한다(왕복이면 위에서 back-to-origin으로 치환) —
  즉 게이트는 **원래부터 standalone에만** 걸려 있었다. 그 케이스에서 measuredMs 판정을 제거하니
  standalone이 즉시 기록으로 바뀐다. 왕복 자동 확정의 하한은 별도로 MeasurePage의
  `useRaceAutoCollect`(isStable && measuredMs≥MIN)가 소유하므로 **그대로 유지**된다.
- 부수 정리: MeasureAction의 `waitRemainingMs`·라벨 카운트다운·MIN_MEASURE_DURATION_MS import 제거.

### 설계 결정 (req2)
- `onRequestRegister`는 이미 존재(empty 상태 전용). 리스트가 있을 때도 하단에 같은 핸들러의
  버튼을 노출한다 — useCollectFlow의 시트 교체 오케스트레이션(등록 성공 시 그 모터로 즉시 수집)을
  재사용하므로 새 배선 없음. pending 중 disabled(single-flight).

### ALLOWED_PATHS
- `src/features/measure-session/ui/MeasureActionDock.tsx` (+ `.test.tsx`)
- `src/features/collect-measure/ui/MotorPickSheet.tsx`

### PUBLIC_CONTRACTS_TO_PRESERVE
- 왕복 자동 확정 5초 하한(MeasurePage) 불변 · SC2-A3 스냅샷 고정 · single-flight
- MeasureActionDock 슬롯 단일 노드·자리 이동 없음 · MotorPickSheet 공개 props·onRequestRegister 계약

### NON_GOALS
- 왕복 하한 제거(standalone만 대상) · 새 모터 추가 흐름 신규 오케스트레이션(기존 재사용)

### CHANGE_BUDGET
- 신규 의존성 0

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest 79건(dock 5초 게이트 테스트 3건 제거·즉시 활성 테스트로 대체)
- dock unit: standalone은 측정 시간 무관 즉시 활성(100ms·800ms도 활성), persistence 불가만 비활성
- 미검증(마이크 필요): 실제 measuring 상태에서 [기록] 즉시 동작·MotorPickSheet 표시.
  순수 산출은 unit 고정, [새 모터 추가]는 기존 onRequestRegister 경로 재사용(기존 empty 경로 검증됨)

---

## v2.24 — 레이스 기록 초기화 버튼 하단 고정 + 스타일 통일 (req8)

### TARGET_BEHAVIOR
[레이스 기록 초기화]를 모터 상세 [측정]처럼 **하단 고정**하고 버튼 스타일을 통일.

### 설계 결정
- RaceDetailPage를 MotorDetailPage와 **동일한 고정 셸**로 재구성: `pageShellSx`(뷰포트 고정) +
  기록 목록 `scrollAreaSx`(overflow) + `footerSx`(하단 고정·헤어라인 상단). 이전에는 초기화가
  목록 흐름 맨 끝에 있어 기록이 많으면 스크롤 끝까지 내려야 보였다.
- 버튼 크기 통일: minHeight 44→**48**, full-width(측정 버튼과 동일).
- **톤은 통일하지 않고 error outlined 유지.** [측정]은 라임 primary(안전한 주 행동)인데,
  전체 레이스 기록을 지우는 파괴 액션에 같은 라임을 입히면 "안전한 주 행동"으로 오독된다
  (이전 라운드 textError에서 겪은 오폭 위험과 동일). req8의 "스타일 통일"을 **위치·크기 통일 +
  파괴 톤 유지**로 해석했다. 확정은 여전히 ConfirmDialog가 소유(범위 고지 불변 — v2.3).

### ALLOWED_PATHS
- `src/pages/race-detail/ui/RaceDetailPage.tsx` (고정 셸 재구성)
- `src/features/race-record/ui/ResetRecordsBlock.tsx` (버튼 48px)

### PUBLIC_CONTRACTS_TO_PRESERVE
- 초기화 범위(이 모터 레이스 기록만 — 측정·타 모터 유지, v2.3) · ConfirmDialog 고지·pending·오류
- 기록 목록 정렬(최신순)·스와이프 트레이·왕복 복원 · not-found·로딩·오류 분기 · 탭 바 높이 계산

### NON_GOALS
- 초기화 톤을 라임 primary로 변경(파괴 톤 유지) · 초기화 범위·확정 흐름 변경

### CHANGE_BUDGET
- 신규 의존성 0

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest 79건
- 브라우저(375px, 다크): [레이스 기록 초기화]가 하단 고정(bottom 744/812, 탭바 위)·full-width·48px,
  헤어라인 상단, 기록 목록은 그 위에서 스크롤. 모터 상세 [측정] 푸터와 동일 배치

---

## v2.25 — 게이지: 수치 겹침 해소 + 대비/메인색 + 프레임 제거 + 확대 (req1·2, 실기기 피드백)

### 원인 (실기기 measuring 스크린샷)
- **req1 파노가 게이지를 덮음**: 파노 수치가 `rpmValue`(clamp 최대 **120px**)라 게이지 아크 위로
  넘쳐 300·400 라벨·아크를 가렸다. (마이크가 없어 로컬에서 못 보던 measuring 상태 — 사용자
  실기기 스크린샷으로 확인)
- **req2 흐릿·가시성 낮음**: 파노·rpm 색이 `valueFg`(smoke200/gray600, 흐린 회색).

### 변경
- 파노 수치 `rpmValue(≤120px)` → `guideValue(≤56px)`로 축소. 눈금 라벨은 이미 아크 바깥(v2.21)
  이라 축소한 수치가 아크 **내부 빈 공간**에 들어앉는다(겹침 해소).
- 파노 색을 **메인 라임**(`visual.fg`)으로(사용자: "메인 색으로"). rpm은 `text.primary`
  고대비 중립색(파노=라임과 위계 구분).
- **게이지 주변 프레임(bg·border·radius) 제거**(사용자). 게이지가 페이지 배경 위에 그대로.
- 게이지 **full-bleed 확대**: `mx:-2`로 페이지 좌우 padding 상쇄 → 화면 폭까지(사용자: "더 크게").
- 게이지는 여전히 존 전체 오버레이(크게 유지) — de-overlay 시도했다가 사용자 "크게 유지"로 되돌림.

### ALLOWED_PATHS
- `src/features/measure-session/ui/MeasureFigures.tsx`

### PUBLIC_CONTRACTS_TO_PRESERVE
- 존 고정 높이·layout-shift 0 · 게이지 aria-hidden 장식 · canonical 수치=BigNumber 텍스트
- 파노 주지표/rpm 보조 위계(M-4) · 값 없음 "—" + sr "측정값 없음"

### NON_GOALS
- 게이지 스케일·색(트랙/레드라인) 변경 · 존 높이 토큰 변경

### CHANGE_BUDGET
- 신규 의존성 0 · 단일 파일

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest 79건
- 브라우저(다크, 대기 상태): 게이지 프레임 없음·full-bleed로 확대됨, 중앙 placeholder "—"가
  아크 내부에 위치(겹침 없음), 존 내 클리핑 없음
- **미검증(마이크 필요)**: measuring 실제 라임 수치 "375.2"가 아크를 안 덮는지·rpm 가시성.
  파노 120→56px 축소 + 라벨 아크 바깥이라 아크 내부에 들어가도록 계산했으나 폭 여유가 크지 않아
  실기기 확인 필요(넘치면 guide보다 작은 커스텀 사이즈로 한 단계 더 축소 가능)

---

## v2.26 — 모터 정렬 3종 + DnD 수동정렬 제거 + 버튼 통일 + 게이지 미세조정 (req4·3, 실기기 피드백)

### TARGET_BEHAVIOR
- **req4 모터 메뉴 정렬 추가**: 최근 등록순(기본)·파노 높은순·이름순. 선택은 영속(재시작 유지).
- **DnD 수동 정렬 제거**(사용자 결정 "드래그 제거, 정렬 3종만"): 손 끌기 재배치를 없애고
  정렬 컨트롤로 대체. 데이터층 `sortOrder`는 그대로 두고 **뷰 계층**에서만 표시 순서를 바꾼다.
- **req3 버튼 스타일 통일**: 측정 후 모터 선택 시트의 [+ 새 모터 추가]를 `outlined`→`contained`로
  (EmptyState 등록 버튼과 동일 위계 — 라임 contained).
- **게이지 미세조정**(실기기 피드백 연속): 트랙 더 얇게, 게이지 더 크게, 100단위 라벨 축소·
  아크에서 더 띄우기, 600~700 레드라인 진하고 밝게.

### 원인·해석
- 정렬을 **뷰 계층**으로 둔 근거: 종류 필터(v2.17)와 동일 원칙. 데이터 `sortOrder`(INV-08 asc)를
  건드리면 다른 화면·측정 순서 계약이 흔들린다. 정렬은 kind-filter처럼 localStorage 영속.
- DnD 제거로 `@dnd-kit/*` 3종이 dead dep이 됨(소스 참조 0, 번들 트리셰이크로 이미 제외).
  매니페스트 정리는 온라인 install 필요(오프라인 store에 css.escape 없어 prune 실패) →
  **별도 백그라운드 작업으로 분리**(락파일 안정성 우선, 번들은 이미 깨끗).

### ALLOWED_PATHS
- `src/features/motor-management/model/use-motor-sort.ts` (신규 — 정렬 store+비교자+훅)
- `src/features/motor-management/model/use-motor-sort.test.ts` (신규 — 6건)
- `src/features/motor-management/model/index.ts` (public API 추가)
- `src/features/motor-management/ui/MotorList.tsx` (DnD 제거 — DndContext/onReorder 삭제)
- `src/features/motor-management/ui/MotorRow.tsx` (DnD 제거 — useSortable/핸들/transform 삭제)
- `src/pages/motors/ui/MotorsPage.tsx` (useReorderMotors 제거 → useMotorSort + SegmentControl 배선)
- `src/features/collect-measure/ui/MotorPickSheet.tsx` (버튼 contained)
- `src/features/measure-session/ui/PanoGauge.tsx` (게이지 미세조정)

### PUBLIC_CONTRACTS_TO_PRESERVE
- 데이터층 `sortOrder` asc(INV-08) 불변 — 정렬은 표시 전용 · 종류 필터 → 정렬 순서로 적용
- 행 탭→상세·스와이프 수정/삭제 트레이·cascade 삭제 고지(CP-3) · 필터 0건 경로(EmptyState와 구분)
- 게이지 aria-hidden 장식·layout-shift 0·스케일 0~700(표시)/F0 170~620(검증) 분리 · M-4 위계

### NON_GOALS
- 데이터층 정렬 순서 변경 · 정렬을 서버/영속 데이터에 반영 · 삭제/초기화 톤 변경

### CHANGE_BUDGET
- 신규 의존성 0 (오히려 dnd-kit 제거 예정 — 별도 작업) · 신규 파일 2(정렬 훅·테스트)

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest **85건**(정렬 6건 추가: recent/name/pano/불변 + store 기본·setSort)
- 브라우저(375px, 다크) `/motors`: 정렬 세그먼트 3종 노출, 드래그 핸들 **0개**(DnD 제거 확인),
  - 최근 등록순(기본): createdAt desc
  - 이름순: ko locale asc(렙튠<아토믹<토크튠<하이퍼<HyperDash)
  - 파노 높은순: 415>380>335, 측정 없는 모터 뒤로 · 선택 영속(`mml-motor-sort-1`={sort:pano})
- **미검증(마이크 필요)**: 게이지 미세조정(트랙 5px·레드라인 opacity 1·라벨 6.5px·간격 13)의
  measuring 실제 표시 — 대기 상태 렌더는 정상, 실기기 확인 대상
