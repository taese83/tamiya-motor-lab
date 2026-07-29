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
/**
 * v2.13 두꺼운 라운드 트랙 (레퍼런스 게이지). 이전 트랙은 strokeWidth 2 헤어라인이라
 * 계기판이 아니라 얇은 선처럼 보였다 — 두께가 이 컴포넌트 인상의 핵심이다.
 *
 * 반지름은 두께를 반영해 다시 계산했다(viewBox 200×120 고정, layout shift 0 유지):
 * - 상단 여유: CY − R − STROKE_W/2 = 88 − 73 − 6.5 = 8.5 ≥ 0 ✓
 * - 하단 여유: CY + R·cos70° + STROKE_W/2 = 88 + 24.97 + 6.5 = 119.5 ≤ 120 ✓
 */
const STROKE_W = 13
const TRACK_R = 73
/** 트랙 내부 여백 뒤에서 시작하는 눈금 — 트랙을 가로지르지 않고 안쪽에만 놓는다(레퍼런스) */
const TICK_OUTER_R = TRACK_R - STROKE_W / 2 - 2.5
const MAJOR_TICK_INNER_R = TICK_OUTER_R - 8
const MINOR_TICK_INNER_R = TICK_OUTER_R - 4
/**
 * 라벨은 2개만(레퍼런스의 sparse 표기) — 중앙 BigNumber 오버레이와 겹치지 않는 하단 양옆.
 * 반지름은 주 눈금 끝(MAJOR_TICK_INNER_R)보다 충분히 안쪽이어야 한다 — 가까우면 눈금선이
 * 라벨 글자를 관통한다(실측 확인). 라벨 위치가 하단 양옆이라 중앙 오버레이와는 겹치지 않는다.
 */
const LABEL_R = 40
const LABELED_HZ = [200, 600] as const

const HZ_MIN = F0_RANGE.min // 170
const HZ_MAX = F0_RANGE.max // 620
const SWEEP_DEG = 220
/** 주 눈금 간격 100 Hz(라벨 200~600) · 보조 눈금 25 Hz(hairline — 계기판 밀도, §2.4) */
const MAJOR_STEP_HZ = 100
const MINOR_STEP_HZ = 25
/** 레드라인 밴드 시작 — 580~620 Hz `error.main` 단색, 장식(DS-A15) */
const REDLINE_START_HZ = 580

const round2 = (n: number): number => Math.round(n * 100) / 100

/**
 * 바늘 기하 (회전 0° = 12시 방향 기준). 팁은 트랙 안쪽 여백까지만 —
 * TRACK 내부 경계(TRACK_R − STROKE_W/2 = 66.5)를 넘으면 트랙을 침범한다.
 */
const NEEDLE_TIP_R = 60
/** 허브 쪽 밑변 절반 — 허브 원(r=4.5)이 덮을 수 있는 폭으로 잡는다 */
const NEEDLE_BASE_HALF = 2.9
const NEEDLE_POINTS = [
  `${CX},${CY - NEEDLE_TIP_R}`, // 팁
  `${CX + NEEDLE_BASE_HALF},${CY + 2}`, // 밑변 우
  `${CX - NEEDLE_BASE_HALF},${CY + 2}`, // 밑변 좌
].join(' ')

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
/**
 * 레드라인 — 별도 반지름의 얇은 밴드가 아니라 **트랙 구간 자체를 error 색으로 덮는다**.
 * 두꺼운 트랙에서는 밖에 덧붙일 여유가 없고(상단 클리핑), 트랙 위에 겹쳐야 "그 구간이
 * 레드존"으로 읽힌다. 진행 아크가 그 위에 그려지므로 값이 레드존에 들어가면 라임이 덮는데,
 * 값 너머로 남는 붉은 구간과 바늘 위치가 여전히 레드존을 알린다(장식 채널 — DS-A15).
 */
