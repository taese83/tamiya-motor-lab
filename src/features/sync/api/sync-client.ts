import type {DomainSnapshot} from '@shared/lib/persistence'

// 서버 동기화 클라이언트 (v2.40 Phase B). /api/data(서버리스)와 전체 스냅샷을 주고받는다.
// 실패·미가용(로컬 정적 서버·미로그인·오프라인)은 null/false로 조용히 수렴 — 앱은 기존대로 IndexedDB 사용.

/** 서버 정본 스냅샷 조회. 실패·비인증(401)·미가용이면 null */
export async function pullServerData(): Promise<DomainSnapshot | null> {
  try {
    const res = await fetch('/api/data', {credentials: 'same-origin'})
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (typeof data !== 'object' || data === null) return null
    const d = data as Partial<DomainSnapshot>
    if (!Array.isArray(d.motors)) return null // 정적 서버가 index.html을 준 경우 등 방어
    return {
      motors: d.motors,
      measures: Array.isArray(d.measures) ? d.measures : [],
      races: Array.isArray(d.races) ? d.races : [],
    }
  } catch {
    return null
  }
}

/** 로컬 스냅샷을 서버로 전량 교체(mirror push). 성공 여부 반환 */
export async function pushServerData(snapshot: DomainSnapshot): Promise<boolean> {
  try {
    const res = await fetch('/api/data', {
      method: 'PUT',
      headers: {'content-type': 'application/json'},
      credentials: 'same-origin',
      body: JSON.stringify(snapshot),
    })
    return res.ok
  } catch {
    return false
  }
}
