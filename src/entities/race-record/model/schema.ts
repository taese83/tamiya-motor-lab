import {z} from 'zod'

import {LAP_TIME_MAX_MS, RACE_RESULTS, VOLTAGE_RANGE} from '@shared/config/domain'
import {DOMAIN_ERROR_MESSAGES, DomainError} from '@shared/lib/errors'
import {panoHzStoredSchema} from '@shared/lib/schema/pano'

// RaceRecord 엔티티 zod 스키마 단일 정의 (api-schema v2 §2.4 canonical, AD-7).
// immutable — 생성·개별 삭제만(RV-A3), update command 없음(INV-05 — 오입력 복구는 삭제+재입력).
// persisted 데이터는 외부 입력 취급 — type assertion 금지 (INV-16).
//
// panoHz가 write에도 stored(완화) 스키마인 이유(AR-2): 출처가 항상 기존 MeasureRecord 인용
// 또는 방금 수집된 MeasureRecord(RV-1 왕복 — 그 시점 이미 write-strict 통과)라,
// 대역 상수(F0_RANGE) 변경 후에도 기존 정상 측정값의 인용 입력이 막히지 않게 한다(SC-A8 동일 근거).
// rpm은 저장하지 않는다 — 필요 시 표시 계층이 round(panoHz×60) 파생.

export const raceResultSchema = z.enum(RACE_RESULTS) // R-3 — 상수 1곳 참조 (완주/이탈 2택)

// A5: 0.1~9.9 V, 소수 최대 2자리 — float 안전 검사(×100 후 정수 근접 비교, `% 1` 직접 비교 금지)
export const voltageSchema = z
  .number()
  .min(VOLTAGE_RANGE.min, `전압은 ${VOLTAGE_RANGE.min} V 이상이어야 합니다`)
  .max(VOLTAGE_RANGE.max, `전압은 ${VOLTAGE_RANGE.max} V 이하여야 합니다`)
  .refine(
    v => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9,
    '전압은 소수 둘째 자리까지 입력할 수 있습니다',
  )

// 랩타임 — 옵션, 양의 정수 ms ≤1h(SC2-A2) (생략 = 미측정, null 아님 — §2.1 null vs 생략 규칙)
export const lapTimeMsSchema = z
  .number()
  .int('랩타임은 ms 정수로 입력합니다')
  .positive()
  .max(LAP_TIME_MAX_MS, '랩타임은 1시간을 넘을 수 없습니다')

export const raceRecordSchema = z.object({
  id: z.uuid(), // 구조 필드 — 불변
  motorId: z.uuid(), // FK 구조 필드 — dangling 금지 (INV-03)
  panoHz: panoHzStoredSchema, // R-3①: 최신 MeasureRecord 인용 or 왕복 즉석 측정값
  result: raceResultSchema, // 완주/이탈 2택
  voltage: voltageSchema,
  lapTimeMs: lapTimeMsSchema.optional(), // 옵션 — undefined는 저장하지 않음
  createdAt: z.iso.datetime(), // 구조 필드 — 최신순 정렬 키
})
export type RaceRecord = z.infer<typeof raceRecordSchema>

// command 입력 — id/createdAt은 command가 생성
export const createRaceRecordDraftSchema = z.object({
  motorId: z.uuid(),
  panoHz: panoHzStoredSchema, // 주의: write에도 stored(완화) 적용 — 상단 AR-2 각주
  result: raceResultSchema,
  voltage: voltageSchema,
  lapTimeMs: lapTimeMsSchema.optional(),
})
export type CreateRaceRecordDraft = z.input<typeof createRaceRecordDraftSchema>

/**
 * read 경계 rehydrate 검증 (INV-16) — persisted 행을 zod parse하고,
 * 실패는 'data-corrupt'로 throw한다(D-10 — 빈 목록 위장 금지, query throw 채널).
 */
export function parseRaceRecordRow(row: unknown): RaceRecord {
  const parsed = raceRecordSchema.safeParse(row)
  if (!parsed.success) {
    throw new DomainError('data-corrupt', DOMAIN_ERROR_MESSAGES['data-corrupt'], {
      cause: parsed.error,
    })
  }
  return parsed.data
}
