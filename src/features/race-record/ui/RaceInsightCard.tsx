import {Box, Button, Paper, Typography} from '@mui/material'
import {Fragment} from 'react'

import {RACE_RESULT_LABELS} from '@shared/config/domain'
import {numericTypography} from '@shared/config/design-tokens'
import {formatVoltage} from '@shared/lib/format'

import type {RaceInsight, TrendDir} from '@entities/race-record'

export interface RaceInsightCardProps {
  /** computeRaceInsight 결과 — 페이지가 racesQuery 파생으로 매 렌더 주입(카드는 IO·query 없음) */
  insight: RaceInsight
  /** [보는 법] — RaceInsightHelpDialog 열림 상태는 페이지 소유 (ConditionSummary 관례) */
  onOpenHelp: () => void
}

// 추세 라벨 (R22 사용자 확정 카피) — null은 줄 자체 생략(침묵 원칙)이라 맵에 없다.
// lapTimeMs: 낮을수록 좋음(improving=단축) / panoHz: 중립 지표 — 방향 서술만(상승·하락).
const TREND_LAP_LABELS: Record<NonNullable<TrendDir>, string> = {
  improving: '랩타임 단축 중',
  steady: '랩타임 유지',
  worsening: '랩타임 느려짐',
}
const TREND_PANO_LABELS: Record<NonNullable<TrendDir>, string> = {
  improving: '파노 상승',
  steady: '파노 유지',
  worsening: '파노 하락',
}

// 전압대 자릿수는 formatVoltage(RaceRecordRow 표기)와 반드시 일치해야 한다 — 요약↔목록 눈 대조
// 신뢰(ux-brief). 별도 toFixed를 두지 않고 formatVoltage에서 단위만 떼어, 자릿수 규칙이
// shared/lib/format 한 곳에 남게 한다.
const voltageDigits = (voltage: number): string => formatVoltage(voltage).replace(/ V$/, '')

// "완주 2.80–3.20 V" — 단위는 말미 1회. min=max(동일 전압 반복, F6)는 단일값으로 퇴화 표기.
function finishedBandLabel(band: NonNullable<RaceInsight['finishedBand']>): string {
  return band.minVoltage === band.maxVoltage
    ? `완주 ${formatVoltage(band.minVoltage)}`
    : `완주 ${voltageDigits(band.minVoltage)}–${formatVoltage(band.maxVoltage)}`
}

/**
 * 레이스 인사이트 요약 카드 (R22 — feature-plan U2, REQ-RI-001~005).
 *
 * 순수 제어형 표시 전용 — 데이터는 페이지가 computeRaceInsight로 주입하고, 유일한
 * 인터랙션은 [보는 법]뿐이다(REQ-RI-007: 탭 가능 affordance 금지 — 카드에 눌림감·화살표 없음).
 * 자체 margin 없음 — 상세 스크롤 상단 배치 간격은 소비 측 gap 소유.
 *
 * 상태 (kind):
 * - empty(0건): null — 미노출. 기존 "아직 레이스 기록이 없습니다" 안내는 페이지가 소유.
 * - insufficient(1~2건): 축약 1줄 — 있는 사실만. '추세' 단어 금지(오독 방지), 스트릭·전압대 미표시.
 * - ready(3건+): 최근 완주 전압(단일 강조, 라임) + 완주 전압대(보조, 우측) + 최근 흐름(색+텍스트
 *   병행 — 색 단독 금지) + 추세(발화 조건 있을 때만) + 미정 제외 고지(D3).
 */
