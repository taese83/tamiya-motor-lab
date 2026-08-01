// Vercel 서버리스 (R25 U4) — 레이스 AI 분석 LLM 프록시. POST /api/analyze-race.
// 계약 canonical: _workspace/02_design/race-ai/api-schema.md §1 — 이 파일은 JS 수동 미러,
// zod 원본은 클라 U1(analyze-race.ts). api/(JS)↔src/(TS) 코드 미공유(이중 방어 목적).
// 구조·JSON 파싱·5xx 정책은 recommend-voltage.js 선례 승계. 단 **폴백 없음** — 추천과 달리
// 분석은 등가 대체물이 없어 폴백을 만들면 성공 위장이 된다(ai-architecture §4, REQ-RAI-005).
// 처리 순서(= 비용 발생 전 차단 순서, cost-latency-budget §4): 405 → requireAllowedSession
// (401/403/503) → body 크기 32KB(400) → 필드 allowlist 검증(400)·races 앞 20 슬라이스
// → rate limit(429) → 키 확인(500) → Anthropic 1회 → 구조 검증(502) → 전압 패턴 스캔(502)
// → evidence 덮어쓰기 → 200.
// ⚠️ 무로깅 계약(threat-model T4, ai-architecture §5): 프롬프트 본문·모델 응답 원문(aiText·
// parsed)은 어떤 경로로도 console 출력 금지 — Vercel 로그 잔존 표면. 로그는 결과·사유 코드·
// 지연 ms·usage 토큰 수·racesUsed 등 구조화 스칼라 1줄만.
import {requireAllowedSession} from './_lib/authGuard.js'
import {RETIRE_REASON_LEAF_KEYS, resolveRetireReasonMeta} from './_lib/retire-reason-tree.js'

const MODEL = 'claude-haiku-4-5-20251001' // recommend-voltage와 동일 Haiku 4.5
const MAX_TOKENS = 800 // cost-latency-budget §1 확정 — 4섹션+insufficient 여유. truncation 실측 시 1024 escape hatch

const BODY_MAX_BYTES = 32 * 1024 // 거대 payload의 입력 토큰 증폭 차단(T2④)
const RACES_MAX = 20 // U2 클라 컷과 이중 — 서버는 초과분을 400이 아니라 슬라이스
const SUMMARY_MAX = 200 // 계약 상수 — 클라 zod와 동일(api-schema §1.2)
const CITED_RACES_MAX = 20

// 입력 enum·범위 — domain.ts 수동 미러(api/↔src/ 코드 미공유. 값 변경 시 양쪽 갱신)
const RACE_RESULTS = ['finished', 'retired']
const GOALS = ['finish', 'stability', 'speed']
const INSIGHT_KINDS = ['empty', 'insufficient', 'ready']
const TREND_DIRS = ['improving', 'steady', 'worsening', null]
const VOLTAGE_MIN = 0.1 // 입력 허용 대역(domain VOLTAGE_RANGE) — 추천 대역(2.6~3.2)과 별개
const VOLTAGE_MAX = 9.9
const PANO_HZ_MAX = 2000 // domain 재수화 상한과 정렬
const LAP_TIME_MAX_MS = 3_600_000
const STREAK_MAX = 5
const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

// DL-029 결정론 집행(T3③) — 직렬화된 응답 전체에서 전압 수치 패턴 검출 시 502 **거부**
// (클램프·수정 아님 — 비전압 처방 계약)
const VOLTAGE_PATTERN = /\d[.,]?\d*\s*[vV볼]/

// best-effort in-memory rate limit — 분당 5회(cost-latency-budget §4).
// ⚠️ serverless 한계: 인스턴스 간 메모리 비공유·cold start마다 리셋되는 **soft limit**이다.
// 하드 보장이 필요하면 Neon 카운터 승격 경로로만(범위 밖 — 1인 도구 수용 위험).
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60_000
const callTimestamps = []
function isRateLimited(now) {
  while (callTimestamps.length > 0 && now - callTimestamps[0] >= RATE_LIMIT_WINDOW_MS) {
    callTimestamps.shift()
  }
  if (callTimestamps.length >= RATE_LIMIT_MAX) return true
  callTimestamps.push(now)
  return false
}

function isFinitePositive(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0
}

function isNonNegativeInt(v) {
  return Number.isInteger(v) && v >= 0
}

