import {DOMAIN_ERROR_MESSAGES, DomainError, isDomainError} from '@shared/lib/errors'

// DOMException 'QuotaExceededError' 판별 — instanceof 대신 name 기준
// (브라우저 간 생성자 차이·fake-indexeddb 환경을 모두 포괄, state-contract §quota budget)
const isQuotaExceeded = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'name' in e && e.name === 'QuotaExceededError'

/**
 * IDB 실패 → typed DomainError 매핑 (api-schema §3 taxonomy — 신규 코드 발명 금지).
 * - fn이 던진 DomainError(not-found 등 도메인 판정)는 그대로 보존한다
 * - QuotaExceededError → 'quota-exceeded' (C-4: 입력 유지 + [다시 저장], 성공 오표시 금지)
 * - 그 외 IO/abort → 'transaction-failed' (부분 반영 없음 보장 — C-3)
 */
export function mapStorageError(e: unknown): DomainError {
  if (isDomainError(e)) return e
  if (isQuotaExceeded(e)) {
    return new DomainError('quota-exceeded', DOMAIN_ERROR_MESSAGES['quota-exceeded'], {cause: e})
  }
  return new DomainError('transaction-failed', DOMAIN_ERROR_MESSAGES['transaction-failed'], {cause: e})
}
