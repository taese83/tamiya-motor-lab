# Phase 3 오케스트레이션 결정

## OD-1. `data-ui-binder` 미사용 (사용자 지시, 2026-07-28)

**결정**: Phase 3의 페이지 배선 단계에서 `data-ui-binder` agent를 실행하지 않는다.

**근거**: data-ui는 사내 전용 대상이라 이 프로젝트(개인 도구)에는 적용하지 않는다 — 사용자 지시. 부수적으로 `data-ui-binder`의 소유 경로가 `src/pages/`, `src/widgets/`, `src/features/*/ui/`로 넓어, component-builder가 component-spec의 props·상태·a11y 계약(포커스 연속성, Z2 고정 높이, 슬롯 예약 등)에 맞춰 완성한 feature UI를 덮어쓸 위험도 있다.

**대체 배선 경로**:
- 페이지 조립(hook 구독 → feature 컴포넌트에 props 전달) — `route-builder` (`src/pages/`, `src/app/routes/`, `src/widgets/layout/` 소유)
- 전역 provider·배너·ToastHost mount — `app-shell-builder` (`src/app/` 소유)
- feature UI(`src/features/*/ui/`)는 계약 변경이 필요할 때만 `component-builder`로 되돌린다.

**영향**: skill의 Phase 3 6단계(`data-ui-binder`)는 위 두 owner로 분해 실행한다. Gate C의 "requirement → screen → owner → source trace" 검증 기준은 그대로 적용한다.
