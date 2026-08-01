import {fireEvent, render, screen} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'

import {RaceAnalysisCard} from './RaceAnalysisCard'

import type {RaceAnalysisView} from './RaceAnalysisCard'
import type {RaceAnalysisOk} from '../api/analyze-race'

// R25 AI 분석 응답 카드 (component-spec race-ai §2·§6 — 제어형 순수 렌더 계약).
// success 접힘/펼침(4섹션 고정 순서·생략 섹션 DOM 부재·침묵 원칙), insufficient 중립 톤
// (role="alert"·[다시 시도] 금지), error 재시도(1탭=1콜백·retryPending 카드 잔존)를 고정한다.
// 문구는 RACE_ANALYSIS_MESSAGES 확정 카피를 리터럴로 고정 — 카피 변경은 이 테스트가 막는다.

const OK_FULL: RaceAnalysisOk = {
  verdict: 'ok',
  sections: {
    diagnosis: {summary: '코너 이탈이 반복돼요', citedRaces: 3},
    anomaly: {summary: '파노 하락 추세가 보여요', citedRaces: 2},
    briefing: {summary: '최근 판은 안정적이에요'},
    nextRace: {summary: '전압을 0.1 V 낮춰보세요'},
  },
  evidence: {racesUsed: 12, excludedNoReason: 2},
}

interface RenderOverrides {
  expanded?: boolean
  retryPending?: boolean
  onToggleExpand?: () => void
  onRetry?: () => void
}

function renderCard(view: RaceAnalysisView, overrides: RenderOverrides = {}) {
  render(
    <RaceAnalysisCard
      view={view}
      expanded={overrides.expanded ?? false}
      onToggleExpand={overrides.onToggleExpand ?? (() => undefined)}
      onRetry={overrides.onRetry ?? (() => undefined)}
      retryPending={overrides.retryPending ?? false}
    />,
  )
}

describe('RaceAnalysisCard success 접힘', () => {
  it('근거 caption(m>0 제외절 포함)·AI 표식·첫 섹션 요약 1줄, 섹션 본문은 미렌더', () => {
    renderCard({kind: 'success', data: OK_FULL})

    expect(screen.getByText('기록 12건 기준 · 사유 미입력 2건 제외')).toBeInTheDocument()
    expect(
      screen.getByText(
        'AI가 생성한 해석입니다 — 다시 분석하면 표현이 달라질 수 있어요 · 요청 시에만 기록을 외부 AI로 보내고 응답은 저장하지 않아요',
      ),
    ).toBeInTheDocument()
    // 접힘 요약 = 고정 순서 첫 존재 섹션(diagnosis)의 summary
    expect(screen.getByText('코너 이탈이 반복돼요')).toBeInTheDocument()
    // 섹션 타이틀·나머지 본문은 접힘에서 DOM 부재
    expect(screen.queryByText('진단')).toBeNull()
    expect(screen.queryByText('전압을 0.1 V 낮춰보세요')).toBeNull()
    expect(screen.getByRole('button', {name: '펼치기'})).toHaveAttribute('aria-expanded', 'false')
  })

  it('excludedNoReason=0이면 제외절 없는 근거 caption', () => {
    renderCard({
      kind: 'success',
      data: {...OK_FULL, evidence: {racesUsed: 5, excludedNoReason: 0}},
    })

    expect(screen.getByText('기록 5건 기준')).toBeInTheDocument()
    expect(screen.queryByText(/사유 미입력/)).toBeNull()
  })

  it('[펼치기] 1탭 = onToggleExpand 1회', () => {
    const onToggleExpand = vi.fn()
    renderCard({kind: 'success', data: OK_FULL}, {onToggleExpand})

    fireEvent.click(screen.getByRole('button', {name: '펼치기'}))

    expect(onToggleExpand).toHaveBeenCalledOnce()
  })
})

