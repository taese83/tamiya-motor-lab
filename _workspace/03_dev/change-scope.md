# Change Scope — UX/UI 재설계 (다크 레이싱 계기판, 2026-07-28)

## TARGET_BEHAVIOR
- 전 화면(S1~S5)의 시각 스타일을 "레이싱 계기판" 무드의 다크 기본 테마로 재설계한다.
- 라이트 테마를 유지하고 사용자 토글로 전환 가능 (다크가 기본값). 선택은 localStorage 영속.
- **S1 수치 존에 커스텀 SVG RPM 아크 게이지(타코미터) 추가** (2026-07-28 사용자 결정 — 라이브러리 비교 후 커스텀 SVG 채택, 의존성 0). 측정 대역 170~620Hz(≈10,000~37,000 RPM) 고정 눈금 + 상단 레드존. 데이터 흐름은 기존 MeasureView 그대로 — 표시 형식만 확장.
- 그 외 기능·데이터·라우팅·상태 머신은 변경하지 않는다.

## ALLOWED_PATHS
- `src/app/theme.ts` (팔레트·토큰 전면 개정, colorSchemes dark/light)
- `src/app/**` (ThemeProvider 모드 배선, 토글 배치)
- `src/shared/ui/**` (토큰 소비 스타일 조정 — props 계약 불변)
- `src/features/*/ui/**`, `src/pages/**` (스타일 sx 조정만)
- `src/shared/config/design-tokens.ts` (존재 시 토큰 개정)
- `index.html` (theme-color meta)
- `_workspace/02_design/design-system.md` (v2 개정)

## PUBLIC_CONTRACTS_TO_PRESERVE
- 모든 컴포넌트 public props 타입 · FSD 경계 · 라우트 테이블 · handle 메타
- 측정 상태 6종 enum과 상태별 시각 구분(색+라벨+아이콘 3요소 병행 — REQ-NFR-003)
- 수치 tabular-nums·고정 높이(layout shift 금지) · 터치 타깃 ≥44px · WCAG 2.2 AA 대비
- IndexedDB 스키마·command·query 일체 불변

## NON_GOALS
- 기능 추가/제거, 화면 구조·IA 변경, 애니메이션 프레임워크 도입(게이지 바늘 전환은 CSS transition만), 웹폰트 추가(성능 예산 재검토 전), 게이지·차트 **라이브러리** 도입(커스텀 SVG만 — 신규 의존성 0 유지), 데이터 분석용 차트/스펙트럼/파형(Won't 유지 — 게이지는 표시 형식이지 분석 시각화가 아님)

## CHANGE_BUDGET
- 소스 변경: 테마 1 + 앱 셸 ≤4 + shared/ui ≤14 + pages/features sx 조정 ≤12 파일
- 신규 의존성 0개 (MUI colorSchemes 내장 기능만)

## TEST_EVIDENCE
- 기존 22건 엔진 테스트 회귀 없음 · typecheck/lint 클린 · 프로덕션 빌드 성공
- preview 스모크: 다크/라이트 각각 전 화면 렌더 + 콘솔 에러 0 + 토글 영속 확인
- 다크·라이트 각 팔레트 WCAG AA 대비 계산치 기록 (design-system v2)
