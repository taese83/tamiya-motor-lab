# Planning Context — 레이스 AI 활용 Phase 1 (minicar-motor-lab, 2026-07-31)

> Phase 1 planning only. 결정 이력: `_workspace/01_plan/decision-log.md` "2026-07-31 레이스 AI 활용 기획"(DL-021~025).
> race-insight(R22 결정론 카드)의 **보완**이지 대체가 아니다 — `_workspace/01_plan/race-insight/` 병존.
> (기록 주체: 오케스트레이터 대필 — race-ai/ 하위 쓰기는 ownership hook 차단, DL-025.)

## Product Frame

- 대상 화면/기능: `/race/:motorId` 레이스 상세 — R22 결정론 카드 옆에 **on-demand AI 분석**(버튼)을 얹는다. 자동 호출 없음(DL-021②).
- 주 사용자: 사용자 본인(단일 사용자, DL-021④) — 트랙사이드 모바일 한 손 맥락(race-insight DL-008 계승).
- 끝내려는 업무: 결정론 카드가 **보여주는 숫자**(완주 전압대·스트릭·추세) 너머의 **인과 질문**에 답을 얻는다 — "왜 이탈했나", "전압 말고 뭘 바꿔야 하나", "이 모터 히스토리 요약", "평소와 다른 게 있나".
- 현재 pain: retireReason(R20 트리)까지 수집해도 교차 해석(사유 패턴×전압대×추세)은 사용자 암산 — 결정론 파생은 개별 수치만 제공하고 종합·인과 가설·비전압 처방은 없다.
- 관찰 가능한 성공 조건: AI 버튼 1탭 → 수 초 내 R22 수치와 **모순 없는** 근거 인용 응답 → 다음 판에서 전압 외 액션(댐퍼·밸런스·점검 등)까지 결정 가능. AI 실패·오프라인이어도 R22 카드는 항상 그대로(무료·즉시·오프라인).

## 구조 해석 — 4역할이 답하는 질문과 결정론 경계 (핵심 논점)

| 역할 | 답하는 질문 | 결정론이 이미 답하는 부분(AI 재수행 금지, DL-022) | AI 고유 몫 |
|---|---|---|---|
| ① 이탈 원인 진단 | "왜 이탈했나 — 속도 문제인가 세팅 문제인가" | `resolveSpeedRelated`(전압 처방 가능 여부)·causal 힌트는 leaf당 결정론 | **회차 간 패턴**: "jump_attitude 반복 + 전압 낮춰도 재발 → 전압 아닌 댐퍼 가설" |
| ② 다음 세팅 코칭 | "다음 판 **전압 외에** 뭘 바꿀까, 왜" | 전압 숫자는 기존 `recommend-voltage`(LLM+휴리스틱)가 이미 담당 — 재발명 금지 | 비전압 처방(댐퍼·밸런스·파츠 점검)과 근거 서술. 전압은 advisor 결과 **인용** |
| ③ 기록 브리핑 | "이 모터의 스토리를 한 문단으로" | finishedBand·streak·trend 수치는 R22 | 수치의 **종합 서사**(goal 대비 결과, 사유 변화 흐름). 수치 재계산·재진술만이면 가치 없음 |
| ④ 이상 신호 감지 | "지금 평소와 다른 점 있나"(on-demand 질의형 — 자동 감시 아님, DL-021②) | CV 컨디션(watch/inspect)·추세 방향은 결정론 기존재 | "완주하던 전압대에서 갑자기 이탈", "파노 유지인데 랩타임 악화" 같은 교차 이상 |

**진입점 통합 판단**: 시점을 따지면 ①=이탈 기록 직후, ②=다음 판 전, ③=상세 진입, ④=열람 중으로 갈리지만, on-demand only 확정이 "직후 자동"을 제거해 전부 **사용자가 상세 화면에서 버튼을 누르는 순간**으로 수렴한다. 입력 데이터도 동일(그 모터의 RaceRecord 목록+retireReason+R22 파생값). → **단일 "AI 분석" 버튼 + 단일 엔드포인트 + 섹션형 구조화 응답(진단/이상/브리핑/다음 판 제안)**이 기본 제안(A1). 역할별 4버튼·4엔드포인트는 비용 4배·UI 밀도 초과로 반대. 특정 이탈 행 focus 진단은 동일 엔드포인트에 focus 파라미터로 후속 확장.

## Evidence Inventory

