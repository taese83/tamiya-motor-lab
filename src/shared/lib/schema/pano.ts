import {z} from 'zod'

import {F0_RANGE, F0_REHYDRATE_MAX} from '@shared/config/domain'

// panoHz 공유 스키마 — 정의 1곳 (api-schema v2 §2.0).
// measure-record·race-record 양쪽이 소비하므로 v2에서 shared 승격 확정 —
// entities의 중복 정의는 후속 owner가 이 파일 참조로 교체한다.
// 이원화 근거(SC-A8): write는 F0_RANGE 엄격, rehydrate는 완화 — 대역·정밀도 상수 변경이
// 기존 정상 데이터를 corrupt로 오판하지 않게 한다.

/** write-strict: 신규 측정값 수집 경로 (엔진 stable 확정값 — F0_RANGE + 소수 1자리, AS-3) */
export const panoHzWriteSchema = z
  .number()
  .min(F0_RANGE.min, `파노는 ${F0_RANGE.min} Hz 이상이어야 합니다`)
  .max(F0_RANGE.max, `파노는 ${F0_RANGE.max} Hz 이하여야 합니다`)
  .refine(v => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9, '파노는 소수 첫째 자리까지 저장합니다') // AS-3

/** read-lenient: rehydrate 경로 (SC-A8 — 유한 양수 ≤ F0_REHYDRATE_MAX(2,000)) */
export const panoHzStoredSchema = z.number().positive().finite().max(F0_REHYDRATE_MAX)

/** 쌍 불변식 — write·rehydrate 양쪽 엄격 (CP-2: rpm = 파노 × 60 반올림 정수 — INV-06) */
export const panoRpmPair = (r: {panoHz: number; rpm: number}): boolean =>
  r.rpm === Math.round(r.panoHz * 60)
