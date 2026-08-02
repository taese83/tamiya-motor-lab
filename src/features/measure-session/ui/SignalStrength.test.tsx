import {render, screen} from '@testing-library/react'
import {describe, expect, it} from 'vitest'

import {SignalStrength} from './SignalStrength'

import type {MeasureView} from './measure-view'

// R45 신호 세기 미터 — "신호 약함"·"더 가까이"를 confidence 기반 미터 하나로 통일.
// 브라우저 QA는 마이크 없이 measuring/weak-signal에 못 가므로 세기 파생을 여기서 고정한다.

const measuring = (confidence: number): MeasureView => ({
  status: 'measuring',
  panoHz: 300,
  rpm: 18000,
  isStable: true,
  measuredMs: 6000,
  stabilityCv: 0.004,
  microCv: 0,
  confidence,
})

describe('SignalStrength (R45)', () => {
  it('weak-signal이면 "약함" + aria-label "신호 세기 약함"', () => {
    render(<SignalStrength view={{status: 'weak-signal', confidence: 0.2}} />)
    expect(screen.getByText('약함')).toBeInTheDocument()
    expect(screen.getByRole('img', {name: '신호 세기 약함'})).toBeInTheDocument()
  })

  it('measuring 고신뢰(≥0.85)면 "강"', () => {
    render(<SignalStrength view={measuring(0.92)} />)
    expect(screen.getByRole('img', {name: '신호 세기 강'})).toBeInTheDocument()
  })

  it('measuring 중간 신뢰면 "양호"', () => {
    render(<SignalStrength view={measuring(0.6)} />)
    expect(screen.getByRole('img', {name: '신호 세기 양호'})).toBeInTheDocument()
    expect(screen.queryByText('약함')).toBeNull()
  })

  it('비측정(starting)이면 세기 라벨 없이 "신호 세기"만 (빈 막대)', () => {
    render(<SignalStrength view={{status: 'starting'}} />)
    expect(screen.getByRole('img', {name: '신호 세기'})).toBeInTheDocument()
    expect(screen.queryByText('약함')).toBeNull()
    expect(screen.queryByText('강')).toBeNull()
    expect(screen.queryByText('양호')).toBeNull()
  })
})
