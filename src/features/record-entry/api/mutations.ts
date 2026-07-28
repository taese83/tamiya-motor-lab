import {useMutation, useQueryClient} from '@tanstack/react-query'

import {motorKeys} from '@entities/motor'
import {createRecord, deleteRecord, recordKeys} from '@entities/run-record'
import {isDomainError} from '@shared/lib/errors'
import {unwrap} from '@shared/lib/result'

import type {CreateRecordDraft, RunRecord} from '@entities/run-record'
import type {DomainError} from '@shared/lib/errors'

// RunRecord mutation 훅 2건 (F6 — REQ-F-004, REQ-ST-005/007).
// RunRecord는 immutable — updateRecord mutation은 존재하지 않는다 (FP-A4/INV-05).
// 채널 규약: repository command의 Result<T, DomainError>를 unwrap()으로 통과시켜 실패를 throw로
// 변환 — useMutation error 채널 접속. invalidation은 §6.4 매트릭스 그대로 commit 성공 시에만 —
// 실패/abort 시 캐시 불변 (state-contract §Derived view 무결성).
// 파생 값(기록 수·최근 요약·추천 범위)은 invalidation으로만 갱신 — setQueryData·optimistic update
// 금지 (§6.4 어댑터 규약). 제출 중 single-flight 가드(H-4)·C-4 [다시 저장] UX는 feature model/UI 소관.
// TanStack Query 로컬 정책(networkMode 'always'·retry false)은 query-client 전역 설정 소관 — 재정의 금지.

// features/voltage-guide/api/keys.ts guideKeys.root(['guide'])의 계약 미러 상수 —
// feature 간 직접 import 금지(eslint FSD 경계)로 값을 미러링한다.
// 값 변경 시 guideKeys.root·api-schema §6.2·motor-management 미러와 동시 갱신 (keys.ts 주석 참조).
const GUIDE_ROOT_KEY = ['guide'] as const

/**
 * mutation: createRecord (S2 기록 저장).
 * §6.4: 성공 시 recordKeys.root(모터별 목록) · motorKeys.summaries()(기록 수·최근 기록 파생) ·
 * guideKeys.root(만족 기록 집계) invalidate — 파생 값 캐시 금지, 항상 재계산 (INV-09/INV-10).
 * not-found(motor 부재 — 동시 탭 선삭제) 시 stale 모터 목록 정정을 위해 motorKeys.root invalidate
 * (§3 매핑). 폼 오류 표시·입력 유지(C-8)는 UI 소관.
 */
export const useCreateRecord = () => {
  const queryClient = useQueryClient()
  return useMutation<RunRecord, DomainError, CreateRecordDraft>({
    mutationFn: async draft => unwrap(await createRecord(draft)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({queryKey: recordKeys.root}),
        queryClient.invalidateQueries({queryKey: motorKeys.summaries()}),
        queryClient.invalidateQueries({queryKey: GUIDE_ROOT_KEY}),
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
 * mutation: deleteRecord (S4 confirm — destructive).
 * confirm(C-2)은 호출 feature UI 책임. 대상 부재 시 멱등 성공 (SC-A4 — not-found 경로 없음).
 * §6.4: 성공 시 recordKeys.root · motorKeys.summaries() · guideKeys.root invalidate —
 * 만족 기록 삭제 시 가이드 집계 즉시 반영 (INV-10).
 * optimistic 완료 처리 금지 — 성공 응답 후에만 UI 반영 (삭제 계열).
 */
export const useDeleteRecord = () => {
  const queryClient = useQueryClient()
  return useMutation<void, DomainError, string>({
    mutationFn: async id => unwrap(await deleteRecord(id)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({queryKey: recordKeys.root}),
        queryClient.invalidateQueries({queryKey: motorKeys.summaries()}),
        queryClient.invalidateQueries({queryKey: GUIDE_ROOT_KEY}),
      ]),
  })
}
