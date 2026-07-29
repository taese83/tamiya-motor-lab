import {RACE_GOAL_LABELS, RACE_RESULT_LABELS, VOLTAGE_ADVICE_RANGE} from '@shared/config/domain'

import type {RaceGoal} from '@shared/config/domain'

// 전압 추천 휴리스틱 (v2.31 / v2.33 상관 학습) — 순수 함수. 하이브리드 추천기의 폴백/기준선이자
// LLM 경로(api/recommend-voltage)가 실패·오프라인·키없음일 때의 보증 경로다.
//
// v2.33: 이 모터의 **레이스 기록에서 파노↔전압 상관을 학습**한다(측정 기록엔 전압이 없어 유일한
// (전압,파노) 표본은 레이스뿐). 각 레이스 = (전압 Vᵢ, 파노 Pᵢ). 현재(재)측정 파노 P에 대해:
//   - 0건: 목표 기준값
//   - 1건: 비례 추정 V = (V₁/P₁)·P (원점 통과 — 파노 0이면 전압 0의 물리 근사)
//   - 2건+: 최소제곱 선형적합 V ≈ a·P + b 를 데이터에서 학습(방향·절편 포함)해 P에서 평가
// 그 위에 목표 보정(속도 +, 완주 −)과 이탈 회피(비슷한 파노에서 이탈했던 전압 이상 회피)를 얹고
// 0.1~9.9로 클램프한다. 파노가 바뀌면 이 함수를 새 파노로 다시 부르면 그에 맞게 재추천된다.

/** 추천 입력에 필요한 과거 레이스 최소 형태(엔티티 RaceRecord의 부분집합) */
export interface VoltageAdviceRace {
  voltage: number
  /** v2.31 옵션 — 결과 미정(레이스 전 세팅 기록)이면 이탈 회피 대상에서 제외 */
  result?: 'finished' | 'retired' | undefined
  panoHz: number
  goal?: RaceGoal | undefined
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

/** 파노 P에서의 전압을 이력으로 학습해 추정 — 1건=비례, 2건+=선형적합(퇴화 시 평균) */
function fitVoltageForPano(
  pts: ReadonlyArray<VoltageAdviceRace>,
  panoHz: number,
): {voltage: number; reason: string} {
  if (pts.length === 1) {
    const {voltage, panoHz: p0} = pts[0]!
    return {voltage: (voltage / p0) * panoHz, reason: '파노 비례 추정'}
  }
  const n = pts.length
  let sP = 0
  let sV = 0
  let sPP = 0
  let sPV = 0
  for (const {voltage, panoHz: p} of pts) {
    sP += p
    sV += voltage
    sPP += p * p
    sPV += p * voltage
  }
  const mean = sV / n
  const denom = n * sPP - sP * sP
  if (Math.abs(denom) < 1e-6) return {voltage: mean, reason: '이력 평균(파노 동일)'}
  const a = (n * sPV - sP * sV) / denom
  const b = (sV - a * sP) / n
  const est = a * panoHz + b
  if (!Number.isFinite(est) || est <= 0) return {voltage: mean, reason: '이력 평균'}
  return {voltage: est, reason: '파노-전압 추세선'}
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
