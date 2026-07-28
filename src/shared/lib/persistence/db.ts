import {openDB} from 'idb'

import {DOMAIN_ERROR_MESSAGES, DomainError} from '@shared/lib/errors'

import {DB_NAME, DB_VERSION, META_KEY, SCHEMA_VERSION} from './schema'

import type {MotorLabDB} from './schema'
import type {IDBPDatabase} from 'idb'

// ── 연결 캐시 (모듈 단일 상태) — initPersistence 성공 시에만 채워진다.
let connection: IDBPDatabase<MotorLabDB> | null = null

export const getDb = (): IDBPDatabase<MotorLabDB> | null => connection

/**
 * persistence 게이트 — ready가 아니면 DomainError('storage-unavailable') throw.
 * query(throw 채널)는 이 함수를 직접 쓰고, command(Result 채널)는 withTransaction이 err로 감싼다.
 */
export function requireDb(): IDBPDatabase<MotorLabDB> {
  if (connection === null) {
    throw new DomainError('storage-unavailable', DOMAIN_ERROR_MESSAGES['storage-unavailable'])
  }
  return connection
}

/** 내부 전용 (barrel 미노출) — initPersistence 성공 시에만 호출 */
export function setConnection(db: IDBPDatabase<MotorLabDB>): void {
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

export type OpenOutcome =
  | {kind: 'opened'; db: IDBPDatabase<MotorLabDB>; migrated: boolean}
  | {kind: 'unavailable'; reason: 'no-indexeddb' | 'open-failed'}
  | {kind: 'corrupted'}

const isNamedError = (e: unknown, name: string): boolean =>
  typeof e === 'object' && e !== null && 'name' in e && e.name === name

/**
 * v-migration (state-contract §migration): switch(oldVersion) fallthrough(case 0 → case 1 → …)로
 * 순차 적용. upgrade 콜백 전체가 단일 versionchange 트랜잭션 — 실패 시 스펙상 전량 abort되어
 * 구버전이 그대로 남고 initPersistence가 corrupted를 반환한다(반쯤 migrate된 상태 불가).
 * 향후 버전은 additive-first: optional 필드 + read 시 zod .default(), rewrite는 upgrade tx 내 cursor.
 */
function runUpgrade(db: IDBPDatabase<MotorLabDB>, oldVersion: number): void {
  switch (oldVersion) {
    case 0: {
      db.createObjectStore('motors', {keyPath: 'id'})
      const records = db.createObjectStore('records', {keyPath: 'id'})
      records.createIndex('by-motorId', 'motorId')
      records.createIndex('by-createdAt', 'createdAt')
      const meta = db.createObjectStore('meta')
      void meta.put({schemaVersion: SCHEMA_VERSION}, META_KEY)
    }
    // 향후 case 1(v1→v2): break 없이 fallthrough로 순차 적용
  }
}

/**
 * openDB + 실패 분류 — throw하지 않고 항상 OpenOutcome을 반환한다.
 * - API 부재 → unavailable('no-indexeddb') / open 불가(SecurityError 등) → unavailable('open-failed')
 * - upgrade 콜백 실패(versionchange abort → AbortError) · VersionError(downgrade) → corrupted
 *   (자동 reset 금지 — 복구 UI가 "새로고침" 우선 안내, state-contract §migration downgrade)
 */
export async function openMotorLabDb(): Promise<OpenOutcome> {
  if (typeof indexedDB === 'undefined') return {kind: 'unavailable', reason: 'no-indexeddb'}

  let migrated = false
  let upgradeFailed = false
  try {
    const db = await openDB<MotorLabDB>(DB_NAME, DB_VERSION, {
      upgrade(upgradeDb, oldVersion) {
        try {
          runUpgrade(upgradeDb, oldVersion)
          migrated = oldVersion > 0
        } catch (e) {
          // idb는 upgrade 내 예외를 AbortError로 바꿔 reject한다 — 원인 구분을 위해 flag 유지
          upgradeFailed = true
          throw e
        }
      },
      terminated: clearConnection,
    })
    return {kind: 'opened', db, migrated}
  } catch (e) {
    if (upgradeFailed || isNamedError(e, 'VersionError') || isNamedError(e, 'AbortError')) {
      return {kind: 'corrupted'}
    }
    return {kind: 'unavailable', reason: 'open-failed'}
  }
}
