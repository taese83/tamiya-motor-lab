import {Box} from '@mui/material'
import {useTheme} from '@mui/material/styles'
import {useId} from 'react'

import {measureStatusTokens, motionTokens} from '@shared/config/design-tokens'

export interface PanoGaugeProps {
  /** null → dim(바늘 최소 위치, 채움 없음). 값 있음 = measuring (component-spec v2 §2.4) */
  panoHz: number | null
}

/* ------------------------------------------------------------------ *
 * 기하 상수 — 220° 아크, 고정 viewBox(layout shift 0). 12시=0° 기준 -110°~+110°.
 *
 * v2.21: 자체 SVG **유지**(라이브러리 검토 결과 react-gauge-component는 값 채움 아크를
 * 못 그리고 대비 버그를 재현, amCharts는 라이선스·번들 과다 — 커스텀이 우위). 대신
 * amCharts gauge-with-gradient-fill 데모의 룩을 SVG linearGradient로 진행 아크에 얹는다.
 *
 * v2.21 스케일 변경(사용자): 게이지 눈금을 **0~700, 100단위 라벨**로 바꾼다. 이전에는
 * 유효 대역 F0_RANGE(170~620)에 그대로 매핑했지만, 사용자가 0 시작·700 끝의 계기판을
 * 원했다. 게이지 표시 스케일과 측정 유효 대역은 이제 별개다(게이지는 시각 표시 전용 —
 * 실제 값 검증은 여전히 스키마 소관, 게이지는 aria-hidden 장식이라 판정 비관여).
 * ------------------------------------------------------------------ */
const VIEW_BOX = '0 0 200 120'
const CX = 100
const CY = 84
const STROKE_W = 12
const TRACK_R = 58
const TICK_OUTER_R = TRACK_R - STROKE_W / 2 - 2.5
const MAJOR_TICK_INNER_R = TICK_OUTER_R - 7
const MINOR_TICK_INNER_R = TICK_OUTER_R - 4
/**
 * v2.21 라벨을 **아크 바깥**에 둔다(사용자: 숫자가 게이지 안쪽에 오되 그래프와 안 겹치게).
 * 0~700을 100단위로 8개 찍으면 300·400이 12시 근처 안쪽에 놓여 **중앙 파노 수치와 겹친다**.
 * 라벨을 트랙 바깥 코너로 빼면 아크 **내부가 비어** 중앙 수치가 겹침 없이 들어앉는다.
 * (자동차 계기판에서 숫자를 링 바깥에 두는 방식 — 내부는 디지털 값 전용.)
 */
const LABEL_R = TRACK_R + STROKE_W / 2 + 7

/** v2.21 스케일 — 게이지 표시 전용(측정 유효 대역과 분리) */
const GAUGE_MIN = 0
const GAUGE_MAX = 700
const SWEEP_DEG = 220
/** 라벨·주 눈금 100단위, 보조 눈금 50단위(0~700에서 25단위는 과밀) */
const MAJOR_STEP = 100
const MINOR_STEP = 50
/** 레드라인 = 상단 고위험 구간(600~700). 트랙 구간을 error 색으로 덮는다(DS-A15 장식) */
const REDLINE_START = 600

/**
 * v2.21 색 강화(사용자: "너무 흐림"). 트랙 opacity 0.48→0.6으로 올려 계기 링의 존재감을
 * 키운다(양 모드 대비는 실측 재확인 — text.primary라 모드별 반전 유지). 진행 채움은
 * 단색 라임 대신 **그라디언트**(어두운 라임→밝은 라임)로 차트(파노 라인)와 톤을 맞춘다.
 */
const TRACK_OPACITY = 0.6
const MINOR_TICK_OPACITY = 0.5
const DIM_OPACITY = 0.45

const round2 = (n: number): number => Math.round(n * 100) / 100

/** 값 → 바늘 회전각(도). 대역 밖은 끝점 클램프 */
const valueToDeg = (v: number): number => {
  const clamped = Math.min(GAUGE_MAX, Math.max(GAUGE_MIN, v))
  return round2(-SWEEP_DEG / 2 + (SWEEP_DEG * (clamped - GAUGE_MIN)) / (GAUGE_MAX - GAUGE_MIN))
}
const valueToFraction = (v: number): number => {
  const clamped = Math.min(GAUGE_MAX, Math.max(GAUGE_MIN, v))
  return (clamped - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)
}

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
const REDLINE_PATH = arcPath(valueToDeg(REDLINE_START), SWEEP_DEG / 2, TRACK_R)
const TRACK_ARC_LENGTH = round2((TRACK_R * Math.PI * SWEEP_DEG) / 180)

const NEEDLE_TIP_R = 46
const NEEDLE_BASE_HALF = 2.6
const NEEDLE_POINTS = [
  `${CX},${CY - NEEDLE_TIP_R}`,
  `${CX + NEEDLE_BASE_HALF},${CY + 2}`,
  `${CX - NEEDLE_BASE_HALF},${CY + 2}`,
].join(' ')

interface GaugeTick {
  readonly v: number
  readonly major: boolean
  readonly line: readonly [number, number, number, number]
  readonly label: {readonly text: string; readonly x: number; readonly y: number} | null
}

