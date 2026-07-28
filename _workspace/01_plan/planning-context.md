# Planning Context — minicar-motor-lab

> Phase 1 Wave 0 산출물. REQUEST_TYPE: greenfield-service / WEB_PROFILE: react-vite-spa / LOCAL_DOMAIN_STATE_MODE: true (그 외 모드·companion flag 전부 false).
> 서버 없음. IndexedDB가 authoritative store. 정적 호스팅 대상 모바일 웹.
> 구현 project root: `workspace/minicar-motor-lab` (harness 규칙: 새 앱은 workspace/<이름>).
> NOTE: 본 파일은 ownership hook이 허용하는 harness root `_workspace/01_plan/`에 작성됨. 오케스트레이터가 지시한 `workspace/minicar-motor-lab/_workspace/01_plan/` 경로는 agent-registry 소유권과 불일치 — 이관 또는 registry 조정은 오케스트레이터/사용자 결정 사항.

## Product Frame

- **대상 화면/기능**: 미니카(130 브러시드 3극 모터) 모터 RPM 측정 모바일 웹 페이지. 4개 surface —
  1. **측정 화면**: 마이크 권한 활성화(버튼 탭) → 녹음 → FFT 분석 → RPM·파노값(피크 주파수 Hz)을 수치로만 표시
  2. **기록 입력 화면**: 모터 식별 + 모터 상태 + 세팅 전압 + 주행 결과 + 만족 체크를 심플한 선택형/숫자 입력으로 저장
  3. **모터/기록 이력 화면**: 모터별 측정·주행 기록 목록 (상대 비교의 근거)
  4. **전압 가이드 화면**: 모터별 '만족' 기록의 전압 분포 기반 추천 전압 범위 표시
- **주 사용자**: 미니카 취미 유저 본인. 단일 사용자 개인 도구 — 계정·공유·멀티 디바이스 동기화 없음.
- **끝내려는 업무**: 모터 컨디션을 측정·기록하고, 축적된 만족 기록을 근거로 다음 주행의 배터리 전압 세팅을 판단한다.
- **현재 pain**:
  - 전압 세팅을 감으로 한다 — 어떤 모터 상태에서 어떤 전압이 좋았는지 근거가 없다.
  - 모터 상태(길들이기 진행, 마모)를 추적할 수단이 없다 — 광학 타코미터 없이 회전수 변화를 알 수 없다.
- **관찰 가능한 성공 조건**:
  1. 공회전 중인 모터에 폰을 가까이 대고 측정을 시작하면 수 초 내 RPM과 파노값(Hz)이 수치로 표시된다.
  2. 같은 모터·같은 전압으로 반복 측정 시 RPM이 일관된 대역에 수렴한다 (절대 정확도가 아닌 상대 비교 신뢰성).
  3. 측정→기록 입력이 한 흐름으로 끝나고, 브라우저를 닫았다 열어도 기록이 남는다 (IndexedDB 영속).
  4. '만족' 기록이 쌓인 모터를 선택하면 추천 전압 범위와 그 근거 기록을 확인할 수 있다.

## Evidence Inventory