// races 항목 — 8필드만 pick(미지 키는 구조적 드롭 — motorId·id 등 금지 필드 전달 차단, T4),
// enum 외 값·비수치·범위 밖은 null(→400. 인젝션 fixture가 여기서 떨어진다, T1)
function sanitizeRace(item) {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) return null
  const {voltage, panoHz, result, lapTimeMs, goal, retireReason, createdAt, weight} = item
  if (
    typeof voltage !== 'number' ||
    !Number.isFinite(voltage) ||
    voltage < VOLTAGE_MIN ||
    voltage > VOLTAGE_MAX
  ) {
    return null
  }
  if (!isFinitePositive(panoHz) || panoHz > PANO_HZ_MAX) return null
  if (typeof createdAt !== 'string' || !ISO_8601_RE.test(createdAt)) return null
  if (!isFinitePositive(weight)) return null
  const out = {voltage, panoHz, createdAt, weight}
  if (result !== undefined) {
    if (!RACE_RESULTS.includes(result)) return null
    out.result = result
  }
  if (lapTimeMs !== undefined) {
    if (!Number.isInteger(lapTimeMs) || lapTimeMs <= 0 || lapTimeMs > LAP_TIME_MAX_MS) return null
    out.lapTimeMs = lapTimeMs
  }
  if (goal !== undefined) {
    if (!GOALS.includes(goal)) return null
    out.goal = goal
  }
  if (retireReason !== undefined) {
    if (!RETIRE_REASON_LEAF_KEYS.includes(retireReason)) return null
    out.retireReason = retireReason
  }
  return out
}

// insight — race-insight.ts(RaceInsight) 형태 검증. 주입값이므로 서버 재계산 없음(형태만 방어)
function sanitizeInsight(insight) {
  if (insight === null || typeof insight !== 'object' || Array.isArray(insight)) return null
  const {kind, finishedBand, lastFinishedVoltage, streak, trend, excluded} = insight
  if (!INSIGHT_KINDS.includes(kind)) return null
  let band = null
  if (finishedBand !== null && finishedBand !== undefined) {
    if (typeof finishedBand !== 'object' || Array.isArray(finishedBand)) return null
    const {minVoltage, maxVoltage, sampleCount} = finishedBand
    if (typeof minVoltage !== 'number' || !Number.isFinite(minVoltage)) return null
    if (typeof maxVoltage !== 'number' || !Number.isFinite(maxVoltage)) return null
    if (!isNonNegativeInt(sampleCount)) return null
    band = {minVoltage, maxVoltage, sampleCount}
  }
  if (lastFinishedVoltage !== null && lastFinishedVoltage !== undefined) {
    if (typeof lastFinishedVoltage !== 'number' || !Number.isFinite(lastFinishedVoltage)) return null
  }
  if (!Array.isArray(streak) || streak.length > STREAK_MAX) return null
  if (streak.some(entry => !RACE_RESULTS.includes(entry))) return null
  if (trend === null || typeof trend !== 'object' || Array.isArray(trend)) return null
  const lapTrend = trend.lapTimeMs ?? null
  const panoTrend = trend.panoHz ?? null
  if (!TREND_DIRS.includes(lapTrend) || !TREND_DIRS.includes(panoTrend)) return null
  if (excluded === null || typeof excluded !== 'object' || Array.isArray(excluded)) return null
  if (!isNonNegativeInt(excluded.resultPending) || !isNonNegativeInt(excluded.lapTimeMissing)) {
    return null
  }
  return {
    kind,
    finishedBand: band,
    lastFinishedVoltage: lastFinishedVoltage ?? null,
    streak: [...streak],
    trend: {lapTimeMs: lapTrend, panoHz: panoTrend},
    excluded: {resultPending: excluded.resultPending, lapTimeMissing: excluded.lapTimeMissing},
  }
}

// body → 검증된 payload | null(400). 최상위 4키만 pick — 그 외 미지 키는 드롭(400 아님,
// 전달만 차단 — api-schema §1.1). races 초과는 앞 20건 슬라이스(마찬가지로 400 아님).
function sanitizePayload(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return null
  const {races, insight, retireReasonKeys, excludedNoReason} = body

  if (!Array.isArray(races)) return null
  const sanitizedRaces = []
  for (const item of races.slice(0, RACES_MAX)) {
    const race = sanitizeRace(item)
    if (!race) return null
    sanitizedRaces.push(race)
  }

  const sanitizedInsight = sanitizeInsight(insight)
  if (!sanitizedInsight) return null

  if (!Array.isArray(retireReasonKeys)) return null
  const keySet = new Set()
  for (const key of retireReasonKeys) {
    if (!RETIRE_REASON_LEAF_KEYS.includes(key)) return null // leaf enum 외 → 400
    keySet.add(key) // 중복 제거 — enum 11종이라 자연히 ≤11
  }

  if (!isNonNegativeInt(excludedNoReason)) return null

  return {
    races: sanitizedRaces,
    insight: sanitizedInsight,
    retireReasonKeys: [...keySet],
    excludedNoReason,
  }
}

