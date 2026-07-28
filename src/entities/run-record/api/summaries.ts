import {mapStorageError, requireDb} from '@shared/lib/persistence'

import {parseRunRecordRow} from '../model/schema'
import {byCreatedAtDescIdAsc} from './repository'

import type {MotorRecordRollup, MotorSummaryMotorRef, MotorSummaryOf} from '../model/types'

// listMotorSummaries(api-schema §5)의 구현 재료 (F7 — S3 카드용 파생 view).
//
// 원 계약은 motors+records 조인 query 1건이지만 Motor zod 스키마는 entities/motor 소유이고
// entity 간 import는 금지(FSD·eslint)라, 이 slice는 records 측 집계(listMotorRecordRollups)와
// 순수 조인(composeMotorSummaries)만 제공하고 상위 레이어(pages/motors 등 — feature-plan §1 F7)가
// motorQueries의 listMotors 결과와 합성해 motorKeys.summaries() queryFn을 완성한다:
//   queryFn: async () => composeMotorSummaries(await listMotors(), await listMotorRecordRollups())
// 파생 값은 영속·캐시 금지 — 매 조회 계산 (INV-09, FP-A1).

/**
 * query 재료: records 전 행을 단일 스캔해 모터별 {기록 수, 최근 기록}을 집계한다.
 * read 경계 zod 검증(INV-16) 후 집계 — 실패는 DomainError throw (D-10, 빈 결과 위장 금지).
 */
export async function listMotorRecordRollups(): Promise<ReadonlyMap<string, MotorRecordRollup>> {
  const db = requireDb() // ready가 아니면 storage-unavailable throw
  let rows: unknown[]
  try {
    rows = await db.getAll('records')
  } catch (e) {
    throw mapStorageError(e)
  }

  const rollups = new Map<string, MotorRecordRollup>()
  for (const row of rows) {
    const record = parseRunRecordRow(row)
    const current = rollups.get(record.motorId)
    if (current === undefined) {
      rollups.set(record.motorId, {recordCount: 1, lastRecord: record})
    } else {
      current.recordCount += 1
      // INV-08 비교자 기준으로 더 앞(더 최근)이면 lastRecord 교체
      if (byCreatedAtDescIdAsc(record, current.lastRecord) < 0) current.lastRecord = record
    }
  }
  return rollups
}

/**
 * 순수 조인 (IO 없음): 검증 완료된 모터 목록 + rollup → MotorSummary 목록.
 * 정렬 = 최근 사용순 (FP-A1): lastRecord.createdAt ?? motor.createdAt 내림차순, 동률 시 id 오름차순.
 * rollup에 없는 모터는 recordCount 0 · lastRecord 생략 — 두 read 사이에 삭제된 모터의
 * rollup 잔재는 조인에서 자연 탈락한다 (LWW 정합).
 */
export function composeMotorSummaries<M extends MotorSummaryMotorRef>(
  motors: readonly M[],
  rollups: ReadonlyMap<string, MotorRecordRollup>,
): Array<MotorSummaryOf<M>> {
  const summaries = motors.map((motor): MotorSummaryOf<M> => {
    const rollup = rollups.get(motor.id)
    return {
      motor,
      recordCount: rollup?.recordCount ?? 0,
      ...(rollup !== undefined ? {lastRecord: rollup.lastRecord} : {}),
    }
  })
  return summaries.sort((a, b) => {
    const aKey = a.lastRecord?.createdAt ?? a.motor.createdAt
    const bKey = b.lastRecord?.createdAt ?? b.motor.createdAt
    if (aKey !== bKey) return aKey < bKey ? 1 : -1
    return a.motor.id < b.motor.id ? -1 : a.motor.id > b.motor.id ? 1 : 0
  })
}
