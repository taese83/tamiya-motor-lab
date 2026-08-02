# Plan Review — race-autofill Phase 1 (2026-08-02, plan-reviewer)

> 대상: `race-autofill/{planning-context,requirements,feature-plan}.md` + DL-033~038. 대조: `race-insight.ts`·`race-analysis-gate.ts`·`domain.ts`·`RaceGoalSheet.tsx`·`RaceEntrySheet.tsx`·`RaceDetailPage.tsx`(전부 직접 확인). (기록 주체: 오케스트레이터 대필 — read-only 리뷰어 반환 본문.)

## 판정: **NEEDS_DECISION**

Phase 2가 새 제품 결정을 발명하지 않고 시작 가능한 수준이며, D4·D5는 문서 내 해소 제안이 U3·U4에 이미 반영되어 "확정 시 영향 0"으로 병렬화 안전. 다만 두 건이 사용자 최종 확인 대기라 PASS가 아닌 NEEDS_DECISION. BLOCKER 없음.

## 특별 점검 결과

1. **규칙의 코드 정합 — 통과.** ① `STREAK_LIMIT=5`는 `race-insight.ts:45`에 **비export const로 실존** — feature-plan의 "export 승격" 전제 정확, 계획 수정 불요. ② streak 의미(미정 제외·최신순·상한 5)는 `computeRaceInsight` 91~96행과 일치. ③ `kind` ready 경계는 `INSIGHT_READY_MIN=3`(전체 건수 기준 — 미정 포함)으로 requirements 주장과 일치하며, 미정 포함 계수의 빈틈을 `streak.length<3` 병행 조건이 정확히 막는다(3건 중 1건 미정 → ready지만 streak 2 → 침묵). ④ `trend.lapTimeMs` null 조건(윈도우 내 보유 표본 <3)은 R3의 "null=악화 신호 없음" 처리와 정합. ⑤ 매핑 표 11 leaf는 `RETIRE_REASON_LEAF_KEYS`와 전수 일치, causal 문자열도 트리 원문과 일치. `resolveSpeedRelated` 실존(domain.ts:178, 부모 상속 포함).
   - 구현 정밀도 주의 1건(비차단): R2의 "최신 이탈 회차" 판독은 `races[0]`이 아니라 **result 확정 첫 회차**를 찾아야 streak[0]과 동일 개체가 된다(미정 회차가 더 최신일 수 있음). 계약 주석에 명시 권장.
2. **재계산 금지 — 준수.** `selectGoalRecommendation(races, insight)`는 streak·trend를 insight에서 읽고 races는 retireReason 판독 전용 — gate 선례와 동형. `selectPrerunChecklist(races)`가 races를 직접 스캔하는 것은 **정당**: insight.streak은 'finished'|'retired'만 담고 retireReason을 노출하지 않아 재사용 불가, 경계 상수만 재사용.
3. **결정론 — 성립.** 입력은 repository 보장 desc 순서 그대로, Date·난수·비동기 없음. "빈도 desc→동률 최신"은 desc 입력 기준 완전 정의(stable sort + 명시 tie-break). 측정 왕복 복귀 재파생도 RaceRecord는 왕복 중 불변(자동 저장은 MeasureRecord)이라 동일 입력=동일 출력 유효.
4. **범위 유입 — 없음.** 프리필만: 자동 진행·자동 저장 경로 없음. L1: U4 props에 onChange 콜백 자체가 없어 draft·`use-race-entry`·스키마로 새는 경로를 **타입이 차단**, CHANGE_BUDGET에 schema·repository·migration·use-race-entry 변경 0 명시. 전압: Won't에 advisor 무변경 고정, U1~U5 어느 것도 voltage-advisor·openWithGoal 미접촉. `domain.ts` 수정은 상수 맵 append 1건으로 FSD 방향상 불가피.
5. **기존 UX 회귀 위험 — 관리됨, layout 확인 2건.** RaceGoalSheet는 현재 lastGoal에 contained+" · 지난 목표"+캡션 3중 강조 — 추천 배지가 다른 버튼에 붙으면 강조 채널 2개가 경합(공존 규칙은 REQ-AF-003이 고정했으나 시각 위계는 layout 몫). RaceEntrySheet 삽입 지점 "이탈 사유 아래"는 신규 입력 시 result=null이라 사유 필드가 미노출 — 실질 위치(결과 세그먼트 아래)를 layout에서 확정 필요. 체크리스트 ≤3항목·REQ-AF-006 비노출이 수직 예산 하방 방어.
6. **traceability — REQ-AF-001~008 전수 매핑 확인**, S01(U3 null 렌더)·S02(AF-005 재마운트 초기화)·S03(AF-002 미정 혼재) 커버. 경미 결손: N04 a11y 검증(checkbox role·44px·SR 근거)이 테스트 표에 명시 행 없음 — AF-005 파일에 케이스 추가 권장. N01/N02는 구조적 성립. ASSUMPTION 4건 모두 검증 방법 보유.

## Readiness Gate 체크

사용자·pain·관찰 가능한 성공 조건 명확 / Must·Won't 경계 명확(전압 항목의 체크리스트 미포함 판정은 중복 채널 방지 근거까지 제시) / UX Check trigger 적용 / Critical State 3표면 전수 / annotation 해당 없음 근거 / data strategy `mock`+fixture 7종 / S~M·driver·reduce·최소 검토 단위·production delta 0 / 침묵 임계는 기존 경계 재사용(신규 발명 없음, R22 계승).

## 우선 결정 (최대 3)

1. **D4 확정 등재** — 직전=contained 유지·추천=배지 병기(REQ-AF-003안). 영향 U3 1파일. 권고: 채택(DL-037 의사 표현 지점 보존과 정합).
2. **D5 확정 등재** — 유효 사유 0건 시 비노출(REQ-AF-006안). 영향 U2·U4. 권고: 채택(고정 항목은 습관화로 무시).
3. **(경미) R2×jump_attitude 카피** — jump_attitude는 상속으로 speedRelated=true지만 causal은 "밸런스/댐퍼(속도 약함)" — 단독 이탈 시 "속도 연관→안정" 카피가 원인과 어긋날 수 있음. 권고: 규칙 유지 + 카피를 "직전 이탈 — 안정 권장"으로 중립화할지 layout 판단.

## BLOCKER

없음.
