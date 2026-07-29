import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'

import {MeasureActionDock, deriveMeasureAction} from './MeasureActionDock'

import type {MeasureView} from './measure-view'

// Z3 액션 순수 산출·렌더 unit (§2.7 "unit 대상" 계약).
// 브라우저 QA는 마이크 없이 measuring에 도달하지 못해 record 경로를 활성 상태로 확인할 수
// 없다(preview는 starting/no-permission으로 귀결) — 그 구간을 여기서 고정한다.

const MEASURING: MeasureView = {status: 'measuring', panoHz: 512, rpm: 30720, isStable: true}
const WEAK: MeasureView = {status: 'weak-signal'}

const noopHandlers = {
  onRecord: () => undefined,
  onActivate: () => undefined,
  onRetryPermission: () => undefined,
  onToggleSettingsHelp: () => undefined,
  onResume: () => undefined,
  onBackToOrigin: () => undefined,
}

describe('deriveMeasureAction', () => {
  it('measuring + persistence ready면 [기록] 활성', () => {
    expect(deriveMeasureAction(MEASURING, null, true)).toEqual({kind: 'record', disabled: false})
  })

  it('persistence가 준비되지 않으면 [기록] 비활성 — 사유는 전역 배너 소관', () => {
    expect(deriveMeasureAction(MEASURING, null, false)).toEqual({kind: 'record', disabled: true})
  })

  it('신호가 약하면 [기록] 비활성 (measuring 아님)', () => {
    expect(deriveMeasureAction(WEAK, null, true)).toEqual({kind: 'record', disabled: true})
  })

  it('awaiting-gesture는 [탭하여 시작]으로 치환된다', () => {
    expect(deriveMeasureAction({status: 'awaiting-gesture'}, null, true)).toEqual({kind: 'activate'})
  })

  it('왕복 모드는 measuring이어도 복귀 액션으로 치환된다 — 왕복 중 기록 진입점 0개(INV-21)', () => {
    expect(deriveMeasureAction(MEASURING, {motorName: '테스트', origin: 'motor'}, true)).toEqual({
      kind: 'back-to-origin',
      motorName: '테스트',
      origin: 'motor',
    })
  })
})

describe('MeasureActionDock', () => {
  it('[기록] 단일 버튼을 렌더한다', () => {
    render(<MeasureActionDock {...noopHandlers} action={{kind: 'record', disabled: false}} />)
    expect(screen.getByRole('button', {name: '기록'})).toBeInTheDocument()
  })

  it('[기록] 탭을 상위로 전달한다', async () => {
    const onRecord = vi.fn()
    const user = userEvent.setup()
    render(
      <MeasureActionDock {...noopHandlers} onRecord={onRecord} action={{kind: 'record', disabled: false}} />,
    )

    await user.click(screen.getByRole('button', {name: '기록'}))
    expect(onRecord).toHaveBeenCalledOnce()
  })

  it('비활성 [기록]은 상시 렌더되지만 탭이 전달되지 않는다 (자리 이동 없음 — M-5)', async () => {
    const onRecord = vi.fn()
    const user = userEvent.setup()
    render(
      <MeasureActionDock {...noopHandlers} onRecord={onRecord} action={{kind: 'record', disabled: true}} />,
    )

    const button = screen.getByRole('button', {name: '기록'})
    expect(button).toBeInTheDocument() // 사라지지 않는다
    expect(button).toHaveAttribute('aria-disabled', 'true')
    await user.click(button)
    expect(onRecord).not.toHaveBeenCalled()
  })

  it('복귀 라벨은 origin별로 갈린다 (v2.5)', () => {
    const {unmount} = render(
      <MeasureActionDock
        {...noopHandlers}
        action={{kind: 'back-to-origin', motorName: '테스트', origin: 'motor'}}
      />,
    )
    expect(screen.getByRole('button', {name: '모터로 돌아가기'})).toBeInTheDocument()
    unmount()

    render(
      <MeasureActionDock
        {...noopHandlers}
        action={{kind: 'back-to-origin', motorName: '테스트', origin: 'race'}}
      />,
    )
    expect(screen.getByRole('button', {name: '레이스로 돌아가기'})).toBeInTheDocument()
  })
})
