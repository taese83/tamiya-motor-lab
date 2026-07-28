VERDICT: NEEDS_DECISION

# Plan Review — minicar-motor-lab (Phase 1 Wave 6)

- 리뷰 일자: 2026-07-28 / 리뷰어: plan-reviewer (read-only)
- 대상: `/Users/kakao/Project/web-harness/_workspace/01_plan/` 하위 planning-context · decision-log · requirements · ux-brief · feature-plan · tech-stack · project-brief · analysis-algorithm (8건)
- 기준: `planning-readiness-contract.md` Readiness Gate 전 항목 + `scenario-contract.md` Must별 정상·실패·경계 evidence

## 판정 요약

Phase 1 산출물은 Readiness Gate 전 항목을 실질적으로 충족한다. traceability는 Must 14건 전수에 owner·evidence가 부여됐고, 데이터 전략(mock)·Mock→real 전환 조건·effort(M/split)·최소 가시 검토 단위가 모두 계약 형식대로 고정됐다. **Phase 2 wave들은 지금 즉시 병렬 착수 가능하다** — 시작 자체를 막는 항목은 없다.

다만 PASS가 아닌 NEEDS_DECISION인 이유: 계획 스스로가 "임의 확정 금지"를 선언한 미해소 충돌(PB-C1)이 Phase 2 산출물 2곳(Motor 스키마 v1, 등록 시트 컴포넌트)의 확정을 막고, 계획이 "첫 검토(=본 리뷰) 최우선 확인"으로 시한을 박은 ASSUMPTION A1이 아직 사용자 명시 확인 전이다. 이 상태에서 Phase 2를 끝까지 가면 사용자 선택을 대신 발명하게 되므로, readiness contract의 NEEDS_DECISION 정의("안전하게 병렬화 가능하나 사용자 선택 필요")에 정확히 해당한다.

## 사용자에게 물을 항목 (우선순위 — Phase 2 산출물 확정 전 필요)

### 1. PB-C1 — 모터 상태 입력: 자유 텍스트 메모 vs 선택형

- **판정 근거**: Wave 0 확정 방향(planning-context A4 "모터 상태·주행 결과는 **선택형** 입력")과 하류 3개 문서(requirements REQ-F-003 · ux-brief 등록 시트 · feature-plan `Motor.statusMemo` 자유 텍스트)가 명시적으로 충돌한다. project-brief §Conflicts가 이를 정직하게 드러냈고 "임의 확정하지 않음"을 선언했다 — silent resolution이 아닌 점은 우수하나, 사용자 답 없이는 Phase 2가 이 결정을 대신 내리게 된다.
- **영향**: Motor 스키마 v1(state-contract-designer), 등록/수정 시트 UI(component-designer) — Phase 2 디자이너 4명 중 2명의 산출물. 늦게 답하면 rework, 선택형으로 바뀌면 `statusMemo` → enum 필드 교체(스키마 영향).
- **권고안**: 자유 텍스트 baseline(W1~W3 수렴안) 수용 여부를 1문항으로 확인. 개인 도구에서 "길들이기 30분", "브러시 마모 의심" 같은 자유 메모가 선택형 enum보다 실사용 정합성이 높아 **baseline(자유 텍스트) 승인을 권고**하되, 사용자가 선택형을 원하면 선택지 값 정의(A4 원안)까지 함께 받을 것.

### 2. A1 — 파노값 = f₀(Hz) 해석의 사용자 명시 확인

- **판정 근거**: 오케스트레이터 지시의 후보군(D1~D4, TS-D1, PB-C1) 밖이지만, 미결 대장(project-brief) 스스로 A1의 확인 시한을 "**첫 검토(Phase 2 전·최우선)**"로 지정했고 본 리뷰가 그 첫 검토다. 여기서 넘기면 계획 자체의 검증 일정을 위반한다.
- **영향**: 표시 계층 라벨·환산식 전반. 오해석이어도 표시 계층만 교체되도록 분리 설계돼 있어(DL-002) 폭발 반경은 통제됨 — 그래서 BLOCKED 사유는 아니다.
- **권고안**: PB-C1 질문과 같은 접점에서 1문항으로 확인: "파노값 = FFT 피크 기본 주파수(Hz) 수치가 맞습니까?" 확인되면 DL-002를 ASSUMPTION → 확정으로 승격.

