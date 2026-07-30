// 세션 토큰(JWT) — v2.39 로그인 Phase A (tamiya-race-app 미러링, JS 서버리스).
// 구글 `sub`를 안정 식별자로 담아 HS256 서명, HttpOnly·SameSite=Lax 쿠키(30일). 키는 SESSION_SECRET.
import {SignJWT, jwtVerify} from 'jose'

const COOKIE_NAME = 'mml_session'
const MAX_AGE_SEC = 60 * 60 * 24 * 30 // 30일

function secret() {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 16) throw new Error('SESSION_SECRET 환경 변수 미설정 또는 너무 짧음')
  return new TextEncoder().encode(s)
}

/** payload = {sub, email, name, picture?} → 서명 토큰 */
export async function signSession(payload) {
  return await new SignJWT({...payload})
    .setProtectedHeader({alg: 'HS256'})
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secret())
}

/** 토큰 → payload | null */
export async function verifySession(token) {
  try {
    const {payload} = await jwtVerify(token, secret())
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.name !== 'string'
    ) {
      return null
    }
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: typeof payload.picture === 'string' ? payload.picture : undefined,
    }
  } catch {
    return null
  }
}

/** cookie 헤더에서 세션 토큰 추출 */
export function readSessionCookie(cookieHeader) {
  if (!cookieHeader) return null
  for (const p of cookieHeader.split(';').map(x => x.trim())) {
    if (p.startsWith(`${COOKIE_NAME}=`)) return decodeURIComponent(p.slice(COOKIE_NAME.length + 1))
  }
  return null
}

function cookieAttrs(value, maxAge, isSecure) {
  const attrs = [`${COOKIE_NAME}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`]
  if (isSecure) attrs.push('Secure')
  return attrs.join('; ')
}

export function buildSessionCookie(token, isSecure) {
  return cookieAttrs(encodeURIComponent(token), MAX_AGE_SEC, isSecure)
}

export function buildClearCookie(isSecure) {
  return cookieAttrs('', 0, isSecure)
}

/** Vercel production/preview는 https, 로컬 개발은 http */
export function isSecureRequest(host) {
  return Boolean(host && !host.startsWith('localhost') && !host.startsWith('127.'))
}
