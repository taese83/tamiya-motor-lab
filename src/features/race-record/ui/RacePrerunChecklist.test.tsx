import {fireEvent, render, screen} from '@testing-library/react'
import {describe, expect, it} from 'vitest'

import {RacePrerunChecklist} from './RacePrerunChecklist'

import type {PrerunChecklistGroup} from '@entities/race-record'

// R30 주행 전 체크리스트 블록 (feature-plan race-autofill §테스트 계획 — REQ-AF-005·006·N04,
// DL-038). 표시 전용(ephemeral) 계약을 고정한다: groups=[]면 블록 자체 미렌더, 체크 상태는
// 컴포넌트 로컬뿐(콜백 prop 자체가 타입에 없음 — 상위 전파 경로 차단), 재마운트 시 초기화.
// 근거 캡션은 retireReasonRowLabel(reason)+count 조립 — 문구 원문을 여기서 단언한다.

/** selectPrerunChecklist 산출 형태의 대표 fixture — jump_attitude×2(2항목) + stall×1(1항목 절삭) */
const GROUPS: ReadonlyArray<PrerunChecklistGroup> = [
  {reason: 'jump_attitude', count: 2, items: ['댐퍼 상태 확인', '무게중심(배터리 위치) 확인']},
  {reason: 'stall', count: 1, items: ['배터리 잔량·접점 확인']},
]

describe('RacePrerunChecklist — 침묵 (REQ-AF-006)', () => {
  it('groups=[]면 아무것도 렌더하지 않는다 — 블록 DOM 부재', () => {
    const {container} = render(<RacePrerunChecklist groups={[]} />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('주행 전 점검')).toBeNull()
  })
})

describe('RacePrerunChecklist — 렌더·카피 (REQ-AF-005)', () => {
  it('헤더 "주행 전 점검" + "표시 전용 · 저장 안 됨" 카피가 있다', () => {
    render(<RacePrerunChecklist groups={GROUPS} />)

    expect(screen.getByRole('heading', {level: 3, name: '주행 전 점검'})).toBeInTheDocument()
    expect(screen.getByText('표시 전용 · 저장 안 됨')).toBeInTheDocument()
    // 섹션 landmark — sr 도달 가능(N04)
    expect(screen.getByRole('region', {name: '주행 전 점검'})).toBeInTheDocument()
  })

  it('항목이 checkbox role로 렌더되고 각각 라벨이 접근 가능한 이름으로 결속된다 (a11y)', () => {
    render(<RacePrerunChecklist groups={GROUPS} />)

    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    // FormControlLabel의 <label> 결속 — 이름 없는 checkbox가 없어야 한다
    expect(screen.getByRole('checkbox', {name: '댐퍼 상태 확인'})).toBeInTheDocument()
    expect(screen.getByRole('checkbox', {name: '무게중심(배터리 위치) 확인'})).toBeInTheDocument()
    expect(screen.getByRole('checkbox', {name: '배터리 잔량·접점 확인'})).toBeInTheDocument()
  })

  it('근거 caption: retireReasonRowLabel+count 조립 원문 — 경로 병기·×n 표기', () => {
    render(<RacePrerunChecklist groups={GROUPS} />)

    expect(
      screen.getByText('최근 이탈: 점프 · 공중 자세 무너짐 ×2 · 멈춤 ×1'),
    ).toBeInTheDocument()
  })
})

describe('RacePrerunChecklist — 체크 토글 로컬·ephemeral (REQ-AF-005, DL-038)', () => {
  it('체크박스 탭 → 체크, 재탭 → 해제 — 다른 항목에 영향 없음', () => {
    render(<RacePrerunChecklist groups={GROUPS} />)
    const damper = screen.getByRole('checkbox', {name: '댐퍼 상태 확인'})
    const battery = screen.getByRole('checkbox', {name: '배터리 잔량·접점 확인'})

    expect(damper).not.toBeChecked()

    fireEvent.click(damper)
    expect(damper).toBeChecked()
    expect(battery).not.toBeChecked() // 독립 key — 다른 항목 미영향

    fireEvent.click(damper)
    expect(damper).not.toBeChecked()
  })

  it('재마운트하면 체크 상태가 초기화된다 — 저장 없음(ephemeral)', () => {
    const first = render(<RacePrerunChecklist groups={GROUPS} />)
    fireEvent.click(screen.getByRole('checkbox', {name: '댐퍼 상태 확인'}))
    expect(screen.getByRole('checkbox', {name: '댐퍼 상태 확인'})).toBeChecked()

    first.unmount() // 시트 닫힘·저장에 해당 — 로컬 상태 소멸

    render(<RacePrerunChecklist groups={GROUPS} />)
    expect(screen.getByRole('checkbox', {name: '댐퍼 상태 확인'})).not.toBeChecked()
  })
})
