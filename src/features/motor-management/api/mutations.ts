import {useMutation, useQueryClient} from '@tanstack/react-query'

import {createMotor, deleteMotorCascade, motorKeys, updateMotor} from '@entities/motor'
import {recordKeys} from '@entities/run-record'
import {isDomainError} from '@shared/lib/errors'
import {unwrap} from '@shared/lib/result'

import type {CreateMotorInput, Motor, UpdateMotorPatch} from '@entities/motor'
import type {DomainError} from '@shared/lib/errors'

// Motor mutation 훅 3건 (F5 — REQ-F-003, REQ-ST-007/CP-3).
// 채널 규약(api-schema §"채널 규약"): repository command의 Result<T, DomainError>를 unwrap()으로
// 통과시켜 실패를 throw로 변환 — useMutation error 채널에 접속한다.
// invalidation은 §6.4 매트릭스 그대로, commit 성공(onSuccess) 시에만 수행 — 실패/abort 시 캐시 불변
// (state-contract §Derived view 무결성). 파생 값(기록 수·최근 요약·추천 범위)은 invalidation으로만
// 갱신 — 수동 캐시 조작(setQueryData)·optimistic update 금지 (§6.4 어댑터 규약, 삭제는 확인 응답 후 반영).
// TanStack Query 로컬 정책(networkMode 'always'·retry false)은 query-client 전역 설정 소관 — 재정의 금지.

// features/voltage-guide/api/keys.ts guideKeys.root(['guide'])의 계약 미러 상수 —
// feature 간 직접 import 금지(eslint FSD 경계)로 값을 미러링한다.
// 값 변경 시 guideKeys.root·api-schema §6.2·record-entry 미러와 동시 갱신 (keys.ts 주석 참조).
const GUIDE_ROOT_KEY = ['guide'] as const

/** updateMotor 변수 — patch는 편집 필드(name·statusGrade·statusMemo)만 (INV-04). */
export interface UpdateMotorVariables {
  id: string
  patch: UpdateMotorPatch
}

/** deleteMotorCascade 응답 — confirm 후 실제 삭제된 기록 건수 (tx 내 실측치, CP-3). */
export interface DeleteMotorCascadeResult {
  deletedRecordCount: number
}

/**
 * mutation: createMotor (S3 등록 시트).
 * §6.4: 성공 시 motorKeys.root invalidate (list·detail·summaries 전체 하위 키 포함).
 * validation 실패의 fieldErrors 인라인 표시(H-2)는 폼 UI 소관.
 */
export const useCreateMotor = () => {
  const queryClient = useQueryClient()
  return useMutation<Motor, DomainError, CreateMotorInput>({
    mutationFn: async input => unwrap(await createMotor(input)),
    onSuccess: () => queryClient.invalidateQueries({queryKey: motorKeys.root}),
  })
}

/**
 * mutation: updateMotor (S3/S4 수정 시트).
 * §6.4: 성공 시 motorKeys.root invalidate.
 * not-found(동시 탭 선삭제 — C-8) 시에도 stale 목록 정정을 위해 motorKeys.root invalidate
 * (§3 매핑: "토스트 + 관련 query invalidate"). draft 유지·오류 표시는 UI 소관.
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
 * mutation: deleteMotorCascade (S3/S4 confirm — destructive).
 * confirm("기록 n건이 함께 삭제됩니다", n=countRecordsByMotor 직전 실측치)은 호출 feature UI 책임.
 * §6.4: 성공 시 motorKeys.root · recordKeys.root · guideKeys.root 전부 invalidate —
 * cascade로 기록·가이드 파생값이 함께 변하기 때문 (INV-03/INV-10).
 * optimistic 완료 처리 금지 — 성공 응답 후에만 UI 반영 (삭제 계열).
 */
export const useDeleteMotorCascade = () => {
  const queryClient = useQueryClient()
  return useMutation<DeleteMotorCascadeResult, DomainError, string>({
    mutationFn: async id => unwrap(await deleteMotorCascade(id)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({queryKey: motorKeys.root}),
        queryClient.invalidateQueries({queryKey: recordKeys.root}),
        queryClient.invalidateQueries({queryKey: GUIDE_ROOT_KEY}),
      ]),
  })
}
