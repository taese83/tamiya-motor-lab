# Feature Plan — 레이스 자동 입력 (race-autofill, Phase 1)

> 근거: requirements.md(REQ-AF-001~008)·planning-context·DL-033~038. 구현 금지 — 분해·계약만.
> 원칙: 프리필 근거는 결정론 파생(DL-036), 팝업 유지+추천 병기(DL-037), 체크리스트 비저장 ephemeral(DL-038), 재계산 금지(insight 재사용). (기록 주체: 오케스트레이터 대필 — ownership hook.)

## 딜리버리 단위 U1~U5 (의존 순서)

| # | 단위 | FSD owner 경로 | 의존 | 배치 근거 |
|---|---|---|---|---|
| U1 | 목표 추천 selector | `src/entities/race-record/model/race-goal-recommend.ts` (+index export) | 없음 (U2와 병렬) | `RaceRecord[]→파생` 순수 selector는 entities 소유 — `race-insight.ts`·`race-analysis-gate.ts` 선례(React·IO 없음, 시그니처도 gate와 동형 `(races, insight)`) |
| U2 | 사유→점검항목 상수 맵 + 체크리스트 selector | 맵: `src/shared/config/domain.ts` / selector: `src/entities/race-record/model/race-prerun-checklist.ts` (+`STREAK_LIMIT` export 승격, index export) | 없음 (U1과 병렬) | 아래 "상수 배치" 참조 |
| U3 | RaceGoalSheet 추천 표시 | `src/features/race-record/ui/RaceGoalSheet.tsx` | U1 | props 확장 `recommendation`(완전 제어형 유지). rationale 코드→카피 맵은 이 파일 소유 — gate의 "문구 소유는 UI"(`ANALYZE_GATE_MESSAGES`) 선례 |
| U4 | 시트 체크리스트 블록 | 신규 `src/features/race-record/ui/RacePrerunChecklist.tsx` + `RaceEntrySheet.tsx` 삽입(이탈 사유 아래 권고 — 확정은 layout) | U2 | `RaceRetireReasonSelect` 선례: 세그먼트 내부 직접 import. 체크 상태는 컴포넌트 내부 useState(ephemeral) — draft·useRaceEntry·스키마 무접촉을 **props 타입으로 강제**(onChange 콜백 자체가 없음) |
| U5 | 페이지 배선 | `src/pages/race-detail/ui/RaceDetailPage.tsx` | U3·U4 | 기존 관례: 파생은 페이지에서 매 렌더 동기 계산(`computeRaceInsight` 배선과 동일). create 모드에만 checklist 전달, edit/첫 기록은 빈 값 — REQ-AF-008 |

## 함수 계약 (구현 아님 — shape만)

    // U1 — 입력은 이미 계산된 insight(streak·trend 재계산 금지) + races(R2의 retireReason 판독용).
    // races는 byMotor 최신순(desc) 그대로 — 재정렬 금지, 결정론·O(n)·IO 없음.
    type GoalRecommendRationale =
      | 'retired_streak'         // R1 → finish
      | 'retired_speed_related'  // R2 → stability
      | 'finished_streak'        // R3 → speed (trend null은 "악화 신호 없음" 취급)
      | 'finished_worsening'     // R4 → stability
    selectGoalRecommendation(
      races: ReadonlyArray<RaceRecord>, insight: RaceInsight,
    ): {goal: RaceGoal; rationale: GoalRecommendRationale} | null
    // null = 침묵: kind!=='ready' || streak.length<3 || R2'(비속도·사유없음 1회 이탈) || R5(혼조).
    // 근거 카피는 UI 소유(U3) — selector는 코드만 반환(gate 선례). 임계 상수(보수 N=2·공격 N=3)는
    // 파일 내부 const + 근거 주석(requirements 임계 근거 절 인용). 새 경계 발명 금지.

    // U2 — insight 불필요(윈도우가 STREAK_LIMIT=5 재사용). result 미정 회차는 건너뛰고
    // 확정 회차 최신 5건만 스캔 → retired+retireReason 보유만 집계.
    interface PrerunChecklistGroup {
      reason: RetireReason; count: number   // 근거 라벨은 UI가 retireReasonRowLabel(reason)+count로 조립
      items: ReadonlyArray<string>          // 맵에서 채택된 점검 항목(절삭 반영)
    }
    selectPrerunChecklist(races: ReadonlyArray<RaceRecord>): ReadonlyArray<PrerunChecklistGroup>
    // [] = 블록 비노출(REQ-AF-006). 규칙: leaf dedupe → 빈도 desc·동률 최신 → 상위 2 사유 →
    // 총 items ≤3(후순위 사유부터 절삭).

