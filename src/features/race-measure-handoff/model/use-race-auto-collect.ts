import {useEffect, useRef} from 'react'
import {useQueryClient} from '@tanstack/react-query'

import {collectMeasureRecord, measureKeys} from '@entities/measure-record'
import {motorKeys} from '@entities/motor'

import {
  _markMeasuredPending,
  _resolveMeasuredSave,
  cancelRaceMeasure,
  peekRaceMeasure,
  useRaceMeasureSlot,
} from './store'

// RV-1 레이스 왕복 자동 수집 (S1 측정 페이지 mount 훅).
// 발화 조건: slot 존재 ∧ measured===null ∧ isStable ∧ panoHz·rpm 비null.
// _markMeasuredPending이 동기 재진입을 차단하므로 StrictMode 이중 effect에도 수집은 1건.
// 모든 outcome은 전달 직전 peekRaceMeasure()?.startedAt 일치를 확인한다 — 왕복이 이미
// 파기(취소·새 왕복 시작)됐으면 신호를 폐기해 오배달 navigate를 방지한다.

export type RaceAutoCollectOutcome =
  | {kind: 'collected'; motorId: string}
  | {kind: 'collect-failed'; motorId: string; message: string}
  | {kind: 'motor-deleted'}

export interface UseRaceAutoCollectInput {
  /** 측정 안정 판정 — 안정 시점의 panoHz·rpm이 그대로 기록된다 (재반올림 금지) */
  isStable: boolean
  panoHz: number | null
  rpm: number | null
  /** navigate 등 후속 처리 — liveness 확인을 통과한 신호만 도착한다 */
  onOutcome: (outcome: RaceAutoCollectOutcome) => void
}

export function useRaceAutoCollect(input: UseRaceAutoCollectInput): void {
  const {isStable, panoHz, rpm, onOutcome} = input
  const slot = useRaceMeasureSlot()
  const queryClient = useQueryClient()
  // 최신 콜백 유지 — onOutcome 재생성이 수집 effect를 재발화시키지 않게 분리
  const onOutcomeRef = useRef(onOutcome)
  useEffect(() => {
    onOutcomeRef.current = onOutcome
  })

  useEffect(() => {
    if (slot === null || slot.measured !== null) return
    if (!isStable || panoHz === null || rpm === null) return
    const {motorId, startedAt} = slot
    // 동기 single-flight 가드 — 전이에 실패하면 다른 호출이 이미 수집 중이다
    if (!_markMeasuredPending(startedAt, panoHz)) return

    void (async () => {
      const result = await collectMeasureRecord({motorId, panoHz, rpm})

      /** 전달 전 liveness 확인 — 이미 파기된 왕복이면 신호 폐기 */
      const deliver = (outcome: RaceAutoCollectOutcome): void => {
        if (peekRaceMeasure()?.startedAt !== startedAt) return
        onOutcomeRef.current(outcome)
      }

      if (result.ok) {
        _resolveMeasuredSave(startedAt, 'saved')
        void queryClient.invalidateQueries({queryKey: measureKeys.byMotor(motorId)})
        void queryClient.invalidateQueries({queryKey: motorKeys.summaries()})
        deliver({kind: 'collected', motorId})
        return
      }

      if (result.error.code === 'not-found') {
        // 측정 중 모터 삭제 — cancel은 liveness 확인 **후에** 수행한다
        // (먼저 cancel하면 파기된 왕복의 신호와 구분할 수 없다)
        if (peekRaceMeasure()?.startedAt !== startedAt) return
        cancelRaceMeasure()
        void queryClient.invalidateQueries({queryKey: motorKeys.root})
        onOutcomeRef.current({kind: 'motor-deleted'})
        return
      }

      _resolveMeasuredSave(startedAt, 'failed')
      deliver({kind: 'collect-failed', motorId, message: result.error.message})
    })()
  }, [slot, isStable, panoHz, rpm, queryClient])
}
