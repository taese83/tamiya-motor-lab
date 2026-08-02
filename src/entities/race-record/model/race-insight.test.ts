import {describe, expect, it} from 'vitest'

import {computeRaceInsight, RECENT_FALLBACK, selectAdviceWindow} from './race-insight'

import type {RaceRecord} from './types'

// R22 레이스 인사이트 파생 계산 (feature-plan §테스트 계획 F1~F7 + plan-review 보강 2종).
// 입력은 listRaceRecordsByMotor 계약 그대로 **최신순(desc)** — fixture도 index 0 = 최신.
// 추세 규칙(race-insight.ts 상단 주석)을 여기서 고정한다: 임계·비교 방식 변경은 이 테스트가 막는다.

const MOTOR_ID = '00000000-0000-4000-8000-000000000000'

type RaceSpec = Partial<Pick<RaceRecord, 'result' | 'voltage' | 'lapTimeMs' | 'panoHz'>>

/** 최신순(desc) fixture — index 0이 최신이 되도록 createdAt을 내림차순 부여(재정렬 없음 계약 준수) */
function racesDesc(specs: ReadonlyArray<RaceSpec>): RaceRecord[] {
  return specs.map((spec, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    motorId: MOTOR_ID,
    panoHz: spec.panoHz ?? 300,
    voltage: spec.voltage ?? 2.8,
    createdAt: new Date(Date.UTC(2026, 6, 31, 10, 0, 0) - i * 60_000).toISOString(),
    ...(spec.result !== undefined && {result: spec.result}),
    ...(spec.lapTimeMs !== undefined && {lapTimeMs: spec.lapTimeMs}),
  }))
}

describe('computeRaceInsight — kind 경계 (F1·F2, REQ-RI-004)', () => {
  it('F1: 0건이면 empty — 모든 파생이 무해한 초기값', () => {
    expect(computeRaceInsight([])).toEqual({
      kind: 'empty',
      finishedBand: null,
      lastFinishedVoltage: null,
      lastFinishedPanoHz: null,
      streak: [],
      trend: {lapTimeMs: null, panoHz: null},
      excluded: {resultPending: 0, lapTimeMissing: 0},
    })
  })

  it('F2: 1~2건이면 insufficient — trend는 표본 부족(<3)으로 전부 null(침묵)', () => {
    const one = computeRaceInsight(racesDesc([{result: 'finished', lapTimeMs: 9000}]))
    expect(one.kind).toBe('insufficient')
    expect(one.trend).toEqual({lapTimeMs: null, panoHz: null})

    const two = computeRaceInsight(
      racesDesc([
        {result: 'finished', lapTimeMs: 9000},
        {result: 'retired', lapTimeMs: 9500},
      ]),
    )
    expect(two.kind).toBe('insufficient')
    expect(two.trend).toEqual({lapTimeMs: null, panoHz: null})
  })
})

describe('computeRaceInsight — ready 집계 (F3·F4·F6·보강A, REQ-RI-001·002·005)', () => {
  it('F3: 완주·이탈 혼재 — band는 전체 finished, streak는 최신순 상한 5건', () => {
    const races = racesDesc([
      {result: 'finished', voltage: 3.0, panoHz: 480}, // 최신 완주 → lastFinished{Voltage,PanoHz}
      {result: 'retired', voltage: 3.1},
      {result: 'finished', voltage: 2.8},
      {result: 'finished', voltage: 3.2},
      {result: 'retired', voltage: 2.9},
      {result: 'finished', voltage: 2.7}, // 6번째 — streak 상한(5) 밖, band에는 포함
    ])
    const insight = computeRaceInsight(races)

    expect(insight.kind).toBe('ready')
    expect(insight.finishedBand).toEqual({minVoltage: 2.7, maxVoltage: 3.2, sampleCount: 4})
    expect(insight.lastFinishedVoltage).toBe(3.0)
    // R37 — 같은 최신 완주 회차의 파노(구분값 480 — 기본 300과 다름 → 올바른 회차에서 뽑음 확인)
    expect(insight.lastFinishedPanoHz).toBe(480)
    // 입력 목록과 같은 최신순 — 재정렬 없음, 상한 5건에서 잘린다
    expect(insight.streak).toEqual(['finished', 'retired', 'finished', 'finished', 'retired'])
  })

  it('F4: result 미정 회차는 band·streak에서 빠지고 건수만 센다 (D3)', () => {
    const races = racesDesc([
      {voltage: 3.3}, // 미정 — band max(3.0)보다 높아도 band 미반영이어야 한다
      {result: 'finished', voltage: 3.0},
      {voltage: 2.5}, // 미정 — band min(2.9)보다 낮아도 미반영
      {result: 'retired', voltage: 3.1},
      {result: 'finished', voltage: 2.9},
    ])
    const insight = computeRaceInsight(races)

    expect(insight.kind).toBe('ready')
    expect(insight.excluded.resultPending).toBe(2)
    expect(insight.finishedBand).toEqual({minVoltage: 2.9, maxVoltage: 3.0, sampleCount: 2})
    expect(insight.lastFinishedVoltage).toBe(3.0)
    expect(insight.streak).toEqual(['finished', 'retired', 'finished'])
  })

  it('F6: 동일 전압 반복 완주 — band min==max로 퇴화해도 안정 산출', () => {
    const races = racesDesc([
      {result: 'finished', voltage: 3.0},
      {result: 'finished', voltage: 3.0},
      {result: 'finished', voltage: 3.0},
    ])
    const insight = computeRaceInsight(races)

    expect(insight.finishedBand).toEqual({minVoltage: 3.0, maxVoltage: 3.0, sampleCount: 3})
  })

  it('보강A: 3건+인데 완주 0건(이탈·미정만) — ready이되 band·lastFinishedVoltage는 null', () => {
    const races = racesDesc([
      {result: 'retired'},
      {}, // 미정
      {result: 'retired'},
      {result: 'retired'},
    ])
    const insight = computeRaceInsight(races)

    expect(insight.kind).toBe('ready')
    expect(insight.finishedBand).toBeNull()
    expect(insight.lastFinishedVoltage).toBeNull()
    expect(insight.lastFinishedPanoHz).toBeNull() // R37 — 완주 0건이면 파노 기준점도 null
    expect(insight.streak).toEqual(['retired', 'retired', 'retired'])
    expect(insight.excluded.resultPending).toBe(1)
  })
})

