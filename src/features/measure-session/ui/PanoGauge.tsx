import {Box} from '@mui/material'
import {useTheme} from '@mui/material/styles'
import {useId} from 'react'

import {measureStatusTokens, motionTokens} from '@shared/config/design-tokens'

export interface PanoGaugeProps {
  /** null → dim(바늘 최소 위치, 채움 없음). 값 있음 = measuring (component-spec v2 §2.4) */
  panoHz: number | null
  /**
   * 회전 안정도 CV (v2.x — 사용자 A안 채택: 흔들림 부채꼴).
   * 바늘 주위 ±(cv×panoHz) Hz 범위를 반투명 부채꼴로 그린다 — 폭 = 흔들리는 범위.
   * null(창 미충족·비측정)이면 미렌더. 판단 없는 원값 표현 — 색 변화 없음(중립 라임).
   */
  stabilityCv: number | null
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
// v2.26(사용자: 더 크게): viewBox를 콘텐츠(아크+바깥 라벨) 실제 경계로 좁혀 여백을 제거한다.
// 좌우 ~30 여백을 잘라내면 같은 화면 폭에서 게이지가 더 크게 렌더된다(좌표계는 불변 — 창만 축소).
const VIEW_BOX = '18 3 164 114'
const CX = 100
const CY = 84
const STROKE_W = 5 // v2.26(사용자): 트랙 두께 더 얇게(12→9→7→5)
const TRACK_R = 58
const TICK_OUTER_R = TRACK_R - STROKE_W / 2 - 2.5
const MAJOR_TICK_INNER_R = TICK_OUTER_R - 7
const MINOR_TICK_INNER_R = TICK_OUTER_R - 4
/**
 * v2.21 라벨을 **아크 바깥**에 둔다(사용자: 숫자가 게이지 안쪽에 오되 그래프와 안 겹치게).
 * 0~700을 100단위로 8개 찍으면 300·400이 12시 근처 안쪽에 놓여 **중앙 파노 수치와 겹친다**.
 * 라벨을 트랙 바깥 코너로 빼면 아크 **내부가 비어** 중앙 수치가 겹침 없이 들어앉는다.
 * (자동차 계기판에서 숫자를 링 바깥에 두는 방식 — 내부는 디지털 값 전용.)
 * v2.26(사용자: 라벨이 게이지에 겹치지 않게): 아크 바깥 여백 7→13으로 늘려 라벨을 트랙에서
 * 더 떼어놓는다(트랙 두께 축소분과 합쳐 라벨-아크 간격 확대). viewBox는 이에 맞춰 넓혔다.
 */
const LABEL_R = TRACK_R + STROKE_W / 2 + 13

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
// v2.29(사용자: 더 밝게) — 트랙·보조눈금 opacity 상향(0.6→0.8, 0.5→0.7). 주눈금·라벨은
// text.secondary(어두움)에서 text.primary(밝음)로 승격(아래 JSX). dim(대기)은 그대로.
const TRACK_OPACITY = 0.8
const MINOR_TICK_OPACITY = 0.7
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

/** 흔들림 부채꼴 최대 반각(°) — CV 폭주 시 시각 폭 클램프 (전체 스윕의 ~27%) */
const WEDGE_MAX_HALF_DEG = 30
const WEDGE_OPACITY = 0.18

/**
 * 흔들림 부채꼴 path — pivot → ±범위 호(바늘 길이 반경) → 닫기.
 * 각도는 값 공간에서 환산: halfHz = cv × pano. d는 프레임마다 재계산(≥10Hz)이라
 * CSS transition 없이도 연속적으로 보인다(cv 자체가 완만하게 변하는 값).
 */
const wedgePath = (panoHz: number, cv: number): string | null => {
  const centerDeg = valueToDeg(panoHz)
  const halfHz = cv * panoHz
  const halfDeg = Math.min(
    WEDGE_MAX_HALF_DEG,
    (SWEEP_DEG * halfHz) / (GAUGE_MAX - GAUGE_MIN),
  )
  if (halfDeg <= 0.05) return null // 사실상 폭 0 — 그리지 않음(안정 = 또렷한 바늘)
  const lo = Math.max(-SWEEP_DEG / 2, centerDeg - halfDeg)
  const hi = Math.min(SWEEP_DEG / 2, centerDeg + halfDeg)
  const [x1, y1] = polar(lo, NEEDLE_TIP_R)
  const [x2, y2] = polar(hi, NEEDLE_TIP_R)
  return `M ${CX} ${CY} L ${x1} ${y1} A ${NEEDLE_TIP_R} ${NEEDLE_TIP_R} 0 0 1 ${x2} ${y2} Z`
}

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
export function PanoGauge({panoHz, stabilityCv}: PanoGaugeProps) {
  const theme = useTheme()
  const palette = (theme.vars ?? theme).palette
  const limeFg = measureStatusTokens.measuring.fg
  const dim = panoHz === null
  const gradientId = useId()
  // 흔들림 부채꼴 (A안) — 측정 중 + CV 보유 시에만. null이면 미렌더(안정 = 또렷한 바늘)
  const wedge = panoHz !== null && stabilityCv !== null ? wedgePath(panoHz, stabilityCv) : null

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
                // v2.29: 주·보조 모두 text.primary(밝게). 이전엔 주 눈금이 text.secondary라 더 어두웠다
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
                  fill: palette.text.primary, // v2.29(사용자: 밝게) — 눈금 숫자 text.secondary→primary
                  fontSize: 6.5, // v2.26(사용자): 100단위 라벨 숫자 조금 더 축소(8→6.5)
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

        {/* 흔들림 부채꼴 (v2.x A안) — 바늘 아래 반투명 층: 폭 = ±(cv×pano) 범위.
            판단 없는 원값 표현 — 색 고정(라임), 넓어질수록 '흔들린다'가 그대로 보인다 */}
        {wedge !== null && <path d={wedge} style={{fill: limeFg, opacity: WEDGE_OPACITY}} />}

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