- U3 props: `recommendation: {goal; rationale} | null` 추가 — null이면 현행과 동등 렌더(REQ-AF-002·S01). 직전 목표 contained는 무변경, 추천은 배지 "추천"+캡션 근거 병기, 동일 버튼이면 공존(REQ-AF-003).
- U4 props: `checklist: ReadonlyArray<PrerunChecklistGroup>` — 빈 배열이면 미렌더. "표시 전용(저장되지 않음)" 카피·checkbox role·44px·SR 근거 텍스트(N04).
- U5: `selectGoalRecommendation(races, insight)`→RaceGoalSheet / `selectPrerunChecklist(races)`→RaceEntrySheet(create만, edit는 `[]`). 측정 왕복 복귀는 동일 입력 재파생=동일 결과(REQ-AF-007) — 추가 배선 없음.

## 상수 배치 — 사유→점검항목 맵(leaf 11종)

**`shared/config/domain.ts`**(RETIRE_REASON_TREE 옆) 채택. 근거: ① 정비 항목은 트리 causal 메타의 실행형 — 화면별 문구가 아니라 도메인 지식(트리 라벨·GOAL_LABELS가 이미 domain.ts에 한국어로 존재) ② `Record<RetireReason, readonly string[]>` 타입으로 **leaf 추가 시 맵 누락이 컴파일 에러** — append-only 관례를 타입이 강제 ③ selector가 entities라 features 내부 상수는 import 불가(FSD 역방향) — feature 배치안 기각. 항목 문구는 requirements §핵심 산출 2 표 그대로(AF-A1).

## 테스트 계획 + Traceability

| REQ | 테스트 | 파일(신규) |
|---|---|---|
| AF-001 | R1~R5 전 분기 unit(R3의 trend null 허용 포함)+결정론 | `race-goal-recommend.test.ts` |
| AF-002 | empty/insufficient/미정 혼재로 streak 2/R2'/R5 → null + Sheet render 추천 DOM 0 | 동파일 + `RaceGoalSheet.test.tsx` |
| AF-003 | 추천=speed·직전=finish 공존 표기·자동 선택 없음(onSelect 미호출)·동일 버튼 병기 | `RaceGoalSheet.test.tsx` |
| AF-004 | 매핑(jump_attitude×2+stall×1 → ≤3항목·근거 ×2)·dedupe·동률 최신·상한 절삭·11 leaf는 Record 타입이 컴파일 보장 | `race-prerun-checklist.test.ts` |
| AF-005 | 체크 토글 로컬·재마운트 초기화·"표시 전용" 카피·콜백 부재(타입) — 스키마 무영향은 기존 `schema.test.ts` 회귀 | `RacePrerunChecklist.test.tsx` |
| AF-006 | 유효 사유 0건 → `[]` unit + checklist=[]이면 블록 DOM 부재 | selector·컴포넌트 test |
| AF-007 | 기존 use-race-entry 재덮어쓰기 없음 회귀(무수정 통과) + U4 무콜백 계약 | 기존 스위트 |
| AF-008 | 기존 게이트 전건 통과 + edit mode render에서 신규 UI 미노출 | 기존 스위트 + AF-005 파일 내 케이스 |

공용 fixture: 이탈 2연속 / 속도연관 1회 / 비속도(parts) 1회 / 3연속 완주(+trend 양호·악화) / 혼조 / 이력 2건 / 완주만 5건.

## CHANGE_BUDGET (추정)

- 신규 7: selector 2 + selector test 2 + `RacePrerunChecklist.tsx` + 컴포넌트 test 2
- 수정 6: `domain.ts`(맵) / `race-insight.ts`(STREAK_LIMIT export만) / `entities/race-record/index.ts` / `RaceGoalSheet.tsx` / `RaceEntrySheet.tsx` / `RaceDetailPage.tsx`
- 스키마·repository·migration·API·`use-race-entry.ts` 변경 0.

## 미결 D4·D5 영향

- D4 → REQ-AF-003 해소안(직전=contained 유지·추천=배지 병기)이 U3에 반영 — **확정 시 영향 0**. 역전 시에도 U3 1파일 스타일 변경뿐.
- D5 → REQ-AF-006 해소안(침묵=비노출)이 U2·U4에 반영 — **확정 시 영향 0**. 역전 시 U2 맵에 기본 항목+selector 폴백 추가(2파일), 계약 shape 불변.