### 나머지 미결 — Phase 2 중 결정 가능 (질문 불요)

| ID | 처리 | 근거 |
|---|---|---|
| D1 (가이드 최소 3건) | Phase 2 중 — 첫 사용자 검토 | `GUIDE_MIN_SATISFIED` 상수 1곳 교체 설계 완료 |
| D2 (직접 입력 허용) | Phase 2 중 — state-contract 스키마 확정 전 확인 권장 | baseline(nullable) + 교체 비용 1곳 문서화됨 |
| D3 (cascade vs 차단) | Phase 2 중 — 트랜잭션 계약 확정 전 확인 권장 | `deleteMotorCascade` 내부 정책만 교체, 호출부 불변 |
| D4 (주행 결과 enum) | Phase 3 전 — 실기기 세션에서 어휘 확인 | enum+라벨 맵 상수만 교체 |
| TS-D1 (호스팅 provider) | Phase 2 중 — 실기기 세션 전 | 로컬 개발·CI·E2E 무관 진행 가능 명시됨 |

PB-C1 질문 시 D2·D3을 같은 접점에 묶어 물으면 state-contract wave 전에 셋 다 정리된다(비용 거의 0) — 단, 둘은 baseline으로 진행해도 안전하다.

## Readiness Gate 항목별 확인

| Gate 항목 | 판정 | 비고 |
|---|---|---|
| 사용자·목표·pain·관찰 가능한 성공 조건 | 충족 | planning-context Product Frame 4항목, 전 문서 일관 승계. 성공 조건이 측정 가능(3s 확정, 반복 수렴, 영속, 근거 확인) |
| Must/Should/Won't + 범위 유입 방지 | 충족(예외 2건 하단) | Must 전건 Evidence Inventory로 사용자 원문 소급. Won't에 근거 부여(주행 중 측정, 시각화 등) |
| 자동 UX Check trigger | 충족 | 권한+실패 상태+신규 측정 UI trigger 적용, ux-brief §9에서 재수행 |
| 정상·empty·loading·error·destructive/permission | 충족 | Critical State Inventory → REQ-ST-001~007 전건 승격, ux-brief §6 matrix 전 셀 채움 |
| 주석 의도 정규화·상충 노출 | 충족 | greenfield 비적용 근거 명시, intake 4건 정규화, 충돌 4건(PB-C1~C4) 교차 검증으로 노출 — PB-C1만 미해소로 정직하게 남김 |
| 데이터 전략 + Mock→real | 충족 | `mock` 선택 조건 부합(API 없음·UX 상태 검토 목적). fixture 축 2개(합성 신호 8종+CRLB / IndexedDB seed) 구체적. 전환 조건·owner(사용자)·mock 재현 불가 항목(D-3/D-5/실측) 격리 명확 |
| S/M/L/XL·driver·split·최소 검토 단위 | 충족 | M/split, driver 열거, smallest visible review = 측정 화면 단독, mock vs production 노력 분리("검증 세션이지 코드 아님") |
| requirement → owner → evidence traceability | 충족(경미 공백 2건 하단) | feature-plan §7 + project-brief 표에서 Must 14건 전수 + Should + NFR 매핑 |
| ASSUMPTION 검증 방법·우선 3개·BLOCKER | 충족 | 전 ASSUMPTION에 검증 방법·시한. NEEDS_DECISION 3개 원칙 준수. BLOCKER 2건(B1 실기기, B2 경로 정책) 명시 |
| Phase 경계 (구현물 미생성) | 충족 | 산출물은 전부 계획 문서. feature-plan의 타입 스케치는 사양이지 소스 아님 |

