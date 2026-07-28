# Phase 1 완료 체크포인트 결과 (2026-07-28)

사용자 확인 완료. Phase 2 착수 승인으로 간주한다. Phase 2 wave는 이 파일을 decision-log의 증보로 읽는다.

## 확정된 결정

### CP-1. PB-C1 해소 — 모터 상태 입력: **선택형 + 메모 병행**
- Motor 스키마: `statusGrade`(선택형 enum) + `statusMemo`(자유 텍스트, optional) 두 필드.
- 사용자가 등급 값을 지정하지 않음 → **ASSUMPTION CP-1a**: baseline enum = `신품 · 길들이기중 · 전성기 · 노화` (4단계, shared/config 상수 1곳 교체 가능하게 설계). Phase 2 component-spec 검토 시 사용자에게 노출해 확인.
- planning-context A4의 "선택형" 방향과 하류 문서의 "메모" 수렴안을 병합한 사용자 결정. UX 입력은 등급 세그먼트(필수 아님, 기본값 허용) + 메모 1줄로 심플 원칙 유지.

### CP-2. A1 확정 — 파노값 = FFT 추출 모터 회전 **기본 주파수(Hz)**
- 표시: RPM(정수) + 파노(Hz, 소수 1자리). RPM = 파노 × 60.
- DL-002(A1)를 ASSUMPTION → **확정**으로 승격. analysis-algorithm.md v2 출력 계약 그대로.

### CP-3. D3 확정 — 모터 삭제 = **확인 후 cascade 삭제**
- confirm 창에 실측 기록 건수 고지("기록 n건이 함께 삭제됩니다") 후 단일 트랜잭션 일괄 삭제. baseline이 사용자 확정으로 승격.

## baseline으로 진행 (질문 불요 확인됨)
- D1: 가이드 최소 만족 기록 3건 (`GUIDE_MIN_SATISFIED` 상수)
- D2: 측정 없이 직접 기록 입력 허용 (측정값 nullable)
- D4: 주행 결과 enum `완주 · 코스아웃 · 미주행(측정만)` (Phase 3 전 어휘 재확인 가능)
- TS-D1: 호스팅 provider 미정 (HTTPS 필수만 고정, 실기기 세션 전 결정)

## 운영 결정 (B2 해소, 2026-07-28 개정)
- 기획·설계·QA 산출물은 `workspace/minicar-motor-lab/_workspace/`에 유지 (초기 결정은 harness root `_workspace/`였으나 사용자 결정으로 프로젝트 내부로 이동 완료).
- 앱 소스는 `workspace/minicar-motor-lab/`.
- 이후 Phase의 모든 `_workspace/...` 경로 참조는 `workspace/minicar-motor-lab/_workspace/...`로 해석한다. 릴리즈 시점 별도 복사는 불필요.

## Phase 2 전달 지시 (plan-review F-1~F-4)
- F-1: `resetAllData`에 REQ-ST-007급 confirm 계약(명시 확인+삭제 범위 고지+초기 포커스 취소) — state-contract 위임 ④ + ConfirmDialog 계약에 포함.
- F-2: 마이크 권한 일시/영구 거부 감지 전략 — Permissions API 가용 시 사용 + 미가용(iOS) fallback(재요청 실패 반복 시 영구 안내 승격) 정의. 실동작은 실기기 세션 검증.
- F-3: RunRecord immutable(생성·삭제만)을 ASSUMPTION FP-A4로 승격 — additive migration 확장 경로 명시, baseline 진행.
- F-4: 시나리오 ID 보강 — C-7(모터 이름 검증 실패), D-10(목록 읽기 실패) 부여.
