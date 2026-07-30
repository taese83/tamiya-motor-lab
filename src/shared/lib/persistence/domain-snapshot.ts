import {unwrap} from '@shared/lib/result'

import {requireDb} from './db'
import {withTransaction} from './with-transaction'

import type {PersistedRow} from './schema'

// 도메인 전체 스냅샷 read/replace (v2.40 Phase B — 서버 동기화용).
// 서버↔로컬 미러링의 로컬 측 원자적 조작만 담당한다(검증·매핑은 소비 계층). 필터·정렬은 대상 아님.

export interface DomainSnapshot {
  motors: PersistedRow[]
  measures: PersistedRow[]
  races: PersistedRow[]
}

/** 로컬 3개 store 전량 read(raw) — push 스냅샷 구성용 */
export async function readDomainSnapshot(): Promise<DomainSnapshot> {
  const db = requireDb()
  const [motors, measures, races] = await Promise.all([
    db.getAll('motors'),
    db.getAll('measureRecords'),
    db.getAll('raceRecords'),
  ])
  return {motors, measures, races}
}

/** 로컬 3개 store를 스냅샷으로 전량 교체(clear+put, 단일 트랜잭션 — 서버 우선 pull 반영) */
export async function replaceDomainSnapshot(snapshot: DomainSnapshot): Promise<void> {
  unwrap(
    await withTransaction(['motors', 'measureRecords', 'raceRecords'], 'readwrite', async tx => {
      await tx.objectStore('motors').clear()
      await tx.objectStore('measureRecords').clear()
      await tx.objectStore('raceRecords').clear()
      for (const row of snapshot.motors) await tx.objectStore('motors').put(row)
      for (const row of snapshot.measures) await tx.objectStore('measureRecords').put(row)
      for (const row of snapshot.races) await tx.objectStore('raceRecords').put(row)
    }),
  )
}
