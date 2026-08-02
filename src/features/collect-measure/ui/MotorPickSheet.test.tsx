import {fireEvent, render, screen} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'

import {MotorPickSheet} from './MotorPickSheet'

import type {MotorPickItem, MotorPickSheetProps} from './MotorPickSheet'

// R39(사용자 ②③) 계약 고정: 종류별 탭 필터(존재 종류 ≥2일 때만) +
// [+ 새 모터 추가] 상시 하단 버튼(모터 0개 포함). 로그인 게이트 뒤 실화면 대신
// 여기서 presentational 계약을 검증한다. provider 불필요(MUI 기본 테마).

const MOTORS: ReadonlyArray<MotorPickItem> = [
  {id: 'motor-1', name: '토크 1호', kind: 'torque', lastPanoHz: 320},
  {id: 'motor-2', name: '하이퍼 1호', kind: 'hyper_dash', lastPanoHz: null},
  {id: 'motor-3', name: '토크 2호', kind: 'torque', lastPanoHz: 410},
]

function renderSheet(overrides: Partial<MotorPickSheetProps> = {}) {
  const props: MotorPickSheetProps = {
    open: true,
    snapshot: null,
    motors: MOTORS,
    pendingMotorId: null,
    errorMessage: null,
    onSelect: vi.fn(),
    onRequestRegister: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<MotorPickSheet {...props} />)
  return props
}

describe('MotorPickSheet (R39 — 종류 탭 필터 + 상시 등록 버튼)', () => {
  it('모터 0개 — 중립 안내 문구와 [+ 새 모터 추가] 버튼이 있고, 버튼이 onRequestRegister를 호출한다', () => {
    const props = renderSheet({motors: []})

    expect(screen.getByText(/등록된 모터가 없습니다/)).toBeInTheDocument()
    const registerButton = screen.getByRole('button', {name: '+ 새 모터 추가'})
    fireEvent.click(registerButton)
    expect(props.onRequestRegister).toHaveBeenCalledTimes(1)
  })

  it('종류가 2개 이상 — [전체] + 존재 종류 라벨이 탭으로 렌더된다 (MOTOR_KINDS 순서)', () => {
    renderSheet()

    const tabs = screen.getAllByRole('tab')
    expect(tabs.map(tab => tab.textContent)).toEqual(['전체', '토크튠', '하이퍼대시'])
    expect(screen.getByRole('tab', {name: '전체'})).toHaveAttribute('aria-selected', 'true')
  })

  it('종류 탭 선택 — 그 종류 행만 남고 다른 종류 행은 사라진다', () => {
    renderSheet()

    fireEvent.click(screen.getByRole('tab', {name: '하이퍼대시'}))

    expect(screen.getByText('하이퍼 1호')).toBeInTheDocument()
    expect(screen.queryByText('토크 1호')).toBeNull()
    expect(screen.queryByText('토크 2호')).toBeNull()

    // [전체]로 복귀하면 전 행이 돌아온다 (단일 선택 탭 계약)
    fireEvent.click(screen.getByRole('tab', {name: '전체'}))
    expect(screen.getByText('토크 1호')).toBeInTheDocument()
    expect(screen.getByText('하이퍼 1호')).toBeInTheDocument()
  })

  it('모터가 있어도 [+ 새 모터 추가] 버튼이 항상 있다', () => {
    const props = renderSheet()

    const registerButton = screen.getByRole('button', {name: '+ 새 모터 추가'})
    fireEvent.click(registerButton)
    expect(props.onRequestRegister).toHaveBeenCalledTimes(1)
  })

  it('종류가 1개뿐이면 탭을 렌더하지 않는다', () => {
    renderSheet({motors: MOTORS.filter(motor => motor.kind === 'torque')})

    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.getByText('토크 1호')).toBeInTheDocument()
  })

  it('pending 중 — 행과 [+ 새 모터 추가] 버튼이 모두 비활성이고 해당 행은 "기록 중…"이다', () => {
    renderSheet({pendingMotorId: 'motor-1'})

    expect(screen.getByRole('button', {name: '+ 새 모터 추가'})).toBeDisabled()
    expect(screen.getByText('기록 중…')).toBeInTheDocument()
    // ListItemButton은 div+role=button — disabled는 aria-disabled로 나타난다(jest-dom toBeDisabled 미적용)
    expect(screen.getByRole('button', {name: /토크 2호/})).toHaveAttribute('aria-disabled', 'true')
  })
})
