import {Box, Typography} from '@mui/material'
import {useTheme} from '@mui/material/styles'

import {
  STABILITY_EXCELLENT_MAX_CV,
  STABILITY_GOOD_MAX_CV,
  STABILITY_HIGH_MIN_CV,
  STABILITY_LEVEL_LABELS,
  stabilityLevelOf,
} from '@shared/config/domain'
import {formatRpm} from '@shared/lib/format'

import type {MeasureView} from './measure-view'
import type {StabilityLevel} from '@shared/config/domain'

export interface StabilityGaugeProps {
  view: MeasureView
}

/* ── 변동률 게이지 (v2.x — 파노 게이지와 별개, 아래쪽 축소 아크. 사용자 req) ─────────── *
 * 파노와 **같은 아크 모양을 작게**. 트랙 자체가 등급 구간(좋음 초록·보통 앰버·흔들림 큼 빨강)으로
 * 칠해지고, 측정 중 CV 위치로 바늘이 움직인다. 스케일 0~2%(high 구간이 아크 끝 ~25%에 오도록).
 * 구간 경계는 도메인 임계(STABILITY_*_CV)를 참조 → 임계가 바뀌면 밴드도 자동으로 따라온다.
 * aria-hidden 장식 — 값·등급 텍스트는 아래 캡션(스크린리더 경로). */
const VIEW_BOX = '2 2 136 82'
const CX = 70
const CY = 60
const R = 46
const STROKE_W = 7
const SWEEP_DEG = 220
const MAX_CV = 0.02 // 표시 상한 2% — high(≥1.5%)이 아크 끝 ~25%

const TICK_OUTER_R = R - STROKE_W / 2 - 2
const TICK_INNER_R = TICK_OUTER_R - 3.5
const LABEL_R = R + STROKE_W / 2 + 7
const NEEDLE_TIP_R = R - 9
const DIM_OPACITY = 0.6 // v2.x(사용자): 대기 상태도 또렷하게 (0.4 → 0.6)
const STAB_NEEDLE_MS = 60 // 순간 편차 떨림용 — 파노(100ms)보다 짧게(프레임 갱신이 뭉개지지 않게)

