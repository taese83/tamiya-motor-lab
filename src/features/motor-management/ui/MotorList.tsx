import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {Box, Stack} from '@mui/material'
import {useMemo, useState} from 'react'

import {MotorRow} from './MotorRow'

import type {Announcements, DragEndEvent, ScreenReaderInstructions} from '@dnd-kit/core'
import type {MotorSummary} from '@entities/motor'

// MotorList (component-spec v2 §5.1 — DnD 컨텍스트 소유, T-6).
// DndContext + SortableContext(verticalListSortingStrategy). 드롭/놓기 확정 시
// onReorder(orderedIds) — entity id 순열만(view index 금지). 낙관 재배열은 로컬 상태,
// commit settle 후 해제(성공: canonical 확정 재렌더 / 실패: IDB 순서 롤백 렌더 — §5.3).
// 상태 전수: populated / empty(상위 EmptyState — 본 컴포넌트 미렌더) / dragging /
// reorder-pending(입력 차단 없음 — 낙관) / reorder-error(롤백 — 안내 copy는 소비 페이지 소관).
// v2.2: 인라인 확장 폐지 — 행 탭은 onSelect(상세 페이지 진입).

export interface MotorListProps {
  /** sortOrder asc (listMotorSummaries) */
  summaries: ReadonlyArray<MotorSummary>
  /**
   * 드롭/놓기 확정 — entity id 순열. useReorderMotors().mutateAsync(...)의 Promise를 반환하면
   * settle 시점(성공 invalidate·실패 refetch 정정 완료)에 낙관 순서를 해제한다.
   * 실패 reject 처리는 소비 페이지 소관.
   */
  onReorder: (orderedIds: string[]) => void | Promise<unknown>
  /** 행 본체 탭 — 상세 페이지 진입 (v2.2: 인라인 확장 폐지) */
  onSelect: (motorId: string) => void
  /**
   * 순서 변경 잠금 (v2.4 — 종류 필터 활성 시 true). `summaries`가 전체의 부분집합이면
   * 반드시 true여야 한다: reorderMotors는 전체 모터 id의 완전한 순열을 요구하므로
   * 부분집합 커밋은 순열 검증 실패(SO-2)로 귀결된다. 안내 문구는 소비 페이지 소관.
   */
  reorderDisabled?: boolean
}

// SR 안내 한국어 주입 (§5.1 — dnd-kit accessibility). 키보드 재정렬은 QA 필수 게이트.
const SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    '순서 변경 핸들입니다. Space 또는 Enter로 들어 올리고, 위/아래 화살표로 이동한 뒤 다시 Space로 놓습니다. Escape로 취소합니다.',
}

export function MotorList({
  summaries,
  onReorder,
  onSelect,
  reorderDisabled = false,
}: MotorListProps) {
  // 낙관 재배열 — 로컬 상태만(query 캐시 직접 조작 금지, api-schema §6.4 어댑터 규약)
  const [optimisticOrder, setOptimisticOrder] = useState<ReadonlyArray<string> | null>(null)

  const orderedSummaries = useMemo(() => {
    if (optimisticOrder === null) return summaries
    const byId = new Map(summaries.map(summary => [summary.motor.id, summary]))
    const ordered: MotorSummary[] = []
    for (const id of optimisticOrder) {
      const summary = byId.get(id)
      if (summary !== undefined) {
        ordered.push(summary)
        byId.delete(id)
      }
    }
    // 낙관 순열 밖 항목(동시 탭 add 경합 등) 방어 — 원 순서대로 말미 유지
    for (const summary of byId.values()) ordered.push(summary)
    return ordered
  }, [summaries, optimisticOrder])

  const ids = useMemo(() => orderedSummaries.map(summary => summary.motor.id), [orderedSummaries])

  const sensors = useSensors(
    // 핸들 전용 활성화지만 스크롤 오발동 방어로 distance 8 유지(CD2-A7)
    useSensor(PointerSensor, {activationConstraint: {distance: 8}}),
    useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
  )

  const nameOf = (id: unknown): string =>
    orderedSummaries.find(summary => summary.motor.id === id)?.motor.name ?? ''
  const positionOf = (id: unknown): number => ids.indexOf(String(id)) + 1

  // 한국어 announcements (§5.1 — 들기/이동/놓기/취소). 위치는 1부터.
  const announcements: Announcements = {
    onDragStart({active}) {
      return `'${nameOf(active.id)}' 들어 올림, 현재 ${positionOf(active.id)}번째 / 총 ${ids.length}개`
    },
    onDragOver({active, over}) {
      if (over === null) return undefined
      return `'${nameOf(active.id)}' ${positionOf(over.id)}번째 위치`
    },
    onDragEnd({active, over}) {
      if (over === null) return `'${nameOf(active.id)}' 순서 변경을 마쳤습니다`
      return `'${nameOf(active.id)}' ${positionOf(over.id)}번째 위치에 놓음`
    },
    onDragCancel() {
      return '순서 변경을 취소했습니다'
    },
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    // 잠금 시 방어 게이트 — 각 행의 useSortable도 disabled지만, 부분집합 커밋은
    // 데이터 정합성 문제라 컨텍스트 레벨에서도 한 번 더 막는다(v2.4)
    if (reorderDisabled) return
    const {active, over} = event
    if (over === null || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    const next = arrayMove([...ids], from, to)
    setOptimisticOrder(next)
    // commit settle 후 낙관 순서 해제 — 성공이면 동일 순서 재렌더(무깜빡임),
    // 실패면 refetch 정정된 IDB 순서로 롤백 렌더(§5.3). reject 안내는 소비 페이지 소관.
    void Promise.resolve(onReorder(next))
      .catch(() => undefined)
      .finally(() => setOptimisticOrder(null))
  }

  // empty는 상위 EmptyState 소관 — 본 컴포넌트 미렌더(§5.1)
  if (summaries.length === 0) return null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{announcements, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS}}
      onDragEnd={handleDragEnd}>
      <SortableContext items={[...ids]} strategy={verticalListSortingStrategy}>
        <Stack component="ul" spacing={1} sx={{listStyle: 'none', m: 0, p: 0}}>
          {orderedSummaries.map(summary => (
            // key = stable entity id (렌더 index 금지)
            <Box component="li" key={summary.motor.id}>
              <MotorRow summary={summary} onSelect={onSelect} reorderDisabled={reorderDisabled} />
            </Box>
          ))}
        </Stack>
      </SortableContext>
    </DndContext>
  )
}