| Source/annotation | 확인한 사실 | 신뢰 범위 | 후속 검증 |
|---|---|---|---|
| 사용자 원문 요청 | 녹음→분석→RPM·파노값 수치 표시 / 모터 상태·전압·주행 결과·만족 체크 기록 / 상태별 전압 세팅 가이드 / 심플 디자인·심플 입력 / IndexedDB / 녹음 활성화 기능 | 요구사항 원천 (확정) | — |
| Intake 답변 1 (사용자 직접 설명) | 마이크로 회전 소음(정류자·브러시 마찰, 회전축 진동) 수집 → FFT 스펙트럼 분해 → 회전 연동 피크 주파수 추출 → ×60 또는 극수식으로 RPM 환산 | 측정 방식 확정 | 합성 신호 fixture로 파이프라인 검증 후 실기기 실측 확인 |
| Intake 답변 2 (오케스트레이터 해석, 사용자 고지) | 파노값 = FFT 피크 주파수(Hz) 수치, RPM과 같은 파이프라인 산출물 | ASSUMPTION | 첫 검토 시 사용자 명시 확인 (A1) |
| Intake 답변 3 | 공회전 근접 측정만 범위. 주행 중 측정 범위 외 | 측정 상황 확정 | — |
| Intake 답변 4 | 만족 기록 기반 고정 규칙 추천 (전압 분포 → 추천 범위). AI 불필요 | 가이드 방식 확정 | 최소 기록 수·미달 시 동작은 D1 |
| 오케스트레이터 기술 고지 | getUserMedia + Web Audio API / HTTPS 필수 / iOS Safari는 사용자 제스처 후 AudioContext 시작 / 130 모터 약 12,000~30,000 RPM (기본 주파수 200~500Hz + 정류자 배음) / 전압은 웹 측정 불가 — 수동 입력 / 절대 정확도 < 광학 타코미터, 상대 비교 목적 | 기술 제약 확정 | Phase 2 prototype 실기기(iOS Safari 우선) 확인 |

## Scope — Must / Should / Won't

**Must**
- 마이크 권한 요청·활성화 흐름 (버튼 탭 제스처 기반, iOS AudioContext resume 포함)
- 녹음 → FFT → 피크 주파수(파노값 Hz) → RPM 환산 → 수치 표시
- 모터 엔티티 CRUD (식별용 최소 이름/라벨)
- 측정·주행 기록 저장: 모터, 모터 상태, 전압, 주행 결과, 만족 체크 (IndexedDB)
- 모터별 만족 기록 기반 추천 전압 범위 표시
- 측정 실패 상태 피드백 (권한 거부 / 신호 약함 / 피크 미검출)

**Should**
- 측정값을 기록 입력에 자동 채움 (측정→기록 한 흐름)
- 추천 근거 노출 (근거가 된 만족 기록 목록)
- 모터별 기록 이력 목록

**Won't (이번 범위 제외)**
- 주행 중 측정 / 서버·계정·동기화 / 데이터 export·import / 스펙트럼 차트·파형 시각화(수치만 표시 요구) / AI 추천 / 광학 타코미터 수준 절대 정확도 보장

## UX Check

trigger: 권한(마이크) 흐름 + 측정 실패/부분 실패 상태 + 목표 상태가 불명확한 신규 측정 UI → 적용.

- **첫눈에 알 수 있어야 하는 것**: 지금 측정 가능한 상태인가(권한 OK·녹음 대기 / 측정 중 / 실패), 그리고 표시된 RPM·Hz가 유효한 신호에서 나온 값인가.
- **다음 행동이 보이는가**: 권한 미허용 → "녹음 활성화" 단일 버튼. 측정 완료 → "기록으로 저장"이 바로 이어짐. 저장 후 → 가이드 확인 경로.
- **실수하거나 오해할 지점**:
  - 신호 미검출·소음 환경에서 이전 측정값이나 쓰레기 피크가 그대로 표시되면 잘못된 RPM을 믿게 된다 — "측정 실패"와 "측정값"의 시각 구분 필수.
  - iOS AudioContext suspended를 사용자는 알 수 없다 — 무음 입력이 "0 RPM" 또는 임의 수치로 표시되면 안 된다.
  - 권한 거부(영구 거부 포함)와 일시 오류를 같은 메시지로 뭉치면 복구 방법을 못 찾는다.
  - 정류자 배음이 기본 주파수보다 강하면 RPM이 정수배로 튈 수 있다 — 기대 대역(12,000~30,000 RPM) 밖 값 경고 같은 최소 인지 장치 필요.
- **먼저 정할 방향**: 측정은 대형 수치 중심 1-action 화면 (심플 요구). 입력은 자유 텍스트 최소화 — 전압은 숫자, 상태·결과·만족은 선택형.
- **prototype/Phase 2에서 확인할 것**:
  - 실기기에서 130 모터 공회전 피크가 200~500Hz 대역에서 안정적으로 잡히는지, 배음 오검출 빈도.
  - 측정 지속 시간(순간 스냅샷 vs 수 초 평균)에 따른 수치 안정성과 체감.
  - 권한 거부·suspended·신호 약함 3개 실패 상태의 안내 문구와 복구 흐름.

