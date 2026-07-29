import {beforeEach, describe, expect, it} from 'vitest'

import {sortMotorSummaries, useMotorSortStore} from './use-motor-sort'

import type {MotorSummary} from '@entities/motor'
import type {MotorKind} from '@shared/config/domain'

// 모터 정렬 unit (v2.26). 정렬 결과는 화면에 매일 보이는 순서라 실제 비교자를 고정한다.

const summary = (over: {
  id: string
  name: string
  createdAt: string
  pano?: number
  kind?: MotorKind
}): MotorSummary => ({
  motor: {
    id: over.id,
    name: over.name,
    kind: over.kind ?? 'torque',
    sortOrder: 0,
    createdAt: over.createdAt,
    updatedAt: over.createdAt,
  },
  measureCount: over.pano === undefined ? 0 : 1,
  ...(over.pano === undefined
    ? {}
    : {
        lastMeasure: {
          id: `m-${over.id}`,
          motorId: over.id,
          panoHz: over.pano,
          rpm: Math.round(over.pano * 60),
          measuredAt: over.createdAt,
        },
      }),
  raceCount: 0,
  panoTrend: [],
})

const A = summary({id: 'a', name: '토크튠 2', createdAt: '2026-01-01T00:00:00.000Z', pano: 300})
const B = summary({id: 'b', name: '가나다', createdAt: '2026-03-01T00:00:00.000Z', pano: 500})
const C = summary({id: 'c', name: '하이퍼', createdAt: '2026-02-01T00:00:00.000Z'}) // 측정 없음
const LIST = [A, B, C]

const ids = (list: MotorSummary[]) => list.map(s => s.motor.id)

describe('sortMotorSummaries', () => {
  it('recent = createdAt 내림차순(최신 먼저)', () => {
    expect(ids(sortMotorSummaries(LIST, 'recent'))).toEqual(['b', 'c', 'a'])
  })

  it('name = ko locale 오름차순', () => {
    expect(ids(sortMotorSummaries(LIST, 'name'))).toEqual(['b', 'a', 'c'])
  })

  it('pano = 파노 내림차순, 측정 없는 모터는 항상 뒤로', () => {
    expect(ids(sortMotorSummaries(LIST, 'pano'))).toEqual(['b', 'a', 'c'])
  })

  it('원본 배열을 변형하지 않는다(복사 후 정렬)', () => {
    const before = ids(LIST)
    sortMotorSummaries(LIST, 'name')
    expect(ids(LIST)).toEqual(before)
  })
})

describe('useMotorSortStore', () => {
  beforeEach(() => useMotorSortStore.setState({sort: 'recent'}))

  it('기본값은 최근 등록순', () => {
    expect(useMotorSortStore.getState().sort).toBe('recent')
  })

  it('setSort로 정렬 키를 바꾼다', () => {
    useMotorSortStore.getState().setSort('pano')
    expect(useMotorSortStore.getState().sort).toBe('pano')
  })
})
