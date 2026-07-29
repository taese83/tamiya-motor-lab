import {Box} from '@mui/material'
import {useTheme} from '@mui/material/styles'
import {measureStatusTokens, motionTokens} from '@shared/config/design-tokens'
import {F0_RANGE} from '@shared/config/domain'

export interface PanoGaugeProps {
  /** null → dim 트랙(바늘·진행 아크 미표시). 값 있음 = measuring (component-spec v2 §2.4) */
  panoHz: number | null
}

/* ------------------------------------------------------------------ *
 * 기하 상수 (design-system v3 §9.4 / layout-spec v2 §4.1 — 220° 아크, viewBox 고정)
 * 12시 방향 = 0°, 좌하 -110° → 우하 +110°. 모든 좌표는 viewBox 단위.
 * viewBox가 고정이므로 상태 전환·수치 갱신에 layout shift 0.
 * v2: 매핑을 파노 F0_RANGE(170~620 Hz)로 교체 — 대역 상수는 shared/config 소비(하드코딩 금지).
 * ------------------------------------------------------------------ */
const VIEW_BOX = '0 0 200 120'
const CX = 100
/** 아크 중심 y — 220° 스윕(하단 y = CY + R·cos70° ≈ CY + 0.342R)이 높이 120 안에 들어가는 값 */
const CY = 88
const TRACK_R = 84
const REDLINE_R = 78
const MAJOR_TICK_INNER_R = 76
const MINOR_TICK_INNER_R = 80
const LABEL_R = 62

const HZ_MIN = F0_RANGE.min // 170
const HZ_MAX = F0_RANGE.max // 620
const SWEEP_DEG = 220
/** 주 눈금 간격 100 Hz(라벨 200~600) · 보조 눈금 25 Hz(hairline — 계기판 밀도, §2.4) */
const MAJOR_STEP_HZ = 100
const MINOR_STEP_HZ = 25
/** 레드라인 밴드 시작 — 580~620 Hz `error.main` 단색, 장식(DS-A15) */
const REDLINE_START_HZ = 580

const round2 = (n: number): number => Math.round(n * 100) / 100

/** Hz → 바늘 회전각(도). 12시=0° 기준 -110°(170 Hz) ~ +110°(620 Hz) 선형 매핑. 대역 밖은 끝점 클램프 */
const hzToDeg = (hz: number): number => {
  const clamped = Math.min(HZ_MAX, Math.max(HZ_MIN, hz))
  return round2(-SWEEP_DEG / 2 + (SWEEP_DEG * (clamped - HZ_MIN)) / (HZ_MAX - HZ_MIN))
}

