import {describe, expect, it} from 'vitest'

import {collectMeasureInputSchema, measureRecordSchema} from './schema'

// R51 — 파노 수동 입력 데이터 계약 회귀. source additive optional(부재=measured) + 쌍 불변식(INV-06)
// + write-strict(F0_RANGE)이 수동 경로에도 그대로 적용됨을 고정한다.

const UUID_A = '11111111-1111-4111-8111-111111111111'
const UUID_B = '22222222-2222-4222-8222-222222222222'
// panoHz 300 → rpm round(300×60)=18000 (INV-06 쌍)
const readBase = {
  id: UUID_A,
  motorId: UUID_B,
  panoHz: 300,
  rpm: 18000,
  measuredAt: '2026-08-04T00:00:00.000Z',
}
const writeBase = {motorId: UUID_B, panoHz: 300, rpm: 18000}

describe('measureRecordSchema — source (R51)', () => {
  it('source:manual을 read에서 보존한다', () => {
    expect(measureRecordSchema.parse({...readBase, source: 'manual'}).source).toBe('manual')
  })

  it('source 부재는 그대로 undefined(구 레코드·실측)', () => {
    expect(measureRecordSchema.parse(readBase).source).toBeUndefined()
  })

  it('알 수 없는 source 값은 거부한다', () => {
    expect(measureRecordSchema.safeParse({...readBase, source: 'x'}).success).toBe(false)
  })

  it('수동 레코드도 rpm=round(panoHz×60) 쌍 불변식을 강제한다(INV-06)', () => {
    expect(
      measureRecordSchema.safeParse({...readBase, rpm: 17999, source: 'manual'}).success,
    ).toBe(false)
  })
})

describe('collectMeasureInputSchema — 수동 write (R51)', () => {
  it('source:manual + 파생 rpm + stabilityCv 생략을 수용한다', () => {
    const parsed = collectMeasureInputSchema.parse({...writeBase, source: 'manual'})
    expect(parsed.source).toBe('manual')
    expect(parsed.stabilityCv).toBeUndefined()
  })

  it('source 생략(실측)도 수용한다', () => {
    expect(collectMeasureInputSchema.safeParse(writeBase).success).toBe(true)
  })

  it('write-strict F0_RANGE 미달은 수동 경로에서도 거부한다', () => {
    // 100 Hz < F0_RANGE.min(170) — 쌍(rpm=6000)은 맞지만 대역 미달로 거부
    expect(
      collectMeasureInputSchema.safeParse({motorId: UUID_B, panoHz: 100, rpm: 6000, source: 'manual'})
        .success,
    ).toBe(false)
  })
})
