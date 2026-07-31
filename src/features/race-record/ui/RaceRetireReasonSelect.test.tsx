import {fireEvent, render, screen} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'

import {RaceRetireReasonSelect} from './RaceRetireReasonSelect'

// 재귀 드릴다운 단일 선택 (R20 — retire-reason-chipset §입력 UX, D-R1·D-R4·D-R5).
// 완전 제어형(value·onChange)이라 실화면(RaceEntrySheet 조건부 블록) 대신 여기서 계약을 고정한다:
// branch 탭 = 뷰 전환만(onChange 없음), leaf 탭 = onChange(key), 선택 칩 재탭 = onChange(null),
// value 주입 = 그 leaf가 속한 branch 뷰 복원(수정 진입). 칩은 Chip component="button"이라 role
// button이고, '›'·check 장식은 aria-hidden이라 접근성 이름은 라벨뿐이다.

const chip = (name: string) => screen.getByRole('button', {name})
const queryChip = (name: string) => screen.queryByRole('button', {name})

describe('RaceRetireReasonSelect 최상위 뷰', () => {
  it('value=null이면 섹션 칩 전부가 속도형/기계형/escape 그룹으로 보인다', () => {
    render(<RaceRetireReasonSelect value={null} onChange={() => undefined} />)

    // 속도형 5섹션 (점프는 branch)
    expect(chip('코너 이탈')).toBeInTheDocument()
    expect(chip('점프')).toBeInTheDocument()
    expect(chip('다운 한칸 실패')).toBeInTheDocument()
    expect(chip('웨이브 이탈')).toBeInTheDocument()
    expect(chip('레인체인지 실패')).toBeInTheDocument()
    // 기계형 2 + escape 1
    expect(chip('파츠 이탈·파손')).toBeInTheDocument()
    expect(chip('멈춤')).toBeInTheDocument()
    expect(chip('기타·기억 안 남')).toBeInTheDocument()
    // 그룹 헤더 — 색·위치 아닌 텍스트 구분 (D-R1 표시 구조)
    expect(screen.getByText('속도형 · 전압과 관련')).toBeInTheDocument()
    expect(screen.getByText('기계형 · 전압과 무관')).toBeInTheDocument()
    // 최상위 뷰에는 [뒤로]가 없다
    expect(queryChip('뒤로')).toBeNull()
  })

  it("top-level leaf(코너 이탈) 탭 → onChange('corner') — 드릴다운 없이 그 자리서 확정", () => {
    const onChange = vi.fn()
    render(<RaceRetireReasonSelect value={null} onChange={onChange} />)

    fireEvent.click(chip('코너 이탈'))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('corner')
  })
})

describe('RaceRetireReasonSelect 드릴다운', () => {
  it('점프(branch) 탭 → 세부 칩 4개 + [뒤로] + breadcrumb 노출, onChange 호출 없음', () => {
    const onChange = vi.fn()
    render(<RaceRetireReasonSelect value={null} onChange={onChange} />)

    fireEvent.click(chip('점프'))

    expect(chip('비거리 김')).toBeInTheDocument()
    expect(chip('공중 자세 무너짐')).toBeInTheDocument()
    expect(chip('착지 후 튐')).toBeInTheDocument()
    expect(chip('그 외 점프')).toBeInTheDocument()
    expect(chip('뒤로')).toBeInTheDocument()
    // breadcrumb 경로가 세부 그룹의 접근성 이름을 만든다
    expect(screen.getByRole('group', {name: '점프 세부 사유'})).toBeInTheDocument()
    // branch 탭은 뷰 전환만 — 선택이 아니다
    expect(onChange).not.toHaveBeenCalled()
    // 최상위 섹션 칩은 뷰에서 빠진다
    expect(queryChip('코너 이탈')).toBeNull()
  })

  it("세부 칩(비거리 김) 탭 → onChange('jump_overshoot') — 저장은 leaf key 하나", () => {
    const onChange = vi.fn()
    render(<RaceRetireReasonSelect value={null} onChange={onChange} />)

    fireEvent.click(chip('점프'))
    fireEvent.click(chip('비거리 김'))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('jump_overshoot')
  })

  it('[뒤로] 탭 → 최상위 뷰 복귀', () => {
    render(<RaceRetireReasonSelect value={null} onChange={() => undefined} />)

    fireEvent.click(chip('점프'))
    fireEvent.click(chip('뒤로'))

    expect(chip('코너 이탈')).toBeInTheDocument()
    expect(queryChip('비거리 김')).toBeNull()
  })
})

describe('RaceRetireReasonSelect value 주입 (수정 진입 — 트리 walk 복원)', () => {
  it("value='jump_overshoot'면 점프 세부 뷰가 열린 채 해당 칩만 선택 표시된다", () => {
    render(<RaceRetireReasonSelect value="jump_overshoot" onChange={() => undefined} />)

    expect(screen.getByRole('group', {name: '점프 세부 사유'})).toBeInTheDocument()
    expect(chip('비거리 김')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('착지 후 튐')).toHaveAttribute('aria-pressed', 'false')
    // 최상위 뷰가 아니다 — branch 조상 경로로 복원된 상태
    expect(queryChip('코너 이탈')).toBeNull()
  })

  it('선택된 칩 재탭 → onChange(null) 해제', () => {
    const onChange = vi.fn()
    render(<RaceRetireReasonSelect value="jump_overshoot" onChange={onChange} />)

    fireEvent.click(chip('비거리 김'))

    expect(onChange).toHaveBeenCalledExactlyOnceWith(null)
  })
})
