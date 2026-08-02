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

---

## v2.27 — 정렬 컨트롤 정제: 종류 필터와 동일 톤의 둥근 세그먼트 (실기기 피드백)

### TARGET_BEHAVIOR
- v2.26에서 정렬에 쓴 폼용 풀폭 SegmentControl(각진 0 모서리·48px·큰 라임 블록)이 바로 위
  종류 필터(pill 칩 999·44px)와 **이질적·육중·촌스럽다**는 피드백.
- 사용자 결정: "위 필터와 **동일한 크기**의 버튼 그룹, **왼쪽·오른쪽 바깥 모서리 라운딩**"
  → iOS식 둥근 세그먼트로 정제(단일선택·3옵션 가시성은 유지).

### 원인·해석
- 앱은 의도적으로 **각진 편집 톤**(세그먼트·버튼 radius 0, 컷코너)이나 **종류 필터 칩만 pill(999)**.
  정렬을 각진 세그먼트로 두니 필터와 톤이 어긋났다. 정렬 컨트롤을 칩과 같은 pill 언어로 맞춘다.
- 공유 SegmentControl은 폼(종류 10택·등급 등)에서도 쓰이고 **체크 아이콘·formControlHeight(48)
  ·borderless** 계약이 있다. 폼 사용처를 안 건드리게 **opt-in `rounded` prop**만 추가(기본 false).

### 변경
- `SegmentControl`에 `rounded?: boolean` 추가. true면:
  - 그룹 `borderRadius: 999` + `overflow: hidden`, 첫 버튼은 좌측·끝 버튼은 우측 코너만 999
    (안쪽 구분선은 직각 유지 — 둥근 세그먼트). 선택 bg가 둥근 모서리를 넘지 않게 클립.
  - 버튼 높이 48→**44**로 낮춰 위 종류 필터 칩(minHeight 44)과 **동일한 크기**로 정합.
- `MotorsPage` 정렬 컨트롤에 `rounded` 전달. 나머지(3옵션·영속·단일선택·onChange 계약)는 무변경.
- 선택 3중 표시(라임 bg + weight 800 + 체크 아이콘)는 유지 — 색 단독 구분 금지(REQ-NFR-003)·
  forced-colors 대응 계약 보존.

### ALLOWED_PATHS
- `src/shared/ui/segment-control/SegmentControl.tsx` (rounded prop 추가 — 순수 additive)
- `src/pages/motors/ui/MotorsPage.tsx` (정렬 컨트롤에 rounded 전달)

### PUBLIC_CONTRACTS_TO_PRESERVE
- SegmentControl 기존 계약: allowDeselect·wrap·error·borderless·disabled·aria-label — 무변경
- 폼 사용처(MotorKindSelect 등)는 rounded 기본 false라 시각·높이 불변 · 정렬 3옵션·영속·단일선택

### NON_GOALS
- 정렬 상호작용/로직 변경 · 폼 세그먼트 톤 변경 · 종류 필터 변경 · 체크 아이콘 제거(a11y 계약)

### CHANGE_BUDGET
- 신규 의존성 0 · 2파일(공용 prop 1 + 배선 1) · 로직/데이터 무변경(순수 시각)

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest 85건
- 브라우저(375px, 다크) `/motors`: 정렬 그룹 radius=칩 radius(999 pill), 첫 버튼 좌측만·끝 버튼
  우측만 라운딩(999/0, 0/999), overflow hidden, **그룹 높이 44 = 칩 높이 44**로 정합.
  정렬 전환 동작 정상(이름순 클릭→ko locale 재정렬), 필터×정렬 함께 동작.

---

## v2.28 — 게이지 오버레이 수치 배치: 파노 하강 + rpm을 바늘 축 아래로 (실기기 피드백)

### TARGET_BEHAVIOR
- 사용자 실기기 피드백 3연속: (1) 파노 위치를 더 아래로, (2) rpm을 바늘 축(hub)으로 내려,
  (3) rpm만 더 아래로 → 최종: **파노는 아크 내부 상단-중앙, rpm은 hub보다 더 아래(아크 하단 개구부)**.

### 원인·해석
- 오버레이 수치 컬럼이 존 세로 **중앙 정렬**이라 파노(86px)·rpm(135px) 모두 게이지 기하학과
  어긋나 있었다(hub=존 높이의 0.711=160px). 게이지 hub 좌표에 수치를 정렬해 "계기판" 느낌을 살린다.
- 마이크가 없어 measuring 실측은 불가하나, 대기 상태 placeholder("—")가 **행 높이 고정**이라
  measuring 숫자와 동일 위치에 렌더된다 → 브라우저에서 hub 대비 픽셀 위치를 정확히 실측해 조정.

### 변경 (모두 뷰포트 비례 clamp — 존 높이 clamp(200~272px,60vw)와 breakpoint 정합)
- 수치 컬럼 전체를 `translateY(clamp(22px,6.6vw,30px))` 하향 → 파노 86→**111px**(아크 내부 중앙),
  rpm 135→160px(=hub). (hub는 존 높이의 0.111 아래 = 60vw×0.111≈6.6vw)
- rpm 행에만 추가 `offsetY = clamp(44px,12vw,56px)` 하향(transform이라 파노/Hz 레이아웃 무영향)
  → rpm 160→**205px**(hub보다 45px 아래, 아크 하단 개구부, 존 바닥에서 20px).
- `Row`에 optional `offsetY` prop 추가(순수 additive — 다른 소비처 무변경).
- 모든 view 상태에 동일 이동 적용 → **상태 전환 layout-shift 0** 유지.

### ALLOWED_PATHS
- `src/features/measure-session/ui/MeasureFigures.tsx` (오버레이 컬럼 translateY + Row offsetY prop)

### PUBLIC_CONTRACTS_TO_PRESERVE
- 존 고정 높이·layout-shift 0 · 게이지 aria-hidden 장식 · canonical 수치=BigNumber(sr 경로)
- 파노 주지표(라임)/rpm 보조 위계(M-4) · 값 없음 "—" + sr "측정값 없음" · aria-live 없음

### NON_GOALS
- 게이지 스케일·색·두께 변경 · 존 높이 토큰 변경 · 파노/rpm 크기·색 변경(위치만)

### CHANGE_BUDGET
- 신규 의존성 0 · 단일 파일 · 순수 시각(로직·데이터·테스트 무변경)

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest 85건
- 브라우저(375px, 다크) `/`(측정): 존 h=225px, hub=160px(0.711). 파노 placeholder=111px(아크 중앙),
  rpm placeholder=205px(hub+45, 바닥-20). 파노는 컬럼 이동 전후 rpm 추가 이동에도 111px로 불변.
- **미검증(마이크 필요)**: measuring 실제 숫자 표시 — placeholder와 행 높이 동일이라 같은 위치 보장,
  실기기 확인 대상.

---

## v2.29 — 게이지 색 밝게 + 근접 감지 게이트 완화 (실기기 피드백)

### TARGET_BEHAVIOR
- **req1**: 게이지 트랙·눈금·눈금 숫자 색을 더 밝게.
- **req2**: "모터에 많이 가까이 대야만 측정됨" → 소리 감지 범위(근접 RMS 게이트) 완화.

### 원인·해석
- req1: 트랙 opacity 0.6·보조눈금 0.5로 낮고, **주 눈금·라벨 숫자가 text.secondary(어두운 색)**라
  전반적으로 흐렸다.
- req2 (조사 결과): `audio-analysis/types.ts`의 `proximityRms: 0.008`이 근접 게이트다
  (`analyze-frame.ts:80` — `rms < max(silenceRms, proximityRms)`면 분석 생략 → weak-signal).
  음압 RMS는 거리에 반비례(∝1/거리)라 이 절대 하한이 "가까운 모터 하나"를 강제한다. 0.008이
  높아 통상 사용 거리의 신호가 하한 미만이라 매우 가까이 대야만 통과.

### 변경
- PanoGauge: `TRACK_OPACITY 0.6→0.8`, `MINOR_TICK_OPACITY 0.5→0.7`, 주 눈금 stroke
  `text.secondary→text.primary`, 눈금 라벨 fill `text.secondary→text.primary`. dim(대기 0.45)은 유지.
- audio-analysis `proximityRms 0.008→0.004`: 하한 절반 ≈ 검출 거리 2배. comb 채점이 최강
  후보를 채택하므로 여러 모터가 하한을 넘어도 가장 크게 들리는(가까운) 모터가 우선. 실기기
  튜닝 값 — 더 넓히려면 0.003/0.002.

### ALLOWED_PATHS
- `src/features/measure-session/ui/PanoGauge.tsx` (색 상수·눈금·라벨 색)
- `src/shared/lib/audio-analysis/types.ts` (DEFAULT_TUNING.proximityRms)

### PUBLIC_CONTRACTS_TO_PRESERVE
- 게이지 aria-hidden 장식·layout-shift 0·스케일 0~700 · dim(대기) 동작
- 엔진 계약(silenceRms·voicing 게이트·comb 채점·Viterbi)·fixture 판정(진폭 ≥0.4 RMS) 불변
- weak-signal↔measuring 전이·수치 null 불변식(INV-13)

### NON_GOALS
- 게이지 형상·스케일 변경 · 엔진 알고리즘/다른 튜닝 상수 변경 · silenceRms 변경

### CHANGE_BUDGET
- 신규 의존성 0 · 2파일 · req1 순수 시각, req2 단일 상수(fixture·테스트 무영향)

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest 85건(오디오 fixture 포함 — proximityRms 0.004는
  fixture 진폭 ≥0.4에 영향 없음, 전건 통과)
- 브라우저(375px, 다크) `/`: 트랙 stroke=text.primary(rgb 244,245,242)·opacity 0.8, 주눈금
  stroke=primary·opacity 1, 보조눈금 opacity 0.7, 라벨 fill=primary. 대기 dim 0.45 유지.
- **미검증(마이크 필요)**: req2 실제 감지 거리 개선 — 런타임 튜닝 값이라 실기기 확인 대상.
  더 가까워도/멀어도 되는지 실사용 피드백으로 0.003/0.002 추가 조정 가능.

---

## v2.30 — 탭 바 아이콘 교체: 측정=게이지, 모터=모터 (사용자)

### TARGET_BEHAVIOR
- 측정 탭 아이콘 마이크 → **게이지(speedometer)**, 모터 탭 목록 → **모터(캔모터)**, 레이스=번개 유지.
- 사용자 아이콘 추천 후 선택: 측정=게이지, 모터=엔진/모터, 레이스=번개.

### 원인·해석
- 측정: 마이크(입력 장치)보다 파노 타코미터 게이지와 은유가 일치 → "측정 결과" 직관 전달.
- 모터: 기어(설정 혼동)·번개(레이스 중복) 회피하고 미니카 캔모터 실루엣으로 도메인 정합.

### 변경
- `icons.tsx`: `GaugeIcon`(Material "speed" filled)·`MotorIcon`(캔모터 — 바디+베인 슬롯 3개
  evenodd 홀+좌측 단자 2개+우측 샤프트) 신설. 규격 24×24·currentColor·aria-hidden 유지.
- `icons/index.ts`: 두 아이콘 export 추가.
- `Routes.tsx`: TAB_ITEMS 측정 Icon MicIcon→GaugeIcon, 모터 ListIcon→MotorIcon. 미사용
  로컬 `ListIcon` 정의 제거 + `MicIcon` import 제거(BoltIcon·IconProps는 유지). 레이스 무변경.
- 헤더 마이크(측정 상태 라벨)는 탭과 무관해 유지 — scope 밖.

### ALLOWED_PATHS
- `src/shared/ui/icons/icons.tsx` · `src/shared/ui/icons/index.ts` · `src/app/routes/Routes.tsx`

### PUBLIC_CONTRACTS_TO_PRESERVE
- 아이콘 규격(24×24·currentColor·aria-hidden, 의미는 병행 라벨) · 탭 3종·라우트·활성 표시
- MicIcon export 유지(다른 소비처 대비) · IconProps 계약

### NON_GOALS
- 헤더 마이크 상태 아이콘 변경 · 레이스 아이콘 변경 · 탭 구조/라벨 변경

### CHANGE_BUDGET
- 신규 의존성 0 · 3파일 · 순수 시각(로직·데이터·테스트 무변경)

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest 85건
- 브라우저(375px, 다크) `/`: 탭 측정=게이지(1 path, 라임 활성)·모터=캔모터(3 path)·레이스=번개(1 path),
  콘솔 오류 0. 게이지 니들·눈금 정상 렌더.

---

## v2.31 — 레이스 전압 추천 (하이브리드: 휴리스틱 + LLM 코치) + 목표 팝업 (AI_MODE, 사용자)

### TARGET_BEHAVIOR
- 2번째+ 레이스 기록 입력 시 **목표 선택 팝업**(완주/안정/속도, 직전 goal 프리필) → 입력 화면 진입 시
  **전압 자동 추천**(목표 + 과거 레이스 + 현재 파노 기반) + 근거 표시.
- 추천기 = **하이브리드**: Vercel 서버리스 `/api/recommend-voltage`(Claude Haiku 4.5)가 주,
  실패·오프라인·키없음이면 **결정론적 휴리스틱 폴백**. 단독 사용·Vercel 배포·개인 API 키(사용자 결정).

### CHANGE_MODE / 아키텍처 영향
- 앱 최초의 **네트워크 호출 + 서버리스 백엔드**(기존 순수 client+IndexedDB, HTTP 0). 정적→하이브리드.
- AI_MODE: LLM 호출. 입력이 숫자+enum이라 인젝션 표면 작음. 서버가 출력 전압을 스키마로 클램프.
  단독 사용이라 denial-of-wallet 위험 낮음(요청 크기 상한·짧은 타임아웃으로 보수적 방어).

### ALLOWED_PATHS
- `src/shared/config/domain.ts` (RACE_GOALS·라벨)
- `src/entities/race-record/model/schema.ts` + `types.ts` (optional goal 필드, read-lenient)
- `src/entities/race-record/api/repository.ts` (goal 저장·보존)
- `src/shared/lib/voltage-advisor/*` (신규 — 휴리스틱 순수 함수 + 테스트)
- `src/features/race-record/api/recommend-voltage.ts` (신규 — 서버리스 호출 + 휴리스틱 폴백)
- `src/features/race-record/model/use-race-entry.ts` (goal·추천 전압·근거 배선)
- `src/features/race-record/ui/RaceEntrySheet.tsx` (근거·추천 배지 표시)
- `src/features/race-record/ui/RaceGoalSheet.tsx` (신규 — 목표 선택 팝업)
- `src/pages/race-detail/ui/RaceDetailPage.tsx` (팝업 오케스트레이션 + history 주입)
- `api/recommend-voltage.ts` (신규 — Vercel 서버리스, Anthropic REST fetch, Haiku 4.5)
- `vercel.json` (SPA rewrite에서 /api 제외)
- `.env.*`·`vite-env.d.ts` (VITE 공개 변수 불필요 — 키는 서버 전용 env, 클라 번들 미포함)

### PUBLIC_CONTRACTS_TO_PRESERVE
- 레이스 스키마 기존 필드·검증(voltage 0.1~9.9·result·panoHz 불변) · read-lenient rehydrate(INV-16)
  — goal은 optional이라 기존 데이터 무손상 · 전압 최종 검증은 여전히 voltageSchema 소관
- 오프라인 동작(추천 실패 시 휴리스틱 폴백으로 기능 유지, 무음 실패 금지) · single-flight 제출

### NON_GOALS
- 키를 클라이언트 번들에 노출 · result(완주/이탈)를 goal로 대체 · 기존 측정/모터 기능 변경
- 다중 사용자·레이트리밋 인프라(단독 사용 전제)

### CHANGE_BUDGET
- 신규 의존성 0 (Anthropic은 REST fetch로 호출 — SDK 미설치) · 서버리스 1함수
- goal은 optional 필드라 마이그레이션 스크립트 불필요(read-lenient)

### TEST_EVIDENCE (계획)
- 휴리스틱 순수 함수 단위테스트(목표별 기준선·과거 보정·파노 보정·범위 클램프)
- goal optional 스키마 rehydrate(구 데이터 goal 없음 통과) 테스트
- 브라우저: 2번째 입력 팝업 노출·목표 선택→전압 프리필+근거(로컬은 휴리스틱 경로), 콘솔 오류 0
- 실제 AI 경로는 Vercel 키 설정 후 활성(로컬 정적 서버는 서버리스 미실행 → 폴백 검증)

### v2.31 Stage 1 실측 결과 (휴리스틱 하이브리드 — 키 불필요분)
- typecheck·lint·build·test 전부 exit 0, vitest 85→**93건**(voltage-advisor 8건 추가).
- 브라우저(375px, 다크) `/race/:motorId`:
  - 첫 기록(과거 0건): [+ 기록] → 목표 팝업 없이 시트 직접(파노 자동 415.0), 정상.
  - 1건 저장 후 [+ 기록]: **목표 팝업 노출**(완주/안정/속도 + 설명), 선택 시 팝업 닫힘.
  - 속도 선택 → 시트 "전압 · 속도 추천", 전압 **2.7 프리필**, 근거 "직전 2.5V 완주 · 속도 목표 → 2.7V"
    (로컬은 서버리스 부재 → **휴리스틱 폴백** 경로 검증). 콘솔 오류 0.
- **Stage 2 (미구현 — 다음)**: `api/recommend-voltage`(Vercel 서버리스, Anthropic REST fetch, Haiku 4.5)
  + `vercel.json` /api 제외 + ESLint/tsconfig api 스코프. 활성화: Vercel에 `ANTHROPIC_API_KEY` 설정.
  Stage 1의 client 서비스가 이미 `/api/recommend-voltage`를 호출하므로 Stage 2 배포+키만으로 AI 전환.

---

## v2.32 — 레이스 결과(완주/이탈) 필수 → 옵션 (사용자)

### TARGET_BEHAVIOR
- 결과를 필수에서 **옵션**으로. 새 흐름(목표 팝업 + 전압 추천)은 레이스 **전** 세팅이라
  입력 시점에 결과를 모를 수 있다 → 결과 없이도 저장, 이후 [수정]으로 결과 기입.

### 변경
- schema: raceRecordSchema·create·patch의 `result`를 `.optional()`. read-lenient — 기존 데이터 무손상.
- repository: create·update가 result 있을 때만 저장(undefined 미저장, §2.1).
- use-race-entry: result 필수 검증 제거(RACE_ENTRY_MESSAGES.resultRequired 삭제), commandDraft·
  update patch에서 result 조건부. 제출 활성 = 파노·전압만.
- RaceEntrySheet: 라벨 "결과 · 필수"→"결과 · 옵션", canSubmit에서 result 제외, SegmentControl
  allowDeselect(재탭 미정 해제).
