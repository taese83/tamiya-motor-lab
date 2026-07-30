import {useMutation, useQueryClient} from '@tanstack/react-query'

import {deleteMeasureRecord, measureKeys} from '@entities/measure-record'
import {motorKeys} from '@entities/motor'
import {unwrap} from '@shared/lib/result'

// measure-management api segment (feature-mutation-builder 소유) — 파노 기록 개별 삭제.
// v2.38(사용자): 측정 기록은 append-only였으나 개별 삭제를 허용. update는 여전히 없다.

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
