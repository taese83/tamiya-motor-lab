# change-journal — entity-query-builder

> 기록 주체: 오케스트레이터 대필 — subagent 저널 Write가 hook 차단되어 반환 원문 기록.

## 2026-07-31 R20

**작업**: retire-reason 데이터 모델 — retireReason optional additive (계약: retire-reason-chipset.md §데이터 모델, change-scope R20)

MODIFIED:
- src/entities/race-record/model/schema.ts — `retireReasonSchema = z.enum(RETIRE_REASON_LEAF_KEYS)` 신설(domain.ts 단일 출처 import). raceRecordSchema·createRaceRecordDraftSchema·updateRaceRecordPatchSchema 3곳에 `retireReason: retireReasonSchema.optional()`. patch 스키마엔 "goal과 달리 편집 대상(patch 소유), 생략=필드 제거(D-R2 UI 클리어)" 주석. 편집 가능 필드 목록 주석 3→4필드 정합.
- src/entities/race-record/api/repository.ts — create record 조립에 `...(parsed.data.retireReason !== undefined ? {retireReason} : {})`(§2.1 undefined 미저장). update next 조립에 **patchParsed.data** 기준 spread(goal=current 보존과 달리 patch 소유 — 생략 시 필드 제거, D-R2). 모듈 헤더·doc 편집 필드 목록 반영.

EVIDENCE:
- optional additive만 — 기존 필드·IndexedDB 스키마 버전·migration 무변경. 구 행 retireReason 부재로 corrupt 아님(read-lenient, goal 선례).
- enum 출처 RETIRE_REASON_LEAF_KEYS 단일(키 중복 정의 없음). update는 put 통째 교체 + spread 생략 → patch 없으면 기존 값 제거.
- 게이트: typecheck·lint·test(156 통과)·build PASS.

## 2026-07-31 R22
- 신규 src/entities/race-record/model/race-insight.ts — RaceRecord[](desc) → RaceInsight 순수 파생. selectAdviceWindow+RECENT_FALLBACK=5 추출(RaceDetailPage:160-163 동일 동작). computeRaceInsight: DL-013 세분화(band·lastFinishedVoltage=전체 finished / trend=advisor 윈도우), streak 최신순≤5(미정 제외), DL-014 excluded 항상 산출. trend 규칙: 표본<3→null, baseline=최신 제외 평균, |diff|<baseline×5%→steady.
- src/entities/race-record/index.ts — computeRaceInsight·selectAdviceWindow·RECENT_FALLBACK·RaceInsight·TrendDir export(기존 무변경).
- EVIDENCE: 게이트 typecheck·lint·test(183)·build PASS. 순수·O(n)·입력 불변.

## 2026-08-02 R30 U1·U2
- CREATED: model/race-goal-recommend.ts — `selectGoalRecommendation(races, insight)`. 침묵(kind≠ready·streak<3) → R1(2연속 이탈→finish) → R2(1회 이탈+speedRelated→stability, **확정 첫 회차** `races.find(r=>r.result!==undefined)` 판독 — plan-review 지적 반영) → R2'(비속도·무사유→null) → R3(3연속 완주·trend≠worsening→speed) → R4(worsening→stability) → R5(null). 임계 const+근거 주석. rationale 코드만 반환(카피는 UI 소유).
- CREATED: model/race-prerun-checklist.ts — `selectPrerunChecklist(races)`. 확정 최신 5건(STREAK_LIMIT) 스캔·미정 skip, retired+사유만 집계, dedupe·빈도 desc·동률 최신, 상위 2 사유, 총 항목 ≤3 절삭, 0건 → [].
- MODIFIED: model/race-insight.ts(STREAK_LIMIT export 승격만) · index.ts(신규 export).
- 차단→대필: shared/config/domain.ts의 `RETIRE_REASON_PRERUN_ITEMS`(11 leaf, Record 타입으로 누락 시 컴파일 에러·전압 항목 미포함 근거 주석) — 오케스트레이터 적용.
- EVIDENCE: 순수·결정론·IO 0. 게이트 typecheck·lint·test(254)·build PASS.
