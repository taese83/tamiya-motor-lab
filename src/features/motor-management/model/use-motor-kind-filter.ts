import {useMemo} from 'react'

import {MOTOR_KINDS} from '@shared/config/domain'

import {useKindFilterStore} from './kind-filter-store'

import type {MotorSummary} from '@entities/motor'
import type {MotorKind} from '@shared/config/domain'

// 종류 필터 상태 훅 (v2.4 도입 — 종류 칩 다중선택).
//
// v2.17: 선택 상태의 소유가 URL search param → **공유 영속 store**로 바뀌었다.
// 사용자 결정 2건 때문이다: ① 모터 탭과 레이스 탭이 하나의 필터를 공유한다
// ② 앱 재시작 후에도 유지된다. 라우트가 다르면 URL도 달라 param으로는 ①이 성립하지 않는다.
// 근거와 트레이드오프는 `kind-filter-store.ts` 주석에 있다.
//
// 이 훅의 **공개 형태는 그대로 유지**했다(selected/active/options/filtered/toggle/clear) —
// 저장 위치는 구현 세부라 소비 페이지가 알 필요가 없고, 덕분에 MotorsPage는 무변경이다.
//
// 필터는 view 상태이지 도메인 상태가 아니다 — IndexedDB에 저장하지 않고 정렬(sortOrder)에도
// 영향을 주지 않는다. 필터 활성 중 DnD 정렬 잠금은 소비 페이지가 `active`로 판정한다
// (reorderMotors는 전체 모터 id의 완전한 순열을 요구하므로 부분집합 전송은 금지 — SO-2).

export interface MotorKindFilterOption {
  kind: MotorKind
  /** 해당 종류의 모터 수 — 칩 라벨 보조 표시(0건 종류는 옵션에서 제외된다) */
  count: number
  selected: boolean
}

export interface MotorKindFilter {
  /** 선택된 종류 — 빈 배열이면 전체(필터 없음). MOTOR_KINDS 순서로 정규화됨 */
  selected: ReadonlyArray<MotorKind>
  /** 선택이 1개 이상이면 true — DnD 정렬 잠금·안내 문구·해제 버튼 표시 판정 */
  active: boolean
  /** 실제 목록에 존재하는 종류만(건수 포함) — 죽은 칩을 만들지 않는다 */
  options: ReadonlyArray<MotorKindFilterOption>
  /** 필터 적용 결과 — 선택 0개면 입력 배열 그대로(참조 동일, 재정렬 없음) */
  filtered: ReadonlyArray<MotorSummary>
  /** 칩 탭 — 선택/해제 토글 */
  toggle: (kind: MotorKind) => void
  /** [전체] 탭·[필터 해제] — 선택 전체 비움 */
  clear: () => void
}

/**
 * @param summaries sortOrder asc (listMotorSummaries 결과) — 이 훅은 재정렬하지 않는다
 */
export function useMotorKindFilter(summaries: ReadonlyArray<MotorSummary>): MotorKindFilter {
  // 개별 셀렉터로 구독한다 — store 객체 전체를 반환하면 매 렌더 새 참조가 되어
  // 두 화면이 동시에 구독할 때 불필요한 재렌더가 번진다.
  const selected = useKindFilterStore(state => state.selected)
  const toggle = useKindFilterStore(state => state.toggle)
  const clear = useKindFilterStore(state => state.clear)

  const options = useMemo<ReadonlyArray<MotorKindFilterOption>>(() => {
    const counts = new Map<MotorKind, number>()
    for (const summary of summaries) {
      counts.set(summary.motor.kind, (counts.get(summary.motor.kind) ?? 0) + 1)
    }
    // 존재하는 종류만 MOTOR_KINDS 순서로. 선택했지만 0건이 된 종류(동시 삭제 등)도
    // 해제 경로를 남기기 위해 포함한다 — 그래야 사용자가 빈 결과에서 빠져나올 수 있다.
    return MOTOR_KINDS.filter(kind => (counts.get(kind) ?? 0) > 0 || selected.includes(kind)).map(
      kind => ({kind, count: counts.get(kind) ?? 0, selected: selected.includes(kind)}),
    )
  }, [summaries, selected])

  const filtered = useMemo<ReadonlyArray<MotorSummary>>(() => {
    if (selected.length === 0) return summaries
    const allowed = new Set(selected)
    return summaries.filter(summary => allowed.has(summary.motor.kind))
  }, [summaries, selected])

  return {selected, active: selected.length > 0, options, filtered, toggle, clear}
}
