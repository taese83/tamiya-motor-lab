import {deleteDB} from 'idb'

import {DOMAIN_ERROR_MESSAGES, DomainError} from '@shared/lib/errors'
import {err, ok} from '@shared/lib/result'

import {closeConnection} from './db'
import {initPersistence, resetInitState} from './init'
import {mapStorageError} from './map-storage-error'
import {DB_NAME} from './schema'
import {withTransaction} from './with-transaction'

import type {Result} from '@shared/lib/result'

/**
 * corrupted 복구의 유일 경로 (C-6 — 복구 UI에서만 진입, confirm은 호출 feature 책임.
 * 레이스 [초기화]가 아님 — 그쪽은 resetAllRecords).
 *
 * deleteDatabase(스펙상 원자적) → initPersistence 재실행으로 v2 빈 스키마 재생성.
 * postcondition: motors=0 · measureRecords=0 · raceRecords=0 · meta.schemaVersion=2 ·
 * PersistenceStatus=ready. 성공 후 전체 query 캐시 clear(queryClient.clear())는 호출 측(app/feature) 책임이다.
 * 실패 시 throw하지 않는다 — 복구 UI 유지 + 오류 표시 + 수동 재시도(crash loop 금지, C-9).
 *
 * 동시 탭 참고: 다른 탭이 DB를 열고 있으면 deleteDatabase는 그 연결이 닫힐 때까지 대기한다(blocked).
 * 탭 간 강제 종료 브리지는 도입하지 않는다 — 단일 사용자 개인 도구, 동시 탭은 비정상 사용(LWW).
 */
export async function resetAllData(): Promise<Result<void>> {
  try {
    closeConnection() // 같은 탭의 열린 연결이 deleteDatabase를 blocked로 만들지 않게 먼저 닫는다
    resetInitState()
    await deleteDB(DB_NAME)
  } catch (e) {
    return err(mapStorageError(e))
  }

  // 최초 주입된 scan validation은 init 모듈이 기억하고 있어 재초기화에 그대로 적용된다
  const status = await initPersistence()
  if (status.status === 'ready') return ok(undefined)
  if (status.status === 'unavailable') {
    return err(new DomainError('storage-unavailable', DOMAIN_ERROR_MESSAGES['storage-unavailable']))
  }
  // 빈 DB 재생성 직후의 corrupted는 IO 계열 실패로 간주 (api-schema §4.1 — reset 오류 코드 2종 준수)
  return err(new DomainError('transaction-failed', DOMAIN_ERROR_MESSAGES['transaction-failed']))
}

/**
 * 레이스 [초기화] (R-6 · RV-A2) — 측정·레이스 기록 전체 삭제, **모터는 유지**.
 * confirm(명시 확인 + 삭제 범위 고지 "모든 측정 기록과 레이스 기록이 삭제됩니다.
 * 등록된 모터는 유지됩니다.")은 호출 feature 책임.
 *
 * 원자성(INV-12): motors + measureRecords + raceRecords **단일 트랜잭션** — abort 시 전부 잔존
 * (한쪽만 빈 상태 관찰 불가). meta는 접근하지 않는다. motors는 행 삭제가 아니라
 * **안정도 기준선(stabilityBestCvs) 필드 제거만** 수행한다 — 기준선은 기록에서 파생·영속된
 * 값이라 기록 초기화와 함께 지워져야 "조용한 곳에서 기준 다시 잡기" 흐름(사용자)이 성립한다.
 * 반환 건수는 clear 직전 같은 tx의 실측치 — confirm 고지·성공 토스트 등 표시용.
 * 오류: storage-unavailable(연결 부재) · quota-exceeded/transaction-failed(withTransaction 매핑).
 * invalidation(measureKeys.root + raceKeys.root + motorKeys — 기준선 필드 변경으로 motors 캐시도
 * 무효화)은 호출 command/feature 책임.
 */
export async function resetAllRecords(): Promise<
  Result<{deletedMeasureCount: number; deletedRaceCount: number}>
> {
  return withTransaction(['motors', 'measureRecords', 'raceRecords'], 'readwrite', async tx => {
    const measureStore = tx.objectStore('measureRecords')
    const raceStore = tx.objectStore('raceRecords')
    const deletedMeasureCount = await measureStore.count()
    const deletedRaceCount = await raceStore.count()
    await measureStore.clear()
    await raceStore.clear()
    const motorStore = tx.objectStore('motors')
    for (const row of await motorStore.getAll()) {
      if ('stabilityBestCvs' in row) {
        const stripped = {...row}
        delete stripped['stabilityBestCvs']
        await motorStore.put(stripped)
      }
    }
    return {deletedMeasureCount, deletedRaceCount}
  })
}

/**
 * 모터별 레이스 기록 초기화 (v2.3 — 사용자 결정 정정: 초기화는 **레이스 기록만** 삭제).
 * 해당 모터의 raceRecords만 삭제 — measureRecords(파노 값의 출처)·모터 자체·다른 모터의
 * 기록은 모두 유지한다. (이전 v2.2는 측정 기록까지 함께 삭제해 모터 상세의 파노 그래프
 * 데이터가 사라지는 문제가 있었다 — 그 동작을 정정한다.)
 * 원자성: raceRecords 단일 store 트랜잭션 — abort 시 무변경(한쪽만 빈 상태 관찰 불가).
 * measureRecords·motors·meta store에는 접근하지 않는다.
 * 대상 모터 부재 검증은 하지 않는다(멱등 — 이미 삭제된 모터의 잔존 기록도 정리 가능).
 * 반환 건수는 delete 직전 같은 tx의 실측치(성공 토스트 등 표시용).
 */
export async function resetRaceRecordsByMotor(
  motorId: string,
): Promise<Result<{deletedRaceCount: number}>> {
  return withTransaction(['raceRecords'], 'readwrite', async tx => {
    const raceStore = tx.objectStore('raceRecords')
    const keys = await raceStore.index('by-motorId').getAllKeys(motorId)
    for (const key of keys) await raceStore.delete(key)
    return {deletedRaceCount: keys.length}
  })
}
