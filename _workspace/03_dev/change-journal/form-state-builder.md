# change-journal — form-state-builder

> 기록 주체: 오케스트레이터 대필 — subagent 저널 Write가 hook 차단되어 반환 원문 기록.

## 2026-07-31 R20

- MODIFIED: src/features/race-record/model/use-race-entry.ts — retireReason draft 배선(D-R2·D-R4).
  - createInitialRaceEntryDraft: retireReason: null.
  - onDraftChange: result가 'retired'가 아니게 바뀌면 retireReason 자동 클리어(D-R2 고아 방지).
  - validateRaceEntry commandDraft: result='retired' && retireReason!==null일 때만 포함.
  - editRecord: retireReason: record.retireReason ?? null(수정 시 사유 복원).
  - submit update patch: commandDraft.retireReason 조건부 포함 — repository는 patch 소유라 없으면 수정 시 사유 유실. 완주 전환 수정은 commandDraft가 사유 미포함→자동 제거(D-R2 정합).
- EVIDENCE: restoreFromMeasureReturn은 draft 통째 교체로 자동 보존(무변경 확인). RetireReason 신규 import 불필요(타입 경유). 게이트 156 통과·build PASS. 편집 사유 보존은 schema.test 회귀로 고정.
