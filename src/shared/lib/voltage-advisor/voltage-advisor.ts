import {RACE_GOAL_LABELS, RACE_RESULT_LABELS, VOLTAGE_RANGE} from '@shared/config/domain'

import type {RaceGoal} from '@shared/config/domain'

// 전압 추천 휴리스틱 (v2.31) — 순수 함수. 하이브리드 추천기의 **폴백/기준선**이자
// LLM 경로(api/recommend-voltage)가 실패·오프라인·키없음일 때의 보증 경로다.
// 출력은 항상 VOLTAGE_RANGE(0.1~9.9, 0.1 step)로 클램프 — LLM도 서버가 같은 규칙으로 클램프한다.
//
// 설계: **직전 레이스 전압을 앵커**로 삼고(가장 강한 신호), 목표·직전 결과·파노 추세로 보정한다.
// 과거 기록이 없으면 목표 기준값에서 시작한다. 계수는 보수적으로 두고 실기기 튜닝 여지를 남긴다.

/** 추천 입력에 필요한 과거 레이스 최소 형태(엔티티 RaceRecord의 부분집합) */
export interface VoltageAdviceRace {
  voltage: number
  /** v2.31 옵션 — 결과 미정(레이스 전 세팅 기록)이면 이탈 보정 없이 중립 처리 */
  result?: 'finished' | 'retired' | undefined
  panoHz: number
  goal?: RaceGoal | undefined
}

export interface VoltageAdviceInput {
  goal: RaceGoal
  /** 현재 모터의 최신 파노(Hz) */
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

/** 과거 기록 없을 때 목표별 시작 전압(AA 2셀 명목 ~2.4~3.0V 근사 — 실기기 튜닝 대상) */
const GOAL_BASE: Record<RaceGoal, number> = {finish: 2.4, stability: 2.7, speed: 3.0}
/** 직전 전압 앵커에 더하는 목표별 보정 */
const GOAL_DELTA: Record<RaceGoal, number> = {finish: -0.2, stability: 0, speed: 0.2}
/** 직전 이탈(과속 추정) 시 하향 폭 */
const RETIRED_DROP = 0.3
/** 파노 추세 보정을 적용할 최소 변화율(노이즈 컷) */
const PANO_MIN_RATIO = 0.03

/** 0.1 step으로 반올림 후 0.1~9.9로 클램프 (부동소수 잔차 제거) */
export function clampVoltage(v: number): number {
  if (!Number.isFinite(v)) return VOLTAGE_RANGE.min
  const stepped = Math.round(v * 10) / 10
  return Math.min(VOLTAGE_RANGE.max, Math.max(VOLTAGE_RANGE.min, stepped))
}

export function recommendVoltageHeuristic({
  goal,
  currentPanoHz,
  history,
}: VoltageAdviceInput): VoltageAdvice {
  const last = history[0]
  const reasons: string[] = []
  let v: number

  if (last === undefined) {
    v = GOAL_BASE[goal]
    reasons.push('과거 기록 없음', `${RACE_GOAL_LABELS[goal]} 목표 기준값`)
  } else {
    v = last.voltage
    const lastResultLabel = last.result !== undefined ? RACE_RESULT_LABELS[last.result] : '기록'
    reasons.push(`직전 ${last.voltage.toFixed(1)}V ${lastResultLabel}`)

    // 결과 보정 — 이탈(과속 추정)은 낮춘다
    if (last.result === 'retired') {
      v -= RETIRED_DROP
      reasons.push('이탈→하향')
    }

    // 목표 보정 — 속도는 상향, 완주는 하향
    v += GOAL_DELTA[goal]
    reasons.push(`${RACE_GOAL_LABELS[goal]} 목표`)

    // 파노 추세 보정 — 모터가 빨라졌으면(파노↑) 안정·완주는 낮추고, 속도는 절반만 반영
    if (last.panoHz > 0 && currentPanoHz > 0) {
      const ratio = (currentPanoHz - last.panoHz) / last.panoHz
      if (Math.abs(ratio) >= PANO_MIN_RATIO) {
        const factor = goal === 'speed' ? 0.5 : 1
        v -= ratio * factor
        reasons.push(`파노 ${ratio > 0 ? '+' : ''}${Math.round(ratio * 100)}%`)
      }
    }
  }

  const voltage = clampVoltage(v)
  return {voltage, source: 'heuristic', rationale: `${reasons.join(' · ')} → ${voltage.toFixed(1)}V`}
}
