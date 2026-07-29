import {Box} from '@mui/material'
import {measureStatusTokens, motionTokens, srOnlySx} from '@shared/config/design-tokens'
import type {MeasureStatusVisual} from '@shared/config/design-tokens'
import type {ReactElement} from 'react'

// MeasureStatus canonical 타입은 state-contract 확정 대상(component-spec §7.1-1).
// shared 단일 정의가 생기기 전까지 theme 토큰 키(6종)에서 파생해
// 토큰-상태 1:1 결속을 컴파일 타임에 보장한다.
type MeasureStatus = keyof typeof measureStatusTokens

export interface MeasureStatusLabelProps {
  /** 측정 상태 6종 — `measureStatusTokens` 키와 1:1 */
  status: keyof typeof measureStatusTokens
  /**
   * 상태 전이 시에만 갱신되는 스크린리더 알림 문구 (component-spec §2.6).
   * 수치 갱신으로 변경 금지 — debounce·중복 억제는 store 셀렉터 계층 소관.
   */
  announcement: string
}

// 라벨 문구는 design-system §2 표를 내부 상수로 소유 (component-spec §2.3)
const STATUS_LABELS: Record<MeasureStatus, string> = {
  idle: '측정 대기',
  measuring: '측정 중',
  stable: '측정 완료 · 확정',
  'weak-signal': '신호 약함',
  'no-permission': '마이크 권한 필요',
  suspended: '오디오 일시 중지됨',
}

type StatusIconName = Exclude<MeasureStatusVisual['icon'], 'pulse-dot'>

// 개별 인라인 SVG — @mui/icons-material 미설치 (design-system §9 아이콘 인벤토리)
const ICON_PATHS: Record<StatusIconName, ReactElement> = {
  mic: (
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
  ),
  lock: (
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
  ),
  'signal-low': (
    <>
      <path d="M4 20h4v-6H4z" />
      <path d="M10 20h4V9h-4zM16 20h4V4h-4z" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  'mic-off': (
    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3 3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73z" />
  ),
  pause: <path d="M6 19h4V5H6zM14 19h4V5h-4z" />,
}

function StatusIcon({name}: {name: StatusIconName}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="currentColor">
      {ICON_PATHS[name]}
    </svg>
  )
}

// measuring 펄스 점 — 아이콘이 아니라 CSS 원 (component-spec §2.3).
// reduced-motion이면 정지 점 — 라벨 "측정 중"이 상태를 전달한다.
function PulseDot() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        backgroundColor: 'currentColor',
        flexShrink: 0,
        '@keyframes mml-status-pulse': {
          '0%, 100%': {opacity: 1, transform: 'scale(1)'},
          '50%': {opacity: 0.35, transform: 'scale(0.8)'},
        },
        animation: `mml-status-pulse ${motionTokens.pulsePeriodMs}ms ease-in-out infinite`,
        '@media (prefers-reduced-motion: reduce)': {animation: 'none'},
      }}
    />
  )
}

/**
 * S1 Z1 상태 라벨 — 라벨 텍스트+색+아이콘 3요소 캡슐 (REQ-NFR-003, component-spec §2.3).
 * sr 알림 단일 채널: 내부 visually-hidden `role="status"`에 announcement만 렌더.
 * 시각 라벨에는 live 속성 없음(중복 알림 금지). 높이 48px(3rem) 고정 — Z1 계약.
 */
export function MeasureStatusLabel({status, announcement}: MeasureStatusLabelProps) {
  const visual = measureStatusTokens[status]
  const icon = visual.icon
  return (
    <Box
      sx={{
        height: '3rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        color: visual.fg,
      }}>
      {icon === 'pulse-dot' ? <PulseDot /> : <StatusIcon name={icon} />}
      <Box component="span" sx={{fontSize: '1rem', fontWeight: 600}}>
        {STATUS_LABELS[status]}
      </Box>
      {/* live 영역 단일 채널 — 시각 라벨과 별도로 낭독되지 않게 sr 전용으로만 둔다 */}
      <Box role="status" sx={srOnlySx}>
        {announcement}
      </Box>
    </Box>
  )
}
