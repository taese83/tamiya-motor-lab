import {fireEvent, render, screen, within} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'

import {RaceGoalSheet} from './RaceGoalSheet'

import type {RaceGoalSheetProps} from './RaceGoalSheet'

// R30 목표 시트 추천 병기 (feature-plan race-autofill §테스트 계획 — REQ-AF-002·003, DL-037·039).
// 완전 제어형 계약을 고정한다: recommendation 미전달·null이면 현행과 동등 렌더(추천 DOM 0),
// 전달 시 해당 목표 버튼에만 "추천" 배지+근거 캡션 병기, 자동 선택·자동 진행 없음(onSelect는
// 사용자 탭에서만). 직전 목표(' · 지난 목표') 강조와 추천 배지는 독립 — 다른 버튼이면 공존,
// 동일 버튼이면 병기. 근거 카피는 GOAL_RECOMMEND_MESSAGES(UI 소유) 원문을 단언한다.

// 버튼 접근성 이름은 목표 설명(GOAL_DESCRIPTIONS)까지 포함 — 설명 문구로 유일 식별한다
const finishButton = () => screen.getByRole('button', {name: /완주 우선/})
const stabilityButton = () => screen.getByRole('button', {name: /균형 잡힌/})
const speedButton = () => screen.getByRole('button', {name: /속도 우선/})

function renderSheet(props: Partial<RaceGoalSheetProps> = {}) {
  const onSelect = vi.fn()
  render(
    <RaceGoalSheet
      open
      lastGoal={null}
      onSelect={onSelect}
      onClose={() => undefined}
      {...props}
    />,
  )
  return {onSelect}
}

describe('RaceGoalSheet — 추천 침묵 (REQ-AF-002)', () => {
  it('recommendation 미전달이면 추천 배지·근거 텍스트가 없다 — 현행과 동등 렌더', () => {
    renderSheet()

    // 목표 3버튼은 그대로 (배지 유무와 무관한 기존 계약)
    expect(finishButton()).toBeInTheDocument()
    expect(stabilityButton()).toBeInTheDocument()
    expect(speedButton()).toBeInTheDocument()
    // "추천" 배지 부재 — 안내 문구의 '전압을 추천합니다'와 구분되도록 exact 매치
    expect(screen.queryByText('추천')).toBeNull()
    // 근거 캡션 4종 전부 부재
    expect(screen.queryByText('최근 2연속 이탈 — 완주 우선 권장')).toBeNull()
    expect(screen.queryByText('직전 이탈 — 안정 권장')).toBeNull()
    expect(screen.queryByText('3연속 완주·추세 양호 — 속도 도전 가능')).toBeNull()
    expect(screen.queryByText('완주 유지 중·랩타임 추세 하락 — 안정 권장')).toBeNull()
  })

  it('recommendation=null(파생이 침묵)도 동일하게 추천 DOM 0', () => {
    renderSheet({recommendation: null})

    expect(screen.queryByText('추천')).toBeNull()
  })
})

describe('RaceGoalSheet — 추천 병기·자동 선택 없음 (REQ-AF-003)', () => {
  it('speed 추천이면 속도 버튼에만 "추천" 배지+근거 캡션, onSelect는 호출되지 않는다', () => {
    const {onSelect} = renderSheet({
      recommendation: {goal: 'speed', rationale: 'finished_streak'},
    })

    // 추천 목표 버튼에만 배지+근거
    expect(within(speedButton()).getByText('추천')).toBeInTheDocument()
    expect(
      within(speedButton()).getByText('3연속 완주·추세 양호 — 속도 도전 가능'),
    ).toBeInTheDocument()
    // 나머지 버튼에는 없다
    expect(within(finishButton()).queryByText('추천')).toBeNull()
    expect(within(stabilityButton()).queryByText('추천')).toBeNull()
    // 자동 선택·자동 진행 없음 — 렌더만으로 onSelect 미호출
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('선택은 사용자 탭에서만 — 추천 버튼 탭 시 onSelect(goal) 1회', () => {
    const {onSelect} = renderSheet({
      recommendation: {goal: 'speed', rationale: 'finished_streak'},
    })

    fireEvent.click(speedButton())

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('speed')
  })

  it('rationale 코드→카피 매핑: finish 추천(retired_streak)이면 완주 버튼에 해당 근거 문구', () => {
    renderSheet({recommendation: {goal: 'finish', rationale: 'retired_streak'}})

    expect(within(finishButton()).getByText('추천')).toBeInTheDocument()
    expect(
      within(finishButton()).getByText('최근 2연속 이탈 — 완주 우선 권장'),
    ).toBeInTheDocument()
  })
})

describe('RaceGoalSheet — 직전 목표 강조와 추천의 독립 (REQ-AF-003, D4)', () => {
  it('직전 목표(finish)와 추천(speed)이 다르면 두 표기가 각자 버튼에 공존한다', () => {
    renderSheet({
      lastGoal: 'finish',
      recommendation: {goal: 'speed', rationale: 'finished_streak'},
    })

    // 직전 목표 표기는 finish 버튼에만
    expect(within(finishButton()).getByText(/지난 목표/)).toBeInTheDocument()
    expect(within(finishButton()).queryByText('추천')).toBeNull()
    // 추천 표기는 speed 버튼에만
    expect(within(speedButton()).getByText('추천')).toBeInTheDocument()
    expect(within(speedButton()).queryByText(/지난 목표/)).toBeNull()
  })

  it('직전 목표와 추천이 같은 버튼이면 " · 지난 목표"와 "추천"이 병기된다', () => {
    renderSheet({
      lastGoal: 'speed',
      recommendation: {goal: 'speed', rationale: 'finished_streak'},
    })

    const speed = speedButton()
    expect(within(speed).getByText(/지난 목표/)).toBeInTheDocument()
    expect(within(speed).getByText('추천')).toBeInTheDocument()
    expect(
      within(speed).getByText('3연속 완주·추세 양호 — 속도 도전 가능'),
    ).toBeInTheDocument()
  })
})