## Annotation Review

비적용 — greenfield 요청으로 스크린샷·화면 주석 입력이 없다. Intake 답변 4건은 Evidence Inventory와 decision-log에 의도로 정규화하여 기록했다.

## Critical State Inventory

| Surface | normal | empty | loading | error/partial | permission/destructive |
|---|---|---|---|---|---|
| 측정 화면 | RPM·파노값(Hz) 대형 수치 | 첫 진입, 측정 전 — "녹음 활성화" 안내 | 측정 중 (녹음·분석 진행 표시) | 신호 약함 / 피크 미검출 / 기대 대역 밖 값 경고 / iOS AudioContext suspended(무음 입력) / 소음 환경 오검출 | 마이크 권한 요청·거부·영구 거부(브라우저 설정 안내) / 비보안 컨텍스트(HTTP) 측정 불가 안내 |
| 기록 입력 | 측정값 자동 채움 + 상태·전압·결과·만족 입력 | 측정 없이 직접 입력 진입 (허용 여부 D2) | 저장 중 (IndexedDB write) | IndexedDB 쓰기 실패 / quota 초과 / private 모드 제약 | 기록 삭제 확인 (destructive) |
| 모터 목록/이력 | 모터별 기록 목록 | 모터 0개 — 첫 모터 등록 유도 | IndexedDB 읽기 중 | 읽기 실패 | 모터 삭제 시 소속 기록 처리 (destructive, D3) |
| 전압 가이드 | 추천 전압 범위 + 근거 기록 | 만족 기록 부족 — 안내 (최소 건수 D1) | 로컬 계산 (순간) | 만족 기록 전압 분산이 클 때 표현 | — |

## Data Review Strategy

- **strategy**: `mock`
- **fixtures/source and safety**:
  - 실측 오디오는 브라우저+실기기에서만 검증 가능하므로, 분석 로직(FFT→피크 추출→RPM 환산)은 **합성 신호 fixture**로 검증한다: 알려진 주파수의 순수 사인파 / 기본파+배음 합성(정류자 노이즈 모사) / 백색소음 혼합(SNR 단계별) / 무음·저신호. 기대 출력(피크 Hz, RPM)이 결정적이라 unit 수준 검증 가능.
  - IndexedDB CRUD·가이드 계산은 모터/기록 seed fixture로 검증: normal(만족 기록 3+건) / empty(모터 0개) / 만족 기록 부족(0~1건) / 전압 분산 큰 케이스.
  - 권한·suspended 상태는 mock으로 재현 불가 → Phase 2 실기기 확인 항목으로 분리.
  - 서버·외부 API·production 데이터 없음 → mutation 위험 없음.
- **Mock→real transition**: 합성 신호로 파이프라인 통과 후, Phase 2 prototype을 HTTPS 환경에서 실기기(iOS Safari 우선)로 열어 실제 모터 공회전 소음의 피크 검출률·수치 안정성을 확인한다. 전환 조건은 "실기기+실모터 접근 가능", owner는 사용자 본인.

## Effort Trade-off

- **rough size**: `M`
- **drivers**:
  - surface 4개 + 측정 화면의 실패 상태 5종 등 상태 수가 많음
  - 새 계약: 오디오 분석 파이프라인 (getUserMedia→AudioContext→FFT→피크→RPM) — 핵심 위험이자 최대 driver
  - IndexedDB 스키마(모터·기록) + 로컬 집계 가이드 — 단순한 편
  - iOS Safari 제스처/suspended 등 플랫폼 편차 검증
  - migration·권한 도메인·외부 연동 없음 → L로 가지 않는 근거
