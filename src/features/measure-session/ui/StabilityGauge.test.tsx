import {render} from '@testing-library/react'
import {describe, expect, it} from 'vitest'

import {StabilityGauge} from './StabilityGauge'

import type {MeasureView} from './measure-view'

// 변동률 게이지 unit — 브라우저 QA는 measuring 미도달(마이크 없음)이라 여기서 밴드·바늘 각도를 고정한다.
// 스케일 0~2%: cvToDeg(cv) = -110 + 220*(cv/0.02). 0→-110°, 1%→0°, ≥2%→+110°.

const measuring = (stabilityCv: number | null, rpm = 18000): MeasureView => ({
  status: 'measuring',
  panoHz: 300,
  rpm,
  isStable: true,
  measuredMs: 6000,
  stabilityCv,
})

const paths = (c: HTMLElement): SVGPathElement[] => [...c.querySelectorAll('path')]
const rotations = (c: HTMLElement): string[] =>
  [...c.querySelectorAll('g')].map(g => getComputedStyle(g).transform).filter(t => t !== '' && t !== 'none')

describe('StabilityGauge', () => {
  it('등급 밴드 4구간(매우 좋음·좋음·보통·흔들림)은 상태와 무관하게 항상 렌더된다', () => {
    // 밴드 path는 스트로크 폭 7 — 트랙 전체가 등급색 4구간(등급 4단계와 1:1)
    const bands = (c: HTMLElement) => paths(c).filter(p => p.getAttribute('stroke-width') === '7')
    expect(bands(render(<StabilityGauge view={measuring(0.01)} />).container)).toHaveLength(4)
    expect(bands(render(<StabilityGauge view={{status: 'starting'}} />).container)).toHaveLength(4)
  })

  it('측정 시 CV 등급 위치로 바늘이 회전한다 (0→-110°, 1%→0°, ≥2%→+110° 클램프)', () => {
    expect(rotations(render(<StabilityGauge view={measuring(0)} />).container)).toContain('rotate(-110deg)')
    expect(rotations(render(<StabilityGauge view={measuring(0.01)} />).container)).toContain('rotate(0deg)')
    expect(rotations(render(<StabilityGauge view={measuring(0.02)} />).container)).toContain('rotate(110deg)')
    // 대역 밖 클램프 — +110° 초과 없음
    expect(rotations(render(<StabilityGauge view={measuring(0.5)} />).container)).toContain('rotate(110deg)')
  })

  it('바늘은 파노와 동일하게 항상 표시된다 — cv 없음·비측정이면 최소(-110°)', () => {
    // 창 미충족(measuring·cv null)·비측정 모두 바늘을 0=최소 위치에 둔다(빈 계기판 금지)
    expect(rotations(render(<StabilityGauge view={measuring(null)} />).container)).toEqual(['rotate(-110deg)'])
    expect(rotations(render(<StabilityGauge view={{status: 'weak-signal'}} />).container)).toEqual([
      'rotate(-110deg)',
    ])
  })

  it('캡션: 측정+CV면 등급·%·±rpm, cv 없으면 측정 중, 비측정이면 변동률', () => {
    expect(render(<StabilityGauge view={measuring(0.004, 18000)} />).container.textContent).toContain('좋음')
    expect(render(<StabilityGauge view={measuring(0.004, 18000)} />).container.textContent).toContain('0.40%')
    expect(render(<StabilityGauge view={measuring(null)} />).container.textContent).toContain('측정 중')
    expect(render(<StabilityGauge view={{status: 'awaiting-gesture'}} />).container.textContent).toContain('변동률')
  })
})
