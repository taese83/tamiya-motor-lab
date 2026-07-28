# Phase 2 완료 체크포인트 결과 (2026-07-28)

사용자 확인 완료. **Phase 3 착수 승인.** Phase 3 wave는 이 파일을 checkpoint-phase1·decision-log의 증보로 읽는다.

## 확정된 결정

### CP2-1. Phase 2 설계 전체 승인
- 화면 5종(S1~S5)+not-found, 라우트/탭 구조, 컴포넌트 인벤토리(shared 12·entities 4·features 7), command 14+query 6+computeGuide, 디자인 시스템(light 단일·시스템 폰트·tabular-nums) 그대로 확정.

### CP2-2. CP-1a 확정 — 모터 상태 등급 4단계 **유지**
- 어휘: `신품 · 길들이기중 · 전성기 · 노화` (키: `new / breaking_in / prime / worn`).
- 사용자 질의("등급이 왜 필요한가")에 근거(원요청 '모터 상태 추적' pain + 수명 단계별 RPM 맥락, computeGuide 미사용·표시 전용) 설명 후 **유지 결정**.
- ASSUMPTION → **확정** 승격. 라벨 변경은 `MOTOR_STATUS_GRADE_LABELS` 맵 1곳.

### CP2-3. 등급 미선택 시 **null(미지정) 저장** — AS-2 기각, SC-A1 채택
- `createMotor` 생략 시 `null` 저장. `DEFAULT_MOTOR_STATUS_GRADE` 상수 **생성 금지**.
- Motor.statusGrade 타입 = `MotorStatusGrade | null`. 수정 시트에서 재탭 해제(deselect)로 null 복귀 허용(GradeSegment `allowDeselect`).
- api-schema §1 config·§2.2 스키마·AS-2 행 개정 반영 완료.

### CP2-4. 모터 이름 상한 **30자 통일** — AS-1 채택, SC-A2의 50자 정정
- `MOTOR_NAME_MAX_LENGTH = 30`. state-contract 전 표기(필드 계약·INV-18·createMotor pre·C-7·SC-A2) 30자로 개정 완료. 메모 200자는 양 문서 일치(유지).

## baseline 이의 없음 확인 (유지)
- DS-A1 light 단일 테마(다크 미지원) · DS-A2 시스템 폰트 · FP-A4 RunRecord immutable · SC-A3 삭제 undo 없음 · D4 주행 결과 어휘(완주/코스아웃/미주행) · 전압 0.1~9.9V · SC-A4~A9, CD-A1~A5, AS-3 전부 baseline 진행.

## Phase 3 전달 지시
- shared/config에 `DEFAULT_MOTOR_STATUS_GRADE`를 만들지 않는다. 등급 UI 초기값은 항상 미선택.
- GradeChip: statusGrade null이면 칩 미표시(미지정 표기 강제 없음).
- 잔여 운영 항목: TS-D1(호스팅 provider, 실기기 세션 전 결정) · B1 실기기 검증 세션(owner: 사용자) · D4 어휘 재확인 기회는 Phase 3 전 지금이 마지막이었음(이의 없음 확인됨).