describe('computeRaceInsight — 추세 (F5·보강B, REQ-RI-003, DL-013)', () => {
  it('F5: 랩타임 결측 회차는 표본에서 빼고 방향을 판정한다 — lapTimeMissing은 finished 결측만', () => {
    // 윈도우 = 최신→첫 완주(r3) 포함 4건. 랩타임 보유 표본(desc) = [9000, 10000, 10000]
    // → baseline 10000, diff -1000(>5%) → 단축 = improving. pano는 전부 300 → steady.
    const races = racesDesc([
      {result: 'retired', lapTimeMs: 9000},
      {result: 'retired'}, // 랩타임 결측 — 추세 표본 제외(이탈이라 lapTimeMissing에도 미포함)
      {result: 'retired', lapTimeMs: 10_000},
      {result: 'finished', lapTimeMs: 10_000, voltage: 3.0},
      {result: 'finished', voltage: 2.9}, // 윈도우 밖 + finished 랩타임 결측 → lapTimeMissing 1
    ])
    const insight = computeRaceInsight(races)

    expect(insight.trend.lapTimeMs).toBe('improving')
    expect(insight.trend.panoHz).toBe('steady')
    expect(insight.excluded.lapTimeMissing).toBe(1)
  })

  it('F5: 윈도우 안 보유 표본이 3건 미만이면 null — 판단하지 않는다(침묵)', () => {
    // 최신이 완주라 윈도우 = 1건뿐 — 그 뒤 회차의 랩타임은 표본이 아니다
    const races = racesDesc([
      {result: 'finished', lapTimeMs: 9000},
      {result: 'retired', lapTimeMs: 8000},
      {result: 'retired', lapTimeMs: 7000},
    ])
    const insight = computeRaceInsight(races)

    expect(insight.kind).toBe('ready')
    expect(insight.trend).toEqual({lapTimeMs: null, panoHz: null})
    expect(insight.excluded.lapTimeMissing).toBe(0)
  })

  // 보강B 헬퍼 — 완주 없는 이탈 회차만이라 폴백 윈도우(최근 5건)에 표본이 전부 들어간다
  const lapTrendOf = (lapsDesc: ReadonlyArray<number>) => {
    const races = racesDesc(lapsDesc.map(lapTimeMs => ({result: 'retired' as const, lapTimeMs})))
    return computeRaceInsight(races).trend.lapTimeMs
  }
  const panoTrendOf = (panosDesc: ReadonlyArray<number>) => {
    const races = racesDesc(panosDesc.map(panoHz => ({result: 'retired' as const, panoHz})))
    return computeRaceInsight(races).trend.panoHz
  }

  it('보강B: lapTimeMs 방향 — 낮을수록 좋음 (baseline=이전 표본 평균, 임계 5%)', () => {
    expect(lapTrendOf([940, 1000, 1000])).toBe('improving') // -6% — 단축
    expect(lapTrendOf([1100, 1000, 1000])).toBe('worsening') // +10% — 느려짐
    expect(lapTrendOf([951, 1000, 1000])).toBe('steady') // |−4.9%| < 5%
    expect(lapTrendOf([1049, 1000, 1000])).toBe('steady') // |+4.9%| < 5%
  })

  it('보강B: 임계 5% 정확 경계는 steady가 아니다 — strict < (1000×0.05 === 50 부동소수 안전)', () => {
    expect(lapTrendOf([950, 1000, 1000])).toBe('improving') // |diff| == baseline×0.05
    expect(lapTrendOf([1050, 1000, 1000])).toBe('worsening')
  })

  it('보강B: panoHz 방향 — 높을수록 improving (경계는 여유 1Hz 마진)', () => {
    expect(panoTrendOf([316, 300, 300])).toBe('improving') // +16 > 15(5%)
    expect(panoTrendOf([284, 300, 300])).toBe('worsening') // -16
    expect(panoTrendOf([314, 300, 300])).toBe('steady') // |+14| < 15
    expect(panoTrendOf([286, 300, 300])).toBe('steady') // |-14| < 15
  })
})

