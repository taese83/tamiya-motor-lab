// Vercel 서버리스 (v2.33 Stage 2) — 레이스 전압 추천 LLM 프록시.
// 키(ANTHROPIC_API_KEY)는 **서버 전용 env**로만 읽고 클라이언트 번들엔 절대 포함되지 않는다.
// 클라이언트(features/race-record/api/recommend-voltage.ts)는 실패·비정상 응답 시 결정론적
// 휴리스틱으로 폴백하므로, 이 함수는 키 없음·업스트림 오류·잘못된 출력이면 5xx로 응답만 하면 된다
// (성공 위장 금지). 입력이 숫자+enum이라 프롬프트 인젝션 표면이 작고, 출력 전압은 여기서 클램프한다.
// R23(보안): **세션 필수**(authGuard) — 이전에는 무인증 공개 POST가 가능해 서버 키를 태울 수 있었다
// (denial-of-wallet). api/data.js와 동일 패턴. 비로그인은 401이고, 클라 어댑터가 res.ok 아니면
// 휴리스틱으로 폴백하므로 추천 기능 자체는 계속 동작한다. max_tokens 상한·이력 20건 컷은 그대로 유지.
import {requireAllowedSession} from './_lib/authGuard.js'

const VOLTAGE_MIN = 2.6 // 권장 대역 하한(입력 허용과 별개 — domain VOLTAGE_ADVICE_RANGE와 일치). R34: 하한
// 유지 — 속도 유지 전압이 2.6 미만이면 파노가 목표에 비해 과한 신호로 보고 rationale로 저파노 모터를 권장
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
    '- **파노는 레이스 전에 이미 측정된 모터 상태**다(내가 만들 결과가 아니다). 파노가 올랐다는 것은 같은 전압에서 이미 더 빨라졌다는 뜻이므로, 같은 주행 속도를 유지하려면 전압을 **낮춰야** 한다. 파노가 내렸으면 반대로 올린다. **절대 "파노가 높으니 전압을 높인다"고 판단하지 마라 — 정반대다.**',
    '  · 워크드 예시: 파노 470에서 3.0V로 완주했다면, 파노가 520으로 오른 지금 같은 속도는 3.0×470/520 ≈ 2.71V다. 완주·안정 목표면 여기서 더 낮춘다.',
    '- 판단 기준은 속도 지표 **S = 파노 × 전압**이다. 과거 완주 기록에서 S(성공했던 속도 수준)를 잡고, 현재 파노 P에서 전압 = S / P로 역산한다.',
    '- result: finished=완주(성공), retired=이탈(대개 과속·불안정). **이탈 전압은 이미 너무 빠른 값이다 — 완주·안정 목표에선 그 속도를 유지 목표로 삼지 말고 반드시 그보다 낮춰라.**',
    '- 앵커 점검: 현재 파노가 과거 완주 파노보다 높으면 추천 전압은 그 완주 전압보다 **반드시 낮다**. 완주 전압 이상이 나오면 역산이 틀린 것이니 다시 낮춰라.',
    '',
    '[입력 JSON]',
    '- goal: finish(완주 우선·보수적) | stability(안정·균형) | speed(속도 우선·공격적)',
    '- currentPanoHz: 지금 측정된 파노(Hz)',
    '- history: 과거 레이스 배열. 각 항목 { voltage, panoHz, result?, lapTimeMs?, goal?, weight }',
    '  · weight = 분석 중요도. 가장 오래된 기록이 1, 최근일수록 지수적으로 크다.',
    '    weight가 큰(최근) 기록을 더 신뢰해 가중 평균한다.',
    '',
    '[분석 절차 — 내부적으로 단계적으로 사고하되 출력은 JSON만]',
    '1) 완주(finished) 기록의 속도 지표 S=파노×전압을 weight로 가중 평균해 목표 속도 S̄를 잡는다. 완주 기록이 없으면 이탈 기록으로 S를 잡되 그 S는 과속 수준이므로 목표 S̄를 그보다 낮춰 잡는다(완주하려면 더 느려야 한다). 최근(weight 큰) 기록 우선.',
    '2) 현재 파노 P에서 기준 전압 = S̄ / P로 역산한다 — 파노가 올랐으면 전압은 내려가고, 파노가 내렸으면 올라간다. history가 비면 goal 기준값에서 시작한다.',
    '3) goal 보정: speed는 높이고, finish는 낮추고, stability는 중간.',
    '4) 안전: currentPanoHz와 ±15% 이내 파노에서 retired였던 전압 이상은 피한다(그 아래로).',
    '5) lapTimeMs가 있으면 참고: 비슷한 조건에서 완주 + 빠른 랩의 전압대를 선호.',
    '',
    '[제약 — 반드시 준수]',
    '- 추천 전압은 2.6~3.2V, 0.02V 단위.',
    '- 2단계 기준 전압(S̄/P, 목표 보정 전)이 2.6V 미만이면 파노가 목표 속도에 비해 과하다는 신호다.',
    '  voltage는 2.6으로 두되, rationale에 "파노가 높아 이 세팅엔 과함 — 더 낮은 파노 모터 권장"을 반드시 밝힌다.',
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
