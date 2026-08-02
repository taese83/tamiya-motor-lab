import {describe, expect, it} from 'vitest'

import {selectGoalRecommendation} from './race-goal-recommend'
import {computeRaceInsight} from './race-insight'

import type {RaceInsight, TrendDir} from './race-insight'
import type {RaceRecord} from './types'

// R30 목표 추천 selector (feature-plan race-autofill §테스트 계획 — REQ-AF-001·002, DL-036·037).
// 규칙 R1~R5 전 분기 + 침묵 게이트를 고정한다. streak·trend는 insight에서 읽는다(재계산 금지)
// — 게이트 테스트(race-analysis-gate.test.ts)와 동형으로 insight는 손으로 조립하고,
// 미정(result undefined) 혼재 케이스만 computeRaceInsight로 실제 짝(페이지 배선과 동일)을 쓴다.
// fixture는 listRaceRecordsByMotor 계약 그대로 최신순(desc) — index 0 = 최신.

const MOTOR_ID = '00000000-0000-4000-8000-000000000000'

type RaceSpec = Partial<Pick<RaceRecord, 'result' | 'retireReason' | 'voltage'>>

/** 최신순(desc) fixture — index 0 = 최신 (race-insight.test.ts 선례와 동일 규약) */
function racesDesc(specs: ReadonlyArray<RaceSpec>): RaceRecord[] {
  return specs.map((spec, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    motorId: MOTOR_ID,
    panoHz: 300,
    voltage: spec.voltage ?? 2.8,
    createdAt: new Date(Date.UTC(2026, 7, 1, 10, 0, 0) - i * 60_000).toISOString(),
    ...(spec.result !== undefined && {result: spec.result}),
    ...(spec.retireReason !== undefined && {retireReason: spec.retireReason}),
  }))
}

/** 선택 필드만 다른 최소 RaceInsight — selector는 kind·streak·trend.lapTimeMs만 읽는다 */
function insightOf(
  kind: RaceInsight['kind'],
  overrides: {streak?: ReadonlyArray<'finished' | 'retired'>; lapTimeTrend?: TrendDir} = {},
): RaceInsight {
  return {
    kind,
    finishedBand: null,
    lastFinishedVoltage: null,
    lastFinishedPanoHz: null,
    streak: overrides.streak ?? [],
    trend: {lapTimeMs: overrides.lapTimeTrend ?? null, panoHz: null},
    excluded: {resultPending: 0, lapTimeMissing: 0},
  }
}

describe('selectGoalRecommendation — 침묵 게이트 (REQ-AF-002)', () => {
  it('kind≠ready(2건 insufficient)면 null — 판단하지 않는다', () => {
    const races = racesDesc([{result: 'retired'}, {result: 'retired'}])

    expect(
      selectGoalRecommendation(races, insightOf('insufficient', {streak: ['retired', 'retired']})),
    ).toBeNull()
  })

  it('kind=ready라도 확정 streak<3(미정 혼재)이면 null — R1 패턴(2연속 이탈)이어도 침묵', () => {
    // 전체 5건(ready)이지만 확정은 2건뿐 — INSIGHT_READY_MIN이 미정 포함 계수라는 빈틈을
    // streak.length<3 병행 조건이 막는다(plan-review 특별 점검 ③)
    const races = racesDesc([{result: 'retired'}, {result: 'retired'}, {}, {}, {}])
    const insight = computeRaceInsight(races)

    expect(insight.kind).toBe('ready')
    expect(insight.streak).toEqual(['retired', 'retired'])
    expect(selectGoalRecommendation(races, insight)).toBeNull()
  })
})

describe('selectGoalRecommendation — R1 이탈 연속 (REQ-AF-001)', () => {
  it('최신 2연속 이탈 → finish/retired_streak', () => {
    const races = racesDesc([{result: 'retired'}, {result: 'retired'}, {result: 'finished'}])
    const insight = insightOf('ready', {streak: ['retired', 'retired', 'finished']})

    expect(selectGoalRecommendation(races, insight)).toEqual({
      goal: 'finish',
      rationale: 'retired_streak',
    })
  })

  it('2연속 이탈이 속도 연관 사유(corner)여도 R1이 R2보다 우선한다', () => {
    const races = racesDesc([
      {result: 'retired', retireReason: 'corner'},
      {result: 'retired', retireReason: 'corner'},
      {result: 'finished'},
    ])
    const insight = insightOf('ready', {streak: ['retired', 'retired', 'finished']})

    expect(selectGoalRecommendation(races, insight)).toEqual({
      goal: 'finish',
      rationale: 'retired_streak',
    })
  })
})

