# Plan Review — 레이스 인사이트 (race-insight, Phase 1)

> 대상: `_workspace/01_plan/race-insight/` 6문서. 근거 대조: `race-record/model/schema.ts` · `RaceDetailPage.tsx:155-161` · `stability-baseline.ts` · `shared/config/domain.ts`. 기준: planning-readiness-contract Readiness Gate.
> (기록 주체: 오케스트레이터 대필 — read-only plan-reviewer 반환 본문 저장. 전체 앱 plan-review.md와 별개 파일.)

## 판정: **NEEDS_DECISION**

Phase 2가 새 제품 결정을 발명할 필요는 없다 — U1 파생 계약이 D1~D3를 파라미터(`sampleWindow` 옵션, `excluded` 항상 산출, M 단위 분리)로 격리해 병렬 착수가 안전하다. 다만 D1은 사용자 소유 결정이고, D2는 기본 제안(advisor 정합)을 그대로 채택하면 REQ-RI-001이 퇴화하는 함정이 있어 사용자 확인 없이 진행할 수 없다. BLOCKED 사유(권한·authoritative source·destructive 안전·상충 요구) 없음.

## Readiness Gate 점검

| 항목 | 판정 | 근거 |
|---|---|---|
| 화면/사용자/업무/pain/성공 조건 | 충족 | pain 단일 확정(DL-007), 성공 조건 관찰 가능(375×667 스크롤 없이 + 추천 수치 무모순) |
| Must/Should/Won't·범위 유입 방지 | 충족 | 사용자가 선택 안 한 pain(입력 개선·대회 구조)은 명시 Won't. `selectAdviceWindow` 추출이 추천 경로 코드를 건드리나 동작 불변+회귀 테스트 선행 조건이 걸려 있어 유입 아님(tech-note §3). [보는 법] 다이얼로그는 ConditionSummary 기존 문법 승계로 근거 있음 |
| UX Check trigger | 충족 | 정보 밀도 trigger 명시, ux-brief에서 화면 관점 정제 |
| 상태 커버리지 | 대체로 충족 | normal/empty/loading/error/partial/destructive 전부 계약화. **경미 gap 2건**: ① 3+건인데 완주 0건(전부 이탈·미정)일 때 band null 카드 표현 미정의 ② 삭제로 3→2건(ready→insufficient) 경계 전환 fixture 부재 — Phase 2 fixture 목록에 추가 권고 |
| 주석 정규화 | N/A 근거 있음 | 텍스트 intake만 — 타당 |
| 데이터 전략·Mock→real | 충족 | mock(격리 seed 7종), 전환=실기기 읽기 전용 열람(`DEPLOY_ONLY`, owner 사용자) |
| effort·driver·권고·최소 단위 | 충족 | S/M driver 명시, split 권고 5문서 일치, 최소 단위=카드 1장+fixture 4종. L은 Won't로 올바르게 배제 |
| Traceability | 충족 | project-brief §Traceability가 REQ-RI-001~007·101~102·NFR-001~005 전부를 U1~U5·F1~F7·Phase 2 수동 검토에 연결 — 누락 없음 |
| ASSUMPTION·우선 결정·BLOCKER | 충족 | A1은 본 리뷰에서 확인(스키마 무변경 — schema.ts 대조, 신규 필드 없음). A2는 fixture 검토로. 우선 결정 정확히 3개, BLOCKER 없음(경로 문제는 DL-011로 해소) |

## 특별 점검

1. **D2 band 퇴화 flag**: 코드로 확인 — advisor 윈도우(desc→첫 finished 포함 slice)는 finished 표본이 항상 1건이라 min~max가 단일값으로 퇴화한다. feature-plan·project-brief(Phase 2 진입점)에는 ⚠️로 일관 반영되고 해소안(표본 세분화)까지 제시돼 사용자 제시 가능 형태다. **단 requirements.md D2 항목과 ux-brief 일부는 "advisor 정합 기본 제안"을 무단서로 기술** — D2 확정 후 requirements 반영 필요(그대로 채택 시 REQ-RI-001 Given/Then과 모순).
2. **destructive(REQ-RI-006)**: 개별 삭제·전체 초기화 모두 Given/Then 존재, 재계산은 기존 invalidation이 보장(신규 위험 없음). 위 상태 gap ①②만 fixture 보강하면 충분.
3. **수치 대조**: 375×667·1~2건/3+건 경계·폴백 5건·155-161행·20+건 — 6문서 일치, 코드 정합 확인. **불일치 1건**: planning-context "≤10은 MeasureRecord만" → 실제는 `MEASURE_RECORD_LIMIT = 20`(v2.21 상향, domain.ts:59). RaceRecord 무상한 결론에는 영향 없으나 사실 정정 필요(→ 오케스트레이터가 정정 반영, 2026-07-31).

## 우선 결정 (사용자 제시용, 최대 3)

1. **D1 — 크기 (최우선)**: ⓐ S 단독 — 가장 빨리 검토하나 "추세" 질문 ③은 텍스트 방향만으로 답한다. ⓑ **split(S→M, 전 문서 권고)** — S로 수직 예산을 실측한 뒤 차트를 얹어 화면 밀림 위험을 통제하나 검토가 2회가 된다. ⓒ M 일괄 — 한 번에 pain 전체를 다루나 차트 200px급 높이가 "스크롤 없이" 성공 조건과 정면 긴장한다.
2. **D2 — 요약 표본 윈도우**: ⓐ advisor 정합 단일 윈도우 — 추천과 근거가 완전히 일치하나 완주 전압대가 항상 1건짜리 단일값으로 퇴화해 REQ-RI-001이 무의미해진다. ⓑ **세분화(권고): 전압대=전체 finished, 추세=advisor 윈도우** — 두 질문 각각에 맞는 표본을 쓰나 [보는 법]에 기준 2개를 설명해야 한다. ⓒ 전체 누적 단일 — 계산이 단순하나 오래된 세팅이 섞여 추천 수치와 달라 보이는 불신 위험이 있다.
3. **D3 — result 미정 회차 표기**: ⓐ **제외+건수 고지(기본 제안)** — "미정이 통계에 들었나" 오해를 예방하나 카드에 보조 문구 한 줄이 늘어난다. ⓑ 무표기 제외 — 카드가 더 조용하나 목록과 눈 대조 시 건수 차이의 이유가 보이지 않는다. (`excluded` 항상 산출 설계라 어느 쪽이든 render 단언 1건 토글로 흡수)

## 수정 권고 (판정 비차단)

- planning-context MeasureRecord 상한 ≤10 → ≤20 정정. (반영됨 2026-07-31)
- D2 확정 시 requirements.md D2 항목·REQ-RI-001에 채택 윈도우 명기(ux-brief 동반).
- Phase 2 fixture에 "3+건 완주 0건 카드 표현"·"삭제로 3→2건 경계 전환" 2종 추가.