describe('RaceAnalysisCard success 펼침', () => {
  it('4섹션 고정 순서(진단→이상 신호→브리핑→다음 판 제안) + citedRaces·L1 caption·[접기]', () => {
    renderCard({kind: 'success', data: OK_FULL}, {expanded: true})

    // getAllByText는 문서 순서 — 렌더 순서 자체를 고정한다
    const titles = screen
      .getAllByText(/^(진단|이상 신호|브리핑|다음 판 제안)$/)
      .map(el => el.textContent)
    expect(titles).toEqual(['진단', '이상 신호', '브리핑', '다음 판 제안'])
    expect(screen.getByText('회차 3건 근거')).toBeInTheDocument()
    expect(screen.getByText('회차 2건 근거')).toBeInTheDocument()
    expect(
      screen.getByText('제안일 뿐 자동 적용되지 않아요 — [+ 기록]으로 직접 입력'),
    ).toBeInTheDocument()
    // 헤더 [접기](aria-expanded) + 최하단 [접기] — 둘 다 존재
    expect(screen.getAllByRole('button', {name: '접기'})).toHaveLength(2)
    expect(screen.getByRole('button', {name: '접기', expanded: true})).toBeInTheDocument()
  })

  it('키 없는 섹션은 DOM 부재(침묵 원칙) — citedRaces 0도 근거 caption 침묵', () => {
    renderCard(
      {
        kind: 'success',
        data: {
          verdict: 'ok',
          sections: {diagnosis: {summary: '코너 이탈이 반복돼요', citedRaces: 0}},
          evidence: {racesUsed: 4, excludedNoReason: 0},
        },
      },
      {expanded: true},
    )

    expect(screen.getByText('진단')).toBeInTheDocument()
    expect(screen.queryByText('이상 신호')).toBeNull()
    expect(screen.queryByText('브리핑')).toBeNull()
    expect(screen.queryByText('다음 판 제안')).toBeNull()
    // citedRaces=0 — "회차 0건 근거" 렌더 금지
    expect(screen.queryByText(/회차 \d+건 근거/)).toBeNull()
  })
})

describe('RaceAnalysisCard insufficient (서버의 정상 판단 — 중립 톤)', () => {
  it('중립 문구+근거 caption, role="alert" 부재·[다시 시도] 부재', () => {
    renderCard({
      kind: 'insufficient',
      reason: '유효 표본이 적어요',
      evidence: {racesUsed: 2, excludedNoReason: 0},
    })

    expect(
      screen.getByText('분석할 근거가 부족해요 — 유효 표본이 적어요. 기록이 쌓이면 다시 시도하세요'),
    ).toBeInTheDocument()
    expect(screen.getByText('기록 2건 기준')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', {name: '다시 시도'})).toBeNull()
  })
})

describe('RaceAnalysisCard error', () => {
  it('실패 문구 + [다시 시도] 1탭 = onRetry 1회 (upstream — 보조 caption 없음)', () => {
    const onRetry = vi.fn()
    renderCard({kind: 'error', reason: 'upstream'}, {onRetry})

    expect(
      screen.getByText('분석하지 못했어요 — 결정론 요약은 위 카드에 있어요'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('rate_limited는 reason별 보조 caption을 함께 보여준다', () => {
    renderCard({kind: 'error', reason: 'rate_limited'})

    expect(screen.getByText('잠시 후 다시 시도하세요')).toBeInTheDocument()
  })

  it('retryPending이면 카드 유지 + 버튼만 "재시도 중…" disabled', () => {
    renderCard({kind: 'error', reason: 'upstream'}, {retryPending: true})

    // 카드 unmount 없이 유지 — 실패 문구 잔존
    expect(
      screen.getByText('분석하지 못했어요 — 결정론 요약은 위 카드에 있어요'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', {name: '재시도 중…'})).toBeDisabled()
    expect(screen.queryByRole('button', {name: '다시 시도'})).toBeNull()
  })
})
