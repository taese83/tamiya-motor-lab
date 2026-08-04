import {useMutation, useQueryClient} from '@tanstack/react-query'

import {collectMeasureRecord, deleteMeasureRecord, measureKeys} from '@entities/measure-record'
import {motorKeys} from '@entities/motor'
import {unwrap} from '@shared/lib/result'
import {requestServerSync} from '@shared/lib/sync-signal'

// measure-management api segment (feature-mutation-builder 소유) — 파노 기록 개별 삭제 + 수동 입력.
// v2.38(사용자): 측정 기록은 append-only였으나 개별 삭제를 허용. update는 여전히 없다.
// R51(사용자): 파노 수동 입력 수집. 실측 왕복(use-race-auto-collect)과 같은 command·invalidation.

/**
 * useCollectMeasureRecord — 파노 수동 입력(R51, source:'manual'). panoHz만 받아
 * rpm=round(panoHz×60)을 파생하고 collectMeasureRecord로 저장한다 — 실측 왕복과 동일 command라
 * rolling(INV-20)·쌍 불변식(INV-06)·write-strict 검증(F0_RANGE)이 그대로 적용된다.
 * 성공 시 measureKeys.byMotor(목록·차트)·motorKeys.summaries(요약 파생)·motorKeys.detail invalidate
 * + 서버 push 트리거 — Promise return으로 완료까지 pending. 실패는 mutation error로 표면화.
 */
export function useCollectMeasureRecord(motorId: string) {
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

/**
 * useDeleteMeasureRecord — 파노 기록 개별 삭제(id). 성공 시 measureKeys.byMotor(파노 목록·차트)와
 * motorKeys.summaries()(파생 요약 lastMeasure/panoTrend) invalidate — Promise return으로 완료까지 pending.
 * 멱등(대상 부재 시 성공, LWW). 실패는 mutation error로 표면화(성공 위장 금지).
 */
export function useDeleteMeasureRecord(motorId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => unwrap(await deleteMeasureRecord(id)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: measureKeys.byMotor(motorId)}),
        queryClient.invalidateQueries({queryKey: motorKeys.summaries()}),
      ])
    },
  })
}
