import {z} from 'zod'

import {MEASURE_RECORD_LIMIT} from '@shared/config/domain'
import {DOMAIN_ERROR_MESSAGES, DomainError, fromZodError} from '@shared/lib/errors'
import {mapStorageError, requireDb, withTransaction} from '@shared/lib/persistence'
import {err} from '@shared/lib/result'

import {collectMeasureInputSchema, parseMeasureRecordRow} from '../model/schema'
import {mergeBestCvs} from '../model/stability-baseline'

import type {CollectMeasureInput, MeasureRecord} from '../model/schema'
import type {Result} from '@shared/lib/result'

// MeasureRecord command 2건 + query 1건 (api-schema v2 §0·§4.3·§5 — F6-M).
// v2.38(사용자): **개별 delete 추가**(T-2 append-only 번복 — 파노 기록을 개별로만 삭제).
// update는 여전히 없다(측정값 불변). 개별 delete만 허용(일괄 삭제 경로 미제공).
// motors store 접근은 entity 코드 import가 아닌 shared/lib/persistence 경유 store 접근이다
// (state-contract 위임 계약 5). store·index 이름은 state-contract v2 표기(measureRecords·by-motorId).

const BY_MOTOR_INDEX = 'by-motorId'

// motors 행의 기준선 필드만 완화 검증 — motor 엔티티 import 없이(위임 계약 5) 필드 단위로 읽는다.
// 파손된 값(비배열 등)은 빈 표본으로 간주 — collect를 막지 않고 이번 병합으로 자연 복구된다.
const bestCvsFieldSchema = z.array(z.number().min(0).finite()).catch([])

/**
 * INV-08 (v2): measuredAt 오름차순, 동률 시 id 오름차순 — 목록 query·rolling eviction 동일 비교자.
 * 최신 파노 = 마지막 요소 (레이스 폼 자동 입력 R-3①은 이 결과의 select 파생 — AR-5).
 */