| Source | 확인한 사실 | 신뢰 범위 | 후속 검증 |
|---|---|---|---|
| `api/recommend-voltage.js` | 유일 기존 AI: Haiku 4.5(`claude-haiku-4-5-20251001`), max_tokens 300, temp 0, 서버 전용 키, JSON 출력+서버 클램프(2.6~3.2/0.02). **`requireSession` 미사용 — 무인증 호출 가능**(DL-023) | 코드 직접 확인 | 신규 엔드포인트는 requireSession 전제, 소급 적용은 D2 |
| `api/_lib/authGuard.js` | `requireSession` 존재(세션 쿠키 검증, 401+null) — v2.40 Phase B | 코드 직접 확인 | — |
| `src/features/race-record/api/recommend-voltage.ts` | 클라 폴백 계약: 실패·타임아웃(6s)·비정상 응답 → 휴리스틱, zod 검증+재클램프 | 코드 직접 확인 | 분석 응답도 zod 검증 동일 패턴 준용 |
| `race-insight.ts` | R22 파생: kind(empty/insufficient/ready, ready=3건+)·finishedBand·lastFinishedVoltage·streak(5)·trend(표본 3+ 아니면 null 침묵)·excluded | 코드 직접 확인 | AI 입력에 파생값 주입 — 재계산 금지 |
| `domain.ts` R20 트리 | retireReason leaf 11종, speedRelated 상속 해석(`resolveSpeedRelated`), causal 힌트 문자열("AI 힌트"로 설계됨) | 코드 직접 확인 | 프롬프트 컨텍스트로 트리 메타 직렬화 |
| `schema.ts` | RaceRecord{panoHz, voltage, result?, lapTimeMs?, goal?, retireReason?, createdAt} — retireReason은 optional additive, 구 데이터 소급 불가 | 코드 직접 확인 | 사유 없는 이탈 회차의 "근거 부족" 처리(상태 표) |
| 2026-07-31 intake | 4역할 전부·버튼 only·L1 읽기 전용·단일 사용자 — 확정, 재질문 금지(DL-021) | 사용자 확정 | — |

## UX Check

(trigger: AI 응답 신뢰(비결정성·환각) + 정보 밀도 — R22 카드+AI 응답+목록이 한 화면)

- 첫눈에 알 수 있어야 하는 것: R22 카드는 변함없이 즉시. AI는 "버튼 하나 + 응답 카드 하나" — 응답이 어느 데이터(회차 n건·기간)를 근거로 했는지 표기.
- 다음 행동이 보이는가: 응답의 "다음 판 제안"이 곧 행동이지만 L1 — 앱이 대신 저장·적용하지 않음을 UI가 오해 없이 전달([+ 기록]은 여전히 사용자 몫.)
- 실수하거나 오해할 지점: ① AI 서술이 R22 수치와 미묘하게 다르면 즉시 불신 → 파생값 주입·인용 강제 ② 표본 부족(3건 미만·사유 없는 이탈뿐)인데 그럴듯한 진단 생성(환각) → 호출 전 결정론 게이트로 차단이 비용상도 유리 ③ 비결정성 — 같은 데이터에 다른 답(temp 0으로 완화, 그래도 재호출 시 변동 고지) ④ 응답 비저장(L1)인데 사용자가 다시 찾음 — 세션 내 유지 여부 D3.
- 먼저 정할 방향: AI 응답도 구조화 JSON(섹션+근거 인용) — 자유 산문 금지. R22 카드 아래 접이식/시트로 수직 예산 보호(race-insight REQ-NFR-001 긴장 계승).
- prototype/Phase 2에서 확인할 것: mock 응답 fixture로 5상태 전환(대기/요청 중/성공/실패/근거 부족) / R22 수치 인용 정합 / 작은 뷰포트에서 응답 카드가 목록 첫 행을 밀어내지 않는지.

## Annotation Review

해당 없음 — 화면 주석·스크린샷 입력 없음(텍스트 intake만).

## Critical State Inventory

