import {Box} from '@mui/material'

// Sparkline (v2.12) — 목록 행 안에 들어가는 초소형 추세선 (레퍼런스: 종목 목록 행의 미니 차트).
//
// @mui/x-charts를 쓰지 않는 이유: 축·툴팁·범례가 전혀 필요 없는 장식 채널인데 행마다 차트
// 인스턴스를 만들면 목록(최대 30행) 렌더 비용이 커진다. 여기선 polyline 하나로 충분하다.
// 상세 화면의 큰 차트는 계속 x-charts가 담당한다(축·툴팁이 필요한 곳).
//
// a11y: 전체 aria-hidden — 수치의 canonical은 같은 행의 파노 값 텍스트다.
// 이 컴포넌트만으로 정보를 전달하지 않는다(행에 값 텍스트가 항상 함께 있어야 한다).

export interface SparklineProps {
  /** 오래된→최신 순 값. 0·1개면 렌더하지 않는다(선을 그릴 수 없다) */
  values: ReadonlyArray<number>
  /** 선 색 — 소비처가 테마/종류색을 넘긴다 */
  color: string
  width?: number
  height?: number
}

const VIEW_W = 100
const VIEW_H = 32

export function Sparkline({values, color, width = 56, height = 20}: SparklineProps) {
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  // 전 구간 동일값이면 중앙 수평선 — 0으로 나누지 않는다
  const yOf = (value: number): number =>
    span === 0 ? VIEW_H / 2 : VIEW_H - ((value - min) / span) * VIEW_H
  const xOf = (index: number): number => (index / (values.length - 1)) * VIEW_W

  const points = values.map((value, index) => `${xOf(index)},${yOf(value)}`).join(' ')

  return (
    <Box
      aria-hidden="true"
      component="svg"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      sx={{width, height, display: 'block', flexShrink: 0, overflow: 'visible'}}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        // 비균등 스케일(preserveAspectRatio none)에서도 선 두께가 일정하게 유지된다
        vectorEffect="non-scaling-stroke"
      />
    </Box>
  )
}
