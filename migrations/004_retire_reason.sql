-- R24 — 이탈 사유(retireReason) 서버 정본 반영. Neon Postgres에서 1회 실행(003 이후).
-- 003_stability.sql과 **동일 유형의 유실 수정**: R20이 로컬(IndexedDB)에만 필드를 추가하고
-- 서버 테이블·SELECT·INSERT를 놓쳐, mirror push에서 사유가 탈락하고 다음 로그인의
-- pull→replaceDomainSnapshot(서버 우선 대체)에서 로컬 사유까지 소실됐다.
--   race_records.retire_reason — 이탈 사유 leaf key(RETIRE_REASON_LEAF_KEYS 중 하나, nullable)
-- 기존 행은 NULL(=미보유). 앱의 undefined 생략 규칙과 일치하므로 read-lenient 스키마가 그대로 통과한다.
--
-- ⚠️ 실행 순서: 이 마이그레이션을 **먼저** 실행한 뒤 코드를 배포할 것.
--    역순이면 INSERT가 없는 컬럼을 참조해 동기화 전체(PUT /api/data)가 실패한다.

ALTER TABLE race_records ADD COLUMN IF NOT EXISTS retire_reason TEXT;
