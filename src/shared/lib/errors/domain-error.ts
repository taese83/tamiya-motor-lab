import type {z} from 'zod'

import {DOMAIN_ERROR_MESSAGES} from './messages'

// DomainError Taxonomy (api-schema §3) — HTTP 없음: 상태 코드·axios 매핑 해당 없음.
// 유일한 오류 채널: command는 Result<T, DomainError> 봉투, query는 DomainError throw.
export type DomainErrorCode =
  // ── persistence·command 계열 (Result 봉투로 전파)
  | 'validation' // zod/precondition 실패 — fieldErrors 동반
  | 'not-found' // 대상 entity 부재 (update/delete/FK 확인)
  | 'storage-unavailable' // IndexedDB open 불가 — private 모드 등 (C-5)
  | 'quota-exceeded' // 쓰기 quota 초과 (C-4)
  | 'transaction-failed' // 트랜잭션 abort — 부분 반영 없음 보장 (C-3/C-4)
  | 'data-corrupt' // rehydrate zod 검증 실패·migration 불가 (C-6)
  // ── capture 계열 (F2 상태 머신이 MeasureStatus로 매핑 — 전역 오류 UI로 보내지 않음)
  | 'capture-insecure-context' // isSecureContext===false (D-4)
  | 'capture-permission-denied' // 일시 거부 (D-2)
  | 'capture-permission-denied-permanent' // 영구 거부 — Permissions API 가용 시 감지, iOS fallback: 재요청 실패 반복 시 승격 (D-3, CP F-2)
  | 'capture-suspended' // AudioContext.state !== 'running' (D-5)
  | 'capture-device-error' // 마이크 장치 없음·getUserMedia 기타 실패

export class DomainError extends Error {
  readonly code: DomainErrorCode
  readonly fieldErrors?: Readonly<Record<string, string>>
  constructor(
    code: DomainErrorCode,
    message: string,
    options?: {cause?: unknown; fieldErrors?: Record<string, string>},
  ) {
    super(message, {cause: options?.cause})
    this.name = 'DomainError'
    this.code = code
    if (options?.fieldErrors) this.fieldErrors = options.fieldErrors
  }
}

export const isDomainError = (e: unknown): e is DomainError => e instanceof DomainError

/** z.ZodError → DomainError('validation') — issue.path → fieldErrors 매핑 (경로별 첫 메시지 유지) */
export function fromZodError(error: z.ZodError): DomainError {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const path = issue.path.map(String).join('.')
    if (!(path in fieldErrors)) fieldErrors[path] = issue.message
  }
  return new DomainError('validation', DOMAIN_ERROR_MESSAGES.validation, {
    cause: error,
    fieldErrors,
  })
}
