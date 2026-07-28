// motor-management model segment public API (form-state-builder 소유).
// count 조회 → ConfirmDialog → command 조립 훅 2종 — 새 컴포넌트 아님 (component-spec §1.3).
// mutation 훅(useMutation)은 api 세그먼트(feature-mutation-builder) 소관 — command 실행자는
// 옵션으로 주입받는다(중복 정의 금지).
export {MOTOR_DELETE_COUNT_ERROR_MESSAGE, useMotorDeleteFlow} from './use-motor-delete-flow'
export type {
  MotorDeleteFlow,
  MotorDeleteTarget,
  UseMotorDeleteFlowOptions,
} from './use-motor-delete-flow'
export {useRecordDeleteFlow} from './use-record-delete-flow'
export type {RecordDeleteFlow, UseRecordDeleteFlowOptions} from './use-record-delete-flow'
