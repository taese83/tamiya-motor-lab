import {z} from 'zod'

import {DOMAIN_ERROR_MESSAGES, DomainError, fromZodError} from '@shared/lib/errors'
import {
  RECORDS_BY_MOTOR_INDEX,
  mapStorageError,
  requireDb,
  withTransaction,
} from '@shared/lib/persistence'
import {err} from '@shared/lib/result'

import {createRecordDraftSchema, parseRunRecordRow} from '../model/schema'

import type {CreateRecordDraft, RunRecord} from '../model/schema'
import type {Result} from '@shared/lib/result'

// RunRecord command 2건 + query 2건 (api-schema §0·§4.3·§5 — F6·F8).
// RunRecord는 immutable — updateRecord command는 존재하지 않는다 (FP-A4 / INV-05).
// createRecord의 motors store 접근은 entity 코드 import가 아닌 shared/lib/persistence 경유
// store 접근이다 (state-contract 위임 1 계약 5).

/**
 * INV-08: createdAt 내림차순, 동률 시 id 사전순 오름차순 — 모든 목록 query 동일 비교자.
 * (entity 간 import 금지로 motor 쪽과 각자 보유 — shared/lib 승격 후보로 보고됨)
 */
export const byCreatedAtDescIdAsc = (
  a: {createdAt: string; id: string},
  b: {createdAt: string; id: string},
): number => {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * command: createRecord (REQ-F-004).
 * motors+records 단일 트랜잭션 — motor 존재를 FK add와 같은 tx에서 확인 (dangling 금지,
 * INV-03·INV-12, 위임 1 계약 4). id/createdAt은 command 생성 (FP-A3).
 * D2: 측정값 생략 시 panoHz=rpm=null 저장 (draft schema .default(null)).
 * 제출 중 single-flight 가드(H-4)는 호출 feature 책임 — 호출마다 새 id가 생성된다.
 * 오류: validation · not-found(motor 부재) · storage-unavailable · quota-exceeded ·
 * transaction-failed. 실패 시 폼 입력 유지 + [다시 저장]은 UI 계약 (C-4/H-4).
 */
export async function createRecord(draft: CreateRecordDraft): Promise<Result<RunRecord>> {
  const parsed = createRecordDraftSchema.safeParse(draft)
  if (!parsed.success) return err(fromZodError(parsed.error))

  // 비-IDB 작업(id·시각 생성)은 tx 열기 전 완료 — auto-commit 방어 (위임 1 계약 2)
  const record: RunRecord = {
    id: crypto.randomUUID(),
    motorId: parsed.data.motorId,
    voltage: parsed.data.voltage,
    panoHz: parsed.data.panoHz,
    rpm: parsed.data.rpm,
    result: parsed.data.result,
    satisfied: parsed.data.satisfied,
    createdAt: new Date().toISOString(),
  }

  return withTransaction(['motors', 'records'], 'readwrite', async tx => {
    const motor = await tx.objectStore('motors').get(record.motorId)
    if (motor === undefined) {
      // FK 확인 실패 — abort로 무변경 보장, DomainError는 withTransaction이 그대로 보존한다
      throw new DomainError('not-found', DOMAIN_ERROR_MESSAGES['not-found'])
    }
    await tx.objectStore('records').add(record) // add — id 중복 시 실패 (INV-02)
    return record
  })
}

/**
 * command: deleteRecord (REQ-ST-007).
 * confirm(C-2)은 호출 feature 책임. 대상 부재 시 멱등 성공 (SC-A4 — LWW 수렴).
 * commit 후 목록·가이드 파생값 즉시 반영은 invalidation 매트릭스 소관 (INV-10).
 * 오류: validation · storage-unavailable · transaction-failed.
 */
export async function deleteRecord(id: string): Promise<Result<void>> {
  const idParsed = z.uuid().safeParse(id)
  if (!idParsed.success) return err(fromZodError(idParsed.error))

  return withTransaction(['records'], 'readwrite', async tx => {
    await tx.objectStore('records').delete(idParsed.data)
  })
}

/**
 * query: listRecordsByMotor (REQ-F-005/009) — S4 이력·가이드 근거 공용.
 * by-motorId index → 정렬 INV-08 (createdAt 역순, 동률 시 id 오름차순).
 * 실패는 DomainError throw — 빈 목록 위장 금지 (D-10).
 */
export async function listRecordsByMotor(motorId: string): Promise<RunRecord[]> {
  const db = requireDb() // ready가 아니면 storage-unavailable throw
  let rows: unknown[]
  try {
    rows = await db.getAllFromIndex('records', RECORDS_BY_MOTOR_INDEX, motorId)
  } catch (e) {
    throw mapStorageError(e)
  }
  return rows.map(parseRunRecordRow).sort(byCreatedAtDescIdAsc)
}

/**
 * query: listSatisfiedRecords (REQ-F-006) — satisfied===true만, 가이드(computeGuide) 입력.
 * 단독 화면 소비 없음 — 가이드 queryFn 내부 합성 전용, 별도 query key 없음 (api-schema §5).
 */
export async function listSatisfiedRecords(motorId: string): Promise<RunRecord[]> {
  const records = await listRecordsByMotor(motorId)
  return records.filter(record => record.satisfied)
}
