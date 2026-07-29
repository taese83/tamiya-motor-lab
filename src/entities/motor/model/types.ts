// Motor 도메인 타입 (api-schema v2 §2.2·§2.5) — 스키마 정의는 schema.ts 1곳,
// 타입만 소비하는 쪽은 이 모듈을 import한다.
import type {RaceResult} from '@shared/config/domain'
import type {Motor} from './schema'

export type {CreateMotorInput, Motor, ReorderMotorsInput, UpdateMotorPatch} from './schema'

// ── MotorSummary 파생 view (api-schema §2.5 — 영속·캐시 금지, 매 조회 계산 INV-09)
//
// AR-4: entity 간 import 금지(FSD·eslint) 아래에서 MeasureRecord/RaceRecord 타입을
// 직접 참조할 수 없어, 요약이 소비하는 최소 필드를 **구조 타이핑으로 인라인**한다.
// 실제 MeasureRecord/RaceRecord와 구조 호환(동일 필드 부분집합)이라 소비자는 그대로 대입 가능.
// canonical 스키마 정의는 각 record entity의 model/schema.ts 1곳 — 여기는 projection 타입만.

/** lastMeasure projection — 모터 리스트 보조 표시 (T-4: 파노 주·rpm 부) */
export interface MotorSummaryMeasure {
  id: string
  motorId: string
  panoHz: number
  rpm: number
  measuredAt: string
}

/** lastRace projection — 레이스 진입 리스트 "마지막 레이스 요약" (R-1) */
export interface MotorSummaryRace {
  id: string
  motorId: string
  panoHz: number
  result: RaceResult
  voltage: number
  // `number | undefined` 포함 — zod .optional() infer 결과(RaceRecord)와 구조 호환
  // (exactOptionalPropertyTypes 아래 대입 가능성 유지)
  lapTimeMs?: number | undefined
  createdAt: string
}

export interface MotorSummary {
  motor: Motor
  measureCount: number // ≤ MEASURE_RECORD_LIMIT
  lastMeasure?: MotorSummaryMeasure // max measuredAt (동률 시 id 최대)
  raceCount: number
  lastRace?: MotorSummaryRace // max createdAt (동률 시 id 최대) — 부재 시 "레이스 기록 없음"
}
