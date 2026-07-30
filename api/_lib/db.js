// Neon serverless Postgres 접근 — v2.39 (tamiya-race-app 미러링). Phase A는 users만.
// 도메인 테이블(motors·measure_records·race_records)은 Phase B에서 추가한다.
import {neon} from '@neondatabase/serverless'

let cachedSql = null

export function sql() {
  if (cachedSql) return cachedSql
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
  if (!url) throw new Error('DATABASE_URL 미설정')
  cachedSql = neon(url)
  return cachedSql
}

/** 로그인 시 사용자 프로필 upsert (구글 sub = PK). DB 미초기화면 호출부에서 best-effort 처리. */
export async function upsertUser(user) {
  const q = sql()
  await q`
    INSERT INTO users (id, email, name, picture)
    VALUES (${user.id}, ${user.email}, ${user.name}, ${user.picture ?? null})
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      picture = EXCLUDED.picture,
      updated_at = NOW()
  `
}
