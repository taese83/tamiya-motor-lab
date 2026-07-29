import {render} from '@testing-library/react'
import {describe, expect, it} from 'vitest'

import {PanoGauge} from './PanoGauge'

// PanoGauge 기하 unit — 브라우저 QA로는 **active 상태에 도달할 수 없다**(마이크 입력이 없으면
// view가 measuring이 되지 않아 panoHz가 null이고 바늘·진행 아크가 렌더되지 않는다).
// 두꺼운 트랙 개편(v2.13)에서 바늘 각도·진행 비율·두께 정합이 깨지지 않도록 여기서 고정한다.

// 주의: 바늘 회전·dashoffset은 MUI `sx`로 지정돼 **emotion 클래스**로 컴파일된다.
// getAttribute('style')로는 읽히지 않으므로 getComputedStyle로 확인한다.

const paths = (container: HTMLElement): SVGPathElement[] =>
  [...container.querySelectorAll('path')] as SVGPathElement[]

/** 진행 아크 = dasharray가 설정된 유일한 path (dasharray는 실제 속성이라 그대로 읽힌다) */
const progressPath = (container: HTMLElement): SVGPathElement | undefined =>
  paths(container).find(p => p.getAttribute('stroke-dasharray') !== null)

/** 바늘 그룹 = transform이 걸린 <g>. 없으면 null(dim 상태) */
const needleTransform = (container: HTMLElement): string | null => {
  for (const group of container.querySelectorAll('g')) {
    const {transform} = getComputedStyle(group)
    if (transform !== '' && transform !== 'none') return transform
  }
  return null
}

const progressDashOffset = (container: HTMLElement): string | null => {
  const path = progressPath(container)
  return path === undefined ? null : getComputedStyle(path).strokeDashoffset
}

describe('PanoGauge', () => {
  it('값이 없으면 진행 아크는 없지만 바늘은 최소 위치에 남는다 (dim 상태)', () => {
    // v2.13: 바늘을 숨기면 빈 트랙만 남아 "고장난 계기판"으로 보인다 —
    // 값 없음은 진행 아크 부재·중앙 placeholder·상태 라벨이 전달한다.
    const {container} = render(<PanoGauge panoHz={null} />)
    expect(progressPath(container)).toBeUndefined()
    expect(needleTransform(container)).toContain('rotate(-110deg)')
  })

  it('트랙과 진행 아크의 두께가 같다 — 진행분이 트랙을 채우는 것으로 읽혀야 한다', () => {
    const {container} = render(<PanoGauge panoHz={400} />)
    const widths = new Set(
      paths(container)
        .map(p => p.getAttribute('stroke-width'))
        .filter((w): w is string => w !== null),
    )
    // 트랙·레드라인·진행 아크가 모두 동일 두께(이전에는 트랙 2 위에 진행 4로 어긋났다)
    expect([...widths]).toEqual(['13'])
  })

  it('대역 중앙값은 바늘을 12시(0도)에 둔다', () => {
    // F0_RANGE 170~620의 중앙 = 395
    const {container} = render(<PanoGauge panoHz={395} />)
    expect(needleTransform(container)).toContain('rotate(0deg)')
  })

  it('대역 최소·최대는 스윕 양 끝(-110도 / +110도)에 대응한다', () => {
    const min = render(<PanoGauge panoHz={170} />)
    expect(needleTransform(min.container)).toContain('rotate(-110deg)')
    min.unmount()

    const max = render(<PanoGauge panoHz={620} />)
    expect(needleTransform(max.container)).toContain('rotate(110deg)')
  })

  it('대역을 벗어난 값은 끝점으로 클램프한다 — 바늘이 스윕 밖으로 나가지 않는다', () => {
    const low = render(<PanoGauge panoHz={10} />)
    expect(needleTransform(low.container)).toContain('rotate(-110deg)')
    low.unmount()

    const high = render(<PanoGauge panoHz={5000} />)
    expect(needleTransform(high.container)).toContain('rotate(110deg)')
  })

  it('진행 아크는 최소값에서 완전히 비고 최대값에서 완전히 찬다', () => {
    const min = render(<PanoGauge panoHz={170} />)
    const dashArray = progressPath(min.container)?.getAttribute('stroke-dasharray') ?? ''
    // 최소값: dashoffset === 전체 길이(= 아무것도 보이지 않음)
    expect(progressDashOffset(min.container)).toBe(dashArray)
    min.unmount()

    const max = render(<PanoGauge panoHz={620} />)
    expect(progressDashOffset(max.container)).toBe('0')
  })

  it('장식 채널이므로 전체가 aria-hidden이다 — canonical 수치는 BigNumber 텍스트', () => {
    const {container} = render(<PanoGauge panoHz={512} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
