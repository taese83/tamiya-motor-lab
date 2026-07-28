import type {RunRecord} from './schema'

// RunRecord 도메인 타입 재수출 + 파생 view 타입 (api-schema §2.5·§9).
export type {CreateRecordDraft, RunRecord} from './schema'

/**
 * records 단독 스캔으로 만드는 모터별 집계 (파생 값 — 영속·캐시 금지, INV-09 / FP-A1).
 * rollup 항목은 기록이 1건 이상인 모터에만 존재한다 — 따라서 lastRecord는 항상 있다.
 */
export interface MotorRecordRollup {
  recordCount: number
  lastRecord: RunRecord // max createdAt(동률 시 id 오름차순 우선) — "최근 사용순" 정렬 키 원천
}

/**
 * S3 카드용 파생 view (api-schema §2.5 MotorSummary).
 * entity 간 import 금지(FSD)로 Motor 타입을 직접 참조하지 않고 구조 최소 요구만 제약한다 —
 * 상위 레이어가 MotorSummaryOf<Motor>로 인스턴스화한다 (composeMotorSummaries 참조).
 */
export interface MotorSummaryMotorRef {
  id: string
  createdAt: string
}

export interface MotorSummaryOf<M extends MotorSummaryMotorRef> {
  motor: M
  recordCount: number
  lastRecord?: RunRecord // 기록 없는 모터는 생략 — undefined 필드 저장 금지 규칙과 정합
}
