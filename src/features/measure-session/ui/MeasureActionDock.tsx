import {Box, Button} from '@mui/material'
import {MicIcon} from '@shared/ui/icons'
import {S1_SETTINGS_HELP_ID} from './constants'
import type {MeasureView} from './measure-view'

export interface MeasureActionDockProps {
  view: MeasureView
  /** idle → startCapture (탭 핸들러 내 getUserMedia+resume — REQ-F-001) */
  onActivate: () => void
  /** measuring | weak-signal → stopCapture */
  onStop: () => void
  /** stable → page가 handoff set + navigate */
  onCreateRecord: () => void
  /** stable → 새 세션 (slot clear — INV-14) */
  onRemeasure: () => void
  /** no-permission 일시 */
  onRetryPermission: () => void
  /** no-permission 영구 — view.settingsHelpOpen 토글 */
  onToggleSettingsHelp: () => void
  /** suspended — 탭 핸들러 내 resume() */
  onResume: () => void
}

interface SlotAConfig {
  label: string
  variant: 'contained' | 'outlined'
  size: 'large' | 'medium'
  onClick: () => void
  /** aria-disabled 소프트 비활성 — 사유는 Z2 안내가 전달(§2.5), 포커스 도달 유지 */
  softDisabled: boolean
  withMicIcon: boolean
  ariaExpanded?: boolean | undefined
  ariaControls?: string | undefined
}

type SlotAHandlers = Pick<
  MeasureActionDockProps,
  | 'onActivate'
  | 'onStop'
  | 'onCreateRecord'
  | 'onRetryPermission'
  | 'onToggleSettingsHelp'
  | 'onResume'
>

// §2.2 표 — 슬롯 내용이 유일한 가변 요소. 모든 상태에서 primary 버튼 정확히 1개.
function slotAConfig(view: MeasureView, handlers: SlotAHandlers): SlotAConfig {
  switch (view.status) {
    case 'idle':
      return {
        label: view.activating ? '마이크 준비 중…' : '녹음 활성화',
        variant: 'contained',
        size: 'large',
        onClick: handlers.onActivate,
        softDisabled: !view.secureContext || view.activating, // 스피너 없음 — <1s (§2.5)
        withMicIcon: true,
      }
    case 'measuring':
    case 'weak-signal':
      // D-9 자동 왕복에서 동일 버튼·동일 위치 — 버튼 불변
      return {
        label: '측정 중지',
        variant: 'outlined',
        size: 'medium',
        onClick: handlers.onStop,
        softDisabled: false,
        withMicIcon: false,
      }
    case 'stable':
      // LO-3 확정: 오탭 가드 없음 — stable 진입 시 캡처 이미 자동 정지(UX-A1)
      return {
        label: '이 측정으로 기록 만들기',
        variant: 'contained',
        size: 'large',
        onClick: handlers.onCreateRecord,
        softDisabled: false,
        withMicIcon: false,
      }
    case 'no-permission':
      return view.permanent
        ? {
            label: '설정 방법 보기',
            variant: 'contained',
            size: 'large',
            onClick: handlers.onToggleSettingsHelp,
            softDisabled: false,
            withMicIcon: false,
            ariaExpanded: view.settingsHelpOpen,
            ariaControls: S1_SETTINGS_HELP_ID,
          }
        : {
            label: '권한 다시 요청',
            variant: 'contained',
            size: 'large',
            onClick: handlers.onRetryPermission,
            softDisabled: false,
            withMicIcon: false,
          }
    case 'suspended':
      return {
        label: '탭하여 다시 시작',
        variant: 'contained',
        size: 'large',
        onClick: handlers.onResume,
        softDisabled: false,
        withMicIcon: false,
      }
  }
}

/**
 * S1 Z3 액션 존 (component-spec §2.5) — 슬롯 [A](h56) + [B](h44), 빈 상태여도 높이 예약.
 * [A]는 상태 전환에도 unmount되지 않는 단일 Button 노드 — 슬롯 교체 시 포커스가
 * 유실되지 않고 새 행동으로 그대로 이어진다(§2.5 키보드 연속 조작 계약).
 */
export function MeasureActionDock({
  view,
  onActivate,
  onStop,
  onCreateRecord,
  onRemeasure,
  onRetryPermission,
  onToggleSettingsHelp,
  onResume,
}: MeasureActionDockProps) {
  const a = slotAConfig(view, {
    onActivate,
    onStop,
    onCreateRecord,
    onRetryPermission,
    onToggleSettingsHelp,
    onResume,
  })
  return (
    <Box sx={{display: 'flex', flexDirection: 'column', gap: 1.5}}>
      {/* [A] 행동 슬롯 — h 56px 예약 */}
      <Box sx={{height: '3.5rem', display: 'flex', alignItems: 'center'}}>
        <Button
          fullWidth
          variant={a.variant}
          size={a.size}
          onClick={a.softDisabled ? undefined : a.onClick}
          aria-disabled={a.softDisabled ? true : undefined}
          aria-expanded={a.ariaExpanded}
          aria-controls={a.ariaControls}
          startIcon={a.withMicIcon ? <MicIcon size={20} /> : undefined}
          sx={[
            a.size === 'medium' && {minHeight: '2.75rem', height: '2.75rem'},
            a.softDisabled &&
              (theme => ({
                backgroundColor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
                '&:hover': {backgroundColor: theme.palette.action.disabledBackground},
              })),
          ]}>
          {a.label}
        </Button>
      </Box>
      {/* [B] 세션 슬롯 — stable 전용 [다시 측정], 평시 h 44px 빈 슬롯(높이 예약) */}
      <Box sx={{height: '2.75rem', display: 'flex', alignItems: 'center'}}>
        {view.status === 'stable' && (
          <Button
            fullWidth
            variant="text"
            onClick={onRemeasure}
            sx={{minHeight: '2.75rem', height: '2.75rem'}}>
            다시 측정
          </Button>
        )}
      </Box>
    </Box>
  )
}
