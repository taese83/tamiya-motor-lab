// 세션 가드 — 세션 있으면 payload, 없으면 401 + null(호출자는 null이면 즉시 return).
// R24/R35(개정): allowlist(ALLOWED_EMAIL)는 **AI 경로 전용 게이트**다. 앱 로그인과 사용자 데이터는
// 구글 sub로 격리되는 멀티유저이므로 제한하지 않는다 — allowlist 검사는 requireAllowedSession 안에만 둔다.
import {readSessionCookie, verifySession} from './session.js'

/**
 * 소유자 이메일 판정. `ALLOWED_EMAIL`(콤마 구분 다중 허용)이 설정된 경우에만 제한한다.
 * 미설정이면 true(fail-open) — 이 값은 AI 경로(requireAllowedSession)에서만 소비되며,
 * 그쪽은 미설정 시 isAllowedEmail을 호출하기 전에 503(ai_disabled)로 fail-closed 한다.
 */
export function isAllowedEmail(email) {
  const raw = process.env.ALLOWED_EMAIL
  if (!raw || raw.trim() === '') return true
  const allowed = raw
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(v => v !== '')
  return typeof email === 'string' && allowed.includes(email.toLowerCase())
}

/** 세션 필수 가드 — 유효한 구글 세션이면 payload. allowlist는 보지 않는다(로그인·데이터는 sub 격리 멀티유저). */
export async function requireSession(req, res) {
  const token = readSessionCookie(req.headers.cookie)
  if (!token) {
    res.status(401).json({error: 'unauthenticated'})
    return null
  }
  const payload = await verifySession(token)
  if (!payload) {
    res.status(401).json({error: 'invalid_session'})
    return null
  }
  return payload
}

/**
 * R25(U4) — AI 경로 전용 가드 (api-schema §0, DL-030). requireSession 위에 소유자 allowlist를 얹는다.
 * ① 세션 없음/무효 → 401 (requireSession) ② `ALLOWED_EMAIL` 미설정/공백 → 503 {error:'ai_disabled'}
 * (소유자 미확정 상태에서 서버 AI 키를 태우지 않는다 — threat-model T2 denial-of-wallet)
 * ③ allowlist 밖 → 403 {error:'forbidden'} ④ 통과 → payload.
 * 호출자 계약: null이면 즉시 return(응답은 이미 전송됨).
 */
export async function requireAllowedSession(req, res) {
  const payload = await requireSession(req, res)
  if (!payload) return null
  const raw = process.env.ALLOWED_EMAIL
  if (!raw || raw.trim() === '') {
    res.status(503).json({error: 'ai_disabled'})
    return null
  }
  if (!isAllowedEmail(payload.email)) {
    res.status(403).json({error: 'forbidden'})
    return null
  }
  return payload
}
