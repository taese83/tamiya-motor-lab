import {Box, Paper, Typography} from '@mui/material'

import {RACE_RESULT_LABELS} from '@shared/config/domain'
import {numericTypography} from '@shared/config/design-tokens'
import {
  formatDateTimeShort,
  formatFanoHz,
  formatLapTimeSec,
  formatVoltage,
} from '@shared/lib/format'
import {PencilIcon, TrashIcon} from '@shared/ui/icons'
import {SWIPE_ACTION_WIDTH, SwipeActionButton, SwipeActions} from '@shared/ui/swipe-actions'

import type {RaceRecord} from '@entities/race-record'

export interface RaceRecordRowProps {
  record: RaceRecord
  /** 회차 번호 — 최신 행 = 총 건수(내림차순 번호 부여는 page), 표시 전용 */
  index: number
  /** [수정] — 기존 기록 값으로 edit 시트 오픈 (v2.3, useRaceEntry.editRecord 위임) */
  onEdit: (record: RaceRecord) => void
  /** stable entity id — confirm·mutation은 상위 흐름(useRaceDeleteFlow) 소유 (LD-4) */
  onDelete: (id: string) => void
  /** 삭제 command 진행 중 — 트레이 액션 disabled (single-flight) */
  deletePending: boolean
  /** 트레이 열림 — 단일 열림 규칙은 소비 페이지 소유 */
  swipeOpen: boolean
  onSwipeOpenChange: (open: boolean) => void
}

/**
 * S6 레이스 기록 행 (component-spec §6.2, layout §6.2 — R-2·R-7·LD-4).
 *
 * v2.16: [수정]·[삭제]를 **행 위에서 스와이프 트레이로 이동**했다(LD-4 번복 — 근거는
 * layout-spec LD-4 v2.16 항과 SwipeActions 주석). 버튼은 사라지지 않고 트레이 안에
 * 그대로 살아 있어 Tab·스크린리더로 계속 도달한다 — 제스처는 노출 수단일 뿐이다.
 *
 * 부수 효과로 v2.14에서 미뤄둔 레이아웃 문제가 풀렸다: 이전에는 버튼 2개와 수치가
 * 같은 우측 공간을 다퉈 값을 우측 정렬할 수 없었다. 버튼이 트레이로 빠지면서
 * 다른 목록(MotorRow·RaceMotorList)과 같은 **좌측 식별 / 우측 수치** 2열이 된다.
 *
 * 상태: normal / delete-pending / swipe-open.
 */
export function RaceRecordRow({
  record,
  index,
  onEdit,
  onDelete,
  deletePending,
  swipeOpen,
  onSwipeOpenChange,
}: RaceRecordRowProps) {
  const dateTimeLabel = formatDateTimeShort(record.createdAt)
  // v2.31 result 옵션 — 미정이면 '미정' 표시(결과를 아직 안 넣은 세팅 기록)
  const resultLabel = record.result !== undefined ? RACE_RESULT_LABELS[record.result] : '미정'
  // 보조 줄 — 결과·전압(·랩타임). 파노는 우측 주값으로 빠졌다(다른 목록과 동일 축)
  const detailLine = `${resultLabel} · ${formatVoltage(record.voltage)}${
    record.lapTimeMs !== undefined ? ` · ${formatLapTimeSec(record.lapTimeMs)}` : ''
  }`
  const rowLabel = `${index}회차, ${dateTimeLabel}, ${detailLine}, 파노 ${formatFanoHz(record.panoHz)}`

  return (
    <SwipeActions
      open={swipeOpen}
      onOpenChange={onSwipeOpenChange}
      trayWidth={SWIPE_ACTION_WIDTH * 2}
      actions={
        <>
          <SwipeActionButton
            icon={<PencilIcon size={20} />}
            label="수정"
            ariaLabel={`${dateTimeLabel} 레이스 기록 수정`}
            onClick={() => onEdit(record)}
            disabled={deletePending}
          />
          <SwipeActionButton
            destructive
            icon={<TrashIcon size={20} />}
            label="삭제"
            ariaLabel={`${dateTimeLabel} 레이스 기록 삭제`}
            onClick={() => onDelete(record.id)}
            disabled={deletePending}
          />
        </>
      }>
      {/*
        행은 button이 아니다 — 레이스 기록에는 진입할 상세가 없다. 그래서 aria-label을 걸어도
        읽히지 않으므로 group role로 묶어 2열 텍스트가 한 덩어리로 읽히게 한다.
      */}
      <Paper variant="outlined" role="group" aria-label={rowLabel} sx={{px: 2, py: 1.5}}>
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1.5}}>
          {/* 좌측 2줄 — 회차·일시(주) / 결과·전압·랩타임(부) */}
          <Box sx={{minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25}}>
            <Box sx={{display: 'flex', alignItems: 'baseline', gap: 1}}>
              <Typography component="span" variant="overline" color="text.secondary">
                {String(index).padStart(2, '0')}
              </Typography>
              <Typography
                component="span"
                variant="body2"
                sx={{fontVariantNumeric: 'tabular-nums lining-nums'}}>
                {dateTimeLabel}
              </Typography>
            </Box>
            <Typography
              component="span"
              variant="body2"
              sx={{
                color: 'text.secondary',
                lineHeight: 1.2,
                fontVariantNumeric: 'tabular-nums lining-nums',
              }}>
              {detailLine}
            </Typography>
          </Box>

          {/* 우측 주값 — 파노. 값끼리 세로로 정렬돼 행 간 비교가 된다(v2.14 근거 승계) */}
          <Typography
            component="span"
            sx={{...numericTypography.listValue, flexShrink: 0, lineHeight: 1.2}}>
            {formatFanoHz(record.panoHz)}
          </Typography>
        </Box>
      </Paper>
    </SwipeActions>
  )
}
