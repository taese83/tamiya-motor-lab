# Planning Context — 다음 레이스 정보 자동 입력 (race-autofill, 2026-08-01)

> Phase 1 planning only. intake 확정(DL-033): 자동화 범위=폼 프리필만(자동 저장 없음 — L1 유지)·채울 항목 3종(전압·목표·체크리스트)·AC-5/6 품질 검증 생략. 결정 이력: decision-log "2026-08-01 레이스 자동 입력 기획"(DL-033~035). (기록 주체: 오케스트레이터 대필 — ownership hook, DL-035.)

## Product Frame

- 대상 화면/기능: `/race/:motorId` [+ 기록] 진입 흐름 — 목표 팝업(RaceGoalSheet) → 입력 시트(RaceEntrySheet). 열면 전압·목표·주행 전 체크리스트가 이미 채워져/제시돼 있고, 사용자가 확인·수정 후 [입력]으로 저장한다.
- 주 사용자: 사용자 본인(단일 사용자) — 트랙사이드 모바일 한 손 맥락.
- 끝내려는 업무: 다음 판 세팅을 매번 처음부터 고르는 대신, 기록이 말해주는 기본값을 받아 **확인만 하고 출발**한다.
- 현재 pain: 목표는 매번 수동 3택(직전 목표 강조뿐), 전압 추천은 목표 선택 후에야 나오며, 주행 전 점검(직전 이탈 사유가 시사하는 정비)은 앱이 전혀 안내하지 않아 같은 사유로 반복 이탈한다.
- 관찰 가능한 성공 조건: [+ 기록]→시트 도달에 추가 대기 없음(결정론 경로) / 프리필 값이 저장 전 전부 보이고 1탭 수정 가능 / 직전 이탈 사유와 정합한 체크리스트 표시 / 자동 저장 0건(write는 항상 사용자 [입력]).

## 구조 해석 — "AI 추천"이 실제로 가리키는 것 (핵심 논점)

| 항목 | 현재 | 이번 과제의 신규 몫 | 출처 판단 |
|---|---|---|---|
| ① 전압 | **이미 프리필됨** — `openWithGoal`이 휴리스틱 추천을 채우고, 시트 내 [AI 추천]으로 LLM 갱신(실패 시 휴리스틱 폴백) | **없음 — 현행 유지** | AI 분석은 전압 수치를 출력하지 않는다(DL-029/031). 전압 수치의 단독 출처는 기존 advisor — 재발명 금지(DL-022) |
| ② 목표 | RaceGoalSheet 수동 3택(직전 목표만 contained 강조) | 기록 기반 **추천 목표 표시** | 결정론으로 충분: streak·retireReason(speedRelated)·finishedBand로 "이탈 반복→보수, 완주 연속→공격" 규칙 파생 |
| ③ 체크리스트 | 없음(신규 개념 — RaceRecord 필드 아님) | 주행 전 점검 항목 파생·표시 | RETIRE_REASON_TREE가 causal·speedRelated 메타 보유 — 최근 이탈 사유의 결정론 매핑으로 1차 충분. analyze-race nextRace는 on-demand·비저장이라 [+ 기록] 시점 존재 보장 없음 |

- **LLM 자동 호출 반대 근거**: analyze-race는 rate limit 5회/분·ALLOWED_EMAIL fail-closed·수 초 지연 — [+ 기록]마다 호출하면 진입이 느려지고 비용이 들며 오프라인에서 프리필이 통째로 죽는다. 프리필 기본은 **결정론(즉시·오프라인·무료)**, LLM은 기존 on-demand 표면에 남긴다(D1).
- **목표 자동 선택의 UX 충돌**: 목표 팝업은 [+ 기록]의 첫 단계이자 **사용자 의사 표현 지점**("오늘은 속도로"). AI가 정해 팝업을 건너뛰면 그 지점이 사라진다. 권고: **팝업 유지 + 추천 목표 별도 표기**(배지+한 줄 근거) — 선택 탭은 여전히 사용자(D2·D4).
- **체크리스트 저장 여부가 규모를 가른다**: 비저장 표시 전용이면 순수 selector+UI 블록(S~M). 체크 상태를 저장하면 신규 엔티티+스키마+repository+동기화+편집 흐름까지 열려 **L로 급증**(D3).

