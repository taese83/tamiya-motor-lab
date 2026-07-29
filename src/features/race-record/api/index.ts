// race-record api segment public API (feature-mutation-builder 소유) —
// mutation 훅 + 응답 타입만 export (update 부재 — RaceRecord immutable, INV-05).
// 입력/응답 타입(CreateRaceRecordDraft·RaceRecord)은 @entities/race-record 공개 API를 그대로 사용한다.
export {useCreateRaceRecord, useDeleteRaceRecord, useResetMotorRecords} from './mutations'
export type {ResetAllRecordsResult} from './mutations'
