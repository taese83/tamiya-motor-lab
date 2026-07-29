import {useMutation, useQueryClient} from '@tanstack/react-query'

import {measureKeys} from '@entities/measure-record'
import {motorKeys} from '@entities/motor'
import {createRaceRecord, deleteRaceRecord, raceKeys} from '@entities/race-record'
import {isDomainError} from '@shared/lib/errors'
import {resetAllRecords} from '@shared/lib/persistence'
import {unwrap} from '@shared/lib/result'

import type {CreateRaceRecordDraft, RaceRecord} from '@entities/race-record'
import type {DomainError} from '@shared/lib/errors'

// RaceRecord mutation 훅 3건 (v2 — F6-R: 생성 R-3/R-4 · 개별 삭제 RV-A3 · 전체 초기화 RV-A4).
// RaceRecord는 immutable — update mutation은 존재하지 않는다 (INV-05).
// 채널 규약: repository/persistence command의 Result<T, DomainError>를 unwrap()으로 통과시켜
// 실패를 throw로 변환 — useMutation error 채널 접속. invalidation은 §6.4 매트릭스 그대로
// commit 성공(onSuccess) 시에만 수행 — 실패/abort 시 캐시 불변 (state-contract §Derived view 무결성).
// 파생 값(요약·최근 기록)은 invalidation으로만 갱신 — setQueryData·optimistic update 금지
// (§6.4 어댑터 규약, 삭제·초기화는 확인 응답 후 반영). 제출 single-flight 가드·confirm은 UI/model 소관.
// TanStack Query 로컬 정책(networkMode·retry)은 query-client 전역 설정 소관 — 재정의 금지.

/** resetAllRecords 응답 — clear 직전 같은 tx의 실측 건수 (confirm 고지·성공 토스트 표시용). */
export interface ResetAllRecordsResult {
  deletedMeasureCount: number
  deletedRaceCount: number
}

/**
 * mutation: createRaceRecord (레이스 기록 저장 — R-3·R-4).
 * §6.4: 성공 시 raceKeys.byMotor(motorId)(해당 모터 목록) · motorKeys.summaries()(파생 요약)
 * invalidate — Promise return으로 invalidation 완료까지 pending 유지.
 * not-found(motor 부재 — 동시 탭 선삭제) 시 stale 모터 목록 정정을 위해 motorKeys.root 추가
 * invalidate. 폼 입력 유지 + [다시 저장]은 UI 계약.
 */
export const useCreateRaceRecord = () => {
  const queryClient = useQueryClient()
  return useMutation<RaceRecord, DomainError, CreateRaceRecordDraft>({
    mutationFn: async draft => unwrap(await createRaceRecord(draft)),
    onSuccess: record =>
      Promise.all([
        queryClient.invalidateQueries({queryKey: raceKeys.byMotor(record.motorId)}),
        queryClient.invalidateQueries({queryKey: motorKeys.summaries()}),
      ]),
    onError: error => {
      if (isDomainError(error) && error.code === 'not-found') {
        return queryClient.invalidateQueries({queryKey: motorKeys.root})
      }
      return undefined
    },
  })
}

/**
 * mutation: deleteRaceRecord (RV-A3 — destructive, confirm은 호출 feature UI 책임).
 * 대상 부재 시 멱등 성공 (SC-A4 — LWW 수렴, not-found 경로 없음).
 * §6.4: 성공 시 raceKeys.root · motorKeys.summaries() invalidate.
 * optimistic 완료 처리 금지 — 성공 응답 후에만 UI 반영 (삭제 계열).
 */
export const useDeleteRaceRecord = () => {
  const queryClient = useQueryClient()
  return useMutation<void, DomainError, string>({
    mutationFn: async id => unwrap(await deleteRaceRecord(id)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({queryKey: raceKeys.root}),
        queryClient.invalidateQueries({queryKey: motorKeys.summaries()}),
      ]),
  })
}

/**
 * mutation: resetAllRecords (RV-A4 — 전체 기록 초기화, destructive confirm은 UI 책임).
 * measureRecords + raceRecords 단일 tx clear — 모터는 유지 (INV-12, motors store 무접근).
 * §6.4: 성공 시 measureKeys.root · raceKeys.root · motorKeys.summaries() invalidate —
 * motors 목록·detail 캐시(motorKeys.list/detail)는 건드리지 않는다 (모터 유지 계약).
 * optimistic 완료 처리 금지 — 성공 응답 후에만 UI 반영.
 */
export const useResetAllRecords = () => {
  const queryClient = useQueryClient()
  return useMutation<ResetAllRecordsResult, DomainError, void>({
    mutationFn: async () => unwrap(await resetAllRecords()),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({queryKey: measureKeys.root}),
        queryClient.invalidateQueries({queryKey: raceKeys.root}),
        queryClient.invalidateQueries({queryKey: motorKeys.summaries()}),
      ]),
  })
}
