// entities/race-record 공개 API (v2 신설 — F6-R) — 명시적 named export만, export * 금지.
// v2.3(INV-05 완화): 생성·수정·개별 삭제. 수정은 result·voltage·lapTimeMs만.
export {
  createRaceRecordDraftSchema,
  lapTimeMsSchema,
  parseRaceRecordRow,
  raceRecordSchema,
  raceResultSchema,
  updateRaceRecordPatchSchema,
  voltageSchema,
} from './model/schema'
export type {CreateRaceRecordDraft, RaceRecord, UpdateRaceRecordPatch} from './model/types'
// R22 — 레이스 인사이트 파생(순수 selector, DL-013·DL-014)
export {computeRaceInsight, RECENT_FALLBACK, selectAdviceWindow} from './model/race-insight'
export type {RaceInsight, TrendDir} from './model/race-insight'
export {
  createRaceRecord,
  deleteRaceRecord,
  listRaceRecordsByMotor,
  updateRaceRecord,
} from './api/repository'
export {raceKeys} from './api/keys'
export {raceQueries} from './api/queries'
