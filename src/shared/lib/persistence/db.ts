import {deleteDB, openDB} from 'idb'

import {DOMAIN_ERROR_MESSAGES, DomainError} from '@shared/lib/errors'

import {DB_NAME, DB_VERSION, LEGACY_DB_NAME, META_KEY, SCHEMA_VERSION} from './schema'

import type {MmlDB} from './schema'
import type {IDBPDatabase} from 'idb'

// ── 연결 캐시 (모듈 단일 상태) — initPersistence 성공 시에만 채워진다.
let connection: IDBPDatabase<MmlDB> | null = null

export const getDb = (): IDBPDatabase<MmlDB> | null => connection

/**
 * persistence 게이트 — ready가 아니면 DomainError('storage-unavailable') throw.
 * query(throw 채널)는 이 함수를 직접 쓰고, command(Result 채널)는 withTransaction이 err로 감싼다.
 */
export function requireDb(): IDBPDatabase<MmlDB> {
  if (connection === null) {
    throw new DomainError('storage-unavailable', DOMAIN_ERROR_MESSAGES['storage-unavailable'])
  }
  return connection
}

/** 내부 전용 (barrel 미노출) — initPersistence 성공 시에만 호출 */
export function setConnection(db: IDBPDatabase<MmlDB>): void {
  connection = db
}

/** 내부 전용 — 브라우저 강제 종료(terminated) 시 캐시 해제 → 다음 command는 unavailable 실패 후 재시도 */
export function clearConnection(): void {
  connection = null
}

/** 내부 전용 — 열린 연결을 닫고 캐시 해제. deleteDatabase가 같은 탭 연결에 blocked되지 않게 (reset 경로) */
export function closeConnection(): void {
  try {
    connection?.close()
  } catch {
    // 이미 종료된 연결 — 무시
  }
  connection = null
}

/**
 * 레거시 v1 DB(`minicar-motor-lab`) 삭제 — best-effort·비차단 (RV-3 · SC2-A5).
 * await하지 않는다: 다른 탭이 레거시 DB를 열고 있으면 deleteDatabase가 blocked로 무한 대기해
 * 부팅을 멈출 수 있다. 실패해도 비치명(v2 `mml-db` 동작과 무관) — 다음 부팅에서 재시도된다.
 */
export function deleteLegacyDatabase(): void {
  if (typeof indexedDB === 'undefined') return
  try {
    void deleteDB(LEGACY_DB_NAME).catch(() => undefined)
  } catch {
    // 삭제 실패 비치명 — 무시 (SC2-A5)
  }
}

export type OpenOutcome =
  | {kind: 'opened'; db: IDBPDatabase<MmlDB>; recreated: boolean}
  | {kind: 'unavailable'; reason: 'no-indexeddb' | 'open-failed'}
  | {kind: 'corrupted'}

const isNamedError = (e: unknown, name: string): boolean =>
  typeof e === 'object' && e !== null && 'name' in e && e.name === name

/**
 * upgrade v2 (RV-3 — migration 없음):
 * - oldVersion === 0: v2 store 4개 신설 + meta.put({schemaVersion: 2}).
 * - 0 < oldVersion < 2: 기존 object store 전부 drop 후 v2 신설 — 데이터 이관 코드 0줄.
 *   구버전 데이터는 corrupt가 아니라 폐기 대상(사용자 초기화 확정) → ready(recreated).
 * upgrade 콜백 전체가 단일 versionchange 트랜잭션 — 실패 시 스펙상 전량 abort되어
 * 구버전이 그대로 남고 initPersistence가 corrupted를 반환한다(반쯤 재생성된 상태 불가).
 * v1의 fallthrough migration·additive-first 경로는 삭제 — 향후 v3부터 additive-first 재도입.
 */
function runUpgrade(db: IDBPDatabase<MmlDB>, oldVersion: number): void {
  if (oldVersion > 0) {
    // 스냅샷 후 삭제 — live DOMStringList를 순회하며 삭제하면 항목을 건너뛴다
    for (const name of Array.from(db.objectStoreNames)) {
      db.deleteObjectStore(name)
    }
  }
  db.createObjectStore('motors', {keyPath: 'id'})
  const measureRecords = db.createObjectStore('measureRecords', {keyPath: 'id'})
  measureRecords.createIndex('by-motorId', 'motorId')
  const raceRecords = db.createObjectStore('raceRecords', {keyPath: 'id'})
  raceRecords.createIndex('by-motorId', 'motorId')
  const meta = db.createObjectStore('meta')
  void meta.put({schemaVersion: SCHEMA_VERSION}, META_KEY)
}

/**
 * openDB + 실패 분류 — throw하지 않고 항상 OpenOutcome을 반환한다.
 * - API 부재 → unavailable('no-indexeddb') / open 불가(SecurityError 등) → unavailable('open-failed')
 * - upgrade 콜백 실패(versionchange abort → AbortError) · VersionError(downgrade) → corrupted
 *   (자동 reset 금지 — 복구 UI가 "새로고침" 우선 안내, state-contract §migration downgrade)
 * - recreated: 구버전(0 < oldVersion < 2) 감지 → 폐기 후 재생성됨 (RV-3 — corrupt 아님)
 */
export async function openMmlDb(): Promise<OpenOutcome> {
  if (typeof indexedDB === 'undefined') return {kind: 'unavailable', reason: 'no-indexeddb'}

  let recreated = false
  let upgradeFailed = false
  try {
    const db = await openDB<MmlDB>(DB_NAME, DB_VERSION, {
      upgrade(upgradeDb, oldVersion) {
        try {
          runUpgrade(upgradeDb, oldVersion)
          recreated = oldVersion > 0
        } catch (e) {
          // idb는 upgrade 내 예외를 AbortError로 바꿔 reject한다 — 원인 구분을 위해 flag 유지
          upgradeFailed = true
          throw e
        }
      },
      terminated: clearConnection,
    })
    return {kind: 'opened', db, recreated}
  } catch (e) {
    if (upgradeFailed || isNamedError(e, 'VersionError') || isNamedError(e, 'AbortError')) {
      return {kind: 'corrupted'}
    }
    return {kind: 'unavailable', reason: 'open-failed'}
  }
}
