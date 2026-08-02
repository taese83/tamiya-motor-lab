import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {analyzeRace} from './analyze-race'

import type {AnalyzeRacePayload, AnalyzeRaceResult, AnalyzeUnavailableReason} from './analyze-race'
import type {RaceInsight} from '@entities/race-record'

// R25 분석 어댑터 상태 매핑 (eval-plan race-ai §2 D1·D4 — api-schema §1.2·§1.3·§3).
// HTTP status→reason 매핑과 zod safeParse 이중 검증을 고정한다. 핵심 계약(REQ-RAI-005):
// 모든 실패는 unavailable로 표면화하고 **폴백 데이터를 만들지 않는다** — unavailable 결과에
// data 키 자체가 없음을 매 케이스 assert한다(휴리스틱 대체 생성 회귀 방어).

const INSIGHT: RaceInsight = {
  kind: 'ready',
  finishedBand: {minVoltage: 2.7, maxVoltage: 3.0, sampleCount: 4},
  lastFinishedVoltage: 3.0,
  lastFinishedPanoHz: 480,
  streak: ['finished', 'retired', 'finished'],
  trend: {lapTimeMs: null, panoHz: null},
  excluded: {resultPending: 0, lapTimeMissing: 0},
}

const PAYLOAD: AnalyzeRacePayload = {
  races: [],
  insight: INSIGHT,
  retireReasonKeys: [],
  excludedNoReason: 0,
}

// analyzeRace가 소비하는 Response 표면만 재현 — status·ok·json() (관례상 fetch mock 선례 없음 → stubGlobal)
function jsonResponse(status: number, body: unknown) {
  return {ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body)}
}

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

/** D4 공통 단언 — unavailable reason 일치 + 폴백 데이터 미생성(data 키 부재) */
function expectUnavailable(result: AnalyzeRaceResult, reason: AnalyzeUnavailableReason) {
  expect(result).toEqual({status: 'unavailable', reason})
  expect('data' in result).toBe(false)
}

describe('analyzeRace — HTTP 상태 매핑 (D4, api-schema §1.3)', () => {
  it.each([
    [401, 'unauthenticated'],
    [403, 'forbidden'],
    [503, 'ai_disabled'],
    [429, 'rate_limited'],
    [500, 'upstream'],
  ] as const)('HTTP %i → unavailable(%s) — 폴백 데이터 미생성', async (status, reason) => {
    fetchMock.mockResolvedValue(jsonResponse(status, {message: 'x'}))

    expectUnavailable(await analyzeRace(PAYLOAD), reason)
  })

  it('네트워크 실패(fetch reject — 오프라인) → unavailable(upstream)', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    expectUnavailable(await analyzeRace(PAYLOAD), 'upstream')
  })
})

describe('analyzeRace — 200 응답 zod 이중 검증 (D1, api-schema §1.2)', () => {
  it('정상 스키마 → status ok, 파싱된 data 그대로 반환 + POST /api/analyze-race 1회', async () => {
    const body = {
      verdict: 'ok',
      sections: {
        diagnosis: {summary: '코너 이탈이 반복돼요', citedRaces: 3},
        nextRace: {summary: '전압을 0.1 V 낮춰보세요'},
      },
      evidence: {racesUsed: 5, excludedNoReason: 1},
    }
    fetchMock.mockResolvedValue(jsonResponse(200, body))

    const result = await analyzeRace(PAYLOAD)

    expect(result).toEqual({status: 'ok', data: body})
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      '/api/analyze-race',
      expect.objectContaining({method: 'POST'}),
    )
  })

  it("verdict:'insufficient'(서버의 정상 판단 2xx)도 status ok — 에러가 아니다 (REQ-AI-003)", async () => {
    const body = {
      verdict: 'insufficient',
      reason: '유효 표본이 적어요',
      evidence: {racesUsed: 2, excludedNoReason: 0},
    }
    fetchMock.mockResolvedValue(jsonResponse(200, body))

    expect(await analyzeRace(PAYLOAD)).toEqual({status: 'ok', data: body})
  })

  it('200 + 산문(스키마 위반) → unavailable(invalid_response) — 성공 위장 차단', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, '전압을 올려보면 좋을 것 같아요'))

    expectUnavailable(await analyzeRace(PAYLOAD), 'invalid_response')
  })

  it('200 + summary 길이 초과(>200자) → unavailable(invalid_response)', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        verdict: 'ok',
        sections: {briefing: {summary: '가'.repeat(201)}},
        evidence: {racesUsed: 5, excludedNoReason: 0},
      }),
    )

    expectUnavailable(await analyzeRace(PAYLOAD), 'invalid_response')
  })
})
