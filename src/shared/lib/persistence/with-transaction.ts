import {DOMAIN_ERROR_MESSAGES, DomainError} from '@shared/lib/errors'
import {err, ok} from '@shared/lib/result'

import {getDb} from './db'
import {mapStorageError} from './map-storage-error'

import type {DomainStoreName, MmlDB} from './schema'
import type {Result} from '@shared/lib/result'
import type {IDBPTransaction} from 'idb'

export type TransactionMode = 'readonly' | 'readwrite'

/**
 * 다중 store 원자성의 유일한 진입점 (state-contract v2 §트랜잭션 원자성 —
 * deleteMotorCascade·reorderMotors·collectMeasureRecord·createRaceRecord·resetAllRecords가 사용).
 *
 * 계약 (state-contract §다중 store 트랜잭션 원자성 1~4):
 * 1. 단일 IDBTransaction — fn 내부의 모든 read/write는 전달된 tx 파생 request만 사용한다.
 * 2. auto-commit 방어 — tx를 열기 전에 모든 비-IDB async 작업(id 생성·zod 검증·시각 생성)을 끝낼 것.
 *    fn 내부에서 IDB request 외의 promise를 await하면 마이크로태스크 경계에서 tx가 자동 commit된다.
 * 3. 실패 = 무변경 — fn throw/reject 또는 개별 request 오류 ⇒ tx.abort() ⇒ 해당 tx의 모든 변경
 *    폐기(rollback은 IDB 엔진 보장). commit 확인(tx.done resolve) 후에만 ok를 반환한다.
 *    query 캐시 invalidation은 호출 command가 ok 수신 후에만 수행 — abort 시 캐시도 불변.
 * 4. 직렬화 — 같은 store가 겹치는 readwrite tx는 IDB가 cross-tab 포함 직렬화한다.
 *    FK 확인·rolling count·permutation 검증을 mutation과 같은 tx에서 수행하므로
 *    어떤 교차 실행에서도 INV-03·INV-19·INV-20이 성립한다.
 *
 * 오류 매핑: fn이 던진 DomainError(예: createRecord의 FK not-found 판정)는 그대로 보존하고,
 * QuotaExceededError → 'quota-exceeded', 그 외 → 'transaction-failed'로 수렴한다.
 * meta store는 타입에서 제외 — meta 쓰기는 persistence(upgrade·reset) 전용이다(INV-11 보호).
 */
export async function withTransaction<Name extends DomainStoreName, Mode extends TransactionMode, T>(
  storeNames: readonly Name[],
  mode: Mode,
  fn: (tx: IDBPTransaction<MmlDB, Name[], Mode>) => Promise<T> | T,
): Promise<Result<T>> {
  const db = getDb()
  if (db === null) {
    return err(new DomainError('storage-unavailable', DOMAIN_ERROR_MESSAGES['storage-unavailable']))
  }

  let tx: IDBPTransaction<MmlDB, Name[], Mode>
  try {
    tx = db.transaction([...storeNames], mode)
  } catch (e) {
    return err(mapStorageError(e))
  }

  try {
    const value = await fn(tx)
    await tx.done // commit 확인 — quota 등 commit 시점 실패를 여기서 포착한다
    return ok(value)
  } catch (e) {
    try {
      tx.abort()
    } catch {
      // 이미 abort/commit된 tx — 무시
    }
    try {
      await tx.done
    } catch {
      // abort로 인한 done rejection — 예상된 경로
    }
    return err(mapStorageError(e))
  }
}
