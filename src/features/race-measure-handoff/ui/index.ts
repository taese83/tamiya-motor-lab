// race-measure-handoff ui segment 공개 API — 명시적 named export만, export * 금지.
// slice 루트 index.ts 조립(model store·use-race-auto-collect 재수출 포함)은 slice owner 소관 —
// 본 segment는 ui만 소유한다. handoff store 계약은 state-contract v2 §레이스 [측정] 왕복 계약 참조.
export {RaceMeasureStrip} from './RaceMeasureStrip'
export type {RaceMeasureStripProps} from './RaceMeasureStrip'
