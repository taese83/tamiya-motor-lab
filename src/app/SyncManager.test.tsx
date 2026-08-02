import {describe, expect, it, vi} from 'vitest'

import {sanitizeSnapshot} from './SyncManager'

import type {DomainSnapshot} from '@shared/lib/persistence'

// R35 — 서버 스냅샷 격리 계약: 스키마 위반 행은 drop, 격리된 모터를 참조하는 기록도 연쇄 격리(INV-03).
// 서버에 불량 행이 있어도 pull이 로컬을 재오염시켜 앱 전체가 불능이 되지 않게 한다(프로덕션 장애 회귀 방지).

const MOTOR_A = '11111111-1111-4111-8111-111111111111'
const MOTOR_BAD = '22222222-2222-4222-8222-222222222222'

const validMotor = (id: string) => ({
  id,
  name: '모터',
  kind: 'hyper_dash',
  sortOrder: 0,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
})
const validMeasure = (motorId: string) => ({
  id: '33333333-3333-4333-8333-333333333333',
  motorId,
  panoHz: 309,
  rpm: 18540,
  measuredAt: '2026-08-01T01:00:00.000Z',
})
const validRace = (motorId: string) => ({
  id: '44444444-4444-4444-8444-444444444444',
  motorId,
  panoHz: 309,
  voltage: 2.8,
  createdAt: '2026-08-01T02:00:00.000Z',
})

describe('sanitizeSnapshot (R35)', () => {
  it('전부 유효하면 그대로 통과한다', () => {
    const snapshot: DomainSnapshot = {
      motors: [validMotor(MOTOR_A)],
      measures: [validMeasure(MOTOR_A)],
      races: [validRace(MOTOR_A)],
    }
    const out = sanitizeSnapshot(snapshot)
    expect(out.motors).toHaveLength(1)
    expect(out.measures).toHaveLength(1)
    expect(out.races).toHaveLength(1)
  })

  it('스키마 위반 행만 격리하고 유효 행은 보존한다', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const snapshot: DomainSnapshot = {
      motors: [validMotor(MOTOR_A)],
      measures: [
        validMeasure(MOTOR_A),
        {...validMeasure(MOTOR_A), id: '55555555-5555-4555-8555-555555555555', rpm: 999}, // INV-06 위반
      ],
      races: [{...validRace(MOTOR_A), voltage: 2.867}], // 소수 3자리 — 스키마 위반
    }
    const out = sanitizeSnapshot(snapshot)
    expect(out.motors).toHaveLength(1)
    expect(out.measures).toHaveLength(1) // 위반 1건 격리
    expect(out.races).toHaveLength(0) // 위반 격리
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('격리된 모터를 참조하는 기록은 유효해도 연쇄 격리한다 (INV-03)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const snapshot: DomainSnapshot = {
      motors: [validMotor(MOTOR_A), {...validMotor(MOTOR_BAD), kind: 'unknown_kind'}], // 모터 1건 격리
      measures: [validMeasure(MOTOR_BAD)], // 격리된 모터 참조 → 연쇄 격리
      races: [validRace(MOTOR_A)], // 생존 모터 참조 → 보존
    }
    const out = sanitizeSnapshot(snapshot)
    expect(out.motors).toHaveLength(1)
    expect(out.measures).toHaveLength(0)
    expect(out.races).toHaveLength(1)
    warn.mockRestore()
  })
})
