import {z} from 'zod'

import type {DBSchema, StoreNames} from 'idb'

// Storage Schema v2 (state-contract v2 §Storage Schema — DB Identity)
// IDB native version(구조: store·index 버전)과 meta['app'].schemaVersion(데이터 형태 버전)은
// v2에서 동일하며 함께 bump한다. 이중 기록 이유: meta 부재/불일치 자체가 corruption 신호(INV-11).
// 구버전 처리(RV-3): 마이그레이션 없음 — `mml-db` oldVersion<2는 기존 store 전부 drop 후
// v2 신설(데이터 이관 코드 0줄) → ready(recreated). v2.10: 상용 배포 전이라 v1 DB 정리 경로는 제거했다.
export const DB_NAME = 'mml-db'
export const DB_VERSION = 2 // IDB native version — upgrade(oldVersion) 트리거 기준
export const SCHEMA_VERSION = 2 // meta['app'].schemaVersion — 부팅 검증(INV-11)·zod 스키마 선택 기준
export const META_KEY = 'app'

// record store index 이름 — measureRecords·raceRecords 양쪽 동일 (state-contract v2 store 표).
// entity repository가 문자열 리터럴을 중복하지 않고 참조한다. v2에서 by-createdAt index는 제거 —
// 정렬은 메모리 정렬(규모: measure ≤300행·race 수백 행, INV-08 비교자는 query 소유).
export const RECORDS_BY_MOTOR_INDEX = 'by-motorId'

// meta 행 검증 — persistence 소유 스키마 (엔티티 스키마는 entities/*/model 소유, 여기서 정의 금지)
export const dbMetaSchema = z.object({schemaVersion: z.number().int().positive()})
export type DbMeta = z.infer<typeof dbMetaSchema>

/**
 * persisted 행의 저장 타입 — 의도적으로 Motor/MeasureRecord/RaceRecord 타입을 쓰지 않는다.
 *
 * 1. FSD: shared → entities import 불가. 엔티티 타입·zod 스키마의 단일 정의는 entities 각 model 소유(AD-7).
 * 2. INV-16: persisted JSON은 외부 입력 — 모든 read 경계에서 zod parse가 필수이고 type assertion은 금지다.
 *    읽기 반환을 unknown record로 두면 parse 없이 도메인 타입으로 쓰는 경로가 컴파일 타임에 차단된다.
 * 쓰기 측(entity repository)은 write-strict zod 검증을 통과한 값만 add/put한다.
 */
export type PersistedRow = Record<string, unknown>

// Storage Schema v2 — store 4개 (state-contract v2 DBSchema 스케치)
export interface MmlDB extends DBSchema {
  motors: {key: string; value: PersistedRow} // index 없음 — 최대 규모 30, sortOrder 정렬은 메모리
  measureRecords: {
    key: string
    value: PersistedRow
    indexes: {'by-motorId': string}
  }
  raceRecords: {
    key: string
    value: PersistedRow
    indexes: {'by-motorId': string}
  }
  meta: {key: typeof META_KEY; value: DbMeta}
}

export type StoreName = StoreNames<MmlDB> // 'motors' | 'measureRecords' | 'raceRecords' | 'meta'
/** withTransaction이 허용하는 store — meta 쓰기는 persistence(upgrade·reset) 전용이라 제외 (INV-11 보호) */
export type DomainStoreName = Exclude<StoreName, 'meta'>

/**
 * initPersistence 3-상태 계약 (state-contract v2 §Persistence commands — InitResult).
 * - ready(ok|recreated): 연결 캐시 완료, INV-11 성립, 전 행 유효.
 *   recreated = 구버전(v1) 감지 → 폐기 후 재생성(RV-3 — 'migrated' 대체, 1회성 고지 가능).
 *   구버전 DB는 corrupt가 아니다 — 사용자 오류 표시 없이 조용한 재생성 경로.
 * - unavailable: private 모드 등 — 복구 대상 아님(데이터 없음), 전역 배너 고지(C-5). 측정은 가능.
 * - corrupted: open/upgrade 실패(비-가용성)·VersionError·meta 불일치·full-scan 실패
 *   (zod·INV-03·INV-19·INV-20) → 복구 UI.
 */
export type PersistenceStatus =
  | {status: 'ready'; detail: 'ok' | 'recreated'}
  | {status: 'unavailable'; reason: 'no-indexeddb' | 'open-failed'}
  | {status: 'corrupted'}
