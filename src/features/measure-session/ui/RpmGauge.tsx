import {Box} from '@mui/material'
import {useTheme} from '@mui/material/styles'
import {measureStatusTokens} from '@shared/config/design-tokens'
import type {MeasureView} from './measure-view'

export interface RpmGaugeProps {
  /** S1 측정 상태 — 바늘 표시 여부·각도·dim이 전부 여기서 파생된다 */
  view: MeasureView
}

/* ------------------------------------------------------------------ *
 * 기하 상수 (design-system.md v2 §9 RpmGauge — 220° 아크, viewBox 고정)
 * 12시 방향 = 0°, 좌하 -110° → 우하 +110°. 모든 좌표는 viewBox 단위.
 * viewBox가 고정이므로 상태 전환·수치 갱신에 layout shift 0.
 * ------------------------------------------------------------------ */
const VIEW_BOX = '0 0 200 120'
const CX = 100
/** 아크 중심 y — 220° 스윕(하단 y = CY + R·cos70° ≈ CY + 0.342R)이 높이 120 안에 들어가는 값 */
const CY = 88
const TRACK_R = 84
const REDZONE_R = 78
const TICK_INNER_R = 76
const LABEL_R = 62

/** 대역 고정 매핑 — 엔진 대역 170~620Hz × 60 (§9). 대역 밖 값은 끝점 클램프 */
const RPM_MIN = 10_000
const RPM_MAX = 37_000
const SWEEP_DEG = 220
const REDZONE_START_RPM = 32_000

const round2 = (n: number): number => Math.round(n * 100) / 100

/**
 * RPM → 바늘 회전각(도). 12시=0° 기준 -110°(10k) ~ +110°(37k) 선형 매핑.
 * deg(rpm) = -110 + 220 × (clamp(rpm) - 10000) / 27000
 */
const rpmToDeg = (rpm: number): number => {
  const clamped = Math.min(RPM_MAX, Math.max(RPM_MIN, rpm))
  return round2(-SWEEP_DEG / 2 + (SWEEP_DEG * (clamped - RPM_MIN)) / (RPM_MAX - RPM_MIN))
}

/** 각도(12시=0°, 시계 방향 +)·반지름 → viewBox 좌표 */
const polar = (deg: number, r: number): readonly [number, number] => {
  const rad = (deg * Math.PI) / 180
  return [round2(CX + r * Math.sin(rad)), round2(CY - r * Math.cos(rad))]
}

const arcPath = (fromDeg: number, toDeg: number, r: number): string => {
  const [x1, y1] = polar(fromDeg, r)
  const [x2, y2] = polar(toDeg, r)
  const largeArc = toDeg - fromDeg > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
}

const TRACK_PATH = arcPath(-SWEEP_DEG / 2, SWEEP_DEG / 2, TRACK_R)
const REDZONE_PATH = arcPath(rpmToDeg(REDZONE_START_RPM), SWEEP_DEG / 2, REDZONE_R)
// 그라디언트 축 = 레드존 아크 양 끝점 (userSpaceOnUse — 아크 진행 방향으로 amber→red)
const [REDZONE_X1, REDZONE_Y1] = polar(rpmToDeg(REDZONE_START_RPM), REDZONE_R)
const [REDZONE_X2, REDZONE_Y2] = polar(SWEEP_DEG / 2, REDZONE_R)

// S1은 단일 인스턴스 화면 — 정적 id로 충분 (S1_SETTINGS_HELP_ID와 동일 근거)
const REDZONE_GRADIENT_ID = 'rpm-gauge-redzone'

interface GaugeTick {
  readonly rpm: number
  readonly line: readonly [number, number, number, number]
  readonly label: {readonly text: string; readonly x: number; readonly y: number} | null
}

// 주 눈금 5k 간격 — 라벨은 10/20/30만 천 단위 축약(×1000 RPM 캡션 1회가 단위 보완, §9)
const TICKS: readonly GaugeTick[] = [10_000, 15_000, 20_000, 25_000, 30_000, 35_000].map(rpm => {
  const deg = rpmToDeg(rpm)
  const [x1, y1] = polar(deg, TRACK_R)
  const [x2, y2] = polar(deg, TICK_INNER_R)
  const [lx, ly] = polar(deg, LABEL_R)
  return {
    rpm,
    line: [x1, y1, x2, y2],
    label: rpm % 10_000 === 0 ? {text: String(rpm / 1000), x: lx, y: ly} : null,
  }
})