describe("selectGoalRecommendation — R2·R2' 이탈 1회 (REQ-AF-001)", () => {
  it('이탈 1회 + 속도 연관 사유(corner) → stability/retired_speed_related', () => {
    const races = racesDesc([
      {result: 'retired', retireReason: 'corner'},
      {result: 'finished'},
      {result: 'finished'},
    ])
    const insight = insightOf('ready', {streak: ['retired', 'finished', 'finished']})

    expect(selectGoalRecommendation(races, insight)).toEqual({
      goal: 'stability',
      rationale: 'retired_speed_related',
    })
  })

  it("R2': 이탈 1회 + 비속도 사유(parts, speedRelated=false) → null 침묵", () => {
    const races = racesDesc([
      {result: 'retired', retireReason: 'parts'},
      {result: 'finished'},
      {result: 'finished'},
    ])
    const insight = insightOf('ready', {streak: ['retired', 'finished', 'finished']})

    expect(selectGoalRecommendation(races, insight)).toBeNull()
  })

  it("R2': 이탈 1회 + 사유 미입력 → null 침묵", () => {
    const races = racesDesc([{result: 'retired'}, {result: 'finished'}, {result: 'finished'}])
    const insight = insightOf('ready', {streak: ['retired', 'finished', 'finished']})

    expect(selectGoalRecommendation(races, insight)).toBeNull()
  })

  it('⚠️ 미정 회차가 최신에 섞이면 races[0]이 아니라 **result 확정 첫 회차**로 R2를 판독한다', () => {
    // races[0]=미정(사유 없음), races[1]=corner 이탈 — races[0] 기준이면 사유 없음으로 null이
    // 나와버린다. streak[0]과 같은 개체(확정 첫 회차)를 읽어야 stability가 나온다
    // (plan-review 구현 정밀도 지적 — 페이지 배선과 동일하게 computeRaceInsight 짝으로 검증).
    const races = racesDesc([
      {}, // 결과 미정 — 최신
      {result: 'retired', retireReason: 'corner'},
      {result: 'finished'},
      {result: 'finished'},
    ])
    const insight = computeRaceInsight(races)

    expect(insight.kind).toBe('ready')
    expect(insight.streak).toEqual(['retired', 'finished', 'finished'])
    expect(selectGoalRecommendation(races, insight)).toEqual({
      goal: 'stability',
      rationale: 'retired_speed_related',
    })
  })

  it("⚠️ 미정 혼재 + 확정 첫 회차가 비속도(parts) 이탈이면 R2' null — 확정 회차 기준 일관", () => {
    const races = racesDesc([
      {}, // 결과 미정 — 최신
      {result: 'retired', retireReason: 'parts'},
      {result: 'finished'},
      {result: 'finished'},
    ])
    const insight = computeRaceInsight(races)

    expect(selectGoalRecommendation(races, insight)).toBeNull()
  })
})

describe('selectGoalRecommendation — R3·R4 완주 연속 (REQ-AF-001)', () => {
  const finishedRaces = racesDesc([
    {result: 'finished'},
    {result: 'finished'},
    {result: 'finished'},
  ])
  const finishedStreak: ReadonlyArray<'finished' | 'retired'> = ['finished', 'finished', 'finished']

  it('R3: 3연속 완주 + trend null(랩타임 미기록) → speed/finished_streak — 악화 신호 없음 취급', () => {
    const insight = insightOf('ready', {streak: finishedStreak, lapTimeTrend: null})

    expect(selectGoalRecommendation(finishedRaces, insight)).toEqual({
      goal: 'speed',
      rationale: 'finished_streak',
    })
  })

  it('R3: 3연속 완주 + trend steady → speed/finished_streak', () => {
    const insight = insightOf('ready', {streak: finishedStreak, lapTimeTrend: 'steady'})

    expect(selectGoalRecommendation(finishedRaces, insight)).toEqual({
      goal: 'speed',
      rationale: 'finished_streak',
    })
  })

  it('R3: 3연속 완주 + trend improving → speed/finished_streak', () => {
    const insight = insightOf('ready', {streak: finishedStreak, lapTimeTrend: 'improving'})

    expect(selectGoalRecommendation(finishedRaces, insight)).toEqual({
      goal: 'speed',
      rationale: 'finished_streak',
    })
  })

  it('R4: 3연속 완주 + trend worsening → stability/finished_worsening', () => {
    const insight = insightOf('ready', {streak: finishedStreak, lapTimeTrend: 'worsening'})

    expect(selectGoalRecommendation(finishedRaces, insight)).toEqual({
      goal: 'stability',
      rationale: 'finished_worsening',
    })
  })
})

describe('selectGoalRecommendation — R5 혼조 침묵 + 결정론 (REQ-AF-001·002)', () => {
  it('혼조(finished-retired-finished) → null — 어떤 규칙에도 걸리지 않으면 침묵', () => {
    const races = racesDesc([
      {result: 'finished'},
      {result: 'retired', retireReason: 'corner'},
      {result: 'finished'},
    ])
    const insight = insightOf('ready', {streak: ['finished', 'retired', 'finished']})

    expect(selectGoalRecommendation(races, insight)).toBeNull()
  })

  it('혼조(finished 2연속 후 retired) → null — 완주 연속이 3에 못 미치면 판단하지 않는다', () => {
    const races = racesDesc([{result: 'finished'}, {result: 'finished'}, {result: 'retired'}])
    const insight = insightOf('ready', {streak: ['finished', 'finished', 'retired']})

    expect(selectGoalRecommendation(races, insight)).toBeNull()
  })

  it('결정론: 동일 입력 반복 호출은 동일 결과를 반환한다', () => {
    const races = racesDesc([
      {result: 'retired', retireReason: 'corner'},
      {result: 'finished'},
      {result: 'finished'},
    ])
    const insight = insightOf('ready', {streak: ['retired', 'finished', 'finished']})

    const first = selectGoalRecommendation(races, insight)
    const second = selectGoalRecommendation(races, insight)

    expect(first).toEqual(second)
    expect(first).toEqual({goal: 'stability', rationale: 'retired_speed_related'})
  })
})
