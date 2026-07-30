-- v2.39 Phase A — 사용자 프로필(구글 sub = PK). Neon Postgres에서 1회 실행.
-- 도메인 테이블(motors·measure_records·race_records)은 Phase B에서 추가한다.
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,           -- Google OIDC `sub` (안정 식별자)
  email      TEXT NOT NULL,
  name       TEXT NOT NULL,
  picture    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