Scenario contract 검증: 적용 카테고리(C/D/E/F/H+권한/destructive)와 배제 카테고리(A/B/G/I~M) 모두 근거 명시. 미결 시나리오는 ❓+결정 ID(H-3/C-3/E-2/E-5)로 계약 형식대로 표기됨.

## 발견 사항 (파일·섹션 단위)

### F-1. `resetAllData` — 숨겨진 destructive 경로에 confirm 계약 부재 (중요)

- 위치: `feature-plan.md` §4 Persistence 표("복구 UI 전용 destructive reset 경로"), F4/F9 완료 조건, `ux-brief.md` §6 "복구 UI(reset 경로)".
- 문제: REQ-ST-007은 기록 삭제·모터 cascade만 커버한다. `resetAllData`는 **전체 데이터 삭제**인데 confirm·영향 고지("모든 모터·기록이 삭제되며 되돌릴 수 없음") 계약이 어느 문서에도 없다. 이 앱은 export가 Won't이고 기록이 유일 자산(ux-brief §10 스스로 명시)이라, 손상 복구 UI에서 사용자가 무심코 reset하면 피해가 최대다. destructive 심화 검토에서 발견된 유일한 숨은 삭제 경로.
- 조치: Phase 2 입력에 지시 추가 — state-contract 위임 4(pre/postcondition)에서 `resetAllData`에 REQ-ST-007급 confirm 계약(명시 확인 + 삭제 범위 고지 + 초기 포커스 취소)을 확정하고, component-designer의 ConfirmDialog 계약에 포함할 것. 사용자 결정 불요 — Phase 2에서 처리 가능하므로 판정에는 비반영.

### F-2. 권한 일시/영구 거부의 "감지 방법" 미정의 (중요)

- 위치: `requirements.md` REQ-ST-001, `ux-brief.md` §5 no-permission 행.
- 문제: 두 상태를 **다른 문구·다른 버튼**으로 보여주는 계약은 명확하나, 일시/영구를 어떻게 구분 감지하는지가 없다. iOS Safari는 Permissions API 지원이 제한적이고 getUserMedia는 두 경우 모두 NotAllowedError를 던진다 — 계약이 그대로는 iOS에서 구현 불가능할 수 있다. device 세션 위임(D-3)은 "검증"의 격리이지 "감지 설계"의 답이 아니다.
- 조치: Phase 2 state-contract/component 입력에 감지 전략 결정 항목 추가 — Permissions API 가용 시 사용 + 미가용 브라우저 fallback(예: 재요청 실패 반복 시 영구 거부 안내로 승격) 정의, D-3 device 세션에서 iOS 실동작 검증. mock 불가 지점의 격리 자체(D-2 browser / D-3 device)는 명확하다.

### F-3. RunRecord immutable — 근거 없는 silent 범위 결정 (중간)

- 위치: `feature-plan.md` §0·§3("수정 요구 없음, UX-A3와 정합"), project-brief state-contract 입력.
- 문제: "기록 수정 불가(생성·삭제만)"는 사용자가 요구하지도 배제하지도 않은 제품 결정인데 ASSUMPTION ID 없이 확정 서술됐다. UX-A3는 측정값 필드 보호만 근거가 되고, 전압 오타 수정·만족 재평가(가이드 집계의 유일 원천) 불가는 별개의 실사용 마찰이다.
- 조치: FP-A 계열 ASSUMPTION으로 승격해 미결 대장·Phase 2 검토 목록에 등재. FP-A2와 동일하게 additive migration 확장 경로가 있어 baseline 진행은 안전 — 질문 3개 슬롯에는 미포함.

### F-4. 시나리오 표 매핑 공백 2건 (경미)

