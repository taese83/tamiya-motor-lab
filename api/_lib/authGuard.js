// 세션 가드 (v2.40 Phase B) — 세션 있으면 payload, 없으면 401 + null(호출자는 null이면 즉시 return).
import {readSessionCookie, verifySession} from './session.js'

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