const round2 = (n: number): number => Math.round(n * 100) / 100
const cvToDeg = (cv: number): number => {
  const c = Math.min(MAX_CV, Math.max(0, cv))
  return round2(-SWEEP_DEG / 2 + (SWEEP_DEG * c) / MAX_CV)
}
const polar = (deg: number, r: number): readonly [number, number] => {
  const rad = (deg * Math.PI) / 180
  return [round2(CX + r * Math.sin(rad)), round2(CY - r * Math.cos(rad))]
}
const bandArc = (fromCv: number, toCv: number): string => {
  const [x1, y1] = polar(cvToDeg(fromCv), R)
  const [x2, y2] = polar(cvToDeg(toCv), R)
  const large = cvToDeg(toCv) - cvToDeg(fromCv) > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`
}

// 4구간 = 등급 4단계와 1:1 (STABILITY_LEVELS).
// v2.x(사용자: 흐릿해서 촌스러움) — 반투명·저채도 제거, **불투명 쨍한 원색**으로 렌더한다.
type BandKey = 'excellent' | 'good' | 'fair' | 'high'
const BANDS: ReadonlyArray<{from: number; to: number; key: BandKey}> = [
  {from: 0, to: STABILITY_EXCELLENT_MAX_CV, key: 'excellent'},
  {from: STABILITY_EXCELLENT_MAX_CV, to: STABILITY_GOOD_MAX_CV, key: 'good'},
  {from: STABILITY_GOOD_MAX_CV, to: STABILITY_HIGH_MIN_CV, key: 'fair'},
  {from: STABILITY_HIGH_MIN_CV, to: MAX_CV, key: 'high'},
]

/** 쨍한 고채도 등급색 (사용자 req) — 테마 팔레트의 흐린 톤 대신 원색 고정 */
const VIVID_BAND_COLOR: Record<BandKey, string> = {
  excellent: '#00E5A0', // 선명한 민트그린 — 최상
  good: '#3DDC46', // 쨍한 그린
  fair: '#FFB300', // 쨍한 앰버
  high: '#FF3B30', // 쨍한 레드
}

// 눈금·라벨 — 파노와 같은 룩(주 눈금 라벨 + 보조 눈금). 라벨은 % 정수(0·1·2).
const NEEDLE_POINTS = [`${CX},${CY - NEEDLE_TIP_R}`, `${CX + 2},${CY + 1.5}`, `${CX - 2},${CY + 1.5}`].join(' ')
const TICK_CVS = [0, 0.005, 0.01, 0.015, 0.02] as const
const LABELED_CVS = new Set([0, 0.01, 0.02])

const LEVEL_COLOR: Record<StabilityLevel, string> = {
  excellent: 'success.main',
  good: 'success.main',
  fair: 'warning.main',
  high: 'error.main',
}

/**
 * S1 변동률 게이지 — 파노 게이지 아래 별도 축소 아크(사용자 req). 트랙=등급색 3구간,
 * 측정 중 CV 위치로 바늘 이동. 비측정 시 dim + 바늘 최소 위치. 아래 캡션이 등급·수치 담당.
 */
export function StabilityGauge({view}: StabilityGaugeProps) {
  const theme = useTheme()
  const palette = (theme.vars ?? theme).palette
  const measuring = view.status === 'measuring'
  const cv = measuring ? view.stabilityCv : null
  const rpm = measuring ? view.rpm : 0
  const dim = !measuring

  const level = cv !== null ? stabilityLevelOf(cv) : null

  // 바늘 표시값 = 1.5s 창 CV(중심) + 순간 편차(떨림). 매 프레임 microCv가 바뀌어 바늘이 실시간으로
  // 떨린다(사용자 req). 등급·캡션은 cv(창 평균)만 쓰므로 기록·판정에는 떨림이 섞이지 않는다.
  // cvToDeg가 [0, MAX_CV]로 클램프하므로 합이 음수·초과여도 안전. 둘 다 null이면 0(최소).
  const micro = measuring ? view.microCv : null
  const needleCv = (cv ?? 0) + (micro ?? 0)

  return (
    <Box sx={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25}}>
      <Box aria-hidden="true" sx={{width: 'clamp(148px, 46vw, 208px)'}}>
        <svg viewBox={VIEW_BOX} style={{display: 'block', width: '100%', height: '100%'}}>
          <g style={{opacity: dim ? DIM_OPACITY : 1}}>
            {/* 등급 밴드 4구간 — 불투명 쨍한 원색(사용자 req: 흐린 색감 제거) */}
            {BANDS.map(band => (
              <path
                key={band.key}
                d={bandArc(band.from, band.to)}
                fill="none"
                strokeWidth={STROKE_W}
                strokeLinecap="butt"
                style={{stroke: VIVID_BAND_COLOR[band.key], opacity: 1}}
              />
            ))}
            {/* 눈금 + % 라벨 (0·1·2) — 파노와 같은 룩 */}
            {TICK_CVS.map(t => {
              const deg = cvToDeg(t)
              const [x1, y1] = polar(deg, TICK_OUTER_R)
              const [x2, y2] = polar(deg, TICK_INNER_R)
              const [lx, ly] = polar(deg, LABEL_R)
              return (
                <g key={t}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    strokeWidth={1}
                    style={{stroke: palette.text.primary}}
                  />
                  {LABELED_CVS.has(t) && (
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{
                        fill: palette.text.secondary,
                        fontSize: 6,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums lining-nums',
                      }}>
                      {t * 100}
                    </text>
                  )}
                </g>
              )
            })}
            {/* 바늘 — 파노와 동일하게 **항상** 렌더(대기 시에도 최소 0 위치에 dim). 측정 중이면
                CV 위치로 이동. cv 없으면(대기·창 미충족) 0=최소(-110°)에 둔다. */}
            <Box
              component="g"
              sx={{
                transform: `rotate(${cvToDeg(needleCv)}deg)`,
                transformOrigin: `${CX}px ${CY}px`,
                transformBox: 'view-box',
                // 파노 바늘(100ms)보다 짧게 — 프레임마다 오는 순간 편차가 뭉개지지 않고 떨리도록.
                transition: `transform ${STAB_NEEDLE_MS}ms linear`,
                '@media (prefers-reduced-motion: reduce)': {transition: 'none'},
              }}>
              <polygon points={NEEDLE_POINTS} style={{fill: palette.text.primary}} strokeLinejoin="round" />
            </Box>
            <circle
              cx={CX}
              cy={CY}
              r={3.4}
              strokeWidth={1.8}
              style={{fill: palette.background.paper, stroke: palette.text.primary}}
            />
          </g>
        </svg>
      </Box>

      {/* 캡션 — 등급 + 변동률 %·±rpm (스크린리더 경로). 고정 1줄(레이아웃 안정) */}
      <Typography
        variant="caption"
        sx={{
          minHeight: '1.4em',
          color: 'text.secondary',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums lining-nums',
        }}>
        {level !== null && cv !== null ? (
          <>
            변동{' '}
            <Box component="span" sx={{color: LEVEL_COLOR[level], fontWeight: 700}}>
              {STABILITY_LEVEL_LABELS[level]}
            </Box>
            {' · '}
            {(cv * 100).toFixed(2)}% · ±{formatRpm(Math.max(1, Math.round(cv * rpm)))} rpm
          </>
        ) : measuring ? (
          '변동률 측정 중…'
        ) : (
          '변동률'
        )}
      </Typography>
    </Box>
  )
}
