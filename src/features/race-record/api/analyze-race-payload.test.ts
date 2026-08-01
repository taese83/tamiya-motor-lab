import {describe, expect, it} from 'vitest'

import {buildAnalyzeRacePayload} from './analyze-race-payload'

import type {RaceInsight, RaceRecord} from '@entities/race-record'

// R25 payload 직렬화기 (eval-plan race-ai §2 D7 — api-schema §1.1, data-governance §2).
// 순수 함수 계약을 고정한다: ≤20건 컷(재정렬 없음), weight 지수 규칙(분석 전용 계수, 가장 오래된=1),
// retireReasonKeys 등장 순 중복 제거, excludedNoReason 계수, 그리고 **화이트리스트 외 필드
// 구조적 부재**(motorId·id 등) — governance §2의 핵심을 unit test가 assert한다.

const MOTOR_ID = '00000000-0000-4000-8000-000000000000'

type RaceSpec = Partial<Pick<RaceRecord, 'result' | 'voltage' | 'lapTimeMs' | 'retireReason'>>

/** 최신순(desc) fixture — index 0 = 최신 (race-insight.test.ts 선례와 동일 규약) */
function racesDesc(specs: ReadonlyArray<RaceSpec>): RaceRecord[] {
  return specs.map((spec, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    motorId: MOTOR_ID,
    panoHz: 300,
    voltage: spec.voltage ?? 2.8,
    createdAt: new Date(Date.UTC(2026, 6, 31, 10, 0, 0) - i * 60_000).toISOString(),
    ...(spec.result !== undefined && {result: spec.result}),
    ...(spec.lapTimeMs !== undefined && {lapTimeMs: spec.lapTimeMs}),
    ...(spec.retireReason !== undefined && {retireReason: spec.retireReason}),
  }))
}

const INSIGHT: RaceInsight = {
  kind: 'ready',
  finishedBand: {minVoltage: 2.7, maxVoltage: 3.0, sampleCount: 4},
  lastFinishedVoltage: 3.0,
  streak: ['finished', 'retired', 'finished'],
  trend: {lapTimeMs: null, panoHz: null},
  excluded: {resultPending: 0, lapTimeMissing: 0},
}

/** §1.1 전송 허용 8필드 + weight — 이 외 키는 어떤 항목에도 존재하면 안 된다 */
const ALLOWED_ITEM_KEYS = new Set([
  'voltage',
  'panoHz',
  'result',
  'lapTimeMs',
  'goal',
  'retireReason',
  'createdAt',
  'weight',
])

describe('buildAnalyzeRacePayload — 20건 컷·슬라이스 범위 집계 (D7)', () => {
  it('25건 입력 → races 20건, 최신순 유지, 슬라이스 밖 사유·집계 미반영', () => {
    const specs: RaceSpec[] = Array.from({length: 25}, () => ({result: 'finished' as const}))
    specs[1] = {result: 'retired', retireReason: 'corner'}
    specs[4] = {result: 'retired'} // 사유 없음 — excludedNoReason
    specs[7] = {result: 'retired', retireReason: 'jump_overshoot'}
    specs[9] = {result: 'retired', retireReason: 'corner'} // 중복 — keys에 1회만
    specs[12] = {result: 'retired'} // 사유 없음 — excludedNoReason
    specs[22] = {result: 'retired', retireReason: 'stall'} // 슬라이스(앞 20건) 밖 — 미반영
    const races = racesDesc(specs)

    const payload = buildAnalyzeRacePayload(races, INSIGHT)

    expect(payload.races).toHaveLength(20)
    // 재정렬 없음 — 입력 최신순 그대로 앞 20건
    expect(payload.races[0]?.createdAt).toBe(races[0]?.createdAt)
    expect(payload.races[19]?.createdAt).toBe(races[19]?.createdAt)
    // 등장 순서 중복 제거 + 슬라이스 밖 'stall' 부재
    expect(payload.retireReasonKeys).toEqual(['corner', 'jump_overshoot'])
    expect(payload.excludedNoReason).toBe(2)
    // insight는 재계산 없이 그대로 전달(주입값)
    expect(payload.insight).toBe(INSIGHT)
  })

  it('0건 입력 → 빈 races·빈 keys·excludedNoReason 0 (무해한 퇴화)', () => {
    expect(buildAnalyzeRacePayload([], INSIGHT)).toEqual({
      races: [],
      insight: INSIGHT,
      retireReasonKeys: [],
      excludedNoReason: 0,
    })
  })
})

describe('buildAnalyzeRacePayload — weight 규칙 (D7, R28: 분석 전용 계수 1.1)', () => {
  it('weight = 1.1^rank(소수 2자리) — 슬라이스 내 가장 오래된 건이 정확히 1', () => {
    const races = racesDesc([{}, {}, {}]) // 최신 → 오래된

    const payload = buildAnalyzeRacePayload(races, INSIGHT)

    // n=3: 최신(rank 2)=1.1²=1.21, 중간(rank 1)=1.1, 가장 오래된(rank 0)=1
    expect(payload.races.map(r => r.weight)).toEqual([1.21, 1.1, 1])
  })

  it('25건 입력에서도 슬라이스(20건) 내 가장 오래된 항목의 weight가 1이고 최신으로 갈수록 커진다', () => {
    const races = racesDesc(Array.from({length: 25}, () => ({})))

    const weights = buildAnalyzeRacePayload(races, INSIGHT).races.map(r => r.weight)

    expect(weights[19]).toBe(1)
    // R28/DL-032 — 20건 비율은 약 6:1이어야 한다(추천 계수 1.5면 2217:1로 벌어져 패턴 탐지가 죽는다)
    expect(weights[0] ?? Number.NaN).toBeCloseTo(1.1 ** 19, 1)
    expect(weights[0] ?? Number.NaN).toBeLessThan(10)
    for (let j = 1; j < weights.length; j += 1) {
      expect(weights[j - 1]).toBeGreaterThan(weights[j] ?? Number.NaN)
    }
  })
})

describe('buildAnalyzeRacePayload — 화이트리스트 조립 (D7·governance §2 핵심)', () => {
  it('금지 필드(motorId·id) 부재 — 항목 키는 허용 8필드+weight뿐, 직렬화 전문에도 없음', () => {
    const races = racesDesc([
      {result: 'retired', retireReason: 'corner', lapTimeMs: 9000},
      {result: 'finished'},
      {},
    ])

    const payload = buildAnalyzeRacePayload(races, INSIGHT)

    for (const item of payload.races) {
      expect('id' in item).toBe(false)
      expect('motorId' in item).toBe(false)
      for (const key of Object.keys(item)) {
        expect(ALLOWED_ITEM_KEYS.has(key)).toBe(true)
      }
    }
    // spread 통과 회귀 최종 방어 — 전송 body 어디에도 금지 키가 등장하지 않는다
    const serialized = JSON.stringify(payload)
    expect(serialized).not.toContain('"id"')
    expect(serialized).not.toContain('"motorId"')
  })

  it('optional 필드는 있을 때만 키를 넣는다 — undefined 키 미전송', () => {
    const races = racesDesc([{}]) // result·lapTimeMs·retireReason 전부 부재

    const item = buildAnalyzeRacePayload(races, INSIGHT).races[0]

    expect(item).toEqual({voltage: 2.8, panoHz: 300, createdAt: races[0]?.createdAt, weight: 1})
    expect(item !== undefined && 'result' in item).toBe(false)
    expect(item !== undefined && 'retireReason' in item).toBe(false)
  })
})
