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
