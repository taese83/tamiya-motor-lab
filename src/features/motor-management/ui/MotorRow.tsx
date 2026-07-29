import {Box, ButtonBase, Paper, Typography} from '@mui/material'

import {MOTOR_KIND_LABELS} from '@shared/config/domain'
import {
  MOTOR_CARD_TINT_ALPHA,
  motorKindColors,
  numericTypography,
  withAlpha,
} from '@shared/config/design-tokens'
import {EM_DASH, formatFanoHz, formatRpm} from '@shared/lib/format'

import {PencilIcon, TrashIcon} from '@shared/ui/icons'
import {Sparkline} from '@shared/ui/sparkline'
import {SWIPE_ACTION_WIDTH, SwipeActionButton, SwipeActions} from '@shared/ui/swipe-actions'

import type {MotorSummary} from '@entities/motor'

// MotorRow — 모터 카드. 행 본체 탭 → onSelect(motorId): 상세('/motors/:motorId') 진입.
// 수정·삭제는 왼쪽 스와이프 트레이(v2.16).
//
// v2.26(사용자): **드래그 정렬(DnD) 제거.** 모터 목록 순서는 정렬 컨트롤(최근 등록순·파노·이름)이
// 소유하고 수동 재배치는 없앴다 — useSortable·핸들·transform·reorderDisabled 전부 삭제.
//
// v2.12 종류색 카드 + 2열: 카드 면을 종류색 tint로 깔고 좌측 solid accent bar로 식별.
// 좌측 2줄(이름/종류) · 우측 2줄(최신 파노/rpm) · 가운데 추세 스파크라인.

export interface MotorRowProps {
  /** motor + measureCount + lastMeasure? + raceCount + lastRace? — 정렬 순 상위 공급 */
  summary: MotorSummary
  /** 행 본체 탭 — 상세 페이지 진입(내비게이션은 페이지 소유) */
  onSelect: (motorId: string) => void
  /** [수정] — 이름·종류 편집 시트 오픈 (스와이프 트레이) */
  onEdit: (motor: MotorSummary['motor']) => void
  /** [삭제] — cascade 삭제 플로우 진입. 실측 건수 고지·확정은 useMotorDeleteFlow 소유 */
  onDelete: (motor: MotorSummary['motor']) => void
  /** 트레이 열림 — 단일 열림 규칙은 MotorList 소유 */
  swipeOpen: boolean
  onSwipeOpenChange: (open: boolean) => void
  /** 삭제 대상 건수 조회 중 — 트레이 액션 disabled(중복 진입 방지) */
  actionsPending?: boolean | undefined
}

export function MotorRow({
  summary,
  onSelect,
  onEdit,
  onDelete,
  swipeOpen,
  onSwipeOpenChange,
  actionsPending = false,
}: MotorRowProps) {
  const {motor, lastMeasure, panoTrend} = summary
  const visual = motorKindColors[motor.kind]
  const kindLabel = MOTOR_KIND_LABELS[motor.kind]
  // 행 전체를 한 문장으로 고정 — 2열 텍스트를 그대로 읽히면 순서가 산만하다.
  const rowLabel =
    lastMeasure !== undefined
      ? `${motor.name}, ${kindLabel}, 최신 파노 ${formatFanoHz(lastMeasure.panoHz)}`
      : `${motor.name}, ${kindLabel}, 기록 없음`

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
            ariaLabel={`'${motor.name}' 수정`}
            onClick={() => onEdit(motor)}
            disabled={actionsPending}
          />
          <SwipeActionButton
            destructive
            icon={<TrashIcon size={20} />}
            label="삭제"
            ariaLabel={`'${motor.name}' 삭제`}
            onClick={() => onDelete(motor)}
            disabled={actionsPending}
          />
        </>
      }>
      <Paper
        variant="outlined"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          // v2.12 종류색 카드 — tint 면 + 좌측 solid accent bar(::before)
          bgcolor: withAlpha(visual.bg, MOTOR_CARD_TINT_ALPHA),
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor: visual.bg,
            borderRight: '1px solid',
            borderRightColor: visual.border,
          },
        }}>
        {/* 행 본체 = 상세 진입 native button. accessible name은 aria-label로 고정한다.
            DnD 핸들 제거(v2.26) — 좌측 accent bar 여백만큼 pl을 준다. */}
        <ButtonBase
          onClick={() => onSelect(motor.id)}
          aria-label={rowLabel}
          sx={{
            width: '100%',
            minHeight: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            pl: 1.5,
            pr: 1.5,
            py: 1.25,
            textAlign: 'left',
          }}>
          {/* 좌측 2줄 — 이름(주) / 종류 라벨(부) */}
          <Box sx={{minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25}}>
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

          {/* 추세 스파크라인 — 장식(aria-hidden). currentColor로 양 모드 가독성 유지 */}
          <Sparkline values={panoTrend} color="currentColor" />

          {/* 우측 2줄 — 최신 파노(주) / rpm(부). 값 없음은 EM_DASH */}
          <Box
            sx={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 0.25,
            }}>
            {lastMeasure !== undefined ? (
              <>
                <Typography component="span" sx={{...numericTypography.listValue, lineHeight: 1.2}}>
                  {formatFanoHz(lastMeasure.panoHz)}
                </Typography>
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    lineHeight: 1.2,
                    fontVariantNumeric: 'tabular-nums lining-nums',
                  }}>
                  {formatRpm(lastMeasure.rpm)} rpm
                </Typography>
              </>
            ) : (
              <Typography
                component="span"
                sx={{...numericTypography.listValue, color: 'text.secondary', lineHeight: 1.2}}>
                {EM_DASH}
              </Typography>
            )}
          </Box>
        </ButtonBase>
      </Paper>
    </SwipeActions>
  )
}
