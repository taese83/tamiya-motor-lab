import {z} from 'zod'

import {clampVoltage, recommendVoltageHeuristic} from '@shared/lib/voltage-advisor'

import type {VoltageAdvice, VoltageAdviceInput} from '@shared/lib/voltage-advisor'

// 전압 추천 서비스 (v2.31 — 하이브리드). 주 경로: 서버리스 /api/recommend-voltage(LLM, Haiku).
// 실패·오프라인·키없음·비정상 응답이면 **휴리스틱 폴백**(무음 실패 금지 — 항상 값+근거 반환).
// 로컬 정적 서버에는 서버리스 함수가 없어 fetch가 SPA index.html을 받으므로 JSON 파싱 실패 →
// 자연히 휴리스틱으로 폴백된다(로컬은 항상 휴리스틱, 실제 AI는 Vercel 키 설정 후 활성).

/** 서버 응답 계약 — 신뢰 경계: 임의 출력을 zod로 검증하고 전압은 클라에서도 재클램프한다 */
const aiAdviceSchema = z.object({
  voltage: z.number(),
  rationale: z.string().min(1),
})

const REQUEST_TIMEOUT_MS = 6000

// R35 — 방향 안전장치 허용오차(0.06V=3스텝). LLM이 완주·안정에서 속도 유지 기준(같은 goal 휴리스틱)보다
// 이만큼 넘게 높이면 파노↑→전압↓ 원칙 위반으로 보고 휴리스틱으로 폴백한다. 미세한 LLM 조정은 허용.
const DIRECTION_TOLERANCE_V = 0.06

export async function recommendVoltage(input: VoltageAdviceInput): Promise<VoltageAdvice> {
  try {
    const res = await fetch('/api/recommend-voltage', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (res.ok) {
      const parsed = aiAdviceSchema.safeParse(await res.json())
      if (parsed.success) {
        // 서버가 이미 클램프하지만 신뢰 경계에서 한 번 더 방어(LLM 출력 우회 금지)
        const voltage = clampVoltage(parsed.data.voltage)
        // R35 방향 방어: 완주·안정 목표에서 LLM이 파노↑→전압↓ 원칙을 어기고 속도 유지 기준보다 크게
        // 높은 전압을 주면(작은 모델이 "파노 높음=고전압" 직관으로 회귀하는 실패), LLM 결과를 버리고
        // 결정론적 휴리스틱으로 폴백한다 — 전압·근거 일관 유지. speed는 높음이 목표라 예외.
        if (input.goal !== 'speed') {
          const fallback = recommendVoltageHeuristic(input)
          if (voltage > fallback.voltage + DIRECTION_TOLERANCE_V) return fallback
        }
        return {voltage, rationale: parsed.data.rationale, source: 'ai'}
      }
    }
  } catch {
    // 네트워크·타임아웃·JSON 파싱 실패 — 폴백으로 수렴(오류를 사용자에게 전가하지 않는다)
  }
  return recommendVoltageHeuristic(input)
}
