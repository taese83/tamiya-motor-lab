-- v2.x — 서버 DB 정본 통일: 로컬 최신 필드(변동률·컨디션 기준선)를 서버에도 저장.
-- Neon Postgres에서 1회 실행(002 이후). 기존 행은 NULL(=미보유, 앱의 undefined 생략 규칙과 일치).
-- 이 두 컬럼이 없으면 서버 정본 왕복에서 stabilityCv/stabilityBestCvs가 유실된다.
--   measure_records.stability_cv       — 회전 안정도 CV(측정 시점, nullable)
--   motors.stability_best_cvs          — 역대 최상 CV 3건(컨디션 기준선, number[] → JSONB, nullable)

ALTER TABLE measure_records ADD COLUMN IF NOT EXISTS stability_cv DOUBLE PRECISION;
ALTER TABLE motors ADD COLUMN IF NOT EXISTS stability_best_cvs JSONB;
