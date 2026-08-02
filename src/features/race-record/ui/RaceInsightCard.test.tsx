import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'

import {RaceInsightCard} from './RaceInsightCard'

import type {RaceInsight} from '@entities/race-record'

// R22 요약 카드 (feature-plan U2, REQ-RI-001~005·NFR-002).
// 순수 제어형 — insight props만 주입해 상태 3분기(empty/insufficient/ready)와
// 표기 계약(formatVoltage 자릿수 일치·색 단독 금지·침묵 원칙·D3 고지)을 고정한다.

const BASE: RaceInsight = {
  kind: 'ready',
  finishedBand: null,
  lastFinishedVoltage: null,
  lastFinishedPanoHz: null,
  streak: [],
  trend: {lapTimeMs: null, panoHz: null},
  excluded: {resultPending: 0, lapTimeMissing: 0},
}

function renderCard(overrides: Partial<RaceInsight>, onOpenHelp: () => void = () => undefined) {
  return render(<RaceInsightCard insight={{...BASE, ...overrides}} onOpenHelp={onOpenHelp} />)
}

describe('RaceInsightCard', () => {
  it('empty(0건)면 아무것도 렌더하지 않는다 — 빈 안내는 페이지 소유', () => {
    const {container} = renderCard({kind: 'empty'})

    expect(container).toBeEmptyDOMElement()
  })

  it("insufficient(1~2건)는 축약 1줄 — '추세' 단어·[보는 법]·흐름 없이 있는 사실만", () => {
    renderCard({kind: 'insufficient', lastFinishedVoltage: 2.8, lastFinishedPanoHz: 512})

    // R37: 파노·전압을 짝으로. R41 ⑥: 카드 내부는 Hz/V 단위 없이 자릿수만
    expect(screen.getByText('최근 완주 512.0 · 2.80')).toBeInTheDocument()
    expect(screen.getByText(/기록이 더 쌓이면 흐름이 보여요/)).toBeInTheDocument()
    expect(screen.queryByText(/추세/)).toBeNull() // 오독 방지 — '추세' 금지
    expect(screen.queryByText(/최근 흐름/)).toBeNull()
    expect(screen.queryByRole('button', {name: '보는 법'})).toBeNull()
  })

  it('ready: 최근 완주 전압(강조)·완주 전압대·흐름·추세·미정 고지·[보는 법]을 모두 표기한다', () => {
    renderCard({
      finishedBand: {minVoltage: 2.8, maxVoltage: 3.2, sampleCount: 4},
      lastFinishedVoltage: 3.0,
      lastFinishedPanoHz: 520,
      streak: ['finished', 'retired', 'finished'],
      trend: {lapTimeMs: 'improving', panoHz: 'steady'},
      excluded: {resultPending: 1, lapTimeMissing: 0},
    })

    expect(screen.getByRole('region', {name: '레이스 요약'})).toBeInTheDocument()
    // R37 — 파노·전압 2개 히어로. R41 ⑥: 카드 내부는 Hz/V 단위 제거(라벨이 맥락 제공)
    expect(screen.getByText('최근 완주 파노')).toBeInTheDocument()
    expect(screen.getByText('520.0')).toBeInTheDocument()
    expect(screen.getByText('최근 완주 전압')).toBeInTheDocument()
    expect(screen.getByText('3.00')).toBeInTheDocument()
    // 완주 전압대 — R41 ⑥: 단위 없이 자릿수만, en dash 연결
    expect(screen.getByText('완주 2.80–3.20')).toBeInTheDocument()
    // 최근 흐름 — 최신순 라벨 텍스트 병행(색 단독 금지, NFR-002)
    expect(screen.getByText(/최근 흐름\(최신순\)/)).toBeInTheDocument()
    expect(screen.getAllByText('완주')).toHaveLength(2)
    expect(screen.getByText('이탈')).toBeInTheDocument()
    // 추세 — 확정 카피, ' · ' 연결
    expect(screen.getByText('랩타임 단축 중 · 파노 유지')).toBeInTheDocument()
    // D3 — 미정 제외 고지
    expect(screen.getByText('미정 1건 제외')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: '보는 법'})).toBeInTheDocument()
  })

  it('[보는 법] 클릭이 onOpenHelp를 호출한다 — 열림 상태는 페이지 소유', async () => {
    const user = userEvent.setup()
    const onOpenHelp = vi.fn()
    renderCard({streak: ['finished']}, onOpenHelp)

    await user.click(screen.getByRole('button', {name: '보는 법'}))

    expect(onOpenHelp).toHaveBeenCalledTimes(1)
  })

  it("ready인데 완주 0건(전부 이탈)이면 '완주 기록 없음' — 강조 수치·전압대 미표시", () => {
    renderCard({streak: ['retired', 'retired', 'retired']})

    expect(screen.getByText('완주 기록 없음')).toBeInTheDocument()
    expect(screen.queryByText('최근 완주 전압')).toBeNull()
    expect(screen.queryByText(/^완주 \d/)).toBeNull() // 전압대 라벨 부재
    expect(screen.getAllByText('이탈')).toHaveLength(3) // 라벨 텍스트가 이탈을 전달 — 색 단독 아님
  })

  it('전압대 min==max(F6)는 단일값으로 퇴화 표기한다', () => {
    renderCard({
      finishedBand: {minVoltage: 3.0, maxVoltage: 3.0, sampleCount: 2},
      lastFinishedVoltage: 3.0,
      streak: ['finished', 'finished'],
    })

    expect(screen.getByText('완주 3.00')).toBeInTheDocument()
    expect(screen.queryByText(/–/)).toBeNull() // 범위 표기 아님
  })

  it('추세 둘 다 null이면 추세 줄 자체를 생략한다(침묵) — 미정 0건이면 고지도 없다', () => {
    renderCard({
      finishedBand: {minVoltage: 2.8, maxVoltage: 3.0, sampleCount: 3},
      lastFinishedVoltage: 2.9,
      streak: ['finished', 'retired', 'finished'],
    })

    expect(screen.queryByText(/랩타임|파노/)).toBeNull()
    expect(screen.queryByText(/미정 \d+건 제외/)).toBeNull()
  })
})