- RaceRecordRow: 결과 미정이면 '미정' 표시.
- voltage-advisor: VoltageAdviceRace.result 옵션화(미정이면 이탈 보정 없이 중립).

### PUBLIC_CONTRACTS_TO_PRESERVE
- voltage 0.1~9.9·panoHz·goal 검증 불변 · rehydrate(INV-16) — result 옵션이라 구 데이터 통과
- edit 시 panoHz·구조 필드 보존 · single-flight

### CHANGE_BUDGET
- 신규 의존성 0 · 로직 축소(필수 검증 제거)

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest 93건

---

## v2.33 — 파노↔전압 상관 학습 + 재측정 재추천 + Stage 2 서버리스 LLM (사용자)

### TARGET_BEHAVIOR
- 전압 추천을 **이 모터의 레이스 이력에서 파노↔전압 상관을 학습**해 현재 파노에 맞게 산출.
- 입력 시트 [측정] 왕복으로 **파노가 바뀌면 그 파노로 전압을 재추천**.
- **Stage 2**: 실제 Claude(Haiku 4.5) 호출을 Vercel 서버리스로 구현(개인 API 키·Vercel 배포·단독 사용).

### 원인·해석 (사용자 질문: "파노↔전압 상관 알아야 할 듯, 가능?")
- 측정 기록에는 전압이 없어 (전압,파노) 표본은 **레이스 기록**뿐. 각 레이스=(Vᵢ,Pᵢ,결과ᵢ).
- 레이스 파노는 "레이스 전 측정 인용값", 전압은 "사용자가 고른 값" → 순수 물리가 아니라
  **경험적 상관**(측정 파노가 P일 때 내가 V를 골랐다). 추천 목적(파노 보고 전압 정하기)에 정확히 부합.

### 변경
- `voltage-advisor`: 상관 학습으로 재작성 — 0건=목표 기준값 / 1건=원점 비례 V=(V₁/P₁)·P /
  2건+=최소제곱 선형적합 V≈a·P+b(방향·절편 학습, 퇴화 시 평균). + 목표 보정(속도+/완주−) +
  이탈 회피(비슷한 파노 이탈 전압 이상 회피) + 0.1~9.9 클램프. 단위 10건.
- `use-race-entry` + `RaceDetailPage`: 왕복 복귀 시 목표 있고 새 파노 있으면 `recompute` 페이로드로
  재추천(파노↔전압 재평가). adviceHistoryRef로 effect stale closure 회피.
- **Stage 2** `api/recommend-voltage.js`(신규 — Vercel 서버리스): Anthropic REST fetch·Haiku 4.5·
  JSON 출력·서버에서 전압 클램프·입력 검증·이력 20건 컷. 키는 서버 env 전용(번들 미포함).
- `vercel.json`: SPA rewrite를 `/((?!api/).*)`로 바꿔 `/api`를 서버리스로 라우팅.

### PUBLIC_CONTRACTS_TO_PRESERVE
- 클라이언트 recommendVoltage는 서버리스 실패·오프라인·키없음 시 휴리스틱 폴백(무음 실패 금지)
- voltage 0.1~9.9 최종 검증(voltageSchema)·클램프 이중화 · 왕복 handoff goal 보존 · single-flight

### NON_GOALS
- 키 클라이언트 노출 · 다중 사용자·레이트리밋 인프라 · 측정 기록에 전압 추가

### CHANGE_BUDGET
- 신규 의존성 0(Anthropic REST fetch — SDK 미설치) · 서버리스 1함수(.js, tsc 스코프 밖·eslint js 규칙)

