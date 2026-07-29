// entities/motor 공개 API (v2 — F5) — 명시적 named export만, export * 금지.
// model: zod 스키마 단일 정의(AD-7) + 타입 / api: command 4 + query 4 + key·queryOptions factory.
// v2 제거: statusGrade 계열(motorStatusGradeSchema)·MotorRadioList(제거 예정 — 참조 금지).
export {
  createMotorInputSchema,
  motorKindSchema,
  motorSchema,
  parseMotorRow,
  reorderMotorsInputSchema,
  updateMotorPatchSchema,
} from './model/schema'
export type {
  CreateMotorInput,
  Motor,
  MotorSummary,
  MotorSummaryMeasure,
  MotorSummaryRace,
  ReorderMotorsInput,
  UpdateMotorPatch,
} from './model/types'
export {
  countRecordsByMotor,
  createMotor,
  deleteMotorCascade,
  getMotorById,
  listMotors,
  listMotorSummaries,
  reorderMotors,
  updateMotor,
} from './api/repository'
export {motorKeys} from './api/keys'
export {motorQueries} from './api/queries'
// ui: 모터 종류 칩 — 중립 outlined, 라벨 맵 1곳 (순수 presentational)
export {MotorKindChip} from './ui/MotorKindChip'
export type {MotorKindChipProps} from './ui/MotorKindChip'
