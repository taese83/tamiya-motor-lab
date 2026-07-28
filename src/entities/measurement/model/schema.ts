import {z} from 'zod'

import {F0_RANGE} from '@shared/config/domain'

// Measurement 값 객체 zod 스키마 단일 정의 (api-schema §2.4 canonical, AD-7).
// 비영속 — IndexedDB에 절대 저장하지 않는다(FP-A2). rehydrate 경로가 없으므로
// SC-A8 read-lenient 이원화가 불필요 — set 경계 write-strict 단일 계약만 존재한다:
// panoHz ∈ F0_RANGE(170~620 Hz) 유한 · 소수 1자리(AS-3, F2가 확정 시 반올림) ·
// rpm === round(panoHz × 60)(CP-2).
//
// panoHz 정밀도·대역 검증은 run-record `panoHzWriteSchema`와 의미상 동일하지만
// entity 간 import 금지(FSD·eslint no-restricted-imports)로 각자 보유 —
// motor·run-record의 byCreatedAtDescIdAsc와 함께 shared/lib 승격 후보로 보고됨
// (api-schema §2.4 각주 "중복 정의 금지" 계약의 승격 경로 — 상수 F0_RANGE는 이미 1곳).

// 소수 1자리 float 안전 검사(× 10 후 정수 근접 비교, `% 1` 직접 비교 금지)
const hasPanoPrecision = (v: number): boolean => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9

export const measurementPanoHzSchema = z
  .number()
  .finite()
  .min(F0_RANGE.min, `파노는 ${F0_RANGE.min} Hz 이상이어야 합니다`)
  .max(F0_RANGE.max, `파노는 ${F0_RANGE.max} Hz 이하여야 합니다`)
  .refine(hasPanoPrecision, '파노는 소수 첫째 자리까지 저장합니다')

/**
 * stable 확정 측정값 — 전 필드 non-null: weak-signal은 f0/rpm null(INV-13)이라
 * 이 타입을 만족하는 값 자체가 존재하지 않는다 (H-5 타입 가드의 근거).
 */
export const measurementSchema = z
  .object({
    panoHz: measurementPanoHzSchema, // 엔진 DisplayEstimate.f0 — stable 확정 중앙값, 소수 1자리 반올림(F2 책임)
    rpm: z.number().int().positive(), // Math.round(panoHz × 60) — CP-2
    confidence: z.number().min(0).max(1), // 내부 게이트 판정용 — UI 비노출, RunRecord에 저장 안 함 (FP-A2)
    capturedAt: z.iso.datetime(), // stable 확정 시각 — handoff 신선도 표시용, RunRecord에 저장 안 함 (FP-A2)
  })
  .refine(m => m.rpm === Math.round(m.panoHz * 60), {
    path: ['rpm'],
    message: 'RPM은 파노 × 60 반올림 정수여야 합니다', // CP-2/A2
  })
export type Measurement = z.infer<typeof measurementSchema>
