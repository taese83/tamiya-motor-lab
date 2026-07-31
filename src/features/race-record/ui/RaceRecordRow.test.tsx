import {render, screen} from '@testing-library/react'
import {describe, expect, it} from 'vitest'

import {RaceRecordRow} from './RaceRecordRow'

import type {RaceRecord} from '@entities/race-record'

// S6 레이스 기록 행 — R20 이탈 사유 suffix 표시 계약(D-R3)을 고정한다.
// 사유 라벨은 result='retired' **그리고** retireReason 존재일 때만 결과 직후에 붙는다 —
// 완주·미정 행은 스키마상 사유를 품고 있어도(D-R2: refine 안 함, read-lenient) 표시하지 않는다.

const BASE_RECORD: RaceRecord = {
  id: '00000000-0000-4000-8000-000000000001',
  motorId: '00000000-0000-4000-8000-000000000000',
  panoHz: 309,
  voltage: 2.8,
  createdAt: '2026-07-31T10:00:00.000Z',
}

function renderRow(overrides: Partial<RaceRecord>) {
  return render(
    <RaceRecordRow
      record={{...BASE_RECORD, ...overrides}}
      index={1}
      onEdit={() => undefined}
      onDelete={() => undefined}
      deletePending={false}
      swipeOpen={false}
      onSwipeOpenChange={() => undefined}
    />,
  )
}

describe('RaceRecordRow 이탈 사유 표시 (R20 — D-R3)', () => {
  it("이탈+retireReason 행은 결과 직후 사유 경로를 잇는다 — '이탈 · 점프 · 비거리 김 · 2.80 V'", () => {
    renderRow({result: 'retired', retireReason: 'jump_overshoot'})

    expect(screen.getByText('이탈 · 점프 · 비거리 김 · 2.80 V')).toBeInTheDocument()
    // 행 접근성 이름(rowLabel)도 같은 detailLine을 쓴다 — 시각·낭독 일치
    expect(screen.getByRole('group', {name: /이탈 · 점프 · 비거리 김/})).toBeInTheDocument()
  })

  it("top-level leaf 사유는 라벨 그대로 — '이탈 · 코너 이탈 · 2.80 V'(섹션 병기 없음)", () => {
    renderRow({result: 'retired', retireReason: 'corner'})

    expect(screen.getByText('이탈 · 코너 이탈 · 2.80 V')).toBeInTheDocument()
  })

  it('사유 없는 이탈 행은 무변경 — 결과·전압만', () => {
    renderRow({result: 'retired'})

    expect(screen.getByText('이탈 · 2.80 V')).toBeInTheDocument()
  })

  it('완주 행은 사유를 표시하지 않는다 — stale retireReason이 남아 있어도(표시 가드)', () => {
    renderRow({result: 'finished', retireReason: 'jump_overshoot'})

    expect(screen.getByText('완주 · 2.80 V')).toBeInTheDocument()
    expect(screen.queryByText(/비거리 김/)).toBeNull()
  })

  it("result 미정(undefined) 행 무영향 — '미정 · 2.80 V', 사유 미표시", () => {
    renderRow({retireReason: 'jump_overshoot'})

    expect(screen.getByText('미정 · 2.80 V')).toBeInTheDocument()
    expect(screen.queryByText(/비거리 김/)).toBeNull()
  })
})
