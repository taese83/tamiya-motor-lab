import {fireEvent, render, screen} from '@testing-library/react'
import {useState} from 'react'
import {describe, expect, it, vi} from 'vitest'

import {VoltageStepper} from './VoltageStepper'

// 전압 스텝퍼 +/− unit (R33) — 핵심 계약: **소수 2자리 유지**. 이전 toFixed(1)+step 0.1은 2번째
// 소수를 파괴해(2.68에서 − → 2.6) 입력이 1자리로 갇혔다. AI 추천이 소수 2자리로 채우므로,
// 스텝 조정이 그 자리를 반올림해 버리면 실사용에서 값이 어긋난다 — 여기서 고정한다.

/** 제어형 래퍼 — 실제 소비 형태(폼이 raw 문자열을 소유)와 같은 배선으로 검증 */
function Harness({initial = '', onChange}: {initial?: string; onChange?: (raw: string) => void}) {
  const [value, setValue] = useState(initial)
  return (
    <VoltageStepper
      value={value}
      onChange={raw => {
        setValue(raw)
        onChange?.(raw)
      }}
    />
  )
}

describe('VoltageStepper — 소수 2자리 스텝(R33)', () => {
  it('+ 는 0.02 올리고 소수 2자리를 유지한다', () => {
    const onChange = vi.fn()
    render(<Harness initial="2.58" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('전압 올리기'))
    expect(onChange).toHaveBeenLastCalledWith('2.60')
  })

  it('− 는 0.02 내리고 2번째 소수를 반올림하지 않는다(2.68 → 2.66)', () => {
    const onChange = vi.fn()
    render(<Harness initial="2.68" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('전압 내리기'))
    expect(onChange).toHaveBeenLastCalledWith('2.66')
  })

  it('1자리 값(2.6)에서 − 하면 2.58 — 이전엔 2.6으로 반올림돼 갇혔다', () => {
    const onChange = vi.fn()
    render(<Harness initial="2.6" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('전압 내리기'))
    expect(onChange).toHaveBeenLastCalledWith('2.58')
  })

  it('빈 값이면 no-op(onChange 미호출)', () => {
    const onChange = vi.fn()
    render(<Harness initial="" onChange={onChange} />)
    // 빈 값은 hasNumber=false라 버튼 disabled — 클릭해도 아무 일 없음
    fireEvent.click(screen.getByLabelText('전압 올리기'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('상한(9.9)에서 + 는 비활성 — 대역을 넘지 않는다', () => {
    render(<Harness initial="9.9" />)
    expect(screen.getByLabelText('전압 올리기')).toBeDisabled()
  })
})
