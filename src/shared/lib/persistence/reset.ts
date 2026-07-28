import {deleteDB} from 'idb'

import {DOMAIN_ERROR_MESSAGES, DomainError} from '@shared/lib/errors'
import {err, ok} from '@shared/lib/result'

import {closeConnection} from './db'
import {initPersistence, resetInitState} from './init'
import {mapStorageError} from './map-storage-error'
import {DB_NAME} from './schema'

import type {Result} from '@shared/lib/result'

/**
 * corrupted 복구의 유일 경로 (F-1 확정 — 복구 UI에서만 진입, REQ-ST-007급 confirm은 호출 feature 책임).
 *
 * deleteDatabase(스펙상 원자적) → initPersistence 재실행으로 v1 빈 스키마 재생성.
 * postcondition: motors=0건 · records=0건 · meta.schemaVersion=1 · PersistenceStatus=ready(ok).
 * 성공 후 전체 query 캐시 clear(queryClient.clear())는 호출 측(app/feature) 책임이다.
 * 실패 시 throw하지 않는다 — 복구 UI 유지 + 오류 표시 + 수동 재시도(crash loop 금지, C-9).
 *
 * 동시 탭 참고: 다른 탭이 DB를 열고 있으면 deleteDatabase는 그 연결이 닫힐 때까지 대기한다(blocked).
 * 탭 간 강제 종료 브리지는 도입하지 않는다 — 단일 사용자 개인 도구, 동시 탭은 비정상 사용(위임 3 LWW).
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
