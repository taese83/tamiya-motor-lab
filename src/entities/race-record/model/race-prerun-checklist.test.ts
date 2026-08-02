import {describe, expect, it} from 'vitest'

import {selectPrerunChecklist} from './race-prerun-checklist'

import type {RaceRecord} from './types'

// R30 주행 전 체크리스트 파생 selector (feature-plan race-autofill §테스트 계획 — REQ-AF-004·006,
// DL-038). 선정 규칙을 고정한다: 확정 회차 최신 STREAK_LIMIT(5)건 스캔(미정은 건너뜀·슬롯 미소모)
// → retired+retireReason 보유만 집계 → 빈도 desc·동률 최신 우선 → 상위 2 사유 → 총 3항목 상한
// (후순위 사유부터 절삭). [] = 블록 비노출. 항목 문구는 RETIRE_REASON_PRERUN_ITEMS(domain.ts)
// 원문 그대로 단언 — 카피 변경은 이 테스트가 감지한다.
// fixture는 listRaceRecordsByMotor 계약 그대로 최신순(desc) — index 0 = 최신.

const MOTOR_ID = '00000000-0000-4000-8000-000000000000'

type RaceSpec = Partial<Pick<RaceRecord, 'result' | 'retireReason'>>

/** 최신순(desc) fixture — index 0 = 최신 (race-insight.test.ts 선례와 동일 규약) */
function racesDesc(specs: ReadonlyArray<RaceSpec>): RaceRecord[] {
  return specs.map((spec, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    motorId: MOTOR_ID,
    panoHz: 300,
    voltage: 2.8,
    createdAt: new Date(Date.UTC(2026, 7, 1, 10, 0, 0) - i * 60_000).toISOString(),
    ...(spec.result !== undefined && {result: spec.result}),
    ...(spec.retireReason !== undefined && {retireReason: spec.retireReason}),
  }))
}

describe('selectPrerunChecklist — 매핑·집계 (REQ-AF-004)', () => {
  it('jump_attitude×2 + stall×1 → 그룹 2개·count 정확·총 3항목(후순위 stall은 1항목으로 절삭)', () => {
    const races = racesDesc([
      {result: 'retired', retireReason: 'jump_attitude'},
      {result: 'retired', retireReason: 'stall'},
      {result: 'retired', retireReason: 'jump_attitude'},
      {result: 'finished'},
      {result: 'finished'},
    ])

    const groups = selectPrerunChecklist(races)

    expect(groups).toEqual([
      {
        reason: 'jump_attitude',
        count: 2,
        items: ['댐퍼 상태 확인', '무게중심(배터리 위치) 확인'],
      },
      {reason: 'stall', count: 1, items: ['배터리 잔량·접점 확인']},
    ])
    expect(groups.reduce((sum, g) => sum + g.items.length, 0)).toBeLessThanOrEqual(3)
  })

  it('dedupe + 빈도 내림차순: stall×2가 최신 corner×1보다 앞선다 — 빈도가 최신성보다 우선', () => {
    const races = racesDesc([
      {result: 'retired', retireReason: 'corner'}, // 최신이지만 1회
      {result: 'retired', retireReason: 'stall'},
      {result: 'retired', retireReason: 'stall'},
      {result: 'finished'},
      {result: 'finished'},
    ])

    expect(selectPrerunChecklist(races)).toEqual([
      {reason: 'stall', count: 2, items: ['배터리 잔량·접점 확인', '기어 물림·이물질 확인']},
      {reason: 'corner', count: 1, items: ['롤러 상태·스태빌라이저 확인']},
    ])
  })

  it('동률이면 최신(첫 등장이 더 최근) 사유가 먼저다', () => {
    const races = racesDesc([
      {result: 'retired', retireReason: 'corner'}, // corner 첫 등장 — 최신
      {result: 'retired', retireReason: 'stall'},
      {result: 'retired', retireReason: 'corner'},
      {result: 'retired', retireReason: 'stall'},
      {result: 'finished'},
    ])

    const groups = selectPrerunChecklist(races)

    expect(groups.map(g => g.reason)).toEqual(['corner', 'stall'])
    expect(groups.map(g => g.count)).toEqual([2, 2])
  })

  it('상위 2개 사유만 채택 — 3번째 사유(parts)는 버려진다', () => {
    const races = racesDesc([
      {result: 'retired', retireReason: 'corner'},
      {result: 'retired', retireReason: 'corner'},
      {result: 'retired', retireReason: 'parts'}, // 1회 — 상위 2 밖
      {result: 'retired', retireReason: 'stall'},
      {result: 'retired', retireReason: 'stall'},
    ])

    const groups = selectPrerunChecklist(races)

    expect(groups.map(g => g.reason)).toEqual(['corner', 'stall'])
    expect(groups.some(g => g.reason === 'parts')).toBe(false)
  })

  it('항목 많은 사유 2개(각 2항목) 조합 → 총 3항목 상한, 후순위 사유의 항목부터 절삭', () => {
    const races = racesDesc([
      {result: 'retired', retireReason: 'jump_attitude'},
      {result: 'retired', retireReason: 'jump_rebound'},
      {result: 'retired', retireReason: 'jump_attitude'},
      {result: 'retired', retireReason: 'jump_rebound'},
      {result: 'retired', retireReason: 'jump_attitude'},
    ])

    const groups = selectPrerunChecklist(races)

    expect(groups).toEqual([
      {
        reason: 'jump_attitude',
        count: 3,
        items: ['댐퍼 상태 확인', '무게중심(배터리 위치) 확인'], // 선순위 — 2항목 전부
      },
      {reason: 'jump_rebound', count: 2, items: ['댐퍼 작동 확인']}, // 후순위 — 2→1로 절삭
    ])
    expect(groups.reduce((sum, g) => sum + g.items.length, 0)).toBe(3)
  })
})

