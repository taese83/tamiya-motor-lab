import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'

import {RaceInsightHelpDialog} from './RaceInsightHelpDialog'

// R22 [보는 법] 다이얼로그 (ConditionHelpDialog 패턴 — 열림 상태는 페이지 소유).
// 핵심 계약: D2 기준 분리 설명 — 전압대는 전체 완주 기록, 추세는 최근 구간(전압 추천과 동일).

describe('RaceInsightHelpDialog', () => {
  it('열리면 제목이 접근 이름이 되고 세 요소(전압대·추세·미정)와 기준 분리 문구를 담는다', () => {
    render(<RaceInsightHelpDialog open onClose={() => undefined} />)

    expect(screen.getByRole('dialog')).toHaveAccessibleName('레이스 요약 보는 법')
    expect(screen.getByText('완주 전압대')).toBeInTheDocument()
    // '전체 완주 기록'은 본문 강조 + 하단 요약 문구 두 곳에 정상 등장 → getAllByText로 존재만 단언
    expect(screen.getAllByText(/전체 완주\s*기록/).length).toBeGreaterThan(0)
    expect(screen.getByText('추세')).toBeInTheDocument()
    expect(screen.getByText(/전압 추천과 같은 기준/)).toBeInTheDocument()
    expect(screen.getByText('미정 제외')).toBeInTheDocument()
    // D2 기준 분리 — 요약↔추천 수치 대조 불신 방지의 핵심 문장
    expect(screen.getByText(/두 기준이 서로 달라요/)).toBeInTheDocument()
  })

  it('[닫기] 클릭이 onClose를 호출한다', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<RaceInsightHelpDialog open onClose={onClose} />)

    await user.click(screen.getByRole('button', {name: '닫기'}))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('open=false면 DOM에 렌더하지 않는다', () => {
    render(<RaceInsightHelpDialog open={false} onClose={() => undefined} />)

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
