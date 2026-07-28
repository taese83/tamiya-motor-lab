// entities/motor 공개 API (F5·F7) — 명시적 named export만, export * 금지.
// model: zod 스키마 단일 정의(AD-7) + z.infer 타입 / api: command 3 + query 3 + key·queryOptions factory.
// model/store·selectors·invariants는 이후 client-domain-state-builder 소관 — 이 slice에 아직 없음.
export {
  createMotorInputSchema,
  motorSchema,
  motorStatusGradeSchema,
  parseMotorRow,
  updateMotorPatchSchema,
} from './model/schema'
export type {CreateMotorInput, Motor, UpdateMotorPatch} from './model/types'
export {
  countRecordsByMotor,
  createMotor,
  deleteMotorCascade,
  getMotorById,
  listMotors,
  updateMotor,
} from './api/repository'
export {motorKeys} from './api/keys'
export {motorQueries} from './api/queries'
// ui: 표시 전용 모터 선택 라디오 (component-spec §4.2) — S2·S5 공용, 순수 presentational.
export {MotorRadioList} from './ui/MotorRadioList'
export type {MotorRadioListProps, MotorRadioOption} from './ui/MotorRadioList'