### TEST_EVIDENCE
- typecheck·lint(api/*.js 포함)·build·test 전부 exit 0, vitest **95건**(advisor 상관 학습 10건).
- 브라우저(375px, 다크) `/race/:motorId`:
  - 결과 없이 저장 → "미정 · 2.5 V"(result 옵션 회귀 확인).
  - 2번째 [+ 기록]→목표 팝업→속도 → 프리필 2.7V, 근거 "파노 415Hz · 파노 비례 추정 · 속도 목표 → 2.7V".
  - 검증용 테스트 기록 생성 후 삭제(데이터 원상 복구).
- **미검증(장비 필요)**: 재측정 왕복은 실제 마이크 측정이 있어야 새 파노가 생겨 로컬 재현 불가
  (재추천 로직은 복원 경로 공유 + 단위테스트로 커버). 실제 AI 경로는 Vercel `ANTHROPIC_API_KEY`
  설정 후 활성(로컬 정적 서버는 서버리스 미실행 → 휴리스틱 폴백).

### 배포 활성화 (사용자 실행)
- Vercel 프로젝트 Settings→Environment Variables에 `ANTHROPIC_API_KEY` 추가 후 재배포.
- 그러면 클라이언트가 `/api/recommend-voltage`(서버리스)로 실제 Claude 추천을 받고, 실패 시 휴리스틱 폴백.

---

## v2.34 — 추천 대역 2.6~3.2V·0.02 단위 + 속도 상한 다운그레이드 + 최근 구간 근거 (사용자)

### TARGET_BEHAVIOR
- 추천 전압을 **2.6~3.2V, 0.02V 단위**로만 제안(입력 허용 대역 0.1~9.9와 별개).
- **속도** 목표라도 3.2V를 넘겨야 더 빨라지는 상황이면(풀충 배터리 한계·부담) **안정으로 낮춰** 추천.
- 추천 근거는 **현재→가장 최근 완주 기록까지의 최근 구간**(오래된 상태 드리프트 배제). 완주 없으면 최근 5건.
  (직전 "이전 모든 기록" 요구를 사용자 재검토로 최근 구간으로 조정.)

### 변경
- `domain`: `VOLTAGE_ADVICE_RANGE = {min:2.6, max:3.2, step:0.02}` 신설.
- `voltage-advisor`: clampVoltage를 0.02 step·2.6~3.2 클램프로. 기준선 = NEUTRAL_BASE 2.9 + GOAL_DELTA
  (완주 −0.3/안정 0/속도 +0.3 → 2.6/2.9/3.2). 속도 결과가 3.2 초과면 안정 델타로 다운그레이드(근거 표기).
  이탈 회피 한 스텝(0.02) 아래로. 근거·프리필 소수 2자리.
- `use-race-entry`: 추천 프리필 toFixed(2).
- `api/recommend-voltage.js`: 클램프 2.6~3.2·0.02 step, 프롬프트에 대역·0.02 단위·속도→안정 규칙 추가,
  **이력 20건 컷 제거**(클라가 최근 구간으로 이미 좁혀 전달).
- `RaceDetailPage`: adviceHistory를 최근 완주까지 구간(완주 없으면 최근 5건)으로 windowing — 휴리스틱·LLM 공통.

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest 95건(advisor 대역·0.02·다운그레이드·이탈회피 갱신).
- 브라우저: 속도 요청 시 "속도 상한 3.2V 초과 → 안정 권장 → 3.00V" 다운그레이드 확인 /
  2.88V 입력 후 안정 추천 프리필 "2.88V"(0.02 단위·2자리) 확인. 테스트 기록 생성 후 삭제 복구.
- **미검증(장비 필요)**: 실기기 measuring·다중 파노 추세선·재측정 재추천은 마이크 필요(단위테스트로 커버).

---

## v2.35 — 기본 휴리스틱 추천 + [AI 추천] 버튼 (사용자)

### TARGET_BEHAVIOR
- 전압은 **기본적으로 휴리스틱**으로 추천(즉시·오프라인·무료). 전압 입력폼 아래 **[AI 추천]** 버튼을
  누르면 그때 현재 상태(목표·현재 파노·최근 이력)로 서버리스 LLM에 요청한다.

### 변경
- `use-race-entry`: openWithGoal·재측정 재추천을 **동기 휴리스틱**(recommendVoltageHeuristic)으로 전환
  (기존 자동 AI 호출 제거). 신규 `requestAiVoltage(adviceInput)` — 비동기 recommendVoltage(AI→폴백)
  호출, `recommendPending`·`recommendSource`('ai'|'heuristic'|null) 상태 노출.
- `RaceEntrySheet`: 전압 FormField 아래 [AI 추천] 버튼(목표 있을 때만·pending 시 "AI 추천 요청 중…")
  + 'ai' 출처면 "AI 추천됨" 배지. helperText 문구 갱신.
- `RaceDetailPage`: handleAiRecommend 배선(목표·파노·최근 이력 전달), recommendSource·onRequestAiVoltage 전달.

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest 95건.
- 브라우저: 목표 선택 시 휴리스틱 프리필(2.90V) + [AI 추천] 버튼 노출, 클릭 시 로컬은 휴리스틱 폴백(오류 0).

---

## v2.36 — 직전 기록 미완성 확인 팝업 (사용자)

### TARGET_BEHAVIOR
- [+ 기록] 클릭 시 **직전 기록에 결과(완주/이탈) 미입력**이면 "직전에 입력 안 된 항목이 있습니다.
  입력하시겠습니까?" 확인 팝업. **네 → 그 기록 수정 폼**으로 이동 / **아니오 → 이전 입력 없이 새 기록 추가**.

### 변경
- `RaceDetailPage`: handleAddRecord가 races[0].result === undefined면 확인 Dialog 오픈(incompleteTarget).
  네=editRecord(target), 아니오=proceedAddRecord(목표 팝업/시트). 일반 MUI Dialog(비파괴 Yes/No —
  ConfirmDialog는 destructive 전용이라 미사용).

### NON_GOALS
- 랩타임 등 순수 옵션 항목은 미완성 판정에서 제외(결과 미입력만 트리거).

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0.
- 브라우저: 결과 없이 저장 후 [+ 기록] → "직전 기록 확인" 팝업(네/아니오). 네 → 수정 폼(전압 2.9 유지·결과 옵션),
  결과 완주 저장해 완성 후 [+ 기록] → 팝업 없이 목표 팝업. 테스트 기록 생성 후 삭제 복구.

---

## v2.37 — AI 프롬프트 고도화 + 지수 가중 분석 (사용자 승인)

### TARGET_BEHAVIOR
- 레이스 분석에 **지수 가중치** 부여: 가장 오래된 기록 weight 1, 최근일수록 GROWTH^rank(GROWTH=1.5).
  weight를 payload에 실어 LLM이 분석 중요도로 쓰고, 휴리스틱도 **가중 최소제곱**으로 일치시킨다.
- AI 프롬프트를 역할·도메인지식·입력스키마·분석절차·제약·출력계약으로 **세밀·정교화**. temperature 0.

### 변경
- `domain`: `RACE_WEIGHT_GROWTH = 1.5`.
- `voltage-advisor`: `VoltageAdviceRace`에 `weight?`·`lapTimeMs?` 추가. `assignExponentialWeights(newest-first)`
  신설(오래된=1, 최근=GROWTH^rank, 원본 불변). fitVoltageForPano를 **가중 최소제곱**으로(weight 없으면 1=등가중).
  근거 문구 "가중 파노-전압 추세선/가중 평균".
- `RaceDetailPage`: adviceHistory(최근 구간)에 assignExponentialWeights 적용 + lapTimeMs 포함.
- `api/recommend-voltage.js`: 프롬프트 전면 재작성(가중치·랩타임·절차·제약·출력 JSON 계약), `temperature: 0`.
- 클라이언트 payload가 weight를 포함하므로 서버리스·휴리스틱 동일 근거 사용.

### PUBLIC_CONTRACTS_TO_PRESERVE
- weight 없으면 등가중(기존 동작 불변) · 2.6~3.2·0.02·속도 다운그레이드·이탈 회피 규칙 유지
- 클라이언트 폴백(서버리스 실패 시 휴리스틱)·voltage 최종 검증 불변

### CHANGE_BUDGET
- 신규 의존성 0 · 순수 함수 확장(가중 최소제곱) + 프롬프트/상수

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest **98건**(assignExponentialWeights 2·가중 추세 1 추가).
- 브라우저: 서로 다른 파노 2건 시드가 유효 저장·조회 확인(스키마 통과). 가중 추세·프리필 근거는 단위테스트로 커버.
- **미검증(장비/키 필요)**: 실제 LLM 프롬프트 응답 품질은 Vercel `ANTHROPIC_API_KEY` 설정 후 확인.

---

## v2.38 — 레이스 전압 2자리 + 파노 기록 개별(밀어서) 삭제 + 파비콘·SEO (사용자, 비블로킹 4건)

### TARGET_BEHAVIOR
- 레이스 리스트 전압을 소수 **2자리**까지 표시.
- 모터 상세의 파노(측정) 기록을 **개별 삭제**(일괄 없음) — **밀어서 삭제(스와이프 트레이 [삭제])**, 다이얼로그 없음.
- 웹 파비콘을 **메뉴 모터 아이콘**으로 교체 + **SEO** 추가.

### 변경
- `format`: `formatVoltage` toFixed(1)→**toFixed(2)** (두 레이스 리스트가 소비).
- `entities/measure-record`: `deleteMeasureRecord(id)` 커맨드 추가(멱등 tx) — **append-only(T-2) 번복**,
  개별 삭제만. index export.
- `features/measure-management`(신규): `useDeleteMeasureRecord` — measureKeys.byMotor + motorKeys.summaries invalidate.
- `MotorDetailPage`: 측정 기록 행을 `SwipeActions`로 감싸 [삭제] 트레이 → 탭 즉시 삭제(다이얼로그 없음) +
  토스트, `useSingleOpenRow`로 한 번에 한 행만.
- `public/favicon.svg`(신규): 모터 캔 글리프(lime400/carbon). `index.html`: favicon link + **robots noindex→index**
  + description·og 메타(SEO).

### PUBLIC_CONTRACTS_TO_PRESERVE
- 측정값(panoHz/rpm) 불변·update 없음(개별 delete만 추가) · 파생(차트·요약·레이스 자동 파노) invalidation
- 전압 저장·검증(0.1~9.9·소수≤2) 불변 — 표시 자리수만 변경 · 스와이프 단일 열림·접근성(aria)

### NON_GOALS (이번 커밋)
- **구글 로그인 + 서버 DB + 동기화** — 외부 자격증명·설계 결정 필요로 별도 진행(아래 결정 대기)
- 파노 기록 일괄 삭제 · 삭제 확인 다이얼로그(사용자: 단순화)

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest 98건.
- 브라우저: favicon `/favicon.svg` 로드(image/svg+xml)·robots index·description·og 확인. 시드 모터에서
  측정 2건 → 트레이 [삭제] 탭 → **다이얼로그 없이** 1건 삭제·토스트·목록 갱신 확인(시드 정리 완료).

---

## v2.39 — 로그인 Phase A: 구글 OAuth + 세션 (tamiya-race-app 미러링, 사용자 승인)

### TARGET_BEHAVIOR
- 구글 로그인/로그아웃 + 세션. 서버 DB 데이터 계층 분기는 Phase B(다음).
- 스택은 `tamiya-race-app`와 동일: 커스텀 구글 OAuth(서버리스) + `jose` JWT 세션 + Neon(users).

### 변경 (서버리스 JS — 기존 api/recommend-voltage.js 선례와 일관)
- `api/_lib/session.js`(jose HS256·`mml_session` 30일 쿠키·SessionPayload sub/email/name/picture),
  `oauth.js`(state+HMAC `mml_oauth_state`), `db.js`(neon sql()+upsertUser).
- `api/auth/google/start.js`(구글 동의화면 리다이렉트), `callback.js`(code→token·id_token JWKS 검증·
  best-effort upsertUser·세션 발급·`/` 복귀), `auth/session.js`(현재 세션), `auth/logout.js`.
- `migrations/001_users.sql`(users 테이블 — 구글 sub PK).
- 클라이언트 `features/auth`: `useSession`(GET /api/auth/session, 로컬은 null 수렴), `AuthMenu`
  (미로그인=[구글 로그인]→/api/auth/google/start, 로그인=아바타·이름·[로그아웃]). MeasurePage 좌상단 배선.
- deps: `jose`·`@neondatabase/serverless`(런타임, 클라 번들 미포함). vercel.json rewrite는 이미 /api 제외.

### PUBLIC_CONTRACTS_TO_PRESERVE
- 비로그인 동작 = 기존과 동일(IndexedDB) · 로컬 정적 서버는 세션 null(미로그인)로 안전 수렴
- upsertUser는 best-effort — DB(Phase B) 전에도 로그인 성공 · 키는 서버 env 전용(번들 미포함)

### NON_GOALS (Phase A)
- 서버 DB 도메인 테이블·데이터 계층 분기(로그인 시 서버 정본·로컬 대체) — **Phase B**
- 다중 프로필(참조 앱의 profiles) — 이 앱 불필요로 제외

### TEST_EVIDENCE
- typecheck·lint(api/*.js 포함)·build·test 전부 exit 0, vitest 98건.
- 브라우저(로컬) `/`: 좌상단 [구글 로그인] 렌더·href `/api/auth/google/start`, 세션 null(정적 서버). 게이지 등 기존 정상.
- **미검증(자격증명·배포 필요)**: 실제 구글 로그인 왕복·세션 발급은 Vercel 환경변수 설정 후.

### 배포 활성화 (사용자 — Vercel 환경변수 + Google/Neon)
1. Google Cloud → OAuth 2.0 클라이언트(Web): 승인 리디렉션 URI `https://<도메인>/api/auth/google/callback`
   (+ 필요시 localhost). → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
2. `GOOGLE_REDIRECT_URI` = 위 콜백 URL. `SESSION_SECRET` = 32자+ 랜덤.
3. (Phase B 대비) Neon 프로젝트 → `DATABASE_URL`, migrations/001_users.sql 1회 실행.
4. Vercel 환경변수 등록 후 재배포 → [구글 로그인] 동작.

---

## v2.40 — 로그인 UX: 아바타 중심 메뉴 (사용자)

### TARGET_BEHAVIOR
- 비로그인: **기본 아바타(빈 사람 실루엣)**. 로그인: **설정된 아바타(user.picture)**.
- 아바타 클릭 → 메뉴: 로그인 시 **기본 정보(이름·이메일) + 로그아웃**, 비로그인 시 **구글 로그인**.

### 변경
- `features/auth/ui/AuthMenu.tsx` 재작성: 인라인 버튼/이름 → **IconButton(Avatar) + MUI Menu**.
  src 없으면 MUI Avatar 기본 사람 실루엣(비로그인·사진없음 공통). aria-label(로그인/계정 메뉴)·
  aria-haspopup·aria-expanded. 로그인 메뉴 = 이름·이메일 헤더 + Divider + [로그아웃], 비로그인 = [구글 로그인].
- API·세션 로직·서버리스 무변경(UI만).

### PUBLIC_CONTRACTS_TO_PRESERVE
- useSession·로그아웃·로그인 진입(/api/auth/*) 계약 불변 · 로컬 정적 서버 미로그인 수렴

### CHANGE_BUDGET
- 신규 의존성 0 · 단일 파일(UI)

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0, vitest 98건.
- 브라우저(로컬·비로그인): 좌상단 기본 아바타(사람 실루엣, aria-label "로그인"), 클릭→메뉴 [구글 로그인].
  로그인 메뉴(이름·이메일·로그아웃)는 Vercel 로그인 후 확인 대상.

---

## v2.41 — 비로그인 아바타 클릭 = 즉시 구글 로그인 (사용자)

### TARGET_BEHAVIOR
- 비로그인 아바타 클릭 시 메뉴 없이 **바로 구글 로그인 페이지로 이동**(/api/auth/google/start).
- 로그인 아바타는 기존대로 메뉴(기본 정보 + 로그아웃).

### 변경
- `AuthMenu.tsx`: 아바타 onClick 분기 — user===null이면 `location.href='/api/auth/google/start'`,
  로그인 시 메뉴 오픈. 비로그인 [구글 로그인] MenuItem 제거, Menu는 로그인 시에만 렌더.
  aria-label 비로그인 "구글 로그인"·aria-haspopup 미부여(메뉴 아님).

### TEST_EVIDENCE
- typecheck·lint·build·test 전부 exit 0.
- 브라우저(로컬·비로그인): 아바타 aria-label "구글 로그인"·aria-haspopup 없음·Menu DOM 부재 확인(클릭 시 로그인 진입).

---

## v2.42 — 로그인 Phase B: 서버 DB + 동기화 (서버 우선, 최소 침습) (사용자)

### TARGET_BEHAVIOR
- 로그인 시 도메인 데이터(모터·측정·레이스)를 **서버 DB(Neon)에 영구 저장**. 비로그인은 기존(IndexedDB)과 동일.
- **서버 우선(로컬 대체)**: 로그인 시 서버 데이터가 있으면 로컬을 서버 스냅샷으로 교체.
- 쓰기 시 서버·IndexedDB **함께 반영**(dual-write): 모든 도메인 mutation 후 서버로 전체 스냅샷 mirror push.
- 필터·정렬은 **로컬(localStorage) 전용** — 서버 미저장(요청대로).

### 설계 (최소 침습 — read 계층 무변경)
- IndexedDB를 계속 워킹 read 스토어로 유지. 동기화는 **로그인 지점(pull-replace)** + **mutation 성공 지점(debounced push)**
  두 곳에서만 개입 → 엔티티 repository·query·mutation 미변경. 전체 스냅샷 교체 방식이라 충돌 로직 불필요(LWW).
- 초기 로그인 데이터 보존: 서버가 비어 있으면 로컬을 시드로 push(그 외엔 서버 우선 교체).

### 변경
- `migrations/002_domain.sql`: motors·measure_records·race_records (user_id=구글 sub FK, 타임스탬프 TEXT ISO).
- `api/_lib/db.js` += `getUserData`(alias→앱 레코드 형태·null 옵션 생략)·`replaceUserData`(delete-all+insert, sql.transaction).
- `api/_lib/authGuard.js`(신규 — requireSession 401 가드), `api/data.js`(신규 — GET 스냅샷/PUT 교체, 세션 필수).
- `shared/lib/persistence/domain-snapshot.ts`(신규 — readDomainSnapshot/replaceDomainSnapshot, raw 3-store).
- `features/sync`(신규 — pullServerData/pushServerData 클라이언트).
- `app/SyncManager.tsx`(신규 — 세션 의존 오케스트레이션: 로그인 pull-replace/seed + mutationCache 구독 debounced push).
  App.tsx QueryClientProvider 하위 마운트. (features 간 import 회피 위해 오케스트레이션은 app 계층 소유)

### PUBLIC_CONTRACTS_TO_PRESERVE
- 비로그인·로컬·오프라인 = pull/push no-op(조용히 skip) → 기존 IndexedDB 동작 불변
- 데이터 사용자별 격리(user_id) · 세션 필수(authGuard) · 키·DB URL 서버 env 전용(번들 미포함)
- 필터·정렬 로컬 유지 · 읽기 검증(rehydrate parse*Row)로 서버 인입 데이터도 corrupt 방어

### NON_GOALS
- 실시간 동기화·per-entity 델타 API·양방향 병합(전체 스냅샷·LWW로 단순화) · 다중 프로필

### TEST_EVIDENCE
- typecheck·lint(api/*.js 포함)·build·test 전부 exit 0, vitest 98건.
- 브라우저(로컬·비로그인): SyncManager no-op, 앱 기존대로 동작(게이지·로그인 버튼). 모터 상세 정상 렌더
  (측정 기록·스와이프 [삭제]) — 앞선 deletingMeasureId 오류는 stale HMR로 확인, 풀리로드로 해소. 시드 정리 완료.
- **미검증(자격증명·배포 필요)**: 실제 서버 저장·서버 우선 pull·mirror push는 Vercel `DATABASE_URL` +
  로그인 + `migrations/001·002.sql` 실행 후 동작.

### 배포 활성화 (사용자)
- Neon `DATABASE_URL`을 Vercel 환경변수에 추가 + `migrations/001_users.sql`·`002_domain.sql` 실행(1회).
- (Phase A 인증 env 이미 설정 전제) 재배포 → 로그인 시 서버 우선 동기화·mutation mirror push 동작.

---

## v2.43 — 로그인 UX: 아바타 전역 노출 + 레이스 로그인 게이트 (사용자)

### TARGET_BEHAVIOR
- **로그인/아바타를 모든 화면에서** 헤더 **오른쪽 끝**에 노출(측정·모터·모터상세·레이스·레이스상세).
- **레이스 정보는 로그인 이후에만** 표시. 비로그인 시 본문을 중앙 "로그인 후에 사용하세요" 안내로 대체(+ 프로필 유도 문구).

### 변경
- `pages/measure/ui/MeasurePage.tsx`: 좌상단 AuthMenu 제거 → 우상단 [ThemeToggle+AuthMenu] 클러스터로 통합(절대배치, 헤더 없는 S1).
- `pages/motors/ui/MotorsPage.tsx`: PageHeader `action`(ThemeToggle) 폐지 → `actions`에 [+모터][ThemeToggle][AuthMenu] 클러스터.
- `pages/motor-detail/ui/MotorDetailPage.tsx`: 동일 — [수정][삭제](모터 존재 시)+[ThemeToggle][AuthMenu]. 로딩·not-found에도 아바타 상시.
- `pages/race/ui/RacePage.tsx`: `useSession` 게이트. 헤더 [ThemeToggle][AuthMenu]. 비로그인=중앙 게이트, 로그인=기존 목록. summaries 조회는 로그인 시에만 enabled.
- `pages/race-detail/ui/RaceDetailPage.tsx`: 동일 게이트. **+기록은 로그인+모터 존재 시에만** 노출. 도메인 조회 3종 로그인 시에만 enabled. ThemeToggle 신규 추가(기존 미노출).

### 설계 노트
- 아바타 클러스터는 **페이지별 주입**(FSD: pages→features/shared 허용, shared PageHeader는 features import 불가). 기존 ThemeToggle 주입 패턴 승계 → 헤더 flex 자연 배치로 액션 버튼과 충돌 없음.
- 게이트 순서: `sessionPending`(확인 중) → `!loggedIn`(게이트) → 기존 corrupt/loading/error/empty/content. 세션 확인 중 콘텐츠·게이트 플래시 방지.
- 로컬 정적 서버는 `useSession`이 null(미로그인) 수렴 → 로컬에서 레이스는 항상 게이트(설계상 정상). 로그인 후 콘텐츠 경로는 배포·인증 필요.

### PUBLIC_CONTRACTS_TO_PRESERVE
- AuthMenu 동작 불변(비로그인=클릭 시 구글 로그인 이동, 로그인=계정 메뉴). ThemeToggle 동작 불변.
- 레이스 왕복(RV-1)·입력 시트·삭제 플로우는 로그인 상태에서 기존과 동일(gated 시 진입점 미노출로 트리거 불가).

### NON_GOALS
- 측정·모터 화면 게이트(레이스만 로그인 필수) · 아바타 클러스터의 공용 컴포넌트화(widgets 레이어 미도입)

### TEST_EVIDENCE
- typecheck·lint·test(98)·build 전부 exit 0.
- 브라우저(로컬·비로그인, 375px): 측정=우상단 [달·아바타] 클러스터(좌상단 정리), 모터=[+모터][달][아바타] 헤더 정상, 레이스·레이스상세=헤더 [달][아바타](레이스상세 +기록 미노출)+중앙 "로그인 후에 사용하세요", 모터상세=[뒤로][수정 없음/not-found][달][아바타] 정상 렌더. 콘솔의 AuthMenu ReferenceError는 import 추가 이전 stale HMR(단일 `?t=` 타임스탬프)로, 재렌더 스냅샷은 정상 헤더(에러 폴백 아님) 확인.
- **미검증(자격증명·배포 필요)**: 로그인 상태의 레이스 콘텐츠 경로.

---

## v2.44 — 레이스 목록 정렬 추가 + 모터와 공유 (사용자)

### TARGET_BEHAVIOR
- 레이스 진입 목록(`/race`)에도 **정렬 3종**(최근 등록순·파노 높은순·이름순) 추가.
- 모터 목록과 **정렬 상태 공유**: 한쪽에서 고른 정렬이 다른 쪽에도 그대로 반영(종류 필터와 동일 원칙).

### 변경
- `pages/race/ui/RacePage.tsx`: `useMotorSort`(기존 모터 정렬 훅) + `SegmentControl` 추가.
  필터→정렬 순으로 뷰 계층 적용, RaceMotorList가 `motorSort.sorted` 소비. 필터 결과 1건 이상일 때만 컨트롤 노출.
- 소스 변경은 RacePage 1파일뿐 — `useMotorSort`는 이미 영속 zustand store(`mml-motor-sort-1`)라 신규 배선만으로 공유·영속 자동 충족.

### PUBLIC_CONTRACTS_TO_PRESERVE
- 모터 목록(MotorsPage)·정렬 store·SegmentControl 컴포넌트 무변경(레이스가 동일 store/컴포넌트를 재사용).
- 정렬은 뷰 계층 — 데이터층 순서(sortOrder asc) 불변. 두 화면이 같은 원본(motorQueries.summaries)+같은 정렬을 소비해 순서 일치.
- 레이스 로그인 게이트(v2.43)·종류 필터 공유 불변.

### NON_GOALS
- 레이스 전용 별도 정렬 기준 · 정렬 store 분리(공유가 요구사항) · 레이스 상세(/race/:id) 회차 정렬 변경

### TEST_EVIDENCE
- typecheck·lint·test(98)·build 전부 exit 0.
- 브라우저(로컬, 테스트 모터 3건 시드): /motors에 정렬 SegmentControl 노출, [이름순] 선택 시 순서 재정렬(recent: 베타·감마 → name: 감마·베타) 확인. 선택이 공유 store 키 `mml-motor-sort-1`(= RacePage가 읽는 동일 키)에 `sort:"name"`으로 영속됨을 localStorage로 확인.
- /race는 로그인 게이트로 정상 렌더(새 훅 추가 후에도 무회귀). **로그인 상태의 레이스 정렬 UI**는 배포·로그인 후 확인(로컬 정적 서버는 미로그인 수렴). 콘솔 에러는 v2.43 이전 stale HMR(`?t=` 단일 타임스탬프) 뿐, 신규 에러 없음.
- 검증용 시드 모터·정렬값은 IndexedDB(mml-db)·localStorage에서 정리 완료(빈 상태·기본 정렬 복원 확인).

---

## v2.45 — 모터 상세 수정·삭제 버튼 제거 + 홈 화면 추가 아이콘(PWA) (사용자)

### TARGET_BEHAVIOR
1. 모터 상세(`/motors/:id`) 헤더에서 **수정·삭제 버튼 제거**. 모터 관리 진입점은 모터 목록 스와이프 1곳으로 단일화.
2. 웹사이트를 **스마트폰/PC 홈 화면에 추가**할 때 앱 아이콘(모터 글리프)이 표시되도록 PWA manifest + 아이콘 자산 추가.

### 변경
- `pages/motor-detail/ui/MotorDetailPage.tsx`: 헤더 [수정][삭제] 버튼 및 관련 로직(수정 시트 state·useUpdateMotor·useMotorDeleteFlow·useDeleteMotorCascade·MotorFormSheet·ConfirmDialog·count 오류 Alert·죽은 import) 전부 제거. 헤더 우측은 [ThemeToggle][Avatar]만. (측정 왕복·파노 기록 개별 삭제 스와이프는 유지.)
- `public/manifest.webmanifest`(신규): name·short_name·display standalone·theme/background #0A0A0B·icons(svg any + 192/512 png + maskable 512).
- `public/icon-192.png`·`icon-512.png`·`icon-maskable-512.png`·`apple-touch-icon.png`(신규): favicon 모터 글리프(라임 #D8F542 / 카본 #0A0A0B)를 래스터화. 192/apple-touch(180)는 브라우저 canvas 렌더, 512·maskable은 192에서 sips 확대(및 maskable은 dark 패딩으로 safe-zone 확보).
- `index.html`: `<link rel="manifest">`·`<link rel="apple-touch-icon">`·apple/mobile web-app-capable·status-bar-style·apple title 메타 추가.

### PUBLIC_CONTRACTS_TO_PRESERVE
- 모터 수정·삭제 기능은 **모터 목록(MotorsPage) 행 스와이프**에 그대로 존재(상세에서만 제거).
- 기존 favicon.svg·theme-color·SEO·safe-area·no-flash 부팅 스크립트 불변. Vercel은 정적 파일을 rewrite보다 우선 서빙하므로 manifest/아이콘 라우팅 문제 없음(vercel.json 무변경).

### NON_GOALS
- service worker/오프라인 캐시(설치형 아이콘만) · 스플래시 커스텀 · 모터 수정·삭제 기능 자체 삭제

### TEST_EVIDENCE
- typecheck·lint·test(98)·build 전부 exit 0. dist에 아이콘 4종+manifest 복사 확인(public↔dist sha256 일치).
- 브라우저(로컬): 모터 상세(실제 모터 "130 1")·not-found 모두 헤더에 수정·삭제 없음([뒤로]·테마·아바타만), 측정/차트/기록 정상. 모터 목록 행 스와이프 [수정]/[삭제] 유지 확인.
- manifest.webmanifest 200(name·icons 4), 아이콘 4종 200 image/png, `<link rel=manifest/apple-touch-icon>` DOM 존재. 아이콘 픽셀 스캔: 192=13.8%·512=13.7%·maskable=7.7%·apple=6.9% 라임(글리프 정상, 초기 512 blank 재생성 완료).
- 검증용 시드 모터는 IndexedDB에서 정리(빈 상태 복원).

---

## v2.46 — 홈 화면 아이콘 깨짐(잘림·투명) 수정 (bug-fix, 사용자 확인)

### 증상 / 근원
- v2.45 PNG 아이콘 4종이 **글리프 하단 절반 잘림 + 그 아래 투명**으로 생성됨(사용자 스크린샷 확인).
- 근원: 래스터화 SVG 문자열에 `width/height`가 없어 `<img>` 고유 크기가 미정 → canvas `drawImage`가 상단 일부에만 렌더, 배경 rect도 함께 잘려 나머지 투명. (v2.45 sips 512는 잘린 192를 확대해 결함 승계+블러.)

### 변경 (public/ 자산만)
- `icon-192.png`·`icon-512.png`·`apple-touch-icon.png`: SVG에 `width/height` 명시해 브라우저 canvas로 **원본 크기 재래스터화**(꽉 찬 글리프).
- `icon-maskable-512.png`: 사용자 결정으로 별도 생성 안 하고 `icon-512.png` 복사본 사용.

### 검증
- 전송 무결성: 각 PNG를 브라우저 SHA-256과 디스크 `shasum` 대조(192·512·apple 1치). **maskable 단일 붙여넣기에서 SHA MISMATCH 감지(de5475≠8ebeb3)** → v2.45식 대용량 base64 손상을 새 SHA 가드가 실제로 잡음. 이후 512 복사로 대체.
- 브라우저: 디스크 4종 모두 꽉 찬 글리프·중앙정렬·풀블리드 배경(잘림/투명/아티팩트 없음) 확인. 사용자 최종 확인 완료.
- 자산 전용 변경(소스·테스트 무변경)이라 typecheck/lint/test/build 영향 없음. dist는 배포 시 Vercel이 재빌드.

---

## v2.47 — 레이스 목록 행 스타일 통일 + 측정 왕복 안내 재배치 (ui-change, 사용자)

### TARGET_BEHAVIOR
1. 레이스 진입 목록(RaceMotorList) 행의 높이·정렬을 모터 목록(MotorList/MotorRow)과 통일.
2. 측정 페이지 왕복 모드 안내("수치가 안정되면 자동으로 돌아갑니다")를 최상단 → [돌아가기] 버튼 바로 위로 재배치.

### 변경
- `features/race-record/ui/RaceMotorList.tsx`: 행 간격 `List gap 1.5→1`(MotorList `Stack spacing=1`=8px와 동일), 행 패딩 `pl/pr 2→1.5`(MotorRow와 동일). minHeight 64·py 1.25·gap 1.5는 기존과 동일.
- `pages/measure/ui/MeasurePage.tsx`: `RaceMeasureStrip`을 페이지 최상단에서 Z3 액션 존으로 이동, `MeasureActionDock`(돌아가기 버튼) 바로 위에 `mb:1`로 배치.

### PUBLIC_CONTRACTS_TO_PRESERVE
- RaceMeasureStrip `role="status"` 발화(왕복 진입 1회)는 위치와 무관하게 유지. 왕복 slot 렌더 동치(INV-21) 불변.
- 행 accessible name·종류색 카드·스와이프 없음(레이스 목록) 등 기존 동작 불변.

### NON_GOALS
- 레이스 행에 스파크라인 추가(요청은 높이·정렬만) · 스트립 문구 변경 · MotorRow 측 변경

### TEST_EVIDENCE
- typecheck·lint·test(98)·build 전부 exit 0.
- 브라우저(로컬): 모터 행 실측 = 64px 높이·pl/pr 12px·py 10px → RaceMotorList가 동일 값(pl/pr 1.5=12px, gap 1=8px)으로 정렬(#1). 왕복 모드 진입(모터 상세→측정) 후 안내 스트립이 [모터로 돌아가기] 버튼 **바로 위**·페이지 상단은 비어 있음을 a11y 트리+스크린샷으로 확인(#2). 시드 모터 정리 완료.
- #1 레이스 목록 실제 렌더는 로그인 게이트로 로컬 미표시 — 행 sx가 측정한 모터 행과 동일하므로 배포에서 동일 표시(DEPLOY 확인 권장).

---

# Iterate 라운드 로그 (라운드별 append — minimal-change-contract)

> **프로세스 결함 소급 기록(2026-07-31)**: 아래 R1~R11은 각 라운드 시작 전에 append했어야 하나
> 누락되어 커밋 이력 기준으로 소급 기재한다. R12부터 라운드 시작 전 append 원칙을 복원한다.

## R1~R11 (2026-07-30 ~ 07-31, 소급 요약 — 상세는 각 커밋 메시지가 canonical)
- R1 조용한 추세 + 최상 컨디션 기준선 DB 영속 (a7c2fd0) / R2 변동률 게이지 분리·파노 확대 (5c88b11)
- R3 바늘 떨림 + 왕복 사각지대 (fc5e387) / R4 3s/5s 조정 (0bd2bb2, 38bc18b)
- R5 왕복 재측정 즉시-확정 버그 + 쓰기 중 버튼 비활성 (1b1f7c2)
- R6 모터 로그인 게이트 + 로그인 마이그레이션 제거 (49ae244) / R7 서버 DB 정본 통일 (d3a36a9)
- R8 파노 지배피치 실험→원복, 옥타브·veto·fMax 진단 수정 시리즈 (e8d7120~529ea24)
- R9 진단 계측 도입·제거 (5e954a9, ee46f6f) / R10 토스트 상단·탭 닫힘 (420968e) / R11 게이지 0~800 (e97c035)
- 보존 계약: 엔진 회귀(engine.real-motors 4케이스)·rolling 20·기준선 병합·서버 best-effort 동기화
- evidence: 각 라운드 CI=true pnpm typecheck·lint·test·build PASS / DEPLOY_ONLY(마이크·로그인 경로) — 사용자 위임으로 실기기 확인

## R12 — 모터 길들이기 기능 (2026-07-31, 현행)
- TARGET_BEHAVIOR: 노하우 레시피(사이클: 전압·구동시간·회전방향·휴식·캐미컬·세척·측정) 저장·재사용,
  타이머 세션(구동/휴식 카운트다운·지시 단계·측정=왕복 origin 'break-in'), 완료 판정(정체 +1%×2 / 목표 파노).
  세션 진행 상태 비영속(종료 시에만 기록 저장). 기획: `01_plan/break-in-feature-plan.md` v2.
- ALLOWED_PATHS: shared/config/domain.ts(BREAK_IN_*) · shared/lib/persistence/**(IDB v3 additive) ·
  entities/break-in/**(신규) · entities/motor/api/repository.ts(cascade) · features/break-in/**(신규) ·
  features/race-measure-handoff/**(origin) · features/sync/** · app/SyncManager.tsx · app/routes/** ·
  pages/motor-detail/** · pages/break-in/** · api/_lib/db.js · migrations/004_break_in.sql
- PUBLIC_CONTRACTS_TO_PRESERVE: v2 데이터 보존(2→3 additive, drop 금지)·INV-11·rolling 20·기준선 병합·
  왕복 3s/5s·resetAllRecords는 세션만 삭제(레시피=자산 유지)·cascade dangling 0건·서버 004 미실행에도 기존 동기화 무손상.
- NON_GOALS: 레시피 공유·종류별 프리셋·백그라운드 알림·세션 새로고침 복원.
- CHANGE_BUDGET: 커밋 2개(A 데이터 계층 / B 세션·UI). B는 **화면 구성 체크포인트 승인 후** 착수.
- TEST_EVIDENCE: 스키마 경계·판정 유닛 테스트 + 기존 120 회귀 / LOCAL_VERIFIABLE: 레시피 CRUD·편집기 UI(프리뷰) /
  DEPLOY_ONLY — 사용자 위임: 세션 실측정(마이크)·서버 동기화(로그인)·IDB v2→v3 실기기 업그레이드.

> **R12 폐기(2026-07-31, 사용자 결정)** — 길들이기 기능 구현 중단. 소스 변경분 전량 원복(0 diff),
> 프로세스 산출물(기획서·저널·본 로그)만 이력으로 보존. R13부터는 라운드 시작 전 append 원칙 적용.

## R13 — 페이지 헤더 고정 + 컨텐츠만 스크롤 (2026-07-31, ui-change)
- TARGET_BEHAVIOR: 모든 페이지에서 헤더(PageHeader)는 뷰포트 상단에 고정되고 콘텐츠 영역만 스크롤된다.
  스크롤 시 콘텐츠가 헤더 뒤로 지나가도 비치지 않는다(불투명 배경). 하단 탭 바 고정은 기존 유지.
- ALLOWED_PATHS: src/shared/ui/page-header/** · 필요 시 src/app/routes/**(셸 여백) ·
  src/pages/{motors,race,race-detail,motor-detail}/**(중복 스크롤 충돌 조정만)
- PUBLIC_CONTRACTS_TO_PRESERVE: 모터 상세 v2.8 고정 셸(자체 스크롤) 무해 공존 · 측정 페이지 고정
  레이아웃 불변 · safe-area(top) 계약 · WCAG 대비 · layout shift 0(고정 높이 계약).
- NON_GOALS: 헤더 축소/블러 등 스크롤 연동 효과, 탭 바 변경.
- CHANGE_BUDGET: 커밋 1개, 파일 ≤5.
- TEST_EVIDENCE: LOCAL_VERIFIABLE — sticky 계산 스타일·스크린샷(프리뷰). 실스크롤 체감(로그인 뒤 목록)은
  DEPLOY_ONLY — 사용자 위임. 게이트: typecheck·lint·test·build + check-iterate-scope.

## R14 — 종류 필터 단일 선택(탭 형식) 전환 (2026-07-31, ui-change)
- TARGET_BEHAVIOR: 모터·레이스의 종류 필터를 다중선택 칩 → **단일 선택 탭**으로 변경.
  [전체] 탭 + 존재 종류 탭(건수 표기), 하나만 활성. 두 화면 공유·영속(localStorage) 계약 유지.
- ALLOWED_PATHS: features/motor-management/model/{kind-filter-store,use-motor-kind-filter}.ts ·
  features/motor-management/ui/MotorKindFilter.tsx · pages/{motors,race}/ui(prop 배선만)
- PUBLIC_CONTRACTS_TO_PRESERVE: 화면 간 공유 + 영속(기존 저장 배열과 하위 호환 — 다중 잔존값은
  첫 항목만 채택) · 0건 빈 상태 탈출 경로([전체]) · 44px 터치 타깃 · 색 단독 구분 금지(a11y).
- NON_GOALS: 정렬 SegmentControl·필터 대상 확장 변경 없음.
- CHANGE_BUDGET: 커밋 1개, 파일 ≤5.
- TEST_EVIDENCE: LOCAL_VERIFIABLE — 프리뷰 탭 렌더·단일 선택 동작(로그인 게이트로 목록은 제한적) /
  게이트 4종 + check-iterate-scope. 실데이터 필터링 체감은 DEPLOY_ONLY — 사용자 위임.

## R15 — 안정도 용어 통일 (2026-07-31, ui-change)
- TARGET_BEHAVIOR: 측정(S1 안정도 게이지 캡션)과 모터 상세(컨디션 요약 1줄·도움말 다이얼로그)의
  사용자 노출 문구에서 '변동'/'변동률'을 **'안정도'**로 통일. 문구만 변경 — 수치·등급 판정·색·
  레이아웃·상수 불변. 조사(은/는)는 한국어 문법에 맞게 조정.
- ALLOWED_PATHS: features/measure-session/ui/StabilityGauge.tsx · 동 .test.tsx(캡션 단언 동기화) ·
  features/motor-management/ui/{ConditionSummary,ConditionHelpDialog}.tsx
- PUBLIC_CONTRACTS_TO_PRESERVE: STABILITY_LEVEL_LABELS 등 도메인 상수·판정 함수 무변경 ·
  캡션 고정 1줄 레이아웃 · 등급색 체계 · 스크린리더 경로(텍스트 교체만).
- NON_GOALS: 코드 주석·변수명·파일명의 용어 정리(사용자 노출 문구 아님) · 등급 라벨('좋음' 등) 변경.
- CHANGE_BUDGET: 파일 ≤4, R16과 커밋 분리 또는 합산은 게이트 후 결정.
- TEST_EVIDENCE: LOCAL_VERIFIABLE — StabilityGauge 캡션 unit 단언 갱신 + 게이트 4종 +
  check-iterate-scope + 프리뷰 문구 실측.

## R16 — 레이스·측정 헤더 고정 요청 (2026-07-31, verification-only 판정)
- REQUEST: 레이스·측정 페이지 헤더를 모터 페이지와 동일하게 고정.
- 판정: **소스 변경 없음** — 현재 코드가 이미 요청 상태를 충족함을 read-only로 검증.
  - /race: R13에서 sticky 전환된 공유 PageHeader 사용(모터 목록과 동일 컴포넌트). 프리뷰 실측
    (데스크톱·모바일 375px): 400~600px 스크롤 후에도 header top 0 · position sticky · z 1100 유지.
  - / (측정): PageHeader 없는 S1 자체 레이아웃. 375×667·375×812 실측 결과 docScrollHeight ==
    viewport(스크롤 자체가 없는 flex 압축 레이아웃) — 떠내려갈 헤더/클러스터가 없음.
  - 레이스 상세·모터 상세: v2.24/v2.8 자체 고정 셸(내부 overflowY) — 기존부터 고정.
- 추정 원인: 사용자 관측은 R13(c7eec3c, 오늘 push) 이전 배포본 또는 브라우저/PWA 캐시.
  재배포·강력 새로고침 후 재확인 요청. 재현되면 기기·화면 스크린샷 필요.
- 경계: verifier(오케스트레이터)는 source를 수정하지 않음 — src diff는 R15 문구 변경분만 존재.

## R17 — 모터 상세 '최근 파노 수치' 강조 (2026-07-31, ui-change)
- CHANGE_MODE: existing-change
- REQUEST: 모터 상세에서 가장 최근 파노 수치를 가시적으로 잘 보이게 처리.
- OBSERVED_BASELINE: 최근 파노 값이 (1) PanoLineChart 마지막 점(장식·aria-hidden), (2) 기록 목록
  맨 위 행(listValue 0.9375rem)에만 노출 — 단독 강조 영역 없음. owner: pages/motor-detail
  (MotorDetailPage.tsx), features/motor-management/ui.
- TARGET_BEHAVIOR: '파노 추세' 차트 **바로 위**에 '최근 파노' 히어로 블록 신설 — 라벨('최근 파노')
  + 최근 파노 값(BigNumber size="guide", 라임 primary.main, 단위 "Hz", formatPanoValue 경유)
  + 보조행('측정일시 · N,NNN rpm', formatDateTimeShort·formatRpm 경유). records ≥1건일 때만 렌더
  (차트와 동일 가드). 최근 = measuredAt asc 배열의 **마지막 원소**. 사용자 확정: 차트 위 히어로 · 값만(delta 미표시).
- ALLOWED_PATHS:
  - src/features/motor-management/ui/LatestPanoHero.tsx (신규 — component-builder)
  - src/features/motor-management/ui/index.ts (barrel export 추가 — component-builder)
  - src/pages/motor-detail/ui/MotorDetailPage.tsx (fixedTop 배선 — route-builder)
- PUBLIC_CONTRACTS_TO_PRESERVE: 기록 목록(canonical 텍스트 채널)·차트 aria-hidden 계약·고정 셸
  레이아웃(pageShellSx/fixedTopSx/scrollAreaSx/footerSx)·측정 왕복(v2.5)·기록 밀어서 삭제(v2.38)·
  컨디션 요약·not-found/error/corrupted 분기·표시 포맷 단일화(@shared/lib/format, 하드코딩 금지).
- NON_GOALS: delta/추세 화살표, 차트·기록 행 변경, 새 route/시트, 데이터 계층·쿼리·schema 변경, 새 dependency.
- CHANGE_BUDGET: 파일 3, 신규 컴포넌트 1, dependency 0, 커밋 1. 위임: component-builder∥route-builder(계약 선고정 병렬).
- TEST_EVIDENCE: LOCAL_VERIFIABLE — Node22 pnpm typecheck·lint·test·build PASS + 프리뷰(:8082)
  모터 상세 실측(히어로 값 == 목록 최신행 값, 라임 대형, 차트 위 배치, 기록 0건 모터 미렌더).

## R18 — 모터 상세 스크롤 셸 재구성 + 그래프 높이 축소 (2026-07-31, ui-change)
- CHANGE_MODE: existing-change
- REQUEST: 모터 상세 그래프 높이 축소 + 하단 기록 리스트가 안 눌리고 스크롤되게. 스크롤이 그래프까지 포함되게(그래프도 스크롤).
- OBSERVED_BASELINE: R17에서 최근 파노 히어로를 fixedTopSx(비스크롤 상단)에 추가하며 고정 영역이 커져
  짧은 뷰포트에서 scrollAreaSx(기록 리스트)가 눌려 스크롤 불가. 그래프(PanoLineChart h200)가 고정 영역에 있어
  스크롤 대상이 아님. owner: pages/motor-detail(MotorDetailPage 셸), features/motor-management/ui(PanoLineChart).
- TARGET_BEHAVIOR (사용자 확정 — 옵션 B):
  - PanoLineChart CHART_HEIGHT 200 → 140.
  - fixedTopSx는 종류칩·안정도(ConditionSummary)·최근 파노(LatestPanoHero)까지 유지, '파노 추세' 헤딩+그래프를
    scrollAreaSx **최상단**으로 이동 → 그래프+기록 리스트가 하나의 스크롤 영역. 헤더(PageHeader)·하단 [측정]은 고정 유지.
- ALLOWED_PATHS:
  - src/features/motor-management/ui/PanoLineChart.tsx (CHART_HEIGHT — component-builder)
  - src/pages/motor-detail/ui/MotorDetailPage.tsx (셸 재구성·주석 — route-builder)
- PUBLIC_CONTRACTS_TO_PRESERVE: PanoLineChart aria-hidden 장식 계약·points asc·PanoLineChart 공개 API(props)·
  기록 리스트 canonical 텍스트/역순/회차/밀어서 삭제·측정 왕복(v2.5)·최근 파노 히어로(R17)·ConditionSummary·
  not-found/error/corrupted/pending 분기·하단 [측정] 고정·표시 포맷 단일화(@shared/lib/format).
- NON_GOALS: 그래프 데이터/축/색 변경, 히어로·컨디션 내용 변경, 새 컴포넌트/route, 데이터 계층 변경,
  PanoLineChart를 prop 기반 높이로 일반화(단일 소비처라 상수 직접 변경).
- CHANGE_BUDGET: 파일 2, 신규 0, dependency 0, 커밋 1. 위임: component-builder∥route-builder(독립 슬라이스 병렬).
- TEST_EVIDENCE: LOCAL_VERIFIABLE — Node22 게이트 4종 + 프리뷰(:8082) 짧은 뷰포트(375×667)에서 리스트 스크롤 동작·
  그래프가 스크롤과 함께 이동·그래프 높이 140·헤더/[측정] 고정 실측.

## R19 — 히어로 영역 가로 2분할(안정도 우측 이동) — 프로토타입/미커밋 (2026-07-31, ui-change)
- CHANGE_MODE: existing-change (**PROTOTYPE** — 사용자 "커밋하지 말고 위치만 이동해서 보여줘")
- REQUEST: 안정도 정보를 최근 파노 히어로 영역과 가로 2단으로 나눠 오른쪽 끝에 표시하는 안을 **위치만 이동**해 보여주기. 커밋 보류.
- OBSERVED_BASELINE: fixedTop에 ConditionSummary(안정도 줄) → LatestPanoHero(히어로) 세로 스택. owner: pages/motor-detail.
- TARGET_BEHAVIOR: fixedTop에서 두 블록을 하나의 2열 flex(space-between)로 — 좌 LatestPanoHero(크기 유지, flexShrink 0),
  우 끝 ConditionSummary. **컴포넌트 내용·로직 무변경(위치만)**. 프리뷰로 시각 확인 후 사용자 결정 대기.
- ALLOWED_PATHS: src/pages/motor-detail/ui/MotorDetailPage.tsx (레이아웃만 — 직접 구현)
- PUBLIC_CONTRACTS_TO_PRESERVE: LatestPanoHero·ConditionSummary 컴포넌트 무변경, 그래프·리스트·측정 왕복·삭제·분기·[측정] 고정.
- NON_GOALS: 커밋, ConditionSummary/LatestPanoHero 내부 수정, 그래프·리스트 변경, 새 컴포넌트.
- CHANGE_BUDGET: 파일 1, 커밋 0(보류). 직접 구현(단일 파일 프로토타입, 프리뷰 시각 튜닝 반복).
- TEST_EVIDENCE: LOCAL_VERIFIABLE — typecheck·lint + 프리뷰(:8082) 375/wider 실측 스크린샷. **커밋 전 사용자 검토.**
- STATUS: 프로토타입 적용 → 사용자 검토 대기(수락 시 저널·커밋 finalize / 거절 시 revert 후 종결 표기).
- REFINEMENT(라이브, 사용자): 우측 안정도 열에서 '보는 법' 버튼을 안정도 텍스트 **아래쪽 오른쪽 끝**으로 정렬.
  → ALLOWED_PATHS에 `src/features/motor-management/ui/ConditionSummary.tsx` 추가(모터 상세 전용 소비처·테스트 없음 —
  가로 1줄 flex → 세로 스택 alignItems flex-end로 레이아웃 조정). 여전히 미커밋 프로토타입.
- 라이브 조정 누적(사용자, HMR): ① 보는 법을 안정도 아래-오른쪽 정렬 ② 추세 문구를 한 줄 띄고 별도 줄로 분리
  ③ `word-break: keep-all`(한글 단어 중간 끊김 방지) ④ 보는 법 버튼 강제 minHeight 48→해제(py 0.25, 실측 29px).
- STATUS(확정, 사용자 "확정"): 수락 → R19 커밋. 최종 changed source 2건 —
  `MotorDetailPage.tsx`(히어로 2열 space-between), `ConditionSummary.tsx`(세로 스택·우측 정렬·보는 법 아래-오른쪽·추세 별도 줄·keep-all·버튼 높이 축소).
  ALLOWED_PATHS 일치. EVIDENCE: Node22 게이트 4종 PASS(123)·check-iterate-scope OK·프리뷰(:8082,375×812) 일반/추세경고 양 케이스 실측·가로 넘침 0·콘솔 에러 0.

## R20 — 이탈 사유 수집 (2026-07-31, feature/existing-change)
- REQUEST: RaceRecord에 이탈 사유(retireReason, optional additive) 추가 — result='retired'일 때 재귀 트리
  드릴다운으로 수집. AI 분석 전제 데이터 수집만(AI 기능 없음). 기획: _workspace/01_plan/race-insight/retire-reason-chipset.md (READY, DL-015~020).
- OBSERVED_BASELINE: result 완주/이탈 2택만 존재(왜 이탈인지 미기록). goal이 optional enum end-to-end 선례.
- TARGET_BEHAVIOR: 입력 시트에서 이탈 선택 시 섹션 칩(코너·점프·다운·웨이브·레인체인지·파츠·멈춤·기타) 1탭,
  점프는 세부(비거리 김·공중 자세·착지 후 튐·그 외) 2탭. 저장은 말단 key 하나. 목록 이탈 행에 사유 표시.
  완주로 바꾸면 사유 자동 클리어. 수정 시 사유 보존.
- ALLOWED_PATHS: src/shared/config/domain.ts(RETIRE_REASON_TREE·파생) · src/entities/race-record/model/schema.ts ·
  src/entities/race-record/api/repository.ts(create+update 영속) · src/features/race-record/ui/{RaceRetireReasonSelect(신규),RaceEntrySheet,RaceRecordRow,index} ·
  src/features/race-record/model/use-race-entry.ts · 각 index/barrel · 관련 테스트.
- PUBLIC_CONTRACTS_TO_PRESERVE: RaceRecord 기존 필드·스키마 무변경(retireReason는 additive optional, read-lenient) ·
  goal/result/voltage/lapTimeMs 기존 배선 불변 · IndexedDB 스키마 버전 불변(optional additive, migration 없음) ·
  서버 동기화 계약 additive · RaceEntryDraft 타입은 additive · 전압 추천 흐름 무변경.
- NON_GOALS: AI 분석·처방 UI(별도 라운드) · 라인 번호 · result 모델 변경(코스아웃/멈춤 분리) · 다중 선택 · race-insight 열람 요약(별개 라운드).
- CHANGE_BUDGET: 파일 ~9(신규 1 컴포넌트 + 수정 6 + 테스트). 커밋 1개. ⚠️ 데이터 무결성: **수정 patch가 retireReason를
  실어야 이탈 기록 수정 시 사유 유실 없음**(goal과 달리 편집 대상 — repository update가 patch에서 취함).
- TEST_EVIDENCE: LOCAL_VERIFIABLE — 트리 파생(leaf 평탄화·reasonPath·speedRelated 상속) unit + 스키마 경계(optional·enum) +
  RaceRetireReasonSelect 드릴다운 render + RaceRecordRow 표시 + **편집 사유 보존 회귀** + 게이트 4종 + check-iterate-scope.
  프리뷰(:8082) 실측: 이탈 선택 시 드릴다운 노출·점프 세부·완주 전환 시 클리어. 실측정 왕복·서버 sync는 DEPLOY_ONLY.

### R20 scope 확장 (2026-07-31) — [측정] 왕복 사유 보존
- 사유: RaceEntryDraft에 required retireReason 추가 → 왕복 handoff 변환부가 컴파일·데이터상 필수 수정.
  goal이 이미 왕복 보존(toHandoffDraft/fromHandoffDraft)되는 선례와 동일하게 retireReason도 보존해야
  이탈 사유 선택 후 [측정] 왕복 시 사유가 유실되지 않는다(baseline 보존).
- ALLOWED_PATHS 추가: src/features/race-measure-handoff/model/store.ts(RaceMeasureDraft에 optional retireReason) ·
  src/pages/race-detail/ui/RaceDetailPage.tsx(toHandoffDraft/fromHandoffDraft 2함수 — goal 미러링).
- 직접 구현(오케스트레이터): mechanical goal-mirror 3지점, 왕복 계약 단일 응집 — 저널 claude.md 기록.

## R21 — 세그먼트·이탈 사유 체크 아이콘 제거 + 텍스트 중앙정렬 (2026-07-31, ui-change)
- TARGET_BEHAVIOR: 선택 표시의 체크 아이콘(✓)을 제거하고 라벨을 가운데 정렬한다. 대상:
  ① 레이스 결과 토글(완주/이탈) ② 이탈 사유 칩(RaceRetireReasonSelect leaf) ③ 모터 정렬(+레이스 정렬 — 같은 공유 컨트롤).
  선택 구분은 채움색 + fontWeight 700 + aria(pressed/selected)로 유지(색 단독 아님).
- ALLOWED_PATHS: src/shared/ui/segment-control/SegmentControl.tsx(공유 — 결과·모터정렬·레이스정렬 공용) ·
  src/features/race-record/ui/RaceRetireReasonSelect.tsx(이탈 사유 leaf 칩).
- PUBLIC_CONTRACTS_TO_PRESERVE: SegmentControl/칩 공개 props·동작·onChange·aria-pressed 상태 불변 ·
  44px 터치 타깃 · 선택 시 fontWeight 700 유지 · MotorKindSelect(종류 선택)는 범위 밖 무변경 · branch 칩('점프 ›') 무변경.
- NON_GOALS: 정렬 대상·옵션 변경, 색/배경 변경, 다른 아이콘 제거, MotorKindSelect 체크 제거.
- CHANGE_BUDGET: 파일 2, 커밋 1. 각 파일에서 16px 체크 슬롯 Box 제거 + CheckIcon import 제거 + 주석 정합(3중→2중+aria).
- TEST_EVIDENCE: 기존 테스트는 aria-pressed 단언(체크 미단언)이라 무영향 — 게이트 4종 + check-iterate-scope.
  실화면(로그인 게이트 뒤)은 DEPLOY_ONLY — 프리뷰는 회귀(로드·콘솔) 확인. forced-colors 약화는 사용자 요청 트레이드오프로 보고.

## R22 — 레이스 인사이트 S안 (파생 요약 카드) (2026-07-31, feature/existing-change)
- REQUEST: 레이스 상세 상단에 저장 없는 파생 요약 카드 — 최근 완주 전압(강조)·완주 전압대·최근 결과 흐름·추세 방향·미정 제외 고지·[보는 법]. 기획 READY(project-brief, DL-012~014). 사용자 구성안 승인(이대로 진행).
- OBSERVED_BASELINE: 레이스 상세는 목록만 — 회차 쌓여도 추세·비교 안 보임(스크롤·암산 필요). advisor 윈도우 로직은 RaceDetailPage:160-163 인라인.
- TARGET_BEHAVIOR: 3+건이면 카드 노출(최근 완주 전압 단일 강조 + 완주 전압대 min~max + 결과 스트릭 + 추세 방향 + '미정 n건 제외' + [보는 법] 다이얼로그). 1~2건 축약('기록이 더 쌓이면', '추세' 단어 금지). 0건 미노출(기존 안내). 삭제/초기화 즉시 재계산.
- DATA 계약(D2 세분화): 완주 전압대 = **전체 finished 회차** / 추세 = **advisor 윈도우(selectAdviceWindow)**. D3: result 미정·랩타임 결측은 제외+건수 고지. 저장·스키마·서버 sync 무변경(읽기 파생만).
- ALLOWED_PATHS: src/entities/race-record/model/race-insight.ts(신규 — computeRaceInsight + selectAdviceWindow 추출) · src/entities/race-record/model/race-insight.test.ts(신규) · src/entities/race-record/index.ts(export) ·
  src/features/race-record/ui/{RaceInsightCard,RaceInsightHelpDialog}.tsx(신규) · 동 index.ts · 동 *.test.tsx(신규) ·
  src/pages/race-detail/ui/RaceDetailPage.tsx(인라인 윈도우→selectAdviceWindow 치환[동작 보존] + 카드 배선).
- PUBLIC_CONTRACTS_TO_PRESERVE: RaceRecord 스키마·repository·racesQuery·전압 추천 흐름(adviceHistory/openWithGoal/requestAiVoltage) 불변 · selectAdviceWindow 추출은 인라인과 동일 결과(desc→최근 완주 포함 slice, 폴백 5) · 목록·정렬·[+ 기록]·초기화·왕복·삭제 무변경 · 고정 셸 스크롤 계약.
- NON_GOALS: 미니 차트·완주 vs 이탈 대역 비교(M안, 2차) · 모터 간 비교 · /race 목록 확장 · 추천 로직 변경 · AI 분석.
- CHANGE_BUDGET: 신규 5(파생+테스트, 카드 2+테스트) + 수정 2(index, RaceDetailPage). 커밋 1. ⚠️ selectAdviceWindow 추출은 동작 보존 회귀 테스트 선행.
- TEST_EVIDENCE: LOCAL_VERIFIABLE — computeRaceInsight fixture F1~F7(0/1~2/혼재/미정/랩타임 일부/동일 전압/20+건) + 완주0 3+건·삭제 3→2 경계(plan-review 보강) + selectAdviceWindow 인라인 동일 회귀 + 카드 render(상태별). 게이트 4종 + check-iterate-scope. 실화면은 로그인 게이트 뒤 DEPLOY_ONLY.

## R23 — recommend-voltage 인증 누락 수정 (2026-07-31, bug-fix/보안)
- REQUEST: 기획(DL-027/D2) 중 발견 — `api/recommend-voltage.js`가 `requireSession` 미적용이라 **무인증 공개 POST 가능**.
  서버 전용 ANTHROPIC_API_KEY를 태우는 denial-of-wallet 노출(배포 중인 실제 위험). AI 기능과 분리해 선제 수정.
- OBSERVED_BASELINE: `api/data.js`는 `requireSession` 적용(선례). recommend-voltage만 누락. 클라 어댑터
  `src/features/race-record/api/recommend-voltage.ts`는 `res.ok` 아니면 휴리스틱 폴백(401도 자연 수렴).
- TARGET_BEHAVIOR: 비인증/무효 세션 POST → 401(업스트림 LLM 호출 없음). 로그인 사용자는 무변경(same-origin
  fetch가 쿠키 기본 전송). 비로그인은 휴리스틱 추천으로 자연 수렴(추천 자체는 계속 동작).
- ALLOWED_PATHS: api/recommend-voltage.js (import 1줄 + 가드 2줄).
- PUBLIC_CONTRACTS_TO_PRESERVE: 요청/응답 계약·모델·max_tokens 300·temp 0·클램프(2.6~3.2/0.02)·프롬프트 전부 불변 ·
  클라 어댑터 무변경(폴백 계약이 401을 이미 처리) · api/data.js 선례와 동일 패턴.
- NON_GOALS: AI 분석 기능(별도 라운드) · rate limit 구현 · 프롬프트/모델 변경 · 클라 코드 변경.
- CHANGE_BUDGET: 파일 1, 커밋 1.
- TEST_EVIDENCE: 게이트 4종 + check-iterate-scope. 서버리스 401 실동작은 로컬에 함수 런타임이 없어
  DEPLOY_ONLY — 사용자 위임(배포 후 비로그인 POST 401 확인). 클라 폴백 경로는 기존 계약(res.ok 분기)으로 보존 확인.

## R24 — 이탈 사유 서버 동기화 유실 수정 + 로그인 소유자 제한 (2026-07-31, bug-fix/데이터·보안)
- REQUEST: Phase 2 설계 중 발견된 2건 즉시 수정(사용자 지시 "지금 둘 다 먼저").
  ① **데이터 유실**: R20이 IndexedDB에만 retireReason을 추가하고 서버 경로를 놓쳐, push 시 사유가 탈락하고
     다음 로그인의 pull→replaceDomainSnapshot(SyncManager:41, 서버 우선 대체)에서 로컬 사유가 소실된다.
     → AI 기획(옵션 B: 사유 수집) 전제 붕괴. 선례 `migrations/003_stability.sql`이 동일 유형을 이미 해결.
  ② **보안**: `api/auth/google/callback.js`에 이메일 allowlist가 없어 임의 구글 계정이 유효 세션을 얻는다.
     R23의 requireSession은 무인증만 차단 → denial-of-wallet 잔여(위협모델 T2①).
- OBSERVED_BASELINE: race_records SELECT(db.js:39)·INSERT(95-96)에 retire_reason 없음. 003_stability.sql이 ALTER
  TABLE ADD COLUMN IF NOT EXISTS 패턴 확립. callback.js는 email_verified만 검사(75-82행).
- TARGET_BEHAVIOR: ① 사유가 서버에 저장·복원되어 기기 왕복·재로그인 후에도 보존 ② ALLOWED_EMAIL 설정 시
  그 계정만 로그인·세션 유지, 타 계정은 거부. 미설정이면 기존 동작 유지(fail-open) + 서버 경고 로그.
- ALLOWED_PATHS: migrations/004_retire_reason.sql(신규) · api/_lib/db.js(SELECT·매핑·INSERT 3곳) ·
  api/auth/google/callback.js(allowlist 게이트) · api/_lib/authGuard.js(기발급 세션 재검증).
- PUBLIC_CONTRACTS_TO_PRESERVE: DomainSnapshot 형태·IndexedDB 스키마·클라이언트 코드 전부 무변경 ·
  retireReason은 optional(구 행 NULL=미보유, undefined 생략 규칙과 일치 — 003 선례) · 기존 로그인 사용자 무영향 ·
  세션 쿠키 계약(HttpOnly/Lax/30일) 불변 · 다른 도메인 필드 동기화 경로 불변.
- NON_GOALS: AI 분석 기능 구현 · rate limit · 세션 폐기 메커니즘 · 과거 유실 데이터 복구(사용자: "그냥 진행").
- CHANGE_BUDGET: 파일 4, 커밋 1.
- ⚠️ 배포 순서 의존: **마이그레이션(004)을 Neon에서 먼저 실행한 뒤 코드 배포**. 역순이면 INSERT가 없는 컬럼을
  참조해 동기화 전체가 실패한다. 마이그레이션 실행은 사용자 승인·수행(harness는 SQL 작성만).
- TEST_EVIDENCE: 게이트 4종 + check-iterate-scope. 서버 왕복(사유 저장·복원)·allowlist 401/403은 로컬에
  serverless·DB 런타임이 없어 DEPLOY_ONLY — 마이그레이션 후 실기기 확인 위임.

## R25 — 레이스 AI 분석 구현 (2026-08-01, feature/existing-change)
- REQUEST: Phase 1~2 설계 완료된 on-demand AI 분석 구현. 설계 canonical: `_workspace/02_design/race-ai/{api-schema,component-spec,layout-spec,ai-architecture,ai-threat-model,data-governance,eval-plan,cost-latency-budget}.md`, 결정 DL-021~030.
- TARGET_BEHAVIOR: 레이스 상세 R22 카드 하단 [AI 분석] 1탭 → 서버가 Haiku 4.5 1회 호출 → 4섹션 구조화 응답(진단·이상·브리핑·다음 판)을 접힘 카드로 표시. 근거 부족이면 버튼 비활성(호출 0회), 실패는 표면화(폴백 금지), 응답 비저장. **AI는 ALLOWED_EMAIL 전용 fail-closed**(DL-030).
- ALLOWED_PATHS:
  · api/analyze-race.js(신규) · api/_lib/authGuard.js(requireAllowedSession 추가) · api/_lib/retire-reason-tree.js(신규 미러) · api/recommend-voltage.js(가드 1줄 교체) · vercel.json(maxDuration)
  · src/features/race-record/api/{analyze-race.ts,analyze-race-payload.ts}(신규) · 동 index.ts
  · src/entities/race-record/model/race-analysis-gate.ts(신규) · 동 index.ts
  · src/features/race-record/model/use-race-analysis.ts(신규) · 동 index.ts
  · src/features/race-record/ui/{RaceAnalysisCard.tsx(신규),RaceInsightCard.tsx(additive props)} · 동 index.ts
  · src/pages/race-detail/ui/RaceDetailPage.tsx(배선) · 각 테스트
- PUBLIC_CONTRACTS_TO_PRESERVE: RaceInsightCard 기존 props·렌더(onAnalyze 미전달 시 100% 동일 — 기존 테스트 무수정 통과가 게이트) · R22 인사이트·목록·[+ 기록]·목표 팝업·왕복·삭제·초기화·로그인 게이트 전부 무변경 · recommend-voltage 요청/응답 계약 불변(가드만 교체, 클라 수정 0) · IndexedDB·서버 스키마 무변경(응답 비저장) · 고정 셸 스크롤 소유권.
- NON_GOALS: 자동 호출·알림 · AI 쓰기(L1 초과) · 모터 간 비교 · 측정 도메인 AI · 자유 텍스트 입력 · 역할별 엔드포인트 분리 · 응답 영속·세션 캐시(D3 기본값 유지 없음) · focus 파라미터(2차).
- CHANGE_BUDGET: 신규 8 + 수정 6 + 테스트 ~6. 커밋 1~2.
- 보안 필수(위협모델 체크리스트): requireAllowedSession(fail-closed) · 서버 필드 allowlist 검증·미지 키 드롭·races 20 슬라이스·body 32KB · retireReason은 **key 배열만 수신**(pathLabel/causal 서버 재구성) · 응답 구조·길이 검증 + **전압 패턴 502 거부** · dangerouslySetInnerHTML 0건 · 프롬프트/응답 원문 무로깅 · payload 제외 필드 부재 테스트.
- TEST_EVIDENCE: LOCAL_VERIFIABLE — 게이트 차단(fetch 0회)·zod 실패·타임아웃/취소·evidence 덮어쓰기·전압 패턴 거부·payload 제외 필드·5상태 render·기존 회귀. 게이트 4종 + check-iterate-scope + 프리뷰(로그인 게이트로 카드 자체는 제한적). 실 LLM 품질·p95·401/403/503 실동작은 DEPLOY_ONLY(eval-plan §3, owner 사용자).

## R26 — AI 분석 프롬프트 개선 (2026-08-01, feature/existing-change)
- REQUEST: R25 프롬프트 리뷰에서 발견한 3결함 수정(사용자 지시: 배포 전 선반영).
  ① **역할 자기모순** — "다음 세팅 조언"을 시키면서 같은 문장에서 "세팅을 결정하지 않는다" → nextRace 섹션이
     위축·생략될 소지. 원 의도는 "앱이 자동 적용하지 않음(L1)"이며 그건 UI caption 소관.
  ② **이탈 사유 미활용** — retireReasons(causal·speedRelated)를 입력으로 주기만 하고 "회차 간 사유 패턴을
     교차 분석하라"는 지시가 없음. R20 수집의 존재 이유가 프롬프트에 미반영.
  ③ **섹션 정의 부재** — 4섹션이 이름만 나열돼 각 섹션이 답할 질문이 없음 → briefing이 수치 재진술로 흘러
     규칙(재진술 섹션 생략)에 걸려 겉돎. planning-context "역할별 답하는 질문" 표를 프롬프트로 승격 필요.
- OBSERVED_BASELINE: api/analyze-race.js:206-231 `SYSTEM_PROMPT` 상수(R25 구현분).
- TARGET_BEHAVIOR: 역할 문장이 "제안하되 단정 금지·적용은 사용자"로 일관 / 사유 교차 분석 지시 명시 /
  섹션별 답할 질문·금지(재진술) 명시. 안전 규칙 6종은 문구 강화만, **약화 금지**.
- ALLOWED_PATHS: api/analyze-race.js(SYSTEM_PROMPT 상수만).
- PUBLIC_CONTRACTS_TO_PRESERVE: 응답 스키마·검증 로직·전압 패턴 스캔·evidence 덮어쓰기·가드·rate limit·
  max_tokens 800·모델·temp 0 전부 불변 · 클라이언트 계약 무변경 · 출력 JSON 형식 예시 불변.
- NON_GOALS: 모델 교체 · 토큰 상한 변경 · 스키마 변경 · 검증 완화 · UI 변경.
- CHANGE_BUDGET: 파일 1(상수 1개), 커밋 1.
- TEST_EVIDENCE: 게이트 4종 + check-iterate-scope(프롬프트는 문자열이라 기존 테스트에 무영향 — 서버 검증·
  스키마 불변 확인이 회귀 기준). ⚠️ **프롬프트 품질 자체는 LOCAL 검증 불가** — 실 LLM 응답으로만 확인
  가능(eval-plan §3 S1~S7). DEPLOY_ONLY로 명시하고 표면 PASS로 보고하지 않는다.

## R27 — 모터 소리 인식률 개선 (근접 완화·voicing 완화·거리 피드백) (2026-08-02, feature/existing-change)
- CHANGE_MODE: existing-change
- REQUEST: 모터 소리를 더 잘 받아들이도록 인식률 개선. (측정 로직 심층 분석·false-negative 실측·최적안 탐색 후 확정)
- OBSERVED_BASELINE: 측정 실패의 주원인 = ① 거리·음량 부족(근접 게이트 rms<0.004) ② 시끄러운 환경(잡음 하 voicing 게이트 0.15).
  실측 판명: 스펙트럼 subtraction·프레임 확대·시간영역 denoise는 무효(병목이 시간영역 pYIN/voicing). owner: shared/lib/audio-analysis, features/measure-session.
- TARGET_BEHAVIOR (실측 기반 3레버):
  - P2: `proximityRms 0.004→0.003` — 더 먼/조용한 모터 회수(실측 peak0.009 rms~0.003대 회수). 넓은대역 잡음은 comb·SNR 게이트가 계속 거부.
  - P3: `gateVoicingThreshold 0.15→0.08` — 잡음 하 인식률↑(합성 2dB 0→회복). SNR·고조파 게이트 불변이라 순수잡음 오검출 0(실측).
  - P1: 엔진 `DisplayEstimate.weakReason`('too-quiet'|'no-pitch') additive → view까지 전달. weak-signal이 'too-quiet'면 MeasureFigures가 "더 가까이 대주세요" 표시(#1 실패 원인 자가해결), 그 외는 종전대로 침묵.
- ALLOWED_PATHS: src/shared/lib/audio-analysis/{types.ts,track.ts,index.ts}, src/features/measure-session/model/machine.ts, src/features/measure-session/ui/{measure-view.ts,MeasureFigures.tsx}
- PUBLIC_CONTRACTS_TO_PRESERVE: INV-13(weak-signal⇒수치 null)·수치 계약·게이트 SNR8dB/고조파2/순음15dB 불변(voicing만 완화)·
  DisplayEstimate 기존 필드·MeasureView 기존 variant(weakReason optional additive)·worker 프로토콜(자동 전달)·측정 왕복·announcement.
- NON_GOALS: SNR 게이트 완화, fMax 상향, 스펙트럼/시간영역 denoise(실측 무효 판명), 새 화면, 데이터 계층 변경.
- CHANGE_BUDGET: 소스 6파일, 신규 0, dependency 0, 커밋 1. 실행: 직접(engine→view 단일 계약 체인·순차 의존·서브시스템 심층).
- TEST_EVIDENCE: LOCAL — Node22 게이트 4종 PASS(typecheck·lint·test 213 — engine fixture 무회귀=voicing 안전) +
  합성 실측(peak0.009 회수 / 조용→weakReason 'too-quiet' / 잡음→ 'no-pitch' / 정상 무영향).
  ⚠️ 실제 마이크 인식률 체감과 "더 가까이" UI 라이브 트리거는 DEPLOY_ONLY(실기기) — 표면 PASS로 보고 안 함.

## R27 — 전압 패턴 거부 과잉 수정 (2026-08-01, bug-fix)
- REQUEST: 실사용에서 AI 분석이 항상 실패(로그 `voltage_pattern_rejected`). DL-031대로 인용 허용·처방만 금지, 위반은 섹션 드롭.
- OBSERVED_BASELINE: api/analyze-race.js — `VOLTAGE_PATTERN.test(JSON.stringify(output))`가 응답 **전체**를 검사해 502 반환(369행). 프롬프트는 "전압 수치 어떤 형태로도 출력 금지".
- TARGET_BEHAVIOR: ① 검사 범위를 `sections.nextRace`로 한정 ② 매칭 시 그 섹션만 삭제하고 200 반환(나머지 분석 유지) ③ 드롭 후 섹션 0개면 502(빈 응답 금지) ④ 프롬프트를 "인용은 허용, 다음 판 제안에서만 수치 금지"로 수정.
- ALLOWED_PATHS: api/analyze-race.js(VOLTAGE_PATTERN 적용부·SYSTEM_PROMPT).
- PUBLIC_CONTRACTS_TO_PRESERVE: 응답 스키마·evidence 덮어쓰기·가드·rate limit·max_tokens·모델·temp·클라 계약 전부 불변 · 다른 안전 규칙 5종(재계산 금지·speedRelated=false 전압 조언 금지·"가능성" 어휘·insufficient·최소 1섹션) 불변 · 최소 1섹션 규칙으로 빈 응답 방지.
- NON_GOALS: 스키마 변경 · 모델·토큰 변경 · UI 변경 · eval-plan 문서 갱신(별도).
- CHANGE_BUDGET: 파일 1, 커밋 1.
- TEST_EVIDENCE: 게이트 4종 + check-iterate-scope + **신규 서버 단위 테스트 없음(api/는 vitest 대상 밖)** — 대신 순수 함수 로직을 프롬프트·검사부 주석으로 고정하고, 실제 동작은 배포 후 로그(`code` 부재=성공)로 확인. DEPLOY_ONLY로 명시.

## R28 — 분석 가중치 스케일 완화 + 결과 기반 초점 규칙 (2026-08-01, bug-fix+feature)
- REQUEST: DL-032 — 20건에서 2217:1로 벌어진 가중치가 패턴 탐지를 무력화. 스케일 완화 + "완주 있으면 완주에, 없으면 이탈에 집중" 규칙 명시.
- OBSERVED_BASELINE: analyze-race-payload.ts가 `RACE_WEIGHT_GROWTH(1.5)` 재사용 → n=20에서 최신 2216.84. 프롬프트에 결과 기반 초점 지시 없음.
- TARGET_BEHAVIOR: ① 분석 payload weight가 20건에서 약 6:1 ② 프롬프트가 완주 유무에 따라 분석 초점을 다르게 잡도록 지시.
- ALLOWED_PATHS: src/shared/config/domain.ts(ANALYZE_WEIGHT_GROWTH 신설) · src/features/race-record/api/analyze-race-payload.ts(상수 교체) · 동 .test.ts(기대값 갱신) · api/analyze-race.js(프롬프트 2곳).
- PUBLIC_CONTRACTS_TO_PRESERVE: **RACE_WEIGHT_GROWTH·assignExponentialWeights·전압 추천 경로 전부 불변**(추천 품질 보존) · payload 스키마·필드 구성 불변(weight 값만 변경) · 서버 검증(weight 유한 양수)·응답 스키마·안전 규칙 불변.
- NON_GOALS: 추천 가중치 변경 · payload 필드 추가 · 스키마 변경 · UI 변경.
- CHANGE_BUDGET: 파일 4, 커밋 1. 직접 구현 사유: 단일 의미 변경이 4파일에 원자적으로 걸쳐 분할 시 테스트 불일치 중간 상태 발생.
- TEST_EVIDENCE: 기존 payload 테스트의 weight 기대값 갱신(n=3 [1.21,1.1,1]) + 20건 비율 검증 + 게이트 4종 + scope. 프롬프트 효과는 DEPLOY_ONLY(로그 verdict·실응답 관찰).

## R29 — 로그인 메뉴에 타미야 경기 일정 외부 링크 (2026-08-02, feature/existing-change)
- CHANGE_MODE: existing-change
- REQUEST: 로그인 상태이면 계정 메뉴(AuthMenu)에 "타미야 경기 일정" 항목을 노출하고, 클릭 시 https://tamiya-race-app-br4o.vercel.app/ 로 이동.
- OBSERVED_BASELINE: AuthMenu(src/features/auth/ui/AuthMenu.tsx) — 로그인 시 계정 메뉴 [사용자 정보 · Divider · 로그아웃]. 비로그인은 아바타 클릭이 바로 구글 로그인 진입(메뉴 없음).
- TARGET_BEHAVIOR: 로그인 메뉴에 '타미야 경기 일정' MenuItem 추가(사용자 정보와 로그아웃 사이, Divider로 그룹 분리). 실제 링크(component="a" href) + target=_blank + rel="noopener noreferrer"(tabnabbing 방지) + 클릭 시 메뉴 close. 비로그인은 메뉴 자체가 없어 노출 안 됨(기존 분기 재사용).
- ALLOWED_PATHS: src/features/auth/ui/AuthMenu.tsx · src/features/auth/ui/AuthMenu.test.tsx(신규 render 테스트)
- PUBLIC_CONTRACTS_TO_PRESERVE: 비로그인 즉시 로그인 진입·아바타/aria 계약·로그아웃 흐름·useSession 계약 전부 불변. 순수 additive 메뉴 항목.
- NON_GOALS: 라우팅 방식 변경(외부 URL은 새 탭), 아이콘 추가, 세션 로직 변경, 앱 내부 라우트 신설.
- CHANGE_BUDGET: 파일 2(소스 1 + 테스트 1), 신규 route/dependency 0, 커밋 1. 직접 구현 사유: 단일 컴포넌트 additive 메뉴 항목.
- TEST_EVIDENCE: LOCAL — Node22 게이트 4종 + AuthMenu render 테스트(로그인 시 항목·href/target/rel 고정 / 비로그인 미표시).
  ⚠️ 실화면(계정 메뉴)은 서버리스 세션 로그인 게이트라 로컬 미표시 — 라이브 노출·이동은 DEPLOY_ONLY(로그인 후 실기기). 컴포넌트 계약은 render 테스트로 LOCAL 고정.
- 프로세스 note: 동시 세션이 change-scope.md를 미커밋 수정 중이라 R29 소스 커밋에는 change-scope.md를 포함하지 않고 저널(claude.md)로 기록. change-scope R29는 working-tree 문서로 남긴다(엉킴 방지).

## R29 — 이탈만 있을 때 insufficient 남발 수정 (2026-08-01, bug-fix)
- REQUEST: 사용자 제보 — 이탈만 있는 모터에서 항상 "분석할 근거가 부족해요"(서버 verdict=insufficient).
- OBSERVED_BASELINE(코드 근거): ① 이탈만이면 `computeRaceInsight`가 `finishedBand: null`·`lastFinishedVoltage: null`
  (race-insight.ts:118-119) → payload가 빈약해 보임 ② 프롬프트 257행 "판단 근거가 부족하면 insufficient"가
  **기준 없이 열린 탈출구** ③ R28의 [분석의 초점]이 완주 케이스를 먼저 서술해 완주가 전제처럼 읽힘.
  → 모델이 섹션을 구성하는 것보다 insufficient가 쉬운 선택이 됨.
- TARGET_BEHAVIOR: 완주 부재를 근거 부족으로 취급하지 않는다. insufficient는 최후 수단으로 좁히고(클라 게이트가
  이미 3건·사유 최소 조건을 검사함을 프롬프트에 명시), 이탈만 있을 때 무엇을 분석할지 구체 지시.
- ALLOWED_PATHS: api/analyze-race.js(SYSTEM_PROMPT 2곳).
- PUBLIC_CONTRACTS_TO_PRESERVE: 스키마·insufficient 응답 경로 자체(2xx 정상)·검증·가드·토큰·모델·클라 계약 불변.
  안전 규칙(재계산 금지·nextRace 전압 수치 금지·speedRelated=false·"가능성" 어휘·최소 1섹션) 불변.
- NON_GOALS: 게이트 조건 변경 · 스키마 변경 · insufficient 경로 제거(근거가 진짜 없으면 여전히 필요).
- CHANGE_BUDGET: 파일 1, 커밋 1.
- TEST_EVIDENCE: 게이트 4종 + scope. 효과는 DEPLOY_ONLY — 이탈만 있는 모터에서 4섹션이 나오는지 실측(eval-plan S2 시나리오).

## R30 — 레이스 자동 입력: 목표 추천 + 주행 전 체크리스트 (2026-08-02, feature)
- REQUEST: Phase 1 기획 완료(race-autofill). 구성안 사용자 승인. 설계 canonical: `_workspace/01_plan/race-autofill/{requirements,feature-plan,plan-review}.md`, 결정 DL-033~039.
- TARGET_BEHAVIOR: ① 목표 팝업에서 기록 기반 추천 목표에 배지+근거 표시(선택은 사용자, 자동 선택 없음)
  ② 입력 시트 결과 세그먼트 아래에 최근 이탈 사유 기반 주행 전 점검 블록(≤3항목, 표시 전용·비저장, 근거 없으면 미노출).
  전압 프리필·advisor·edit·첫 기록 경로는 **무변경**.
- ALLOWED_PATHS: src/shared/config/domain.ts(사유→점검항목 맵) · src/entities/race-record/model/{race-goal-recommend.ts,race-prerun-checklist.ts}(신규)+동 .test.ts · src/entities/race-record/model/race-insight.ts(STREAK_LIMIT export 승격만) · src/entities/race-record/index.ts ·
  src/features/race-record/ui/{RaceGoalSheet.tsx,RacePrerunChecklist.tsx(신규),RaceEntrySheet.tsx}+동 test · src/pages/race-detail/ui/RaceDetailPage.tsx(배선).
- PUBLIC_CONTRACTS_TO_PRESERVE: **스키마·repository·migration·서버 동기화·use-race-entry·voltage-advisor 변경 0**(체크 상태 비저장 — U4에 onChange 콜백 자체를 두지 않아 타입이 차단) · RaceGoalSheet 직전 목표 강조 현행 유지 · openWithGoal 전압 프리필·[AI 추천] 흐름 불변 · edit/첫 기록 경로 신규 UI 미노출 · 기존 테스트 무수정 통과.
- NON_GOALS: 자동 저장 · LLM 자동 호출 · 체크 상태 저장 · 전압 로직 변경 · 팝업 스킵 · edit 프리필.
- CHANGE_BUDGET: 신규 7(selector 2+test 2+체크리스트 컴포넌트+컴포넌트 test 2) + 수정 6. 커밋 1~2.
- 구현 주의(plan-review): ① R2의 "최신 이탈"은 races[0]이 아니라 **result 확정 첫 회차** ② 근거 카피는 "직전 이탈 — 안정 권장"(속도 단정 회피) ③ N04 a11y 테스트 케이스 포함.
- TEST_EVIDENCE: selector unit(R1~R5 전 분기·침묵 경계·매핑·dedupe·상한 3) + 컴포넌트 render(추천 병기·자동선택 없음·체크리스트 비노출·ephemeral·a11y) + 기존 회귀 + 게이트 4종 + check-iterate-scope. 실화면은 로그인 게이트 뒤 DEPLOY_ONLY.

## R31 — 전압 추천 모델 반전(속도 유지) (2026-08-02, bug-fix/도메인 로직)
- REQUEST: DL-040 — 파노 상승 시 전압이 따라 오르던 동작을 "속도 유지"(파노↑ → 전압↓)로 반전. 세 목표 모두.
- OBSERVED_BASELINE: `recommendVoltageHeuristic`이 `fitVoltageForPano`로 V≈aP+b 학습·평가(1건은 순수 비례). 재현: 1건 이력에서 파노 300→320 시 3.00→3.20V.
- TARGET_BEHAVIOR: 속도 지표 `S = panoHz × voltage`를 완주 기록 우선·지수 가중으로 학습 → `V = S/현재파노`. 파노 동일이면 직전 전압 유지, 파노 상승이면 하락. 목표 보정·이탈 회피 cap·클램프(2.6~3.2)·source·rationale 형식은 현행 유지. LLM 프롬프트도 동일 모델로 정정.
- ALLOWED_PATHS: src/shared/lib/voltage-advisor/voltage-advisor.ts · 동 voltage-advisor.test.ts · api/recommend-voltage.js(프롬프트 §도메인·분석 절차).
- PUBLIC_CONTRACTS_TO_PRESERVE: 공개 API 시그니처(`recommendVoltageHeuristic`·`assignExponentialWeights`·`clampVoltage`·타입) 불변 · 반환 shape{voltage, rationale, source} 불변 · 클램프 대역·step·GOAL_DELTA 값 불변 · 이탈 회피 규칙 불변 · 소비처(use-race-entry·recommend-voltage 클라/서버) 수정 0 · R30 목표 추천/체크리스트 무관.
- NON_GOALS: GOAL_DELTA 값 조정 · 클램프 대역 변경 · 이탈 회피 로직 변경 · UI 변경 · R30 산출물 변경.
- CHANGE_BUDGET: 파일 3, 커밋 1. 직접 구현 사유: 모델 반전이 로직·테스트 기대값·LLM 프롬프트에 원자적으로 걸쳐 분할 시 두 추천 경로가 반대 방향을 말하는 중간 상태 발생.
- TEST_EVIDENCE: 기존 13 케이스 중 파노 방향 케이스 **의미 반전**(파노↑→전압↓) + 파노 동일 시 직전 전압 유지 보존 + 완주 우선 표본·완주 0건 폴백 케이스 추가. 게이트 4종 + scope. 실주행 체감은 DEPLOY_ONLY.

## R32 — 측정 깜빡임 보정: 게이트 결손 coast 연장 (2026-08-02, bug-fix)
- CHANGE_MODE: existing-change
- REQUEST: 측정 중 파노 수치가 보였다 "—"로 사라졌다를 반복(깜빡임)해 측정이 안 됨 — 소리가 잠깐 끊겨도 보정 필요.
- OBSERVED_BASELINE: track.ts coast가 missTolerance 8프레임(≈200ms)뿐 — 실기기에서 게이트 결손이 200ms를 넘으면
  weak-signal("—") 전환 + clearTrack으로 **안정창(1.5s) 리셋** → 재획득해도 stable/자동확정(RV-1)이 계속 무산.
  세션 타이머는 이미 1200ms 유예(MEASURING_GAP_TOLERANCE_MS) — 표시 계층만 200ms로 빡빡한 비대칭.
- TARGET_BEHAVIOR: `missTolerance 8→20`(≈500ms) — ≤500ms 끊김은 Kalman coast로 수치·안정창 연속 유지(깜빡임 소멸),
  >500ms는 종전대로 weak-signal(D-9 stale 방지 계약 유지). 세션 유예 1200ms 안쪽이라 타이머 계약과 정합.
- ALLOWED_PATHS: src/shared/lib/audio-analysis/types.ts (상수 1개)
  · [scope 확대] src/shared/lib/audio-analysis/engine.fixtures.test.ts — D-9 테스트 무음 구간 1.0s→1.5s.
    deadline은 missTolerance에서 동적 계산되나 무음이 짧아 coast 연장 후 tail 표본이 10개(>10 sanity 미달).
    stale 검증 자체는 통과 — 검증 창 확보용 fixture 길이만 조정(계약 불변).
- PUBLIC_CONTRACTS_TO_PRESERVE: DisplayEstimate 계약·INV-13(weak⇒null)·게이트 임계(SNR8/고조파2/voicing0.08)·
  fixture ⑤⑥(무음·잡음은 트랙 없음 → coast 미적용, 전 프레임 weak 유지)·⑧(coast 보고값=kf≈300 근방, 계약 내)·세션 1200ms 유예.
- NON_GOALS: 게이트 임계 변경, 세션 유예 변경, UI 변경, 안정 판정 창·CV 변경.
- CHANGE_BUDGET: 파일 1(상수 1), 커밋 1. 직접 구현(단일 상수 튜닝).
- 트레이드오프(명시): coast 연장은 예측값(kf)을 더 오래 표시하고 안정창에 예측 프레임 비중을 늘린다(최대 20/60프레임).
  정지 상태 측정이 주 사용처라 드리프트 위험 낮음 — 실기기 재검증 대상.
- TEST_EVIDENCE: LOCAL — 간헐 끊김 합성신호 A/B(끊김 ≤500ms에서 old=깜빡임/new=연속, >500ms는 양쪽 weak) +
  게이트 4종(engine fixture 무회귀). 실기기 깜빡임 소멸 체감은 DEPLOY_ONLY.
- 라운드 note: 동시 세션이 R30·R31 사용 → 본 라운드 R32. (R29 번호는 양 세션이 중복 사용 — 커밋 해시로 구분.)

### R31 scope 확장 (2026-08-02) — 원칙을 AI 분석·추천 절차에도 반영
- 사용자: "파노가 높아지면 같은 전압이면 속도가 올라간다. 이를 바탕으로 분석해야해" — 원칙(파노↑=같은 전압서 속도↑)이
  추천 도메인 지식뿐 아니라 ① recommend-voltage 프롬프트의 [분석 절차] 1~2단계(아직 옛 "파노↔전압 관계 추정"으로
  자기모순) ② analyze-race 프롬프트의 파노 서술("높을수록 빠르다"만, 인과 누락)에도 반영돼야 함.
- ALLOWED_PATHS 추가: api/analyze-race.js(SYSTEM_PROMPT 파노 도메인 1줄).
- 내용: recommend-voltage 절차 1) S=파노×전압 완주 가중평균 2) V=S̄/파노 역산(파노↑→전압↓)로 정정(도메인 지식과 정합).
  analyze-race: "같은 전압이면 파노↑=속도↑, 회차 간 파노 변화를 이탈·이상 해석 핵심 신호로" 추가(DL-029 전압 수치 금지와 무충돌 — 해석용).

### R33 전압 입력 소수 2자리 (bug-fix, 2026-08-02)
- TARGET_BEHAVIOR: 레이스 입력 폼 전압 스텝퍼 +/−가 소수 1자리로만 조정·반올림하던 것을 소수 2자리로.
  근본 원인: VoltageStepper.stepFrom이 step 0.1 + toFixed(1)로 2번째 소수를 파괴(AI 추천 2.68→ − → 2.6).
  스키마는 이미 maxDecimals 2 허용 — 스텝퍼만 정합 맞춤.
- ALLOWED_PATHS:
  · src/shared/config/domain.ts — VOLTAGE_RANGE.step 0.1→0.02 (입력 스텝만; grep상 스텝퍼 전용 소비).
  · src/shared/ui/voltage-stepper/VoltageStepper.tsx — stepFrom toFixed(1)→toFixed(maxDecimals=2), 주석·aria 라벨 갱신.
  · [신규 테스트] src/shared/ui/voltage-stepper/VoltageStepper.test.tsx — +/− 2자리 유지·경계·no-op 계약 고정.
- PUBLIC_CONTRACTS_TO_PRESERVE: VoltageStepperProps·완전 제어형 value·onChange(raw)·롱프레스 반복·키보드 조작·
  clamp 대역(min 0.1/max 9.9)·voltageSchema(maxDecimals 2, min/max)·AI 추천 배선(toFixed(2)).
- NON_GOALS: AI 추천 대역(VOLTAGE_ADVICE_RANGE 2.6~3.2/0.02) 변경, clampVoltage 바닥(2.6) 변경 — 별도 결정 대기.
  전압 표시 포맷(formatVoltage), 저장 스키마 변경.
- CHANGE_BUDGET: 소스 2 + 테스트 1, 커밋 1. 직접 구현(단일 UI 상수·순수 함수 튜닝).
- TEST_EVIDENCE: LOCAL — VoltageStepper 신규 유닛(2.60↔2.58 스텝, 2.68−=2.66, 경계 clamp) + 게이트 4종.
  실기기 +/− 2자리 조정 체감·AI 추천 2자리 표기는 DEPLOY_ONLY.
- 별건 발견(보고): AI 추천 2.58→2.6은 clampVoltage 바닥 클램프(VOLTAGE_ADVICE_RANGE.min=2.6) — 의도된 규칙이나
  R31 이후 파노 높은 모터에 과할 수 있음. 하한 하향 여부는 사용자 결정 대상(이번 scope 밖).

## R34 — API 응답 캐시 금지: /api 304·stale 응답 수정 (2026-08-02, bug-fix/프로덕션)
- CHANGE_MODE: existing-change
- REQUEST: 모터·레이스 진입 시 "모터 목록을 불러오지 못했습니다" 지속 + 사용자 관측 "서버가 304를 전달".
- OBSERVED_BASELINE(진단): vercel.json `/:path*` catch-all이 `Cache-Control: no-cache`를 **/api/data·/api/auth/session까지** 적용 —
  인증된 사용자별 JSON이 브라우저 캐시+ETag 재검증 대상 → 304(빈 본문). iOS Safari는 fetch에 304를 노출하는 알려진 버그 →
  sync-client `if (!res.ok) return null`에서 pull 상시 실패(304≠ok) → 서버 정본 복구 경로 차단(로컬 오류 고착).
  session도 동일: 캐시된 `authenticated:false` 재사용 가능. 서버 핸들러(data.js·session.js)는 Cache-Control 미설정.
- TARGET_BEHAVIOR: /api 응답은 절대 캐시되지 않는다 —
  ① vercel.json에 `/api/(.*)` 헤더 블록 `Cache-Control: private, no-store`(catch-all보다 뒤, 동일 키 override)
  ② api/data.js·api/auth/session.js 핸들러가 `res.setHeader('Cache-Control','private, no-store')`(서버 정본, 설정 실수 방어)
  ③ 클라이언트 fetch `cache: 'no-store'`(sync-client pull·useSession) — 이미 캐시된 ETag 엔트리 무시, 배포 즉시 회복.
- ALLOWED_PATHS: vercel.json · api/data.js · api/auth/session.js · src/features/sync/api/sync-client.ts · src/features/auth/model/useSession.ts
- PUBLIC_CONTRACTS_TO_PRESERVE: 응답 body·상태코드·클라 파싱 로직 전부 불변(헤더·fetch 옵션만) · assets immutable 캐시 유지 ·
  pull 실패=null 조용 수렴 계약 유지 · 정적 리소스 no-cache catch-all 유지.
- NON_GOALS: replaceDomainSnapshot 검증 추가(후속 후보), ETag 커스텀 구현, 다른 API 핸들러(POST는 캐시 비대상).
- CHANGE_BUDGET: 파일 5, 커밋 1. 직접 구현(헤더·fetch 옵션 기계적 수정).
- TEST_EVIDENCE: LOCAL — 게이트 4종 + 기존 테스트 무회귀(동작 로직 불변). **304 소멸·목록 회복은 DEPLOY_ONLY** —
  배포 후 Network에서 /api/data·/api/auth/session이 항상 200(no-store)인지, 목록 정상 로드 확인.
  ⚠️ 잔여 가설: 로컬 IndexedDB에 이미 나쁜 행이 있다면 pull 회복(서버 우선 교체)으로 해소되지만,
  서버 데이터 자체가 클라 스키마 위반이면 오류 지속 — 그 경우 콘솔 오류 캡처 요청해 2차 진단.

### R34 추천 대역 하한 2.6→2.4 (bug-fix/도메인, 2026-08-02)
- TARGET_BEHAVIOR: 레이스 전압 폼에 AI 추천값이 실제 계산값 그대로 소수 2자리로 표기되게. 사용자 증상:
  "추천은 2.58로 하는데 실제 2.6으로 찍혀". 원인은 반올림이 아니라 **clampVoltage 바닥 클램프**(max(2.6,2.58)=2.6).
  2.58은 0.02 그리드 정상값이라 하한만 걷어내면 그대로 통과. 2.6 하한은 R31(속도 유지) 이전 가정 —
  R31에서는 파노 높은(강한) 모터가 2.6 미만을 정당하게 추천하므로 하한이 R31과 어긋나 있었다.
- ALLOWED_PATHS:
  · src/shared/config/domain.ts — VOLTAGE_ADVICE_RANGE.min 2.6→2.4 (+주석).
  · src/shared/lib/voltage-advisor/voltage-advisor.ts — 대역 서술 주석 2.6→2.4 (로직·상수 불변; NEUTRAL_BASE·GOAL_DELTA 그대로).
  · src/shared/lib/voltage-advisor/voltage-advisor.test.ts — 하한 단언 2.6→2.4 + 2.58 비클램프 케이스 신규.
  · api/recommend-voltage.js — VOLTAGE_MIN 2.6→2.4 + 프롬프트 제약·출력 스펙 "2.6~3.2"→"2.4~3.2".
  · api/analyze-race.js — 주석의 추천 대역 표기 2.6→2.4 (문구만).
- PUBLIC_CONTRACTS_TO_PRESERVE: clampVoltage 시그니처·0.02 그리드·상한 3.2(물리 한계)·recommendVoltageHeuristic 반환 shape·
  finish/stability/speed no-history 기준값 상대순서(완주<안정<속도)·source·rationale 포맷·클라 배선·voltageSchema(입력 0.1~9.9).
- NON_GOALS: 상한 3.2 변경, 입력 스키마 대역 변경, R33 스텝퍼 재변경, GOAL_DELTA·이탈 회피 로직 변경.
- 부수효과(명시): 저파워 모터의 finish 목표가 하한에 걸려 2.6이던 것이 이제 실제값(예 2.4)로 내려갈 수 있음 —
  R31 보수적 완주(느리게=완주율↑)와 정합. no-history finish 기준값(2.9-0.3=2.6)은 하한 위라 불변.
- CHANGE_BUDGET: 소스 4 + 테스트 1, 커밋 1. 직접 구현(단일 상수 + 프롬프트 문구 정합).
- TEST_EVIDENCE: LOCAL — clampVoltage(2.58)=2.58·(1.0)=2.4·(NaN)=2.4, 기준값 상대순서 유지, 게이트 4종.
  실 LLM이 2.58을 반환하고 폼에 2.58로 찍히는 것은 DEPLOY_ONLY(서버리스+실기기).
- 값 선택 근거: 2.4는 미니4WD 실주행 하한 근방(그 아래는 부하시 모터 회전 곤란). 사용자가 다른 값/완전 개방을 원하면 조정.

### R34 방향 전환 (2026-08-02) — 하한 하향 폐기 → 파노 과다 신호
- 사용자 결정: "2.6 하한이 있다면 모터 파노가 너무 높은 거니 더 파노가 적은 모터를 추천해야". 위 R34 초안(하한
  2.6→2.4)은 **폐기**하고 원복. 대신 하한 2.6은 유지하되, 속도 유지 기준선(V=S̄/파노, 목표 보정 전)이 2.6 미만이면
  파노 과다 신호로 보고 rationale에 "더 낮은 파노 모터 권장"을 남긴다.
- 원복: domain.ts VOLTAGE_ADVICE_RANGE.min 2.6 유지 / voltage-advisor.ts 대역 주석 2.6 / recommend-voltage.js
  VOLTAGE_MIN 2.6·프롬프트 2.6~3.2. (초안 편집 전량 되돌림 — 순증분 0.)
- 신규 로직:
  · src/shared/lib/voltage-advisor/voltage-advisor.ts — recommendVoltageHeuristic에 `panoTooHigh = pts>0 && baseV<하한`
    판정 + rationale 경고 append(값은 clampVoltage로 2.6 유지). 목표 보정 전 baseV로 판정해 finish -0.3 오탐 방지.
  · api/recommend-voltage.js — 프롬프트 [제약]에 동일 규칙 1줄(기준 전압<2.6 → voltage 2.6 + 저파노 모터 권장 명시).
  · voltage-advisor.test.ts — 파노 과다 신호 3케이스 신규(과다=2.6+문구 / 정상=문구없음 / 이력0=문구없음).
- PUBLIC_CONTRACTS_TO_PRESERVE(갱신): clampVoltage 하한 2.6·상한 3.2·0.02 그리드·VoltageAdvice 반환 shape(문자열
  rationale에 append만, 필드 추가 없음)·finish/stability/speed 상대순서·클라 배선(rationale=helperText) 전부 불변.
- NON_GOALS(갱신): 하한 값 변경, VoltageAdvice에 구조 필드 추가, 신규 화면/배지, UI 컴포넌트 변경.
- 부수효과: 파노 정상 모터·이력 0건은 문구 없음(오탐 0). 실 LLM이 규칙을 따르는지는 DEPLOY_ONLY.

## R35 — pull 데이터 검증(불량 행 격리) + 목록 에러 원인 표시 + 세션 allowlist 통일 (2026-08-02, bug-fix/프로덕션)
- CHANGE_MODE: existing-change
- REQUEST(사용자 실측): 캐시 삭제 후에도 "모터 목록을 불러오지 못했습니다" 재발 + /api/data 여전히 304.
- OBSERVED_BASELINE(진단): ① replaceDomainSnapshot이 서버 행을 **무검증 저장** — 서버 DB에 현행 클라 스키마 위반 행이
  있으면 pull 성공 시마다 로컬 재오염 → 읽기 data-corrupt throw → 목록 에러 고착(캐시 삭제 무효). ② 목록 Alert가
  원인 없이 고정 문구만 표시 — 기기에서 data-corrupt/storage-unavailable 구분 불가. ③ session.js는 allowlist 미검사 —
  로그인처럼 보이는데 데이터 API만 403인 불일치 상태 가능. (304 잔존은 iOS PWA의 분리 저장소가 옛 번들 유지 — 재설치 안내)
- TARGET_BEHAVIOR:
  ① SyncManager pull 후 서버 스냅샷을 entity 스키마(motorSchema·measureRecordSchema·raceRecordSchema)로 행 단위
    safeParse — 실패 행은 **격리(drop)** + console.warn(store·id) 후 유효 행만 replaceDomainSnapshot. 불량 행이 있어도 앱 동작.
  ② MotorsPage·RacePage 목록 Alert에 DomainError message 한 줄 추가(예: "저장된 데이터를 읽을 수 없습니다") — 기기 자가 진단.
  ③ api/auth/session.js가 isAllowedEmail 검사 — 불허 세션은 authenticated:false(데이터 API 403과 상태 일치).
- ALLOWED_PATHS: src/app/SyncManager.tsx · src/pages/motors/ui/MotorsPage.tsx · src/pages/race/ui/RacePage.tsx · api/auth/session.js
- PUBLIC_CONTRACTS_TO_PRESERVE: pull 실패=null 조용 수렴 · 서버 우선 교체 흐름 · mirror push 계약 · Alert 재시도 버튼 ·
  세션 응답 스키마(authenticated/user) · FSD(app→entities import 허용 경로 사용).
- NON_GOALS: 서버 DB 행 직접 수정, ETag 커스텀, PWA 갱신 로직.
- CHANGE_BUDGET: 파일 4, 커밋 1. 직접 구현(프로덕션 장애 대응 단일 체인).
- ⚠️ 데이터 트레이드오프(명시): 격리된 불량 행은 다음 mirror push에서 서버에서도 제거된다 — 해당 행은 현행 앱이 어차피
  읽지 못하는 행(지금은 그 행 때문에 전체가 불능)이므로 수용. 격리 발생 시 console.warn으로 어떤 행인지 기록.
- TEST_EVIDENCE: LOCAL — 게이트 4종 + SyncManager 격리 로직 unit(불량 행 섞인 스냅샷 → 유효 행만 저장) 가능 범위.
  실기기 회복·304 소멸은 DEPLOY_ONLY — PWA 재설치(홈 화면 삭제 후 재추가) 안내 포함.

## R36 — sanitize 전량 격리 시 역오염 방지: 분기를 raw 기준으로 (2026-08-02, bug-fix)
- CHANGE_MODE: existing-change
- OBSERVED_BASELINE: R35의 serverHasData 분기가 **sanitize 후** 개수 기준 — 서버 전 행이 격리되면 else(시드 push)로
  빠져 오염된 로컬을 서버로 역push하고, 로컬 교체(정화)는 영영 일어나지 않는 빈틈.
- TARGET_BEHAVIOR: 분기를 raw(pull 원본) 기준으로 — 서버에 데이터가 있으면 격리 결과(빈 것 포함)로 서버 우선 교체.
  시드 push는 서버가 진짜 빈 경우에만.
- ALLOWED_PATHS: src/app/SyncManager.tsx (분기 1곳)
- CHANGE_BUDGET: 파일 1, 커밋 1. 직접 구현.
- TEST_EVIDENCE: 게이트 4종 + 기존 sanitize unit 3건 무회귀. 실동작 DEPLOY_ONLY.

## R37 — 서버 타임스탬프 ISO(Z) 정규화: pull 격리 근본 원인 수정 (2026-08-02, bug-fix/프로덕션)
- OBSERVED_BASELINE(실측 확정): /api/data JSON은 정상인데 앱이 표시 불가 + 원인 캡션 "저장된 데이터를 읽을 수 없습니다"(data-corrupt).
  실증: 클라 z.iso.datetime()은 offset('...+00:00', 'YYYY-MM-DD HH:MM:SS+00')·마이크로초 형식을 **거부**. 서버 getUserData가
  created_at/updated_at/measured_at을 raw 반환 → 그 형식이 하나라도 섞이면 pull 행이 통째로 격리(R35)→로컬 붕괴.
- TARGET_BEHAVIOR: getUserData가 모든 타임스탬프를 `new Date(v).toISOString()`(밀리초 Z)로 정규화 — offset·μs·Date 객체 무엇이 와도 클라 통과.
- ALLOWED_PATHS: api/_lib/db.js (isoZ 헬퍼 + 3필드 적용).
- PUBLIC_CONTRACTS_TO_PRESERVE: 응답 필드·정렬·격리 로직·클라 스키마 불변. 시각 의미 동일(UTC 순간 보존, 표기만 통일). μs 정밀도 손실은 앱이 ms만 쓰므로 무해.
- TEST_EVIDENCE: LOCAL — isoZ 정규화 후 motorSchema 통과 실증(offset·μs·Date 4종 전부 OK) + 게이트 4종(266). 실기기 회복은 DEPLOY_ONLY.

## R38 — 목록 조회 실패 근본 수정: summaryRaceRowSchema의 result를 optional로 (2026-08-02, bug-fix/프로덕션)
- CHANGE_MODE: existing-change
- REQUEST(사용자 /api/data 원문 제공): 모터·레이스 목록이 "저장된 데이터를 읽을 수 없습니다"로 실패. 서버 JSON은 정상.
- OBSERVED_BASELINE(데이터로 확정): repository.ts summaryRaceRowSchema.result가 `z.enum(RACE_RESULTS)`(**필수**)인데
  canonical raceRecordSchema.result는 `.optional()`. 사용자 데이터에 result 없는 레이스(R30/v2.31 "레이스 전 세팅" —
  goal만 있고 결과 미정) 1건 존재 → 부팅 검증·R35 sanitize는 canonical(통과)이나 listMotorSummaries의 parseSummaryRaceRow가
  거부 → data-corrupt throw → 그 모터를 가진 사용자의 **전체 목록 불능**. 스키마 이중 정의(projection이 canonical과 drift).
- TARGET_BEHAVIOR: summaryRaceRowSchema.result를 optional로(canonical 정합). MotorSummaryRace.result optional화.
  raceDetailLine이 result 부재 시 "결과 미정 · 전압"으로 표시(RACE_RESULT_LABELS[undefined] 참조 방지).
- ALLOWED_PATHS: src/entities/motor/api/repository.ts · src/entities/motor/model/types.ts · src/features/race-record/ui/RaceMotorList.tsx
- PUBLIC_CONTRACTS_TO_PRESERVE: canonical raceRecordSchema·부팅 검증·R35 sanitize·정렬·rollup·다른 summary 필드 불변.
  result 있는 레이스 표시 문구 불변(미정 케이스만 신규 처리).
- NON_GOALS: R37 타임스탬프 정규화(별도·유효), 서버 데이터 수정, summary 스키마 canonical 재사용 리팩터(범위 확대 회피).
- CHANGE_BUDGET: 파일 3, 커밋 1. 직접 구현(스키마 drift 정합 단일 수정).
- TEST_EVIDENCE: LOCAL — 사용자 실제 /api/data 전체를 3 스키마로 검증(수정 후 0 실패) + summaryRaceRowSchema 회귀 unit
  (result 없는 레이스 통과) + 게이트 4종. 실기기 목록 로드는 DEPLOY_ONLY.

## R39 — 측정 [기록] 로그인 게이트 + 모터 픽 드로어 종류탭·하단 추가버튼 (2026-08-02, feature/ui-change)
- CHANGE_MODE: existing-change
- REQUEST: ① 측정 [기록] 버튼은 로그인 전 미노출 ② 로그인 후 [기록] → 모터 있으면 종류별 탭 분류·선택 ③ [새 모터 추가]는 드로어 하단 항상 표시.
- OBSERVED_BASELINE: deriveMeasureAction(view, handoff, persistenceReady)이 measuring이면 항상 record 액션(로그인 무관).
  MotorPickSheet는 종류 탭 없음 + [+ 새 모터 추가]가 motors>0 else 분기에만(0개는 EmptyState 액션).
- TARGET_BEHAVIOR:
  ① deriveMeasureAction에 loggedIn 추가 — record 결과 && !loggedIn이면 `{kind:'login-hidden'}`. MeasureActionDock가
     login-hidden이면 [기록] 버튼 대신 h56 고정 슬롯에 "로그인 후 기록할 수 있어요" 캡션(버튼 미노출·레이아웃 불변).
     record 외 액션(activate/permission/resume/back-to-origin)은 로그인 무관 그대로.
  ② MotorPickSheet: 서로 다른 종류 ≥2면 MUI Tabs [전체+존재 종류](인라인, FSD 상 feature 간 import 회피, MOTOR_KIND_LABELS 사용)
     로 목록을 필터. 필터 결과 0이면 "이 종류의 모터가 없습니다". 목록은 스크롤 영역(maxHeight).
  ③ [+ 새 모터 추가]를 조건부 밖으로 빼서 스크롤 영역 아래 **항상** 렌더. 0개는 EmptyState 액션 대신 중립 문구+하단 버튼.
- ALLOWED_PATHS: src/features/measure-session/ui/MeasureActionDock.tsx · src/features/measure-session/ui/MeasureActionDock.test.tsx ·
  src/pages/measure/ui/MeasurePage.tsx · src/features/collect-measure/ui/MotorPickSheet.tsx · src/features/collect-measure/ui/MotorPickSheet.test.tsx(신규)
- PUBLIC_CONTRACTS_TO_PRESERVE: MeasureActionDock 슬롯 h56 고정·record 외 액션·MotorPickSheet 스냅샷/에러/pending/onSelect/onRequestRegister 계약·
  BottomSheet·정렬(재정렬 금지)·왕복 모드 INV-21(시트 렌더 0)·표시-기록 일치.
- NON_GOALS: 종류 탭 상태 영속(로컬 UI state), 모터 리스트 페이지 변경, 로그인 흐름 변경, 서버 변경.
- CHANGE_BUDGET: 소스 3 + 테스트 2, 커밋 1. 실행: 위임(Slice A: MotorPickSheet component-builder) ∥ 직접(Slice B: 로그인 게이트 dock+page).
- TEST_EVIDENCE: LOCAL — 게이트 4종 + deriveMeasureAction 로그인 게이트 unit + MotorPickSheet render(탭 필터·하단 버튼 상시·빈 상태) +
  프리뷰(비로그인 측정 화면에서 [기록] 미노출·캡션 실측). 로그인 후 픽 시트 실동작은 DEPLOY_ONLY(계약은 render 테스트).

### R35 AI 추천 방향 안전장치 + 프롬프트 강화 (bug-fix, 2026-08-02)
- TARGET_BEHAVIOR: [AI 추천](LLM/Haiku) 버튼이 파노 상승 시 완주·안정 전압을 오히려 올리는 문제 수정
  (사용자: 파노 474→526인데 완주 추천 2.81). 원인은 배선·휴리스틱이 아니라 **작은 모델이 프롬프트의
  파노↑→전압↓ 원칙을 어기고 "파노 높음=고전압" 직관으로 회귀**. 프롬프트만으론 Haiku에 불안정하므로
  결정론적 방향 안전장치를 어댑터에 추가(하이브리드 폴백 구조의 자연 확장).
- ALLOWED_PATHS:
  · api/recommend-voltage.js — SYSTEM_PROMPT만: 파노↑→전압↓ 원칙 전면화(워크드 예시), 오해 유발
    "전압↔속도 비례" 줄 제거→앵커 규칙으로 교체, 이탈=과속이라 완주·안정은 그보다 낮추라 강화,
    완주 없을 때 이탈 S를 유지 목표로 삼지 말라 명시.
  · src/features/race-record/api/recommend-voltage.ts — 방향 안전장치: goal≠speed에서 LLM 전압이
    같은 goal 휴리스틱보다 tolerance 이상 높으면(파노↑→전압↓ 위반) LLM 결과 폐기→휴리스틱 폴백
    (전압·근거 일관 유지, source='heuristic'). speed는 예외(높음이 목표).
  · [신규] src/features/race-record/api/recommend-voltage.test.ts — 위반→폴백 / 기준 이하→AI 유지 / speed 예외.
- PUBLIC_CONTRACTS_TO_PRESERVE: recommendVoltage 시그니처·VoltageAdvice shape·기존 실패 폴백·clampVoltage 재방어·
  aiAdviceSchema·서버 응답 계약·클라 배선(source/rationale=helperText). 프롬프트 출력 JSON 스키마 불변.
- NON_GOALS: 휴리스틱 로직 변경, 하한 2.6 변경, R34 파노 과다 신호 변경, speed 목표 상한 방어, 서버 응답 형식 변경.
- CHANGE_BUDGET: 소스 2 + 테스트 1, 커밋 1. 직접 구현.
- TEST_EVIDENCE: LOCAL — 어댑터 방향 방어 유닛(fetch mock: 위반 2.82→휴리스틱 / 2.5→AI / speed 3.2→AI) + 게이트 4종.
  실 LLM 응답 품질·프롬프트 준수는 DEPLOY_ONLY. 방향 방어는 LLM이 틀려도 결정론적으로 보장(유닛 커버).
- tolerance: 0.06V(3스텝) — 미세 LLM 조정은 허용, 2.81 vs 2.6 같은 총체적 위반만 폴백.

### R37 인사이트 카드 파노 히어로 (feature/ui, 2026-08-02)
- TARGET_BEHAVIOR: 레이스 인사이트 카드에 "최근 완주 파노"를 "최근 완주 전압"과 나란히 동급 히어로로 표시
  (사용자: "파노값도 아주 중요해"). 파노 = 최근 완주 전압과 같은 회차의 파노(성공 세팅 기준점).
- ALLOWED_PATHS:
  · src/entities/race-record/model/race-insight.ts — RaceInsight에 `lastFinishedPanoHz: number|null` additive,
    computeRaceInsight가 최신순 첫 완주에서 전압과 함께 파노를 잡음(1-pass, 재정렬 없음).
  · src/features/race-record/ui/RaceInsightCard.tsx — ready 1행을 [파노 히어로][전압 히어로] 2열로,
    전압대는 전압 히어로 아래 보조로 이동. insufficient 축약도 "최근 완주 {파노} · {전압}"으로.
  · 픽스처 갱신(신규 필수 필드): race-insight.test·RaceInsightCard.test·analyze-race-payload.test·
    analyze-race.test·race-goal-recommend.test·race-analysis-gate.test.
- PUBLIC_CONTRACTS_TO_PRESERVE: RaceInsight 기존 필드·kind 분기·finishedBand·trend·streak·excluded·
  formatVoltage/formatFanoHz 자릿수·empty=null·완주0건 "완주 기록 없음"·onOpenHelp·[보는 법] 배선.
- NON_GOALS: RaceRecordRow·RaceMotorList 레이아웃 변경(파노 이미 주값), 서버 동기화·스키마 변경, 파노 값 출처 변경(완주 파노 확정).
- CHANGE_BUDGET: 소스 2 + 픽스처 6, 커밋 1. 직접 구현(엔티티 additive + 카드 레이아웃).
- TEST_EVIDENCE: LOCAL — insight lastFinishedPanoHz 단언(구분값 480) + 카드 render(파노·전압 2 히어로, insufficient 짝) + 게이트.
  실화면 레이아웃(2열 히어로 폭·정렬)은 로그인 게이트 뒤 DEPLOY_ONLY — 프리뷰 불가, render 테스트로 계약 고정. 배포 후 시각 튜닝 가능.

## R40 — 모터 픽 드로어 높이 50vh 고정 + 리스트 내부 스크롤 (2026-08-02, ui-change)
- CHANGE_MODE: existing-change
- REQUEST(사용자): [기록] 눌렀을 때 뜨는 드로어 높이를 화면의 1/2(50vh)로 고정하고, 모터 리스트는 그 안에서 스크롤.
- OBSERVED_BASELINE: BottomSheet는 콘텐츠 높이에 맞춰 자라며(고정 높이 없음), MotorPickSheet는 리스트만 maxHeight:50vh로 감쌌다 —
  스냅샷/탭/버튼까지 더해지면 시트 총높이가 가변이고, 항목이 적으면 시트가 얇아 [기록] 흐름의 높이가 들쭉날쭉.
- TARGET_BEHAVIOR:
  ① BottomSheet에 선택적 `height` prop 추가 — 지정 시 Drawer paper를 그 높이로 고정하고 내부를 flex 컬럼으로 만들어
     콘텐츠가 스크롤 영역을 소유하게 한다. 미지정(기본)이면 종전 콘텐츠 높이 자동(등록/목표/레이스 시트 무변).
  ② MotorPickSheet가 height="50vh" 전달. 내부 재구성: 스냅샷/에러/탭/버튼은 flexShrink:0 고정,
     모터 리스트 영역만 flex:1·minHeight:0·overflowY:auto로 스크롤. [+ 새 모터 추가]는 하단 고정 유지(R39 계약).
- ALLOWED_PATHS: src/shared/ui/bottom-sheet/BottomSheet.tsx · src/features/collect-measure/ui/MotorPickSheet.tsx
- PUBLIC_CONTRACTS_TO_PRESERVE: BottomSheetProps 기존 필드(open/title/onClose/onOpened/children)·height는 선택(기본 동작 불변)·
  MotorPickSheet props·R39 종류탭·하단 상시 버튼·스냅샷/에러/pending/onSelect/onRequestRegister·표시-기록 일치·정렬 금지.
- NON_GOALS: 다른 3개 시트(폼·목표·레이스) 높이 변경, 픽 시트 로직/필터 변경, 테마 MuiDrawer 기본값 변경.
- CHANGE_BUDGET: 소스 2, 커밋 1. 직접 구현(레이아웃/CSS).
- TEST_EVIDENCE: LOCAL — 기존 MotorPickSheet render 6건·전체 게이트 4종 회귀 통과(구조 유지) + 프리뷰 미로그인 회귀(R39 캡션·무오류).
  열린 시트의 50vh 고정·리스트 스크롤 실측은 DEPLOY_ONLY(로컬은 마이크·로그인 없이 [기록]→시트 오픈 불가) — 레이아웃은 결정론적 flex 계약.

## R41 — 레이스 UX 개선 6종 (2026-08-03, ui-change + feature)
- CHANGE_MODE: existing-change
- REQUEST(사용자): ① 모터상세→레이스상세 진입점 ② 레이스 기록 행 클릭→수정·스와이프 삭제만
  ③ 목록 파노=최근 측정 파노(레이스 없어도) ④ 레이스 있으면 완주 전압+파노 노출 ⑤ 랩타임 실측 타이머 팝업
  ⑥ 요약 카드 Hz/V 단위 제거·파노 색=전압 색. (Q확정: ③④ 완주 우선/엔티티 파생 추가, ① 진입점 구현)
- TARGET_BEHAVIOR:
  ① MotorDetailPage 본문 상단에 "레이스 기록 보기 →" 진입 행 → navigate('/race/:motorId') (history push, 뒤로가기 복귀).
  ② RaceRecordRow: 행 본체를 클릭 가능한 button으로(onClick→onEdit, 키보드 Enter/Space, aria-label 유지).
     스와이프 트레이에서 [수정] 제거, [삭제]만(trayWidth ×1). SwipeActions의 tap/swipe 구분(handleClickCapture) 그대로 활용.
  ③④ MotorSummary에 lastFinishedRace 파생 추가(entities/motor: types.ts + repository.ts listMotorSummaries —
     race.rows에서 result==='finished' 중 createdAt 최대). RaceMotorList 우측: 주값=완주 파노→없으면 최근 측정 파노→없으면 —,
     부값=완주 있으면 "완주 · {완주 전압}" / 레이스 있고 완주 없으면 "완주 기록 없음" / 레이스 없으면 "레이스 기록 없음".
  ⑤ 신규 LapTimerDialog(race-record/ui): performance.now() 기반 히어로 타이머, [시작]→[정지] 토글, 정지 후 [완주]/[이탈]/[취소].
     완주→onResult('finished', sec)·이탈→onResult('retired', sec)로 부모가 draft에 result+lapTimeRaw 반영(취소=무효).
     RaceEntrySheet 랩타임 FormField action에 TimerIcon 버튼 추가로 오픈. TimerIcon은 shared/ui/icons 신규.
  ⑥ RaceInsightCard: 히어로 파노/전압에서 단위 제거(formatPanoValue·기존 voltageDigits), 파노 색 text.primary→primary.main(전압과 동일).
- ALLOWED_PATHS: src/entities/motor/model/types.ts · src/entities/motor/api/repository.ts · src/entities/motor/api/repository.summary.test.ts ·
  src/features/race-record/ui/RaceMotorList.tsx · src/features/race-record/ui/RaceRecordRow.tsx · src/features/race-record/ui/RaceRecordRow.test.tsx ·
  src/features/race-record/ui/RaceInsightCard.tsx · src/features/race-record/ui/RaceInsightCard.test.tsx ·
  src/features/race-record/ui/LapTimerDialog.tsx(신규) · src/features/race-record/ui/LapTimerDialog.test.tsx(신규) ·
  src/features/race-record/ui/RaceEntrySheet.tsx · src/features/race-record/ui/index.ts · src/shared/ui/icons/icons.tsx · src/shared/ui/icons/index.ts ·
  src/pages/motor-detail/ui/MotorDetailPage.tsx
- PUBLIC_CONTRACTS_TO_PRESERVE: MotorSummary 기존 필드(additive만)·listMotorSummaries 정렬·RaceRecordRow onEdit/onDelete/swipe props·
  SwipeActions 계약·RaceEntrySheet draft/제출/검증 계약·useRaceEntry(onDraftChange result→retireReason 클리어)·formatFanoHz/Voltage 전역 불변(카드 내부만 단위 제거)·
  RaceInsightCard aria-label "레이스 요약"·정렬 금지·표시-기록 일치.
- NON_GOALS: 전역 formatter 단위 제거, 다른 화면 파노 색 변경, race 스키마/서버 변경, 측정 화면 타이머, 목록 정렬 변경.
- CHANGE_BUDGET: 소스 ~11 + 테스트 ~4, 커밋 1(직접). 동시 세션(R37 race-insight) 커밋 완료·트리 깨끗 — 내 파일만 스테이징.
- TEST_EVIDENCE: LOCAL — repository.summary lastFinishedRace 회귀 + RaceRecordRow 클릭·삭제 render + RaceInsightCard 단위/색 render +
  LapTimerDialog 상태기계(시작/정지/완주/이탈/취소) render + 게이트 4종. 로그인 필요한 레이스 실화면(목록/상세/타이머 실동작)은 DEPLOY_ONLY.