const REDLINE_PATH = arcPath(hzToDeg(REDLINE_START_HZ), SWEEP_DEG / 2, TRACK_R)
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
  const [x1, y1] = polar(deg, TICK_OUTER_R)
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
    // 라벨은 LABELED_HZ 2개만 — 두꺼운 트랙 때문에 라벨 반지름이 안쪽으로 들어와
    // 5개를 다 쓰면 중앙 BigNumber 오버레이와 겹친다(레퍼런스도 2개만 표기)
    ticks.push(buildTick(hz, major, (LABELED_HZ as readonly number[]).includes(hz)))
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
        {/* 트랙 — 두꺼운 라운드 캡(레퍼런스). action.hover로 면을 만들어 divider보다 존재감을 준다 */}
        <path
          d={TRACK_PATH}
          fill="none"
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          style={{stroke: palette.action.hover}}
        />
        {/* 레드라인 580~620 Hz — 트랙과 같은 반지름·두께로 그 구간을 덮는다 (DS §9.4 · DS-A15 장식) */}
        {/*
          butt 캡을 쓴다 — round면 캡이 아크 끝을 넘어 부풀어서 트랙 밖으로 튀어나온 혹처럼
          보인다(실측 확인). butt면 트랙 두께 안에 정확히 들어앉는다.
        */}
        <path
          d={REDLINE_PATH}
          fill="none"
          strokeWidth={STROKE_W}
          strokeLinecap="butt"
          style={{stroke: palette.error.main, opacity: 0.75}}
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
        {/*
          진행 아크는 **값이 있을 때만** 그린다 — dim에서 아크가 보이면 "측정값 있음"으로 오해된다.
        */}
        {panoHz !== null && (
          <>
            {/* 진행 아크 — 최소점→현재 값. 정적 경로 + dashoffset만 갱신(레이아웃 불변) */}
            <Box
              component="path"
              d={TRACK_PATH}
              fill="none"
              // 트랙과 동일 두께 — 진행분이 트랙을 "채우는" 것으로 읽힌다(이전엔 2 위에 4로 어긋났다)
              strokeWidth={STROKE_W}
              strokeLinecap="round"
              strokeDasharray={TRACK_ARC_LENGTH}
              sx={{
                stroke: limeFg,
                strokeDashoffset: round2(TRACK_ARC_LENGTH * (1 - hzToFraction(panoHz))),
                transition: `stroke-dashoffset ${motionTokens.needleMs}ms linear`,
                '@media (prefers-reduced-motion: reduce)': {transition: 'none'},
              }}
            />
          </>
        )}

        {/*
          바늘·허브는 **dim에서도 렌더**한다 (v2.13 — 값 없을 때 최소 위치에 둔다).
          숨기면 게이지가 빈 트랙만 남아 "고장난 계기판"처럼 보인다. 값이 없다는 사실은
          진행 아크 부재 + 중앙 placeholder + 상태 라벨이 이미 전달하므로, 바늘이 시작점에
          놓여 있는 것은 오해를 만들지 않는다(dim 그룹 opacity로 함께 낮아진다).

          색은 text.primary(대비색) — 라임으로 두면 같은 라임 진행 아크와 겹치는 구간에서
          바늘이 사라진다(두꺼워진 아크 때문에 겹침이 크다). 레퍼런스도 컬러 아크 + 중성 바늘이다.
        */}
        <Box
          component="g"
          sx={{
            transform: `rotate(${hzToDeg(panoHz ?? HZ_MIN)}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transformBox: 'view-box',
            transition: `transform ${motionTokens.needleMs}ms linear`,
            '@media (prefers-reduced-motion: reduce)': {transition: 'none'},
          }}>
          {/*
            테이퍼 쐐기 — 균일 두께 line은 계기판 바늘이 아니라 막대기로 보인다(사용자 지적).
            허브 쪽 밑변(NEEDLE_BASE_HALF×2)에서 팁으로 좁아지고, 꼬리는 두지 않는다
            (레퍼런스도 허브 한쪽으로만 뻗는다). 밑변은 허브 원이 덮어 뿌리가 정리된다.
          */}
          <polygon
            points={NEEDLE_POINTS}
            style={{fill: palette.text.primary}}
            strokeLinejoin="round"
          />
        </Box>
        {/* 허브 — 회전 불변이라 그룹 밖(브라우저 회전 보간 부하 최소화).
            레퍼런스처럼 배경색 채움 + 얇은 링. 쐐기 밑변보다 조금 크게 잡아 뿌리를 덮는다 */}
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
