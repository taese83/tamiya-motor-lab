import type {RaceRecord} from './types'

// 레이스 인사이트 파생 계산 (R22 — feature-plan §파생 계산 계약, DL-013·DL-014).
// RaceRecord[] → RaceInsight 순수 selector — 저장 없음, React·IO·store 의존 없음.
// 입력은 listRaceRecordsByMotor 결과 그대로의 **최신순(desc, createdAt desc·id desc)** —
// 재정렬 금지, 입력 불변, O(n) 1-pass (NFR-003). 결정론: 동일 입력 → 동일 출력.

/** advisor 윈도우 폴백 건수 — 완주 기록이 없을 때 최근 N건 (RaceDetailPage 인라인에서 추출) */
export const RECENT_FALLBACK = 5

/**
 * voltage-advisor 표본 윈도우 (v2.34 — RaceDetailPage 인라인 윈도우의 동작 보존 추출).
 * races는 최신순(desc)이므로 "최신→가장 최근 완주 **포함**"까지 slice하고,
 * 완주가 하나도 없으면 최근 RECENT_FALLBACK건으로 폴백한다.
 * DL-013: 추세(trend) 표본이 이 윈도우를 공유한다(완주 전압대는 전체 finished — 기준 분리).
 */
export function selectAdviceWindow(races: ReadonlyArray<RaceRecord>): ReadonlyArray<RaceRecord> {
  const lastFinishedIdx = races.findIndex(r => r.result === 'finished')
  return lastFinishedIdx >= 0
    ? races.slice(0, lastFinishedIdx + 1)
    : races.slice(0, RECENT_FALLBACK)
}

/** 추세 방향 — null = 표본 부족 등 판단 불가(침묵 원칙: UI는 표시하지 않는다) */
export type TrendDir = 'improving' | 'steady' | 'worsening' | null

export interface RaceInsight {
  /** 전체 건수 기준 — 0건 empty / 1~2건 insufficient / 3건+ ready (REQ-RI-004) */
  kind: 'empty' | 'insufficient' | 'ready'
  /** DL-013: 표본 = **전체** finished 회차(advisor 윈도우 아님 — band 퇴화 회피). 0건이면 null */
  finishedBand: {minVoltage: number; maxVoltage: number; sampleCount: number} | null
  /** 가장 최근 완주 회차의 전압 — 최신순 첫 finished. finished 0건이면 null */
  lastFinishedVoltage: number | null
  /** 결과 흐름 — result 미정(undefined) 제외, 최신순, 표시 상한 STREAK_LIMIT(5)건 */
  streak: ReadonlyArray<'finished' | 'retired'>
  /** DL-013: 표본 = selectAdviceWindow(races). 지표 결측 회차 제외, 보유 표본 <3이면 null */
  trend: {lapTimeMs: TrendDir; panoHz: TrendDir}
  /** DL-014(D3): 항상 산출 — "미정 n건 제외" 표기 여부는 UI가 결정 */
  excluded: {resultPending: number; lapTimeMissing: number}
}

// kind 경계 (REQ-RI-004): 전체 건수가 이 값 이상이어야 ready
const INSIGHT_READY_MIN = 3
// streak 표시 상한 (R22 계약 — 최신순 최대 5개)
const STREAK_LIMIT = 5

// ─── 추세 방향 규칙 (결정론 — test fixture가 이 규칙을 고정한다. 임계·비교 방식 변경 금지) ───
// 1) 표본: selectAdviceWindow 안에서 해당 지표를 **보유한** 회차의 값만, 연대순(oldest→newest).
//    입력이 desc이므로 수집 배열의 index 0 = 최신값, 나머지가 이전 표본이다 — 비교가
//    "최신값 vs 이전 표본 평균"이라 이전 표본의 내부 순서는 결과에 영향을 주지 않는다.
// 2) 보유 표본이 TREND_MIN_SAMPLES(3)건 미만이면 null (침묵 — 판단하지 않는다).
// 3) baseline = 최신값을 제외한 이전 표본들의 산술평균.
//    |최신값 − baseline| < baseline × TREND_STEADY_RATIO(0.05) 이면 'steady' (strict <).
//    (voltage·lapTimeMs·panoHz는 스키마상 항상 양수 — baseline > 0 보장, 0 나눗셈 없음)
// 4) steady가 아니면 부호로 방향을 결정한다:
//    - lapTimeMs(낮을수록 좋음): 감소 = improving, 증가 = worsening
//    - panoHz(중립 지표 — 방향만 산출, 라벨 문구는 UI 소유): 증가 = improving, 감소 = worsening
const TREND_MIN_SAMPLES = 3
const TREND_STEADY_RATIO = 0.05

