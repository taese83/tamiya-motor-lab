import {Box, Paper, Typography} from '@mui/material'

import {RACE_RESULT_LABELS, retireReasonRowLabel} from '@shared/config/domain'
import {numericTypography} from '@shared/config/design-tokens'
import {
  formatDateTimeShort,
  formatFanoHz,
  formatLapTimeSec,
  formatVoltage,
} from '@shared/lib/format'
import {TrashIcon} from '@shared/ui/icons'
import {SWIPE_ACTION_WIDTH, SwipeActionButton, SwipeActions} from '@shared/ui/swipe-actions'

import type {RaceRecord} from '@entities/race-record'
import type {KeyboardEvent} from 'react'

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
 * v2.16: [삭제]를 **행 위에서 스와이프 트레이로 이동**했다(LD-4 번복 — 근거는
 * layout-spec LD-4 v2.16 항과 SwipeActions 주석). 버튼은 사라지지 않고 트레이 안에
 * 그대로 살아 있어 Tab·스크린리더로 계속 도달한다 — 제스처는 노출 수단일 뿐이다.
 *
 * R41(사용자 ②): [수정]은 스와이프에서 빼고 **행 본체 클릭**으로 승격한다(수정이 가장 잦은 행동인데
 * 스와이프 뒤에 숨어 있었다). 행은 이제 button — 클릭·Enter·Space로 편집 시트를 연다. 스와이프
 * 트레이에는 파괴 액션 [삭제]만 남는다(오탭 복구는 여전히 ConfirmDialog 경유). 탭 vs 스와이프
 * 판정은 SwipeActions의 handleClickCapture가 소유하므로 클릭 핸들러는 그대로 얹으면 된다.
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
  // 행 클릭 → 수정. deletePending 중엔 무시(삭제 확정 중 편집 진입 방지, single-flight 정합)
  const handleEdit = () => {
    if (!deletePending) onEdit(record)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault() // Space 스크롤 억제 + implicit 동작 방지
      handleEdit()
    }
  }
  // v2.31 result 옵션 — 미정이면 '미정' 표시(결과를 아직 안 넣은 세팅 기록)
  const resultLabel = record.result !== undefined ? RACE_RESULT_LABELS[record.result] : '미정'
  // R20 — 이탈 행에만 사유 라벨을 결과 직후에 잇는다(예: '이탈 · 비거리 김 · 3.2V').
  // 축약 규칙(D-R3: 말단 라벨, '그 외' 계열은 경로 병기)은 retireReasonRowLabel(domain)이 소유.
  // 완주·미정 행과 사유 없는 이탈 행은 무변경. rowLabel(aria)도 detailLine을 그대로 써서 일치.
  const retireReasonSuffix =
    record.result === 'retired' && record.retireReason !== undefined
      ? ` · ${retireReasonRowLabel(record.retireReason)}`
      : ''
  // 보조 줄 — 결과(·사유)·전압(·랩타임). 파노는 우측 주값으로 빠졌다(다른 목록과 동일 축)
  const detailLine = `${resultLabel}${retireReasonSuffix} · ${formatVoltage(record.voltage)}${
    record.lapTimeMs !== undefined ? ` · ${formatLapTimeSec(record.lapTimeMs)}` : ''
  }`
  const rowLabel = `${index}회차, ${dateTimeLabel}, ${detailLine}, 파노 ${formatFanoHz(record.panoHz)}`

  return (
    <SwipeActions
      open={swipeOpen}
      onOpenChange={onSwipeOpenChange}
      trayWidth={SWIPE_ACTION_WIDTH}
      actions={
        <SwipeActionButton
          destructive
          icon={<TrashIcon size={20} />}
          label="삭제"
          ariaLabel={`${dateTimeLabel} 레이스 기록 삭제`}
          onClick={() => onDelete(record.id)}
          disabled={deletePending}
        />
      }>
      {/*
        R41 ②: 행은 이제 button — 클릭·Enter·Space로 수정 시트를 연다. aria-label은 2열 텍스트를
        한 덩어리로 읽히게 하고, 편집 진입이라는 역할은 role=button이 전달한다.
      */}
      <Paper
        variant="outlined"
        role="button"
        tabIndex={0}
        aria-label={rowLabel}
        aria-disabled={deletePending || undefined}
        onClick={handleEdit}
        onKeyDown={handleKeyDown}
        sx={{px: 2, py: 1.5, cursor: 'pointer', '&:hover': {borderColor: 'text.secondary'}}}>
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
