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
  // R38: canonical과 정합 — 결과 미정("레이스 전 세팅") 레이스는 result 부재. undefined 포함(exactOptional 대입 호환)
  result?: RaceResult | undefined
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
  /**
   * R41 ④ — 최근 완주(result==='finished') 레이스 projection. 레이스 목록 우측에 "완주 시 전압·파노"를
   * 노출하기 위한 파생(가장 최근 완주 1건, max createdAt·동률 id 최대). 완주 0건이면 부재.
   * lastRace(결과 무관 최신)와 별개 — 이탈이 최신이어도 완주 기준점은 이 필드가 유지한다.
   */
  lastFinishedRace?: MotorSummaryRace
  /**
   * v2.12: 목록 스파크라인용 파노 추세 — measuredAt 오름차순(오래된→최신), ≤MEASURE_RECORD_LIMIT.
   * 기록 0건이면 빈 배열. listMotorSummaries가 이미 measureRecords 전건을 메모리로 읽어
   * 롤업하므로 추가 IO는 없다. 표시 포맷·단위는 소비 UI 소관 — 여기는 원시 panoHz 수열만 전달한다.
   */
  panoTrend: ReadonlyArray<number>
}
