import {z} from 'zod'

import {DOMAIN_ERROR_MESSAGES, DomainError, fromZodError} from '@shared/lib/errors'
import {mapStorageError, requireDb, withTransaction} from '@shared/lib/persistence'
import {err} from '@shared/lib/result'
import {panoHzStoredSchema} from '@shared/lib/schema/pano'
import {RACE_RESULTS} from '@shared/config/domain'

import {
  createMotorInputSchema,
  motorSchema,
  parseMotorRow,
  reorderMotorsInputSchema,
  updateMotorPatchSchema,
} from '../model/schema'
import {nextAutoMotorName} from '../model/auto-name'

import type {CreateMotorInput, Motor, ReorderMotorsInput, UpdateMotorPatch} from '../model/schema'
import type {MotorSummary, MotorSummaryMeasure, MotorSummaryRace} from '../model/types'
import type {Result} from '@shared/lib/result'

// Motor command 4건 + query 4건 (api-schema v2 §0·§4.2·§5 — F5).
// 채널 규약: command는 Result<T, DomainError> 봉투, query는 성공 값 직접 반환 + DomainError throw.
// countRecordsByMotor·listMotorSummaries·deleteMotorCascade의 record store 접근은
// entity 코드 import가 아닌 shared/lib/persistence 경유 store 접근이다 (state-contract 위임 계약 5).
// store·index 이름은 state-contract v2 §Storage Schema 표기(motors/measureRecords/raceRecords·by-motorId).

const BY_MOTOR_INDEX = 'by-motorId'

/**
 * INV-08 (v2): motors는 sortOrder 오름차순 — 동률 시 createdAt·id 오름차순
 * (정상 상태에선 INV-19로 동률 없음 — 방어적 2차 키).
 */
const bySortOrderAsc = (a: Motor, b: Motor): number => {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * command: createMotor (T-1).
 * id=crypto.randomUUID(), createdAt=updatedAt=now — command가 생성, 호출자 지정 불가.
 * sortOrder = 현재 max+1(리스트 끝 추가 — AR-1, 빈 목록이면 0). max 산출과 add가 같은 tx —
 * INV-19(연속성)는 cross-tab 직렬화로 성립.
 * 오류: validation · storage-unavailable · quota-exceeded · transaction-failed.
 */
export async function createMotor(input: CreateMotorInput): Promise<Result<Motor>> {
  const parsed = createMotorInputSchema.safeParse(input)
  if (!parsed.success) return err(fromZodError(parsed.error))

  // 비-IDB 작업(id·시각 생성)은 tx 열기 전 완료 — auto-commit 방어 (위임 계약 2)
  const now = new Date().toISOString()
  const base = {
    id: crypto.randomUUID(),
    kind: parsed.data.kind,
    createdAt: now,
    updatedAt: now,
  }
  // v2.18: 공백만 입력한 경우도 미입력으로 본다(지웠다가 스페이스만 남는 사례)
  const requestedName = parsed.data.name?.trim() ?? ''

  return withTransaction(['motors'], 'readwrite', async tx => {
    const store = tx.objectStore('motors')
    const rows = await store.getAll()
    // sortOrder 최대치와 기존 이름을 **같은 순회**에서 모은다 — 자동 이름 부여의 추가 IO는 0.
    // 이름 후보를 tx 밖에서 정하면 탭 2개가 동시에 추가할 때 같은 번호가 두 번 붙는다.
    let maxOrder = -1
    const names: string[] = []
    for (const row of rows) {
      const motor = parseMotorRow(row)
      if (motor.sortOrder > maxOrder) maxOrder = motor.sortOrder
      names.push(motor.name)
    }
    const name = requestedName !== '' ? requestedName : nextAutoMotorName(parsed.data.kind, names)
    const motor: Motor = {...base, name, sortOrder: maxOrder + 1}
    await store.add(motor) // add — id 중복 시 실패 (INV-01)
    return motor
  })
}

/**
 * command: updateMotor (T-1).
 * patch는 편집 필드(name·kind)만 — sortOrder(reorderMotors 전용)·구조 필드는 타입에서 배제 + 런타임 재검증.
 * postcondition: id·createdAt·sortOrder 불변, updatedAt만 추가 갱신 (INV-04).
 * 오류: validation · not-found(동시 탭 선삭제 — C-8) · storage-unavailable · quota-exceeded ·
 * transaction-failed · data-corrupt(read 경계).
 */
export async function updateMotor(id: string, patch: UpdateMotorPatch): Promise<Result<Motor>> {
  const idParsed = z.uuid().safeParse(id)
  if (!idParsed.success) return err(fromZodError(idParsed.error))
  const patchParsed = updateMotorPatchSchema.safeParse(patch)
  if (!patchParsed.success) return err(fromZodError(patchParsed.error))

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
    if (patchParsed.data.kind !== undefined) next.kind = patchParsed.data.kind

    // postcondition 보증 — merge 결과가 엔티티 계약을 만족하는지 write 직전 재검증
    const validated = motorSchema.safeParse(next)
    if (!validated.success) throw fromZodError(validated.error)

    await store.put(validated.data)
    return validated.data
  })
}

