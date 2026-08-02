import {
  RACE_GOAL_LABELS,
  RACE_RESULT_LABELS,
  RACE_WEIGHT_GROWTH,
  VOLTAGE_ADVICE_RANGE,
} from '@shared/config/domain'

import type {RaceGoal} from '@shared/config/domain'

// 전압 추천 휴리스틱 (v2.31 / v2.33 상관 학습) — 순수 함수. 하이브리드 추천기의 폴백/기준선이자
// LLM 경로(api/recommend-voltage)가 실패·오프라인·키없음일 때의 보증 경로다.
//
// R31(DL-040) — **속도 유지(speed-holding) 모델**. v2.33의 "파노↔전압 상관 학습"(V≈aP+b, 1건은
// 순수 비례)은 인과 방향이 뒤집혀 있었다: 전압을 올리면 파노가 오르는 건 맞지만, 여기서 P는
// "만들 결과"가 아니라 **레이스 전에 이미 측정된 모터 상태**다. 모터가 좋아져 파노가 올랐다면
// 같은 전압에서 이미 더 빠르므로, 전압을 따라 올리면 과속이 가중된다(사용자 관찰: 안정 목표인데
// 파노 300→320에서 3.00→3.20V로 상승). 안정 목표는 GOAL_DELTA가 0이라 상쇄 장치도 없었다.
//
// 새 모델: 속도 지표 **S = panoHz × voltage**(모터 강도 × 공급 전압 ≈ 주행 속도의 1차 근사)를
// 이력에서 학습하고, 현재 파노 P에서 V = S/P로 역산한다.
//   - 0건: 목표 기준값(NEUTRAL_BASE)
//   - 1건+: S_target = 가중 평균(Σw·PᵢVᵢ / Σw) → V = S_target / P
//   - 표본은 **완주 기록 우선**(이탈 기록의 S는 과속 영역이라 상향 편향). 완주 0건이면 전체 폴백.
// 결과: 파노 동일 → 직전 전압 유지, 파노 상승 → 전압 하락(속도 유지), 파노 하락 → 전압 상승.
// 그 위에 목표 보정(속도 +, 완주 −)과 이탈 회피(비슷한 파노에서 이탈했던 전압 이상 회피)를 얹고
// 권장 대역으로 클램프한다.

/** 추천 입력에 필요한 과거 레이스 최소 형태(엔티티 RaceRecord의 부분집합) */
export interface VoltageAdviceRace {
  voltage: number
  /** v2.31 옵션 — 결과 미정(레이스 전 세팅 기록)이면 이탈 회피 대상에서 제외 */
  result?: 'finished' | 'retired' | undefined
  panoHz: number
  goal?: RaceGoal | undefined
  /** v2.37 랩타임(ms) — LLM 프롬프트 참고 신호(완주+빠른 랩 전압대 선호). 휴리스틱은 미사용 */
  lapTimeMs?: number | undefined
  /** v2.37 분석 중요도 — 가장 오래된=1, 최근일수록 지수적으로 큼. 없으면 1(등가중)로 취급 */
  weight?: number | undefined
}

/**
 * v2.37 — 지수 가중치 부여. history는 **최신순(newest-first)** 입력을 가정하고, 가장 오래된 항목이
 * weight 1, 최근일수록 GROWTH^rank로 커진다(rank: 오래된 0 → 최근 n-1). 원본 불변(새 배열 반환).
 * 추천 payload(LLM·휴리스틱 공통)에 붙여 최근 기록을 더 크게 반영한다.
 */
export function assignExponentialWeights(
  historyNewestFirst: ReadonlyArray<VoltageAdviceRace>,
  growth: number = RACE_WEIGHT_GROWTH,
): VoltageAdviceRace[] {
  const n = historyNewestFirst.length
  return historyNewestFirst.map((race, j) => {
    const rankFromOldest = n - 1 - j // 최신순 배열의 index j → 오래된 기준 rank
    const weight = Math.round(growth ** rankFromOldest * 100) / 100
    return {...race, weight}
  })
}

export interface VoltageAdviceInput {
  goal: RaceGoal
  /** 현재 모터의 최신(재)측정 파노(Hz) */
  currentPanoHz: number
  /** 최신순 정렬된 과거 레이스(가장 최근이 [0]) — 빈 배열 허용(첫 기록) */
  history: ReadonlyArray<VoltageAdviceRace>
}

export interface VoltageAdvice {
  /** 0.1~9.9, 소수 1자리 */
  voltage: number
  /** 사람이 읽는 근거(한국어) */
  rationale: string
  /** 산출 출처 — 'ai'(LLM) / 'heuristic'(규칙식 폴백) */
  source: 'ai' | 'heuristic'
}

/** 과거 기록 없을 때 중립 기준선(안정 위치) — 목표 보정으로 완주 2.6 / 안정 2.9 / 속도 3.2 */
const NEUTRAL_BASE = 2.9
/** 학습된 기준선에 더하는 목표별 보정 — 권장 대역 2.6~3.2 폭에 맞춤 */
const GOAL_DELTA: Record<RaceGoal, number> = {finish: -0.3, stability: 0, speed: 0.3}
/** 이탈 회피 판정 — 현재 파노와 이 비율 이내의 과거 이탈 레이스를 "비슷한 조건"으로 본다 */
const RETIRED_PANO_TOLERANCE = 0.15

