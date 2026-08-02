import {beforeEach, describe, expect, it} from 'vitest'

import {initPersistence, replaceDomainSnapshot} from '@shared/lib/persistence'

import {listMotorSummaries} from './repository'

// R38 회귀 — "레이스 전 세팅"(목표만, result 미정) 레이스가 있어도 목록 조회가 죽지 않아야 한다.
// (프로덕션 장애: summaryRaceRowSchema.result가 필수라 result 없는 레이스를 가진 모터의 전체
//  목록이 data-corrupt로 실패했다. canonical raceRecordSchema는 result optional인데 projection이 drift.)

const MOTOR = 'aaaaaaaa-1111-4111-8111-111111111111'

const motor = {
  id: MOTOR,
  name: '파워대시 1',
  kind: 'power_dash',
  sortOrder: 0,
  createdAt: '2026-07-29T14:49:35.273Z',
  updatedAt: '2026-07-29T14:49:35.273Z',
  stabilityBestCvs: [0.001, 0.0011, 0.0011],
}
const measure = {
  id: 'bbbbbbbb-2222-4222-8222-222222222222',
  motorId: MOTOR,
  panoHz: 469.6,
  rpm: 28176,
  measuredAt: '2026-07-30T14:12:42.348Z',
}
const settingOnlyRace = {
  id: 'cccccccc-3333-4333-8333-333333333333',
  motorId: MOTOR,
  panoHz: 526.3,
  voltage: 2.6,
  goal: 'stability',
  createdAt: '2026-08-02T06:20:15.815Z',
  // result 없음 (레이스 전 세팅)
}

describe('listMotorSummaries — result 미정 레이스 (R38)', () => {
  beforeEach(async () => {
    await initPersistence()
  })

  it('result 없는 레이스가 있어도 목록을 정상 조회한다', async () => {
    await replaceDomainSnapshot({motors: [motor], measures: [measure], races: [settingOnlyRace]})
    const summaries = await listMotorSummaries()
    expect(summaries).toHaveLength(1)
    expect(summaries[0]!.raceCount).toBe(1)
    expect(summaries[0]!.lastRace?.result).toBeUndefined() // 미정 그대로 전달
    expect(summaries[0]!.measureCount).toBe(1)
  })

  it('result 있는 레이스는 종전대로 그대로 전달한다', async () => {
    await replaceDomainSnapshot({
      motors: [motor],
      measures: [],
      races: [{...settingOnlyRace, id: 'dddddddd-4444-4444-8444-444444444444', result: 'finished'}],
    })
    const summaries = await listMotorSummaries()
    expect(summaries[0]!.lastRace?.result).toBe('finished')
  })
})

// R41 ④ — 목록 우측 "완주 시 전압·파노"를 위한 최근 완주(finished) projection.
// lastRace(결과 무관 최신)와 별개: 최신 레이스가 이탈이어도 완주 기준점은 lastFinishedRace가 유지한다.
describe('listMotorSummaries — lastFinishedRace 파생 (R41 ④)', () => {
  beforeEach(async () => {
    await initPersistence()
  })

  const finishedEarlier = {
    id: 'eeeeeeee-5555-4555-8555-555555555555',
    motorId: MOTOR,
    panoHz: 500.0,
    voltage: 2.8,
    goal: 'finish',
    result: 'finished',
    createdAt: '2026-08-01T00:00:00.000Z',
  }
  const retiredLater = {
    id: 'ffffffff-6666-4666-8666-666666666666',
    motorId: MOTOR,
    panoHz: 521.4,
    voltage: 3.1,
    goal: 'speed',
    result: 'retired',
    createdAt: '2026-08-02T00:00:00.000Z',
  }

  it('최신 레이스가 이탈이어도 최근 완주 레이스를 lastFinishedRace로 잡는다', async () => {
    await replaceDomainSnapshot({motors: [motor], measures: [], races: [finishedEarlier, retiredLater]})
    const summaries = await listMotorSummaries()

    expect(summaries[0]!.lastRace?.result).toBe('retired') // 결과 무관 최신
    expect(summaries[0]!.lastFinishedRace?.panoHz).toBe(500.0) // 최근 완주 파노
    expect(summaries[0]!.lastFinishedRace?.voltage).toBe(2.8) // 최근 완주 전압
  })

  it('완주 레이스가 하나도 없으면 lastFinishedRace는 부재', async () => {
    await replaceDomainSnapshot({motors: [motor], measures: [], races: [{...settingOnlyRace}, retiredLater]})
    const summaries = await listMotorSummaries()

    expect(summaries[0]!.raceCount).toBe(2)
    expect(summaries[0]!.lastFinishedRace).toBeUndefined()
  })
})
