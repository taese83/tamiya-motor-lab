// GET /api/auth/google/callback — code→token 교환, id_token 검증, 세션 발급 후 / 로 복귀 (v2.39).
import {createRemoteJWKSet, jwtVerify} from 'jose'

import {isAllowedEmail} from '../../_lib/authGuard.js'
import {upsertUser} from '../../_lib/db.js'
import {readStateCookie, verifyState, clearStateCookie} from '../../_lib/oauth.js'
import {signSession, buildSessionCookie, isSecureRequest} from '../../_lib/session.js'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

export default async function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    res.status(500).send('OAuth 환경 변수 미설정')
    return
  }

  const errorRaw = req.query.error
  if (typeof errorRaw === 'string') {
    res.redirect(302, `/?auth_error=${encodeURIComponent(errorRaw)}`)
    return
  }
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const state = typeof req.query.state === 'string' ? req.query.state : ''
  const secure = isSecureRequest(req.headers.host)

  if (!verifyState(state, readStateCookie(req.headers.cookie))) {
    res.setHeader('Set-Cookie', clearStateCookie(secure))
    res.redirect(302, '/?auth_error=invalid_state')
    return
  }

  // code → token 교환
  let tokenPayload
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    tokenPayload = await tokenRes.json()
    if (!tokenRes.ok || !tokenPayload.id_token) {
      res.setHeader('Set-Cookie', clearStateCookie(secure))
      res.redirect(302, `/?auth_error=${encodeURIComponent(tokenPayload.error ?? 'token_exchange_failed')}`)
      return
    }
  } catch {
    res.setHeader('Set-Cookie', clearStateCookie(secure))
    res.redirect(302, '/?auth_error=token_fetch_failed')
    return
  }

  // id_token 검증 (Google JWKS)
  let claims
  try {
    const {payload} = await jwtVerify(tokenPayload.id_token, JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    })
    claims = payload
  } catch {
    res.setHeader('Set-Cookie', clearStateCookie(secure))
    res.redirect(302, '/?auth_error=id_token_invalid')
    return
  }

  if (!claims.sub || !claims.email || !claims.name) {
    res.setHeader('Set-Cookie', clearStateCookie(secure))
    res.redirect(302, '/?auth_error=missing_profile')
    return
  }
  if (claims.email_verified === false) {
    res.setHeader('Set-Cookie', clearStateCookie(secure))
    res.redirect(302, '/?auth_error=email_unverified')
    return
  }
  // R24(보안) — 소유자 전용 앱. ALLOWED_EMAIL이 설정돼 있으면 그 계정에만 세션을 발급한다.
  // 이전에는 임의 구글 계정이 로그인해 유효 세션을 얻었고, requireSession(R23)은 무인증만 막으므로
  // 서버 키를 쓰는 엔드포인트(recommend-voltage 등)가 타인에게 열려 있었다(denial-of-wallet).
  // 미설정이면 기존 동작을 유지한다(fail-open) — 배포 시점에 env가 없어 본인까지 잠기는 것을 피하기 위함이며,
  // 이 경우 보호가 적용되지 않으므로 경고를 남긴다. 실제 적용은 Vercel env 설정이 완료 조건이다.
  if (!isAllowedEmail(claims.email)) {
    res.setHeader('Set-Cookie', clearStateCookie(secure))
    res.redirect(302, '/?auth_error=not_allowed')
    return
  }

  // 사용자 upsert — DB 미초기화(Phase B 전)여도 로그인은 성공해야 하므로 best-effort
  try {
    await upsertUser({id: claims.sub, email: claims.email, name: claims.name, picture: claims.picture})
  } catch (err) {
    console.warn('[auth] users upsert 실패(DB 미초기화 가능):', err instanceof Error ? err.message : err)
  }

  const session = await signSession({
    sub: claims.sub,
    email: claims.email,
    name: claims.name,
    picture: typeof claims.picture === 'string' ? claims.picture : undefined,
  })
  res.setHeader('Set-Cookie', [clearStateCookie(secure), buildSessionCookie(session, secure)])
  res.redirect(302, '/')
}
