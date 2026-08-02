import type {RetireReason} from '@shared/config/domain'
import {RETIRE_REASON_PRERUN_ITEMS} from '@shared/config/domain'
import {STREAK_LIMIT} from './race-insight'
import type {RaceRecord} from './types'

// 주행 전 체크리스트 파생 selector (R30 race-autofill U2 — REQ-AF-004·006, DL-038).
// RaceRecord[] → 사유 그룹 목록 순수 함수 — 저장·IO·React 없음, 표시 전용(ephemeral) 데이터의
// 원천. 입력은 최신순(desc) 그대로 — 재정렬 금지, Date·난수 없음, 결정론(동일 입력=동일 출력).
// 윈도우는 STREAK_LIMIT(5) 재사용 — streak과 같은 시야(새 경계 발명 금지).

/** 체크리스트 사유 그룹 — 근거 라벨은 UI가 retireReasonRowLabel(reason)+count로 조립 */
export interface PrerunChecklistGroup {
  reason: RetireReason
  count: number
  items: ReadonlyArray<string> // RETIRE_REASON_PRERUN_ITEMS에서 채택된 점검 항목(절삭 반영)
}

// 선정 규칙 상수 (requirements §핵심 산출 3 — 수직 예산):
// 상위 2개 사유 채택, 총 3항목 상한(초과 시 후순위 사유의 항목부터 절삭).
const MAX_REASONS = 2
const MAX_TOTAL_ITEMS = 3

/**
 * 주행 전 체크리스트 파생 (REQ-AF-004) — [] = 블록 비노출(REQ-AF-006, D5 침묵).
 * 규칙: result 확정 회차 최신 STREAK_LIMIT(5)건만 스캔(미정은 건너뜀·카운트 제외)
 * → retired+retireReason 보유만 집계 → leaf dedupe → 빈도 내림차순·동률 시 최신 우선
 * → 상위 MAX_REASONS 사유 → 총 items ≤ MAX_TOTAL_ITEMS(후순위 사유부터 절삭).
 */
export function selectPrerunChecklist(races: ReadonlyArray<RaceRecord>): ReadonlyArray<PrerunChecklistGroup> {
  // 1) 윈도우 스캔 + 집계: 확정 회차 최신 5건 — computeRaceInsight의 streak 수집과 같은 시야.
  //    Map 삽입 순서 = 첫 등장 순서(desc 입력이라 최신 우선) — 동률 tie-break의 근거.
  const countByReason = new Map<RetireReason, number>()
  let resolvedSeen = 0
  for (const race of races) {
    if (race.result === undefined) continue // 미정은 건너뜀·카운트 제외 (S03: 오류 아님, 조용히 축소)
    resolvedSeen += 1
    if (race.result === 'retired' && race.retireReason !== undefined) {
      countByReason.set(race.retireReason, (countByReason.get(race.retireReason) ?? 0) + 1)
    }
    if (resolvedSeen >= STREAK_LIMIT) break
  }

  // 유효 사유 0건(이탈 없음·사유 미입력만) → 비노출
  if (countByReason.size === 0) return []

  // 2) 빈도 내림차순, 동률이면 최신 우선 — Map 순회는 삽입 순서(=최신 첫 등장 순)를 보존하고
  //    Array.prototype.sort는 stable이므로 빈도 비교만으로 tie-break이 완성된다(재정렬 발명 없음).
  const ranked = [...countByReason.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_REASONS)

  // 3) 항목 채택: 사유 순서대로 맵 항목을 담되 총 3항목 상한 — 후순위 사유 항목부터 절삭.
  const groups: PrerunChecklistGroup[] = []
  let totalItems = 0
  for (const [reason, count] of ranked) {
    const remaining = MAX_TOTAL_ITEMS - totalItems
    if (remaining <= 0) break
    const items = RETIRE_REASON_PRERUN_ITEMS[reason].slice(0, remaining)
    if (items.length === 0) continue // 방어선 — 현재 맵은 leaf당 1~2항목이라 도달 불가
    groups.push({reason, count, items})
    totalItems += items.length
  }
  return groups
}
