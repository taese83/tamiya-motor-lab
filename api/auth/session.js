// GET /api/auth/session — 현재 세션 조회(로그인 여부 + 사용자). 미로그인도 200(authenticated:false).
import {readSessionCookie, verifySession} from '../_lib/session.js'

export default async function handler(req, res) {
  // R34: 세션 상태는 절대 캐시 금지 — 캐시되면 로그인 후에도 authenticated:false가 재사용될 수 있다.
  res.setHeader('Cache-Control', 'private, no-store')
  const token = readSessionCookie(req.headers.cookie)
  const payload = token ? await verifySession(token) : null
  if (!payload) {
    res.status(200).json({authenticated: false})
    return
  }
  res.status(200).json({
    authenticated: true,
    user: {id: payload.sub, email: payload.email, name: payload.name, picture: payload.picture},
  })
}
