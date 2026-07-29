// race-measure-handoff slice public API (RV-1 왕복 — 비영속 single-slot handoff)
// 내부 전용 `_markMeasuredPending`/`_resolveMeasuredSave`는 의도적으로 미노출.
export {RaceMeasureStrip} from './ui/RaceMeasureStrip'
export type {RaceMeasureStripProps} from './ui/RaceMeasureStrip'
export {
  beginRaceMeasure,
  cancelRaceMeasure,
  consumeRaceMeasureReturn,
  peekRaceMeasure,
  useRaceMeasureSlot,
} from './model/store'
export type {RaceMeasureDraft, RaceMeasureMeasured, RaceMeasureSlot} from './model/store'
export {useRaceAutoCollect} from './model/use-race-auto-collect'
export type {RaceAutoCollectOutcome, UseRaceAutoCollectInput} from './model/use-race-auto-collect'
