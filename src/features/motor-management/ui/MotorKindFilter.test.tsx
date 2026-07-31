import {fireEvent, render, screen} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'

import {MotorKindFilter} from './MotorKindFilter'

import type {MotorKindFilterOption} from '../model'

// 단일 선택 탭 필터 (v2.x — 사용자 확정: 다중선택 칩 → 탭). 완전 제어형이라
// 로그인 게이트 뒤의 실화면 대신 여기서 단일 선택 계약을 고정한다.

const OPTIONS: ReadonlyArray<MotorKindFilterOption> = [
  {kind: 'torque', count: 2, selected: false},
  {kind: 'hyper_dash', count: 1, selected: true},
]

describe('MotorKindFilter (단일 선택 탭)', () => {
  it('[전체] + 존재 종류가 탭으로 렌더되고, 선택 탭 하나만 aria-selected다', () => {
    render(
      <MotorKindFilter
        options={OPTIONS}
        selectedKind="hyper_dash"
        onSelect={() => undefined}
        onClear={() => undefined}
      />,
    )
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map(tab => tab.textContent)).toEqual(['전체', '토크튠 2', '하이퍼대시 1'])
    expect(tabs.filter(tab => tab.getAttribute('aria-selected') === 'true')).toHaveLength(1)
    expect(screen.getByRole('tab', {name: '하이퍼대시 1'})).toHaveAttribute('aria-selected', 'true')
  })

  it('종류 탭을 누르면 onSelect(kind), [전체] 탭은 onClear가 호출된다', () => {
    const onSelect = vi.fn()
    const onClear = vi.fn()
    render(
      <MotorKindFilter
        options={OPTIONS}
        selectedKind="hyper_dash"
        onSelect={onSelect}
        onClear={onClear}
      />,
    )

    fireEvent.click(screen.getByRole('tab', {name: '토크튠 2'}))
    expect(onSelect).toHaveBeenCalledWith('torque')

    fireEvent.click(screen.getByRole('tab', {name: '전체'}))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('선택 없음(null)이면 [전체] 탭이 활성이다', () => {
    render(
      <MotorKindFilter
        options={OPTIONS.map(option => ({...option, selected: false}))}
        selectedKind={null}
        onSelect={() => undefined}
        onClear={() => undefined}
      />,
    )
    expect(screen.getByRole('tab', {name: '전체'})).toHaveAttribute('aria-selected', 'true')
  })
})
