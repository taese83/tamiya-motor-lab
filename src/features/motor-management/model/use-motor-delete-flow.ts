import {useRef, useState} from 'react'

import {countRecordsByMotor} from '@entities/motor'
import {isDomainError} from '@shared/lib/errors'

import type {ConfirmDialogProps} from '@shared/ui/confirm-dialog'

// 모터 cascade 삭제 플로우 조립 훅 (component-spec §1.3·§3.1 — REQ-ST-007, CP-3).
// count 조회 → ConfirmDialog(문구에 실측 건수 주입) → cascade command 순서 조립.
// countRecordsByMotor는 query 캐시 없이 confirm 직전 명령형 호출 — stale 건수 고지 방지
// (api-schema §5·§11 설계 결정). dialog 열기 전에 조회 완료 — dialog 내 loading 없음.

/** count 조회 실패 시 트리거 인근 인라인 문구 (§3.1) — dialog는 열지 않는다 */
export const MOTOR_DELETE_COUNT_ERROR_MESSAGE = '삭제 대상을 확인하지 못했습니다'

const DELETE_FALLBACK_MESSAGE = '삭제하지 못했습니다 — 다시 시도해 주세요'

const motorDeleteTitle = (name: string): string => `'${name}' 모터를 삭제할까요?`

/** cascade 삭제 대상 실측 건수 (v2 — countRecordsByMotor 분리 반환, D-1) */
export interface MotorRecordCounts {
  readonly measureCount: number
  readonly raceCount: number
}

// v2 copy — n·m 분리 고지 (D-4 baseline), 둘 다 0이면 문구 변형 (CD-A4 승계)
const motorDeleteImpact = (name: string, counts: MotorRecordCounts): string => {
  const parts: string[] = []
  if (counts.measureCount >= 1) parts.push(`측정 기록 ${counts.measureCount}건`)
  if (counts.raceCount >= 1) parts.push(`레이스 기록 ${counts.raceCount}건`)
  return parts.length > 0
    ? `'${name}'과 ${parts.join('·')}이 함께 삭제됩니다. 되돌릴 수 없습니다.`
    : `'${name}'이(가) 삭제됩니다. 되돌릴 수 없습니다.`
}

export interface MotorDeleteTarget {
  readonly id: string
  readonly name: string
}

export interface UseMotorDeleteFlowOptions {
  /**
   * deleteMotorCascade 실행자 주입 — mutation 훅(feature-mutation-builder,
   * features/motor-management/api)의 mutateAsync 또는
   * `async id => { unwrap(await deleteMotorCascade(id)) }`. 성공 시 resolve,
   * 실패 시 DomainError reject. invalidation(motorKeys.root·recordKeys.root·
   * guideKeys.root)은 mutation 훅 소관 — 이 훅은 수행하지 않는다.
   */
  deleteMotor: (motorId: string) => Promise<void>
  /** 삭제 성공·dialog 닫힘 후 — navigate('/motors', {replace: true}) 등은 호출측 소유 */
  onDeleted?: ((target: MotorDeleteTarget) => void) | undefined
}

export interface MotorDeleteFlow {
  /** [삭제] 트리거 — count 실측 조회 후 ConfirmDialog를 연다 */
  requestDelete: (target: MotorDeleteTarget) => void
  /** count 조회 실패 시 [다시 시도] */
  retryCount: () => void
  /** count 조회 진행 중 — 트리거 disabled 판정용 */
  isCounting: boolean
  /** count 조회 실패 인라인 문구 — null이면 비표시 */
  countError: string | null
  /** ConfirmDialog에 그대로 스프레드 — copy·pending·errorMessage 포함 (§3.1 계약) */
  dialogProps: ConfirmDialogProps
}

type FlowState =
  | {readonly step: 'idle'}
  | {readonly step: 'counting'; readonly target: MotorDeleteTarget}
  | {readonly step: 'count-error'; readonly target: MotorDeleteTarget}
  | {
      readonly step: 'confirming'
      readonly target: MotorDeleteTarget
      readonly counts: MotorRecordCounts
      readonly pending: boolean
      readonly errorMessage: string | null
    }

/**
 * cascade 삭제 플로우 (CP-3). confirm 표시 n이 stale이어도 실제 삭제는 tx 내 재조회
 * 기준이라 잔존이 없다(INV-03) — 이 훅의 count는 "고지 정확성"용 실측치다.
 * 트리거 소멸 시 포커스 승계(CD-A5)는 소비 페이지 책임.
 */
export function useMotorDeleteFlow(options: UseMotorDeleteFlowOptions): MotorDeleteFlow {
  const [state, setState] = useState<FlowState>({step: 'idle'})
  // 닫힘/재요청 이후 도착한 늦은 count 응답을 무시하기 위한 세대 토큰
  const requestSeq = useRef(0)

  const runCount = (target: MotorDeleteTarget): void => {
    const seq = ++requestSeq.current
    setState({step: 'counting', target})
    void (async () => {
      try {
        const counts = await countRecordsByMotor(target.id)
        if (requestSeq.current !== seq) return
        setState({step: 'confirming', target, counts, pending: false, errorMessage: null})
      } catch {
        if (requestSeq.current !== seq) return
        setState({step: 'count-error', target})
      }
    })()
  }

  const requestDelete = (target: MotorDeleteTarget): void => {
    if (state.step === 'confirming' && state.pending) return
    runCount(target)
  }

  const retryCount = (): void => {
    if (state.step !== 'count-error') return
    runCount(state.target)
  }

  const cancel = (): void => {
    if (state.step === 'confirming' && state.pending) return // pending 중 닫기 차단 (§3.1-3)
    requestSeq.current += 1
    setState({step: 'idle'})
  }

  const confirm = (): void => {
    if (state.step !== 'confirming' || state.pending) return
    const {target, counts} = state
    setState({step: 'confirming', target, counts, pending: true, errorMessage: null})
    void (async () => {
      try {
        await options.deleteMotor(target.id)
        requestSeq.current += 1
        setState({step: 'idle'})
        options.onDeleted?.(target)
      } catch (e) {
        // 실패 시 dialog 유지 + 인라인 오류 + [삭제] 재활성 — 성공 위장 금지 (§3.1-5)
        setState({
          step: 'confirming',
          target,
          counts,
          pending: false,
          errorMessage: isDomainError(e) ? e.message : DELETE_FALLBACK_MESSAGE,
        })
      }
    })()
  }

  const dialogProps: ConfirmDialogProps =
    state.step === 'confirming'
      ? {
          open: true,
          title: motorDeleteTitle(state.target.name),
          impact: motorDeleteImpact(state.target.name, state.counts),
          confirmLabel: '삭제',
          pending: state.pending,
          errorMessage: state.errorMessage,
          onConfirm: confirm,
          onCancel: cancel,
        }
      : {
          open: false,
          title: '',
          impact: '',
          confirmLabel: '삭제',
          onConfirm: confirm,
          onCancel: cancel,
        }

  return {
    requestDelete,
    retryCount,
    isCounting: state.step === 'counting',
    countError: state.step === 'count-error' ? MOTOR_DELETE_COUNT_ERROR_MESSAGE : null,
    dialogProps,
  }
}
