import {useToast} from '@shared/ui/toast'

import {useResetMotorRecords} from '../api/mutations'

// v2.2 모터별 [기록 초기화] 플로우 어댑터 (레이스 상세 하단) — ResetRecordsBlock의 `onReset: () => Promise<boolean>` 계약.
// confirm·pending·오류 표시는 ResetRecordsBlock 내부 상태 머신 소유 — 이 훅은 실행·토스트만.
// invalidation(measureKeys.root·raceKeys.root·motorKeys.summaries — motors 캐시 유지)은
// useResetMotorRecords 소관.

export interface ResetRecordsFlow {
  /** 성공 시 true(+성공 토스트), 실패 시 false — 블록이 인라인 오류를 표시한다 */
  reset: () => Promise<boolean>
  pending: boolean
}

export function useResetRecordsFlow(motorId: string): ResetRecordsFlow {
  const toast = useToast()
  const mutation = useResetMotorRecords()

  const reset = async (): Promise<boolean> => {
    try {
      await mutation.mutateAsync(motorId)
      toast.showSuccess('초기화되었습니다')
      return true
    } catch {
      return false
    }
  }

  return {reset, pending: mutation.isPending}
}
