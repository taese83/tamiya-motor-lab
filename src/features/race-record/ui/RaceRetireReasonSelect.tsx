import {Box, Button, Chip, Typography} from '@mui/material'
import {useEffect, useId, useRef, useState} from 'react'

import {RETIRE_REASON_TREE} from '@shared/config/domain'
import {layoutTokens} from '@shared/config/design-tokens'

import type {RetireReason, RetireReasonNode} from '@shared/config/domain'

// RaceRetireReasonSelect (R20 — retire-reason-chipset §입력 UX, D-R1·D-R4·D-R5).
// RETIRE_REASON_TREE를 재귀 드릴다운으로 탐색해 이탈 사유 leaf **하나**를 고른다(단일 선택).
// 외부 계약은 value·onChange뿐이고 드릴다운 뷰 상태(현재 경로)는 내부 소유 — 저장은 항상
// 가장 구체적으로 고른 leaf key 하나(트리가 경로·인과 메타를 복원한다, domain.ts 계약).
//
// 구조는 n단 재귀 대응: 노드에 children이 있으면 branch(탭 → 한 단계 드릴다운), 없으면
// leaf(탭 → onChange(key), 선택 칩 재탭 → onChange(null) 해제). 현재 트리는 점프만 2단이지만
// 세부가 더 자라도(예: 공중 자세 → 롤/요/피치) 이 컴포넌트는 수정 없이 따라간다.

export interface RaceRetireReasonSelectProps {
  /** 선택된 말단(leaf) 사유 key — 미선택(옵션 필드)이면 null */
  value: RetireReason | null
  /** leaf 탭 → 그 key, 선택된 칩 재탭 → null(해제). branch 탭은 뷰 전환만(호출 없음) */
  onChange: (next: RetireReason | null) => void
}

// ── 뷰 로직 헬퍼 (드릴다운 경로 계산 — 도메인 의미 아님, domain.ts 파생 헬퍼와 중복 없음) ──

/**
 * 루트에서 leaf key까지의 **branch 조상 key 경로**를 DFS로 찾는다(leaf 자신 제외).
 * 반환값이 곧 그 leaf가 보이는 드릴다운 뷰의 경로다 — top-level leaf면 [](최상위 뷰),
 * 트리에 없으면 null. branch key 자체는 매칭하지 않는다(저장 대상은 leaf뿐 — domain 규칙 정합).
 */
function branchPathOf(nodes: readonly RetireReasonNode[], key: string): readonly string[] | null {
  for (const node of nodes) {
    if (node.children !== undefined) {
      const childPath = branchPathOf(node.children, key)
      if (childPath !== null) return [node.key, ...childPath]
      continue
    }
    if (node.key === key) return []
  }
  return null
}

/** 드릴다운 key 경로 → branch 노드열(breadcrumb 라벨·현재 children 도출). 어긋난 꼬리는 버린다 */
function branchNodesAt(path: readonly string[]): readonly RetireReasonNode[] {
  const branches: RetireReasonNode[] = []
  let level: readonly RetireReasonNode[] = RETIRE_REASON_TREE
  for (const key of path) {
    const branch = level.find(node => node.key === key)
    if (branch === undefined || branch.children === undefined) break
    branches.push(branch)
    level = branch.children
  }
  return branches
}

// ── 최상위 뷰 그룹핑 (D-R1 표시 구조 — speedRelated로 속도형/기계형을 가른다) ─────────────
// escape(기타·기억 안 남)는 유형 그룹이 아니라 "1탭 마감" 탈출구라 헤더 없이 별도 행 —
// 표시 위치만의 프레젠테이션 관심사다(도메인 의미는 트리의 speedRelated·causal이 소유).
const ESCAPE_KEY = 'other'
const SPEED_NODES = RETIRE_REASON_TREE.filter(
  node => node.key !== ESCAPE_KEY && node.speedRelated === true,
)
const MECHANICAL_NODES = RETIRE_REASON_TREE.filter(
  node => node.key !== ESCAPE_KEY && node.speedRelated !== true,
)
const ESCAPE_NODES = RETIRE_REASON_TREE.filter(node => node.key === ESCAPE_KEY)

// ── 스타일 (칩은 44×44 최소 타깃 — Chip 기본 32px 고정 높이를 해제한다, REQ-NFR-003) ──────
const reasonChipSx = {
  minHeight: layoutTokens.touchTargetMin,
  minWidth: layoutTokens.touchTargetMin,
  height: 'auto',
  borderRadius: 999,
  fontSize: '0.875rem',
  '& .MuiChip-label': {px: 1.5, whiteSpace: 'normal', wordBreak: 'keep-all'},
} as const

const chipRowSx = {display: 'flex', flexWrap: 'wrap', gap: 1} as const

const groupHeaderSx = {
  display: 'block',
  color: 'text.secondary',
  fontWeight: 700,
  lineHeight: 1.2,
} as const

