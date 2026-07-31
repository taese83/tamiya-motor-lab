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

// ─── 도메인 전체 스냅샷 (v2.40 Phase B) — 컬럼을 앱(IndexedDB) 레코드 형태로 alias, null 옵션 필드는 생략 ───

/** 사용자의 전체 도메인 데이터 조회 → {motors, measures, races} (IndexedDB 레코드 형태) */
export async function getUserData(userId) {
  const q = sql()
  const [motorRows, measureRows, raceRows] = await Promise.all([
    q`SELECT id, name, kind, sort_order AS "sortOrder", created_at AS "createdAt", updated_at AS "updatedAt", stability_best_cvs AS "stabilityBestCvs"
      FROM motors WHERE user_id = ${userId} ORDER BY sort_order ASC`,
    q`SELECT id, motor_id AS "motorId", pano_hz AS "panoHz", rpm, measured_at AS "measuredAt", stability_cv AS "stabilityCv"
      FROM measure_records WHERE user_id = ${userId} ORDER BY measured_at ASC`,
    q`SELECT id, motor_id AS "motorId", pano_hz AS "panoHz", result, voltage, lap_time_ms AS "lapTimeMs", goal, retire_reason AS "retireReason", created_at AS "createdAt"
      FROM race_records WHERE user_id = ${userId} ORDER BY created_at ASC`,
  ])
  return {
    // null 옵션 필드(stabilityBestCvs·stabilityCv)는 생략 — IndexedDB의 undefined 생략 규칙과 일치
    motors: motorRows.map(m => ({
      id: m.id,
      name: m.name,
      kind: m.kind,
      sortOrder: Number(m.sortOrder),
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      // JSONB는 드라이버가 파싱해 배열로 반환 — number[]로 정규화
      ...(Array.isArray(m.stabilityBestCvs) ? {stabilityBestCvs: m.stabilityBestCvs.map(Number)} : {}),
    })),
    measures: measureRows.map(r => ({
      id: r.id,
      motorId: r.motorId,
      panoHz: Number(r.panoHz),
      rpm: Number(r.rpm),
      measuredAt: r.measuredAt,
      ...(r.stabilityCv != null ? {stabilityCv: Number(r.stabilityCv)} : {}),
    })),
    // null 옵션 필드(result·lapTimeMs·goal·retireReason)는 생략 — IndexedDB의 undefined 생략 규칙과 일치
    races: raceRows.map(r => ({
      id: r.id,
      motorId: r.motorId,
      panoHz: Number(r.panoHz),
      voltage: Number(r.voltage),
      createdAt: r.createdAt,
      ...(r.result != null ? {result: r.result} : {}),
      ...(r.lapTimeMs != null ? {lapTimeMs: Number(r.lapTimeMs)} : {}),
      ...(r.goal != null ? {goal: r.goal} : {}),
      ...(r.retireReason != null ? {retireReason: r.retireReason} : {}), // R24 — 미보유(구 행)는 생략
    })),
  }
}

/** 사용자 전체 도메인 데이터를 스냅샷으로 교체(delete-all + insert). 단일 트랜잭션(원자적). */
export async function replaceUserData(userId, snapshot) {
  const q = sql()
  const motors = Array.isArray(snapshot.motors) ? snapshot.motors : []
  const measures = Array.isArray(snapshot.measures) ? snapshot.measures : []
  const races = Array.isArray(snapshot.races) ? snapshot.races : []
  const queries = [
    q`DELETE FROM motors WHERE user_id = ${userId}`,
    q`DELETE FROM measure_records WHERE user_id = ${userId}`,
    q`DELETE FROM race_records WHERE user_id = ${userId}`,
    ...motors.map(
      m => q`INSERT INTO motors (id, user_id, name, kind, sort_order, created_at, updated_at, stability_best_cvs)
             VALUES (${m.id}, ${userId}, ${m.name}, ${m.kind}, ${m.sortOrder}, ${m.createdAt}, ${m.updatedAt}, ${Array.isArray(m.stabilityBestCvs) ? JSON.stringify(m.stabilityBestCvs) : null}::jsonb)`,
    ),
    ...measures.map(
      r => q`INSERT INTO measure_records (id, user_id, motor_id, pano_hz, rpm, measured_at, stability_cv)
             VALUES (${r.id}, ${userId}, ${r.motorId}, ${r.panoHz}, ${r.rpm}, ${r.measuredAt}, ${r.stabilityCv ?? null})`,
    ),
    ...races.map(
      // R24: retire_reason 추가 — 없으면 mirror push에서 사유가 탈락해 다음 pull에서 로컬까지 유실된다
      r => q`INSERT INTO race_records (id, user_id, motor_id, pano_hz, result, voltage, lap_time_ms, goal, retire_reason, created_at)
             VALUES (${r.id}, ${userId}, ${r.motorId}, ${r.panoHz}, ${r.result ?? null}, ${r.voltage}, ${r.lapTimeMs ?? null}, ${r.goal ?? null}, ${r.retireReason ?? null}, ${r.createdAt})`,
    ),
  ]
  await q.transaction(queries)
}