- `requirements.md` Scenario Review: **REQ-F-003의 실패 흐름**(이름 미입력 저장 거부)이 표에 행이 없다 — C-1은 정상만. REQ 본문·F5 완료 조건에는 존재하므로 표 매핑 누락이며, "성공 흐름만 있는 Must는 없다" 선언과 부분 불일치.
- **REQ-F-005의 읽기 실패**(빈 목록 위장 금지 + 재시도)도 시나리오 ID가 없다 — traceability 표들이 "+ 읽기 실패"로 암묵 표기. C-4(write)/C-5(unavailable)/C-6(rehydrate)와 구분되는 케이스다.
- 조치: Phase 2 QA/state-contract 단계에서 시나리오 ID 부여(예: C-7 모터 이름 검증, D-10 목록 읽기 실패). 계약 실질은 이미 문서화돼 있어 판정 비영향.

### F-5. 기록 차원 관찰 (조치 선택)

- **PWA manifest(TS-A2)**: 요구사항 ID 근거 없는 유입이나 ASSUMPTION으로 격리·SW 배제·롤백 1곳 — 수용 가능한 수준.
- **effort M의 시점**: planning-context의 M 추정은 v1 알고리즘 시점이고 v2가 엔진을 "프로젝트 최대 작업 항목(v1 대비 상승)"으로 상향, feature-plan은 F1을 단독 L로 표기. split(엔진 최우선) 권고가 이 위험을 이미 흡수하므로 M 유지는 방어 가능 — 기록 일관성 관찰에 그침.

## 심화 검토 결과 (지시 3건)

1. **destructive (모터 cascade·기록 삭제)**: confirm → `countRecordsByMotor` 실측 건수 고지 → `deleteMotorCascade` 단일 트랜잭션 → dangling 0건 불변식 → state-contract 위임 1(원자성·롤백)로 체인이 끊김 없이 이어진다. 취소 시 무변경, 초기 포커스 취소, 가이드 집계 즉시 반영까지 계약화됨. 숨은 삭제 경로는 `resetAllData` 1건 발견 (F-1).
2. **권한**: mock 가능(D-1/D-2/D-4 — Playwright fake media stream + grantPermissions)과 불가(D-3 영구 거부, D-5 suspended — device 세션) 경계가 requirements Evidence 열·tech-stack 테스트 전략·project-brief에서 3중 일치로 격리됨. 남은 공백은 감지 메커니즘(F-2)뿐.
3. **LOCAL_DOMAIN_STATE_MODE 위임 4건**: ① 트랜잭션 원자성 — command 시그니처·`withTransaction`·단일 트랜잭션 요구·불변식이 입력으로 충분. ② schema v1·migration — 필드 주석 달린 타입, store/index 배치, zod rehydrate, `initPersistence` 3-상태, C-6 fixture까지 충분. ③ 동시 탭 — "마지막 쓰기 정책 명문화"로 범위 축소돼 충분. ④ pre/postcondition 전수 — command 14+query 6 인벤토리와 seed 목록이 갖춰져 충분. **4건 모두 Phase 2 입력으로 구체적** — 단 ④에 F-1(resetAllData confirm)과 F-2(권한 감지) 반영 지시를 추가할 것.

## 오케스트레이터 액션 (사용자 질문 아님)

1. **B2 harness 산출물 경로 정책** — 지시 경로(`workspace/minicar-motor-lab/_workspace/01_plan/`) vs agent-registry 허용 경로(harness root `_workspace/01_plan/`, 전 산출물 실제 위치) 불일치. 미결 대장 시한이 "**Phase 2 전**, owner: 오케스트레이터·사용자"다. Phase 2 wave들이 산출물을 쓰기 전에 이관 vs registry 조정을 결정할 것 — 제품 blocker가 아니므로 판정에는 비반영.
2. Phase 2 착수 시 각 디자이너 입력에 본 리뷰의 F-1(resetAllData confirm 계약), F-2(권한 감지 전략), F-3(RunRecord immutable ASSUMPTION 승격), F-4(시나리오 ID 2건 보강)를 전달할 것.
3. PB-C1·A1(+선택적으로 D2·D3)을 한 번의 사용자 접점으로 묶어 확인하면 state-contract wave 전에 스키마 관련 미결이 모두 정리된다.
