// 세션 가드 (v2.40 Phase B) — 세션 있으면 payload, 없으면 401 + null(호출자는 null이면 즉시 return).
// R24(보안): 소유자 전용 allowlist 추가 — 세션 발급(callback)과 검증(여기) 양쪽에 건다.
// 검증 측에도 거는 이유: allowlist 도입 **이전에 발급된** 타인 세션이 최대 30일 유효하기 때문이다.
import {readSessionCookie, verifySession} from './session.js'

/**
 * R24 — 소유자 이메일 판정. `ALLOWED_EMAIL`(콤마 구분 다중 허용)이 설정된 경우에만 제한한다.
 * 미설정이면 true(fail-open, 기존 동작 유지) — 배포 시점에 env가 없어 본인까지 잠기는 것을 피한다.
 * 대신 보호가 비활성임을 경고로 남긴다. **실제 적용의 완료 조건은 Vercel env 설정이다.**
 */
export function isAllowedEmail(email) {
  const raw = process.env.ALLOWED_EMAIL
  if (!raw || raw.trim() === '') {
    console.warn('[auth] ALLOWED_EMAIL 미설정 — 소유자 제한이 비활성입니다(누구나 로그인 가능)')
    return true
  }
  const allowed = raw
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(v => v !== '')
  return typeof email === 'string' && allowed.includes(email.toLowerCase())
}

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
  // R24 — allowlist 도입 이전 발급 세션·타 계정 세션 차단(403: 인증은 됐으나 권한 없음)
  if (!isAllowedEmail(payload.email)) {
    res.status(403).json({error: 'forbidden'})
    return null
  }
  return payload
}
