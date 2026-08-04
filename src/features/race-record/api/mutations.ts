import {useMutation, useQueryClient} from '@tanstack/react-query'

import {collectMeasureRecord, measureKeys} from '@entities/measure-record'
import {motorKeys} from '@entities/motor'
import {
  createRaceRecord,
  deleteRaceRecord,
  raceKeys,
  updateRaceRecord,
} from '@entities/race-record'
import {isDomainError} from '@shared/lib/errors'
import {resetRaceRecordsByMotor} from '@shared/lib/persistence'
import {unwrap} from '@shared/lib/result'
import {requestServerSync} from '@shared/lib/sync-signal'

import type {CreateRaceRecordDraft, RaceRecord, UpdateRaceRecordPatch} from '@entities/race-record'
import type {DomainError} from '@shared/lib/errors'

/**
 * useCollectMeasureForRace — 레이스 폼 파노 수동 입력(R51). 모터 상세 [+ 파노]와 동일하게
 * collectMeasureRecord(source:'manual')로 MeasureRecord를 생성한다(rpm=round(panoHz×60) 파생,
 * 실측 왕복·수동 입력 공통 command·rolling·검증). 성공 시 measure/summaries/detail invalidate +
 * 서버 push. FSD상 feature→entity 직접 소비이며 measure-management 훅과는 slice가 달라 별도 정의한다.
 */
export function useCollectMeasureForRace(motorId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (panoHz: number): Promise<void> => {
      unwrap(
        await collectMeasureRecord({motorId, panoHz, rpm: Math.round(panoHz * 60), source: 'manual'}),
      )
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: measureKeys.byMotor(motorId)}),
        queryClient.invalidateQueries({queryKey: motorKeys.summaries()}),
        queryClient.invalidateQueries({queryKey: motorKeys.detail(motorId)}),
      ])
      requestServerSync()
    },
  })
}

// RaceRecord mutation 훅 4건 (F6-R: 생성 R-3/R-4 · 수정 · 개별 삭제 RV-A3 · 레이스 기록 초기화).
// v2.3: RaceRecord는 result·voltage·lapTimeMs만 수정 가능 (panoHz·구조 필드는 불변 — INV-05 완화).
// 채널 규약: repository/persistence command의 Result<T, DomainError>를 unwrap()으로 통과시켜
// 실패를 throw로 변환 — useMutation error 채널 접속. invalidation은 §6.4 매트릭스 그대로
// commit 성공(onSuccess) 시에만 수행 — 실패/abort 시 캐시 불변 (state-contract §Derived view 무결성).
// 파생 값(요약·최근 기록)은 invalidation으로만 갱신 — setQueryData·optimistic update 금지
// (§6.4 어댑터 규약, 삭제·초기화는 확인 응답 후 반영). 제출 single-flight 가드·confirm은 UI/model 소관.
// TanStack Query 로컬 정책(networkMode·retry)은 query-client 전역 설정 소관 — 재정의 금지.

/** resetRaceRecordsByMotor 응답 — delete 직전 같은 tx의 실측 레이스 기록 건수 (성공 토스트 표시용). */
export interface ResetRaceRecordsResult {
  deletedRaceCount: number
}

/** updateRaceRecord 변수 — 편집 필드(result·voltage·lapTimeMs)만 patch, 구조 필드·panoHz는 불변. */
export interface UpdateRaceRecordVariables {
  id: string
  patch: UpdateRaceRecordPatch
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
 * mutation: updateRaceRecord (v2.3 — 오입력 정정. result·voltage·lapTimeMs만 갱신).
 * panoHz(측정값)·motorId·createdAt(정렬 키)은 command가 보존하므로 리스트 순서는 불변.
 * §6.4: 성공 시 raceKeys.byMotor(record.motorId) · motorKeys.summaries() invalidate.
 * not-found(동시 탭 선삭제) 시 stale 목록 정정을 위해 raceKeys.root 추가 invalidate — 시트는
 * 배너로 실패 고지 + 입력 유지(성공 위장 금지). optimistic update 금지(§6.4).
 */
export const useUpdateRaceRecord = () => {
  const queryClient = useQueryClient()
  return useMutation<RaceRecord, DomainError, UpdateRaceRecordVariables>({
    mutationFn: async ({id, patch}) => unwrap(await updateRaceRecord(id, patch)),
    onSuccess: record =>
      Promise.all([
        queryClient.invalidateQueries({queryKey: raceKeys.byMotor(record.motorId)}),
        queryClient.invalidateQueries({queryKey: motorKeys.summaries()}),
      ]),
    onError: error => {
      if (isDomainError(error) && error.code === 'not-found') {
        return queryClient.invalidateQueries({queryKey: raceKeys.root})
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
 * mutation: resetRaceRecordsByMotor (v2.3 — 사용자 결정 정정: 초기화는 **레이스 기록만** 삭제).
 * 해당 모터의 raceRecords만 단일 tx 삭제 — measureRecords(파노)·모터·타 모터 기록은 유지.
 * 성공 시 해당 모터의 raceKeys + summaries invalidate — measure 캐시·motors 목록·detail은 유지
 * (측정 기록을 건드리지 않으므로 measureKeys invalidate하지 않는다).
 * optimistic 완료 처리 금지 — 성공 응답 후에만 UI 반영.
 */
export const useResetMotorRaceRecords = () => {
  const queryClient = useQueryClient()
  return useMutation<ResetRaceRecordsResult, DomainError, string>({
    mutationFn: async motorId => unwrap(await resetRaceRecordsByMotor(motorId)),
    onSuccess: (_result, motorId) =>
      Promise.all([
        queryClient.invalidateQueries({queryKey: raceKeys.byMotor(motorId)}),
        queryClient.invalidateQueries({queryKey: motorKeys.summaries()}),
      ]),
  })
}
