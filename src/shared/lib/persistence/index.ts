// persistence v2 공개 표면 — DB open/init/reset · 트랜잭션 helper · Storage Schema v2 · corrupted 판정 기반.
// 엔티티별 command(createMotor 등)는 entities/*/api 소관 — 이 레이어에서 만들지 않는다.
// 내부 연결 조작(setConnection·closeConnection·openMmlDb)은 의도적으로 미노출.
export {
  DB_NAME,
  DB_VERSION,
  META_KEY,
  RECORDS_BY_MOTOR_INDEX,
  SCHEMA_VERSION,
  dbMetaSchema,
} from './schema'
export type {
  DbMeta,
  DomainStoreName,
  MmlDB,
  PersistedRow,
  PersistenceStatus,
  StoreName,
} from './schema'
export {getDb, requireDb} from './db'
export {getPersistenceStatus, initPersistence} from './init'
export type {InitPersistenceOptions, PersistenceScanValidation, RowValidator} from './init'
export {mapStorageError} from './map-storage-error'
export {withTransaction} from './with-transaction'
export type {TransactionMode} from './with-transaction'
export {resetAllData, resetAllRecords, resetRaceRecordsByMotor} from './reset'
// v2.40 Phase B — 서버 동기화용 로컬 스냅샷 read/replace
export {readDomainSnapshot, replaceDomainSnapshot} from './domain-snapshot'
export type {DomainSnapshot} from './domain-snapshot'
