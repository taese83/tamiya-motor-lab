// motor-management ui segment public API (component-builder 소유).
// useMotorDeleteFlow/useRecordDeleteFlow(model 조립 훅)는 후속 owner가 추가한다.
// 참고: MotorListItem·GradeChip은 component-spec §1.2에서 entities/motor/ui 소유였으나
// 본 wave 소유 경계(entities 금지)에 따라 이 slice에 배치 — 이관 여부는 entity owner 판단.
export {MotorFormSheet} from './MotorFormSheet'
export type {MotorFormSheetProps, MotorFormValues} from './MotorFormSheet'
export {MotorListItem} from './MotorListItem'
export type {MotorListItemProps, MotorSummaryView} from './MotorListItem'
export {GradeChip} from './GradeChip'
export type {GradeChipProps} from './GradeChip'
