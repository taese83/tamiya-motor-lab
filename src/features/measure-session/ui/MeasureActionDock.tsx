import {Box, Button} from '@mui/material'

import type {MeasureView} from './measure-view'

/**
 * Z3 단일 슬롯 액션 union (component-spec v2 §2.7 — 작업 계약의 kind 명명 채택).
 * boolean prop 조합 금지 — 3분기 이상은 discriminated union(재사용 원칙 §0.3).
 */
export type MeasureAction =
  // standalone 모드 상시 [기록] — onPress는 소비자(collect-flow) 주입. v2.23: 5초 하한 제거(즉시)
  | {kind: 'record'; disabled: boolean}
  | {kind: 'activate'} // awaiting-gesture — [탭하여 시작] primary, 1탭 계약(M-1, QA 대상)
  | {kind: 'retry-permission'} // [권한 다시 요청] primary
  | {kind: 'settings-help'; expanded: boolean} // [설정 방법 보기] — aria-expanded 토글
  | {kind: 'resume'} // [탭하여 다시 시작] primary
  // 왕복 모드 — [레이스로/모터로 돌아가기] secondary. v2.5: 진입점이 2곳이라 origin으로 라벨 분기
  | {kind: 'back-to-origin'; motorName: string; origin: 'race' | 'motor'}

/**
 * view → action 순수 산출 (unit 대상 — §2.7).
 * - handoffReturn(왕복 slot 존재) 시 **모든 view-status에서 back-to-origin으로 치환** —
 *   [기록] 진입점 0개(INV-21). origin은 라벨 분기에만 쓰인다(v2.5).
 * - [기록] 활성 = measuring && persistence ready (M-5 — measuring이면 수치 비null 타입 보장).
 *   persistence `unavailable` → disabled 상시(사유는 전역 배너 소관).
 */
export function deriveMeasureAction(
  view: MeasureView,
  handoffReturn: {motorName: string; origin: 'race' | 'motor'} | null,
  persistenceReady: boolean,
): MeasureAction {
  if (handoffReturn !== null) {
    return {
      kind: 'back-to-origin',
      motorName: handoffReturn.motorName,
      origin: handoffReturn.origin,
    }
  }
  switch (view.status) {
    case 'starting':
    case 'insecure':
    case 'weak-signal':
      return {kind: 'record', disabled: true}
    case 'measuring':
      // v2.23(사용자): standalone 측정([기록])은 **5초 하한 없이 즉시 기록**한다.
      // 이 record 액션은 handoffReturn===null일 때만 도달한다(왕복 모드는 위에서 back-to-origin으로
      // 치환) — 즉 여기는 항상 standalone이다. 따라서 v2.18의 measuredMs 게이트를 여기서 제거한다.
      // 왕복(모터·레이스) 자동 확정의 5초 하한은 MeasurePage의 useRaceAutoCollect가 그대로 유지한다.
      return {kind: 'record', disabled: !persistenceReady}
    case 'awaiting-gesture':
      return {kind: 'activate'}
    case 'no-permission':
      return view.permanent
        ? {kind: 'settings-help', expanded: view.settingsHelpOpen}
        : {kind: 'retry-permission'}
    case 'suspended':
      return {kind: 'resume'}
  }
}

export interface MeasureActionDockProps {
  action: MeasureAction
  /** [기록] 탭 — 스냅샷 캡처·시트 오픈은 소비자(collect-flow) 소유 (§4.3) */
  onRecord: () => void
  /** awaiting-gesture [탭하여 시작] — 캡처 재시도는 탭 핸들러 내 호출(제스처 요건, M-1) */
  onActivate: () => void
  /** no-permission 일시 — getUserMedia 재시도 (제스처 내) */
  onRetryPermission: () => void
  /** no-permission 영구 — view.settingsHelpOpen 토글 */
  onToggleSettingsHelp: () => void
  /** suspended — 탭 핸들러 내 resume() */
  onResume: () => void
  /** 왕복 모드 — cancel 아님: 슬롯 생존 복귀는 소비자(page)가 조립 (§7.2 ⑤). origin 무관 동일 동작 */
  onBackToOrigin: () => void
}

interface SlotConfig {
  label: string
  variant: 'contained' | 'outlined'
  onClick: () => void
  /** aria-disabled 소프트 비활성 — 상시 렌더·자리 이동 없음(M-5). 사유 전달은 Z2 문구/전역 배너 소관 */
  softDisabled: boolean
  ariaExpanded?: boolean | undefined
  ariaControls?: string | undefined
}

