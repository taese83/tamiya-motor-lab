import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'

import {MeasureActionDock, deriveMeasureAction} from './MeasureActionDock'

import type {MeasureView} from './measure-view'

// v2.7 기록 3종 unit — 브라우저 QA는 마이크 없이 measuring 상태에 못 들어가 이 경로를
// 렌더조차 하지 못한다(preview는 no-permission으로 귀결). 여기서 순수 산출과 렌더를 검증한다.

const MEASURING: MeasureView = {status: 'measuring', panoHz: 512, rpm: 30720, isStable: true}
const WEAK: MeasureView = {status: 'weak-signal'}
const PENDING = {label: '10초 후 기록', remainingSec: 7, waitingForStable: false}

const noopHandlers = {
  onRecord: () => undefined,
  onCancelCapture: () => undefined,
  onActivate: () => undefined,
  onRetryPermission: () => undefined,
  onToggleSettingsHelp: () => undefined,
  onResume: () => undefined,
  onBackToOrigin: () => undefined,
}

describe('deriveMeasureAction — v2.7 지연 대기 우선순위', () => {
  it('measuring이면 기록 액션이고 persistence ready면 활성이다', () => {
    expect(deriveMeasureAction(MEASURING, null, true)).toEqual({kind: 'record', disabled: false})
  })

  it('persistence가 준비되지 않으면 기록은 비활성이다', () => {
    expect(deriveMeasureAction(MEASURING, null, false)).toEqual({kind: 'record', disabled: true})
  })

  it('지연 대기 중이면 view가 measuring이어도 대기 표시로 치환된다', () => {
    expect(deriveMeasureAction(MEASURING, null, true, PENDING)).toEqual({
      kind: 'capture-pending',
      ...PENDING,
    })
  })

  it('대기 중 신호가 흔들려도(weak-signal) 대기 표시가 유지된다 — 취소 수단 보전', () => {
    // 이게 깨지면 카운트다운 중 신호가 약해질 때 [취소]가 사라져 사용자가 갇힌다
    expect(deriveMeasureAction(WEAK, null, true, PENDING)).toEqual({
      kind: 'capture-pending',
      ...PENDING,
    })
  })

  it('왕복 모드는 지연 대기보다 우선한다 — 왕복 중 기록 진입점 0개(INV-21)', () => {
    const action = deriveMeasureAction(
      MEASURING,
      {motorName: '테스트', origin: 'motor'},
      true,
      PENDING,
    )
    expect(action).toEqual({kind: 'back-to-origin', motorName: '테스트', origin: 'motor'})
  })
})

describe('MeasureActionDock — 기록 3종 렌더', () => {
  it('기록 상태에서 즉시·10초·1분 3버튼을 노출한다', () => {
    render(<MeasureActionDock {...noopHandlers} action={{kind: 'record', disabled: false}} />)

    const group = screen.getByRole('group', {name: '기록 방식'})
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('button', {name: '즉시 기록'})).toBeInTheDocument()
    expect(screen.getByRole('button', {name: '10초 후 기록'})).toBeInTheDocument()
    expect(screen.getByRole('button', {name: '1분 후 기록'})).toBeInTheDocument()
  })

  it('각 버튼은 자기 타입 키를 전달한다', async () => {
    const onRecord = vi.fn()
    const user = userEvent.setup()
    render(
      <MeasureActionDock {...noopHandlers} onRecord={onRecord} action={{kind: 'record', disabled: false}} />,
    )

    await user.click(screen.getByRole('button', {name: '즉시 기록'}))
    await user.click(screen.getByRole('button', {name: '10초 후 기록'}))
    await user.click(screen.getByRole('button', {name: '1분 후 기록'}))

    const pressedKeys = onRecord.mock.calls.map((call): unknown => call[0])
    expect(pressedKeys).toEqual(['immediate', 'sec10', 'min1'])
  })

  it('비활성 기록은 상시 렌더되지만 탭이 전달되지 않는다 (자리 이동 없음 — M-5)', async () => {
    const onRecord = vi.fn()
    const user = userEvent.setup()
    render(
      <MeasureActionDock {...noopHandlers} onRecord={onRecord} action={{kind: 'record', disabled: true}} />,
    )

    const immediate = screen.getByRole('button', {name: '즉시 기록'})
    expect(immediate).toHaveAttribute('aria-disabled', 'true')
    await user.click(immediate)
    expect(onRecord).not.toHaveBeenCalled()
  })

  it('지연 대기는 남은 초와 취소를 노출한다', async () => {
    const onCancelCapture = vi.fn()
    const user = userEvent.setup()
    render(
      <MeasureActionDock
        {...noopHandlers}
        onCancelCapture={onCancelCapture}
        action={{kind: 'capture-pending', ...PENDING}}
      />,
    )

    expect(screen.getByText(/10초 후 기록/)).toBeInTheDocument()
    expect(screen.getByText(/7초 남음/)).toBeInTheDocument()
    // 대기 중에는 기록 버튼이 사라진다 — 중복 시작 불가
    expect(screen.queryByRole('button', {name: '즉시 기록'})).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', {name: '취소'}))
    expect(onCancelCapture).toHaveBeenCalledOnce()
  })

  it('만료 후 안정 대기 중이면 남은 초 대신 대기 문구를 보여준다', () => {
    render(
      <MeasureActionDock
        {...noopHandlers}
        action={{
          kind: 'capture-pending',
          label: '1분 후 기록',
          remainingSec: 0,
          waitingForStable: true,
        }}
      />,
    )

    expect(screen.getByText(/수치가 안정되면 기록합니다/)).toBeInTheDocument()
    expect(screen.queryByText(/남음/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', {name: '취소'})).toBeInTheDocument()
  })
})
