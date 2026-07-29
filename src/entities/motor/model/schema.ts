import {z} from 'zod'

import {MOTOR_KINDS, MOTOR_NAME_MAX_LENGTH} from '@shared/config/domain'
import {DOMAIN_ERROR_MESSAGES, DomainError} from '@shared/lib/errors'

// Motor 엔티티 zod 스키마 단일 정의 (api-schema v2 §2.2 canonical, AD-7) —
// UI 인라인 검증·command precondition·rehydrate(read 경계)가 이 스키마를 공유한다.
// persisted 데이터는 외부 입력 취급: type assertion 금지 (INV-16).
// v2 제거 필드: statusGrade·statusMemo (T-1). 신설: kind(10종 enum — v2.6 light_dash 추가)·sortOrder(T-6).

export const motorKindSchema = z.enum(MOTOR_KINDS) // T-1 — 상수 1곳 참조 (@shared/config/domain)

export const motorSchema = z.object({
  id: z.uuid(), // 구조 필드 — 생성 후 불변 (INV-04)
  name: z.string().trim().min(1, '이름을 입력해 주세요').max(MOTOR_NAME_MAX_LENGTH),
  kind: motorKindSchema, // 필수 — null/생략 없음 (T-1)
  sortOrder: z.number().int().min(0), // T-6 — 리스트 순서 영속, reorderMotors 전용 변경 (INV-19)
  createdAt: z.iso.datetime(), // 구조 필드 — 불변, ISO 8601 UTC Z 고정
  updatedAt: z.iso.datetime(), // updateMotor 성공 시에만 갱신 — reorderMotors는 미갱신 (AR-3/SC2-A4)
})
export type Motor = z.infer<typeof motorSchema>

// command 입력 — 구조 필드(id·createdAt·updatedAt)와 sortOrder는 command가 부여 (AR-1: max+1 append)
//
// v2.18: name은 **옵션**이다(모터 추가 마찰 제거). 생략·공백이면 createMotor가
// `{종류 라벨} {n}`을 부여한다(nextAutoMotorName). 저장 스키마(motorSchema.name)는 여전히
// min(1)을 요구한다 — 빈 이름이 영속되는 경로는 없고, 이름 부여는 command 책임이다.
export const createMotorInputSchema = z.object({
  name: z.string().trim().max(MOTOR_NAME_MAX_LENGTH).optional(),
  kind: motorKindSchema,
})
export type CreateMotorInput = z.input<typeof createMotorInputSchema>

export const updateMotorPatchSchema = z
  .object({
    name: z.string().trim().min(1, '이름을 입력해 주세요').max(MOTOR_NAME_MAX_LENGTH),
    kind: motorKindSchema,
  })
  .partial() // 편집 필드 = name·kind만 — sortOrder는 reorderMotors 전용, 구조 필드는 타입에서 배제
export type UpdateMotorPatch = z.infer<typeof updateMotorPatchSchema>

export const reorderMotorsInputSchema = z.object({
  // 전체 모터 id의 순열 — 순열 여부(개수 일치·전건 존재·중복 없음)는 command가
  // 트랜잭션 내에서 실측 검증한다 (state-contract SO-2 — permutation 오류)
  orderedIds: z.array(z.uuid()).min(1),
})
export type ReorderMotorsInput = z.infer<typeof reorderMotorsInputSchema>

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
