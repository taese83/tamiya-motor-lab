import {describe, expect, it} from 'vitest'

import {
  createRaceRecordDraftSchema,
  raceRecordSchema,
  retireReasonSchema,
  updateRaceRecordPatchSchema,
} from './schema'

// retireReason 경계 (R20 — optional additive, D-R2·D-R5).
// 핵심 계약 둘을 고정한다: ① 저장 가능한 값은 트리 leaf key 하나뿐(branch 'jump' 거부),
// ② optional이라 구 데이터·미선택 입력이 corrupt 판정되지 않는다(read-lenient, goal과 동일 원칙).

const MOTOR_ID = '00000000-0000-4000-8000-000000000000'

const BASE_DRAFT = {motorId: MOTOR_ID, panoHz: 300, voltage: 2.8}

const BASE_ROW = {
  id: '00000000-0000-4000-8000-000000000001',
  motorId: MOTOR_ID,
  panoHz: 300,
  voltage: 2.8,
  createdAt: '2026-07-31T10:00:00.000Z',
}

// 검증 결과 축약 헬퍼 — 각 경계 케이스를 한 줄 assert로 고정한다
const draftOk = (extra: Record<string, unknown>): boolean =>
  createRaceRecordDraftSchema.safeParse({...BASE_DRAFT, ...extra}).success
const patchOk = (patch: Record<string, unknown>): boolean =>
  updateRaceRecordPatchSchema.safeParse({voltage: 2.8, ...patch}).success
const rowOk = (extra: Record<string, unknown>): boolean =>
  raceRecordSchema.safeParse({...BASE_ROW, ...extra}).success

describe('retireReasonSchema (leaf key enum)', () => {
  it('유효 leaf key 통과 — branch 하위·top-level 모두', () => {
    expect(retireReasonSchema.safeParse('jump_overshoot').success).toBe(true)
    expect(retireReasonSchema.safeParse('corner').success).toBe(true)
  })

  it("미지 문자열('xxx') 거부", () => {
    expect(retireReasonSchema.safeParse('xxx').success).toBe(false)
  })

  it("branch key('jump') 거부 — 저장은 가장 구체적으로 고른 leaf 하나(D-R5)", () => {
    expect(retireReasonSchema.safeParse('jump').success).toBe(false)
  })
})

describe('createRaceRecordDraftSchema retireReason 경계', () => {
  it('생략 허용(optional) — 사유 미기록 입력이 막히지 않는다', () => {
    const draft = createRaceRecordDraftSchema.parse(BASE_DRAFT)
    expect(draft.retireReason).toBeUndefined()
  })

  it('유효 leaf key 통과 — retired 이탈 사유 기록 경로', () => {
    const draft = createRaceRecordDraftSchema.parse({
      ...BASE_DRAFT,
      result: 'retired',
      retireReason: 'jump_overshoot',
    })
    expect(draft.retireReason).toBe('jump_overshoot')
  })

  it("branch key('jump')·미지 문자열('xxx') 거부", () => {
    expect(draftOk({retireReason: 'jump'})).toBe(false)
    expect(draftOk({retireReason: 'xxx'})).toBe(false)
  })
})

describe('updateRaceRecordPatchSchema retireReason 경계', () => {
  it('유효 leaf 통과·생략 허용(생략 = 필드 제거, §2.1)·branch 거부', () => {
    expect(patchOk({retireReason: 'wave'})).toBe(true)
    expect(patchOk({})).toBe(true)
    expect(patchOk({retireReason: 'jump'})).toBe(false)
  })
})

describe('raceRecordSchema rehydrate 경계 (read-lenient)', () => {
  it('retireReason 없는 구 행 통과 — optional additive라 corrupt 판정 없음', () => {
    expect(rowOk({})).toBe(true)
  })

  it('leaf key 저장 행 통과, branch key 저장 행 거부(data-corrupt 채널행)', () => {
    expect(rowOk({result: 'retired', retireReason: 'stall'})).toBe(true)
    expect(rowOk({result: 'retired', retireReason: 'jump'})).toBe(false)
  })

  it("result 조합은 스키마가 강제하지 않는다 — 'finished'+사유도 통과(D-R2: 강제는 UI 클리어)", () => {
    expect(rowOk({result: 'finished', retireReason: 'corner'})).toBe(true)
  })
})
