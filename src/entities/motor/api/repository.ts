import {z} from 'zod'

import {DOMAIN_ERROR_MESSAGES, DomainError, fromZodError} from '@shared/lib/errors'
import {
  RECORDS_BY_MOTOR_INDEX,
  mapStorageError,
  requireDb,
  withTransaction,
} from '@shared/lib/persistence'
import {err} from '@shared/lib/result'

import {createMotorInputSchema, motorSchema, parseMotorRow, updateMotorPatchSchema} from '../model/schema'

import type {CreateMotorInput, Motor, UpdateMotorPatch} from '../model/schema'
import type {Result} from '@shared/lib/result'

// Motor command 3건 + query 3건 (api-schema §0·§4.2·§5 — F5/F7).
// 채널 규약: command는 Result<T, DomainError> 봉투, query는 성공 값 직접 반환 + DomainError throw.
// deleteMotorCascade·countRecordsByMotor의 records store 접근은 entity 코드 import가 아닌
// shared/lib/persistence 경유 store 접근이다 (state-contract 위임 1 계약 5 — entity 간 import 금지 유지).

/**
 * INV-08: createdAt 내림차순, 동률 시 id 사전순 오름차순 — 모든 목록 query 동일 비교자.
 * (entity 간 import 금지로 run-record 쪽과 각자 보유 — shared/lib 승격 후보로 보고됨)
 */
