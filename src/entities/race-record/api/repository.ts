import {z} from 'zod'

import {DOMAIN_ERROR_MESSAGES, DomainError, fromZodError} from '@shared/lib/errors'
import {mapStorageError, requireDb, withTransaction} from '@shared/lib/persistence'
import {err} from '@shared/lib/result'

import {createRaceRecordDraftSchema, parseRaceRecordRow} from '../model/schema'

import type {CreateRaceRecordDraft, RaceRecord} from '../model/schema'
import type {Result} from '@shared/lib/result'

// RaceRecord command 2건 + query 1건 (api-schema v2 §0·§4.4·§5 — F6-R).
// RaceRecord는 immutable — update command는 존재하지 않는다 (INV-05, 측정·기록 신뢰성 보호).
// motors store 접근은 entity 코드 import가 아닌 shared/lib/persistence 경유 store 접근이다
// (state-contract 위임 계약 5). store·index 이름은 state-contract v2 표기(raceRecords·by-motorId).

const BY_MOTOR_INDEX = 'by-motorId'

/** INV-08 (v2, api-schema §5): createdAt 역순 — 동률 시 id 역순 (레이스 기록 리스트 최신순, R-2) */
const byCreatedAtDescIdDesc = (a: RaceRecord, b: RaceRecord): number => {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
}

/**
 * command: createRaceRecord (R-3·R-4).
 * id/createdAt은 command가 생성. motors+raceRecords 단일 트랜잭션 — motor 존재를 FK add와
 * 같은 tx에서 확인 (dangling 금지, INV-03·INV-12). lapTimeMs 생략(undefined)은 저장하지 않음.
 * 제출 single-flight 가드는 호출 feature 책임 — 호출마다 새 id가 생성된다.
 * 오류: validation · not-found(motor 부재 — 폼 유지+오류 표시) · storage-unavailable ·
 * quota-exceeded · transaction-failed. 실패 시 폼 입력 유지 + [다시 저장]은 UI 계약.
 */
export async function createRaceRecord(draft: CreateRaceRecordDraft): Promise<Result<RaceRecord>> {
  const parsed = createRaceRecordDraftSchema.safeParse(draft)
  if (!parsed.success) return err(fromZodError(parsed.error))

  // 비-IDB 작업(id·시각 생성)은 tx 열기 전 완료 — auto-commit 방어 (위임 계약 2)
  const record: RaceRecord = {
    id: crypto.randomUUID(),
    motorId: parsed.data.motorId,
    panoHz: parsed.data.panoHz,
    result: parsed.data.result,
    voltage: parsed.data.voltage,
    // undefined 필드는 IndexedDB에 저장하지 않는다 (§2.1 null vs 생략 규칙)
    ...(parsed.data.lapTimeMs !== undefined ? {lapTimeMs: parsed.data.lapTimeMs} : {}),
    createdAt: new Date().toISOString(),
  }

  return withTransaction(['motors', 'raceRecords'], 'readwrite', async tx => {
    const motor = await tx.objectStore('motors').get(record.motorId)
    if (motor === undefined) {
      // FK 확인 실패 — abort로 무변경 보장, DomainError는 withTransaction이 그대로 보존한다
      throw new DomainError('not-found', DOMAIN_ERROR_MESSAGES['not-found'])
    }
    await tx.objectStore('raceRecords').add(record) // add — id 중복 시 실패 (INV-02)
    return record
  })
}

/**
 * command: deleteRaceRecord (RV-A3 — 오입력 복구 수단).
 * confirm은 호출 feature 책임. 대상 부재 시 멱등 성공 (SC-A4 — LWW 수렴).
 * commit 후 리스트·요약(R-1) 즉시 반영은 invalidation 매트릭스 소관.
 * 오류: validation · storage-unavailable · transaction-failed.
 */
export async function deleteRaceRecord(id: string): Promise<Result<void>> {
  const idParsed = z.uuid().safeParse(id)
  if (!idParsed.success) return err(fromZodError(idParsed.error))

  return withTransaction(['raceRecords'], 'readwrite', async tx => {
    await tx.objectStore('raceRecords').delete(idParsed.data)
  })
}

/**
 * query: listRaceRecordsByMotor (R-2 — 레이스 기록 리스트 최신순).
 * by-motorId index → createdAt 역순(동률 시 id 역순).
 * 실패는 DomainError throw — 빈 목록 위장 금지 (D-10).
 */
export async function listRaceRecordsByMotor(motorId: string): Promise<RaceRecord[]> {
  const db = requireDb() // ready가 아니면 storage-unavailable throw
  let rows: unknown[]
  try {
    rows = await db.getAllFromIndex('raceRecords', BY_MOTOR_INDEX, motorId)
  } catch (e) {
    throw mapStorageError(e)
  }
  return rows.map(parseRaceRecordRow).sort(byCreatedAtDescIdDesc)
}
