// GET /api/auth/session — 현재 세션 조회(로그인 여부 + 사용자). 미로그인도 200(authenticated:false).
// R35: allowlist 판정을 데이터 API(requireSession)와 통일 — 불허 세션이 "로그인처럼 보이는데
// 데이터만 전부 403"인 불일치 상태를 없앤다(불허면 authenticated:false로 일관되게 로그아웃 표시).
import {isAllowedEmail} from '../_lib/authGuard.js'
import {readSessionCookie, verifySession} from '../_lib/session.js'

export default async function handler(req, res) {
  // R34: 세션 상태는 절대 캐시 금지 — 캐시되면 로그인 후에도 authenticated:false가 재사용될 수 있다.
  res.setHeader('Cache-Control', 'private, no-store')
  const token = readSessionCookie(req.headers.cookie)
  const payload = token ? await verifySession(token) : null
  if (!payload || !isAllowedEmail(payload.email)) {
    res.status(200).json({authenticated: false})
    return
  }
  res.status(200).json({
    authenticated: true,
    user: {id: payload.sub, email: payload.email, name: payload.name, picture: payload.picture},
  })
}
