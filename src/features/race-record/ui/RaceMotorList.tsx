import {Box, List, ListItem, ListItemButton, Paper, Typography} from '@mui/material'

import {MOTOR_KIND_LABELS} from '@shared/config/domain'
import {
  MOTOR_CARD_TINT_ALPHA,
  motorKindColors,
  numericTypography,
  withAlpha,
} from '@shared/config/design-tokens'
import {EM_DASH, formatFanoHz, formatVoltage} from '@shared/lib/format'

import type {MotorSummary} from '@entities/motor'

export interface RaceMotorListProps {
  /** sortOrder asc — S3와 동일 순서(화면 간 불일치 금지). 정렬은 데이터 계층 소유 */
  summaries: ReadonlyArray<MotorSummary>
  /** 행 탭 → `/race/:motorId` — navigate는 page 소유 */
  onSelect: (motorId: string) => void
}

// R-1 마지막 레이스 요약 (component-spec §6.1) — 결과 라벨은 중립 텍스트(DS-A5,
// finished/retired에 시맨틱 색 금지). 라벨·포맷 전부 shared 경유, 하드코딩 금지.
//
// v2.14: 모터 목록 카드(MotorRow)와 **같은 패턴**으로 통일한다 — 종류색 tint 면 + 좌측
// solid accent bar + 좌측 2줄(이름/종류) + 우측 2줄(주값/보조).
//
// R41(사용자 ③④): 우측 주값을 "완주 기준 파노"로 바꾼다 — 완주 레이스가 있으면 그 완주 파노(부값은
// "완주 · {완주 전압}"), 완주가 없으면 **가장 최근 측정 파노**를 대신 노출한다(레이스가 없어도 파노를
// 보여 판단 근거를 남긴다). 완주도 측정도 없으면 EM_DASH. 부값은 완주 유무·레이스 유무를 중립 문구로 구분한다.

interface RightColumn {
  /** 주값 파노 — null이면 EM_DASH(완주·측정 둘 다 없음) */
  panoHz: number | null
  /** 보조 줄 — "완주 · {전압}" / "완주 기록 없음" / "레이스 기록 없음" */
  detail: string
}

/** 우측 표시 파생 — 완주 우선(파노·전압), 없으면 최근 측정 파노 + 중립 문구 (R41 ③④) */
function deriveRightColumn(summary: MotorSummary): RightColumn {
  const {lastFinishedRace, lastMeasure, raceCount} = summary
  if (lastFinishedRace !== undefined) {
    return {
      panoHz: lastFinishedRace.panoHz,
      detail: `완주 · ${formatVoltage(lastFinishedRace.voltage)}`,
    }
  }
  // 완주 없음 — 파노는 최근 측정값으로 대체(③), 부값은 레이스 유무로 갈린다(오류 위장 금지)
  return {
    panoHz: lastMeasure?.panoHz ?? null,
    detail: raceCount > 0 ? '완주 기록 없음' : '레이스 기록 없음',
  }
}

/**
 * S5 레이스 목록 — 모터 카드 + 완주 기준 요약 (component-spec §6.1, layout §6.1).
 * 표시 전용: `motorQueries.summaries` 결과를 그대로 받는다(파생 join은 데이터 계층 — INV-09).
 * 상태: 완주 있음(완주 파노·전압) / 완주 없음(최근 측정 파노 + 중립 문구).
 * empty(모터 0)는 상위가 EmptyState로 대체 — 본 컴포넌트 미렌더.
 */
export function RaceMotorList({summaries, onSelect}: RaceMotorListProps) {
  return (
    <List disablePadding sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
      {summaries.map(summary => {
        const {motor} = summary
        const visual = motorKindColors[motor.kind]
        const kindLabel = MOTOR_KIND_LABELS[motor.kind]
        const right = deriveRightColumn(summary)
        // 행 accessible name 고정 — 2열 텍스트를 그대로 읽히면 순서가 산만하다(MotorRow와 동일 근거)
        const panoLabel = right.panoHz !== null ? `파노 ${formatFanoHz(right.panoHz)}` : '파노 없음'
        const rowLabel = `${motor.name}, ${kindLabel}, ${panoLabel}, ${right.detail}`

        return (
          <ListItem key={motor.id} disablePadding>
            <Paper
              variant="outlined"
              sx={{
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
                // 종류색 카드 — MotorRow와 동일 토큰·동일 농도
                bgcolor: withAlpha(visual.bg, MOTOR_CARD_TINT_ALPHA),
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  backgroundColor: visual.bg,
                  // 검정/흰색처럼 배경에 가까운 종류도 윤곽이 남게 한다
                  borderRight: '1px solid',
                  borderRightColor: visual.border,
                },
              }}>
              <ListItemButton
                onClick={() => onSelect(motor.id)}
                aria-label={rowLabel}
                // v2.47(사용자): 높이·정렬을 모터 목록(MotorRow)과 통일 — 행 패딩 pl/pr 1.5,
                // 행 간격 1(List gap)로 MotorList(Stack spacing=1)·MotorRow(pl/pr 1.5)와 동일.
                sx={{minHeight: 64, alignItems: 'center', gap: 1.5, pl: 1.5, pr: 1.5, py: 1.25}}>
                {/* 좌측 2줄 — 이름(주) / 종류 라벨(부). 종류색은 카드·bar가 담당하므로 칩은 없다 */}
                <Box
                  sx={{minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25}}>
                  <Typography
                    component="span"
                    sx={{
                      fontWeight: 700,
                      lineHeight: 1.25,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                    {motor.name}
                  </Typography>
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{color: 'text.secondary', lineHeight: 1.2}}>
                    {kindLabel}
                  </Typography>
                </Box>

                {/* 우측 2줄 — 완주 파노(주, 없으면 최근 측정 파노·둘 다 없으면 —) / 완주 전압·중립 문구(부) */}
                <Box
                  sx={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 0.25,
                  }}>
                  <Typography
                    component="span"
                    sx={{
                      ...numericTypography.listValue,
                      lineHeight: 1.2,
                      ...(right.panoHz === null && {color: 'text.secondary'}),
                    }}>
                    {right.panoHz !== null ? formatFanoHz(right.panoHz) : EM_DASH}
                  </Typography>
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.2,
                      fontVariantNumeric: 'tabular-nums lining-nums',
                    }}>
                    {right.detail}
                  </Typography>
                </Box>
              </ListItemButton>
            </Paper>
          </ListItem>
        )
      })}
    </List>
  )
}