// 모델 출력 — verdict enum·sections 최소 1개·summary/reason ≤200자·citedRaces 정수 0~20.
// 허용 밖 섹션 키는 드롭, 규칙 위반은 null(→502 invalid model output). 모델 출력은 비신뢰(T3).
function sanitizeModelOutput(parsed) {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const isValidSummary = s => typeof s === 'string' && s.trim() !== '' && s.length <= SUMMARY_MAX
  if (parsed.verdict === 'insufficient') {
    if (!isValidSummary(parsed.reason)) return null
    return {verdict: 'insufficient', reason: parsed.reason}
  }
  if (parsed.verdict !== 'ok') return null
  const raw = parsed.sections
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const sections = {}
  for (const key of ['diagnosis', 'anomaly', 'briefing', 'nextRace']) {
    const section = raw[key]
    if (section === undefined) continue // 침묵 원칙 — 근거 없는 섹션은 키 생략
    if (section === null || typeof section !== 'object' || Array.isArray(section)) return null
    if (!isValidSummary(section.summary)) return null
    if (key === 'diagnosis' || key === 'anomaly') {
      if (
        !Number.isInteger(section.citedRaces) ||
        section.citedRaces < 0 ||
        section.citedRaces > CITED_RACES_MAX
      ) {
        return null
      }
      sections[key] = {summary: section.summary, citedRaces: section.citedRaces}
    } else {
      sections[key] = {summary: section.summary}
    }
  }
  if (Object.keys(sections).length === 0) return null
  return {verdict: 'ok', sections}
}

