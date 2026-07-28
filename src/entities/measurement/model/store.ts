import {createStore} from 'zustand/vanilla'

import {fromZodError} from '@shared/lib/errors'

import {measurementSchema} from './schema'

import type {Measurement} from './schema'

// Measurement handoff single-slot (F3 — state-contract §Measurement handoff, INV-14).
// 비영속 in-memory: zustand vanilla store + persist 미들웨어 없음(전역 영속 store 금지).
// store 인스턴스는 모듈 밖으로 내보내지 않는다 — slot 접근 경로는 아래 command 3건뿐이라
// 구독으로 stale 값을 관찰하거나 command를 우회해 slot을 채우는 경로가 구조적으로 없다.
// 동기·무실패(Result 봉투·query 캐시 무관) — throw는 호출 계약 위반(버그) 시에만.
//
// slot 수명 3규칙 (INV-14 — stale 자동 채움 0건):
//   ① take 소비 — S1 stable CTA 경유 S2 진입 시 takeConfirmedMeasurement 1회(직후 slot=null).
//   ② 새 세션 시작 clear — startCapture(features/measure-session)가 시작 시
//      clearConfirmedMeasurement 호출(다시 측정 = 새 세션).
//   ③ 비-CTA S1 이탈 clear — CTA가 아닌 경로(탭 전환 등)로 S1을 떠날 때 동일 command 호출.
// ②·③의 호출 시점은 상위 레이어(feature/page) 소유 — entity는 멱등 clear를 제공하고
// entity가 feature를 import할 수 없으므로(FSD) 호출 배선은 measure-session 빌더 계약이다.

interface MeasurementSlotState {
  slot: Measurement | null
}

const measurementSlotStore = createStore<MeasurementSlotState>(() => ({slot: null}))

/**
 * command: setConfirmedMeasurement — F2가 **stable 확정 전이 시점에만** 호출 (INV-14).
 * single-slot 전체 교체(필드 patch 없음) — 새 stable이 이전 값을 덮어쓴다.
 *
 * H-5 이중 가드 — weak-signal·미측정 값은 set 자체가 불가능하다:
 * - 타입: `Measurement`는 전 필드 non-null — weak-signal의 `DisplayEstimate`(f0/rpm null,
 *   INV-13)는 컴파일 타임에 이 시그니처를 통과하지 못한다.
 * - 런타임: measurementSchema 재검증(panoHz ∈ F0_RANGE·소수 1자리·rpm 쌍 불변식·
 *   confidence 0~1·capturedAt ISO). 실패는 호출 계약 위반(버그) — DomainError('validation')
 *   throw로 즉시 드러내고 slot은 불변(오값을 절대 게시하지 않음).
 */
export function setConfirmedMeasurement(m: Measurement): void {
  const parsed = measurementSchema.safeParse(m)
  if (!parsed.success) throw fromZodError(parsed.error)
  measurementSlotStore.setState({slot: parsed.data})
}

/**
 * command: takeConfirmedMeasurement — read-and-clear 원자적 1회 소비 (H-5, 수명 규칙 ①).
 * 동기 단일 본문에서 읽기와 clear가 함께 일어나 재진입·재호출은 항상 null —
 * 이전 값·오값을 절대 반환하지 않는다. 빈 slot이면 null → S2 "측정값 없음" 카드.
 */
export function takeConfirmedMeasurement(): Measurement | null {
  const {slot} = measurementSlotStore.getState()
  measurementSlotStore.setState({slot: null})
  return slot
}

/**
 * command: clearConfirmedMeasurement — 멱등 slot 비움 (수명 규칙 ②·③의 실행 수단).
 * startCapture(새 세션)·비-CTA S1 이탈(UX-A1/A3) 시 상위 레이어가 호출한다.
 */
export function clearConfirmedMeasurement(): void {
  measurementSlotStore.setState({slot: null})
}