describe('selectPrerunChecklist — 유효 사유 0건이면 [] (REQ-AF-006 침묵)', () => {
  it('완주만 5건 → []', () => {
    const races = racesDesc([
      {result: 'finished'},
      {result: 'finished'},
      {result: 'finished'},
      {result: 'finished'},
      {result: 'finished'},
    ])

    expect(selectPrerunChecklist(races)).toEqual([])
  })

  it('사유 미입력 이탈만 → [] — retired여도 retireReason 없으면 집계 대상이 아니다', () => {
    const races = racesDesc([{result: 'retired'}, {result: 'retired'}, {result: 'retired'}])

    expect(selectPrerunChecklist(races)).toEqual([])
  })

  it('0건 입력 → []', () => {
    expect(selectPrerunChecklist([])).toEqual([])
  })
})

describe('selectPrerunChecklist — 윈도우: 확정 회차 최신 5건 (STREAK_LIMIT 재사용)', () => {
  it('확정 5건(완주) 밖의 6번째 확정 이탈 사유는 반영하지 않는다', () => {
    const races = racesDesc([
      {result: 'finished'},
      {result: 'finished'},
      {result: 'finished'},
      {result: 'finished'},
      {result: 'finished'},
      {result: 'retired', retireReason: 'corner'}, // 6번째 확정 — 윈도우 밖
    ])

    expect(selectPrerunChecklist(races)).toEqual([])
  })

  it('미정 회차는 윈도우 슬롯을 소모하지 않는다 — 미정 1건 뒤 5번째 확정 이탈이 포함된다', () => {
    // 미정이 슬롯을 소모했다면 stall(5번째 확정)이 윈도우 밖으로 밀려 []가 됐을 것
    const races = racesDesc([
      {}, // 결과 미정 — 건너뜀·카운트 제외
      {result: 'finished'},
      {result: 'finished'},
      {result: 'finished'},
      {result: 'finished'},
      {result: 'retired', retireReason: 'stall'}, // 확정 5번째 — 윈도우 안
    ])

    expect(selectPrerunChecklist(races)).toEqual([
      {reason: 'stall', count: 1, items: ['배터리 잔량·접점 확인', '기어 물림·이물질 확인']},
    ])
  })
})
