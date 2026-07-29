import {act, fireEvent, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useState} from 'react'
import {describe, expect, it, vi} from 'vitest'

import {SwipeActions} from './SwipeActions'
import {useSingleOpenRow} from './use-single-open-row'

// 스와이프 제스처 unit — 브라우저 QA로는 확인이 어려운 구간을 여기서 고정한다.
// 실제 손가락 입력은 preview 자동화로 재현할 수 없고(포인터 압력·경로가 없음),
// 방향 판정·클릭 억제는 "틀려도 화면상 티가 안 나는" 종류의 버그라 회귀 감지가 필요하다.

const TRAY_WIDTH = 112

/** 제어형 래퍼 — 실제 소비 형태(목록이 open을 소유)와 같은 배선으로 검증한다 */
function Harness({
  onRowClick = () => undefined,
  onAction = () => undefined,
}: {
  onRowClick?: () => void
  onAction?: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <SwipeActions
      open={open}
      onOpenChange={setOpen}
      trayWidth={TRAY_WIDTH}
      actions={<button onClick={onAction}>삭제</button>}>
      <button onClick={onRowClick}>행 본체</button>
    </SwipeActions>
  )
}

/** 콘텐츠 레이어(transform을 받는 요소) */
const contentLayer = (container: HTMLElement): HTMLElement => {
  const el = container.querySelector('[data-swipe-tray]')?.nextElementSibling
  if (!(el instanceof HTMLElement)) throw new Error('content layer를 찾지 못했다')
  return el
}

/** 포인터 제스처 1회 — pointerType touch 고정(마우스는 의도적으로 제외 대상) */
const swipe = (target: HTMLElement, {dx, dy = 0}: {dx: number; dy?: number}) => {
  fireEvent.pointerDown(target, {clientX: 200, clientY: 100, pointerType: 'touch'})
  // 중간 이동 1회 — 방향 락은 첫 유효 이동에서 결정된다
  fireEvent.pointerMove(target, {
    clientX: 200 + dx / 2,
    clientY: 100 + dy / 2,
    pointerType: 'touch',
  })
  fireEvent.pointerMove(target, {clientX: 200 + dx, clientY: 100 + dy, pointerType: 'touch'})
  fireEvent.pointerUp(target, {clientX: 200 + dx, clientY: 100 + dy, pointerType: 'touch'})
}

interface PointerHandlers {
  onPointerDown: (event: unknown) => void
  onPointerMove: (event: unknown) => void
  onPointerUp: (event: unknown) => void
}

/**
 * 특정 render 시점의 핸들러를 붙잡아둔다 — 이후 re-render를 반영하지 않는 "굳은" 참조.
 * 빠른 플릭에서 move·up이 한 프레임에 합쳐지는 상황을 재현하는 용도.
 */
const frozenPointerHandlers = (el: HTMLElement): PointerHandlers => {
  const key = Object.keys(el).find(k => k.startsWith('__reactProps'))
  if (key === undefined) throw new Error('react props를 찾지 못했다')
  const props = (el as unknown as Record<string, unknown>)[key]
  const {onPointerDown, onPointerMove, onPointerUp} = props as Partial<PointerHandlers>
  if (
    typeof onPointerDown !== 'function' ||
    typeof onPointerMove !== 'function' ||
    typeof onPointerUp !== 'function'
  ) {
    throw new Error('pointer 핸들러가 붙어 있지 않다')
  }
  return {onPointerDown, onPointerMove, onPointerUp}
}

/**
 * 이동 없는 탭 1회 — 실제 터치 탭과 같은 이벤트 순서(down → up → click).
 * 스와이프 직후 따라오는 click과 **다른 제스처**임을 구분해야 하므로 별도 헬퍼로 둔다.
 */
const tap = (target: HTMLElement) => {
  fireEvent.pointerDown(target, {clientX: 200, clientY: 100, pointerType: 'touch'})
  fireEvent.pointerUp(target, {clientX: 200, clientY: 100, pointerType: 'touch'})
  fireEvent.click(target)
}

