import {ANALYZE_WEIGHT_GROWTH} from '@shared/config/domain'

import type {RaceInsight, RaceRecord} from '@entities/race-record'

import type {AnalyzeRaceItem, AnalyzeRacePayload} from './analyze-race'

// 레이스 AI 분석 payload 직렬화기 (R25 U2 — api-schema race-ai §1.1, data-governance §2).
// RaceRecord[](최신순 desc) + RaceInsight → POST /api/analyze-race body 조립. 순수 함수 —
// React·fetch·저장 없음, 입력 불변, 결정론(동일 입력 → 동일 출력).
//
// ⚠️ 화이트리스트 조립 강제(data-governance §2): 항목은 **명시적 field-pick으로만** 만든다 —
// 원본 객체 spread·통과 금지. 따라서 다음 금지 필드는 구조적으로 미포함(unit test가 부재를 assert):
//   모터 name·모터 id·motorId·RaceRecord id·구글 sub·email·세션/토큰·MeasureRecord 일체·
//   자유 텍스트·advisorVoltage(DL-029)·retireReasonMeta(T1② — pathLabel·causal 등 자유 문자열은
//   전송하지 않고 서버가 api/_lib 트리 미러로 leaf key에서 재구성한다).

/** §1.1 races 전송 상한 — 초과분은 서버도 슬라이스하지만 클라가 먼저 자른다(전송 최소화) */
const ANALYZE_RACES_LIMIT = 20

/**
 * AI 분석 요청 body 조립 (§1.1) — races는 최신순(desc) 입력 그대로 재정렬 없이 앞 20건만.
 * insight는 computeRaceInsight 결과를 재계산 없이 그대로 전달한다(주입값 — 서버도 재계산 없음).
 */
export function buildAnalyzeRacePayload(
  races: ReadonlyArray<RaceRecord>,
  insight: RaceInsight,
): AnalyzeRacePayload {
  const sliced = races.slice(0, ANALYZE_RACES_LIMIT)
  const n = sliced.length

  const items: AnalyzeRaceItem[] = []
  const seenReasons = new Set<string>()
  const retireReasonKeys: string[] = []
  let excludedNoReason = 0

  for (const [j, race] of sliced.entries()) {
    // weight: assignExponentialWeights(voltage-advisor)와 **같은 형태**(rank = n-1-j, GROWTH^rank,
    // 소수 2자리 반올림, 슬라이스 내 가장 오래된 건 = 1)이되 **계수는 분석 전용**이다(R28/DL-032):
    // 추천기 계수(1.5)를 20건에 쓰면 2217:1로 벌어져 과거 기록이 무의미해지고, 이 기능의 핵심인
    // 회차 간 반복 사유 패턴 탐지가 죽는다. ANALYZE_WEIGHT_GROWTH(1.1)로 20건 ≈ 6:1을 유지한다.
    // 함수를 재사용하지 않는 근거: 그 함수는 `{...race, weight}` spread로 조립해 governance §2의
    // spread 금지를 만족할 수 없고(금지 필드가 그대로 통과), 반환 타입 VoltageAdviceRace에는
    // createdAt·retireReason이 없어 assertion 없이는 AnalyzeRaceItem으로 복귀할 수 없다.
    const weight = Math.round(ANALYZE_WEIGHT_GROWTH ** (n - 1 - j) * 100) / 100

    // 명시적 field-pick — §1.1의 8필드만. optional은 있을 때만 키를 넣는다(undefined 미전송).
    const item: AnalyzeRaceItem = {
      voltage: race.voltage,
      panoHz: race.panoHz,
      createdAt: race.createdAt,
      weight,
    }
    if (race.result !== undefined) item.result = race.result
    if (race.lapTimeMs !== undefined) item.lapTimeMs = race.lapTimeMs
    if (race.goal !== undefined) item.goal = race.goal
    if (race.retireReason !== undefined) item.retireReason = race.retireReason
    items.push(item)

    // retireReasonKeys: 슬라이스에 **실제 등장한** leaf key만 등장 순서로 중복 제거(§1.1 ★)
    if (race.retireReason !== undefined && !seenReasons.has(race.retireReason)) {
      seenReasons.add(race.retireReason)
      retireReasonKeys.push(race.retireReason)
    }
    // excludedNoReason: 슬라이스 범위의 사유 미입력 retired 건수(정수 ≥0) — REQ-RAI-003 표기 근거
    if (race.result === 'retired' && race.retireReason === undefined) excludedNoReason += 1
  }

  return {races: items, insight, retireReasonKeys, excludedNoReason}
}
