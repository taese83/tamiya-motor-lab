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
