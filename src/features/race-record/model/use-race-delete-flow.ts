import {useRef, useState} from 'react'

import {isDomainError} from '@shared/lib/errors'

import {useDeleteRaceRecord} from '../api'

import type {ConfirmDialogProps} from '@shared/ui/confirm-dialog'

// 레이스 기록 단건 삭제 플로우 조립 훅 (component-spec §6.2·§3.1 — RV-A3, LD-4).
// confirm → deleteRaceRecord command 순서 조립 — count 조회 없음(단건, cascade 아님).
// 삭제 대상은 탭한 행의 entity id로만 지정 — view index 사용 금지 (state-contract §Destructive).
// use-record-delete-flow(motor-management) 패턴 승계 — mutation은 같은 slice api 세그먼트를
// 직접 사용한다(invalidation: raceKeys.root·motorKeys.summaries()는 mutation 훅 소관).

const RACE_DELETE_TITLE = '이 레이스 기록을 삭제할까요?' // §3.1 copy 고정
const RACE_DELETE_IMPACT = '되돌릴 수 없습니다.' // undo 미제공 (SC-A3 승계)
const DELETE_FALLBACK_MESSAGE = '삭제하지 못했습니다 — 다시 시도해 주세요'

/** 삭제 대상 — label은 행 식별 문맥(aria-label 문구)으로, confirm copy에는 미주입(§3.1 고정) */
export interface RaceDeleteTarget {
  readonly id: string
  readonly label: string
}

export interface UseRaceDeleteFlowOptions {
  /** 삭제 성공·dialog 닫힘 후 — 포커스 승계(다음 행 [삭제] → 목록 heading, CD-A5)는 page 소유 */
  onDeleted?: ((target: RaceDeleteTarget) => void) | undefined
}

export interface RaceDeleteFlow {
  /** 행 [삭제] 트리거 — ConfirmDialog를 연다 (확인 시에만 command 실행, 취소 시 무변경) */
  requestDelete: (id: string, label: string) => void
  /** 삭제 command 진행 중 대상 id — RaceRecordRow deletePending 판정용, 없으면 null */
  pendingId: string | null
  /** ConfirmDialog에 그대로 스프레드 (§3.1 계약) */
  dialogProps: ConfirmDialogProps
}

type FlowState =
  | {readonly step: 'idle'}
  | {
      readonly step: 'confirming'
      readonly target: RaceDeleteTarget
      readonly pending: boolean
      readonly errorMessage: string | null
    }

/**
 * 레이스 기록 삭제 confirm 플로우 (RV-A3) — RaceRecord는 immutable(INV-05)이라 수정 플로우 없음.
 * 대상 부재는 command가 멱등 성공(SC-A4 — stale 목록 자연 수렴)이라 not-found 분기 없음.
 */
export function useRaceDeleteFlow(options?: UseRaceDeleteFlowOptions): RaceDeleteFlow {
  const deleteRaceRecord = useDeleteRaceRecord()
  const [state, setState] = useState<FlowState>({step: 'idle'})
  // 같은 tick 중복 confirm 차단용 동기 가드
  const inFlightRef = useRef(false)

  const requestDelete = (id: string, label: string): void => {
    if (state.step === 'confirming' && state.pending) return
    setState({step: 'confirming', target: {id, label}, pending: false, errorMessage: null})
  }

  const cancel = (): void => {
    if (state.step === 'confirming' && state.pending) return // pending 중 닫기 차단 (§3.1-3)
    setState({step: 'idle'})
  }

  const confirm = (): void => {
    if (state.step !== 'confirming' || state.pending || inFlightRef.current) return
    const {target} = state
    inFlightRef.current = true
    setState({step: 'confirming', target, pending: true, errorMessage: null})
    void (async () => {
      try {
        await deleteRaceRecord.mutateAsync(target.id)
        setState({step: 'idle'})
        options?.onDeleted?.(target)
      } catch (e) {
        // 실패 시 dialog 유지 + 인라인 오류 + [삭제] 재활성 — 성공 위장 금지 (§3.1-5)
        setState({
          step: 'confirming',
          target,
          pending: false,
          errorMessage: isDomainError(e) ? e.message : DELETE_FALLBACK_MESSAGE,
        })
      } finally {
        inFlightRef.current = false
      }
    })()
  }

  const dialogProps: ConfirmDialogProps =
    state.step === 'confirming'
      ? {
          open: true,
          title: RACE_DELETE_TITLE,
          impact: RACE_DELETE_IMPACT,
          confirmLabel: '삭제',
          pending: state.pending,
          errorMessage: state.errorMessage,
          onConfirm: confirm,
          onCancel: cancel,
        }
      : {open: false, title: '', impact: '', confirmLabel: '삭제', onConfirm: confirm, onCancel: cancel}

  return {
    requestDelete,
    pendingId: state.step === 'confirming' && state.pending ? state.target.id : null,
    dialogProps,
  }
}
