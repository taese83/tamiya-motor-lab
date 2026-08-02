import type {RaceGoal} from '@shared/config/domain'
import {resolveSpeedRelated} from '@shared/config/domain'
import type {RaceInsight} from './race-insight'
import type {RaceRecord} from './types'

// 레이스 목표 추천 selector (R30 race-autofill U1 — REQ-AF-001·002, DL-036·037).
// RaceRecord[] + RaceInsight → {goal, rationale} | null 순수 함수 — 저장·IO·React 없음.
// 입력은 listRaceRecordsByMotor 결과 그대로의 **최신순(desc)** — 재정렬 금지, O(n), 결정론.
// streak·trend는 insight에서 그대로 읽는다(재계산 금지 — race-analysis-gate와 동형 계약).
// 근거 카피는 UI 소유(RaceGoalSheet) — selector는 rationale 코드만 반환한다(gate 선례).

/** 추천 근거 코드 — UI가 코드→카피를 매핑한다(문구 소유는 UI) */
export type GoalRecommendRationale =
  | 'retired_streak' // R1 → finish
  | 'retired_speed_related' // R2 → stability
  | 'finished_streak' // R3 → speed (trend null은 "악화 신호 없음" 취급)
  | 'finished_worsening' // R4 → stability

// 임계 근거 (requirements §핵심 산출 1 — 새 경계 발명 금지):
// 보수 전환 N=2 — 1회는 단발 노이즈, 2연속이 "반복" 관찰 최소 표본이며 3연속 대기는
// 트랙사이드 3판 낭비. 공격 전환 N=3 — 오추천 비용 비대칭(잘못된 speed 추천은 이탈 유발)
// → 보수보다 높은 문턱, 기존 3건 경계(INSIGHT_READY_MIN·TREND_MIN_SAMPLES)와 정렬.
const RETIRED_STREAK_MIN = 2
const FINISHED_STREAK_MIN = 3

/**
 * 목표 추천 판정 (규칙 R1~R5 — 우선순위순 첫 매치, streak는 최신순·미정 제외).
 * null = 침묵: kind≠ready · streak<3 · R2'(비속도·사유 없음 1회 이탈) · R5(혼조).
 * 침묵 임계는 기존 경계 재사용(INSIGHT_READY_MIN=3은 미정 포함 계수라 streak.length<3
 * 병행 조건이 미정 혼재의 빈틈을 막는다 — plan-review 특별 점검 ③).
 */
export function selectGoalRecommendation(
  races: ReadonlyArray<RaceRecord>,
  insight: RaceInsight,
): {goal: RaceGoal; rationale: GoalRecommendRationale} | null {
  // 침묵 선행 — 전체 3건 미만이거나 확정 결과가 3건 미만이면 판단하지 않는다(R22 침묵 원칙 계승)
  if (insight.kind !== 'ready' || insight.streak.length < 3) return null

  const streak = insight.streak

  // R1: 2연속 이탈 → 완주 우선 (보수 전환 N=RETIRED_STREAK_MIN)
  if (streak.slice(0, RETIRED_STREAK_MIN).every(r => r === 'retired')) {
    return {goal: 'finish', rationale: 'retired_streak'}
  }

  // R2·R2': 최신 이탈 1회 — 사유의 speedRelated로 분기.
  // ⚠️ "최신 이탈 회차"는 races[0]이 아니라 **result가 확정된 첫 회차**를 찾는다 —
  // result 미정 회차가 더 최신일 수 있고, streak[0]과 동일 개체여야 판정이 일치한다
  // (plan-review 구현 정밀도 지적: computeRaceInsight의 streak도 미정을 건너뛰고 수집).
  if (streak[0] === 'retired') {
    const latestResolved = races.find(r => r.result !== undefined)
    if (latestResolved?.retireReason !== undefined && resolveSpeedRelated(latestResolved.retireReason)) {
      return {goal: 'stability', rationale: 'retired_speed_related'}
    }
    // R2': 사유 없음·speedRelated=false → 침묵(기계·미상 원인은 체크리스트 담당 — 목표 변경 근거 아님)
    return null
  }

  // R3·R4: 3연속 완주 (공격 전환 N=FINISHED_STREAK_MIN) — trend.lapTimeMs로 분기.
  if (streak.slice(0, FINISHED_STREAK_MIN).every(r => r === 'finished')) {
    // R4: 랩타임 추세 악화 → 안정 권장
    if (insight.trend.lapTimeMs === 'worsening') {
      return {goal: 'stability', rationale: 'finished_worsening'}
    }
    // R3: 추세 양호 — null은 "악화 신호 없음"으로 허용(lapTime 미기록 사용자 배제 금지)
    return {goal: 'speed', rationale: 'finished_streak'}
  }

  // R5: 그 외(혼조) → 침묵 — 판단하지 않는다
  return null
}
