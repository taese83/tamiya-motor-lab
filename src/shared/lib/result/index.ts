import type {DomainError} from '@shared/lib/errors'

// 채널 규약 (api-schema §"채널 규약") — 이 앱의 유일한 응답 봉투.
// command(mutation): Result<T, DomainError> 반환 — 실패를 값으로 전파, throw로 UI를 관통하지 않는다.
// query(read): 성공 값을 직접 반환하고 실패는 DomainError를 throw — TanStack Query error 상태로 수렴.
export type Result<T, E = DomainError> = {ok: true; value: T} | {ok: false; error: E}

export const ok = <T>(value: T): Result<T, never> => ({ok: true, value})
export const err = <E>(error: E): Result<never, E> => ({ok: false, error})

/** mutationFn 어댑터: ok:false면 DomainError를 throw — useMutation error 채널 접속용 */
export function unwrap<T>(result: Result<T, DomainError>): T {
  if (!result.ok) throw result.error
  return result.value
}
