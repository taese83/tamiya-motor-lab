// entities/measurement 공개 API (F3) — 명시적 named export만, export * 금지.
// 비영속 in-memory single-slot handoff(측정 S1 → 기록 입력 S2) — IndexedDB 미접촉이라
// repository/query/key factory 없음, 동기 command 3건 + 스키마·타입뿐 (state-contract INV-14).
// slot store 인스턴스는 비공개 — command 3건 외 slot 접근 경로 없음.
export {measurementPanoHzSchema, measurementSchema} from './model/schema'
export type {Measurement} from './model/schema'
export {
  clearConfirmedMeasurement,
  setConfirmedMeasurement,
  takeConfirmedMeasurement,
} from './model/store'