const buildTick = (v: number, major: boolean, labeled: boolean): GaugeTick => {
  const deg = valueToDeg(v)
  const [x1, y1] = polar(deg, TICK_OUTER_R)
  const [x2, y2] = polar(deg, major ? MAJOR_TICK_INNER_R : MINOR_TICK_INNER_R)
  const [lx, ly] = polar(deg, LABEL_R)
  return {v, major, line: [x1, y1, x2, y2], label: labeled ? {text: String(v), x: lx, y: ly} : null}
}

/** 눈금 전수 — 0~700, 주 100(라벨)·보조 50 */
const TICKS: readonly GaugeTick[] = (() => {
  const ticks: GaugeTick[] = []
  for (let v = GAUGE_MIN; v <= GAUGE_MAX; v += MINOR_STEP) {
    const major = v % MAJOR_STEP === 0
    ticks.push(buildTick(v, major, major)) // 주 눈금(100단위)마다 라벨
  }
  return ticks
})()

/**
 * S1 파노 게이지 (component-spec v2 §2.4 — M-4 파노 주지표).
 * 전체 aria-hidden 장식층 — canonical 수치는 MeasureFigures BigNumber 텍스트(DS-A15).
 * 진행 채움 = 그라디언트 라임(0→현재 값), 바늘 = 중성색, 레드라인 = 상단 고위험 구간.
 * 고정 viewBox → layout shift 0. reduced-motion 시 보간 0ms.
 */
export function PanoGauge({panoHz}: PanoGaugeProps) {
  const theme = useTheme()
  const palette = (theme.vars ?? theme).palette
  const limeFg = measureStatusTokens.measuring.fg
  const dim = panoHz === null
  const gradientId = useId()

  return (
    <svg
      viewBox={VIEW_BOX}
      aria-hidden="true"
      style={{display: 'block', width: '100%', height: '100%'}}>
      <defs>
        {/*
          진행 채움 그라디언트 (amCharts gradient-fill 데모 룩). 좌(저 RPM)→우(고 RPM)로
          어두운 라임 → 밝은 라임. userSpaceOnUse로 viewBox 좌표에 고정해 dashoffset이
          바뀌어도 색 위치가 흔들리지 않는다.
        */}
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={CX - TRACK_R}
          y1={CY}
          x2={CX + TRACK_R}
          y2={CY}>
          <stop offset="0" stopColor={limeFg} stopOpacity={0.55} />
          <stop offset="1" stopColor={limeFg} stopOpacity={1} />
        </linearGradient>
      </defs>

      <g style={{opacity: dim ? DIM_OPACITY : 1}}>
        {/* 트랙 — 두꺼운 라운드 캡 계기 링 */}
        <path
          d={TRACK_PATH}
          fill="none"
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          style={{stroke: palette.text.primary, opacity: TRACK_OPACITY}}
        />
        {/* 레드라인 600~700 — 트랙 구간을 error 색으로 덮음 (butt 캡: 트랙 두께 안에 정확히) */}
        <path
          d={REDLINE_PATH}
          fill="none"
          strokeWidth={STROKE_W}
          strokeLinecap="butt"
          style={{stroke: palette.error.main, opacity: 0.85}}
        />
        {TICKS.map(tick => (
          <g key={tick.v}>
            <line
              x1={tick.line[0]}
              y1={tick.line[1]}
              x2={tick.line[2]}
              y2={tick.line[3]}
              strokeWidth={tick.major ? 1.5 : 1}
              style={{
                stroke: tick.major ? palette.text.secondary : palette.text.primary,
                ...(tick.major ? {} : {opacity: MINOR_TICK_OPACITY}),
              }}
            />
            {tick.label !== null && (
              <text
                x={tick.label.x}
                y={tick.label.y}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fill: palette.text.secondary,
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  fontVariantNumeric: 'tabular-nums lining-nums',
                }}>
                {tick.label.text}
              </text>
            )}
          </g>
        ))}

        {/* 진행 채움 — 값 있을 때만. 0→현재 값 구간, 그라디언트 스트로크 */}
        {panoHz !== null && (
          <Box
            component="path"
            d={TRACK_PATH}
            fill="none"
            strokeWidth={STROKE_W}
            strokeLinecap="butt"
            strokeDasharray={TRACK_ARC_LENGTH}
            sx={{
              stroke: `url(#${gradientId})`,
              strokeDashoffset: round2(TRACK_ARC_LENGTH * (1 - valueToFraction(panoHz))),
              transition: `stroke-dashoffset ${motionTokens.needleMs}ms linear`,
              '@media (prefers-reduced-motion: reduce)': {transition: 'none'},
            }}
          />
        )}

        {/* 바늘 — dim에서도 최소 위치(0)에 렌더(빈 계기판 금지). 중성색(라임 채움과 겹쳐도 보임) */}
        <Box
          component="g"
          sx={{
            transform: `rotate(${valueToDeg(panoHz ?? GAUGE_MIN)}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transformBox: 'view-box',
            transition: `transform ${motionTokens.needleMs}ms linear`,
            '@media (prefers-reduced-motion: reduce)': {transition: 'none'},
          }}>
          <polygon
            points={NEEDLE_POINTS}
            style={{fill: palette.text.primary}}
            strokeLinejoin="round"
          />
        </Box>
        <circle
          cx={CX}
          cy={CY}
          r={4.5}
          strokeWidth={2.5}
          style={{fill: palette.background.paper, stroke: palette.text.primary}}
        />
      </g>
    </svg>
  )
}
