import {create} from 'zustand'

import type {RaceGoal, RaceResult, RetireReason} from '@shared/config/domain'

// R-5·RV-1 측정 왕복 handoff slot (zustand 5 — 메모리 전용, persist 금지:
// 새로고침 시 자연 소실이 계약이다. INV-21: slot 존재 = 왕복 모드).
// slot은 항상 전체 교체 — 부분 patch로 이전 왕복의 잔재가 섞이지 않는다.
// measured null→비null 전이는 _markMeasuredPending 1곳에서만 일어나는 single-flight
// 가드다 — StrictMode 이중 effect·프레임 반복 유입에도 수집은 1건이다.
//
// v2.5: 진입점이 2곳(레이스 입력 시트 / 모터 상세 하단)이라 slot에 `origin` 판별자를 둔다.
// origin별로 slot을 2개 두지 않는 이유: "slot 존재 = 왕복 모드"가 불변식이라 두 slot이 동시에
// 존재하면 S1이 대상을 판별할 수 없다. 단일 slot + 판별자로 single-flight·liveness 가드를
// 그대로 공유한다. 복귀 자체(navigate(-1))는 origin 무관이고, 분기는 표시 문구와
// 모터 삭제 시 복귀 대상뿐이다(소비 페이지 소관).
// 소비 측은 motorId와 **origin을 함께** 확인한다 — 교차 소비(레이스 화면이 모터 왕복 slot을
// 삼키는 등)를 막는 계약이다.

export interface RaceMeasureDraft {
  result?: RaceResult | undefined
  voltage?: number | undefined
  lapTimeSec?: number | undefined
  /** v2.31 목표(완주/안정/속도) — 왕복 중 보존해 복귀 시 라벨·근거 문맥을 유지 */
  goal?: RaceGoal | undefined
  /** R20 이탈 사유 — 왕복 중 보존(goal 동일 원칙). 복귀 시 이탈 사유 선택 유지 */
  retireReason?: RetireReason | undefined
}

export interface RaceMeasureMeasured {
  panoHz: number
  save: 'pending' | 'saved' | 'failed'
}

/** 왕복 진입점 — 표시 문구·모터삭제 복귀 대상 분기 기준 */
export type MeasureHandoffOrigin = 'race' | 'motor'

interface MeasureSlotBase {
  motorId: string
  motorName: string
  /** 왕복 세대 토큰 — 늦은 비동기 신호의 오배달 방지 기준값 */
  startedAt: number
  measured: RaceMeasureMeasured | null
}

/**
 * origin 판별 union — boolean/옵션 필드 조합 금지(재사용 원칙 §0.3).
 * race만 draft를 가진다: 모터 상세에는 보존할 폼이 없어 필드 자체를 두지 않는다
 * (undefined 허용보다 타입에서 배제하는 편이 오소비를 컴파일 타임에 막는다).
 */
export type RaceMeasureSlot =
  | (MeasureSlotBase & {
      origin: 'race'
      /** 레이스 폼 임시 입력 — 복귀 시 그대로 복원 (왕복 중 폼 소실 금지) */
      draft: RaceMeasureDraft
    })
  | (MeasureSlotBase & {origin: 'motor'})

interface RaceMeasureState {
  slot: RaceMeasureSlot | null
}

/** 내부 store — 외부 공개는 아래 명령·구독 함수뿐 */
const useRaceMeasureStore = create<RaceMeasureState>()(() => ({slot: null}))

/** 레이스 왕복 시작(RV-1) — startedAt=Date.now(), 기존 slot이 있어도 전체 교체 */
export function beginRaceMeasure(ctx: {
  motorId: string
  motorName: string
  draft: RaceMeasureDraft
}): void {
  useRaceMeasureStore.setState({
    slot: {
      origin: 'race',
      motorId: ctx.motorId,
      motorName: ctx.motorName,
      draft: ctx.draft,
      startedAt: Date.now(),
      measured: null,
    },
  })
}

/**
 * 모터 상세 왕복 시작 (v2.5) — 보존할 폼이 없어 draft를 받지 않는다.
 * 수집·자동 복귀·rolling 10 적용은 레이스 왕복과 동일 경로(useRaceAutoCollect).
 */
export function beginMotorMeasure(ctx: {motorId: string; motorName: string}): void {
  useRaceMeasureStore.setState({
    slot: {
      origin: 'motor',
      motorId: ctx.motorId,
      motorName: ctx.motorName,
      startedAt: Date.now(),
      measured: null,
    },
  })
}

/** 비반응 read — effect·비동기 완료 지점의 liveness 확인용 */
export function peekRaceMeasure(): RaceMeasureSlot | null {
  return useRaceMeasureStore.getState().slot
}

/**
 * read-and-clear 1회 소비 — 진입 화면 복귀 시점에만 호출.
 *
 * v2.5: `match`로 **자기 왕복만** 소비한다. read-and-clear라 무조건 clear하면 다른 origin의
 * 진행 중 왕복을 남의 화면이 삼켜버린다(모터 왕복 중 레이스 상세를 열면 모터 화면이 복귀
 * 결과를 영영 못 받는다). 불일치 시 slot을 보존하고 null을 반환한다.
 */
export function consumeRaceMeasureReturn<O extends MeasureHandoffOrigin>(match: {
  origin: O
  motorId: string
}): Extract<RaceMeasureSlot, {origin: O}> | null {
  const {slot} = useRaceMeasureStore.getState()
  if (slot === null) return null
  if (slot.origin !== match.origin || slot.motorId !== match.motorId) return null
  useRaceMeasureStore.setState({slot: null})
  // origin 일치를 확인했으므로 요청한 origin의 변종이다 — 호출부는 draft 등 origin 고유
  // 필드를 좁힘 없이 쓸 수 있다(레이스는 draft 보유, 모터는 미보유)
  return slot as Extract<RaceMeasureSlot, {origin: O}>
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
