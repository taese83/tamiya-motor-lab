import {create} from 'zustand'

import type {RaceResult} from '@shared/config/domain'

// R-5·RV-1 레이스↔측정 왕복 handoff slot (zustand 5 — 메모리 전용, persist 금지:
// 새로고침 시 자연 소실이 계약이다. INV-21: slot 존재 = 왕복 모드).
// slot은 항상 전체 교체 — 부분 patch로 이전 왕복의 잔재가 섞이지 않는다.
// measured null→비null 전이는 _markMeasuredPending 1곳에서만 일어나는 single-flight
// 가드다 — StrictMode 이중 effect·프레임 반복 유입에도 수집은 1건이다.

export interface RaceMeasureDraft {
  result?: RaceResult | undefined
  voltage?: number | undefined
  lapTimeSec?: number | undefined
}

export interface RaceMeasureMeasured {
  panoHz: number
  save: 'pending' | 'saved' | 'failed'
}

export interface RaceMeasureSlot {
  motorId: string
  motorName: string
  /** 레이스 폼 임시 입력 — 복귀 시 그대로 복원 (왕복 중 폼 소실 금지) */
  draft: RaceMeasureDraft
  /** 왕복 세대 토큰 — 늦은 비동기 신호의 오배달 방지 기준값 */
  startedAt: number
  measured: RaceMeasureMeasured | null
}

interface RaceMeasureState {
  slot: RaceMeasureSlot | null
}

/** 내부 store — 외부 공개는 아래 명령·구독 함수뿐 */
const useRaceMeasureStore = create<RaceMeasureState>()(() => ({slot: null}))

/** 왕복 시작 — startedAt=Date.now(), 기존 slot이 있어도 전체 교체 */
export function beginRaceMeasure(ctx: {
  motorId: string
  motorName: string
  draft: RaceMeasureDraft
}): void {
  useRaceMeasureStore.setState({
    slot: {
      motorId: ctx.motorId,
      motorName: ctx.motorName,
      draft: ctx.draft,
      startedAt: Date.now(),
      measured: null,
    },
  })
}

/** 비반응 read — effect·비동기 완료 지점의 liveness 확인용 */
export function peekRaceMeasure(): RaceMeasureSlot | null {
  return useRaceMeasureStore.getState().slot
}

/** read-and-clear 1회 소비 — 레이스 페이지 복귀 시점에만 호출 */
export function consumeRaceMeasureReturn(): RaceMeasureSlot | null {
  const {slot} = useRaceMeasureStore.getState()
  if (slot !== null) useRaceMeasureStore.setState({slot: null})
  return slot
}

/** 왕복 파기 — 멱등 (이미 없어도 no-op) */
export function cancelRaceMeasure(): void {
  useRaceMeasureStore.setState({slot: null})
}

/** 반응 구독 — S1 배너 렌더·auto-collect effect 재평가용 */
export function useRaceMeasureSlot(): RaceMeasureSlot | null {
  return useRaceMeasureStore(state => state.slot)
}

// ─── 내부 전용 (use-race-auto-collect 전용 — 배럴 미노출, _ 접두) ─────────────

/**
 * measured null→pending 전이 시도 — 성공(true)한 호출자만 수집을 진행한다.
 * startedAt 불일치(다른 세대)·이미 measured 비null(재진입)이면 false — 동기 single-flight 가드.
 */
export function _markMeasuredPending(startedAt: number, panoHz: number): boolean {
  const {slot} = useRaceMeasureStore.getState()
  if (slot === null || slot.startedAt !== startedAt || slot.measured !== null) return false
  useRaceMeasureStore.setState({slot: {...slot, measured: {panoHz, save: 'pending'}}})
  return true
}

/** pending → saved|failed 확정 — startedAt 불일치·measured null이면 무시 (늦은 신호 폐기) */
export function _resolveMeasuredSave(startedAt: number, save: 'saved' | 'failed'): void {
  const {slot} = useRaceMeasureStore.getState()
  if (slot === null || slot.startedAt !== startedAt || slot.measured === null) return
  useRaceMeasureStore.setState({slot: {...slot, measured: {...slot.measured, save}}})
}