describe('SwipeActions 제스처', () => {
  it('왼쪽으로 충분히 밀면 트레이가 열린다', () => {
    const {container} = render(<Harness />)
    const content = contentLayer(container)

    swipe(content, {dx: -TRAY_WIDTH})

    expect(content.style.transform).toBe(`translate3d(${-TRAY_WIDTH}px, 0, 0)`)
  })

  it('한 render의 핸들러로 move·up이 연속 처리돼도 열린다 — 빠른 플릭 프레임 합쳐짐 방어', () => {
    const {container} = render(<Harness />)
    const content = contentLayer(container)

    // 실제 브라우저에서 마지막 pointermove와 pointerup이 한 프레임에 합쳐지면 두 핸들러가
    // **같은 render의 클로저**로 실행된다. 그때 up이 state(dragOffset)를 읽으면 아직 null이라
    // "열지 않음"으로 오판한다(실측으로 발견). 여기서는 그 상황을 핸들러를 미리 붙잡아 재현한다.
    const frozen = frozenPointerHandlers(content)
    const fake = (x: number) => ({pointerType: 'touch', clientX: x, clientY: 100, target: content})

    // React 이벤트 밖의 직접 호출이라 batching이 자동으로 풀리지 않는다 — act로 flush한다
    act(() => {
      frozen.onPointerDown(fake(300))
      frozen.onPointerMove(fake(240))
      frozen.onPointerMove(fake(180))
      frozen.onPointerUp(fake(180))
    })

    expect(content.style.transform).toBe(`translate3d(${-TRAY_WIDTH}px, 0, 0)`)
  })

  it('임계 미달로 밀면 닫힌 상태로 되돌아간다 — 살짝 스친 제스처로 열리지 않는다', () => {
    const {container} = render(<Harness />)
    const content = contentLayer(container)

    // 트레이 폭의 절반 미만
    swipe(content, {dx: -30})

    expect(content.style.transform).toBe('translate3d(0px, 0, 0)')
  })

  it('오른쪽으로 밀어도 열리지 않는다 — 열림은 왼쪽 방향 전용', () => {
    const {container} = render(<Harness />)
    const content = contentLayer(container)

    swipe(content, {dx: 120})

    expect(content.style.transform).toBe('translate3d(0px, 0, 0)')
  })

  it('세로가 우세한 제스처는 스와이프로 판정하지 않는다 — 스크롤을 방해하지 않는다', () => {
    const {container} = render(<Harness />)
    const content = contentLayer(container)

    // 가로도 임계를 넘지만 세로가 더 크다(대각선 스크롤)
    swipe(content, {dx: -60, dy: -120})

    expect(content.style.transform).toBe('translate3d(0px, 0, 0)')
  })

  it('드래그 핸들에서 시작한 포인터는 무시한다 — DnD 소유', () => {
    const {container} = render(
      <SwipeActions
        open={false}
        onOpenChange={() => undefined}
        trayWidth={TRAY_WIDTH}
        actions={null}>
        <button data-swipe-ignore="">핸들</button>
      </SwipeActions>,
    )
    const content = contentLayer(container)

    swipe(screen.getByText('핸들'), {dx: -TRAY_WIDTH})

    expect(content.style.transform).toBe('translate3d(0px, 0, 0)')
  })

  it('gestureDisabled면 제스처가 위치를 바꾸지 않는다', () => {
    const {container} = render(
      <SwipeActions
        gestureDisabled
        open={false}
        onOpenChange={() => undefined}
        trayWidth={TRAY_WIDTH}
        actions={null}>
        <button>행</button>
      </SwipeActions>,
    )
    const content = contentLayer(container)

    swipe(content, {dx: -TRAY_WIDTH})

    expect(content.style.transform).toBe('translate3d(0px, 0, 0)')
  })
})

describe('SwipeActions 레이어', () => {
  it('콘텐츠 레이어가 불투명하다 — 닫힌 트레이가 행 위로 비치지 않아야 한다', () => {
    const {container} = render(<Harness />)
    const content = contentLayer(container)

    // 실측으로 발견한 회귀: 반투명 카드(MotorRow 종류색 tint alpha 0.16)를 감싸면
    // 트레이 아이콘·라벨이 닫힌 상태에서도 수치 위로 겹쳐 보였다.
    const {backgroundColor} = getComputedStyle(content)
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(backgroundColor).not.toBe('transparent')
  })
})