/**
 * S1 타코미터 (design-system.md v2 §9 RpmGauge) — MeasureFigures 내부 조립 전용(공용 킷 아님).
 *
 * - 장식층: 전체 `aria-hidden` — canonical 수치는 MeasureFigures의 BigNumber 텍스트 경로.
 * - 상태 연동: measuring(바늘·앰버) / stable(바늘 고정·잠금 블루) /
 *   weak-signal(바늘 숨김 — 수치 없음 원칙 REQ-ST-003) / idle·suspended·no-permission(트랙 dim).
 * - 바늘 전환: CSS transform rotate + transition 100ms linear — 엔진 ≥10Hz 갱신을 CSS가 보간.
 *   rAF/JS 애니메이션 금지(§9). reduced-motion은 전역 CssBaseline 0ms + 로컬 무효화 이중 안전장치.
 * - 색: 전부 theme.vars·var(--mml-status-*) 경유(hex 금지). 트랙=divider 헤어라인,
 *   눈금 텍스트=text.secondary, 레드존=warning→error 그라디언트(시맨틱 의미 없는 계기판 시그니처).
 */
export function RpmGauge({view}: RpmGaugeProps) {
  const theme = useTheme()
  const palette = (theme.vars ?? theme).palette

  // idle·suspended·no-permission·weak-signal: 바늘 없음 + 트랙 dim (§9 상태 연동)
  const needle =
    view.status === 'measuring' || view.status === 'stable'
      ? {deg: rpmToDeg(view.rpm), color: measureStatusTokens[view.status].fg}
      : null

  return (
    <svg
      viewBox={VIEW_BOX}
      aria-hidden="true"
      style={{display: 'block', width: '100%', height: '100%'}}>
      <defs>
        <linearGradient
          id={REDZONE_GRADIENT_ID}
          gradientUnits="userSpaceOnUse"
          x1={REDZONE_X1}
          y1={REDZONE_Y1}
          x2={REDZONE_X2}
          y2={REDZONE_Y2}>
          {/* stop-color의 var()는 presentation attribute에서 무효 — style로 지정한다 */}
          <stop offset="0" style={{stopColor: palette.warning.main}} />
          <stop offset="1" style={{stopColor: palette.error.main}} />
        </linearGradient>
      </defs>
      <g style={{opacity: needle === null ? 0.45 : 1}}>
        {/* 트랙 — divider 헤어라인 */}
        <path d={TRACK_PATH} fill="none" strokeWidth={2} style={{stroke: palette.divider}} />
        {/* 레드존 32k~37k — amber→red 그라디언트 밴드 */}
        <path
          d={REDZONE_PATH}
          fill="none"
          strokeWidth={8}
          stroke={`url(#${REDZONE_GRADIENT_ID})`}
        />
        {TICKS.map(tick => (
          <g key={tick.rpm}>
            <line
              x1={tick.line[0]}
              y1={tick.line[1]}
              x2={tick.line[2]}
              y2={tick.line[3]}
              strokeWidth={1.5}
              style={{stroke: palette.text.secondary}}
            />
            {tick.label !== null && (
              <text
                x={tick.label.x}
                y={tick.label.y}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fill: palette.text.secondary,
                  fontSize: 10,
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums lining-nums',
                }}>
                {tick.label.text}
              </text>
            )}
          </g>
        ))}
        {/* 단위 캡션 1회 — 아크 하단 개구부 */}
        <text
          x={CX}
          y={108}
          textAnchor="middle"
          style={{fill: palette.text.secondary, fontSize: 7}}>
          ×1000 RPM
        </text>
        {needle !== null && (
          <>
            <Box
              component="g"
              sx={{
                transform: `rotate(${needle.deg}deg)`,
                transformOrigin: `${CX}px ${CY}px`,
                transformBox: 'view-box',
                transition: 'transform 100ms linear',
                '@media (prefers-reduced-motion: reduce)': {transition: 'none'},
              }}>
              <line
                x1={CX}
                y1={CY + 10}
                x2={CX}
                y2={CY - 68}
                strokeWidth={3}
                strokeLinecap="round"
                style={{stroke: needle.color}}
              />
            </Box>
            {/* 허브 — 회전 불변이라 그룹 밖(브라우저 회전 보간 부하 최소화) */}
            <circle cx={CX} cy={CY} r={4} style={{fill: needle.color}} />
          </>
        )}
      </g>
    </svg>
  )
}
