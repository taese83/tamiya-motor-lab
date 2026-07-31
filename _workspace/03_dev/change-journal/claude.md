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
