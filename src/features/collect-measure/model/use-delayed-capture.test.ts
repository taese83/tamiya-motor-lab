import {act, renderHook} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {useDelayedCapture} from './use-delayed-capture'

import type {CollectSnapshot} from './use-collect-flow'

// v2.7 지연 수집 게이트 unit — 브라우저 QA로는 도달할 수 없는 경로다(마이크 없이는 measuring
// 상태에 들어가지 못해 기록 액션 자체가 렌더되지 않는다). 타이밍·안정대기·취소를 가짜 타이머로 검증한다.

const SNAPSHOT: CollectSnapshot = {panoHz: 512, rpm: 30720}

describe('useDelayedCapture', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('즉시 기록은 카운트다운 없이 탭 시점 스냅샷을 그대로 캡처한다', () => {
    const onCapture = vi.fn()
    const {result} = renderHook(() =>
      useDelayedCapture({readSnapshot: () => SNAPSHOT, onCapture}),
    )

    act(() => {
      result.current.start('immediate')
    })

    expect(onCapture).toHaveBeenCalledExactlyOnceWith(SNAPSHOT)
    expect(result.current.pending).toBeNull() // 대기 상태로 들어가지 않는다
  })

  it('즉시 기록이 불안정하면 아무것도 캡처하지 않는다 (값 없는 기록 금지)', () => {
    const onCapture = vi.fn()
    const {result} = renderHook(() => useDelayedCapture({readSnapshot: () => null, onCapture}))

    act(() => {
      result.current.start('immediate')
    })

    expect(onCapture).not.toHaveBeenCalled()
    expect(result.current.pending).toBeNull()
  })

  it('10초 후 기록은 만료 전에는 캡처하지 않고 남은 초를 노출한다', () => {
    const onCapture = vi.fn()
    const {result} = renderHook(() =>
      useDelayedCapture({readSnapshot: () => SNAPSHOT, onCapture}),
    )

    act(() => {
      result.current.start('sec10')
    })
    expect(result.current.pending).toEqual({
      label: '10초 후 기록',
      remainingSec: 10,
      waitingForStable: false,
    })

    act(() => {
      vi.advanceTimersByTime(4_000)
    })
    expect(onCapture).not.toHaveBeenCalled()
    expect(result.current.pending?.remainingSec).toBe(6)

    // 만료 — 이 시점의 스냅샷이 기록된다(탭 시점 값이 아니다)
    act(() => {
      vi.advanceTimersByTime(6_000)
    })
    expect(onCapture).toHaveBeenCalledExactlyOnceWith(SNAPSHOT)
    expect(result.current.pending).toBeNull()
  })

  it('1분 후 기록도 같은 계약으로 동작한다', () => {
    const onCapture = vi.fn()
    const {result} = renderHook(() =>
      useDelayedCapture({readSnapshot: () => SNAPSHOT, onCapture}),
    )

    act(() => {
      result.current.start('min1')
    })
    expect(result.current.pending?.label).toBe('1분 후 기록')
    expect(result.current.pending?.remainingSec).toBe(60)

    act(() => {
      vi.advanceTimersByTime(59_000)
    })
    expect(onCapture).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(onCapture).toHaveBeenCalledOnce()
  })

  it('만료 시점에 불안정하면 실패로 끝내지 않고 안정 시점까지 기다린다', () => {
    const onCapture = vi.fn()
    let stable = false
    const {result} = renderHook(() =>
      useDelayedCapture({readSnapshot: () => (stable ? SNAPSHOT : null), onCapture}),
    )

    act(() => {
      result.current.start('sec10')
    })
    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    // 만료했지만 값이 없다 — 대기 표시로 전환하고 캡처하지 않는다
    expect(onCapture).not.toHaveBeenCalled()
    expect(result.current.pending).toEqual({
      label: '10초 후 기록',
      remainingSec: 0,
      waitingForStable: true,
    })

    // 계속 불안정한 동안에도 기록되지 않는다
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(onCapture).not.toHaveBeenCalled()

    // 안정되면 그 시점 값으로 캡처
    stable = true
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(onCapture).toHaveBeenCalledExactlyOnceWith(SNAPSHOT)
    expect(result.current.pending).toBeNull()
  })

  it('취소하면 만료 시각이 지나도 캡처하지 않는다', () => {
    const onCapture = vi.fn()
    const {result} = renderHook(() =>
      useDelayedCapture({readSnapshot: () => SNAPSHOT, onCapture}),
    )

    act(() => {
      result.current.start('sec10')
    })
    act(() => {
      result.current.cancel()
    })
    expect(result.current.pending).toBeNull()

    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(onCapture).not.toHaveBeenCalled()
  })

  it('언마운트 후에는 타이머가 남아 캡처하지 않는다', () => {
    const onCapture = vi.fn()
    const {result, unmount} = renderHook(() =>
      useDelayedCapture({readSnapshot: () => SNAPSHOT, onCapture}),
    )

    act(() => {
      result.current.start('sec10')
    })
    unmount()

    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(onCapture).not.toHaveBeenCalled()
  })

  it('만료 시점의 최신 값을 캡처한다 — 탭 시점 값을 들고 있지 않는다', () => {
    const onCapture = vi.fn()
    let current: CollectSnapshot = {panoHz: 400, rpm: 24000}
    const {result} = renderHook(() =>
      useDelayedCapture({readSnapshot: () => current, onCapture}),
    )

    act(() => {
      result.current.start('sec10')
    })
    current = {panoHz: 533.1, rpm: 31986} // 대기 중 모터 회전이 올라간 상황
    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(onCapture).toHaveBeenCalledExactlyOnceWith({panoHz: 533.1, rpm: 31986})
  })
})
