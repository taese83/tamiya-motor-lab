import {Box, Button, Typography} from '@mui/material'
import {RECORD_DELAY_OPTIONS} from '@shared/config/domain'
import {S1_SETTINGS_HELP_ID} from './constants'
import type {MeasureView} from './measure-view'
import type {RecordDelayKey} from '@shared/config/domain'

/**
 * Z3 단일 슬롯 액션 union (component-spec v2 §2.7 — 작업 계약의 kind 명명 채택).
 * boolean prop 조합 금지 — 3분기 이상은 discriminated union(재사용 원칙 §0.3).
 */
export type MeasureAction =
  // 일반 모드 상시 기록 — v2.7: 단일 [기록]에서 3종(즉시·10초 후·1분 후) 그룹으로 변경.
  // onPress는 소비자(collect-flow) 주입
  | {kind: 'record'; disabled: boolean}
  // v2.7 지연 대기 — 남은 초 표시 + [취소]. view.status보다 우선 판정된다(아래 각주)
  | {kind: 'capture-pending'; label: string; remainingSec: number; waitingForStable: boolean}
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
 * - capturePending(v2.7 지연 대기)은 **view.status보다 먼저** 판정한다: 카운트다운 중 신호가
 *   흔들려 measuring을 벗어나도 대기 표시와 [취소]가 사라지면 사용자가 진행 상황을 잃고
 *   취소 수단도 없어진다. 대기는 만료 후 안정 시점까지 이어지므로 표시가 유지돼야 한다.
 * - [기록] 활성 = measuring && persistence ready (M-5 — measuring이면 수치 비null 타입 보장).
 *   persistence `unavailable` → disabled 상시(사유는 전역 배너 소관).
 */
