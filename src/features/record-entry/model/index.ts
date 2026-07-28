// record-entry model segment public API (form-state-builder 소유).
// 폼 zod 스키마 + 로컬 폼 상태만 — mutation 훅(useMutation)은 api 세그먼트
// (feature-mutation-builder) 소관이며 여기서 정의하지 않는다.
export {
  RECORD_ENTRY_MESSAGES,
  createInitialRecordEntryValues,
  mapCommandFieldErrors,
  validateRecordEntryForm,
  voltageInputSchema,
} from './schema'
export type {
  RecordEntryFieldErrors,
  RecordEntryFormValues,
  RecordEntryMeasurement,
  RecordEntryValidation,
} from './schema'
export {useRecordEntryForm} from './use-record-entry-form'
export type {
  RecordEntryFormController,
  RecordEntrySubmitStatus,
  UseRecordEntryFormOptions,
} from './use-record-entry-form'
