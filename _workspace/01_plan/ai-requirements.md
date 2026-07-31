# 레이스 AI Phase 1 — AI 요구사항 (2026-07-31, 구현 금지·요구사항만)

    AI_MODE: true
    SUBMODES: [ANALYTICS_AGENT_MODE]
    AUTONOMY_LEVEL: L1
    HIGH_IMPACT_ACTIONS: []
    BLOCKERS: []

- SUBMODES 근거: 지표 해석·브리핑·이상 신호 감지(detection-contract §ANALYTICS_AGENT_MODE). RAG(문서 검색 없음)·TOOL_AGENT(상태 변경 없음) 미해당.
- 사용자=본인 1명, tenant 분리 불필요, PII 실질 없음(수치+enum). intake 확정 사실 — 재질문 없음.
- 개입은 **버튼(on-demand)만**, AI는 **읽기 전용 제안(L1)** — AI가 데이터를 저장·수정하지 않는다.

## 1. 역할별 task 경계·성공 기준·실패 비용

| # | 역할 | task 경계(입력→출력) | 성공 기준 | 실패 비용 |
|---|---|---|---|---|
| ① | 이탈 원인 진단 | retired 기록(retireReason·speedRelated·voltage·panoHz) → 원인 후보 해석 1~2문장 | 기록된 사유·수치만 근거로 설명, 트리 causal 힌트와 모순 없음 | 틀린 진단 → 잘못된 세팅 → 다음 주행 이탈·모터 부담 |
| ② | 다음 세팅 코칭 | RaceInsight(주입)+goal → 다음 주행 방향 제안(전압대 언급은 R22 값 범위 내) | 완주대 이탈 회피, speedRelated=false 사유에는 전압 조언 자제 | 과전압 제안 → 이탈·배터리/모터 부담 (실제 물리 손해) |
| ③ | 기록 브리핑·요약 | RaceInsight+최근 기록 요약 → 한국어 브리핑 | 주입값과 수치 일치(재계산·창작 금지) | 오요약 → 상태 오판 → 잘못된 세팅 결정 |
| ④ | 이상 신호 감지 | RaceInsight.trend·streak(주입) → 이상 후보 지목+근거 | 결정론 trend와 모순 없는 지목, 근거 없으면 침묵 | 허위 경보(불필요 세팅 변경) / 미탐(모터 열화 방치) |

## 2. 결정론 vs AI 경계 (REQ-AI-001, MUST)

- **R22 `computeRaceInsight` 산출값(완주 전압대·streak·trend·excluded)·`resolveSpeedRelated`는 AI가 재계산하지 않는다.** 클라이언트가 계산해 프롬프트 입력으로 **주입**한다(환각·화면 카드와의 수치 불일치 방지).
- AI 허용 범위: 주입값의 **해석·설명·우선순위 제안**만. 수치 파생·전압 클램프·표본 판정은 결정론 코드 소유.
- 전압 수치를 출력하는 경우 서버가 2.6~3.2V·0.02 단위 클램프(기존 recommend-voltage.js 패턴 재사용).

## 3. 근거 강제 (REQ-AI-002, MUST)

- 출력의 모든 주장·수치는 제공된 기록·주입 인사이트에서만 인용. 외부 지식으로 수치 창작 금지.
- 이 앱이 측정하지 않는 물리 세팅(롤러·댐퍼·기어비·타이어 등)은 **단정 금지** — "가능성" 언급까지만(system 프롬프트 제약).
- `speedRelated=false`(parts·stall·other) 사유의 이탈에는 전압 조언 금지 — 트리 causal '전압 무관' 준수.

## 4. 표본 부족·판단 불가 (REQ-AI-003, MUST — 침묵 원칙)

- RaceInsight.kind가 empty/insufficient이거나 사유·결과 미기록으로 근거가 없으면 AI는 지어내지 않고 구조화된 "판단 불가"(사유 포함)를 반환한다. R22 trend=null 침묵 원칙과 동일 철학.
- "판단 불가"는 정상 응답(2xx)이며 UI가 그대로 표시 — 성공 위장·창작 모두 금지.

## 5. 인증·비용 방어 (REQ-AI-004, MUST)

- **확인 결과: `api/recommend-voltage.js`는 `requireSession`(api/_lib/authGuard.js) 미적용** — import 없음, 적용처는 `api/data.js`뿐. 즉 현재 인증 없이 공개 POST 가능 → **denial-of-wallet(키 비용 남용) 리스크**.
- 요구: 신규 AI endpoint 전부 `requireSession` 필수 + 기존 recommend-voltage.js에도 소급 적용. 키는 서버 전용 env 유지(번들 미포함).

## 6. 품질·지연·비용 예산 (ASSUMPTION — 개인 도구 baseline)

- 모델: `claude-haiku-4-5-20251001`, temperature 0. max_tokens: 역할②는 300 유지, ①③④는 500 이하.
- history 컷 20건 유지(기존 계약). p95 latency 6s, 클라이언트 timeout 10s.
- rate limit: 세션당 분당 5회 / 월 호출 상한 ~300회(초과 시 결정론 폴백 안내). 월 비용 상한 감각 <$1 (Haiku·짧은 컨텍스트).
- 가용성: best-effort — AI 불가 시에도 결정론 카드(R22)로 앱 핵심 가치는 유지.

## 7. 오프라인·실패 정책 (REQ-AI-005, MUST)

- 네트워크 없음·키 없음·업스트림 오류·파싱 실패·클램프 실패 → **성공 위장 금지**: 5xx typed error, 클라이언트는 결정론 경로(R22 카드, voltage-advisor 휴리스틱)로 폴백 또는 명시적 실패 표시. 기존 recommend-voltage 계약과 동일.

## 8. 프롬프트 인젝션 표면 판정

- 현재 입력은 숫자+enum(goal·result·retireReason leaf key)뿐 — 표면 작음. **판정: Phase 1에 자유 텍스트 입력 불필요·도입 금지.** 메모 등 자유 텍스트를 추가하는 순간 인젝션 표면이 커지므로 별도 요구사항 라운드로 분리(NON-GOAL).

## 9. Acceptance Criteria

| ID | 기준 | 라벨 |
|---|---|---|
| AC-1 | 신규 AI endpoint에 requireSession — 비인증 POST는 401 | LOCAL_VERIFIABLE |
| AC-2 | 입력 스키마 위반 400, 업스트림 오류·파싱 실패 5xx(성공 위장 없음) | LOCAL_VERIFIABLE |
| AC-3 | R22 주입값이 프롬프트에 포함되고 응답 수치가 주입값 범위 내(계약 테스트) | LOCAL_VERIFIABLE |
| AC-4 | kind=empty/insufficient 입력 → "판단 불가" 구조 응답 | LOCAL_VERIFIABLE |
| AC-5 | speedRelated=false 사유 fixture → 전압 조언 부재 | DEPLOY_ONLY (실 LLM) |
| AC-6 | 실제 응답 grounding·한국어 품질·latency p95 6s | DEPLOY_ONLY (실 LLM) |
| AC-7 | AI 실패 시 클라이언트 결정론 폴백 렌더 | LOCAL_VERIFIABLE (mock 5xx) |

- Mock 경계: 계약·클램프·폴백·침묵은 로컬(mock upstream), 실제 생성 품질만 배포 후 검증.
