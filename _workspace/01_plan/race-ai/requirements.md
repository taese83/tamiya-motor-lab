# Requirements — 레이스 AI 활용 Phase 1 (minicar-motor-lab)

> 2026-07-31. 근거: `race-ai/planning-context.md`, DL-021~025. AI 전용 요구(REQ-AI-001~005·예산 §6·AC-1~7)는 `_workspace/01_plan/ai-requirements.md`가 canonical — 본 문서는 **참조만** 하고 제품·화면·데이터·상태 요구를 다룬다. 자율성·리스크는 `autonomy-risk-matrix.md`(L1 확정) 참조.
> (기록 주체: 오케스트레이터 대필 — ownership hook.)

## Modes
- AI_MODE: true (SUBMODES: ANALYTICS_AGENT_MODE, AUTONOMY_LEVEL: L1 — ai-requirements.md 참조)
- LOCAL_DOMAIN_STATE_MODE: false — 신규 로컬 도메인 상태 없음. 기존 IndexedDB RaceRecord+R22 파생의 **읽기 전용 소비**만(DL-024)
- TIMESERIES_MODE: false / ANALYTICS_BUILDER_MODE: false / EXTERNAL_DATA_INGESTION_MODE: false

## 서비스 개요
- 핵심 가치: R22 결정론 카드가 보여주는 숫자(완주 전압대·스트릭·추세) 너머의 **인과 질문**에 on-demand AI가 답한다. 결정론 카드의 보완이지 대체가 아니다(무료·즉시·오프라인 성질 불변).
- 주 사용자: 사용자 본인 1명(DL-021④), 트랙사이드 모바일 한 손 맥락.
- 핵심 시나리오: ① 이탈 직후 "왜 이탈했나 — 전압인가 세팅인가" ② 다음 판 전 "전압 외에 뭘 바꿀까" ③ 상세 열람 중 "이 모터 스토리 요약 / 평소와 다른 점".
- 성공 조건(관찰 가능): 버튼 1탭 → 수 초 내 R22 수치와 **모순 없는** 근거 인용 응답 → 전압 외 액션(댐퍼·밸런스·점검) 결정 가능. AI 실패·오프라인이어도 R22 카드는 항상 그대로.

## 목표 / 비목표
- 목표: `/race/:motorId` 상세에 단일 "AI 분석" 버튼 + 섹션형 통합 응답(4역할). 결정론/AI 역할 분담(DL-022) 준수.
- **Won't (Phase 1 범위 밖 — 명시 금지 항목)**:
  - W1 자동 호출·자동 알림·백그라운드 감시(이상 감지도 on-demand 질의형만, DL-021②)
  - W2 L1 초과 — AI에 의한 저장·수정·적용(제안 전압 원클릭 저장 등은 L2 승격 조건 충족 전 금지, risk-matrix §3)
  - W3 모터 간 비교 분석
  - W4 측정(MeasureRecord) 도메인 AI
  - W5 자유 텍스트 입력(인젝션 표면 — ai-requirements §8 NON-GOAL)
  - W6 역할별 4버튼·4엔드포인트 분리(비용 4배·UI 밀도 초과 — A1/D1)
  - W7 AI 응답 영속 저장(비저장 원칙, 세션 내 캐시만 D3)

## 기능 요구사항 — Must (MVP)

- [ ] **REQ-RAI-001 단일 AI 분석 진입점** — 상세 화면에 "AI 분석" 버튼 1개. 호출은 이 버튼 탭에서만 발생한다(자동 트리거 표면 없음).
  - Given `/race/:motorId` 상세(근거 충족 상태), When 사용자가 버튼을 1탭, Then AI 요청이 정확히 1회 발생하고 화면 진입·기록 저장·스크롤 등 어떤 다른 이벤트로도 요청이 발생하지 않는다. `LOCAL_VERIFIABLE` (mock)
- [ ] **REQ-RAI-002 섹션형 구조화 응답(4역할)** — 응답은 자유 산문이 아닌 구조화 섹션: 이탈 원인 진단 / 다음 세팅 코칭(비전압 처방, 전압 숫자는 기존 advisor 값 인용) / 기록 브리핑 / 이상 신호. 역할별 "답하는 질문 ↔ 결정론 경계"는 planning-context 표를 따른다(재계산·재진술만인 섹션 금지).
  - Given 정상 mock 응답 fixture, When 응답 렌더, Then 4개 섹션이 구분 표시되고 스키마(zod) 위반 fixture는 실패 상태로 처리된다. `LOCAL_VERIFIABLE`
