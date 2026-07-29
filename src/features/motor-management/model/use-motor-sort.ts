import {useMemo} from 'react'

import {create} from 'zustand'
import {persist} from 'zustand/middleware'

import type {MotorSummary} from '@entities/motor'

// 모터 목록 정렬 (v2.26 — 사용자: DnD 수동 정렬 제거하고 정렬 3종 추가).
// 정렬은 **뷰 계층**이다 — 데이터층 정렬(sortOrder asc)은 건드리지 않고 표시 순서만 바꾼다
// (종류 필터와 동일 원칙). 선택은 kind-filter처럼 localStorage에 영속(재시작 후 유지).

export type MotorSortKey = 'recent' | 'pano' | 'name'

/** 기본값 = 최근 등록순(사용자 지정 디폴트) */
export const DEFAULT_MOTOR_SORT: MotorSortKey = 'recent'

export const MOTOR_SORT_OPTIONS: ReadonlyArray<{key: MotorSortKey; label: string}> = [
  {key: 'recent', label: '최근 등록순'},
  {key: 'pano', label: '파노 높은순'},
  {key: 'name', label: '이름순'},
]

const STORAGE_KEY = 'mml-motor-sort-1'
const isSortKey = (v: unknown): v is MotorSortKey => v === 'recent' || v === 'pano' || v === 'name'

interface MotorSortState {
  sort: MotorSortKey
  setSort: (sort: MotorSortKey) => void
}

export const useMotorSortStore = create<MotorSortState>()(
  persist(
    set => ({
      sort: DEFAULT_MOTOR_SORT,
      setSort: sort => set({sort}),
    }),
    {
      name: STORAGE_KEY,
      partialize: state => ({sort: state.sort}),
      // 외부 입력(localStorage) 검증 — 미지값은 기본값으로(잘못된 값으로 목록이 깨지지 않게)
      merge: (persisted, current) => ({
        ...current,
        sort: isSortKey((persisted as {sort?: unknown} | null)?.sort)
          ? (persisted as {sort: MotorSortKey}).sort
          : DEFAULT_MOTOR_SORT,
      }),
    },
  ),
)

/**
 * 정렬 비교자. 안정 정렬 전제로 동률은 원본(sortOrder asc) 순서를 유지한다.
 * - recent: createdAt 내림차순(최신 먼저)
 * - pano: 최신 측정 파노 내림차순. 측정 없음(lastMeasure undefined)은 **항상 뒤로**
 *   (값 없음을 0으로 취급해 최상위/최하위로 섞이지 않게 — 명시 분리)
 * - name: 이름 오름차순(ko locale — 한글·숫자 자연 정렬)
 */
/** 정렬 적용(원본 불변 — 복사 후 sort). 테스트·훅이 같은 구현을 공유한다 */
export function sortMotorSummaries(
  summaries: ReadonlyArray<MotorSummary>,
  key: MotorSortKey,
): MotorSummary[] {
  return [...summaries].sort(compare[key])
}

const compare: Record<MotorSortKey, (a: MotorSummary, b: MotorSummary) => number> = {
  recent: (a, b) => b.motor.createdAt.localeCompare(a.motor.createdAt),
  pano: (a, b) => {
    const av = a.lastMeasure?.panoHz
    const bv = b.lastMeasure?.panoHz
    if (av === undefined && bv === undefined) return 0
    if (av === undefined) return 1 // a를 뒤로
    if (bv === undefined) return -1 // b를 뒤로
    return bv - av
  },
  name: (a, b) => a.motor.name.localeCompare(b.motor.name, 'ko'),
}

export interface MotorSort {
  sort: MotorSortKey
  setSort: (sort: MotorSortKey) => void
  options: typeof MOTOR_SORT_OPTIONS
  /** 정렬 적용된 새 배열(원본 불변 — toSorted 대신 복사 후 sort) */
  sorted: ReadonlyArray<MotorSummary>
}

export function useMotorSort(summaries: ReadonlyArray<MotorSummary>): MotorSort {
  const sort = useMotorSortStore(state => state.sort)
  const setSort = useMotorSortStore(state => state.setSort)
  const sorted = useMemo(() => sortMotorSummaries(summaries, sort), [summaries, sort])
  return {sort, setSort, options: MOTOR_SORT_OPTIONS, sorted}
}