export function deriveMeasureAction(
  view: MeasureView,
  handoffReturn: {motorName: string; origin: 'race' | 'motor'} | null,
  persistenceReady: boolean,
  capturePending: {label: string; remainingSec: number; waitingForStable: boolean} | null = null,
): MeasureAction {
  if (handoffReturn !== null) {
    return {
      kind: 'back-to-origin',
      motorName: handoffReturn.motorName,
      origin: handoffReturn.origin,
    }
  }
  if (capturePending !== null) return {kind: 'capture-pending', ...capturePending}
  switch (view.status) {
    case 'starting':
    case 'insecure':
    case 'weak-signal':
      return {kind: 'record', disabled: true}
    case 'measuring':
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
  /**
   * 기록 타입 탭 (v2.7) — 즉시/지연 판단·스냅샷 캡처·시트 오픈은 소비자(collect-flow) 소유 (§4.3).
   * 이 컴포넌트는 어떤 타입을 눌렀는지만 전달한다.
   */
  onRecord: (key: RecordDelayKey) => void
  /** 지연 대기 [취소] (v2.7) */
  onCancelCapture: () => void
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
  'onActivate' | 'onRetryPermission' | 'onToggleSettingsHelp' | 'onResume' | 'onBackToOrigin'
>

/** record·capture-pending은 전용 렌더(단일 버튼 아님) — 여기서 다루는 건 단일 슬롯 액션뿐이다 */
type SingleSlotAction = Exclude<MeasureAction, {kind: 'record'} | {kind: 'capture-pending'}>

// §2.2 표 — 슬롯 내용이 유일한 가변 요소. 전부 primary contained(라임 컷코너 — theme 자동),
// back-to-origin만 outlined secondary. 실패 톤 버튼 없음(awaiting-gesture 중립 계약 — M-1).
function slotConfig(action: SingleSlotAction, handlers: SlotHandlers): SlotConfig {
  switch (action.kind) {
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
        ariaExpanded: action.expanded,
        ariaControls: S1_SETTINGS_HELP_ID,
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
 * 소프트 비활성 sx — v3 컷코너 버튼은 실제 면을 ::before 레이어가 그린다(theme MuiButton 계약).
 * 루트 배경만 바꾸면 라임 면이 그 위에 남아 다크에서 저대비(실기기 피드백)이므로 ::before를
 * 함께 끄고 글자는 text.secondary로 유지한다(비활성이어도 판독 가능).
 */
const softDisabledSx = (theme: {palette: {text: {secondary: string}; action: {disabledBackground: string}}}) => ({
  color: theme.palette.text.secondary,
  boxShadow: 'none',
  cursor: 'default',
  '&::before': {backgroundColor: theme.palette.action.disabledBackground, filter: 'none'},
  '&:hover': {
    boxShadow: 'none',
    '&::before': {backgroundColor: theme.palette.action.disabledBackground, filter: 'none'},
  },
  '&:active': {transform: 'none'},
})

const dockSx = {height: '3.5rem', display: 'flex', alignItems: 'center', gap: 1} as const

/**
 * S1 Z3 액션 존 (component-spec §2.7) — h56 고정.
 * v1의 [B] 세션 슬롯([다시 측정])·[측정 중지] 폐지 — 자동 시작·연속 측정(M-2·M-3).
 *
 * v2.7: 기록이 3종(즉시·10초 후·1분 후)이 되어 record 상태만 **3버튼 그룹**을 렌더한다.
 * 단일 Button 노드 유지로 충족했던 §2.7 포커스 연속성 계약은 record ↔ 지연대기 전환에서는
 * 성립하지 않는다(노드 수가 다르다). 대신 존 높이 h56과 좌우 폭을 그대로 유지해 레이아웃은
 * 흔들리지 않으며, 세 버튼은 각각 44px 이상 타깃을 확보한다.
 * 그 외 상태(activate·retry·resume·back-to-origin)는 기존 단일 슬롯 렌더를 그대로 쓴다.
 * 기록 버튼은 disabled여도 상시 렌더(aria-disabled — 자리 이동 없음, M-5).
 */
export function MeasureActionDock({
  action,
  onRecord,
  onCancelCapture,
  onActivate,
  onRetryPermission,
  onToggleSettingsHelp,
  onResume,
  onBackToOrigin,
}: MeasureActionDockProps) {
  // ── v2.7 기록 3종 그룹 — 즉시는 primary contained, 지연 2종은 outlined(빈도·기본값 위계)
  if (action.kind === 'record') {
    return (
      <Box sx={dockSx} role="group" aria-label="기록 방식">
        {RECORD_DELAY_OPTIONS.map(option => {
          const primary = option.delayMs === 0
          return (
            <Button
              key={option.key}
              fullWidth
              variant={primary ? 'contained' : 'outlined'}
              onClick={action.disabled ? undefined : () => onRecord(option.key)}
              aria-disabled={action.disabled ? true : undefined}
              // 짧은 라벨은 3열 폭 확보용 — 스크린리더에는 전체 의미를 전달한다
              aria-label={option.label}
              sx={[{minHeight: 44}, action.disabled && primary && softDisabledSx]}>
              {option.shortLabel}
            </Button>
          )
        })}
      </Box>
    )
  }

  // ── v2.7 지연 대기 — 남은 초(또는 안정 대기) + [취소]. 만료 후에도 표시가 유지된다
  if (action.kind === 'capture-pending') {
    return (
      <Box sx={dockSx}>
        {/* role="status": 남은 초가 바뀔 때마다 읽히지 않게 aria-live는 두지 않고, 텍스트만 갱신 */}
        <Typography variant="body2" sx={{flex: 1, minWidth: 0, color: 'text.primary'}}>
          <Box component="span" sx={{fontWeight: 700}}>
            {action.label}
          </Box>{' '}
          {action.waitingForStable
            ? '— 수치가 안정되면 기록합니다'
            : `— ${action.remainingSec}초 남음`}
        </Typography>
        <Button variant="outlined" onClick={onCancelCapture} sx={{minHeight: 44, flexShrink: 0}}>
          취소
        </Button>
      </Box>
    )
  }

  const slot = slotConfig(action, {
    onActivate,
    onRetryPermission,
    onToggleSettingsHelp,
    onResume,
    onBackToOrigin,
  })
  return (
    <Box sx={dockSx}>
      <Button
        fullWidth
        size="large"
        variant={slot.variant}
        onClick={slot.softDisabled ? undefined : slot.onClick}
        aria-disabled={slot.softDisabled ? true : undefined}
        aria-expanded={slot.ariaExpanded}
        aria-controls={slot.ariaControls}
        sx={[slot.softDisabled && softDisabledSx]}>
        {slot.label}
      </Button>
    </Box>
  )
}