/**
 * command: deleteMotorCascade (cascade — Measure+Race).
 * motors+measureRecords+raceRecords **3-store 단일 트랜잭션** — 완료 후 dangling reference 0건(INV-03),
 * abort 시 무변경(INV-12). 삭제 건수는 tx 내 index 재조회 실측치(measure+race 합산) —
 * confirm 표시 n·m이 stale이어도 잔존 없음.
 * ④ compaction: 삭제 대상보다 큰 sortOrder 전건 −1 — 잔존 모터 sortOrder 연속(INV-19).
 * 대상 부재 → not-found (api-schema §4.2). confirm(n·m 분리 고지, D-1)은 호출 feature 책임.
 */
export async function deleteMotorCascade(
  id: string,
): Promise<Result<{deletedRecordCount: number}>> {
  const idParsed = z.uuid().safeParse(id)
  if (!idParsed.success) return err(fromZodError(idParsed.error))

  return withTransaction(['motors', 'measureRecords', 'raceRecords'], 'readwrite', async tx => {
    const motors = tx.objectStore('motors')
    const targetRow = await motors.get(idParsed.data)
    if (targetRow === undefined) {
      throw new DomainError('not-found', DOMAIN_ERROR_MESSAGES['not-found'])
    }
    const target = parseMotorRow(targetRow)

    const measures = tx.objectStore('measureRecords')
    const measureKeys = await measures.index(BY_MOTOR_INDEX).getAllKeys(idParsed.data)
    for (const key of measureKeys) {
      await measures.delete(key)
    }

    const races = tx.objectStore('raceRecords')
    const raceKeys = await races.index(BY_MOTOR_INDEX).getAllKeys(idParsed.data)
    for (const key of raceKeys) {
      await races.delete(key)
    }

    await motors.delete(idParsed.data)

    // sortOrder compaction — 같은 tx (INV-19: gap 0건)
    const remaining = await motors.getAll()
    for (const row of remaining) {
      const motor = parseMotorRow(row)
      if (motor.sortOrder > target.sortOrder) {
        await motors.put({...motor, sortOrder: motor.sortOrder - 1})
      }
    }

    return {deletedRecordCount: measureKeys.length + raceKeys.length}
  })
}

/**
 * command: reorderMotors (T-6 — sortOrder의 유일 진입점).
 * motors 단일 트랜잭션: ① 전건 read ② 순열 실측 검증(개수 일치·전건 존재·중복 없음 — 불일치 시
 * abort ⇒ 무변경, 'permutation' 실패: 동시 탭 add/delete 경합 감지 계기. UI는 목록 refetch 후
 * 재시도 안내) ③ 전 행 sortOrder = 배열 인덱스(0..n−1) 재부여. updatedAt 미갱신(AR-3 — 배치 메타).
 * 오류: validation(permutation 포함) · storage-unavailable · transaction-failed.
 */
