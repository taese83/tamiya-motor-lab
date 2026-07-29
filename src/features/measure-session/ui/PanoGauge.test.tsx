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

describe('PanoGauge v2.19 — 범위 표기·아크 끝 정합', () => {
  it('진행 아크는 butt 캡이다 — round면 값 위치를 넘어 바늘보다 앞서 나간다', () => {
    // 사용자 지적('측정값이 게이지 범위를 넘어서는 것 같다')의 실제 원인.
    // round 캡은 보이는 dash의 양 끝을 각각 strokeWidth/2(=6.5단위 ≈ 10 Hz)만큼 넘어 부풀어서
    // 라임 아크 끝 ≠ 바늘 ≠ 실제 값이 됐다. 레드라인은 같은 이유로 이미 butt였다.
    const {container} = render(<PanoGauge panoHz={400} />)
    const arc = progressPath(container)
    expect(arc).toBeDefined()
    expect(arc?.getAttribute('stroke-linecap')).toBe('butt')
  })

  it('눈금 라벨은 실제 대역 끝점(170·620)을 적는다', () => {
    // 200·600만 적으면 대역이 200~600으로 읽혀 610 Hz 같은 정상값이 범위 밖처럼 보인다.
    const {container} = render(<PanoGauge panoHz={400} />)
    const labels = [...container.querySelectorAll('text')].map(t => t.textContent)
    expect(labels).toContain('170')
    expect(labels).toContain('620')
  })

  it('대역을 벗어난 값은 끝점으로 클램프된다 — 바늘·아크가 트랙을 넘지 않는다', () => {
    const below = render(<PanoGauge panoHz={50} />)
    expect(needleTransform(below.container)).toContain('rotate(-110deg)')
    // 하한 아래 → 진행분 0: dashoffset이 dasharray(트랙 전체 길이)와 같아 아무것도 그려지지 않는다
    const arc = progressPath(below.container)
    const dashArray = arc?.getAttribute('stroke-dasharray')
    expect(Number(progressDashOffset(below.container)?.replace('px', ''))).toBeCloseTo(
      Number(dashArray),
      1,
    )

    const above = render(<PanoGauge panoHz={5_000} />)
    expect(needleTransform(above.container)).toContain('rotate(110deg)')
    // 상한 위 → 진행분 전체: 남는 구간 0
    expect(Number(progressDashOffset(above.container)?.replace('px', ''))).toBe(0)
  })

  it('트랙과 보조 눈금은 투명 배경색이 아니라 전경색 + opacity로 그린다', () => {
    // action.hover(4~8% 알파)는 다크 1.18:1 / 라이트 1.09:1로 사실상 보이지 않았다(실측).
    // text.primary는 모드에 따라 뒤집히므로 알파 하나로 양 모드 대비를 함께 만족한다.
    const {container} = render(<PanoGauge panoHz={400} />)
    const track = paths(container)[0]
    expect(track).toBeDefined()
    const opacity = Number(getComputedStyle(track as SVGPathElement).opacity)
    expect(opacity).toBeGreaterThan(0.3)
    expect(opacity).toBeLessThan(1)
  })
})

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
