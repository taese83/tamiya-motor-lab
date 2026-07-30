import {Box, List, ListItem, ListItemButton, Paper, Typography} from '@mui/material'

import {MOTOR_KIND_LABELS, RACE_RESULT_LABELS} from '@shared/config/domain'
import {
  MOTOR_CARD_TINT_ALPHA,
  motorKindColors,
  numericTypography,
  withAlpha,
} from '@shared/config/design-tokens'
import {
  EM_DASH,
  formatDateTimeShort,
  formatFanoHz,
  formatLapTimeSec,
  formatVoltage,
} from '@shared/lib/format'

import type {MotorSummary, MotorSummaryRace} from '@entities/motor'

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
// solid accent bar + 좌측 2줄(이름/종류) + 우측 2줄(주값/보조). 같은 모터를 두 화면이
// 다르게 그리면 동일 대상이라는 인식이 끊긴다. 우측 주값은 이 화면의 관심사인
// **마지막 레이스 파노**이고 보조는 결과·전압(·랩타임)이다.

/** 마지막 레이스 보조 줄 — 결과 · 전압 (· 랩타임) */
const raceDetailLine = (race: MotorSummaryRace): string => {
  const base = `${RACE_RESULT_LABELS[race.result]} · ${formatVoltage(race.voltage)}`
  return race.lapTimeMs !== undefined ? `${base} · ${formatLapTimeSec(race.lapTimeMs)}` : base
}

/**
 * S5 레이스 목록 — 모터 카드 + 마지막 레이스 요약 (component-spec §6.1, layout §6.1).
 * 표시 전용: `motorQueries.summaries` 결과를 그대로 받는다(파생 join은 데이터 계층 — INV-09).
 * 상태: populated / per-row no-race("레이스 기록 없음" 중립 — 오류 위장 금지).
 * empty(모터 0)는 상위가 EmptyState로 대체 — 본 컴포넌트 미렌더.
 */
export function RaceMotorList({summaries, onSelect}: RaceMotorListProps) {
  return (
    <List disablePadding sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
      {summaries.map(summary => {
        const {motor, lastRace} = summary
        const visual = motorKindColors[motor.kind]
        const kindLabel = MOTOR_KIND_LABELS[motor.kind]
        // 행 accessible name 고정 — 2열 텍스트를 그대로 읽히면 순서가 산만하다(MotorRow와 동일 근거)
        const rowLabel =
          lastRace !== undefined
            ? `${motor.name}, ${kindLabel}, 마지막 레이스 ${formatDateTimeShort(lastRace.createdAt)} ${raceDetailLine(lastRace)}, 파노 ${formatFanoHz(lastRace.panoHz)}`
            : `${motor.name}, ${kindLabel}, 레이스 기록 없음`

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

                {/* 우측 2줄 — 마지막 레이스 파노(주) / 결과·전압(부). 기록 없음은 EM_DASH */}
                <Box
                  sx={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 0.25,
                  }}>
                  {lastRace !== undefined ? (
                    <>
                      <Typography
                        component="span"
                        sx={{...numericTypography.listValue, lineHeight: 1.2}}>
                        {formatFanoHz(lastRace.panoHz)}
                      </Typography>
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          lineHeight: 1.2,
                          fontVariantNumeric: 'tabular-nums lining-nums',
                        }}>
                        {raceDetailLine(lastRace)}
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Typography
                        component="span"
                        sx={{
                          ...numericTypography.listValue,
                          color: 'text.secondary',
                          lineHeight: 1.2,
                        }}>
                        {EM_DASH}
                      </Typography>
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{color: 'text.secondary', lineHeight: 1.2}}>
                        레이스 기록 없음
                      </Typography>
                    </>
                  )}
                </Box>
              </ListItemButton>
            </Paper>
          </ListItem>
        )
      })}
    </List>
  )
}