export async function reorderMotors(input: ReorderMotorsInput): Promise<Result<void>> {
  const parsed = reorderMotorsInputSchema.safeParse(input)
  if (!parsed.success) return err(fromZodError(parsed.error))
  const orderedIds = parsed.data.orderedIds

  return withTransaction(['motors'], 'readwrite', async tx => {
    const store = tx.objectStore('motors')
    const rows = await store.getAll()
    const motors = rows.map(parseMotorRow)

    // 집합 동일성 검증 — set(orderedIds) === set(현재 id) (SO-2)
    const idSet = new Set(orderedIds)
    const isPermutation =
      idSet.size === orderedIds.length &&
      motors.length === orderedIds.length &&
      motors.every(motor => idSet.has(motor.id))
    if (!isPermutation) {
      throw new DomainError(
        'validation',
        '모터 목록이 변경되었습니다. 목록을 새로고침한 뒤 다시 시도해 주세요',
        {
          fieldErrors: {orderedIds: 'permutation'},
        },
      )
    }

    const orderIndex = new Map(orderedIds.map((motorId, index) => [motorId, index]))
    for (const motor of motors) {
      const nextOrder = orderIndex.get(motor.id)
      if (nextOrder === undefined) continue // 순열 검증 통과 후엔 도달 불가 — 타입 방어
      await store.put({...motor, sortOrder: nextOrder})
    }
  })
}

/**
 * query: listMotors (T-6) — 모터 리스트·모터 선택 팝업(M-6)·레이스 진입 리스트의 순서 원천.
 * 정렬: sortOrder 오름차순 (INV-08 v2). 실패는 DomainError throw — 빈 목록 위장 금지 (D-10).
 */
export async function listMotors(): Promise<Motor[]> {
  const db = requireDb() // ready가 아니면 storage-unavailable throw
  let rows: unknown[]
  try {
    rows = await db.getAll('motors')
  } catch (e) {
    throw mapStorageError(e)
  }
  return rows.map(parseMotorRow).sort(bySortOrderAsc)
}

/**
 * query: getMotorById — 차트·레이스 페이지(/race/:motorId) 헤더.
 * undefined는 오류가 아니라 "부재"라는 정상 도메인 결과 (라우트 가드 분기), throw는 읽기 실패.
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
 * query: countRecordsByMotor — cascade confirm "측정 n건·레이스 m건" 분리 실측치 (D-1).
 * query 캐시 미사용 — confirm 직전 명령형 직접 호출(stale 건수 고지 방지, api-schema §5).
 */
export async function countRecordsByMotor(
  motorId: string,
): Promise<{measureCount: number; raceCount: number}> {
  const db = requireDb()
  try {
    const [measureCount, raceCount] = await Promise.all([
      db.countFromIndex('measureRecords', BY_MOTOR_INDEX, motorId),
      db.countFromIndex('raceRecords', BY_MOTOR_INDEX, motorId),
    ])
    return {measureCount, raceCount}
  } catch (e) {
    throw mapStorageError(e)
  }
}

// ── listMotorSummaries 재료 — AR-4: entity 간 import 금지 아래 record 행을 요약이 소비하는
// 최소 필드 projection으로만 검증한다 (canonical 스키마는 각 record entity model 1곳 소유 —
// 여기는 view projection, 이중 canonical 정의 아님). read 경계 zod 검증은 유지 (INV-16).
const summaryMeasureRowSchema = z.object({
  id: z.uuid(),
  motorId: z.uuid(),
  panoHz: panoHzStoredSchema, // read-lenient (SC-A8)
  rpm: z.number().int().positive(),
  measuredAt: z.iso.datetime(),
})

const summaryRaceRowSchema = z.object({
  id: z.uuid(),
  motorId: z.uuid(),
  panoHz: panoHzStoredSchema,
  result: z.enum(RACE_RESULTS),
  voltage: z.number(),
  lapTimeMs: z.number().int().positive().optional(),
  createdAt: z.iso.datetime(),
})

