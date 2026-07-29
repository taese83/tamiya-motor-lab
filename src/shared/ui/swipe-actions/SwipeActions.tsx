import {Box} from '@mui/material'
import {useCallback, useEffect, useRef, useState} from 'react'

import {layoutTokens, motionTokens} from '@shared/config/design-tokens'

import type {PointerEvent as ReactPointerEvent, FocusEvent, ReactNode} from 'react'

// SwipeActions (v2.16) — 목록 행을 왼쪽으로 밀어 우측 액션 트레이를 여는 프리미티브.
//
// 이 컴포넌트는 layout-spec LD-4의 "스와이프 기각" 결정을 뒤집는 자리이므로,
// 기각 사유 3개를 각각 어떻게 막았는지 여기에 남긴다:
//
// ① "발견성이 낮다" → 액션은 **항상 DOM에 있는 진짜 button**이다. 제스처는 시각적 노출
//    수단일 뿐 유일한 경로가 아니다. Tab 포커스가 트레이에 들어오면 자동으로 열려서
//    (onFocus) 보이지 않는 컨트롤에 포커스가 앉는 상태를 만들지 않는다(WCAG 2.4.11).
// ② "세로 스크롤과 제스처 경합" → `touch-action: pan-y`로 세로 패닝은 브라우저에 남기고,
//    첫 이동에서 **방향을 락**한다(|dx|>|dy| 이면서 임계 초과일 때만 가로 점유).
//    세로가 우세하면 그 제스처는 즉시 포기해 스크롤을 방해하지 않는다.
// ③ "가시 버튼이 오입력 복구에 확실" → 파괴 액션은 여전히 ConfirmDialog를 거친다.
//    풀 스와이프 즉시 삭제 같은 지름길은 만들지 않는다(트레이 열기까지가 제스처의 최대 권한).
//
// 열림 상태를 소유하지 않는다(controlled) — 목록이 "한 번에 한 행만" 규칙을 소유해야
// 두 행이 동시에 열려 액션 대상이 모호해지는 상태를 구조적으로 없앨 수 있다.

/** 방향 락 임계(px) — 이 거리 안에서는 아직 스크롤/스와이프를 판정하지 않는다 */
const DIRECTION_LOCK_PX = 10
/** 열림 확정 임계 — 트레이 폭의 이 비율을 넘겨야 열린다(살짝 스친 제스처로 열리지 않게) */
const OPEN_RATIO = 0.5

export interface SwipeActionsProps {
  /**
   * 우측 트레이에 놓일 액션. **항상 렌더**되며 포커스 가능해야 한다 —
   * 제스처 없이도 도달할 수 있는 경로가 이 컴포넌트의 a11y 계약이다.
   */
  actions: ReactNode
  /** 트레이 폭(px). 액션 개수 × 타깃 폭으로 소비처가 계산한다 */
  trayWidth: number
  /** 열림 상태 — 단일 열림 규칙은 목록이 소유(controlled) */
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * 제스처 비활성. 드래그 정렬 중처럼 다른 제스처가 행을 점유할 때 true.
   * 트레이 액션 자체는 비활성되지 않는다(키보드 경로 유지).
   */
  gestureDisabled?: boolean | undefined
  /** 행 본체 */
  children: ReactNode
}

