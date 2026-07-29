import {MEASURE_RECORD_LIMIT} from '@shared/config/domain'

import {closeConnection, getDb, openMmlDb, setConnection} from './db'
import {dbMetaSchema, META_KEY, SCHEMA_VERSION} from './schema'

import type {MmlDB, PersistenceStatus} from './schema'
import type {IDBPDatabase} from 'idb'

/** zod 스키마가 구조적으로 만족하는 최소 검증 표면 — persistence는 zod 타입 자체에 결합하지 않는다 */
export interface RowValidator {
  safeParse(input: unknown): {success: boolean}
}

/**
 * 부팅 full-scan의 의미 검증기 주입점 (SC-A9 · AD-7).
 * 엔티티 zod 스키마의 단일 정의는 entities 각 model 소유이고 FSD 상 shared → entities import가
 * 불가하므로, app 부트스트랩이 rehydrate(read-lenient, SC-A8) 스키마를 여기로 주입한다.
 * 주입 전에도 meta(INV-11)·행 구조·FK 무결성(INV-03)·sortOrder 연속성(INV-19)·
 * rolling 상한(INV-20)은 persistence가 자체 검사한다.
 */
export interface PersistenceScanValidation {
  /** motors 행 검증 — entities/motor/model rehydrate 스키마 */
  motor: RowValidator
  /** measureRecords 행 검증 — entities/measure-record/model rehydrate 스키마 */
  measureRecord: RowValidator
  /** raceRecords 행 검증 — entities/race-record/model rehydrate 스키마 */
  raceRecord: RowValidator
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
 * 부팅 진입점 (RV-3 반영 v2). throw 없음 — 실패도 항상 상태값으로 수렴한다(crash loop 금지).
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
  // mml-db native v2 open — 구버전(oldVersion<2)은 upgrade에서 store drop 후 재생성(recreated)
  const outcome = await openMmlDb()
  if (outcome.kind === 'unavailable') {
    return remember({status: 'unavailable', reason: outcome.reason})
  }
  if (outcome.kind === 'corrupted') return remember({status: 'corrupted'})

  // ③ meta 검증(INV-11) + ④ 전 행 full-scan (zod·INV-03·INV-19·INV-20)
  const valid = await verifyDatabase(outcome.db, validation)
  if (!valid) {
    outcome.db.close()
    return remember({status: 'corrupted'})
  }

  setConnection(outcome.db)
  return remember({status: 'ready', detail: outcome.recreated ? 'recreated' : 'ok'})
}

function remember(status: PersistenceStatus): PersistenceStatus {
  lastStatus = status
  return status
}

const isRowObject = (row: unknown): row is Record<string, unknown> =>
  typeof row === 'object' && row !== null

/**
 * motors sortOrder 연속성 검사 (INV-19): 집합 = {0, 1, …, n−1} — 중복 0건·gap 0건.
 * 정수가 아니거나 범위 밖·중복이면 위반. 주입 스키마와 별개로 persistence가 자체 검사한다.
 */
function hasContiguousSortOrder(rows: readonly Record<string, unknown>[]): boolean {
  const seen = new Set<number>()
  for (const row of rows) {
    const sortOrder = row['sortOrder']
    if (typeof sortOrder !== 'number' || !Number.isInteger(sortOrder)) return false
    if (sortOrder < 0 || sortOrder >= rows.length || seen.has(sortOrder)) return false
    seen.add(sortOrder)
  }
  return seen.size === rows.length
}

/**
 * 부팅 full-scan 검증 (SC-A9 승계 — 예산 <500 ms @max fixture 모터 30·측정 300·레이스 1,000, 1회성).
 * corrupted 판정 조건(state-contract v2 §invalid-state recovery):
 * meta 부재/불일치·2행 이상(INV-11) · 행 구조 파손 · 주입 스키마 parse 실패(INV-16) ·
 * dangling reference — 두 record store(INV-03) · sortOrder 중복/gap(INV-19) ·
 * 모터당 MeasureRecord >10건(INV-20) · scan 자체 실패. 판정 단위는 DB 전체(SC-A6 — row quarantine 없음).
 */
async function verifyDatabase(
  db: IDBPDatabase<MmlDB>,
  validation: PersistenceScanValidation | null,
): Promise<boolean> {
  try {
    const tx = db.transaction(['motors', 'measureRecords', 'raceRecords', 'meta'], 'readonly')
    // 조기 return 경로에서 tx.done rejection이 unhandled로 남지 않게 소비한다
    void tx.done.catch(() => undefined)

    // INV-11: meta 정확히 1행 + schemaVersion === SCHEMA_VERSION(2)
    const metaStore = tx.objectStore('meta')
    if ((await metaStore.count()) !== 1) return false
    const parsedMeta = dbMetaSchema.safeParse(await metaStore.get(META_KEY))
    if (!parsedMeta.success || parsedMeta.data.schemaVersion !== SCHEMA_VERSION) return false

    // motors: 구조 검사 + 주입 스키마 검증 + INV-19. key(=keyPath id)를 FK 대조용으로 수집
    const motorIds = new Set<string>(await tx.objectStore('motors').getAllKeys())
    const motorRows: Record<string, unknown>[] = []
    for (const row of await tx.objectStore('motors').getAll()) {
      if (!isRowObject(row)) return false
      if (validation && !validation.motor.safeParse(row).success) return false
      motorRows.push(row)
    }
    if (!hasContiguousSortOrder(motorRows)) return false

    // measureRecords: 구조 + INV-03(dangling 0건) + 주입 스키마 + INV-20(모터당 ≤10건)
    const measureCountByMotor = new Map<string, number>()
    for (const row of await tx.objectStore('measureRecords').getAll()) {
      if (!isRowObject(row)) return false
      const motorId = row['motorId']
      if (typeof motorId !== 'string' || !motorIds.has(motorId)) return false
      if (validation && !validation.measureRecord.safeParse(row).success) return false
      const count = (measureCountByMotor.get(motorId) ?? 0) + 1
      if (count > MEASURE_RECORD_LIMIT) return false
      measureCountByMotor.set(motorId, count)
    }

    // raceRecords: 구조 + INV-03 + 주입 스키마 (count 상한 없음 — SC-A7′)
    for (const row of await tx.objectStore('raceRecords').getAll()) {
      if (!isRowObject(row)) return false
      const motorId = row['motorId']
      if (typeof motorId !== 'string' || !motorIds.has(motorId)) return false
      if (validation && !validation.raceRecord.safeParse(row).success) return false
    }

    await tx.done
    return true
  } catch {
    // 읽기 요청 실패·tx 오류 등 scan 자체 실패 → corrupted (state-contract: "scan 실패 → corrupted")
    return false
  }
}
