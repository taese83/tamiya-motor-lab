import {Box, Typography, useTheme} from '@mui/material'
import {EM_DASH, formatDateTimeShort, formatPanoValue} from '@shared/lib/format'

// PanoLineChart (component-spec v2 §5.5 · layout-spec v2 §5.2 — T-5).
// 커스텀 SVG(차트 라이브러리 금지) — width 100% × height 160px 고정.
// a11y: 전체 aria-hidden — canonical 데이터는 MotorRow 확장 패널의 기록 리스트 텍스트(§5.2).
// 차트 단독 사용 금지(기록 리스트 없는 소비 금지). 애니메이션 트윈 금지(패널 enter 페이드에 포함).

export interface PanoLineChartPoint {
  /** stable entity id — 렌더 key(index 금지) */
  id: string
  measuredAt: string
  panoHz: number
}

export interface PanoLineChartProps {
  /** measuredAt asc, ≤10건 — listMeasureRecordsByMotor 결과 그대로(재정렬 금지) */
  points: ReadonlyArray<PanoLineChartPoint>
}

const CHART_HEIGHT = 160
/** 플롯 영역 인셋(px) — 라벨은 HTML 오버레이(비율 스케일 SVG의 글자 왜곡 회피) */
const PLOT_INSET = {top: 8, right: 8, bottom: 22, left: 8} as const

/**
 * X = measuredAt 실제 시간 축(등간격 아님), Y = panoHz(점 min/max ±5% 패딩, 점 1개면 중앙).
 * SVG는 0..100 정규화 viewBox + preserveAspectRatio="none"으로 width 기준 스케일하고,
 * 선/점은 vector-effect="non-scaling-stroke"로 두께 왜곡을 막는다(점 = 0길이 round 선분).
 * points=0은 렌더하지 않는다 — 상위(MotorRow)가 "아직 기록 없음" 블록 소유(h160 비유지).
 */
export function PanoLineChart({points}: PanoLineChartProps) {
  const theme = useTheme()
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  if (firstPoint === undefined || lastPoint === undefined) return null

  const lime = (theme.vars ?? theme).palette.primary.main // 시그니처 라임 — hex 금지, theme 경유
  const hairline = (theme.vars ?? theme).palette.divider

  const times = points.map(point => new Date(point.measuredAt).getTime())
  const values = points.map(point => point.panoHz)
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueRange = maxValue - minValue
  const pad = valueRange * 0.05
  const domainMin = minValue - pad
  const domainMax = maxValue + pad
  const timeSpan = maxTime - minTime
  const single = points.length === 1

  const xOf = (index: number): number => {
    const time = times[index]
    if (points.length === 1 || time === undefined) return 50
    // 동시각 전건(degenerate)만 index 등간격 fallback — 정상 경로는 실제 시간 비례
    if (timeSpan === 0) return (index / (points.length - 1)) * 100
    return ((time - minTime) / timeSpan) * 100
  }
  const yOf = (value: number): number =>
    domainMax === domainMin ? 50 : ((domainMax - value) / (domainMax - domainMin)) * 100

  const coords = points.map((point, index) => ({
    id: point.id,
    x: xOf(index),
    y: yOf(point.panoHz),
  }))
  const linePath = coords.map((c, index) => `${index === 0 ? 'M' : 'L'}${c.x} ${c.y}`).join(' ')
  const lastId = lastPoint.id

  const datePart = (iso: string): string => formatDateTimeShort(iso).split(' ')[0] ?? EM_DASH
  const labelSx = {color: 'text.secondary', lineHeight: 1, position: 'absolute'} as const

  return (
    // 장식 채널 전체 숨김 — 수치·추세의 canonical은 아래 기록 리스트(§5.5 a11y 계약)
    <Box aria-hidden="true" sx={{position: 'relative', width: '100%', height: CHART_HEIGHT}}>
      <Box
        sx={{
          position: 'absolute',
          top: PLOT_INSET.top,
          right: PLOT_INSET.right,
          bottom: PLOT_INSET.bottom,
          left: PLOT_INSET.left,
        }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{display: 'block', overflow: 'visible'}}>
          {/* 그리드 — hairline 수평 ≤2줄. 점 1개면 점을 지나는 수평 기준선 1줄 */}
          {single ? (
            <line x1={0} y1={50} x2={100} y2={50} stroke={hairline} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ) : (
            <>
              <line x1={0} y1={33.3} x2={100} y2={33.3} stroke={hairline} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <line x1={0} y1={66.7} x2={100} y2={66.7} stroke={hairline} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            </>
          )}
          {/* 꺾은선 — 점 ≥2일 때만 (점 1개 = 점만) */}
          {!single && (
            <path d={linePath} fill="none" stroke={lime} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          )}
          {/* 점 r3(지름 6) · 마지막 점 강조 r4(지름 8) — 0길이 round 선분(비균등 스케일에서도 원형 유지) */}
          {coords.map(coord => (
            <line
              key={coord.id}
              x1={coord.x}
              y1={coord.y}
              x2={coord.x}
              y2={coord.y}
              stroke={lime}
              strokeWidth={coord.id === lastId ? 8 : 6}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </Box>
      {/* Y 라벨 min/max 2개 (overline 톤) — 도메인이 아닌 실측 min/max 표기 */}
      <Typography variant="overline" component="span" sx={{...labelSx, top: 0, left: PLOT_INSET.left}}>
        {formatPanoValue(maxValue)}
      </Typography>
      {!single && (
        <Typography
          variant="overline"
          component="span"
          sx={{...labelSx, bottom: PLOT_INSET.bottom, left: PLOT_INSET.left}}>
          {formatPanoValue(minValue)}
        </Typography>
      )}
      {/* X 라벨 처음/끝 날짜 2개 — 점 1개면 중앙 1개 */}
      {single ? (
        <Typography
          variant="overline"
          component="span"
          sx={{...labelSx, bottom: 0, left: '50%', transform: 'translateX(-50%)'}}>
          {datePart(firstPoint.measuredAt)}
        </Typography>
      ) : (
        <>
          <Typography variant="overline" component="span" sx={{...labelSx, bottom: 0, left: PLOT_INSET.left}}>
            {datePart(firstPoint.measuredAt)}
          </Typography>
          <Typography variant="overline" component="span" sx={{...labelSx, bottom: 0, right: PLOT_INSET.right}}>
            {datePart(lastPoint.measuredAt)}
          </Typography>
        </>
      )}
    </Box>
  )
}
