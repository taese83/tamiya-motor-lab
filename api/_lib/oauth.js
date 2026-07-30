// OAuth state (CSRF 방지) — v2.39. 랜덤 nonce + HMAC(SESSION_SECRET) 서명을 쿠키·state 파라미터로
// 왕복 검증. tamiya-race-app 미러링(JS 서버리스).
import {randomBytes, createHmac, timingSafeEqual} from 'node:crypto'

const STATE_COOKIE = 'mml_oauth_state'
const STATE_MAX_AGE_SEC = 60 * 10 // 10분

function stateSecret() {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET 환경 변수 미설정')
  return s
}

/** 랜덤 state + HMAC 서명 */
export function issueState() {
  const nonce = randomBytes(16).toString('hex')
  const sig = createHmac('sha256', stateSecret()).update(nonce).digest('hex').slice(0, 32)
  const state = `${nonce}.${sig}`
  return {state, cookieValue: state}
}

/** callback state ↔ cookie state 비교 + HMAC 자체 재검증(상수시간 비교) */
export function verifyState(stateParam, cookieValue) {
  if (!stateParam || !cookieValue) return false
  const paramBuf = Buffer.from(stateParam)
  const cookieBuf = Buffer.from(cookieValue)
  if (paramBuf.length !== cookieBuf.length) return false
  if (!timingSafeEqual(paramBuf, cookieBuf)) return false
  const parts = stateParam.split('.')
  if (parts.length !== 2) return false
  const [nonce, sig] = parts
  if (!nonce || !sig) return false
  const expected = createHmac('sha256', stateSecret()).update(nonce).digest('hex').slice(0, 32)
  if (expected.length !== sig.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
}

function stateCookieAttrs(value, maxAge, isSecure) {
  const attrs = [
    `${STATE_COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ]
  if (isSecure) attrs.push('Secure')
  return attrs.join('; ')
}

export function buildStateCookie(value, isSecure) {
  return stateCookieAttrs(encodeURIComponent(value), STATE_MAX_AGE_SEC, isSecure)
}

export function clearStateCookie(isSecure) {
  return stateCookieAttrs('', 0, isSecure)
}

export function readStateCookie(cookieHeader) {
  if (!cookieHeader) return null
  for (const p of cookieHeader.split(';').map(x => x.trim())) {
    if (p.startsWith(`${STATE_COOKIE}=`)) return decodeURIComponent(p.slice(STATE_COOKIE.length + 1))
  }
  return null
}
