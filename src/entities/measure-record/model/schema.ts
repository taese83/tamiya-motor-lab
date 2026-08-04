import {z} from 'zod'

import {DOMAIN_ERROR_MESSAGES, DomainError} from '@shared/lib/errors'
import {panoHzStoredSchema, panoHzWriteSchema, panoRpmPair} from '@shared/lib/schema/pano'

// MeasureRecord 엔티티 zod 스키마 단일 정의 (api-schema v2 §2.3 canonical, AD-7).
// 생성 경로는 collectMeasureRecord 단일 command뿐(INV-22) — R51에서 파노 수동 입력을 허용하되
// 같은 command에 source:'manual'로 태깅해 단일 경로를 유지한다(수정 command는 여전히 없다).
// 삭제는 rolling 자동 삭제(T-3)·개별 삭제(v2.38)·cascade·resetAllRecords/resetAllData.
// persisted 데이터는 외부 입력 취급 — type assertion 금지 (INV-16).
// panoHz는 SC-A8 이원화: write-strict(F0_RANGE+소수 1자리) / read-lenient(유한 양수 ≤2,000).
// 쌍 불변식 rpm === round(panoHz×60)은 양쪽 모두 엄격 (INV-06).

// 회전 안정도 CV(컨디션 지표, v2.x) — optional additive: 지표 도입 전 기록에는 없다.
// write는 [0, 1) sanity(CV 100% 이상은 측정값으로 무의미), read는 유한 음수 아님 완화.
const stabilityCvWriteSchema = z.number().min(0).lt(1)
const stabilityCvStoredSchema = z.number().min(0).finite()

// rehydrate(read-lenient) — 저장 데이터 검증
export const measureRecordSchema = z
  .object({
    id: z.uuid(), // 구조 필드 — 불변
    motorId: z.uuid(), // FK 구조 필드 — dangling 금지 (INV-03)
    panoHz: panoHzStoredSchema, // SC-A8 완화 (유한 양수 ≤2,000)
    rpm: z.number().int().positive(),
    measuredAt: z.iso.datetime(), // 구조 필드 — 차트 X축·rolling 삭제 순서 키
    stabilityCv: stabilityCvStoredSchema.optional(), // v2.x additive — 구 기록 부재 허용
    // R51 additive — 생성 출처. 부재/'measured'=실측(구 레코드 포함), 'manual'=파노 수동 입력.
    source: z.enum(['manual', 'measured']).optional(),
  })
  .refine(panoRpmPair, {path: ['rpm'], message: 'RPM은 파노 × 60 반올림 정수여야 합니다'})
export type MeasureRecord = z.infer<typeof measureRecordSchema>

// command 입력(write-strict) — id/measuredAt은 command가 생성. panoHz·rpm은 F2 stable 확정값
export const collectMeasureInputSchema = z
  .object({
    motorId: z.uuid(),
    panoHz: panoHzWriteSchema, // F0_RANGE 엄격 + 소수 1자리 (AS-3)
    rpm: z.number().int().positive(),
    stabilityCv: stabilityCvWriteSchema.optional(), // 수집 시점 CV — 창 미충족이면 생략
    // R51 — 수동 입력이면 'manual'. 생략 시 실측(measured) 취급(저장은 manual일 때만 — 옵션 생략 규칙).
    source: z.enum(['manual', 'measured']).optional(),
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
