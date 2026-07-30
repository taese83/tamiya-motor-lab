// GET /api/auth/session — 현재 세션 조회(로그인 여부 + 사용자). 미로그인도 200(authenticated:false).
import {readSessionCookie, verifySession} from '../_lib/session.js'

export default async function handler(req, res) {
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
