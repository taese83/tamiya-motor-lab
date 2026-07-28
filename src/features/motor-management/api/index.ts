// motor-management api segment public API (feature-mutation-builder 소유) —
// mutation 훅과 변수/응답 타입만 export. UI 배선은 후속 빌더 소관.
export {useCreateMotor, useDeleteMotorCascade, useUpdateMotor} from './mutations'
export type {DeleteMotorCascadeResult, UpdateMotorVariables} from './mutations'
