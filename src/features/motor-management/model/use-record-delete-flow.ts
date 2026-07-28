import {useRef, useState} from 'react'

import {isDomainError} from '@shared/lib/errors'

import type {ConfirmDialogProps} from '@shared/ui/confirm-dialog'

// 기록 단건 삭제 플로우 조립 훅 (component-spec §1.3·§3.1 — REQ-ST-007, C-2).
// confirm → deleteRecord command 순서 조립 — count 조회 없음(단건, cascade 아님).
// 삭제 대상은 탭한 행의 entity id로만 지정 — view index 사용 금지 (state-contract §Destructive).

const RECORD_DELETE_TITLE = '이 기록을 삭제할까요?'
const RECORD_DELETE_IMPACT = '되돌릴 수 없습니다.' // §3.1 copy 고정 — undo 미제공 (SC-A3)
const DELETE_FALLBACK_MESSAGE = '삭제하지 못했습니다 — 다시 시도해 주세요'

export interface UseRecordDeleteFlowOptions {
  /**
   * deleteRecord 실행자 주입 — mutation 훅(feature-mutation-builder,
   * features/motor-management/api)의 mutateAsync 또는
   * `async id => { unwrap(await deleteRecord(id)) }`. 성공 시 resolve,
   * 실패 시 DomainError reject. invalidation(recordKeys.root·motorKeys.summaries()·
   * guideKeys.root — 가이드 즉시 반영 INV-10)은 mutation 훅 소관.
   */
  deleteRecord: (recordId: string) => Promise<void>
  /** 삭제 성공·dialog 닫힘 후 — 포커스 승계(CD-A5) 등은 호출측 소유 */
  onDeleted?: ((recordId: string) => void) | undefined
}

export interface RecordDeleteFlow {
  /** 행 [삭제] 트리거 — ConfirmDialog를 연다 (확인 시에만 command 실행, 취소 시 무변경) */
  requestDelete: (recordId: string) => void
  /** ConfirmDialog에 그대로 스프레드 (§3.1 계약) */
  dialogProps: ConfirmDialogProps
}

type FlowState =
  | {readonly step: 'idle'}
  | {
      readonly step: 'confirming'
      readonly recordId: string
      readonly pending: boolean
      readonly errorMessage: string | null
    }

/** 기록 삭제 confirm 플로우 (C-2) — RunRecord는 immutable이라 수정 플로우는 존재하지 않는다. */
export function useRecordDeleteFlow(options: UseRecordDeleteFlowOptions): RecordDeleteFlow {
  const [state, setState] = useState<FlowState>({step: 'idle'})
  // 같은 tick 중복 confirm 차단용 동기 가드
  const inFlightRef = useRef(false)

  const requestDelete = (recordId: string): void => {
    if (state.step === 'confirming' && state.pending) return
    setState({step: 'confirming', recordId, pending: false, errorMessage: null})
  }

  const cancel = (): void => {
    if (state.step === 'confirming' && state.pending) return // pending 중 닫기 차단 (§3.1-3)
    setState({step: 'idle'})
  }

  const confirm = (): void => {
    if (state.step !== 'confirming' || state.pending || inFlightRef.current) return
    const {recordId} = state
    inFlightRef.current = true
    setState({step: 'confirming', recordId, pending: true, errorMessage: null})
    void (async () => {
      try {
        await options.deleteRecord(recordId)
        setState({step: 'idle'})
        options.onDeleted?.(recordId)
      } catch (e) {
        // 실패 시 dialog 유지 + 인라인 오류 + [삭제] 재활성 — 성공 위장 금지 (§3.1-5)
        setState({
          step: 'confirming',
          recordId,
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
          title: RECORD_DELETE_TITLE,
          impact: RECORD_DELETE_IMPACT,
          confirmLabel: '삭제',
          pending: state.pending,
          errorMessage: state.errorMessage,
          onConfirm: confirm,
          onCancel: cancel,
        }
      : {open: false, title: '', impact: '', confirmLabel: '삭제', onConfirm: confirm, onCancel: cancel}

  return {requestDelete, dialogProps}
}
