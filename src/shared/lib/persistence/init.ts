import {closeConnection, getDb, openMotorLabDb, setConnection} from './db'
import {dbMetaSchema, META_KEY, SCHEMA_VERSION} from './schema'

import type {MotorLabDB, PersistenceStatus} from './schema'
import type {IDBPDatabase} from 'idb'

/** zod 스키마가 구조적으로 만족하는 최소 검증 표면 — persistence는 zod 타입 자체에 결합하지 않는다 */
export interface RowValidator {
  safeParse(input: unknown): {success: boolean}
}

/**
 * 부팅 full-scan의 의미 검증기 주입점 (SC-A9 · AD-7).
 * 엔티티 zod 스키마의 단일 정의는 entities 각 model 소유이고 FSD 상 shared → entities import가
 * 불가하므로, app 부트스트랩이 rehydrate(read-lenient, SC-A8) 스키마를 여기로 주입한다.
 * 주입 전에도 meta(INV-11)·행 구조·FK 무결성(INV-03)은 persistence가 자체 검사한다.
 */
export interface PersistenceScanValidation {
  /** motors 행 검증 — entities/motor/model rehydrate 스키마 */
  motor: RowValidator
  /** records 행 검증 — entities/run-record/model rehydrate 스키마 */
  record: RowValidator
}

export interface InitPersistenceOptions {
  validation?: PersistenceScanValidation
}

let lastStatus: PersistenceStatus | null = null
let inFlight: Promise<PersistenceStatus> | null = null
let storedValidation: PersistenceScanValidation | null = null

/** 마지막 initPersistence 결과 (부팅 전이면 null) — app 부트스트랩 분기 참고용 */
export const getPersistenceStatus = (): PersistenceStatus | null => lastStatus

/** 내부 전용 (barrel 미노출) — resetAllData가 재초기화 전에 상태를 리셋한다 */
export function resetInitState(): void {
  lastStatus = null
}

/** 테스트 전용 (barrel 미노출) — setup이 테스트마다 indexedDB 전역을 교체하므로 모듈 상태도 함께 리셋 */
export function resetPersistenceStateForTesting(): void {
  closeConnection()
  lastStatus = null
  inFlight = null
  storedValidation = null
}

/**
 * 부팅 진입점 (F4 — REQ-F-007). throw 없음 — 실패도 항상 상태값으로 수렴한다(crash loop 금지).
 * 멱등: ready면 캐시된 연결·상태를 반환한다. unavailable/corrupted는 캐시하지 않는다 —
 * 복구 UI [다시 시도]가 재호출로 재실행하는 경로(자동 재시도는 호출 측에서 최대 1회).
 * 동시 호출은 단일 in-flight promise를 공유한다.
 * options.validation은 최초 주입 후 모듈에 유지된다 — resetAllData의 재초기화가 같은 검증을 재사용.
 */
export function initPersistence(options?: InitPersistenceOptions): Promise<PersistenceStatus> {
  if (options?.validation) storedValidation = options.validation
  if (lastStatus?.status === 'ready' && getDb() !== null) return Promise.resolve(lastStatus)
  if (inFlight) return inFlight
  inFlight = doInit(storedValidation).finally(() => {
    inFlight = null
  })
  return inFlight
}

async function doInit(validation: PersistenceScanValidation | null): Promise<PersistenceStatus> {
  const outcome = await openMotorLabDb()
  if (outcome.kind === 'unavailable') {
    return remember({status: 'unavailable', reason: outcome.reason})
  }
  if (outcome.kind === 'corrupted') return remember({status: 'corrupted'})

  const valid = await verifyDatabase(outcome.db, validation)
  if (!valid) {
    outcome.db.close()
    return remember({status: 'corrupted'})
  }

  setConnection(outcome.db)
  return remember({status: 'ready', detail: outcome.migrated ? 'migrated' : 'ok'})
}

function remember(status: PersistenceStatus): PersistenceStatus {
  lastStatus = status
  return status
}

const isRowObject = (row: unknown): row is Record<string, unknown> =>
  typeof row === 'object' && row !== null

/**
 * 부팅 full-scan 검증 (SC-A9 채택 — 예산 <500 ms @max fixture 모터 30·기록 1,000, 1회성).
 * corrupted 판정 조건(state-contract §invalid-state recovery):
 * meta 부재/불일치·2행 이상(INV-11) · 행 구조 파손 · 주입 스키마 parse 실패(INV-16) ·
 * dangling reference(INV-03) · scan 자체 실패. 판정 단위는 DB 전체(SC-A6 — row quarantine 없음).
 */
async function verifyDatabase(
  db: IDBPDatabase<MotorLabDB>,
  validation: PersistenceScanValidation | null,
): Promise<boolean> {
  try {
    const tx = db.transaction(['motors', 'records', 'meta'], 'readonly')
    // 조기 return 경로에서 tx.done rejection이 unhandled로 남지 않게 소비한다
    void tx.done.catch(() => undefined)

    // INV-11: meta 정확히 1행 + schemaVersion === SCHEMA_VERSION
    const metaStore = tx.objectStore('meta')
    if ((await metaStore.count()) !== 1) return false
    const parsedMeta = dbMetaSchema.safeParse(await metaStore.get(META_KEY))
    if (!parsedMeta.success || parsedMeta.data.schemaVersion !== SCHEMA_VERSION) return false

    // motors: 구조 검사 + 주입 스키마 검증. key(=keyPath id)를 FK 대조용으로 수집
    const motorIds = new Set<string>(await tx.objectStore('motors').getAllKeys())
    for (const row of await tx.objectStore('motors').getAll()) {
      if (!isRowObject(row)) return false
      if (validation && !validation.motor.safeParse(row).success) return false
    }

    // records: 구조 검사 + INV-03(dangling reference 0건) + 주입 스키마 검증
    for (const row of await tx.objectStore('records').getAll()) {
      if (!isRowObject(row)) return false
      const motorId = row['motorId']
      if (typeof motorId !== 'string' || !motorIds.has(motorId)) return false
      if (validation && !validation.record.safeParse(row).success) return false
    }

    await tx.done
    return true
  } catch {
    // 읽기 요청 실패·tx 오류 등 scan 자체 실패 → corrupted (state-contract: "scan 실패 → corrupted")
    return false
  }
}
