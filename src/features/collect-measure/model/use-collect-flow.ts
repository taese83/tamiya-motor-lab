import {useRef, useState} from 'react'
import {useQueryClient} from '@tanstack/react-query'

import {collectMeasureRecord, measureKeys} from '@entities/measure-record'
import {motorKeys} from '@entities/motor'
import {isDomainError} from '@shared/lib/errors'
import {useToast} from '@shared/ui/toast'

// M-6 [기록] 수집 플로우 오케스트레이션 (component-spec §4.2 — MotorPickSheet 소비 훅).
// 상태 머신: idle → pick → collecting → (success→idle | error→pick), pick → register → collecting.
// 스냅샷은 [기록] 탭 시점에 고정(SC2-A3·MR-2)되고 재반올림 없이 그대로 기록된다 — 표시-기록 일치 계약.

/** [기록] 탭 시점 고정 스냅샷 — 시트 열림 중 측정이 계속돼도 이 값이 기록된다 */
export interface CollectSnapshot {
  panoHz: number
  rpm: number
}

export interface CollectFlowApi {
  pickOpen: boolean
  registerOpen: boolean
  snapshot: CollectSnapshot | null
  /** 수집 중 모터 — 비null이면 시트 전 행 탭 차단(single-flight) + 닫기 금지 */
  pendingMotorId: string | null
  /** 수집 실패 인라인 배너 문구 — 시트 유지 + 행 재탭 가능 (오류 토스트 금지 계약) */
  errorMessage: string | null
  /** [기록] 탭 — 탭 시점 스냅샷을 고정하고 모터 선택 시트를 연다 (수집 중이면 no-op) */
  open: (snapshot: CollectSnapshot) => void
  select: (motorId: string, motorName: string) => void
  /** 모터 0개 — MotorFormSheet로 "닫고 열기 교체" (§3.2) */
  requestRegister: () => void
  /** 등록 성공 → 그 모터로 즉시 수집 */
  completeRegister: (motor: {id: string; name: string}) => void
  cancelRegister: () => void
  /** pendingMotorId !== null이면 no-op — 수집 중 닫기 금지 */
  close: () => void
}

const MOTOR_DELETED_MESSAGE = '모터가 삭제되었습니다. 목록을 갱신했습니다'
/** command는 Result 봉투 계약이지만 예외 throw도 인라인 오류로 수렴시키는 방어 문구 */
const COLLECT_FALLBACK_MESSAGE = '기록하지 못했습니다 — 다시 시도해 주세요'

type FlowState =
  | {readonly step: 'idle'}
  | {
      readonly step: 'pick'
      readonly snapshot: CollectSnapshot
      readonly errorMessage: string | null
    }
  | {readonly step: 'register'; readonly snapshot: CollectSnapshot}
  | {
      readonly step: 'collecting'
      readonly snapshot: CollectSnapshot
      readonly motorId: string
      readonly motorName: string
    }

/**
 * 수집 플로우 훅. invalidation은 api-schema §6.4 매트릭스대로 성공 시
 * measureKeys.byMotor(motorId) + motorKeys.summaries(), not-found 시 motorKeys.root.
 * select/completeRegister는 동기 재진입 가드(inFlightRef)로 수집 1건을 보장한다.
 */
export function useCollectFlow(): CollectFlowApi {
  const [state, setState] = useState<FlowState>({step: 'idle'})
  const queryClient = useQueryClient()
  const toast = useToast()
  // setState 반영 전 같은 tick의 이중 탭 차단 — state.step 가드만으로는 못 막는다
  const inFlightRef = useRef(false)

  const runCollect = (snapshot: CollectSnapshot, motorId: string, motorName: string): void => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setState({step: 'collecting', snapshot, motorId, motorName})
    void (async () => {
      try {
        // 스냅샷 값은 재반올림 없이 그대로 전달 (표시-기록 일치 계약)
        const result = await collectMeasureRecord({
          motorId,
          panoHz: snapshot.panoHz,
          rpm: snapshot.rpm,
        })
        if (result.ok) {
          void queryClient.invalidateQueries({queryKey: measureKeys.byMotor(motorId)})
          void queryClient.invalidateQueries({queryKey: motorKeys.summaries()})
          toast.showSuccess(`'${motorName}'에 기록됨`)
          setState({step: 'idle'})
        } else if (result.error.code === 'not-found') {
          // 선택 사이에 모터가 삭제된 경우 — 목록 갱신 + 시트 유지 (성공 위장 금지)
          void queryClient.invalidateQueries({queryKey: motorKeys.root})
          setState({step: 'pick', snapshot, errorMessage: MOTOR_DELETED_MESSAGE})
        } else {
          setState({step: 'pick', snapshot, errorMessage: result.error.message})
        }
      } catch (e) {
        setState({
          step: 'pick',
          snapshot,
          errorMessage: isDomainError(e) ? e.message : COLLECT_FALLBACK_MESSAGE,
        })
      } finally {
        inFlightRef.current = false
      }
    })()
  }

  const open = (snapshot: CollectSnapshot): void => {
    if (state.step === 'collecting') return
    setState({step: 'pick', snapshot, errorMessage: null})
  }

  const select = (motorId: string, motorName: string): void => {
    if (state.step !== 'pick') return
    runCollect(state.snapshot, motorId, motorName)
  }

  const requestRegister = (): void => {
    if (state.step !== 'pick') return
    setState({step: 'register', snapshot: state.snapshot})
  }

  const completeRegister = (motor: {id: string; name: string}): void => {
    if (state.step !== 'register') return
    runCollect(state.snapshot, motor.id, motor.name)
  }

  const cancelRegister = (): void => {
    if (state.step !== 'register') return
    setState({step: 'pick', snapshot: state.snapshot, errorMessage: null})
  }

  const close = (): void => {
    if (state.step === 'collecting') return // 수집 중 닫기 금지 (single-flight 보전)
    setState({step: 'idle'})
  }

  return {
    // collecting 중에도 pick 시트를 유지 — "기록 중…" 행 표시가 계약 (§4.2 pending 상태)
    pickOpen: state.step === 'pick' || state.step === 'collecting',
    registerOpen: state.step === 'register',
    snapshot: state.step === 'idle' ? null : state.snapshot,
    pendingMotorId: state.step === 'collecting' ? state.motorId : null,
    errorMessage: state.step === 'pick' ? state.errorMessage : null,
    open,
    select,
    requestRegister,
    completeRegister,
    cancelRegister,
    close,
  }
}