export function RaceInsightCard({insight, onOpenHelp}: RaceInsightCardProps) {
  if (insight.kind === 'empty') return null

  if (insight.kind === 'insufficient') {
    return (
      <Paper component="section" aria-label="레이스 요약" variant="outlined" sx={{px: 2, py: 1.5}}>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontVariantNumeric: 'tabular-nums lining-nums',
            wordBreak: 'keep-all',
          }}>
          {insight.lastFinishedVoltage !== null && (
            <>
              <Box component="span" sx={{color: 'text.primary', fontWeight: 600}}>
                최근 완주 {formatVoltage(insight.lastFinishedVoltage)}
              </Box>
              {' · '}
            </>
          )}
          기록이 더 쌓이면 흐름이 보여요
        </Typography>
      </Paper>
    )
  }

  const {finishedBand, lastFinishedVoltage, streak, trend, excluded} = insight
  // 추세 — 하나라도 non-null일 때만 줄 노출, 둘 다 null이면 줄 자체 생략(침묵 원칙)
  const trendParts: string[] = []
  if (trend.lapTimeMs !== null) trendParts.push(TREND_LAP_LABELS[trend.lapTimeMs])
  if (trend.panoHz !== null) trendParts.push(TREND_PANO_LABELS[trend.panoHz])

  return (
    <Paper
      component="section"
      aria-label="레이스 요약"
      variant="outlined"
      sx={{px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75}}>
      {/* 1행 — 주 강조(최근 완주 전압, 유일한 큰 수치) + 우측 보조(완주 전압대).
          sr은 DOM 순서로 "최근 완주 전압 → 값"을 읽는다(라벨이 수치 맥락 제공). */}
      <Box sx={{display: 'flex', alignItems: 'flex-start', gap: 1.5}}>
        {lastFinishedVoltage !== null ? (
          <Box sx={{minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25}}>
            <Typography
              variant="overline"
              component="span"
              sx={{color: 'text.secondary', lineHeight: 1}}>
              최근 완주 전압
            </Typography>
            <Typography component="span" sx={{...numericTypography.guideRange, color: 'primary.main'}}>
              {formatVoltage(lastFinishedVoltage)}
            </Typography>
          </Box>
        ) : (
          // ready인데 완주 0건(전부 이탈) — 강조 대신 조용히. finishedBand도 함께 null이라 우측 생략.
          <Typography variant="body2" sx={{flex: 1, color: 'text.secondary'}}>
            완주 기록 없음
          </Typography>
        )}
        {finishedBand !== null && (
          <Typography
            component="span"
            variant="body2"
            sx={{
              color: 'text.secondary',
              flexShrink: 0,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums lining-nums',
            }}>
            {finishedBandLabel(finishedBand)}
          </Typography>
        )}
      </Box>

      {/* 최근 흐름 — 목록과 동일한 최신순(어긋남 오독 방지, ux-brief). 이탈은 색+굵기이되
          라벨 텍스트 자체가 구분을 전달한다 — 색 단독 금지(REQ-NFR-002). */}
      {streak.length > 0 && (
        <Typography variant="body2" component="p" sx={{m: 0, wordBreak: 'keep-all'}}>
          <Box component="span" sx={{color: 'text.secondary'}}>
            최근 흐름(최신순){' '}
          </Box>
          {streak.map((result, i) => (
            // 표시 전용 정적 나열 — 재정렬 없음, index key 안전
            <Fragment key={i}>
              {i > 0 && (
                <Box component="span" sx={{color: 'text.secondary'}}>
                  {' · '}
                </Box>
              )}
              <Box
                component="span"
                sx={
                  result === 'retired'
                    ? {color: 'error.main', fontWeight: 700}
                    : {color: 'text.primary'}
                }>
                {RACE_RESULT_LABELS[result]}
              </Box>
            </Fragment>
          ))}
        </Typography>
      )}

      {/* 추세 — 가장 조용한 텍스트(정보 우선순위 3). 발화 조건 없으면 위에서 이미 생략됨 */}
      {trendParts.length > 0 && (
        <Typography variant="body2" sx={{color: 'text.secondary', wordBreak: 'keep-all'}}>
          {trendParts.join(' · ')}
        </Typography>
      )}

      {/* 하단 — 미정 제외 고지(D3 채택안) + [보는 법]. 고지 없으면 버튼만 우측 정렬(ml auto) */}
      <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1}}>
        {excluded.resultPending > 0 && (
          <Typography
            variant="caption"
            sx={{color: 'text.secondary', fontVariantNumeric: 'tabular-nums lining-nums'}}>
            미정 {excluded.resultPending}건 제외
          </Typography>
        )}
        <Button
          size="small"
          variant="text"
          onClick={onOpenHelp}
          sx={{ml: 'auto', flexShrink: 0, mr: -1, my: -0.5, minHeight: 0, py: 0.25}}>
          보는 법
        </Button>
      </Box>
    </Paper>
  )
}