function resolveTrend(valuesDesc: ReadonlyArray<number>, better: 'lower' | 'higher'): TrendDir {
  if (valuesDesc.length < TREND_MIN_SAMPLES) return null
  const [latest, ...prevDesc] = valuesDesc
  if (latest === undefined) return null // 도달 불가 — noUncheckedIndexedAccess 방어
  const baseline = prevDesc.reduce((sum, v) => sum + v, 0) / prevDesc.length
  const diff = latest - baseline
  if (Math.abs(diff) < baseline * TREND_STEADY_RATIO) return 'steady'
  if (better === 'lower') return diff < 0 ? 'improving' : 'worsening'
  return diff > 0 ? 'improving' : 'worsening'
}

function resolveKind(count: number): RaceInsight['kind'] {
  if (count === 0) return 'empty'
  return count < INSIGHT_READY_MIN ? 'insufficient' : 'ready'
}

/**
 * RaceRecord 목록(최신순 desc) → 레이스 인사이트 파생 (REQ-RI-001~005).
 * racesQuery.byMotor 결과를 그대로 받아 매 렌더 재계산되는 읽기 selector — 저장·부수효과 없음.
 */
export function computeRaceInsight(races: ReadonlyArray<RaceRecord>): RaceInsight {
  // 1-pass 수집: finishedBand·lastFinishedVoltage·streak·excluded (재정렬·전체 복사 없음)
  let minVoltage = Number.POSITIVE_INFINITY
  let maxVoltage = Number.NEGATIVE_INFINITY
  let finishedCount = 0
  let lastFinishedVoltage: number | null = null
  const streak: Array<'finished' | 'retired'> = []
  let resultPending = 0
  let lapTimeMissing = 0

  for (const race of races) {
    if (race.result === undefined) {
      resultPending += 1 // DL-014: 미정 회차는 band·streak에서 제외하고 건수만 센다
      continue
    }
    if (streak.length < STREAK_LIMIT) streak.push(race.result)
    if (race.result === 'finished') {
      finishedCount += 1
      if (lastFinishedVoltage === null) lastFinishedVoltage = race.voltage // 최신순 첫 완주
      if (race.voltage < minVoltage) minVoltage = race.voltage
      if (race.voltage > maxVoltage) maxVoltage = race.voltage
      // 계약(D3): lapTimeMissing은 **finished 회차 중** 랩타임 결측 수 — 추세 표본 결측 고지용
      if (race.lapTimeMs === undefined) lapTimeMissing += 1
    }
  }

  // DL-013: 추세 표본만 advisor 윈도우 — 지표 보유 회차의 값을 desc 그대로 수집(index 0 = 최신)
  const trendWindow = selectAdviceWindow(races)
  const lapTimesDesc: number[] = []
  const panoHzDesc: number[] = []
  for (const race of trendWindow) {
    if (race.lapTimeMs !== undefined) lapTimesDesc.push(race.lapTimeMs)
    panoHzDesc.push(race.panoHz) // panoHz는 스키마 필수 — 결측 없음
  }

  return {
    kind: resolveKind(races.length),
    finishedBand: finishedCount > 0 ? {minVoltage, maxVoltage, sampleCount: finishedCount} : null,
    lastFinishedVoltage,
    streak,
    trend: {
      lapTimeMs: resolveTrend(lapTimesDesc, 'lower'),
      panoHz: resolveTrend(panoHzDesc, 'higher'),
    },
    excluded: {resultPending, lapTimeMissing},
  }
}
