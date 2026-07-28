// voltage-guide model segment public API (form-state-builder 소유).
// computeGuide는 IO 0건 순수 함수 — api 세그먼트의 guideQueries가
// listSatisfiedRecords 결과와 합성해 소비한다 (api-schema §6.3).
export {computeGuide} from './compute-guide'
export type {GuideDistributionEntry, GuideResult} from './compute-guide'
