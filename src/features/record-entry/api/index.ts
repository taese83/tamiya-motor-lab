// record-entry api segment public API (feature-mutation-builder 소유) —
// mutation 훅만 export (updateRecord 부재 — RunRecord immutable, FP-A4).
// 입력/응답 타입(CreateRecordDraft·RunRecord)은 @entities/run-record 공개 API를 그대로 사용한다.
export {useCreateRecord, useDeleteRecord} from './mutations'
