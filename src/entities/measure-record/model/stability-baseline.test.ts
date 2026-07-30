import {describe, expect, it} from 'vitest'

import {STABILITY_BASELINE_COUNT} from '@shared/config/domain'

import {baselineFromBestCvs, computeStabilityBaseline, mergeBestCvs} from './stability-baseline'

import type {MeasureRecord} from './types'

// 기준선 = 역대 최상(낮은) CV 3건의 중앙값 (최상 컨디션 영속 방식 — 사용자 확정).
// 컨디션 추세 판정 전체가 이 값 하나에 걸려 있어 경계를 고정한다.

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
  it(`표본 ${STABILITY_BASELINE_COUNT}건 미만이면 null (수집 중 — 판단하지 않는다)`, () => {
    expect(computeStabilityBaseline([])).toBeNull()
    expect(
      computeStabilityBaseline([
        record(0.004, '2026-07-01T00:00:00.000Z'),
        record(0.005, '2026-07-02T00:00:00.000Z'),
      ]),
    ).toBeNull()
  })

  it('가장 좋은 3건의 중앙값 — 시점 무관(초기 오염·rolling 삭제에 흔들리지 않는다)', () => {
    const baseline = computeStabilityBaseline([
      record(0.02, '2026-07-01T00:00:00.000Z'), // 초기 서툰 측정 — 표본 밖
      record(0.008, '2026-07-02T00:00:00.000Z'),
      record(0.004, '2026-07-03T00:00:00.000Z'), // 길들이기 후 최상기
      record(0.005, '2026-07-04T00:00:00.000Z'),
      record(0.03, '2026-07-05T00:00:00.000Z'), // 최근 악화 — 표본 밖
    ])
    expect(baseline).toBe(0.005) // 최상 3건 {0.004, 0.005, 0.008}의 중앙값
  })

  it('우연히 잘 나온 1건(뽀록)이 기준이 되지 않는다 — 중앙값 = 2번째로 좋은 값', () => {
    const baseline = computeStabilityBaseline([
      record(0.001, '2026-07-01T00:00:00.000Z'), // 뽀록 최저값 — 기준이 아님
      record(0.006, '2026-07-02T00:00:00.000Z'),
      record(0.007, '2026-07-03T00:00:00.000Z'),
      record(0.008, '2026-07-04T00:00:00.000Z'),
    ])
    expect(baseline).toBe(0.006)
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

describe('mergeBestCvs — 영속 표본 병합 (rolling eviction과 무관한 기준 유지)', () => {
  it('기존 표본 + 새 CV에서 가장 좋은 3건만 생존한다', () => {
    expect(mergeBestCvs([0.006, 0.008], [0.004, 0.03])).toEqual([0.004, 0.006, 0.008])
  })

  it('기존 기준이 현재 기록 전부보다 좋으면 그대로 유지된다 (사용자 규칙 — 삭제된 좋은 기록 보존)', () => {
    // 좋았던 시절의 표본이 이미 영속됨 — 이후 나쁜 측정만 들어와도 기준 불변
    expect(mergeBestCvs([0.004, 0.005, 0.006], [0.02, 0.03, 0.025])).toEqual([0.004, 0.005, 0.006])
  })

  it('새 측정이 더 좋으면 기준이 갱신된다 (최상 컨디션 추적)', () => {
    expect(mergeBestCvs([0.004, 0.005, 0.006], [0.003])).toEqual([0.003, 0.004, 0.005])
  })
})

describe('baselineFromBestCvs — 영속 표본 → 기준선', () => {
  it(`표본 ${STABILITY_BASELINE_COUNT}건 미만이면 null (구버전 모터·수집 중)`, () => {
    expect(baselineFromBestCvs(undefined)).toBeNull()
    expect(baselineFromBestCvs([])).toBeNull()
    expect(baselineFromBestCvs([0.004, 0.005])).toBeNull()
  })

  it('3건의 중앙값 — 뽀록 최저값이 아닌 2번째로 좋은 값', () => {
    expect(baselineFromBestCvs([0.001, 0.006, 0.007])).toBe(0.006)
  })
})
