import {describe, expect, it} from 'vitest'

import {selectRaceAnalysisGate} from './race-analysis-gate'

import type {RaceInsight} from './race-insight'
import type {RaceRecord} from './types'

// R25 레이스 AI 분석 게이트 (eval-plan race-ai §2 D2 — REQ-RAI-004).
// 클라 결정론 게이트가 호출 자체를 차단하는 규칙을 고정한다: empty/insufficient는 insight.kind
// 그대로(건수 경계 재계산 금지 — R22 카드와 판정 일치), retired ≥1건인데 전부 사유 없음이면
// no_retire_reasons, 그 외 eligible. fixture는 listRaceRecordsByMotor 계약 그대로 최신순(desc).

const MOTOR_ID = '00000000-0000-4000-8000-000000000000'

type RaceSpec = Partial<Pick<RaceRecord, 'result' | 'retireReason' | 'voltage'>>

/** 최신순(desc) fixture — index 0 = 최신 (race-insight.test.ts 선례와 동일 규약) */
function racesDesc(specs: ReadonlyArray<RaceSpec>): RaceRecord[] {
  return specs.map((spec, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    motorId: MOTOR_ID,
    panoHz: 300,
    voltage: spec.voltage ?? 2.8,
    createdAt: new Date(Date.UTC(2026, 6, 31, 10, 0, 0) - i * 60_000).toISOString(),
    ...(spec.result !== undefined && {result: spec.result}),
    ...(spec.retireReason !== undefined && {retireReason: spec.retireReason}),
  }))
}

/** kind만 다른 최소 RaceInsight — 게이트는 kind 외 파생값을 읽지 않는다 */
function insightOf(kind: RaceInsight['kind']): RaceInsight {
  return {
    kind,
    finishedBand: null,
    lastFinishedVoltage: null,
    streak: [],
    trend: {lapTimeMs: null, panoHz: null},
    excluded: {resultPending: 0, lapTimeMissing: 0},
  }
}

describe('selectRaceAnalysisGate (D2 — REQ-RAI-004)', () => {
  it("0건(insight empty) → eligible:false reason:'empty'", () => {
    expect(selectRaceAnalysisGate([], insightOf('empty'))).toEqual({
      eligible: false,
      reason: 'empty',
    })
  })

  it("2건(insight insufficient) → eligible:false reason:'insufficient'", () => {
    const races = racesDesc([{result: 'finished'}, {result: 'retired'}])

    expect(selectRaceAnalysisGate(races, insightOf('insufficient'))).toEqual({
      eligible: false,
      reason: 'insufficient',
    })
  })

  it("ready인데 retired가 있고 전부 사유 없음 → 'no_retire_reasons'", () => {
    const races = racesDesc([
      {result: 'retired'}, // 사유 없음
      {result: 'finished'},
      {result: 'retired'}, // 사유 없음
    ])

    expect(selectRaceAnalysisGate(races, insightOf('ready'))).toEqual({
      eligible: false,
      reason: 'no_retire_reasons',
    })
  })

  it('ready + 사유 있는 retired가 하나라도 있으면 eligible (사유 없는 retired 혼재 무관)', () => {
    const races = racesDesc([
      {result: 'retired'}, // 사유 없음 — 혼재해도 차단하지 않는다
      {result: 'retired', retireReason: 'corner'},
      {result: 'finished'},
    ])

    expect(selectRaceAnalysisGate(races, insightOf('ready'))).toEqual({eligible: true})
  })

  it('ready + retired 0건(완주·미정만)이면 eligible — 진단 대상 이탈이 없을 뿐 차단 아님', () => {
    const races = racesDesc([{result: 'finished'}, {}, {result: 'finished'}])

    expect(selectRaceAnalysisGate(races, insightOf('ready'))).toEqual({eligible: true})
  })
})
