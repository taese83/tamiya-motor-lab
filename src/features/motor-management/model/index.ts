// motor-management model segment public API (form-state-builder 소유).
// count 조회 → ConfirmDialog → command 조립 훅 2종 — 새 컴포넌트 아님 (component-spec §1.3).
// mutation 훅(useMutation)은 api 세그먼트(feature-mutation-builder) 소관 — command 실행자는
// 옵션으로 주입받는다(중복 정의 금지).
export {useMotorKindFilter} from './use-motor-kind-filter'
export type {MotorKindFilter, MotorKindFilterOption} from './use-motor-kind-filter'
// v2.17 — 종류 필터는 모터·레이스 두 화면이 공유하는 영속 상태다. store 자체는 비공개로 두고
// 소비는 useMotorKindFilter 경유로 고정한다(선택 상태의 출처를 하나로 유지).
// normalizeKinds만 노출 — 영속 값 정규화 규칙은 단위 테스트 대상이다.
export {normalizeKinds} from './kind-filter-store'
export {MOTOR_DELETE_COUNT_ERROR_MESSAGE, useMotorDeleteFlow} from './use-motor-delete-flow'
export type {
  MotorDeleteFlow,
  MotorDeleteTarget,
  MotorRecordCounts,
  UseMotorDeleteFlowOptions,
} from './use-motor-delete-flow'