/** 대역 내 진행 비율 0~1 — 진행 아크 stroke-dashoffset 계산용 */
const hzToFraction = (hz: number): number => {
  const clamped = Math.min(HZ_MAX, Math.max(HZ_MIN, hz))
  return (clamped - HZ_MIN) / (HZ_MAX - HZ_MIN)
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
const REDLINE_PATH = arcPath(hzToDeg(REDLINE_START_HZ), SWEEP_DEG / 2, REDLINE_R)
/** 진행 아크는 트랙 경로 자체(DS §9.4 "트랙 위") — dasharray/dashoffset으로 170→현재 값 구간만 노출 */
const TRACK_ARC_LENGTH = round2((TRACK_R * Math.PI * SWEEP_DEG) / 180)

interface GaugeTick {
  readonly hz: number
  readonly major: boolean
  readonly line: readonly [number, number, number, number]
  readonly label: {readonly text: string; readonly x: number; readonly y: number} | null
}

const buildTick = (hz: number, major: boolean, labeled: boolean): GaugeTick => {
  const deg = hzToDeg(hz)
  const [x1, y1] = polar(deg, TRACK_R)
  const [x2, y2] = polar(deg, major ? MAJOR_TICK_INNER_R : MINOR_TICK_INNER_R)
  const [lx, ly] = polar(deg, LABEL_R)
  return {
    hz,
    major,
    line: [x1, y1, x2, y2],
    label: labeled ? {text: String(hz), x: lx, y: ly} : null,
  }
}

/** 눈금 전수(모듈 스코프 1회 계산) — 끝점 170/620 무라벨 주 틱 + 주 100 Hz(라벨) + 보조 25 Hz */
const TICKS: readonly GaugeTick[] = (() => {
  const ticks: GaugeTick[] = [buildTick(HZ_MIN, true, false), buildTick(HZ_MAX, true, false)]
  for (let hz = Math.ceil(HZ_MIN / MINOR_STEP_HZ) * MINOR_STEP_HZ; hz < HZ_MAX; hz += MINOR_STEP_HZ) {
    const major = hz % MAJOR_STEP_HZ === 0
    ticks.push(buildTick(hz, major, major))
  }
  return ticks
})()

/**
 * S1 파노 게이지 (component-spec v2 §2.4 — RpmGauge 개정·개명, M-4 파노 주지표).
 *
 * - 장식층: 전체 `aria-hidden` — canonical 수치는 MeasureFigures의 BigNumber 텍스트 경로.
 *   상태 판별 비관여(레드라인 포함 전부 장식 — DS-A15).
 * - 상태 전수 2종: dim(panoHz null — 트랙·눈금만 저채도, 진행 요소 없음) / active(값).
 *   그 외 상태 분기는 상위(MeasureFigures)가 값 null화로 전달한다.
 * - 진행 아크: 최소점(170)→현재 값, 라임(`--mml-status-measuring-fg`), strokeWidth 4,
 *   `stroke-dashoffset` transition `needleMs`(100ms) linear — 바늘과 동일 보간.
 * - 바늘 전환: CSS transform rotate 100ms linear — 엔진 ≥10Hz 갱신을 CSS가 보간.
 *   rAF/JS 애니메이션 금지. reduced-motion은 전역 CssBaseline 0ms + 로컬 무효화 이중 안전장치.
 * - 색: 전부 theme.vars·design-tokens var(--mml-status-*) 경유(hex 금지). 트랙=divider 헤어라인,
 *   주 눈금·라벨=text.secondary(overline 톤), 보조 눈금=divider, 레드라인=error.main 단색.
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
      <g style={{opacity: dim ? 0.45 : 1}}>
        {/* 트랙 — divider 헤어라인 */}
        <path d={TRACK_PATH} fill="none" strokeWidth={2} style={{stroke: palette.divider}} />
        {/* 레드라인 580~620 Hz — error.main 단색 밴드 (v2: 그라디언트 폐기, DS §9.4) */}
        <path
          d={REDLINE_PATH}
          fill="none"
          strokeWidth={5}
          style={{stroke: palette.error.main, opacity: 0.9}}
        />
        {TICKS.map(tick => (
          <g key={tick.hz}>
            <line
              x1={tick.line[0]}
              y1={tick.line[1]}
              x2={tick.line[2]}
              y2={tick.line[3]}
              strokeWidth={tick.major ? 1.5 : 1}
              style={{stroke: tick.major ? palette.text.secondary : palette.divider}}
            />
            {tick.label !== null && (
              <text
                x={tick.label.x}
                y={tick.label.y}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fill: palette.text.secondary,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  fontVariantNumeric: 'tabular-nums lining-nums',
                }}>
                {tick.label.text}
              </text>
            )}
          </g>
        ))}
        {/* 단위 캡션 — 아크 하단 개구부, overline 톤 */}
        <text
          x={CX}
          y={108}
          textAnchor="middle"
          style={{
            fill: palette.text.secondary,
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.12em',
          }}>
          Hz
        </text>
        {panoHz !== null && (
          <>
            {/* 진행 아크 — 최소점→현재 값. 정적 경로 + dashoffset만 갱신(레이아웃 불변) */}
            <Box
              component="path"
              d={TRACK_PATH}
              fill="none"
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={TRACK_ARC_LENGTH}
              sx={{
                stroke: limeFg,
                strokeDashoffset: round2(TRACK_ARC_LENGTH * (1 - hzToFraction(panoHz))),
                transition: `stroke-dashoffset ${motionTokens.needleMs}ms linear`,
                '@media (prefers-reduced-motion: reduce)': {transition: 'none'},
              }}
            />
            {/* 바늘 — 라임, CSS rotate 보간 */}
            <Box
              component="g"
              sx={{
                transform: `rotate(${hzToDeg(panoHz)}deg)`,
                transformOrigin: `${CX}px ${CY}px`,
                transformBox: 'view-box',
                transition: `transform ${motionTokens.needleMs}ms linear`,
                '@media (prefers-reduced-motion: reduce)': {transition: 'none'},
              }}>
              <line
                x1={CX}
                y1={CY + 10}
                x2={CX}
                y2={CY - 68}
                strokeWidth={3}
                strokeLinecap="round"
                style={{stroke: limeFg}}
              />
            </Box>
            {/* 허브 — 회전 불변이라 그룹 밖(브라우저 회전 보간 부하 최소화) */}
            <circle cx={CX} cy={CY} r={4} style={{fill: limeFg}} />
          </>
        )}
      </g>
    </svg>
  )
}