- [ ] **REQ-RAI-003 R22 파생값 주입·인용 표기** — AI 입력은 해당 모터의 RaceRecord(≤20건)+retireReason+R22 파생값의 읽기 전용 직렬화. 응답 카드에 근거 데이터 범위(회차 n건·기간)를 표기하고, 사유 없는 이탈 혼재 시 "사유 미입력 n건 제외"를 표기한다. 수치 정합 규칙 자체는 REQ-AI-001/002 참조.
  - Given 사유 미입력 이탈이 섞인 fixture, When 응답 표시, Then 근거 회차 수와 제외 n건 문구가 카드에 보인다. `LOCAL_VERIFIABLE`
- [ ] **REQ-RAI-004 근거 부족 게이트(호출 차단)** — RaceInsight.kind가 empty/insufficient(3건 미만)이거나 이탈 전부 사유 없음이면 **클라이언트 결정론 게이트가 호출 자체를 차단**한다: 버튼 비활성 + 사유 문구. (비용·환각 동시 방어. 서버 측 "판단 불가"는 REQ-AI-003 참조.)
  - Given 기록 2건 fixture, When 상세 진입, Then 버튼 비활성·사유 문구 표시·네트워크 요청 0회. `LOCAL_VERIFIABLE`
- [ ] **REQ-RAI-005 실패·오프라인 표면화(성공 위장 금지)** — 업스트림 실패·오프라인·타임아웃·파싱 실패 시 "분석 불가 — 결정론 요약은 위 카드" 명시 표시. AI 분석에는 휴리스틱 폴백을 생성하지 않는다(성공 위장 금지). R22 카드는 어떤 실패에서도 영향 없음.
  - Given mock 5xx/오프라인, When 버튼 탭, Then 실패 카드 표시 + R22 카드 내용·표시 불변. `LOCAL_VERIFIABLE`
- [ ] **REQ-RAI-006 응답 비저장** — AI 응답은 IndexedDB·서버 어디에도 저장하지 않는다(새로고침 시 소멸). 세션 내 메모리 유지 여부는 D3 미결정 — 결정 전 기본값은 유지 없음.
  - Given 성공 응답 표시 후, When 새로고침, Then 응답 미표시·저장소에 응답 데이터 부재. `LOCAL_VERIFIABLE`
- [ ] **REQ-RAI-007 인증 필수** — 신규 AI 분석 엔드포인트는 `requireSession` 필수(DL-023). 상세 기준·소급(D2)은 REQ-AI-004 참조.
  - Given 비인증 POST, When 호출, Then 401. `LOCAL_VERIFIABLE` (= AC-1)

### Should Have
- [ ] REQ-RAI-008 재호출 시 변동 고지 — temp 0이어도 재호출 결과가 달라질 수 있음을 UI가 고지(UX Check ③).

### Could Have (2차 확장 — split 권고안)
- [ ] 이탈 행 focus 진단(동일 엔드포인트 focus 파라미터) / 응답 세션 캐시(D3 결정 후).

## 상태 요구 (Critical State Inventory → 요구사항)

- [ ] **REQ-RAI-ST-001 5상태 완비** — AI 응답 표면은 다음 5상태를 모두 구현·구분 표시한다. 전 상태에서 R22 카드는 불변. `LOCAL_VERIFIABLE` (mock fixture로 5상태 전환)

  | 상태 | 요구 |
  |---|---|
  | 대기 | 버튼만 표시(응답 카드 없음) |
  | 요청 중 | 스피너 + **취소 가능** + 타임아웃(REQ-AI §6: 클라 10s) |
  | 성공 | 섹션형 응답 + 근거 범위 표기(REQ-RAI-003) |
  | 실패 | 명시적 실패 안내, 성공 위장·휴리스틱 대체 금지(REQ-RAI-005) |
  | 근거 부족 | 버튼 비활성 + 사유(REQ-RAI-004) — 서버 "판단 불가"(2xx)도 그대로 표시 |