export function RaceRetireReasonSelect({value, onChange}: RaceRetireReasonSelectProps) {
  const speedHeaderId = useId()
  const mechanicalHeaderId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)

  // 드릴다운 뷰 상태 — 초기값: value가 branch 하위 leaf면(수정 진입) 그 branch 뷰를 연 채 시작
  const [drillPath, setDrillPath] = useState<readonly string[]>(
    () => (value !== null ? branchPathOf(RETIRE_REASON_TREE, value) : null) ?? [],
  )

  // 외부에서 value가 바뀌어 현재 뷰 밖을 가리키면 그 위치로 스냅 — React 공식
  // "props 변화에 따른 state 조정" 패턴(조건부 render 중 자기 setState, effect 아님).
  // 해제(null)는 뷰를 옮기지 않는다 — 재탭 해제 직후 같은 자리에서 다시 고를 수 있어야 한다.
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    if (value !== null) {
      const target = branchPathOf(RETIRE_REASON_TREE, value)
      if (target !== null && target.join('/') !== drillPath.join('/')) setDrillPath(target)
    }
  }

  // 뷰 전환 시 포커스 연속성 — 탭한 칩이 다음 뷰에서 사라지므로 방치하면 포커스가 body로
  // 떨어진다(키보드 사용자는 폼 처음부터 다시 이동). 드릴다운 → [뒤로], 복귀 → 방금 닫은
  // branch 칩으로 넘긴다. 사용자 조작에만 반응한다(초기 mount·외부 value 스냅은 대상 아님 —
  // 시트 오픈 포커스([측정])를 빼앗지 않는다).
  const pendingFocusRef = useRef<{kind: 'back'} | {kind: 'chip'; key: string} | null>(null)
  useEffect(() => {
    const pending = pendingFocusRef.current
    if (pending === null) return
    pendingFocusRef.current = null
    if (pending.kind === 'back') {
      backButtonRef.current?.focus()
      return
    }
    rootRef.current?.querySelector<HTMLButtonElement>(`[data-reason-key="${pending.key}"]`)?.focus()
  })

  const branches = branchNodesAt(drillPath)
  const currentBranch = branches.at(-1)
  const breadcrumbLabel = branches.map(branch => branch.label).join(' › ')

  const openBranch = (node: RetireReasonNode) => {
    pendingFocusRef.current = {kind: 'back'}
    setDrillPath([...branches.map(branch => branch.key), node.key])
  }

  const goBack = () => {
    if (currentBranch !== undefined) {
      pendingFocusRef.current = {kind: 'chip', key: currentBranch.key}
    }
    setDrillPath(branches.slice(0, -1).map(branch => branch.key))
  }

  const renderNodeChip = (node: RetireReasonNode) => {
    const isBranch = node.children !== undefined && node.children.length > 0
    if (isBranch) {
      // branch — 탭하면 한 단계 드릴다운(선택 아님). 자식이 또 branch면 같은 로직으로 재귀
      return (
        <Chip
          key={node.key}
          component="button"
          type="button"
          data-reason-key={node.key}
          clickable
          variant="outlined"
          onClick={() => openBranch(node)}
          label={
            <Box component="span" sx={{display: 'inline-flex', alignItems: 'center', gap: 0.5}}>
              {node.label}
              {/* 세부가 이어짐을 알리는 장식 — 의미는 라벨과 드릴다운 뷰 전환이 전달 */}
              <Box component="span" aria-hidden="true" sx={{fontWeight: 700}}>
                ›
              </Box>
            </Box>
          }
          sx={reasonChipSx}
        />
      )
    }
    const selected = value === node.key
    return (
      <Chip
        key={node.key}
        component="button"
        type="button"
        data-reason-key={node.key}
        clickable
        aria-pressed={selected}
        variant={selected ? 'filled' : 'outlined'}
        color={selected ? 'primary' : 'default'}
        // 트리 계약: children 없는 노드의 key = 저장 가능한 leaf(RetireReason).
        // domain의 assertAllRetireReasonLeafKeys가 컴파일 타임에 정합을 보장하므로 안전한 단언이다.
        onClick={() => onChange(selected ? null : (node.key as RetireReason))}
        // 선택 표시: 채움색(filled) + fontWeight 700 + aria-pressed(체크 제거 — R21). 색 단독 아님
        label={node.label}
        sx={[reasonChipSx, selected && {fontWeight: 700}]}
      />
    )
  }

  return (
    <Box
      ref={rootRef}
      role="group"
      aria-label="이탈 사유 선택"
      sx={{width: '100%', px: 1.75, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5}}>
      {currentBranch === undefined ? (
        // ── 최상위 뷰 — 섹션 칩을 speedRelated 그룹 헤더와 함께 노출(색·위치 아닌 텍스트로 구분)
        <>
          <Box role="group" aria-labelledby={speedHeaderId}>
            <Typography id={speedHeaderId} variant="caption" sx={{...groupHeaderSx, mb: 0.75}}>
              속도형 · 전압과 관련
            </Typography>
            <Box sx={chipRowSx}>{SPEED_NODES.map(renderNodeChip)}</Box>
          </Box>
          <Box role="group" aria-labelledby={mechanicalHeaderId}>
            <Typography id={mechanicalHeaderId} variant="caption" sx={{...groupHeaderSx, mb: 0.75}}>
              기계형 · 전압과 무관
            </Typography>
            <Box sx={chipRowSx}>{MECHANICAL_NODES.map(renderNodeChip)}</Box>
          </Box>
          <Box sx={chipRowSx}>{ESCAPE_NODES.map(renderNodeChip)}</Box>
        </>
      ) : (
        // ── 드릴다운 뷰 — [뒤로] + breadcrumb + 현재 branch의 children 칩
        <>
          <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
            <Button
              ref={backButtonRef}
              variant="text"
              onClick={goBack}
              sx={{
                minWidth: layoutTokens.touchTargetMin,
                minHeight: layoutTokens.touchTargetMin,
                px: 1,
              }}>
              <Box component="span" aria-hidden="true" sx={{mr: 0.5}}>
                ‹
              </Box>
              뒤로
            </Button>
            <Typography component="span" variant="body2" sx={{fontWeight: 700, lineHeight: 1.2}}>
              {breadcrumbLabel}
              <Box component="span" aria-hidden="true" sx={{ml: 0.5}}>
                ›
              </Box>
            </Typography>
          </Box>
          <Box role="group" aria-label={`${breadcrumbLabel} 세부 사유`} sx={chipRowSx}>
            {(currentBranch.children ?? []).map(renderNodeChip)}
          </Box>
        </>
      )}
    </Box>
  )
}
