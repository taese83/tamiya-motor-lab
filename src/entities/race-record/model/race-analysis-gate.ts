import type {RaceInsight} from './race-insight'
import type {RaceRecord} from './types'

// 레이스 AI 분석 근거 부족 게이트 (R25 U3 — REQ-RAI-004).
// 클라이언트 결정론 게이트가 **호출 자체를 차단**한다: empty/insufficient(3건 미만)이거나
// 이탈이 있는데 전부 사유 없음이면 버튼 비활성 + 사유 문구(비용·환각 동시 방어).
// 서버측 "판단 불가"(verdict:'insufficient' 2xx)는 별개 채널(REQ-AI-003) — 여기서 다루지 않는다.
// 순수 selector — 저장·IO·React 없음, 입력 불변, O(n), 결정론. entities 계층이라 도메인 타입만
// 사용한다(features import 금지 — FSD 단방향).

/** 차단 사유 — UI가 사유별 비활성 문구를 매핑한다(문구 소유는 UI) */
export type RaceAnalysisGateReason = 'empty' | 'insufficient' | 'no_retire_reasons'

export type RaceAnalysisGate =
  | {eligible: true}
  | {eligible: false; reason: RaceAnalysisGateReason}

/**
 * AI 분석 호출 가능 여부 판정 (REQ-RAI-004) — races는 최신순(desc) 입력 그대로, insight는
 * computeRaceInsight 결과를 그대로 받는다(건수 경계 재계산 금지 — R22 카드와 판정 일치).
 * 규칙: kind empty → 'empty' · kind insufficient → 'insufficient' ·
 * retired ≥1건인데 전부 retireReason 없음 → 'no_retire_reasons' · 그 외 eligible.
 */
export function selectRaceAnalysisGate(
  races: ReadonlyArray<RaceRecord>,
  insight: RaceInsight,
): RaceAnalysisGate {
  if (insight.kind === 'empty') return {eligible: false, reason: 'empty'}
  if (insight.kind === 'insufficient') return {eligible: false, reason: 'insufficient'}

  // 사유 있는 retired를 하나라도 찾으면 남은 차단 사유가 없으므로 조기 확정(상한 O(n) 1-pass).
  // retired 0건(전부 완주·미정)이면 진단 대상 이탈이 없을 뿐 브리핑·이상 신호는 가능 → eligible.
  let retiredCount = 0
  for (const race of races) {
    if (race.result !== 'retired') continue
    if (race.retireReason !== undefined) return {eligible: true}
    retiredCount += 1
  }
  return retiredCount > 0 ? {eligible: false, reason: 'no_retire_reasons'} : {eligible: true}
}
