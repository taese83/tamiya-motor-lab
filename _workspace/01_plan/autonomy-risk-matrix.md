# 레이스 AI Phase 1 — Autonomy·Risk Matrix (2026-07-31)

## 1. Autonomy 확정: L1 (읽기 전용 제안)

| Level | 의미 | 판정 |
|---|---|---|
| L0 | 검색·요약만 | 부족 — 코칭·진단 "제안"이 핵심 가치 |
| **L1** | **초안·추천 (실행 없음)** | **확정** — intake 확정: AI 저장·수정 없음, 버튼 on-demand만 |
| L2 | 사용자 승인 후 실행 | 미채택 — AI가 실행할 write가 현재 없음 |
| L3/L4 | 자동 실행 | 금지 — 개인 도구에 불필요, production-contract 기본 금지 |

- 근거: ① intake 확정(읽기 전용 제안만) ② authoritative state는 IndexedDB+서버 sync이며 모델은 control plane이 아님(production-contract 원칙 1) ③ 모든 개입이 버튼 트리거라 자동 호출 표면 자체가 없음.
- **HIGH_IMPACT_ACTIONS: 없음. 승인 필요 행동: 없음.** AI 출력은 화면 표시가 전부 — 저장·수정·삭제·외부 호출 없음.

## 2. 역할별 위험·완화

| 역할 | 주요 위험 | 심각도 | 완화책 |
|---|---|---|---|
| ① 이탈 진단 | 오진단 → 잘못된 세팅 → 이탈·모터 부담 | 중 | speedRelated·causal 메타 주입, 미측정 세팅 단정 금지(REQ-AI-002), 사유 미기록 시 침묵(REQ-AI-003) |
| ② 세팅 코칭 | 과전압 제안 → 이탈·배터리/모터 실손 | **높음** | 서버 2.6~3.2V·0.02 클램프, retired 전압대 회피 규칙, speedRelated=false면 전압 조언 금지, 최종 적용은 항상 사용자 수동 |
| ③ 브리핑 | 수치 환각 → R22 카드와 불일치 → 신뢰 상실 | 중 | R22 산출값 주입·재계산 금지(REQ-AI-001), 계약 테스트 AC-3 |
| ④ 이상 감지 | 허위 경보 / 미탐 | 낮~중 | 결정론 trend와 모순 금지, 근거 없으면 침묵, "후보 지목"으로 표현 수위 제한 |
| 공통 | denial-of-wallet — **recommend-voltage.js authGuard 미적용 확인됨(공개 POST)** | **높음** | requireSession 필수(신규+소급), max_tokens 상한, history 20건 컷, rate limit·월 상한(REQ-AI-004·§6) |
| 공통 | 데이터 오염 | 없음(구조적) | L1 — AI에 write 경로 자체가 없음. IndexedDB/서버 write는 기존 결정론 command만 |
| 공통 | 프롬프트 인젝션 | 낮음 | 입력이 숫자+enum뿐. 자유 텍스트 Phase 1 도입 금지(NON-GOAL) |
| 공통 | 실패 은폐 | 중 | 성공 위장 금지 — typed 5xx + 결정론 폴백(REQ-AI-005) |

## 3. L2 승격 조건 (향후 — 예: "제안 전압을 원클릭 저장")

L2로 올리려면 아래를 모두 충족해야 한다.

1. write 대상은 기존 zod 스키마·command 경로만 경유(AI가 직접 DB 접근 금지, 클램프·검증 통과 필수).
2. 저장 전 명시적 사용자 확인 UI(제안값·근거 표시) + 저장 후 undo/rollback 경로.
3. 승인자=사용자 본인(1인 도구 — 별도 승인자 불필요), 단 AI 유래 값임을 기록에 표시(감사 가능성).
4. requireSession + rate limit이 먼저 적용돼 있을 것(현 공개 endpoint 상태로는 승격 금지).
5. AC-5·AC-6(DEPLOY_ONLY 품질 기준)이 배포 환경에서 통과한 실적.

## 4. BLOCKER / ASSUMPTION

- BLOCKER: 없음 — hard stop 조건(tenant·승인자·authoritative system·PII·성공 기준) 전부 해소(1인 도구, intake 확정).
- ASSUMPTION: §6 예산 수치(rate limit·월 상한·latency)는 개인 도구 baseline 제안 — 사용자 확정 시 상수 교체.
