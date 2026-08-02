// features/race-record/ui 공개 표면 — 명시적 named export만, export * 금지.
// S5·S6 레이스 UI 4종 (component-spec v2 §6 — R-1~R-7). slice 루트 index.ts(배럴)는
// model/api와 함께 feature 빌더 소관 — 이 파일을 재수출하면 된다.
// feature 간 직접 import 금지 — race-measure-handoff 접속([측정] 왕복)은 page가
// RaceEntrySheet.onMeasure 콜백으로 조립한다(§7).
export {RaceMotorList} from './RaceMotorList'
export type {RaceMotorListProps} from './RaceMotorList'
export {RaceRecordRow} from './RaceRecordRow'
export type {RaceRecordRowProps} from './RaceRecordRow'
export {RaceEntrySheet} from './RaceEntrySheet'
export type {
  RaceEntryDraft,
  RaceEntryField,
  RaceEntryFieldErrors,
  RaceEntryPano,
  RaceEntrySheetProps,
} from './RaceEntrySheet'
export {ResetRecordsBlock} from './ResetRecordsBlock'
export type {ResetRecordsBlockProps} from './ResetRecordsBlock'
// v2.31 — 목표 선택 팝업(2번째+ 입력 진입점)
export {RaceGoalSheet} from './RaceGoalSheet'
export type {RaceGoalSheetProps} from './RaceGoalSheet'
// R20 — 이탈 사유 재귀 드릴다운 칩셋(retire-reason-chipset D-R5, RaceEntrySheet 내부 소비 +
// 테스트 공개 표면)
export {RaceRetireReasonSelect} from './RaceRetireReasonSelect'
export type {RaceRetireReasonSelectProps} from './RaceRetireReasonSelect'
// R22 — 레이스 인사이트 요약 카드 + [보는 법] 다이얼로그(순수 제어형, insight는 페이지가
// computeRaceInsight로 주입 — 배선은 RaceDetailPage 소유)
export {RaceInsightCard} from './RaceInsightCard'
export type {RaceInsightCardProps} from './RaceInsightCard'
export {RaceInsightHelpDialog} from './RaceInsightHelpDialog'
export type {RaceInsightHelpDialogProps} from './RaceInsightHelpDialog'
// R25 U5 — AI 분석 응답 카드(제어형 순수 렌더). view 사상·펼침 상태·재시도 배선은
// RaceDetailPage + useRaceAnalysis 소유. RaceAnalysisView가 훅→카드 사이 공개 계약.
export {RACE_ANALYSIS_MESSAGES, RaceAnalysisCard} from './RaceAnalysisCard'
export type {RaceAnalysisCardProps, RaceAnalysisView} from './RaceAnalysisCard'
// R30 U4 — 주행 전 체크리스트(표시 전용·ephemeral). onChange 콜백이 타입에 없음 —
// 체크 상태의 draft·스키마 유출을 계약으로 차단(DL-038). 데이터(PrerunChecklistGroup)는
// @entities/race-record 소유 — 여기서 재수출하지 않는다.
export {RacePrerunChecklist} from './RacePrerunChecklist'
export type {RacePrerunChecklistProps} from './RacePrerunChecklist'
