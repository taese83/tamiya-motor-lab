import {useQuery} from '@tanstack/react-query'

// 로그인 세션 조회 (v2.39 Phase A). GET /api/auth/session — 서버리스(Vercel)에서만 실동작.
// 로컬 정적 서버에서는 index.html이 반환돼 JSON 파싱 실패 → null(미로그인)로 수렴(기존 동작 유지).

export interface AuthUser {
  id: string
  email: string
  name: string
  picture?: string | undefined
}

interface SessionResponse {
  authenticated: boolean
  user?: AuthUser
}

async function fetchSession(): Promise<AuthUser | null> {
  try {
    // R34: cache 'no-store' — 세션 응답이 캐시/재검증(304)되면 로그인 상태가 stale로 표시된다
    const res = await fetch('/api/auth/session', {credentials: 'same-origin', cache: 'no-store'})
    if (!res.ok) return null
    const data = (await res.json()) as SessionResponse
    return data.authenticated && data.user ? data.user : null
  } catch {
    // 네트워크·JSON 파싱 실패(로컬 정적 서버 등) → 미로그인으로 수렴(무음 실패 금지: 값은 항상 반환)
    return null
  }
}

export interface Session {
  user: AuthUser | null
  isPending: boolean
}

export function useSession(): Session {
  const query = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: fetchSession,
    staleTime: 5 * 60_000,
  })
  return {user: query.data ?? null, isPending: query.isPending}
}