// system 프롬프트(ai-architecture §3) — 고정 문자열. 도메인 블록은 recommend-voltage 재사용.
const SYSTEM_PROMPT = [
  '역할: 너는 타미야 미니4WD 레이스 기록 분석가다. 주입된 기록(JSON)만 근거로 이탈 원인 진단·이상 신호·기록 브리핑·다음 세팅 조언을 한국어로 작성한다. 세팅을 결정하지 않는다 — 근거 인용과 해석만 한다.',
  '',
  '[도메인 지식]',
  '- panoHz는 모터 회전음의 기본 주파수(Hz)로 회전수(RPM)에 비례한다. 높을수록 빠르다.',
  '- result: finished=완주(성공), retired=이탈(대개 과속·불안정). 이탈한 전압대는 위험 신호다.',
  '- weight = 분석 중요도. 가장 오래된 기록이 1, 최근일수록 지수적으로 크다. weight가 큰(최근) 기록을 더 신뢰해 가중 추세로 판단하라.',
  '',
  '[입력 JSON]',
  '- races: 최근 레이스 최대 20건(최신순). 각 항목 { voltage, panoHz, result?, lapTimeMs?, goal?, retireReason?, createdAt, weight }',
  '- insight: 이미 계산된 결정론 요약(kind·완주 전압대 finishedBand·최근 완주 전압·결과 streak·추세 trend·제외 건수 excluded).',
  '- retireReasons: 등장한 이탈 사유 메타 [{key, pathLabel, speedRelated, causal}] — races[].retireReason의 key와 대응한다.',
  '- excludedNoReason: 사유 미입력 이탈 건수.',
  '',
  '[경계 규칙 — 반드시 준수]',
  '- 주입값을 재계산하지 마라. 언급하는 모든 수치는 races·insight에 있는 값의 인용이어야 한다.',
  '- 전압 수치는 어떤 형태로도 출력 금지(숫자+V·볼트 표기 전면 금지). 전압은 방향 어휘(낮추기/유지/높이기)로만, 수치 없이 언급한다.',
  '- speedRelated=false인 사유(파츠 이탈·멈춤 등)에는 전압 관련 조언을 하지 마라 — 전압 무관 원인이다.',
  '- 측정되지 않은 세팅(롤러·댐퍼·기어비 등)은 단정하지 말고 "~일 가능성" 수준의 어휘까지만 사용하라.',
  '- 판단 근거가 부족하면 verdict를 "insufficient"로 하고 reason에 이유를 한 문장으로 적어라.',
  '- 4섹션(diagnosis=이탈 원인 진단, anomaly=이상 신호, briefing=기록 브리핑, nextRace=다음 세팅) 중 근거가 없거나 insight 재진술뿐인 섹션은 키를 생략하라. 최소 1개 섹션은 포함한다.',
  '',
  '[출력 — JSON만, 그 외 텍스트 금지. summary·reason은 한국어 200자 이내, citedRaces는 근거로 삼은 레이스 건수(정수 0~20)]',
  '{"verdict":"ok","sections":{"diagnosis":{"summary":"…","citedRaces":3},"anomaly":{"summary":"…","citedRaces":2},"briefing":{"summary":"…"},"nextRace":{"summary":"…"}},"evidence":{"racesUsed":0,"excludedNoReason":0}}',
  '또는 {"verdict":"insufficient","reason":"…","evidence":{"racesUsed":0,"excludedNoReason":0}}',
].join('\n')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({error: 'method not allowed'})
    return
  }
  // 가드가 첫 관문 — 키 접근·업스트림 호출 **이전**에 401/403/503 판정(api-schema §0, R23 주석 승계)
  const session = await requireAllowedSession(req, res)
  if (!session) return // 401/403/503 이미 전송

  const body = req.body ?? {}
  let bodyBytes
  try {
    bodyBytes = Buffer.byteLength(JSON.stringify(body), 'utf8')
  } catch {
    res.status(400).json({error: 'invalid input'})
    return
  }
  if (bodyBytes > BODY_MAX_BYTES) {
    res.status(400).json({error: 'invalid input'})
    return
  }

  const payload = sanitizePayload(body)
  if (!payload) {
    res.status(400).json({error: 'invalid input'})
    return
  }

  if (isRateLimited(Date.now())) {
    res.status(429).json({error: 'rate_limited'})
    return
  }

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    res.status(500).json({error: 'ANTHROPIC_API_KEY not set'})
    return
  }

  // user 메시지 = 검증된 payload + 서버 재구성 메타만(W5 — 클라 자유 문자열이 프롬프트에
  // 도달하는 채널 없음). retireReasonKeys(enum key)를 트리 미러로 pathLabel·causal 복원.
  const user = JSON.stringify({
    races: payload.races,
    insight: payload.insight,
    retireReasons: resolveRetireReasonMeta(payload.retireReasonKeys),
    excludedNoReason: payload.excludedNoReason,
  })

  let aiText
  let usage = null
  let upstreamMs = 0
  const startedAt = Date.now()
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0, // 결정성 — 같은 입력 → 같은 분석(재현은 temp 0 + 로컬 fixture)
        system: SYSTEM_PROMPT,
        messages: [{role: 'user', content: user}],
      }),
    })
    upstreamMs = Date.now() - startedAt
    if (!upstream.ok) {
      // 무로깅 계약 — 상태 코드만, 업스트림 응답 본문은 싣지 않는다
      console.warn(
        JSON.stringify({
          fn: 'analyze-race',
          code: 'upstream_error',
          upstreamStatus: upstream.status,
          upstreamMs,
        }),
      )
      res.status(502).json({error: 'upstream error'})
      return
    }
    const data = await upstream.json()
    aiText = Array.isArray(data.content) ? data.content.map(block => block.text ?? '').join('') : ''
    usage = data.usage ?? null
  } catch {
    console.warn(
      JSON.stringify({
        fn: 'analyze-race',
        code: 'upstream_fetch_failed',
        upstreamMs: Date.now() - startedAt,
      }),
    )
    res.status(502).json({error: 'upstream fetch failed'})
    return
  }

  // 모델이 코드펜스 등 부가 텍스트를 붙일 수 있어 첫 {…} 블록만 파싱(선례).
  // ⚠️ aiText·parsed 원문은 로그·응답 어디에도 싣지 않는다(T4).
  let parsed = null
  try {
    const match = aiText.match(/\{[\s\S]*\}/)
    parsed = match ? JSON.parse(match[0]) : null
  } catch {
    parsed = null
  }

  const output = sanitizeModelOutput(parsed)
  if (!output) {
    console.warn(JSON.stringify({fn: 'analyze-race', code: 'invalid_structure', upstreamMs}))
    res.status(502).json({error: 'invalid model output'})
    return
  }

  // DL-029 집행 — 전압 수치 패턴 검출 시 거부(수정·클램프 금지, T3③)
  if (VOLTAGE_PATTERN.test(JSON.stringify(output))) {
    console.warn(JSON.stringify({fn: 'analyze-race', code: 'voltage_pattern_rejected', upstreamMs}))
    res.status(502).json({error: 'invalid model output'})
    return
  }

  // evidence 덮어쓰기(F2) — 모델 echo를 버리고 서버가 payload 값으로 무조건 덮어쓴다.
  // 근거 캡션의 원천을 환각 표면에서 제거 — 스키마에는 남기되 출처는 결정론이다.
  const response = {
    ...output,
    evidence: {racesUsed: payload.races.length, excludedNoReason: payload.excludedNoReason},
  }

  // 관측(ai-architecture §5) — 구조화 1줄. 프롬프트·응답 본문 없음.
  console.info(
    JSON.stringify({
      fn: 'analyze-race',
      verdict: output.verdict,
      upstreamMs,
      inputTokens: usage?.input_tokens ?? null,
      outputTokens: usage?.output_tokens ?? null,
      racesUsed: payload.races.length,
    }),
  )
  res.status(200).json(response)
}
