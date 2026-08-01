// race-record api segment public API (feature-mutation-builder 소유) —
// mutation 훅 + 응답/변수 타입만 export. v2.3: update 훅 추가(result·voltage·lapTimeMs 편집).
// 입력/응답 타입(CreateRaceRecordDraft·RaceRecord·UpdateRaceRecordPatch)은 @entities/race-record 공개 API를 그대로 사용한다.
export {
  useCreateRaceRecord,
  useDeleteRaceRecord,
  useResetMotorRaceRecords,
  useUpdateRaceRecord,
} from './mutations'
export type {ResetRaceRecordsResult, UpdateRaceRecordVariables} from './mutations'
// v2.31 — 하이브리드 전압 추천(서버리스 LLM + 휴리스틱 폴백)
export {recommendVoltage} from './recommend-voltage'
// R25 U1 — 레이스 AI 분석 어댑터(계약 원본). ⚠️ recommendVoltage와 달리 폴백 생성 금지(REQ-RAI-005)
export {analyzeRace, raceAnalysisSchema} from './analyze-race'
export type {
  AnalysisEvidence,
  AnalyzeRaceItem,
  AnalyzeRacePayload,
  AnalyzeRaceResult,
  AnalyzeUnavailableReason,
  RaceAnalysis,
  RaceAnalysisOk,
} from './analyze-race'
// R25 U2 — payload 직렬화기(화이트리스트 field-pick 조립 — data-governance §2, spread 금지)
export {buildAnalyzeRacePayload} from './analyze-race-payload'
