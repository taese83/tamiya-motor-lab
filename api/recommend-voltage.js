// Vercel 서버리스 (v2.33 Stage 2) — 레이스 전압 추천 LLM 프록시.
// 키(ANTHROPIC_API_KEY)는 **서버 전용 env**로만 읽고 클라이언트 번들엔 절대 포함되지 않는다.
// 클라이언트(features/race-record/api/recommend-voltage.ts)는 실패·비정상 응답 시 결정론적
// 휴리스틱으로 폴백하므로, 이 함수는 키 없음·업스트림 오류·잘못된 출력이면 5xx로 응답만 하면 된다
// (성공 위장 금지). 입력이 숫자+enum이라 프롬프트 인젝션 표면이 작고, 출력 전압은 여기서 클램프한다.
// 단독 사용 전제라 denial-of-wallet은 max_tokens 상한·이력 20건 컷·짧은 처리로 보수적으로 방어한다.

const VOLTAGE_MIN = 2.6 // 권장 대역 하한(입력 허용과 별개 — domain VOLTAGE_ADVICE_RANGE와 일치)
const VOLTAGE_MAX = 3.2 // 권장 대역 상한(풀충 배터리 한계·배터리 부담)
const GOALS = ['finish', 'stability', 'speed']
const MODEL = 'claude-haiku-4-5-20251001' // Haiku 4.5 — 빠르고 저렴(스칼라 추천에 충분)

const VOLTAGE_STEP = 0.02 // 추천 0.02V 단위(domain VOLTAGE_ADVICE_RANGE.step와 일치)

function clampVoltage(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  const stepped = Math.round((Math.round(v / VOLTAGE_STEP) * VOLTAGE_STEP) * 100) / 100
  return Math.min(VOLTAGE_MAX, Math.max(VOLTAGE_MIN, stepped))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({error: 'method not allowed'})
    return
  }
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    res.status(500).json({error: 'ANTHROPIC_API_KEY not set'})
    return
  }

  const body = req.body ?? {}
  const {goal, currentPanoHz, history} = body
  if (!GOALS.includes(goal) || typeof currentPanoHz !== 'number' || !Array.isArray(history)) {
    res.status(400).json({error: 'invalid input'})
    return
  }
  // 사용자 요구: 추천은 이 모터의 **이전 모든 레이스 기록**을 근거로 한다(잘라내지 않음).
  const system =
    '너는 미니카(타미야 미니4WD) 튜닝 코치다. 모터의 레이스 이력(전부)에서 파노(회전 주파수 Hz)와 ' +
    '설정 전압(V)의 상관을 학습해, 현재 파노와 목표(finish=완주 우선/stability=안정/speed=속도 우선)에 ' +
    '맞는 전압을 추천한다. 추천 전압은 반드시 2.6~3.2V 범위, 0.02V 단위로 한다 — 풀충 배터리로도 ' +
    '3.2V가 상한이고(모터 밀어넣기로 간신히 도달, 배터리에 부담) 그 이상은 불가하다. 속도(speed) ' +
    '목표라도 3.2V를 넘겨야만 더 빨라지는 상황이면 무리하지 말고 안정(stability) 수준으로 낮춰 ' +
    '추천하고 근거에 그 사실을 밝힌다. 비슷한 파노에서 이탈(retired)했던 전압 이상은 피한다. ' +
    '반드시 JSON만 출력한다: {"voltage": number, "rationale": "한국어 한 줄 근거"}.'
  const user = JSON.stringify({goal, currentPanoHz, history})

  let aiText
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
        max_tokens: 300,
        system,
        messages: [{role: 'user', content: user}],
      }),
    })
    if (!upstream.ok) {
      res.status(502).json({error: 'upstream error'})
      return
    }
    const data = await upstream.json()
    aiText = Array.isArray(data.content) ? data.content.map(block => block.text ?? '').join('') : ''
  } catch {
    res.status(502).json({error: 'upstream fetch failed'})
    return
  }

  // 모델이 코드펜스 등 부가 텍스트를 붙일 수 있어 첫 {…} 블록만 파싱
  let parsed = null
  try {
    const match = aiText.match(/\{[\s\S]*\}/)
    parsed = match ? JSON.parse(match[0]) : null
  } catch {
    parsed = null
  }

  const voltage = parsed ? clampVoltage(parsed.voltage) : null
  if (voltage === null) {
    res.status(502).json({error: 'invalid model output'})
    return
  }
  const rationale =
    parsed && typeof parsed.rationale === 'string' && parsed.rationale.trim() !== ''
      ? parsed.rationale.trim()
      : `AI 추천 → ${voltage.toFixed(2)}V`

  res.status(200).json({voltage, rationale})
}
