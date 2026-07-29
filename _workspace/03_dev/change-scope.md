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
