// entities/run-record 공개 API (F6·F7·F8) — 명시적 named export만, export * 금지.
// model: zod 스키마 단일 정의(AD-7, write-strict/read-lenient 이원화 SC-A8) + 파생 view 타입 /
// api: command 2(create·delete — update 부재, immutable FP-A4/INV-05) + query 재료 + key·queryOptions factory.
export {
  createRecordDraftSchema,
  panoHzSchema,
  panoHzWriteSchema,
  parseRunRecordRow,
  runRecordSchema,
  runResultSchema,
  voltageSchema,
} from './model/schema'
export type {
  CreateRecordDraft,
  MotorRecordRollup,
  MotorSummaryMotorRef,
  MotorSummaryOf,
  RunRecord,
} from './model/types'
export {
  byCreatedAtDescIdAsc,
  createRecord,
  deleteRecord,
  listRecordsByMotor,
  listSatisfiedRecords,
} from './api/repository'
export {composeMotorSummaries, listMotorRecordRollups} from './api/summaries'
export {recordKeys} from './api/keys'
export {recordQueries} from './api/queries'
// ui: 표시 전용 기록 행 (component-spec §4.4) — S4 목록·S5 근거 공용, 순수 presentational.
export {RecordRow} from './ui/RecordRow'
export type {RecordRowProps, RecordRowView} from './ui/RecordRow'
