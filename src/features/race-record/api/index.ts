// race-record api segment public API (feature-mutation-builder 소유) —
// mutation 훅 + 응답/변수 타입만 export. v2.3: update 훅 추가(result·voltage·lapTimeMs 편집).
// 입력/응답 타입(CreateRaceRecordDraft·RaceRecord·UpdateRaceRecordPatch)은 @entities/race-record 공개 API를 그대로 사용한다.
export {
  useCreateRaceRecord,
  useDeleteRaceRecord,
  useResetMotorRaceRecords,
  useUpdateRaceRecord,
} from './mutations'
export type {ResetRaceRecordsResult, UpdateRaceRecordVariables} from './mutations'