/** 0.02 step으로 반올림 후 권장 대역(2.6~3.2)으로 클램프 — 추천값 전용(입력 허용 대역과 별개) */
export function clampVoltage(v: number): number {
  if (!Number.isFinite(v)) return VOLTAGE_ADVICE_RANGE.min
  // step 0.02 반올림 → 부동소수 잔차 제거(소수 2자리로 고정)
  const stepped = Math.round(Math.round(v / VOLTAGE_ADVICE_RANGE.step) * VOLTAGE_ADVICE_RANGE.step * 100) / 100
  return Math.min(VOLTAGE_ADVICE_RANGE.max, Math.max(VOLTAGE_ADVICE_RANGE.min, stepped))
}

/**
 * R31 — 속도 유지 역산. 이력에서 속도 지표 S = panoHz × voltage의 **가중 평균**을 학습하고
 * 현재 파노 P에서 V = S/P로 되돌린다(weight는 최근일수록 큼, 없으면 1=등가중).
 * 표본은 **완주 기록 우선** — 이탈 기록의 S는 과속 영역이라 목표 속도를 위로 끌어올린다.
 * 완주가 하나도 없으면 전체 기록으로 폴백하되 근거 문구로 그 사실을 밝힌다.
 */
function fitVoltageForPano(
  pts: ReadonlyArray<VoltageAdviceRace>,
  panoHz: number,
): {voltage: number; reason: string} {
  const finished = pts.filter(r => r.result === 'finished')
  const sample = finished.length > 0 ? finished : pts
  const sampleLabel = finished.length > 0 ? '완주 기록' : '전체 기록(완주 없음)'

  // 가중 평균 속도 지표 S̄ = Σw·(Pᵢ·Vᵢ) / Σw
  let sW = 0
  let sS = 0
  for (const {voltage, panoHz: p, weight} of sample) {
    const w = weight ?? 1
    sW += w
    sS += w * p * voltage
  }
  if (sW <= 0 || sS <= 0) return {voltage: NEUTRAL_BASE, reason: '표본 없음'}
  const targetSpeed = sS / sW
  const est = targetSpeed / panoHz
  if (!Number.isFinite(est) || est <= 0) return {voltage: NEUTRAL_BASE, reason: '역산 불가'}
  return {voltage: est, reason: `${sampleLabel} 속도 유지`}
}

/** 현재 파노와 비슷한 조건에서 이탈했던 최소 전압 — 그 이상은 회피(과속 재현 방지) */
function retiredVoltageCap(pts: ReadonlyArray<VoltageAdviceRace>, panoHz: number): number | null {
  let cap: number | null = null
  for (const r of pts) {
    if (r.result !== 'retired' || r.panoHz <= 0) continue
    if (Math.abs(r.panoHz - panoHz) / panoHz > RETIRED_PANO_TOLERANCE) continue
    cap = cap === null ? r.voltage : Math.min(cap, r.voltage)
  }
  return cap
}

export function recommendVoltageHeuristic({
  goal,
  currentPanoHz,
  history,
}: VoltageAdviceInput): VoltageAdvice {
  const reasons: string[] = []
  // panoHz 양수 표본만 상관 학습에 사용(스키마상 항상 양수지만 방어)
  const pts = history.filter(r => r.panoHz > 0)
  const pano = currentPanoHz > 0 ? currentPanoHz : (pts[0]?.panoHz ?? 0)

  // 기준선 — 이력 있으면 파노↔전압 상관으로 학습, 없으면 중립값
  let baseV: number
  if (pts.length === 0 || pano <= 0) {
    baseV = NEUTRAL_BASE
    reasons.push(pts.length === 0 ? '과거 기록 없음' : '파노 없음')
  } else {
    const fit = fitVoltageForPano(pts, pano)
    baseV = fit.voltage
    reasons.push(`파노 ${Math.round(pano)}Hz`, fit.reason)
  }

  // 목표 보정 + 속도 상한 다운그레이드 — 속도가 권장 상한(3.2V)을 넘겨야 하면 안정으로 낮춘다
  // (풀충 배터리로도 ~3.2V가 한계·배터리 부담이라 무리한 속도 대신 안정을 권장).
  let v = baseV + GOAL_DELTA[goal]
  if (goal === 'speed' && v > VOLTAGE_ADVICE_RANGE.max) {
    v = baseV + GOAL_DELTA.stability
    reasons.push(`속도 상한 ${VOLTAGE_ADVICE_RANGE.max}V 초과 → 안정 권장`)
  } else {
    reasons.push(`${RACE_GOAL_LABELS[goal]} 목표`)
  }

  // 이탈 회피 — 비슷한 파노에서 이탈했던 전압 이상 회피(한 스텝 아래로)
  const cap = retiredVoltageCap(pts, pano)
  if (cap !== null && v >= cap) {
    v = cap - VOLTAGE_ADVICE_RANGE.step
    reasons.push(`${RACE_RESULT_LABELS.retired} 회피(<${cap.toFixed(2)}V)`)
  }

  const voltage = clampVoltage(v)
  return {voltage, source: 'heuristic', rationale: `${reasons.join(' · ')} → ${voltage.toFixed(2)}V`}
}