const byMeasuredAtAscIdAsc = (a: MeasureRecord, b: MeasureRecord): number => {
  if (a.measuredAt !== b.measuredAt) return a.measuredAt < b.measuredAt ? -1 : 1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * command: collectMeasureRecord (M-6 [기록] · RV-1 레이스 왕복 자동 수집 — 같은 command).
 * id=crypto.randomUUID(), measuredAt=now — command가 생성. 입력은 write-strict
 * (panoHz F0_RANGE·소수 1자리 + 쌍 불변식 INV-06).
 *
 * rolling 10 (T-3·INV-20): motors+measureRecords **단일 트랜잭션**에서
 * ① motor 존재 확인(부재 → not-found — FK와 add 같은 tx, INV-03)
 * ② 해당 motorId 기존 건수 ≥ MEASURE_RECORD_LIMIT이면 최고령(measuredAt asc·동률 id asc)부터
 *    초과분 삭제 ③ add — 중간 실패 시 삽입도 롤백, 11건 상태 관측 불가.
 * postcondition: 해당 모터 건수 ≤ 10.
 * 오류: validation · not-found · storage-unavailable · quota-exceeded · transaction-failed.
 */
export async function collectMeasureRecord(
  input: CollectMeasureInput,
): Promise<Result<MeasureRecord>> {
  const parsed = collectMeasureInputSchema.safeParse(input)
  if (!parsed.success) return err(fromZodError(parsed.error))

  // 비-IDB 작업(id·시각 생성)은 tx 열기 전 완료 — auto-commit 방어 (위임 계약 2)
  const record: MeasureRecord = {
    id: crypto.randomUUID(),
    motorId: parsed.data.motorId,
    panoHz: parsed.data.panoHz,
    rpm: parsed.data.rpm,
    measuredAt: new Date().toISOString(),
    // 안정도(컨디션 지표, v2.x) — undefined는 저장하지 않음(옵션 생략 규칙)
    ...(parsed.data.stabilityCv !== undefined && {stabilityCv: parsed.data.stabilityCv}),
    // R51 — 수동 입력만 태깅. 실측(부재)은 저장하지 않는다(부재=measured — 목록 표시가 이 규칙에 의존).
    ...(parsed.data.source === 'manual' && {source: 'manual' as const}),
  }

  return withTransaction(['motors', 'measureRecords'], 'readwrite', async tx => {
    const motor = await tx.objectStore('motors').get(record.motorId)
    if (motor === undefined) {
      // FK 확인 실패 — abort로 무변경 보장, DomainError는 withTransaction이 그대로 보존한다
      throw new DomainError('not-found', DOMAIN_ERROR_MESSAGES['not-found'])
    }

    const store = tx.objectStore('measureRecords')
    const rows = await store.index(BY_MOTOR_INDEX).getAll(record.motorId)
    const existing = rows.map(parseMeasureRecordRow).sort(byMeasuredAtAscIdAsc)

    // eviction: 삽입 후 건수 > LIMIT이 되지 않도록 최고령부터 (count − (LIMIT−1))건 삭제
    const excess = existing.length - (MEASURE_RECORD_LIMIT - 1)
    for (const oldest of existing.slice(0, Math.max(0, excess))) {
      await store.delete(oldest.id)
    }

    await store.add(record) // add — id 중복 시 실패 (INV-02)

    // 안정도 기준선 영속 (v2.x — 사용자 확정: 역대 최상 CV 3건, rolling eviction과 무관).
    // 기존 영속 표본 + 보관 기록 CV(구버전 모터 첫 수집 시 백필) + 새 CV를 병합해
    // 가장 좋은(낮은) 3건만 유지 — 기존 기준이 현재 20건보다 좋으면 그대로 생존한다.
    // 같은 tx라 abort 시 기록 삽입과 함께 롤백. updatedAt은 갱신하지 않는다(사용자 편집 아님).
    if (record.stabilityCv !== undefined) {
      const currentBest = bestCvsFieldSchema.parse(motor['stabilityBestCvs'] ?? [])
      const storedCvs = existing
        .map(row => row.stabilityCv)
        .filter((cv): cv is number => cv !== undefined)
      const nextBest = mergeBestCvs(currentBest, [...storedCvs, record.stabilityCv])
      await tx.objectStore('motors').put({...motor, stabilityBestCvs: nextBest})
    }

    return record
  })
}

/**
 * query: listMeasureRecordsByMotor (T-4 기록 표시 · T-5 라인 차트).
 * by-motorId index → measuredAt 오름차순(동률 시 id 오름차순), 항상 ≤ MEASURE_RECORD_LIMIT(10).
 * 최신 파노 = 마지막 요소 — 별도 query 없음(이중 원본 금지, AR-5).
 * 실패는 DomainError throw — 빈 목록 위장 금지 (D-10).
 */
export async function listMeasureRecordsByMotor(motorId: string): Promise<MeasureRecord[]> {
  const db = requireDb() // ready가 아니면 storage-unavailable throw
  let rows: unknown[]
  try {
    rows = await db.getAllFromIndex('measureRecords', BY_MOTOR_INDEX, motorId)
  } catch (e) {
    throw mapStorageError(e)
  }
  return rows.map(parseMeasureRecordRow).sort(byMeasuredAtAscIdAsc)
}

/**
 * command: deleteMeasureRecord (v2.38 — 사용자: 파노 기록 개별 삭제).
 * 개별 삭제만 제공(일괄 없음). 대상 부재 시 멱등 성공(LWW 수렴 — deleteRaceRecord와 동일).
 * 파생(차트·요약 lastMeasure/panoTrend·레이스 자동 파노)은 invalidation으로 재계산(mutation 훅 소관).
 * 오류: validation · storage-unavailable · transaction-failed.
 */
export async function deleteMeasureRecord(id: string): Promise<Result<void>> {
  const idParsed = z.uuid().safeParse(id)
  if (!idParsed.success) return err(fromZodError(idParsed.error))

  return withTransaction(['measureRecords'], 'readwrite', async tx => {
    await tx.objectStore('measureRecords').delete(idParsed.data)
  })
}
