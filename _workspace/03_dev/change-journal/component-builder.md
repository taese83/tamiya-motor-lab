# change-journal — component-builder

> 기록 주체: 오케스트레이터 대필 — subagent 저널 Write가 hook 차단됨. R20은 subagent 반환이 잘려
> 검증된 실제 파일 상태(grep)로 재구성해 기록.

## 2026-07-31 R20

**작업**: 이탈 사유 재귀 드릴다운 UI (계약: retire-reason-chipset.md §입력 UX·표시, 승인된 목업)

CREATED:
- src/features/race-record/ui/RaceRetireReasonSelect.tsx — 제어형 재귀 드릴다운(`{value: RetireReason|null, onChange}`). 최상위 섹션 칩(속도형/기계형/기타 그룹 헤더) → 점프(branch) 탭 시 세부 칩(비거리 김·공중 자세·착지 후 튐·그 외)+breadcrumb+뒤로. 단일 선택, 재탭 해제, value 주입 시 branch 뷰 복원. 44px·aria-pressed·색 단독 구분 금지. RETIRE_REASON_TREE 소비.

MODIFIED:
- src/features/race-record/ui/RaceEntrySheet.tsx — RaceEntryDraft에 `retireReason: RetireReason | null` additive. result SegmentControl 아래 `draft.result === 'retired'` 조건부 FormField 블록에서 RaceRetireReasonSelect 렌더(onChange→onDraftChange({retireReason})).
- src/features/race-record/ui/RaceRecordRow.tsx — retireReasonRowLabel import. 이탈+retireReason 행에 사유 라벨 suffix(D-R3: 말단, '그 외'는 경로 병기). rowLabel(aria)에도 반영. 완주·미정 무영향.
- src/features/race-record/ui/index.ts — RaceRetireReasonSelect value/type export.

EVIDENCE:
- additive만 — 기존 공개 API·result/goal 배선·스타일 무변경. 게이트: typecheck·lint·test(RaceRetireReasonSelect.test·RaceRecordRow.test 포함 156 통과)·build PASS. 실입력 흐름은 로그인 게이트 뒤 DEPLOY_ONLY — 컴포넌트 계약은 render 테스트로 고정.
