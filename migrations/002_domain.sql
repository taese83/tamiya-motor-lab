-- v2.40 Phase B — 도메인 테이블(사용자별 스코프). Neon Postgres에서 1회 실행(001 이후).
-- IndexedDB 레코드 형태를 그대로 미러링한다. 타임스탬프(created_at·measured_at)는 앱이 ISO 문자열로
-- 다루므로 TEXT로 저장해 무손실 round-trip한다(Date 변환 불일치 회피). user_id = 구글 sub.
-- 필터·정렬은 로컬(localStorage) 전용 — 서버에 저장하지 않는다.

CREATE TABLE IF NOT EXISTS motors (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  kind       TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS motors_user_idx ON motors (user_id);

CREATE TABLE IF NOT EXISTS measure_records (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  motor_id    TEXT NOT NULL,
  pano_hz     DOUBLE PRECISION NOT NULL,
  rpm         INTEGER NOT NULL,
  measured_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS measure_user_idx ON measure_records (user_id);

CREATE TABLE IF NOT EXISTS race_records (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  motor_id    TEXT NOT NULL,
  pano_hz     DOUBLE PRECISION NOT NULL,
  result      TEXT,
  voltage     DOUBLE PRECISION NOT NULL,
  lap_time_ms INTEGER,
  goal        TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS race_user_idx ON race_records (user_id);