describe('computeRaceInsight — 입력 비파괴 (F7, NFR-003)', () => {
  it('F7: 20+건에서 원본 배열의 내용·순서를 바꾸지 않고 집계가 정확하다', () => {
    // 24건: i%3==0 완주 / i%3==1 이탈 / i%3==2 미정 — 완주 8·이탈 8·미정 8
    const voltages = [2.8, 2.9, 3.0, 3.1] as const
    const races = racesDesc(
      Array.from({length: 24}, (_, i): RaceSpec => {
        if (i % 3 === 0) return {result: 'finished', voltage: voltages[i % 4] ?? 2.8}
        if (i % 3 === 1) return {result: 'retired', voltage: 3.0}
        return {voltage: 3.0} // 미정
      }),
    )
    const snapshot = structuredClone(races)

    const insight = computeRaceInsight(races)

    // 원본 비파괴 — 내용·순서·길이 전부 보존 (재정렬·splice 없음)
    expect(races).toEqual(snapshot)
    expect(races.map(r => r.id)).toEqual(snapshot.map(r => r.id))
    // 집계 정합 — 완주 표본은 전체 finished 8건, 미정 8건, streak 상한 5
    expect(insight.kind).toBe('ready')
    expect(insight.finishedBand).toEqual({minVoltage: 2.8, maxVoltage: 3.1, sampleCount: 8})
    expect(insight.excluded.resultPending).toBe(8)
    expect(insight.streak).toHaveLength(5)
    expect(insight.lastFinishedVoltage).toBe(2.8) // i=0(최신)이 완주
  })
})

describe('selectAdviceWindow — RaceDetailPage 인라인(v2.34, 추출 전)과 동치 회귀', () => {
  // 추출 안전망(D2 정합): 페이지 인라인 로직을 그대로 재현해 결과 동일을 단언한다.
  // 인라인 정의: desc에서 첫 finished **포함**까지 slice, 완주 없으면 최근 5건 폴백.
  const inlineAdviceWindow = (races: ReadonlyArray<RaceRecord>): ReadonlyArray<RaceRecord> => {
    const lastFinishedIdx = races.findIndex(r => r.result === 'finished')
    return lastFinishedIdx >= 0 ? races.slice(0, lastFinishedIdx + 1) : races.slice(0, 5)
  }

  it('폴백 상수는 인라인의 5건과 같다', () => {
    expect(RECENT_FALLBACK).toBe(5)
  })

  it('완주가 있으면 최신→가장 최근 완주 포함까지 자른다 — 인라인과 동일', () => {
    const races = racesDesc([
      {result: 'retired'},
      {}, // 미정
      {result: 'finished', voltage: 3.0},
      {result: 'retired'},
      {result: 'finished', voltage: 2.9},
    ])
    expect(selectAdviceWindow(races)).toEqual(races.slice(0, 3))
    expect(selectAdviceWindow(races)).toEqual(inlineAdviceWindow(races))
  })

  it('최신 회차가 완주면 윈도우는 1건이다 — 인라인과 동일', () => {
    const races = racesDesc([{result: 'finished'}, {result: 'retired'}, {result: 'retired'}])
    expect(selectAdviceWindow(races)).toEqual([races[0]])
    expect(selectAdviceWindow(races)).toEqual(inlineAdviceWindow(races))
  })

  it('완주가 없으면 최근 RECENT_FALLBACK(5)건 폴백 — 인라인과 동일', () => {
    const races = racesDesc([
      {result: 'retired'},
      {result: 'retired'},
      {}, // 미정도 폴백 건수에는 포함(결과 무관 최근 N건)
      {result: 'retired'},
      {result: 'retired'},
      {result: 'retired'},
      {result: 'retired'},
    ])
    expect(selectAdviceWindow(races)).toHaveLength(RECENT_FALLBACK)
    expect(selectAdviceWindow(races)).toEqual(races.slice(0, 5))
    expect(selectAdviceWindow(races)).toEqual(inlineAdviceWindow(races))
  })

  it('완주 없이 5건 미만이면 전부 — 0건이면 빈 배열 (인라인과 동일)', () => {
    const three = racesDesc([{result: 'retired'}, {}, {result: 'retired'}])
    expect(selectAdviceWindow(three)).toEqual(three)
    expect(selectAdviceWindow(three)).toEqual(inlineAdviceWindow(three))

    expect(selectAdviceWindow([])).toEqual([])
    expect(selectAdviceWindow([])).toEqual(inlineAdviceWindow([]))
  })
})