## Evidence Inventory

| Source | 확인한 사실 | 신뢰 범위 | 후속 검증 |
|---|---|---|---|
| `RaceDetailPage.tsx` | [+ 기록]: 미완성 확인 → (2번째+) 목표 팝업 → handleGoalSelect가 openWithGoal(휴리스틱 전압 프리필) → 시트. 첫 기록은 목표 없이 바로 시트 | 코드 직접 확인 | 추천 목표 주입 지점 = RaceGoalSheet props 확장 |
| `use-race-entry.ts` | 전압 프리필+rationale+recommendSource 배지를 이미 소유. [AI 추천]=requestAiVoltage(LLM→휴리스틱 폴백). 사용자 수정은 onDraftChange — 재덮어쓰기 없음 | 코드 직접 확인 | 체크리스트 상태 위치는 Phase 2 |
| `schema.ts` | 레이스 전에 정할 수 있는 필드는 **voltage·goal뿐**. 체크리스트 필드 없음 | 코드 직접 확인 | 비저장 확정 시 스키마 무변경 |
| `domain.ts` | RETIRE_REASON_TREE leaf 11종에 causal·speedRelated 메타 — 체크리스트 결정론 원천으로 취지 정합 | 코드 직접 확인 | 사유→체크 매핑 표는 requirements 담당 |
| `race-insight.ts` | streak(최신 5)·finishedBand·selectAdviceWindow — 목표 추천 규칙 입력으로 재사용(재계산 금지) | 코드 직접 확인 | 추천 임계는 feature-plan |
| `api/analyze-race.js` | on-demand·rate limit 5/분·requireAllowedSession fail-closed·nextRace 전압 수치 금지 | 코드 직접 확인 | 프리필 자동 호출 부적합 근거 — D1 |
| 2026-08-01 intake | 프리필만·자동 저장 없음(L1)·3항목·AC-5/6 생략 — 확정, 재질문 금지 | 사용자 확정 | — |

## UX Check

(trigger: 자동화 신뢰 — 잘못된 프리필·사용자 의도 덮어쓰기 + 입력 시트 수직 밀도 증가)

- 첫눈: 어떤 값이 "추천으로 채워진 것"인지 vs 사용자가 넣은 것인지 — 기존 recommendSource 배지 패턴 확장.
- 다음 행동: 프리필이 맞으면 [입력] 1탭으로 저장까지. 단 저장은 항상 사용자 탭(L1).
- 오해 지점: ① 추천 목표를 "앱이 정했다"로 오독 — 팝업 유지·탭은 사용자 ② 체크리스트를 저장되는 기록으로 오해 — 표시 전용 명시 ③ 근거 없는 추천이 그럴듯하게 보임 — 표본 부족 시 침묵(R22 원칙 계승).
- Phase 2 확인: 체크리스트 블록 추가 후 수직 예산 / 추천 목표≠직전 목표일 때 팝업 가독성 / 프리필 수정 후 저장 흐름.

## Annotation Review

해당 없음 — 텍스트 intake만.

## Critical State Inventory

