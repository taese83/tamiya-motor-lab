// voltage-guide api segment public API (feature-mutation-builder 소유).
// 상태 변경 command가 없는 slice — key factory만 제공한다.
// guideQueries(guideKeys.byMotor + listSatisfiedRecords·computeGuide 합성, api-schema §6.3)는
// model/compute-guide.ts(다른 owner) 완성 후 queries.ts로 추가한다.
export {guideKeys} from './keys'