type SlotHandlers = Pick<
  MeasureActionDockProps,
  | 'onRecord'
  | 'onActivate'
  | 'onRetryPermission'
  | 'onToggleSettingsHelp'
  | 'onResume'
  | 'onBackToOrigin'
>

// §2.2 표 — 슬롯 내용이 유일한 가변 요소. record 외 전부 primary contained(라임 컷코너 — theme 자동),
// back-to-origin만 outlined secondary. 실패 톤 버튼 없음(awaiting-gesture 중립 계약 — M-1).
function slotConfig(action: MeasureAction, handlers: SlotHandlers): SlotConfig {
  switch (action.kind) {
    case 'record':
      return {
        label: '기록',
        variant: 'contained',
        onClick: handlers.onRecord,
        softDisabled: action.disabled,
      }
    case 'activate':
      return {
        label: '탭하여 시작',
        variant: 'contained',
        onClick: handlers.onActivate,
        softDisabled: false,
      }
    case 'retry-permission':
      return {
        label: '권한 다시 요청',
        variant: 'contained',
        onClick: handlers.onRetryPermission,
        softDisabled: false,
      }
    case 'settings-help':
      return {
        label: '설정 방법 보기',
        variant: 'contained',
        onClick: handlers.onToggleSettingsHelp,
        softDisabled: false,
        // v2.20: 안내가 Dialog로 바뀌어 aria-expanded/aria-controls를 제거했다 —
        // 대화상자를 여는 버튼에 disclosure 패턴을 쓰면 스크린리더에 잘못된 구조를 알린다.
      }
    case 'resume':
      return {
        label: '탭하여 다시 시작',
        variant: 'contained',
        onClick: handlers.onResume,
        softDisabled: false,
      }
    case 'back-to-origin':
      return {
        label: action.origin === 'motor' ? '모터로 돌아가기' : '레이스로 돌아가기',
        variant: 'outlined',
        onClick: handlers.onBackToOrigin,
        softDisabled: false,
      }
  }
}

/**
 * S1 Z3 액션 존 v2 (component-spec §2.7) — 단일 슬롯 h56 고정.
 * v1의 [B] 세션 슬롯([다시 측정])·[측정 중지] 폐지 — 자동 시작·연속 측정(M-2·M-3).
 *
 * 슬롯은 상태 전환에도 unmount되지 않는 단일 Button 노드 — 교체 직전 포커스가 슬롯 내부였으면
 * 새 행동으로 그대로 이어진다(§2.7 programmatic focus 계약을 노드 유지로 충족).
 * [기록]은 disabled여도 상시 렌더(aria-disabled — 자리 이동 없음, M-5).
 */
export function MeasureActionDock({
  action,
  onRecord,
  onActivate,
  onRetryPermission,
  onToggleSettingsHelp,
  onResume,
  onBackToOrigin,
}: MeasureActionDockProps) {
  const slot = slotConfig(action, {
    onRecord,
    onActivate,
    onRetryPermission,
    onToggleSettingsHelp,
    onResume,
    onBackToOrigin,
  })
  return (
    <Box sx={{height: '3.5rem', display: 'flex', alignItems: 'center'}}>
      <Button
        fullWidth
        size="large"
        variant={slot.variant}
        onClick={slot.softDisabled ? undefined : slot.onClick}
        aria-disabled={slot.softDisabled ? true : undefined}
        aria-expanded={slot.ariaExpanded}
        aria-controls={slot.ariaControls}
        sx={[
          // v3 컷코너 버튼은 실제 면을 ::before 레이어가 그린다(theme MuiButton 계약) —
          // 루트 배경만 바꾸면 라임 면이 그 위에 남아 다크에서 저대비(실기기 피드백).
          // ::before를 함께 끄고 글자는 text.secondary로 유지(비활성이어도 판독 가능).
          slot.softDisabled &&
            (theme => ({
              color: theme.palette.text.secondary,
              boxShadow: 'none',
              cursor: 'default',
              '&::before': {
                backgroundColor: theme.palette.action.disabledBackground,
                filter: 'none',
              },
              '&:hover': {
                boxShadow: 'none',
                '&::before': {
                  backgroundColor: theme.palette.action.disabledBackground,
                  filter: 'none',
                },
              },
              '&:active': {transform: 'none'},
            })),
        ]}>
        {slot.label}
      </Button>
    </Box>
  )
}
