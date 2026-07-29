import {z} from 'zod'

import {DOMAIN_ERROR_MESSAGES, DomainError} from '@shared/lib/errors'
import {panoHzStoredSchema, panoHzWriteSchema, panoRpmPair} from '@shared/lib/schema/pano'

// MeasureRecord 엔티티 zod 스키마 단일 정의 (api-schema v2 §2.3 canonical, AD-7).
// immutable — 수집 전용(T-2): 생성 경로는 collectMeasureRecord 단일 command뿐(INV-22),
// 수동 입력·수정 command 없음. 삭제는 rolling 자동 삭제(T-3)·cascade·resetAllRecords/resetAllData뿐,
// 개별 삭제 없음(RV-A1). persisted 데이터는 외부 입력 취급 — type assertion 금지 (INV-16).
// panoHz는 SC-A8 이원화: write-strict(F0_RANGE+소수 1자리) / read-lenient(유한 양수 ≤2,000).
// 쌍 불변식 rpm === round(panoHz×60)은 양쪽 모두 엄격 (INV-06).

// rehydrate(read-lenient) — 저장 데이터 검증
export const measureRecordSchema = z
  .object({
    id: z.uuid(), // 구조 필드 — 불변
    motorId: z.uuid(), // FK 구조 필드 — dangling 금지 (INV-03)
    panoHz: panoHzStoredSchema, // SC-A8 완화 (유한 양수 ≤2,000)
    rpm: z.number().int().positive(),
    measuredAt: z.iso.datetime(), // 구조 필드 — 차트 X축·rolling 삭제 순서 키
  })
  .refine(panoRpmPair, {path: ['rpm'], message: 'RPM은 파노 × 60 반올림 정수여야 합니다'})
export type MeasureRecord = z.infer<typeof measureRecordSchema>

// command 입력(write-strict) — id/measuredAt은 command가 생성. panoHz·rpm은 F2 stable 확정값
export const collectMeasureInputSchema = z
  .object({
    motorId: z.uuid(),
    panoHz: panoHzWriteSchema, // F0_RANGE 엄격 + 소수 1자리 (AS-3)
    rpm: z.number().int().positive(),
  })
  .refine(panoRpmPair, {path: ['rpm'], message: 'RPM은 파노 × 60 반올림 정수여야 합니다'})
export type CollectMeasureInput = z.input<typeof collectMeasureInputSchema>

/**
 * read 경계 rehydrate 검증 (INV-16) — persisted 행을 zod parse하고,
 * 실패는 'data-corrupt'로 throw한다(D-10 — 빈 목록 위장 금지, query throw 채널).
 */
export function parseMeasureRecordRow(row: unknown): MeasureRecord {
  const parsed = measureRecordSchema.safeParse(row)
  if (!parsed.success) {
    throw new DomainError('data-corrupt', DOMAIN_ERROR_MESSAGES['data-corrupt'], {
      cause: parsed.error,
    })
  }
  return parsed.data
}