export function SwipeActions({
  actions,
  trayWidth,
  open,
  onOpenChange,
  gestureDisabled = false,
  children,
}: SwipeActionsProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  // 드래그 중 실시간 오프셋(px, 음수=왼쪽). null이면 open 상태가 위치를 결정한다.
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  /**
   * 같은 오프셋의 ref 사본 — 놓는 순간의 판정은 **render 타이밍에 의존하면 안 된다**.
   * 빠른 플릭에서 마지막 pointermove와 pointerup이 한 프레임에 합쳐지면 up 핸들러가
   * 이전 render의 `dragOffset`(=null)을 보고 "열지 않음"으로 오판한다 — 제스처가 조용히
   * 씹히는 종류의 버그라 ref로 즉시 반영되는 값을 따로 들고 간다.
   */
  const offsetRef = useRef<number | null>(null)

  const startRef = useRef<{x: number; y: number; base: number} | null>(null)
  const lockedRef = useRef<'horizontal' | 'vertical' | null>(null)
  // 제스처로 이동이 발생했으면 뒤따르는 click을 삼킨다 — 스와이프가 상세 진입으로 오발동하지 않게
  const didSwipeRef = useRef(false)

  const offset = dragOffset ?? (open ? -trayWidth : 0)

  const endGesture = useCallback(() => {
    startRef.current = null
    lockedRef.current = null
    offsetRef.current = null
    setDragOffset(null)
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (gestureDisabled || event.pointerType === 'mouse') return
    // 드래그 핸들 등 자기 제스처를 가진 영역에서 시작한 포인터는 건드리지 않는다
    if ((event.target as HTMLElement).closest('[data-swipe-ignore]') !== null) return
    startRef.current = {x: event.clientX, y: event.clientY, base: open ? -trayWidth : 0}
    lockedRef.current = null
    didSwipeRef.current = false
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (start === null) return

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y

    if (lockedRef.current === null) {
      // 아직 판정 전 — 우세한 축이 임계를 넘을 때 한 번만 락한다
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > DIRECTION_LOCK_PX) {
        // 세로 우세: 이 제스처는 스크롤이다. 포기하고 브라우저에 넘긴다(pan-y가 처리)
        lockedRef.current = 'vertical'
        startRef.current = null
        return
      }
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > DIRECTION_LOCK_PX) {
        lockedRef.current = 'horizontal'
      } else {
        return
      }
    }
    if (lockedRef.current !== 'horizontal') return

    didSwipeRef.current = true
    // 왼쪽으로만 열린다 — 오른쪽 끝은 닫힘(0)에서 멈춘다(고무줄 없음: 위치가 곧 상태)
    const next = Math.min(0, Math.max(-trayWidth, start.base + dx))
    offsetRef.current = next
    setDragOffset(next)
  }

  const handlePointerUp = () => {
    const wasHorizontal = lockedRef.current === 'horizontal'
    // state가 아니라 ref를 읽는다 — 위 offsetRef 주석의 프레임 합쳐짐 방어
    const current = offsetRef.current
    endGesture()
    if (!wasHorizontal || current === null) return
    onOpenChange(current < -trayWidth * OPEN_RATIO)
  }

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (didSwipeRef.current) {
      // 스와이프 끝의 click — 행 본체 탭으로 오해되면 상세로 튄다
      event.preventDefault()
      event.stopPropagation()
      didSwipeRef.current = false
      return
    }
    // 열린 상태에서 행 본체를 누르면 "닫기"가 먼저다 — 열어둔 채 탭했다가
    // 의도치 않게 화면이 전환되는 것을 막는다(트레이 액션은 아래 조건에서 제외).
    if (open && (event.target as HTMLElement).closest('[data-swipe-tray]') === null) {
      event.preventDefault()
      event.stopPropagation()
      onOpenChange(false)
    }
  }

  // 트레이에 포커스가 들어오면 보이게 연다 — 보이지 않는 컨트롤에 포커스가 앉지 않게(WCAG 2.4.11)
  const handleTrayFocus = () => {
    if (!open) onOpenChange(true)
  }
  const handleTrayBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    // 트레이 안에서 버튼 간 이동이면 유지, 행 밖으로 나가면 닫는다
    if (next instanceof Node && rootRef.current?.contains(next) === true) return
    onOpenChange(false)
  }

  // 열린 행은 ESC로 닫는다(제스처 되돌리기 수단 — 포인터 없이도 취소 가능)
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  return (
    <Box ref={rootRef} sx={{position: 'relative', overflow: 'hidden'}}>
      {/*
        트레이 — 행 본체 아래(z축)에 깔려 있고, 본체가 왼쪽으로 밀리면서 드러난다.
        `inset`으로 행 높이를 그대로 따라가므로 행 높이가 달라도 세로로 꽉 찬다.
      */}
      <Box
        data-swipe-tray=""
        onFocus={handleTrayFocus}
        onBlur={handleTrayBlur}
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: trayWidth,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'flex-end',
        }}>
        {actions}
      </Box>

      <Box
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={endGesture}
        onClickCapture={handleClickCapture}
        style={{transform: `translate3d(${offset}px, 0, 0)`}}
        sx={{
          position: 'relative',
          /*
           * 콘텐츠 레이어는 **불투명**해야 한다. 트레이가 바로 뒤에 깔려 있으므로 이 면이
           * 반투명하면 닫힌 상태에서도 아이콘·라벨이 행 수치 위로 비쳐 보인다
           * (실측으로 발견: MotorRow의 종류색 카드는 alpha 0.16 tint여서 트레이가 그대로 새어나왔다).
           *
           * 행 자신의 배경에 맡기지 않고 이 레이어가 책임진다 — 소비처가 반투명 카드를
           * 쓰더라도 "닫힌 트레이는 보이지 않는다"가 깨지지 않아야 한다.
           * background.default = 행이 놓인 페이지 표면색이라 합성 결과는 이전과 동일하다.
           */
          bgcolor: 'background.default',
          // 세로 패닝은 브라우저에 남긴다 — 가로만 우리가 판정한다(기각 사유 ② 대응)
          touchAction: 'pan-y',
          // 드래그 중에는 트랜지션을 끄고 손가락을 그대로 따라간다
          transition: theme =>
            dragOffset !== null
              ? 'none'
              : theme.transitions.create('transform', {duration: motionTokens.enterMs}),
          '@media (prefers-reduced-motion: reduce)': {transition: 'none'},
        }}>
        {children}
      </Box>
    </Box>
  )
}

/** 트레이 액션 1개가 차지하는 폭 — 최소 타깃(44)보다 넉넉하게 잡아 오탭을 줄인다 */
export const SWIPE_ACTION_WIDTH = layoutTokens.touchTargetMin + 12
