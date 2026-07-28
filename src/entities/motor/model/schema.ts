import {z} from 'zod'

import {MOTOR_MEMO_MAX_LENGTH, MOTOR_NAME_MAX_LENGTH, MOTOR_STATUS_GRADES} from '@shared/config/domain'
import {DOMAIN_ERROR_MESSAGES, DomainError} from '@shared/lib/errors'

// Motor 엔티티 zod 스키마 단일 정의 (api-schema §2.2 canonical, AD-7) —
// UI 인라인 검증·command precondition·rehydrate(read 경계)가 이 스키마를 공유한다.
// persisted 데이터는 외부 입력 취급: type assertion 금지 (INV-16, REQ-F-007/NFR-006).

export const motorStatusGradeSchema = z.enum(MOTOR_STATUS_GRADES) // CP-1a — 상수 1곳 참조

export const motorSchema = z.object({
  id: z.uuid(), // 구조 필드 — 생성 후 불변 (INV-04)
  name: z.string().trim().min(1, '이름을 입력해 주세요').max(MOTOR_NAME_MAX_LENGTH),
  statusGrade: motorStatusGradeSchema.nullable(), // CP-1: 선택형 enum — null=미지정 (SC-A1)
  statusMemo: z.string().trim().min(1).max(MOTOR_MEMO_MAX_LENGTH).optional(), // CP-1: 자유 텍스트 병행 — '' 저장 금지(생략)
  createdAt: z.iso.datetime(), // 구조 필드 — 불변, ISO 8601 UTC Z 고정 (FP-A3)
  updatedAt: z.iso.datetime(), // updateMotor 성공 시에만 갱신 (INV-04)
})
export type Motor = z.infer<typeof motorSchema>

// command 입력 — 구조 필드(id·createdAt·updatedAt)는 타입 차원에서 배제 (FP-A3)
export const createMotorInputSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요').max(MOTOR_NAME_MAX_LENGTH),
  statusGrade: motorStatusGradeSchema.nullable().default(null),
  statusMemo: z
    .string()
    .trim()
    .max(MOTOR_MEMO_MAX_LENGTH)
    .optional()
    .transform(v => (v === '' ? undefined : v)), // 빈 문자열 → 생략 정규화 ('' 저장 금지)
})
export type CreateMotorInput = z.input<typeof createMotorInputSchema>

export const updateMotorPatchSchema = z
  .object({
    name: z.string().trim().min(1, '이름을 입력해 주세요').max(MOTOR_NAME_MAX_LENGTH),
    statusGrade: motorStatusGradeSchema.nullable(), // null 지정 = 등급 해제(재탭 deselect → 미지정 복귀)
    statusMemo: z
      .string()
      .trim()
      .max(MOTOR_MEMO_MAX_LENGTH)
      .optional()
      .transform(v => (v === '' ? undefined : v)),
  })
  .partial() // 편집 필드만 — 구조 필드 불변식(INV-04)은 스키마가 강제
export type UpdateMotorPatch = z.infer<typeof updateMotorPatchSchema>

/**
 * read 경계 rehydrate 검증 (INV-16) — persisted 행을 zod parse하고,
 * 실패는 'data-corrupt'로 throw한다(D-10 — 빈 목록 위장 금지, query throw 채널).
 */
export function parseMotorRow(row: unknown): Motor {
  const parsed = motorSchema.safeParse(row)
  if (!parsed.success) {
    throw new DomainError('data-corrupt', DOMAIN_ERROR_MESSAGES['data-corrupt'], {
      cause: parsed.error,
    })
  }
  return parsed.data
}
