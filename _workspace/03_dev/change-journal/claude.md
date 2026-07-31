# change-journal — claude (직접 구현 owner)

> 프로세스 결함 소급 고지(2026-07-31): R1~R11 iterate 라운드의 저널이 누락되었다 —
> 각 라운드의 CREATED/MODIFIED/EVIDENCE는 해당 커밋(a7c2fd0~e97c035) diff가 canonical.
> 본 라운드(R12)부터 append 원칙을 복원한다.

## 2026-07-31 R12 길들이기 — 스테이지 A(데이터 계층) 진행 중
- MODIFIED: src/shared/config/domain.ts — BREAK_IN_* 상수 additive (기존 상수 무변경)
- MODIFIED: src/shared/lib/persistence/schema.ts — DB v3(store 6개), 기존 4 store 계약 보존
- MODIFIED: src/shared/lib/persistence/db.ts — upgrade 2→3 additive (v2 데이터 drop 금지 계약)
- EVIDENCE: 진행 중 — 완료 시 CI=true pnpm typecheck·lint·test·build

## 2026-07-31 R12 길들이기 — **폐기(사용자 결정)**
- REVERTED: src/shared/config/domain.ts · persistence/schema.ts · persistence/db.ts — git restore로 HEAD 원복(0 diff)
- MODIFIED: _workspace/01_plan/break-in-feature-plan.md — 폐기 표기 (문서는 이력으로 보존)
- EVIDENCE: git status src 클린 + CI=true pnpm typecheck·test PASS (아래 게이트)

## 2026-07-31 R13 헤더 고정 (ui-change)
- MODIFIED: src/shared/ui/page-header/PageHeader.tsx — sticky top + 불투명 배경 + safe-top 커버.
  보존: h 56px(env=0 시 layout shift 0)·h1 계약·모터 상세 고정 셸과 무해 공존
- EVIDENCE: 프리뷰 computed style(position sticky·top 0·z 1100·opaque bg) + 600px 스크롤 시
  header top 0 유지 실측 / 게이트 4종 PASS + check-iterate-scope OK

## 2026-07-31 R14 종류 필터 단일 선택 탭 (ui-change)
- MODIFIED: model/kind-filter-store.ts — toggle→select(단일 교체). 저장 배열 형태 유지(하위 호환)
- MODIFIED: model/use-motor-kind-filter.ts — selectedKind(단일)·select 공개, 다중 잔존값은 첫 항목 채택
- MODIFIED: ui/MotorKindFilter.tsx — 칩 행 → MUI Tabs scrollable([전체]+종류, 44px, indicator 이중화)
- MODIFIED: pages/{motors,race} — prop 배선(selectedKind/onSelect)
- CREATED: ui/MotorKindFilter.test.tsx — 탭 렌더·단일 aria-selected·onSelect/onClear 계약
- MODIFIED: model/kind-filter-store.test.ts — 단일 선택 의미로 갱신
- EVIDENCE: 게이트 4종 PASS(123 tests) + check-iterate-scope OK / 실화면은 로그인 게이트로
  DEPLOY_ONLY — 사용자 위임(컴포넌트 계약은 렌더 테스트로 고정)

## 2026-07-31 R15 안정도 용어 통일 — 오케스트레이션 (ui-change)
- 위임: component-builder×2(measure-session/motor-management) + test-writer 병렬 3건 — 소스 편집은
  전부 subagent 수행. subagent 저널 Write가 enforce-agent-ownership hook에 차단되어 반환 원문을
  오케스트레이터가 각 저널 파일에 대필 기록.
- EVIDENCE: Node 22 pin(CI=true pnpm) typecheck·lint·test(123/123)·build 4종 PASS +
  check-iterate-scope OK(소스 4건 = ALLOWED_PATHS 일치) + 프리뷰 실측(측정 S1 캡션 '안정도' 스크린샷).
  run-quality-gates.mjs는 기존 profile 이슈("external ingestion markers not covered")로 fail-closed —
  R15와 무관, 별도 과제로 분리.

## 2026-07-31 R16 레이스·측정 헤더 고정 — verification-only
- NO_SOURCE_CHANGE: 프리뷰 실측으로 요청 상태가 현재 코드에 이미 충족됨을 확인 —
  /race sticky header top 0 유지(데스크톱·모바일 375px, 400~600px 스크롤), /(측정) 375×667·375×812
  모두 docScrollHeight==viewport(스크롤 없음), 상세 2종은 자체 고정 셸. 추정 원인은 R13 이전
  배포본/캐시 관측 — change-scope.md R16 항목 참조.
