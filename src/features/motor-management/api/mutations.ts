import {useMutation, useQueryClient} from '@tanstack/react-query'

import {createMotor, deleteMotorCascade, motorKeys, reorderMotors, updateMotor} from '@entities/motor'
import {measureKeys} from '@entities/measure-record'
import {raceKeys} from '@entities/race-record'
import {isDomainError} from '@shared/lib/errors'
import {unwrap} from '@shared/lib/result'

import type {CreateMotorInput, Motor, UpdateMotorPatch} from '@entities/motor'
import type {DomainError} from '@shared/lib/errors'

// Motor mutation 훅 4건 (v2 — T-1/T-6, api-schema v2 §6 invalidation 매트릭스).
// 채널 규약: repository command의 Result<T, DomainError>를 unwrap()으로 통과시켜 실패를 throw로
// 변환 — useMutation error 채널에 접속. invalidation은 commit 성공(onSuccess) 시에만 —
// 실패/abort 시 캐시 불변. setQueryData·optimistic update 금지(삭제 계열은 확인 응답 후 반영).
// networkMode 'always'·retry false는 query-client 전역 설정 소관 — 재정의 금지.

/** updateMotor 변수 — patch는 편집 필드(name·kind)만 (INV-04, sortOrder는 reorderMotors 전용). */
export interface UpdateMotorVariables {
  id: string
  patch: UpdateMotorPatch
}

/** deleteMotorCascade 응답 — confirm 후 실제 삭제된 기록 건수 합산 (tx 내 실측치). */
export interface DeleteMotorCascadeResult {
  deletedRecordCount: number
}

/** mutation: createMotor (모터 등록 시트 — name+kind, sortOrder는 command가 말미 부여). */
export const useCreateMotor = () => {
  const queryClient = useQueryClient()
  return useMutation<Motor, DomainError, CreateMotorInput>({
    mutationFn: async input => unwrap(await createMotor(input)),
    onSuccess: () => queryClient.invalidateQueries({queryKey: motorKeys.root}),
  })
}

/**
 * mutation: updateMotor (수정 시트 — name·kind).
 * not-found(동시 탭 선삭제) 시에도 stale 목록 정정을 위해 motorKeys.root invalidate.
 */
export const useUpdateMotor = () => {
  const queryClient = useQueryClient()
  return useMutation<Motor, DomainError, UpdateMotorVariables>({
    mutationFn: async ({id, patch}) => unwrap(await updateMotor(id, patch)),
    onSuccess: () => queryClient.invalidateQueries({queryKey: motorKeys.root}),
    onError: error => {
      if (isDomainError(error) && error.code === 'not-found') {
        return queryClient.invalidateQueries({queryKey: motorKeys.root})
      }
      return undefined
    },
  })
}

/**
 * mutation: deleteMotorCascade (destructive — confirm은 호출 UI 책임, n·m 분리 실측 고지).
 * cascade로 측정·레이스 기록이 함께 삭제되므로 세 키 전부 invalidate (INV-03).
 */
export const useDeleteMotorCascade = () => {
  const queryClient = useQueryClient()
  return useMutation<DeleteMotorCascadeResult, DomainError, string>({
    mutationFn: async id => unwrap(await deleteMotorCascade(id)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({queryKey: motorKeys.root}),
        queryClient.invalidateQueries({queryKey: measureKeys.root}),
        queryClient.invalidateQueries({queryKey: raceKeys.root}),
      ]),
  })
}

/**
 * mutation: reorderMotors (T-6 DnD — id 순열 전달, 단일 tx 재부여).
 * 성공·실패 모두 목록 정정 invalidate — permutation 실패(동시 탭 변경 감지) 시
 * stale 순서를 그대로 두면 드래그 결과가 화면과 어긋난 채 남는다.
 */
export const useReorderMotors = () => {
  const queryClient = useQueryClient()
  return useMutation<void, DomainError, string[]>({
    mutationFn: async orderedIds => unwrap(await reorderMotors({orderedIds})),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({queryKey: motorKeys.list()}),
        queryClient.invalidateQueries({queryKey: motorKeys.summaries()}),
      ]),
    onError: () => queryClient.invalidateQueries({queryKey: motorKeys.root}),
  })
}
