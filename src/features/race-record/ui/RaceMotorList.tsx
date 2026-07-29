import {Box, List, ListItem, ListItemButton, Paper, Typography} from '@mui/material'

import {MotorKindChip} from '@entities/motor'
import {RACE_RESULT_LABELS} from '@shared/config/domain'
import {formatDateTimeShort, formatFanoHz, formatLapTimeSec, formatVoltage} from '@shared/lib/format'

import type {MotorSummary, MotorSummaryRace} from '@entities/motor'

export interface RaceMotorListProps {
  /** sortOrder asc — S3와 동일 순서(화면 간 불일치 금지). 정렬은 데이터 계층 소유 */
  summaries: ReadonlyArray<MotorSummary>
  /** 행 탭 → `/race/:motorId` — navigate는 page 소유 */
  onSelect: (motorId: string) => void
}

// R-1 마지막 레이스 요약 1줄 (component-spec §6.1) — 결과 라벨은 중립 텍스트(DS-A5,
// finished/retired에 시맨틱 색 금지). 라벨·포맷 전부 shared 경유, 하드코딩 금지.
const lastRaceSummary = (race: MotorSummaryRace): string => {
  const base = `마지막 레이스 ${formatDateTimeShort(race.createdAt)} ${
    RACE_RESULT_LABELS[race.result]
  } · ${formatVoltage(race.voltage)} · ${formatFanoHz(race.panoHz)}`
  return race.lapTimeMs !== undefined ? `${base} · ${formatLapTimeSec(race.lapTimeMs)}` : base
}

/**
 * S5 레이스 목록 — 모터 행 + 마지막 레이스 요약 (component-spec §6.1, layout §6.1).
 * 표시 전용: `motorQueries.summaries` 결과를 그대로 받는다(파생 join은 데이터 계층 — INV-09).
 * 상태: populated / per-row no-race("레이스 기록 없음" 중립 — 오류 위장 금지).
 * empty(모터 0)는 상위가 EmptyState로 대체 — 본 컴포넌트 미렌더.
 */
export function RaceMotorList({summaries, onSelect}: RaceMotorListProps) {
  return (
    <List disablePadding sx={{display: 'flex', flexDirection: 'column', gap: 1.5}}>
      {summaries.map(summary => (
        <ListItem key={summary.motor.id} disablePadding>
          <Paper variant="outlined" sx={{width: '100%'}}>
            {/* 행 전체가 단일 탭 타깃(h≥56) — accessible name은 자연 텍스트(이름·종류·요약) */}
            <ListItemButton
              onClick={() => onSelect(summary.motor.id)}
              sx={{
                minHeight: 56,
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 0.5,
                px: 2,
                py: 1.5,
              }}>
              {/* Chip은 div 렌더 — span 래퍼 금지(유효 마크업), Box(div)로 감싼다 */}
              <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                <Typography component="span" sx={{fontWeight: 600}}>
                  {summary.motor.name}
                </Typography>
                <MotorKindChip kind={summary.motor.kind} />
              </Box>
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
                sx={{fontVariantNumeric: 'tabular-nums lining-nums'}}>
                {summary.lastRace !== undefined ? lastRaceSummary(summary.lastRace) : '레이스 기록 없음'}
              </Typography>
            </ListItemButton>
          </Paper>
        </ListItem>
      ))}
    </List>
  )
}
