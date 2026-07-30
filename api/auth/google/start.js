// GET /api/auth/google/start — 구글 동의화면으로 리다이렉트 (v2.39, tamiya-race-app 미러링).
import {issueState, buildStateCookie} from '../../_lib/oauth.js'
import {isSecureRequest} from '../../_lib/session.js'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

export default function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !redirectUri) {
    res.status(500).json({error: 'OAuth 환경 변수 미설정 (GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI)'})
    return
  }
  const {state, cookieValue} = issueState()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  })
  res.setHeader('Set-Cookie', buildStateCookie(cookieValue, isSecureRequest(req.headers.host)))
  res.redirect(302, `${AUTH_URL}?${params.toString()}`)
}
