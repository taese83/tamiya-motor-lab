// Vercel 서버리스 (v2.33 Stage 2) — 레이스 전압 추천 LLM 프록시.
// 키(ANTHROPIC_API_KEY)는 **서버 전용 env**로만 읽고 클라이언트 번들엔 절대 포함되지 않는다.
// 클라이언트(features/race-record/api/recommend-voltage.ts)는 실패·비정상 응답 시 결정론적
// 휴리스틱으로 폴백하므로, 이 함수는 키 없음·업스트림 오류·잘못된 출력이면 5xx로 응답만 하면 된다
// (성공 위장 금지). 입력이 숫자+enum이라 프롬프트 인젝션 표면이 작고, 출력 전압은 여기서 클램프한다.
// R23(보안): **세션 필수**(authGuard) — 이전에는 무인증 공개 POST가 가능해 서버 키를 태울 수 있었다
// (denial-of-wallet). api/data.js와 동일 패턴. 비로그인은 401이고, 클라 어댑터가 res.ok 아니면
// 휴리스틱으로 폴백하므로 추천 기능 자체는 계속 동작한다. max_tokens 상한·이력 20건 컷은 그대로 유지.
import {requireAllowedSession} from './_lib/authGuard.js'

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
  // 세션+소유자 allowlist 필수 — 키 소비(업스트림 호출) 전에 차단한다 (R23 → R25 DL-030:
  // requireAllowedSession 교체. ALLOWED_EMAIL 미설정 503 fail-closed·allowlist 밖 403이 추가되나
  // 클라 어댑터는 res.ok 아니면 휴리스틱 폴백이라 무해 — api-schema §2)
  const session = await requireAllowedSession(req, res)
  if (!session) return // 401/403/503 이미 전송

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
  // v2.37 — 세밀·정교화된 프롬프트(가중치 활용). 클라이언트가 최근 구간에 지수 weight를 붙여 보낸다.
  const system = [
    '역할: 너는 타미야 미니4WD 모터 세팅 코치다. 목표는 이번 주행에 쓸 전압(V) 하나를 추천하는 것이다.',
    '',
    '[도메인 지식]',
    '- panoHz는 모터 회전음의 기본 주파수(Hz)로 회전수(RPM)에 비례한다. 높을수록 빠르다.',
    '- 이 모터의 과거 레이스에서 (설정 전압 ↔ 파노 ↔ 결과)의 상관을 학습해 현재 파노에 맞는 전압을 정한다.',
    '- result: finished=완주(성공), retired=이탈(대개 과속·불안정). 이탈한 전압대는 위험 신호다.',
    '- 전압↔속도는 대체로 비례하나 모터·배터리 상태로 관계가 변한다.',
    '',
    '[입력 JSON]',
    '- goal: finish(완주 우선·보수적) | stability(안정·균형) | speed(속도 우선·공격적)',
    '- currentPanoHz: 지금 측정된 파노(Hz)',
    '- history: 과거 레이스 배열. 각 항목 { voltage, panoHz, result?, lapTimeMs?, goal?, weight }',
    '  · weight = 분석 중요도. 가장 오래된 기록이 1, 최근일수록 지수적으로 크다.',
    '    weight가 큰(최근) 기록을 더 신뢰해 가중 추세로 판단하라.',
    '',
    '[분석 절차 — 내부적으로 단계적으로 사고하되 출력은 JSON만]',
    '1) history를 weight로 가중해 파노↔전압 관계를 추정한다(가중 추세/가중 평균). 최근(weight 큰) 기록 우선.',
    '2) currentPanoHz에 그 관계를 적용해 기준 전압을 잡는다. history가 비거나 부족하면 goal 기준값에서 시작한다.',
    '3) goal 보정: speed는 높이고, finish는 낮추고, stability는 중간.',
    '4) 안전: currentPanoHz와 ±15% 이내 파노에서 retired였던 전압 이상은 피한다(그 아래로).',
    '5) lapTimeMs가 있으면 참고: 비슷한 조건에서 완주 + 빠른 랩의 전압대를 선호.',
    '',
    '[제약 — 반드시 준수]',
    '- 추천 전압은 2.6~3.2V, 0.02V 단위.',
    '- 풀충 배터리로도 ~3.2V가 상한이며 3.2V는 배터리 부담이 크다. speed 목표라도 3.2V를 넘겨야만',
    '  더 빨라지는 상황이면 무리하지 말고 stability 수준으로 낮춰 추천하고 근거에 그 사실을 밝힌다.',
    '',
    '[출력 — JSON만, 그 외 텍스트 금지]',
    '{"voltage": <2.6~3.2, 0.02 단위 number>, "rationale": "<한국어 1~2문장. 현재 파노·가중 추세·이탈 회피·목표·다운그레이드 여부를 간결히>"}',
  ].join('\n')
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
        temperature: 0, // 결정성 — 같은 입력 → 같은 추천
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
