import {Box, Button, Paper, Typography} from '@mui/material'

import {RACE_RESULT_LABELS} from '@shared/config/domain'
import {numericTypography} from '@shared/config/design-tokens'
import {formatDateTimeShort, formatFanoHz, formatLapTimeSec, formatVoltage} from '@shared/lib/format'

import type {RaceRecord} from '@entities/race-record'

export interface RaceRecordRowProps {
  record: RaceRecord
  /** 회차 번호 — 최신 행 = 총 건수(내림차순 번호 부여는 page), 표시 전용 */
  index: number
  /** [수정] — 기존 기록 값으로 edit 시트 오픈 (v2.3, useRaceEntry.editRecord 위임) */
  onEdit: (record: RaceRecord) => void
  /** stable entity id — confirm·mutation은 상위 흐름(useRaceDeleteFlow) 소유 (LD-4) */
  onDelete: (id: string) => void
  /** 삭제 command 진행 중 — [수정]·[삭제] disabled (single-flight) */
  deletePending: boolean
}

/**
 * S6 레이스 기록 행 (component-spec §6.2, layout §6.2 — R-2·R-7·LD-4).
 * v2.3: 우측 액션 [수정]·[삭제] 각각 44×44 독립 타깃(행 텍스트와 중첩 금지 — 스와이프 기각).
 * 결과 라벨은 중립색(DS-A5), 수치 tabular. 상태: normal / delete-pending.
 */
export function RaceRecordRow({record, index, onEdit, onDelete, deletePending}: RaceRecordRowProps) {
  const dateTimeLabel = formatDateTimeShort(record.createdAt)
  const detailLine = `${RACE_RESULT_LABELS[record.result]} · ${formatVoltage(record.voltage)} · ${formatFanoHz(record.panoHz)}${
    record.lapTimeMs !== undefined ? ` · ${formatLapTimeSec(record.lapTimeMs)}` : ''
  }`
  return (
    <Paper variant="outlined" sx={{px: 2, py: 1.5}}>
      <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
        <Typography component="span" variant="overline" color="text.secondary">
          {String(index).padStart(2, '0')}
        </Typography>
        <Typography
          component="span"
          variant="body2"
          sx={{fontVariantNumeric: 'tabular-nums lining-nums'}}>
          {dateTimeLabel}
        </Typography>
        <Box sx={{flex: 1}} aria-hidden="true" />
        {/*
         * 텍스트 [수정]·[삭제] 버튼 — 색 단독 구분 금지 계약상 텍스트 라벨이 안전하다.
         * destructive contained는 ConfirmDialog 전용 — 여기는 outlined 톤(§5.2 푸터와 동일 규칙).
         */}
        <Button
          variant="outlined"
          onClick={() => onEdit(record)}
          disabled={deletePending}
          aria-label={`${dateTimeLabel} 레이스 기록 수정`}
          sx={{minWidth: 44, minHeight: 44, flexShrink: 0}}>
          수정
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={() => onDelete(record.id)}
          disabled={deletePending}
          aria-label={`${dateTimeLabel} 레이스 기록 삭제`}
          sx={{minWidth: 44, minHeight: 44, flexShrink: 0}}>
          삭제
        </Button>
      </Box>
      <Typography component="p" sx={{...numericTypography.listValue, mt: 0.5}}>
        {detailLine}
      </Typography>
    </Paper>
  )
}
