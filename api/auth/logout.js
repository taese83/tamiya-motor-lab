// POST /api/auth/logout — 세션 쿠키 제거.
import {buildClearCookie, isSecureRequest} from '../_lib/session.js'

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({error: 'POST only'})
    return
  }
  res.setHeader('Set-Cookie', buildClearCookie(isSecureRequest(req.headers.host)))
  res.status(200).json({ok: true})
}