- **recommendation**: `split` — (1) 측정 파이프라인 + 측정 화면 상태를 먼저 검증, (2) 기록 CRUD + 가이드를 뒤에. 측정 신뢰성이 무너지면 기록·가이드의 가치가 없으므로 위험 큰 쪽을 앞에 둔다.
- **smallest visible review**: 측정 화면 단독 — 버튼 탭 녹음 활성화 → 합성/실제 신호에서 RPM·Hz 수치 표시 + 실패 상태 3종(권한 거부/신호 약함/피크 미검출) 전환.
- **production integration delta**: 서버 통합 없음. mock 검토와 real의 차이는 "합성 신호 vs 실기기 마이크 실측"뿐이며, 후자는 코드 변경이 아닌 실기기 검증 세션이다.

## Open Decisions

- **ASSUMPTION**:
  - A1. 파노값 = FFT 피크 주파수(Hz). 오케스트레이터 해석, 사용자 고지됨(명시 확정 아님). → 검증: 첫 검토에서 사용자 확인. 다른 의미면 환산식만 교체 가능하도록 표시 계층 분리.
  - A2. RPM 환산은 3극 브러시드 특성 반영 — 기본 회전 주파수 ×60 기준, 정류자 배음(회전당 3~6 이벤트)과 구분 필요. → 검증: 합성 fixture + 실측에서 기지 전압 대비 12,000~30,000 RPM 대역인지 확인.
  - A3. 단일 사용자·단일 기기 — 브라우저 데이터 삭제 시 기록 소실 허용, export는 Won't. → 검증: 소실 위험 고지 후 사용자 이의 없으면 유지.
  - A4. "모터 상태"·"주행 결과"는 선택형 입력으로 심플화. 구체 선택지 값은 Phase 2 ux-brief에서 확정. → 검증: prototype 검토 시 사용자 피드백.
- **NEEDS_DECISION** (우선 3개):
  - D1. 가이드 추천에 필요한 최소 '만족' 기록 건수와 미달 시 표시 (숨김 vs "n건 더 필요" 안내). 제안: 2건 미만이면 안내만.
  - D2. 측정 없이 기록만 직접 입력 허용 여부 (측정 실패여도 주행 기록은 남기고 싶을 수 있음). 제안: 허용, RPM 필드 비움.
  - D3. 모터 삭제 시 소속 기록 처리 — 함께 삭제 vs 삭제 차단. 제안: 확인 후 함께 삭제.
- **BLOCKER**: 제품 blocker 없음. 단, (1) Mock→real 실기기 검증은 Phase 2에서 사용자 참여 필요, (2) harness 운영 이슈 — 산출물 경로 소유권 불일치 (오케스트레이터 지시 경로 `workspace/minicar-motor-lab/_workspace/01_plan/` vs agent-registry 허용 경로 harness root `_workspace/01_plan/`). 후속 wave 진행 전 오케스트레이터가 경로 정책을 정리해야 한다.

## Current Planning Memo

- **확인된 요구**: 공회전 근접 측정으로 FFT 기반 RPM·파노값(Hz) 수치 표시 / 심플 UI(수치만·선택형 입력) / 모터별 상태·전압·주행결과·만족 기록(IndexedDB 영속) / 만족 기록 기반 추천 전압 범위 / 마이크 녹음 활성화 흐름. 감지 모드·기술 제약 확정 (react-vite-spa, 서버 없음, HTTPS, iOS 제스처 제약).
- **빠진 시나리오**: 마이크 권한 거부·영구 거부 / iOS AudioContext suspended(무음 측정) / 소음 환경 오검출 / 신호 미검출(피크 없음) / 배음 오검출로 RPM 정수배 튐 / IndexedDB 쓰기 실패·quota·private 모드 / 만족 기록 부족 시 가이드 / 모터 삭제 시 기록 처리 — Critical State Inventory와 Open Decisions에 반영됨.
- **가정과 검증 방법**: A1~A4 (Open Decisions 참조).
- **상대 노력도**: M / split 권고.
- **다음 질문/행동**: (1) D1~D3 사용자 확인 (최대 3개), (2) A1 파노값 정의 확정, (3) Wave 1 requirements-analyst로 진행 — 측정 파이프라인+측정 화면을 최소 검토 단위로, 합성 신호 fixture 세트 정의를 ux-brief/tech 산출물에 전달.
