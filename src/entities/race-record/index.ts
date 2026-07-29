// entities/race-record 공개 API (v2 신설 — F6-R) — 명시적 named export만, export * 금지.
// immutable — 생성·개별 삭제(RV-A3)만, update 없음(INV-05).
export {
  createRaceRecordDraftSchema,
  lapTimeMsSchema,
  parseRaceRecordRow,
  raceRecordSchema,
  raceResultSchema,
  voltageSchema,
} from './model/schema'
export type {CreateRaceRecordDraft, RaceRecord} from './model/types'
export {createRaceRecord, deleteRaceRecord, listRaceRecordsByMotor} from './api/repository'
export {raceKeys} from './api/keys'
export {raceQueries} from './api/queries'
