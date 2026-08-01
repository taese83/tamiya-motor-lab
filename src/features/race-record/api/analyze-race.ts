import {z} from 'zod'

import type {RaceInsight, RaceRecord} from '@entities/race-record'

// 레이스 AI 분석 어댑터 (R25 U1 — api-schema race-ai §1.2·§1.3·§3, 계약 원본).
// POST /api/analyze-race 응답을 zod로 검증하고 typed 결과로 반환한다.
//
// ⚠️ recommend-voltage와 폴백 정책이 다르다(REQ-RAI-005): 실패 시 **휴리스틱·기본값
// 대체 생성 금지** — 분석은 "근거 없으면 침묵"이 계약이라, 클라가 지어낸 요약을
// 진짜 분석처럼 보여주면 신뢰 경계가 무너진다. 모든 실패는 unavailable로 표면화하고
// R22 결정론 카드(RaceInsightCard)는 불변 유지, 자동 재시도 없음.

// ─── 요청 payload 타입 (직렬화 구현은 U2 담당 — 여기선 계약 타입만) ───

/**
 * 전송 허용 8필드(data-governance §2 화이트리스트) + weight.
 * Pick으로 엔티티에 묶어 drift를 막는다 — id·motorId 등 금지 필드는 구조적으로 제외.
 */
export type AnalyzeRaceItem = Pick<
  RaceRecord,
  'voltage' | 'panoHz' | 'result' | 'lapTimeMs' | 'goal' | 'retireReason' | 'createdAt'
> & {weight: number}

export interface AnalyzeRacePayload {
  /** ≤20건·최신순 (초과분은 서버가 슬라이스) */
  races: AnalyzeRaceItem[]
  /** computeRaceInsight 결과 그대로 — 주입값, 서버 재계산 없음 */
  insight: RaceInsight
  /** 등장한 이탈 사유 leaf key만 — 서버가 트리 미러로 메타 재구성(T1②) */
  retireReasonKeys: string[]
  /** 사유 미입력 retired 건수 (정수 ≥0) */
  excludedNoReason: number
}

// ─── 응답 zod 스키마 (api-schema §1.2 — 서버 JS 검증의 클라측 미러 drift 최종 방어) ───

// 길이 상한은 서버·클라 공통 계약 상수 — summary·reason ≤200자, citedRaces 정수 0~20
const summarySchema = z.string().min(1).max(200)
const citedRacesSchema = z.number().int().min(0).max(20)

const citedSectionSchema = z.object({summary: summarySchema, citedRaces: citedRacesSchema})
const plainSectionSchema = z.object({summary: summarySchema})

// 근거 없는 섹션은 키 생략(침묵 원칙) — 단 전부 생략이면 빈 분석이므로 최소 1개 요구
const sectionsSchema = z
  .object({
    diagnosis: citedSectionSchema.optional(),
    anomaly: citedSectionSchema.optional(),
    briefing: plainSectionSchema.optional(),
    nextRace: plainSectionSchema.optional(),
  })
  .refine(
    s =>
      s.diagnosis !== undefined ||
      s.anomaly !== undefined ||
      s.briefing !== undefined ||
      s.nextRace !== undefined,
    '섹션이 최소 1개 필요합니다',
  )

// evidence는 서버가 payload 값으로 덮어쓴 것(F2) — 클라는 형태만 검증
const evidenceSchema = z.object({
  racesUsed: z.number().int().min(0),
  excludedNoReason: z.number().int().min(0),
})

export const raceAnalysisSchema = z.discriminatedUnion('verdict', [
  z.object({verdict: z.literal('ok'), sections: sectionsSchema, evidence: evidenceSchema}),
  // 판단 불가는 2xx 정상 응답(REQ-AI-003) — 에러가 아니다
  z.object({verdict: z.literal('insufficient'), reason: summarySchema, evidence: evidenceSchema}),
])

export type RaceAnalysis = z.infer<typeof raceAnalysisSchema>
export type RaceAnalysisOk = Extract<RaceAnalysis, {verdict: 'ok'}>
export type AnalysisEvidence = z.infer<typeof evidenceSchema>

// ─── 어댑터 결과 계약 (api-schema §3) ───

export type AnalyzeUnavailableReason =
  | 'unauthenticated'
  | 'forbidden'
  | 'ai_disabled'
  | 'rate_limited'
  | 'invalid_response'
  | 'upstream'
  | 'timeout'
  | 'cancelled'

export type AnalyzeRaceResult =
  | {status: 'ok'; data: RaceAnalysis}
  | {status: 'unavailable'; reason: AnalyzeUnavailableReason}

const REQUEST_TIMEOUT_MS = 10_000

/**
 * AI 분석 요청 — 상태 매핑(§1.3): 401→unauthenticated · 403→forbidden · 503→ai_disabled ·
 * 429→rate_limited · 200+safeParse 실패→invalid_response · 그 외(400/405/500/502/네트워크)→upstream.
 * `verdict:'insufficient'`도 status:'ok'로 반환한다(서버의 정상 판단 — U5가 중립 톤 표시).
 */
export async function analyzeRace(
  payload: AnalyzeRacePayload,
  signal?: AbortSignal,
): Promise<AnalyzeRaceResult> {
  try {
    const res = await fetch('/api/analyze-race', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(payload),
      signal: AbortSignal.any([
        AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ...(signal ? [signal] : []),
      ]),
    })
    if (res.status === 401) return {status: 'unavailable', reason: 'unauthenticated'}
    if (res.status === 403) return {status: 'unavailable', reason: 'forbidden'}
    if (res.status === 503) return {status: 'unavailable', reason: 'ai_disabled'}
    if (res.status === 429) return {status: 'unavailable', reason: 'rate_limited'}
    if (!res.ok) return {status: 'unavailable', reason: 'upstream'}
    // 200인데 JSON조차 아니면(로컬 정적 서버의 SPA index.html 등) 비정상 응답으로 수렴
    const body: unknown = await res.json().catch(() => undefined)
    const parsed = raceAnalysisSchema.safeParse(body)
    return parsed.success
      ? {status: 'ok', data: parsed.data}
      : {status: 'unavailable', reason: 'invalid_response'}
  } catch (error) {
    // AbortError 구분: 사용자 signal이 abort된 상태면 cancelled(훅이 대기 복귀),
    // abort 계열인데 사용자 signal이 아니면 남는 원인은 timeout signal뿐 → timeout,
    // abort가 아닌 예외는 네트워크 실패(fetch TypeError 등) → upstream(§1.3).
    if (signal?.aborted) return {status: 'unavailable', reason: 'cancelled'}
    if (
      error instanceof DOMException &&
      (error.name === 'AbortError' || error.name === 'TimeoutError')
    ) {
      return {status: 'unavailable', reason: 'timeout'}
    }
    return {status: 'unavailable', reason: 'upstream'}
  }
}
