import {Box, useTheme} from '@mui/material'
import {LineChart} from '@mui/x-charts/LineChart'
import {EM_DASH, formatDateTimeShort, formatFanoHz, formatPanoValue} from '@shared/lib/format'

// PanoLineChart (component-spec v2 §5.5 · layout-spec v2 §5.2 — T-5).
// v2.3: 커스텀 SVG → @mui/x-charts LineChart 교체(사용자 요구 — 시각 품질 개선).
// a11y 계약 유지: 전체 aria-hidden — canonical 데이터는 소비 화면의 기록 리스트 텍스트(§5.2).
// 차트 단독 사용 금지(기록 리스트 없는 소비 금지).
// hover 툴팁·crosshair는 **포인터 전용 보조 표시**다(v2.3 추가): tab 스톱·포커스 가능 자손을
// 만들지 않으므로 aria-hidden 계약과 정합하고, 키보드·스크린리더 사용자는 동일 정보를
// 기록 리스트 텍스트에서 얻는다(툴팁이 유일한 정보 경로가 되어서는 안 된다).

export interface PanoLineChartPoint {
  /** stable entity id — 상위 렌더 key(index 금지) */
  id: string
  measuredAt: string
  panoHz: number
}

export interface PanoLineChartProps {
  /** measuredAt asc, ≤20건 — listMeasureRecordsByMotor 결과 그대로(재정렬 금지) */
  points: ReadonlyArray<PanoLineChartPoint>
}

const CHART_HEIGHT = 140 // R18(사용자): 그래프 높이 축소 — 스크롤 셸에서 리스트 공간 확보(추세 보조 채널이므로 축소 무해)

/**
 * v2.21(사용자): X축을 **시간축 → 측정 인덱스(1..N 회차)** 로 바꿨다. 측정 간격이 불규칙해서
 * 시간축으로 두면 점들이 한쪽에 몰려 추세가 안 보였다 — 등간격 회차 축이 "몇 번째 측정에서
 * 파노가 어떻게 변했나"를 곧게 보여준다. 측정 시각은 툴팁 헤더에 남겨 맥락을 유지한다
 * (canonical 데이터는 여전히 기록 리스트 텍스트 — §5.2).
 * Y = panoHz(라이브러리 자동 도메인). 라임 라인 + monotoneX + 영역 tint로 추세 강조.
 * points=0은 렌더하지 않는다 — 상위가 "아직 기록 없음" 블록 소유.
 */
export function PanoLineChart({points}: PanoLineChartProps) {
  const theme = useTheme()
  if (points.length === 0) return null

  const palette = (theme.vars ?? theme).palette
  const lime = palette.primary.main // 시그니처 라임 — hex 금지, theme 경유
  const hairline = palette.divider
  const markStroke = palette.background.paper // 마커 외곽선 = 배경색(면과 분리)

  // X = 측정 회차(1..N, 등간격 point scale). 회차→측정 시각 역참조로 툴팁에 시각 표시
  const xData = points.map((_, index) => index + 1)
  const timeBySeq = new Map(points.map((point, index) => [index + 1, point.measuredAt]))
  const yData = points.map(point => point.panoHz)
  const seqTooltip = (seq: Date | number | string): string => {
    const n = Number(seq)
    const at = timeBySeq.get(n)
    return at === undefined ? `${n}회차` : `${n}회차 · ${formatDateTimeShort(at)}`
  }

  // Y 도메인 — 실측 min/max에 여유(range의 15%, 단일값은 ±5%)를 둬 파노 변화를 넓게 보인다
  // (0 기준 자동 스케일은 170~620 Hz 대역 변화를 상단에 눌러 붙여 추세가 안 보인다).
  const minValue = Math.min(...yData)
  const maxValue = Math.max(...yData)
  const pad = maxValue > minValue ? (maxValue - minValue) * 0.15 : Math.max(maxValue * 0.05, 1)
  const domainMin = minValue - pad
  const domainMax = maxValue + pad

  return (
    // 장식 채널 전체 숨김 — 수치·추세의 canonical은 소비 화면의 기록 리스트(§5.5 a11y 계약)
    <Box aria-hidden="true" sx={{width: '100%'}}>
      <LineChart
        height={CHART_HEIGHT}
        margin={{top: 16, right: 16, bottom: 8, left: 8}}
        hideLegend
        // aria-hidden 컨테이너 안에 tabindex=0 surface가 생기면 "포커스는 가되 AT에는 없는"
        // 요소가 되어 WCAG 위반이다 — 키보드 탐색을 끄고 tab 스톱을 0으로 유지한다.
        disableKeyboardNavigation
        // hover crosshair — 포인터 전용 보조선(세로만, 값 축은 툴팁이 담당)
        axisHighlight={{x: 'line', y: 'none'}}
        grid={{horizontal: true}}
        xAxis={[
          {
            data: xData,
            scaleType: 'point', // 회차 등간격 — 측정 간격 불규칙을 흡수
            // tick은 회차 숫자만, 툴팁 헤더는 "N회차 · 측정 시각" — location으로 분기
            valueFormatter: (value: Date | number | string, context) =>
              context.location === 'tooltip' ? seqTooltip(value) : String(value),
            disableLine: true,
            disableTicks: true,
          },
        ]}
        yAxis={[
          {
            valueFormatter: (value: number) => formatPanoValue(value),
            min: domainMin,
            max: domainMax,
            tickNumber: 3,
            disableLine: true,
            disableTicks: true,
          },
        ]}
        series={[
          {
            data: yData,
            label: '파노', // 툴팁 행 라벨 (hideLegend이므로 범례에는 노출되지 않는다)
            color: lime,
            area: true,
            curve: 'monotoneX',
            showMark: true,
            valueFormatter: value => (value === null ? EM_DASH : formatFanoHz(value)),
          },
        ]}
        sx={{
          '& .MuiAreaElement-root': {fillOpacity: 0.16},
          '& .MuiLineElement-root': {strokeWidth: 2.5},
          '& .MuiMarkElement-root': {fill: lime, stroke: markStroke, strokeWidth: 1.5},
          '& .MuiChartsGrid-line': {stroke: hairline, strokeDasharray: '3 3'},
          '& .MuiChartsAxis-tickLabel': {fill: palette.text.secondary, fontSize: '0.7rem'},
          // hover crosshair — 그리드보다 뚜렷하되 라인보다 약하게(장식 위계 유지)
          '& .MuiChartsAxisHighlight-root': {
            stroke: palette.text.secondary,
            strokeDasharray: '4 3',
          },
        }}
      />
    </Box>
  )
}