| Surface | normal | empty | loading | error/partial | permission/destructive |
|---|---|---|---|---|---|
| 목표 팝업(추천 표시) | 추천 목표 배지+한 줄 근거 | 이력 0건: 팝업 미노출(현행). 표본 부족: 추천 침묵, 현행 팝업 | 없음(결정론 동기 계산 — LLM 채택 시에만 발생, D1) | 결측(미정·사유 없는 이탈)은 규칙 입력에서 제외 — 미달이면 침묵 | 선택 탭은 항상 사용자 — 자동 진행·저장 없음 |
| 입력 시트 전압 프리필 | 현행 유지 | 현행(첫 기록은 프리필 없음) | [AI 추천]만 pending(현행) | LLM 실패·오프라인→휴리스틱 폴백(현행) | 저장 전 수정 가능(현행) |
| 체크리스트 블록(신규) | 최근 이탈 사유 기반 1~3항목+근거 | 이탈 없음·사유 미입력만: 비노출 vs 일반 항목 — D5 | 없음(결정론) | 사유 미입력 혼재: 보유 사유만 사용 | 비저장 표시 전용 — 체크 탭 ephemeral, RaceRecord 무영향 |

## Data Review Strategy

- strategy: `mock` — 기존 IndexedDB RaceRecord의 읽기 전용 파생만. 비저장 권고안 기준 신규 엔티티·필드·migration 0, write는 기존 [입력] 흐름 그대로.
- fixtures: 이탈 반복(speedRelated)/완주 연속/사유 미입력만/이력 0~2건 — 추천·체크리스트 규칙과 침묵 경계 검토. 실데이터 변경 없음.
- Mock→real: 결정론 경로라 전환 절차 없음. LLM 채택(D1) 시에만 Vercel preview 실호출 확인.

## Effort Trade-off

- rough size: **S~M**(권고안: 결정론 목표 추천+비저장 체크리스트, 전압 무변경). **체크리스트 저장 채택 시 L**(D3).
- drivers: 신규 selector 2(목표 추천·체크리스트 파생)+RaceGoalSheet 추천 표기+시트 체크리스트 블록+침묵 경계 fixture. LLM 자동 호출 시 +지연·비용·오프라인 폴백.
- recommendation: **reduce** — Phase 1은 결정론·비저장으로 좁힌다. LLM 개인화·체크 이력 저장은 후속.
- smallest visible review: fixture 3종(이탈 반복/완주 연속/이력 부족)으로 팝업 추천 표기+체크리스트 표시 mock 검토.
- production integration delta: 0(결정론 채택 시).

## Open Decisions

- ASSUMPTION A1: 전압 프리필은 기존 advisor 현행 유지 — 이번 과제 작업량 0(DL-034).
- ASSUMPTION A2: 체크리스트 원천 = RETIRE_REASON_TREE causal·speedRelated + 최근 이탈 사유 결정론 매핑.
- ASSUMPTION A3: 프리필은 시트 오픈 시 1회 — 사용자 수정 후 재덮어쓰기 금지.
- NEEDS_DECISION D1(최우선): "AI 추천 기반"의 의미 — 결정론+기존 advisor(권고) vs [+ 기록]마다 LLM 자동 호출.
- NEEDS_DECISION D2: 목표 — 팝업 유지+추천 표기(권고) vs 팝업 스킵+시트 프리필.
- NEEDS_DECISION D3: 체크리스트 저장 여부 — 비저장 표시 전용(권고, S~M) vs 저장(L). **규모 분기점**.
- NEEDS_DECISION D4: 추천 목표 강조 vs 기존 직전 목표 강조 충돌 시 표기 우선순위.
- NEEDS_DECISION D5: 체크리스트 근거 없음 시 — 비노출(침묵) vs 일반 점검 항목 고정.
- BLOCKER: 없음.

## Current Planning Memo

- 확인된 요구: [+ 기록] 프리필 3종(전압=현행 advisor·목표 추천 표시·체크리스트 파생), 자동 저장 없음(L1), AC-5/6 생략(완화: 저장 전 가시·수정 가능).
- 빠진 시나리오: edit 모드(행 수정)는 프리필 미적용(현행 유지 권고) / 측정 왕복 복귀 시 체크리스트 재파생 / 첫 기록 경로 현행 유지.
- 다음 질문/행동: ① D1~D3 사용자 확인(D3가 규모 결정) ② requirements: 사유→체크 매핑 표+목표 추천 규칙·침묵 임계 ③ layout: 입력 시트 수직 예산.
