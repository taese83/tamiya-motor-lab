// /api/data (v2.40 Phase B) — 로그인 사용자의 전체 도메인 스냅샷.
//  GET  → {motors, measures, races} (서버 정본)
//  PUT  → 스냅샷으로 전체 교체(로컬 미러 push). 필터·정렬은 서버에 저장하지 않는다.
// 세션 필수(authGuard). 데이터는 구글 sub로 스코프 — 사용자별 격리.
import {requireSession} from './_lib/authGuard.js'
import {getUserData, replaceUserData} from './_lib/db.js'

export default async function handler(req, res) {
  // R34: 사용자별 인증 JSON — 절대 캐시 금지. catch-all no-cache가 ETag 재검증(304 빈 본문)을
  // 유발해 iOS Safari fetch가 304를 받으면 pull이 상시 실패하던 프로덕션 장애의 서버측 방어.
  res.setHeader('Cache-Control', 'private, no-store')
  const session = await requireSession(req, res)
  if (!session) return // 401 이미 전송

  try {
    if (req.method === 'GET') {
      res.status(200).json(await getUserData(session.sub))
      return
    }
    if (req.method === 'PUT') {
      const body = req.body ?? {}
      await replaceUserData(session.sub, {
        motors: body.motors,
        measures: body.measures,
        races: body.races,
      })
      res.status(200).json({ok: true})
      return
    }
    res.status(405).json({error: 'method not allowed'})
  } catch {
    res.status(500).json({error: 'db error'})
  }
}
