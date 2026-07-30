import {render} from '@testing-library/react'
import {describe, expect, it} from 'vitest'

import {PanoGauge} from './PanoGauge'

// PanoGauge 기하 unit (v2.21 — 스케일 0~700). 브라우저 QA로는 active 상태에 도달할 수
// 없어(마이크 없으면 measuring 미도달) 여기서 각도·채움·클램프를 고정한다.
// sx는 emotion 클래스로 컴파일되므로 getComputedStyle로 읽는다.

const paths = (c: HTMLElement): SVGPathElement[] => [...c.querySelectorAll('path')]
const progressPath = (c: HTMLElement): SVGPathElement | undefined =>
  paths(c).find(p => p.getAttribute('stroke-dasharray') !== null)
const needleTransform = (c: HTMLElement): string | null => {
  for (const g of c.querySelectorAll('g')) {
    const {transform} = getComputedStyle(g)
    if (transform && transform !== 'none') return transform
  }
  return null
}
const dashOffset = (c: HTMLElement): number | null => {
  const p = progressPath(c)
  return p === null || p === undefined
    ? null
    : Number(getComputedStyle(p).strokeDashoffset.replace('px', ''))
}

describe('PanoGauge (0~700 스케일)', () => {
  it('값이 없으면 채움 아크는 없고 바늘은 최소(0=-110°)에 남는다', () => {
    const {container} = render(<PanoGauge panoHz={null} />)
    expect(progressPath(container)).toBeUndefined()
    expect(needleTransform(container)).toContain('rotate(-110deg)')
  })

  it('중앙값(350)은 바늘을 12시(0°)에 둔다', () => {
    const {container} = render(<PanoGauge panoHz={350} />)
    expect(needleTransform(container)).toContain('rotate(0deg)')
  })

  it('최소0·최대700은 스윕 양 끝(-110°/+110°)에 대응한다', () => {
    expect(needleTransform(render(<PanoGauge panoHz={0} />).container)).toContain('rotate(-110deg)')
    expect(needleTransform(render(<PanoGauge panoHz={700} />).container)).toContain(
      'rotate(110deg)',
    )
  })

  it('대역 밖은 끝점 클램프 — 바늘이 스윕 밖으로 나가지 않는다', () => {
    expect(needleTransform(render(<PanoGauge panoHz={-50} />).container)).toContain(
      'rotate(-110deg)',
    )
    expect(needleTransform(render(<PanoGauge panoHz={5000} />).container)).toContain(
      'rotate(110deg)',
    )
  })

  it('채움 아크는 최소에서 완전히 비고 최대에서 완전히 찬다 (butt 캡 — 값 위치 정합)', () => {
    const arc0 = render(<PanoGauge panoHz={0} />)
    expect(progressPath(arc0.container)?.getAttribute('stroke-linecap')).toBe('butt')
    const dash = Number(progressPath(arc0.container)?.getAttribute('stroke-dasharray'))
    // 0 → dashoffset = 전체 길이(아무것도 안 그려짐)
    expect(dashOffset(arc0.container)).toBeCloseTo(dash, 0)
    // 700 → dashoffset 0(완전히 참)
    expect(dashOffset(render(<PanoGauge panoHz={700} />).container)).toBe(0)
  })

  it('눈금 라벨은 백자리 한 자리(0~7)로 축약 표기한다 (스케일은 0~700 불변)', () => {
    const {container} = render(<PanoGauge panoHz={350} />)
    const labels = [...container.querySelectorAll('text')].map(t => t.textContent)
    for (const v of ['0', '1', '3', '5', '7']) expect(labels).toContain(v)
    // 3자리 표기(100·700 등)는 없다 — 표기만 축약, 스케일 상수(0~700)는 그대로
    for (const v of ['100', '300', '700']) expect(labels).not.toContain(v)
  })

  it('진행 채움은 불투명 단색 라임 (v2.x 사용자: 흐린 그라디언트 제거)', () => {
    const {container} = render(<PanoGauge panoHz={350} />)
    const fill = progressPath(container) as SVGPathElement
    const {stroke, strokeOpacity} = getComputedStyle(fill)
    // 그라디언트(url(#…)) 참조가 아니라 실제 색이어야 한다 — 반투명 스톱으로 흐려지지 않는다
    expect(stroke).not.toContain('url(')
    expect(stroke).not.toBe('')
    if (strokeOpacity !== '') expect(Number(strokeOpacity)).toBe(1)
  })
})