describe('SwipeActions 클릭 경합', () => {
  it('스와이프 끝에 따라오는 click은 행 본체 액션으로 새지 않는다', () => {
    const onRowClick = vi.fn()
    const {container} = render(<Harness onRowClick={onRowClick} />)
    const content = contentLayer(container)
    const row = screen.getByText('행 본체')

    swipe(content, {dx: -TRAY_WIDTH})
    fireEvent.click(row)

    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('열린 상태에서 행 본체를 누르면 닫기가 먼저다 — 의도치 않은 화면 전환 방지', () => {
    const onRowClick = vi.fn()
    const {container} = render(<Harness onRowClick={onRowClick} />)
    const content = contentLayer(container)

    swipe(content, {dx: -TRAY_WIDTH})
    expect(content.style.transform).toBe(`translate3d(${-TRAY_WIDTH}px, 0, 0)`)

    // 스와이프 끝의 click은 이미 삼켜졌다(위 테스트) — 여기서는 **별개의 새 탭**을 낸다
    tap(screen.getByText('행 본체'))

    expect(onRowClick).not.toHaveBeenCalled()
    expect(content.style.transform).toBe('translate3d(0px, 0, 0)')
  })

  it('제스처 없는 평소 탭은 정상 통과한다', () => {
    const onRowClick = vi.fn()
    render(<Harness onRowClick={onRowClick} />)

    fireEvent.click(screen.getByText('행 본체'))

    expect(onRowClick).toHaveBeenCalledTimes(1)
  })
})

describe('SwipeActions 비제스처 경로', () => {
  it('트레이 액션에 포커스가 들어오면 트레이가 열린다 — 보이지 않는 컨트롤에 포커스 금지', async () => {
    const user = userEvent.setup()
    const {container} = render(<Harness />)
    const content = contentLayer(container)

    expect(content.style.transform).toBe('translate3d(0px, 0, 0)')
    await user.tab() // 첫 포커스 대상 = 트레이 버튼(DOM 순서상 콘텐츠보다 앞)

    expect(screen.getByText('삭제')).toHaveFocus()
    expect(content.style.transform).toBe(`translate3d(${-TRAY_WIDTH}px, 0, 0)`)
  })

  it('트레이 액션은 제스처 없이도 호출 가능하다', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(<Harness onAction={onAction} />)

    await user.click(screen.getByText('삭제'))

    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('ESC로 열린 트레이를 닫는다', () => {
    const {container} = render(<Harness />)
    const content = contentLayer(container)

    swipe(content, {dx: -TRAY_WIDTH})
    fireEvent.keyDown(document, {key: 'Escape'})

    expect(content.style.transform).toBe('translate3d(0px, 0, 0)')
  })
})

describe('useSingleOpenRow', () => {
  function MultiRow() {
    const swipeState = useSingleOpenRow()
    return (
      <>
        <span data-testid="open">{swipeState.openId ?? 'none'}</span>
        {['a', 'b'].map(id => (
          <div key={id}>
            <button onClick={() => swipeState.setOpen(id, true)}>{`open-${id}`}</button>
            <button onClick={() => swipeState.setOpen(id, false)}>{`close-${id}`}</button>
          </div>
        ))}
        <button onClick={swipeState.closeAll}>close-all</button>
      </>
    )
  }

  it('한 번에 한 행만 열린다', () => {
    render(<MultiRow />)

    fireEvent.click(screen.getByText('open-a'))
    expect(screen.getByTestId('open')).toHaveTextContent('a')

    fireEvent.click(screen.getByText('open-b'))
    expect(screen.getByTestId('open')).toHaveTextContent('b')
  })

  it('다른 행의 닫기 요청은 현재 열린 행을 닫지 않는다 — 포커스 이동 순서 경합 방지', () => {
    render(<MultiRow />)

    fireEvent.click(screen.getByText('open-b'))
    // 행 a가 blur로 닫기를 요청한다(포커스가 a→b로 넘어간 직후 도착하는 순서)
    fireEvent.click(screen.getByText('close-a'))

    expect(screen.getByTestId('open')).toHaveTextContent('b')
  })

  it('closeAll은 열린 행을 접는다', () => {
    render(<MultiRow />)

    fireEvent.click(screen.getByText('open-a'))
    fireEvent.click(screen.getByText('close-all'))

    expect(screen.getByTestId('open')).toHaveTextContent('none')
  })
})