| Surface | normal | empty | loading | error/partial | permission/destructive |
|---|---|---|---|---|---|
| AI 분석 버튼+응답 카드 | 응답 섹션 표시(근거 회차 수 표기) | **근거 부족**: 기록 3건 미만 or 이탈 전부 사유 없음 → 버튼 비활성+사유 문구(호출 자체를 결정론 게이트로 차단 — 비용·환각 동시 방어) | 요청 중 스피너+취소 가능(6s 타임아웃 준용), R22 카드는 그대로 | 업스트림 실패/오프라인: "분석 불가 — 결정론 요약은 위 카드" 안내(휴리스틱 폴백 없음 — 성공 위장 금지). 사유 없는 이탈 혼재 시 "사유 미입력 n건 제외" 표기 | L1 — 저장·수정 없음, destructive 없음. 응답은 비영속(새로고침 소멸) — 세션 내 유지는 D3. 무인증 호출 차단(requireSession, D2) |
| 기존 recommend-voltage (영향 범위) | 현행 유지 | — | — | requireSession 소급 시 비로그인 401 → 휴리스틱 폴백 자연 수렴 확인 | D2 |

## Data Review Strategy

- strategy: `mock` — AI 입력은 기존 IndexedDB RaceRecord+R22 파생의 읽기 전용 직렬화. 신규 엔티티·필드·migration 없음, production mutation 없음, AI 응답 비저장(DL-024).
- fixtures/source and safety: ① 데이터 fixture — 사유 라벨 풍부/사유 없는 이탈만/표본 부족/완주만(이상 없음 케이스) ② AI 응답 mock fixture — 정상 구조화/실패/근거 부족/과도하게 긴 응답. 격리 fixture만, 실데이터 변경 금지.
- Mock→real transition: Vercel preview에서 실 LLM 호출 1회 확인(owner: 사용자). 읽기 전용이라 전환 위험 없음. 로컬 정적 서버는 serverless 부재로 항상 실패 상태 검토 경로가 됨(기존 advisor와 동일 특성).

## Effort Trade-off

- rough size: **M** (단일 진입점 통합안 기준). 역할별 4엔드포인트·4UI 분리안은 L 근접 — 반대.
- drivers: serverless 함수 1(+프롬프트 설계가 실질 비용)·화면 1(상세)·신규 상태 5(대기/요청/성공/실패/근거부족)·응답 zod 계약 1·requireSession 배선·수직 예산 재검토. migration 0.
- recommendation: **split** — 1차: 단일 "AI 분석" 버튼+통합 구조화 응답(4역할=응답 내 섹션) / 2차: 이탈 행 focus 진단·응답 세션 캐시 등 확장. 4역할을 별개 기능으로 쪼개 구현하는 분할은 아님(입력·화면·시점이 동일하므로 쪼개면 손해).
- smallest visible review: 상세 화면 버튼+mock 응답 fixture로 5상태 전환 검토(실 LLM 불필요).
- production integration delta: Vercel env 키는 기존 그대로 — 신규는 엔드포인트 1개 배포뿐.

## Open Decisions

- ASSUMPTION A1: 4역할 = 단일 엔드포인트·섹션형 단일 응답으로 통합 — 검증: plan review 사용자 확인(구조 해석 절 근거).
- ASSUMPTION A2: 코칭의 전압 숫자는 기존 advisor 인용, AI는 비전압 처방 담당(DL-022) — 검증: requirements 경계 표+fixture에서 모순 검사.
- ASSUMPTION A3: 모델·키 패턴은 기존 재사용(Haiku 4.5, 서버 전용 env, temp 0) — 검증: tech-note에서 확인.
- NEEDS_DECISION D1(최우선): 통합 진입점 1버튼(권고) vs 역할별 분리 — A1 채택 여부.
- NEEDS_DECISION D2: `requireSession`을 기존 recommend-voltage에 소급 적용할지(신규 엔드포인트는 적용 전제 — DL-023).
- NEEDS_DECISION D3: 응답 세션 내 유지/재호출 정책 — 비저장(L1) 원칙하에 메모리 캐시 허용 여부(비용 vs 신선도).
- BLOCKER: 없음.

## Current Planning Memo

- 확인된 요구: 상세 화면 on-demand 단일 AI 분석(4역할 섹션), L1 읽기 전용, R22 결정론 카드와 역할 분담 명확(재계산·재진술 금지).
- 빠진 시나리오: 모터 간 비교 분석·측정(MeasureRecord) 도메인 AI·자동 알림은 언급 없음 — Won't 명시 권고.
- 다음 질문/행동: ① D1~D3 사용자 확인 ② requirements에서 역할별 "답하는 질문↔결정론 경계" 표 유지 ③ 프롬프트·응답 zod 계약은 tech-note 담당, 수직 예산은 layout 담당.
