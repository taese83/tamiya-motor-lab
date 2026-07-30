import {Box} from '@mui/material'
import {useTheme} from '@mui/material/styles'

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
 * v2.21 스케일: 게이지 눈금 0~700, 100단위. 게이지 표시 스케일과 측정 유효 대역은 별개다
 * (게이지는 aria-hidden 시각 표시 전용 — 값 검증은 스키마 소관).
 *
 * v2.x(사용자): 변동률은 이 파노 게이지와 **별개**의 축소 아크(StabilityGauge)로 아래에 분리.
 * 여기서는 파노만 그린다(부채꼴·내장 미니 게이지 폐기).
 * ------------------------------------------------------------------ */
// v2.x(사용자: 게이지 더 크게 + 라벨 한 자리 + 눈금 짧게): 라벨을 백자리 한 자리(0~7)로 줄여
// 좌우 라벨 폭이 작아진 만큼 viewBox를 더 좁히고 트랙 반경을 키웠다(같은 화면 폭에서 확대).
const VIEW_BOX = '22 6 156 112'
const CX = 100
const CY = 86
const STROKE_W = 5
const TRACK_R = 64 // v2.x(사용자): 58→64 확대
const TICK_OUTER_R = TRACK_R - STROKE_W / 2 - 2
const MAJOR_TICK_INNER_R = TICK_OUTER_R - 4 // v2.x(사용자): 눈금 짧게 (7→4)
const MINOR_TICK_INNER_R = TICK_OUTER_R - 2.5 // v2.x(사용자): 눈금 짧게 (4→2.5)
/**
 * 라벨을 아크 바깥 코너에 둔다(내부는 중앙 수치 전용 — 겹침 방지). v2.x: 백자리 한 자리라
 * 라벨 폭이 작아져 아크에 더 붙여도(gap 13→8) 겹치지 않는다.
 */
const LABEL_R = TRACK_R + STROKE_W / 2 + 8

/** 스케일 — 게이지 표시 전용. v2.x(사용자): 측정 상한 확장(fMax 800=48,000rpm)에 맞춰 0~800 */
const GAUGE_MIN = 0
const GAUGE_MAX = 800
const SWEEP_DEG = 220
/** 라벨·주 눈금 100단위, 보조 눈금 50단위 */
const MAJOR_STEP = 100
const MINOR_STEP = 50
/** 레드라인 = 상단 고위험 구간(700~800). 울트라대시(628)는 정상 구간에 들어온다(DS-A15 장식) */
const REDLINE_START = 700

// 트랙·눈금 밝기. v2.x(사용자: 흐린 색감 제거 — 쨍하게): 반투명 걷어내고 전부 불투명(1).
// dim(비측정 대기)만 낮춰 상태를 구분하되, 이전(0.45)보다 또렷하게 0.6.
const TRACK_OPACITY = 1
const MINOR_TICK_OPACITY = 1
const DIM_OPACITY = 0.6

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

const NEEDLE_TIP_R = 50 // v2.x: 확대된 다이얼에 맞춰 46→50
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
  // v2.x(사용자): 라벨은 **백자리 한 자리**만 (300→3, 700→7). 상수 스케일은 불변, 표기만 축약.
  return {v, major, line: [x1, y1, x2, y2], label: labeled ? {text: String(v / MAJOR_STEP), x: lx, y: ly} : null}
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

  return (
    <svg
      viewBox={VIEW_BOX}
      aria-hidden="true"
      style={{display: 'block', width: '100%', height: '100%'}}>
      {/* v2.x(사용자: 흐릿한 색감 촌스러움) — 진행 채움 그라디언트 제거, **단색 라임**.
          이전 amCharts 룩(0.55→1 투명도 그라디언트)은 저 RPM 구간이 흐려 보였다. */}
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
          style={{stroke: palette.error.main, opacity: 1}}
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
                stroke: palette.text.primary,
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
                  fill: palette.text.primary,
                  fontSize: 7.5, // v2.x(사용자): 한 자리라 조금 키워도 여백 확보 (6.5→7.5)
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
              stroke: limeFg, // v2.x(사용자): 단색 라임 — 그라디언트 폐기
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
          <polygon points={NEEDLE_POINTS} style={{fill: palette.text.primary}} strokeLinejoin="round" />
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
