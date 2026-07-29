import {useCallback, useMemo} from 'react'

import {useSearchParams} from 'react-router'

import {MOTOR_KINDS} from '@shared/config/domain'

import type {MotorSummary} from '@entities/motor'
import type {MotorKind} from '@shared/config/domain'

// 모터 목록 종류 필터 상태 훅 (v2.4 — 사용자 결정: 종류 칩 다중선택, 모터 목록 전용).
//
// 상태 보존을 URL search param(`?kind=a,b`)에 두는 이유: 행 탭 → 상세('/motors/:id') →
// [뒤로] 복귀 시 필터가 유지돼야 한다(useState는 언마운트로 소실). 뒤로가기 이력도 자연히 따라온다.
// param은 외부 입력이므로 MOTOR_KINDS로 검증하고 미지값은 조용히 버린다(잘못된 URL로
// 빈 목록을 오표시하지 않는다). 중복도 제거하며 표시 순서는 항상 MOTOR_KINDS 순서로 정규화한다.
//
// 필터는 view 상태이지 도메인 상태가 아니다 — IndexedDB에 저장하지 않고 정렬(sortOrder)에도
// 영향을 주지 않는다. 필터 활성 중 DnD 정렬 잠금은 소비 페이지가 `active`로 판정한다
// (reorderMotors는 전체 모터 id의 완전한 순열을 요구하므로 부분집합 전송은 금지 — SO-2).

const KIND_PARAM = 'kind'
const KIND_SEPARATOR = ','

const isMotorKind = (value: string): value is MotorKind =>
  (MOTOR_KINDS as ReadonlyArray<string>).includes(value)

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
export function useMotorKindFilter(
  summaries: ReadonlyArray<MotorSummary>,
): MotorKindFilter {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawParam = searchParams.get(KIND_PARAM)

  const selected = useMemo<ReadonlyArray<MotorKind>>(() => {
    if (rawParam === null || rawParam === '') return []
    const requested = new Set(
      rawParam
        .split(KIND_SEPARATOR)
        .map(part => part.trim())
        .filter(isMotorKind),
    )
    // MOTOR_KINDS 순서로 정규화 — param 나열 순서에 표시가 흔들리지 않게 한다
    return MOTOR_KINDS.filter(kind => requested.has(kind))
  }, [rawParam])

  const writeSelected = useCallback(
    (next: ReadonlyArray<MotorKind>): void => {
      // 필터 조작은 이력을 쌓지 않는다(replace) — [뒤로]가 필터 되돌리기로 소비되면
      // 상세→목록 복귀 동선이 망가진다. 복귀 시 필터 유지는 URL 자체로 이미 보장된다.
      setSearchParams(
        prev => {
          const params = new URLSearchParams(prev)
          if (next.length === 0) params.delete(KIND_PARAM)
          else params.set(KIND_PARAM, next.join(KIND_SEPARATOR))
          return params
        },
        {replace: true},
      )
    },
    [setSearchParams],
  )

  const toggle = useCallback(
    (kind: MotorKind): void => {
      const next = selected.includes(kind)
        ? selected.filter(item => item !== kind)
        : MOTOR_KINDS.filter(item => item === kind || selected.includes(item))
      writeSelected(next)
    },
    [selected, writeSelected],
  )

  const clear = useCallback((): void => writeSelected([]), [writeSelected])

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
