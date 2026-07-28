import {z} from 'zod'

import {F0_RANGE, F0_REHYDRATE_MAX, RUN_RESULTS, VOLTAGE_RANGE} from '@shared/config/domain'
import {DOMAIN_ERROR_MESSAGES, DomainError} from '@shared/lib/errors'

// RunRecord 엔티티 zod 스키마 단일 정의 (api-schema §2.3 canonical, AD-7).
// RunRecord는 immutable — 생성·삭제만, update command 부재 (FP-A4 / INV-05).
// persisted 데이터는 외부 입력 취급: read 경계 zod 검증, type assertion 금지 (INV-16).

export const runResultSchema = z.enum(RUN_RESULTS) // D4 — 상수 1곳 참조

// A5: 0.1~9.9 V, 소수 최대 2자리 — float 안전 검사(× 100 후 정수 근접 비교, `% 1` 직접 비교 금지)
export const voltageSchema = z
  .number()
  .min(VOLTAGE_RANGE.min, `전압은 ${VOLTAGE_RANGE.min} V 이상이어야 합니다`)
  .max(VOLTAGE_RANGE.max, `전압은 ${VOLTAGE_RANGE.max} V 이하여야 합니다`)
  .refine(
    v => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9,
    '전압은 소수 둘째 자리까지 입력할 수 있습니다',
  )

// 파노 저장 정밀도 = 소수 1자리 (v2 출력 계약과 저장 일치 — AS-3), float 안전 검사
const hasPanoPrecision = (v: number): boolean => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9

/**
 * rehydrate(read-lenient, SC-A8): 유한 양수 ≤ F0_REHYDRATE_MAX —
 * 탐색 대역 상수(F0_RANGE) 변경이 기존 정상 데이터를 corrupt로 오판하지 않게 하는 이원화 계약.
 */
export const panoHzSchema = z
  .number()
  .positive()
  .finite()
  .max(F0_REHYDRATE_MAX)
  .refine(hasPanoPrecision, '파노는 소수 첫째 자리까지 저장합니다')

/** write-strict (SC-A8): 저장 시 탐색 대역 F0_RANGE(170~620 Hz) 엄격 검증 */
export const panoHzWriteSchema = z
  .number()
  .finite()
  .min(F0_RANGE.min, `파노는 ${F0_RANGE.min} Hz 이상이어야 합니다`)
  .max(F0_RANGE.max, `파노는 ${F0_RANGE.max} Hz 이하여야 합니다`)
  .refine(hasPanoPrecision, '파노는 소수 첫째 자리까지 저장합니다')

interface MeasurementPairFields {
  panoHz: number | null
  rpm: number | null
}

// INV-06: (panoHz===null)===(rpm===null) ∧ 비null 시 rpm===round(panoHz×60) — 쌍 불변식은
// write·rehydrate 양쪽 모두 엄격 (SC-A8)
const measurementPairInvariant = (
  r: MeasurementPairFields,
  ctx: z.core.$RefinementCtx<MeasurementPairFields>,
): void => {
  if ((r.panoHz === null) !== (r.rpm === null)) {
    ctx.addIssue({code: 'custom', path: ['rpm'], message: '측정값은 파노·RPM 쌍으로만 존재합니다'})
  } else if (r.panoHz !== null && r.rpm !== Math.round(r.panoHz * 60)) {
    ctx.addIssue({code: 'custom', path: ['rpm'], message: 'RPM은 파노 × 60 반올림 정수여야 합니다'}) // CP-2/A2
  }
}

export const runRecordSchema = z
  .object({
    id: z.uuid(), // 구조 필드 — 불변
    motorId: z.uuid(), // FK 구조 필드 — dangling 금지 (INV-03, REQ-ST-007)
    voltage: voltageSchema,
    panoHz: panoHzSchema.nullable(), // D2 확정: 측정 없이 null 허용
    rpm: z.number().int().positive().nullable(),
    result: runResultSchema,
    satisfied: z.boolean(), // 가이드 집계의 유일 원천 — result와 독립 (INV-10)
    createdAt: z.iso.datetime(), // 구조 필드 — 시간 역순 정렬 키 (FP-A3)
  })
  .superRefine(measurementPairInvariant)
export type RunRecord = z.infer<typeof runRecordSchema>

// command 입력 — id/createdAt은 command가 생성 (FP-A3)
export const createRecordDraftSchema = z
  .object({
    motorId: z.uuid(),
    voltage: voltageSchema,
    panoHz: panoHzWriteSchema.nullable().default(null),
    rpm: z.number().int().positive().nullable().default(null),
    result: runResultSchema,
    satisfied: z.boolean(),
  })
  .superRefine(measurementPairInvariant)
export type CreateRecordDraft = z.input<typeof createRecordDraftSchema>

/**
 * read 경계 rehydrate 검증 (INV-16) — persisted 행을 zod parse하고,
 * 실패는 'data-corrupt'로 throw한다(D-10 — 빈 목록 위장 금지, query throw 채널).
 */
export function parseRunRecordRow(row: unknown): RunRecord {
  const parsed = runRecordSchema.safeParse(row)
  if (!parsed.success) {
    throw new DomainError('data-corrupt', DOMAIN_ERROR_MESSAGES['data-corrupt'], {
      cause: parsed.error,
    })
  }
  return parsed.data
}
