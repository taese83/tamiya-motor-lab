# change-journal: test-writer

## 2026-07-31 R15

- MODIFIED: `src/features/measure-session/ui/StabilityGauge.test.tsx` — StabilityGauge 캡션 문구 변경('변동률'→'안정도')에 테스트 단언 동기화. L64 테스트 이름 `비측정이면 변동률`→`비측정이면 안정도`, L68 `.toContain('변동률')`→`.toContain('안정도')`. L67 `측정 중` 단언은 새 문구('안정도 측정 중…')에도 매치되어 유지. L8 주석의 '변동률' 용어는 사용자 노출 문구가 아니므로 변경하지 않음.
- EVIDENCE: 테스트 실행은 게이트(test-executor/오케스트레이터) 담당 — 본 라운드에서 실행하지 않음. 대상 단언: `StabilityGauge.test.tsx` `캡션: 측정+CV면 등급·%·±rpm, cv 없으면 측정 중, 비측정이면 안정도`.

## 2026-07-31 R20

- MODIFIED: src/shared/config/domain.test.ts — 이탈 사유 파생 append: LEAF_KEYS 11개·branch 미포함, reasonPath, retireReasonRowLabel, resolveSpeedRelated 상속.
- CREATED: src/entities/race-record/model/schema.test.ts — retireReasonSchema·create·update·rehydrate 경계(read-lenient, branch 거부, finished+사유 스키마 비강제).
- CREATED: src/features/race-record/ui/RaceRetireReasonSelect.test.tsx — 드릴다운 7건(최상위·branch 전환·세부 onChange·top-level·뒤로·value 복원·재탭 해제).
- CREATED: src/features/race-record/ui/RaceRecordRow.test.tsx — 사유 suffix 표시 5건(이탈+사유·병기 없음·미표시 가드).
- EVIDENCE: 게이트에서 156 통과(신규 +33). 프로덕션 무수정.

## 2026-07-31 R22
- CREATED: race-insight.test.ts(computeRaceInsight F1~F7 + 완주0 보강 + trend 방향 5% 경계 + selectAdviceWindow 인라인 동치 회귀), RaceInsightCard.test.tsx(3분기·[보는 법]·완주0·침묵), RaceInsightHelpDialog.test.tsx(접근명·세 요소·D2 분리·닫기).
- EVIDENCE: 게이트 183 통과. (HelpDialog 테스트 1건 getByText→getAllByText 보정은 오케스트레이터 직접 수정 — claude.md 참조.)

## 2026-08-02 R30
- CREATED 4: race-goal-recommend.test.ts(15) — R1~R5 전 분기·침묵·**미정 최신 혼재 시 확정 첫 회차 판독**(plan-review 지적)·결정론 / race-prerun-checklist.test.ts(10) — 매핑·빈도 desc·동률 최신·상위 2·상한 3 절삭·0건 3형·윈도우(5건 밖 미반영·미정 슬롯 미소모) / RacePrerunChecklist.test.tsx(6) — []→DOM 부재·카피·checkbox 접근명·토글·재마운트 초기화 / RaceGoalSheet.test.tsx(7) — 미전달 침묵·추천 병기·자동 선택 없음·lastGoal 공존.
- 문구는 domain.ts·컴포넌트 원문 대조(추측 없음). 생략: AF-007·008은 기존 스위트 소관, 11 leaf 완전성은 Record 타입 컴파일 보장.
- EVIDENCE: 게이트 test 254 PASS(신규 38).
