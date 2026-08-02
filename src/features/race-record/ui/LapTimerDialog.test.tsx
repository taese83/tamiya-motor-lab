import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {LapTimerDialog} from './LapTimerDialog'

// R41 ⑤ 랩타임 실측 상태기계: idle→시작→running→정지→stopped→완주/이탈/취소.
// 실시간 히어로 갱신용 rAF는 stub한다 — 정지 시점 값은 performance.now()로 동기 확정하므로
// 계측 정확성은 rAF에 의존하지 않는다(테스트는 상태 전환·콜백 계약만 고정).

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

function setup() {
  const onClose = vi.fn()
  const onResult = vi.fn()
  render(<LapTimerDialog open onClose={onClose} onResult={onResult} />)
  return {onClose, onResult}
}

describe('LapTimerDialog (R41 ⑤)', () => {
  it('open=false면 다이얼로그를 렌더하지 않는다', () => {
    render(<LapTimerDialog open={false} onClose={() => undefined} onResult={() => undefined} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('idle→시작→정지 순으로 컨트롤이 전환된다', async () => {
    const user = userEvent.setup()
    setup()

    // idle — [시작]만
    expect(screen.getByRole('button', {name: '시작'})).toBeInTheDocument()
    expect(screen.queryByRole('button', {name: '정지'})).toBeNull()

    // running — [정지]로 토글
    await user.click(screen.getByRole('button', {name: '시작'}))
    expect(screen.getByRole('button', {name: '정지'})).toBeInTheDocument()
    expect(screen.queryByRole('button', {name: '시작'})).toBeNull()

    // stopped — [완주][이탈][취소]
    await user.click(screen.getByRole('button', {name: '정지'}))
    expect(screen.getByRole('button', {name: '완주'})).toBeInTheDocument()
    expect(screen.getByRole('button', {name: '이탈'})).toBeInTheDocument()
    expect(screen.getByRole('button', {name: '취소'})).toBeInTheDocument()
  })

  it('완주는 onResult(finished, 초)를 호출한다', async () => {
    const user = userEvent.setup()
    const {onResult} = setup()

    await user.click(screen.getByRole('button', {name: '시작'}))
    await user.click(screen.getByRole('button', {name: '정지'}))
    await user.click(screen.getByRole('button', {name: '완주'}))

    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult.mock.calls[0]?.[0]).toBe('finished')
    expect(typeof onResult.mock.calls[0]?.[1]).toBe('number')
  })

  it('이탈은 onResult(retired, 초)를 호출한다', async () => {
    const user = userEvent.setup()
    const {onResult} = setup()

    await user.click(screen.getByRole('button', {name: '시작'}))
    await user.click(screen.getByRole('button', {name: '정지'}))
    await user.click(screen.getByRole('button', {name: '이탈'}))

    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult.mock.calls[0]?.[0]).toBe('retired')
  })

  it('취소는 무효 — onClose만 호출하고 onResult는 호출하지 않는다', async () => {
    const user = userEvent.setup()
    const {onClose, onResult} = setup()

    await user.click(screen.getByRole('button', {name: '시작'}))
    await user.click(screen.getByRole('button', {name: '정지'}))
    await user.click(screen.getByRole('button', {name: '취소'}))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onResult).not.toHaveBeenCalled()
  })
})
