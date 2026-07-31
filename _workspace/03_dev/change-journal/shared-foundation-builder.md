# change-journal — shared-foundation-builder

> 기록 주체: 오케스트레이터 대필 — subagent 저널 Write가 enforce-agent-ownership hook에 차단되어 반환 원문 기록.

## 2026-07-31 R20

- 담당: shared-foundation-builder (iterate R20, feature — race-retire-reason Phase 1)
- 계약: `_workspace/01_plan/race-insight/retire-reason-chipset.md` "Taxonomy — 재귀 트리" + Locked Decisions(DL-020)

### MODIFIED
- `src/shared/config/domain.ts` — 이탈 사유 재귀 트리 config·파생 헬퍼 추가 (additive only, 기존 상수·타입·export 무변경)
  - `RetireReasonNode`(readonly 재귀), `RETIRE_REASON_TREE`(as const satisfies), `RETIRE_REASON_LEAF_KEYS`(leaf 11개 as const 튜플, branch `jump` 제외), `RetireReason` 타입, `reasonPath`·`retireReasonRowLabel`(D-R3)·`resolveSpeedRelated`(AI 계약).
  - 트리↔튜플 양방향 컴파일 타임 정합 검사로 리터럴 유니온 보존(z.enum 입력 유효). key append-only 주석.

### EVIDENCE
- LEAF_KEYS = [corner, jump_overshoot, jump_attitude, jump_rebound, jump_other, down_step, wave, lane_change, parts, stall, other]. tsc 게이트에서 리터럴 유니온·정합 검증(후속).
