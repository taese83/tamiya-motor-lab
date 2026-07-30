import {describe, expect, it} from 'vitest'

import {STABILITY_BASELINE_COUNT} from '@shared/config/domain'

import {computeStabilityBaseline} from './stability-baseline'

import type {MeasureRecord} from './types'

// 기준선 = 가장 오래된 안정도 보유 기록 3건의 중앙값 (자기 기준선 계약).
// 컨디션 판정 전체가 이 값 하나에 걸려 있어 경계를 고정한다.

let seq = 0
function record(stabilityCv: number | undefined, at: string): MeasureRecord {
  seq += 1
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    motorId: '00000000-0000-4000-8000-000000000000',
    panoHz: 300,
    rpm: 18000,
    measuredAt: at,
    ...(stabilityCv !== undefined && {stabilityCv}),
  }
}

describe('computeStabilityBaseline', () => {
  it(`표본 ${STABILITY_BASELINE_COUNT}건 미만이면 null (기준선 수집 중 — 판단하지 않는다)`, () => {
    expect(computeStabilityBaseline([])).toBeNull()
    expect(
      computeStabilityBaseline([
        record(0.004, '2026-07-01T00:00:00.000Z'),
        record(0.005, '2026-07-02T00:00:00.000Z'),
      ]),
    ).toBeNull()
  })

  it('초기 3건의 중앙값 — 이후 기록(악화분)은 기준선을 오염시키지 않는다', () => {
    const baseline = computeStabilityBaseline([
      record(0.004, '2026-07-01T00:00:00.000Z'),
      record(0.008, '2026-07-02T00:00:00.000Z'),
      record(0.005, '2026-07-03T00:00:00.000Z'),
      record(0.02, '2026-07-04T00:00:00.000Z'), // 최근 악화 — 표본 밖
      record(0.03, '2026-07-05T00:00:00.000Z'),
    ])
    expect(baseline).toBe(0.005) // {0.004, 0.008, 0.005}의 중앙값
  })

  it('안정도 없는 구버전 기록은 건너뛰고 보유 기록만 표본으로 센다', () => {
    const baseline = computeStabilityBaseline([
      record(undefined, '2026-07-01T00:00:00.000Z'), // 지표 도입 전 기록
      record(0.006, '2026-07-02T00:00:00.000Z'),
      record(undefined, '2026-07-03T00:00:00.000Z'),
      record(0.004, '2026-07-04T00:00:00.000Z'),
      record(0.005, '2026-07-05T00:00:00.000Z'),
    ])
    expect(baseline).toBe(0.005)
  })
})