- [ ] REQ-RAI-ST-002 기존 recommend-voltage 영향 — D2로 소급 적용 시 비로그인 401 → 휴리스틱 폴백 자연 수렴을 확인한다(요구는 조건부, D2 결정 대기). `LOCAL_VERIFIABLE`

## 비기능 요구사항

- **REQ-RAI-NFR-001 수직 예산** — 모바일 한 손 기준, R22 카드+AI 응답 카드가 레이스 목록 **첫 행을 밀어내지 않는다**(접이식/시트 등 — 구체 레이아웃은 layout 담당). Given 작은 뷰포트(375×667) 성공 응답, Then 목록 첫 행이 초기 뷰포트 내 유지. `LOCAL_VERIFIABLE`
- **REQ-RAI-NFR-002 지연** — 요청 중 상태는 수 초 내 해소 목표(p95 6s, 클라 타임아웃 10s — 수치는 REQ-AI §6 ASSUMPTION). 타임아웃·취소 동작은 `LOCAL_VERIFIABLE`, 실측 p95는 `DEPLOY_ONLY` (= AC-6).
- **REQ-RAI-NFR-003 비용 상한** — rate limit·월 상한·초과 시 안내는 REQ-AI-004·§6 참조. 초과 시 UI는 실패 상태(안내 문구)로 표면화. `LOCAL_VERIFIABLE` (mock 429)
- **REQ-RAI-NFR-004 오프라인 무영향** — 오프라인에서 R22 카드·기록 목록·[+ 기록]은 전부 정상, AI 버튼만 실패/불가 표면. `LOCAL_VERIFIABLE`
- **REQ-RAI-NFR-005 접근성** — ① 응답 카드가 스크린리더 도달 가능(성공 시 응답 도착 고지) ② 요청 중 상태 변화 고지(aria-live 등가) ③ 근거 부족 시 비활성 사유가 보조기기로 전달 ④ 버튼 터치 타깃 44px 이상(한 손 맥락). `LOCAL_VERIFIABLE`
- **REQ-RAI-NFR-006 L1 오해 방지** — "다음 판 제안"을 앱이 대신 저장·적용하지 않음이 UI에서 오해 없이 전달([+ 기록]은 사용자 몫). `LOCAL_VERIFIABLE`
- 실 LLM 응답 품질(grounding·한국어·speedRelated=false 전압 조언 부재)은 `DEPLOY_ONLY` — AC-5·AC-6(ai-requirements) 참조. 계약·게이트·상태·폴백은 전부 `LOCAL_VERIFIABLE`(mock).

## 화면 목록
1. `/race/:motorId` 레이스 상세(기존) — AI 분석 버튼 + 응답 카드 추가. **신규 화면 없음.**

## API 필요 목록 (기능 기준 — 구현·명명은 tech-note 담당)
- POST AI 분석 엔드포인트 **1개** (단일, 4역할 통합 응답, requireSession) — focus 파라미터는 2차 확장 여지만 남김. 역할별 4엔드포인트 금지(W6).

## Open Decisions (planning-context 승계 — 본 문서에서 신규 결정 없음)
- ASSUMPTION A1: 단일 엔드포인트·섹션형 단일 응답 통합 → REQ-RAI-001/002의 전제. 검증: plan review 사용자 확인.
- **A2 확정(DL-028)**: 코칭 전압은 **분석 시 전압 추천을 연쇄 호출한 최신 AI 값**을 인용. ⚠️ LLM 2회 → 비용·지연 2배 수용. 서버 내부 연쇄·추천 실패 시 advisorVoltage null 강등(분석은 계속)·타임아웃 재산정은 Phase 2 설계 지시.
- ASSUMPTION A3: 모델·키 패턴 기존 재사용(Haiku 4.5·서버 전용 env·temp 0). 검증: tech-note.
- ~~NEEDS_DECISION~~ **D1 확정(DL-026)**: 통합 1버튼 — REQ-RAI-001/002 확정, W6 최종 유지.
- ~~NEEDS_DECISION~~ **D2 확정(DL-027)**: requireSession **소급 적용** → REQ-RAI-ST-002 활성(기존 recommend-voltage 수정 + 401→휴리스틱 폴백 fixture 확인).
- NEEDS_DECISION D3: 응답 세션 내 메모리 캐시 허용 여부 → REQ-RAI-006 기본값(유지 없음) 변경 여부.
- BLOCKER: 없음.