const byCreatedAtDescIdAsc = (a: {createdAt: string; id: string}, b: {createdAt: string; id: string}): number => {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * command: createMotor (REQ-F-003).
 * id=crypto.randomUUID(), createdAt=updatedAt=now — command가 생성, 호출자 지정 불가 (FP-A3).
 * 오류: validation · storage-unavailable · quota-exceeded · transaction-failed.
 */
export async function createMotor(input: CreateMotorInput): Promise<Result<Motor>> {
  const parsed = createMotorInputSchema.safeParse(input)
  if (!parsed.success) return err(fromZodError(parsed.error))

  // 비-IDB 작업(id·시각 생성)은 tx 열기 전 완료 — auto-commit 방어 (위임 1 계약 2)
  const now = new Date().toISOString()
  const motor: Motor = {
    id: crypto.randomUUID(),
    name: parsed.data.name,
    statusGrade: parsed.data.statusGrade,
    // undefined 필드는 IndexedDB에 저장하지 않는다 ('' → 생략 정규화 포함, api-schema §2.1)
    ...(parsed.data.statusMemo !== undefined ? {statusMemo: parsed.data.statusMemo} : {}),
    createdAt: now,
    updatedAt: now,
  }

  return withTransaction(['motors'], 'readwrite', async tx => {
    await tx.objectStore('motors').add(motor) // add — id 중복 시 실패 (INV-01)
    return motor
  })
}

/**
 * command: updateMotor (REQ-F-003).
 * patch는 편집 필드(name·statusGrade·statusMemo)만 — 구조 필드는 타입에서 배제 + 런타임 재검증.
 * postcondition: id·createdAt 불변, updatedAt만 추가 갱신 (INV-04).
 * statusMemo 키가 patch에 존재하고 값이 undefined(빈 문자열 정규화 포함)면 메모 제거,
 * 키 자체가 없으면 무변경 — null vs 생략 규칙 (api-schema §2.1).
 * 오류: validation · not-found(동시 탭 선삭제 — C-8) · storage-unavailable · quota-exceeded ·
 * transaction-failed · data-corrupt(read 경계).
 */
export async function updateMotor(id: string, patch: UpdateMotorPatch): Promise<Result<Motor>> {
  const idParsed = z.uuid().safeParse(id)
  if (!idParsed.success) return err(fromZodError(idParsed.error))
  const patchParsed = updateMotorPatchSchema.safeParse(patch)
  if (!patchParsed.success) return err(fromZodError(patchParsed.error))

  const memoKeyPresent = Object.prototype.hasOwnProperty.call(patch, 'statusMemo')
  const updatedAt = new Date().toISOString()

  return withTransaction(['motors'], 'readwrite', async tx => {
    const store = tx.objectStore('motors')
    const row = await store.get(idParsed.data)
    if (row === undefined) {
      throw new DomainError('not-found', DOMAIN_ERROR_MESSAGES['not-found'])
    }
    const current = parseMotorRow(row) // read 경계 zod 검증 (INV-16)

    const next: Motor = {...current, updatedAt}
    if (patchParsed.data.name !== undefined) next.name = patchParsed.data.name
    if (patchParsed.data.statusGrade !== undefined) next.statusGrade = patchParsed.data.statusGrade
    if (memoKeyPresent) {
      if (patchParsed.data.statusMemo === undefined) delete next.statusMemo
      else next.statusMemo = patchParsed.data.statusMemo
    }

    // postcondition 보증 — merge 결과가 엔티티 계약을 만족하는지 write 직전 재검증
    const validated = motorSchema.safeParse(next)
    if (!validated.success) throw fromZodError(validated.error)

    await store.put(validated.data)
    return validated.data
  })
}

/**
 * command: deleteMotorCascade (REQ-ST-007, CP-3).
 * motors+records 단일 트랜잭션 — 완료 후 dangling reference 0건(INV-03), abort 시 무변경(INV-12).
 * 삭제 건수는 tx 내 index 재조회 실측치 — confirm 표시 n이 stale이어도 잔존 없음.
 * 대상 부재 시 멱등 성공 {deletedRecordCount:0} (SC-A4 baseline 확정, checkpoint-phase2 —
 * LWW 수렴, 잔존 dangling 기록도 index 기준 정리되는 self-healing).
 * confirm("기록 n건이 함께 삭제됩니다")은 호출 feature 책임.
 */
export async function deleteMotorCascade(id: string): Promise<Result<{deletedRecordCount: number}>> {
  const idParsed = z.uuid().safeParse(id)
  if (!idParsed.success) return err(fromZodError(idParsed.error))

  return withTransaction(['motors', 'records'], 'readwrite', async tx => {
    const records = tx.objectStore('records')
    const keys = await records.index(RECORDS_BY_MOTOR_INDEX).getAllKeys(idParsed.data)
    for (const key of keys) {
      await records.delete(key)
    }
    await tx.objectStore('motors').delete(idParsed.data)
    return {deletedRecordCount: keys.length}
  })
}

/**
 * query: listMotors (REQ-F-003/005) — S2/S5 모터 선택 리스트 원본.
 * 정렬 INV-08. "최근 사용순"은 summaries 파생 계산 소관 (FP-A1).
 * 실패는 DomainError throw — 빈 목록 위장 금지 (D-10).
 */
export async function listMotors(): Promise<Motor[]> {
  const db = requireDb() // ready가 아니면 storage-unavailable throw
  let rows: unknown[]
  try {
    rows = await db.getAll('motors')
  } catch (e) {
    throw mapStorageError(e)
  }
  return rows.map(parseMotorRow).sort(byCreatedAtDescIdAsc)
}

/**
 * query: getMotorById (REQ-F-005) — S4 헤더.
 * undefined는 오류가 아니라 "부재"라는 정상 도메인 결과 (S4 not-found UI 분기), throw는 읽기 실패.
 */
export async function getMotorById(id: string): Promise<Motor | undefined> {
  const db = requireDb()
  let row: unknown
  try {
    row = await db.get('motors', id)
  } catch (e) {
    throw mapStorageError(e)
  }
  return row === undefined ? undefined : parseMotorRow(row)
}

/**
 * query: countRecordsByMotor (REQ-ST-007) — cascade confirm "기록 n건" 실측치.
 * query 캐시 미사용 — confirm 직전 명령형 직접 호출(stale 건수 고지 방지, api-schema §11).
 */
export async function countRecordsByMotor(motorId: string): Promise<number> {
  const db = requireDb()
  try {
    return await db.countFromIndex('records', RECORDS_BY_MOTOR_INDEX, motorId)
  } catch (e) {
    throw mapStorageError(e)
  }
}