function parseSummaryMeasureRow(row: unknown): MotorSummaryMeasure {
  const parsed = summaryMeasureRowSchema.safeParse(row)
  if (!parsed.success) {
    throw new DomainError('data-corrupt', DOMAIN_ERROR_MESSAGES['data-corrupt'], {
      cause: parsed.error,
    })
  }
  return parsed.data
}

function parseSummaryRaceRow(row: unknown): MotorSummaryRace {
  const parsed = summaryRaceRowSchema.safeParse(row)
  if (!parsed.success) {
    throw new DomainError('data-corrupt', DOMAIN_ERROR_MESSAGES['data-corrupt'], {
      cause: parsed.error,
    })
  }
  return parsed.data
}

interface Rollup<T> {
  count: number
  last: T
  /** v2.12: 같은 스캔에서 모아둔 전 행 — 스파크라인 수열 파생용(추가 IO 없음) */
  rows: T[]
}

/** 단일 스캔 집계 — timestamp 내림차순 기준 최신 1건 유지 (동률 시 id 최대 — INV-08 역방향 선두) */
function rollupBy<T extends {motorId: string; id: string}>(
  rows: readonly T[],
  timestampOf: (row: T) => string,
): Map<string, Rollup<T>> {
  const rollups = new Map<string, Rollup<T>>()
  for (const row of rows) {
    const current = rollups.get(row.motorId)
    if (current === undefined) {
      rollups.set(row.motorId, {count: 1, last: row, rows: [row]})
      continue
    }
    current.count += 1
    current.rows.push(row)
    const rowTs = timestampOf(row)
    const lastTs = timestampOf(current.last)
    if (rowTs > lastTs || (rowTs === lastTs && row.id > current.last.id)) current.last = row
  }
  return rollups
}

/**
 * query: listMotorSummaries — 3-store 조인 파생 view (T-4 · R-1).
 * motors+measureRecords+raceRecords 전건 read → 메모리 조인. 영속·캐시 금지(INV-09) — 매 조회 계산.
 * 정렬: sortOrder 오름차순(listMotors와 동일 순서 — 화면 간 순서 불일치 금지).
 * 읽기 사이에 삭제된 모터의 record 잔재는 조인에서 자연 탈락 (LWW 정합).
 */
export async function listMotorSummaries(): Promise<MotorSummary[]> {
  const db = requireDb()
  let motorRows: unknown[]
  let measureRows: unknown[]
  let raceRows: unknown[]
  try {
    ;[motorRows, measureRows, raceRows] = await Promise.all([
      db.getAll('motors'),
      db.getAll('measureRecords'),
      db.getAll('raceRecords'),
    ])
  } catch (e) {
    throw mapStorageError(e)
  }

  const motors = motorRows.map(parseMotorRow).sort(bySortOrderAsc)
  const measureRollups = rollupBy(
    measureRows.map(parseSummaryMeasureRow),
    record => record.measuredAt,
  )
  const raceRollups = rollupBy(raceRows.map(parseSummaryRaceRow), record => record.createdAt)

  return motors.map((motor): MotorSummary => {
    const measure = measureRollups.get(motor.id)
    const race = raceRollups.get(motor.id)
    return {
      motor,
      measureCount: measure?.count ?? 0,
      ...(measure !== undefined ? {lastMeasure: measure.last} : {}),
      raceCount: race?.count ?? 0,
      ...(race !== undefined ? {lastRace: race.last} : {}),
      // v2.12 스파크라인 수열 — measuredAt 오름차순(오래된→최신). 같은 스캔 결과를 정렬만 하므로
      // 추가 IO 없음. 상세 화면 차트와 정렬 방향을 일치시켜 두 화면의 추세 방향이 어긋나지 않게 한다.
      panoTrend:
        measure === undefined
          ? []
          : [...measure.rows]
              .sort((a, b) =>
                a.measuredAt === b.measuredAt
                  ? a.id < b.id
                    ? -1
                    : 1
                  : a.measuredAt < b.measuredAt
                    ? -1
                    : 1,
              )
              .map(row => row.panoHz),
    }
  })
}
