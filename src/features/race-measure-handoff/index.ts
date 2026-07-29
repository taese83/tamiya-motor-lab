// race-measure-handoff slice public API (RV-1 왕복 — 비영속 single-slot handoff)
// 내부 전용 `_markMeasuredPending`/`_resolveMeasuredSave`는 의도적으로 미노출.
// v2.5: 진입점이 레이스·모터 2곳이라 slot에 origin 판별자가 있다(slice 이름은 유지 — 디렉토리
// rename은 이번 요청 범위 밖이며 별도 정리 대상).
export {RaceMeasureStrip} from './ui/RaceMeasureStrip'
export type {RaceMeasureStripProps} from './ui/RaceMeasureStrip'
export {
  beginMotorMeasure,
  beginRaceMeasure,
  cancelRaceMeasure,
  consumeRaceMeasureReturn,
  peekRaceMeasure,
  useRaceMeasureSlot,
} from './model/store'
export type {
  MeasureHandoffOrigin,
  RaceMeasureDraft,
  RaceMeasureMeasured,
  RaceMeasureSlot,
} from './model/store'
export {useRaceAutoCollect} from './model/use-race-auto-collect'
export type {RaceAutoCollectOutcome, UseRaceAutoCollectInput} from './model/use-race-auto-collect'
