import {useSortable} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import {Box, ButtonBase, IconButton, Paper, Typography, useMediaQuery} from '@mui/material'

import {MOTOR_KIND_LABELS} from '@shared/config/domain'
import {
  MOTOR_CARD_TINT_ALPHA,
  motionTokens,
  motorKindColors,
  numericTypography,
  withAlpha,
} from '@shared/config/design-tokens'
import {EM_DASH, formatFanoHz, formatRpm} from '@shared/lib/format'

import {PencilIcon, TrashIcon} from '@shared/ui/icons'
import {Sparkline} from '@shared/ui/sparkline'
import {SWIPE_ACTION_WIDTH, SwipeActionButton, SwipeActions} from '@shared/ui/swipe-actions'

import {DragHandleIcon} from './motor-icons'

import type {MotorSummary} from '@entities/motor'

// MotorRow — 모터 카드. 행 본체 탭 → onSelect(motorId): 상세('/motors/:motorId')가 차트·기록·수정·삭제 소유.
// 핸들과 행 본체는 독립 타깃(중첩 금지) — 드래그는 핸들 전용, 행 본체는 이동·스크롤 귀속.
// 상태 전수: idle / dragging / keyboard-lifted(§5.1 — isDragging 동일 처리).
//
// v2.12 종류색 카드 + 2열 레이아웃 (레퍼런스: 카테고리별 색 카드 / PLATA 목록 행):
// - 카드 면을 종류색 **tint**로 깐다. 솔리드로 채우지 않는 이유: 종류색이 채도가 높아(빨강·검정·흰색)
//   솔리드면 글자 대비를 종류마다 따로 잡아야 하고 다크 카본에서 흰 카드가 튄다.
//   tint면 글자는 테마 전경색을 그대로 써서 양 모드 대비가 안전하다.
// - 식별은 좌측 **solid accent bar**가 담당한다. 검정/흰색처럼 배경에 가까운 종류도 bar에
//   visual.border 링을 둬서 어느 모드에서든 윤곽이 남는다.
// - 좌측 2줄(이름 / 종류 라벨) · 우측 2줄(최신 파노 / rpm)로 스캔 축을 나눈다.
//   종류 칩은 제거했다 — 색은 카드·bar가, 식별 텍스트는 종류 라벨이 담당하므로 중복이다
//   (색 단독 구분 금지는 라벨 텍스트로 계속 충족).

export interface MotorRowProps {
  /** motor + measureCount + lastMeasure? + raceCount + lastRace? — sortOrder 순 상위 공급 */
  summary: MotorSummary
  /** 행 본체 탭 — 상세 페이지 진입(내비게이션은 페이지 소유) */
  onSelect: (motorId: string) => void
  /**
   * 순서 변경 잠금 (v2.4 — 종류 필터 활성 시). 핸들을 disabled로 두고 드래그 리스너를
   * 부착하지 않는다: 부분집합 순열이 reorderMotors로 전송되는 것을 UI 단계에서 차단한다(SO-2).
   * 안내 문구는 소비 페이지 소관. 미지정이면 정렬 가능(기존 호출부 무변경).
   */
  reorderDisabled?: boolean
  /** [수정] — 이름·종류 편집 시트 오픈 (v2.16 스와이프 트레이) */
  onEdit: (motor: MotorSummary['motor']) => void
  /** [삭제] — cascade 삭제 플로우 진입. 실측 건수 고지·확정은 useMotorDeleteFlow 소유 */
  onDelete: (motor: MotorSummary['motor']) => void
  /** 트레이 열림 — 단일 열림 규칙은 MotorList 소유 */
  swipeOpen: boolean
  onSwipeOpenChange: (open: boolean) => void
  /** 삭제 대상 건수 조회 중 — 트레이 액션 disabled(중복 진입 방지) */
  actionsPending?: boolean | undefined
}

// v2.12: sr-only 보조 문구는 불필요해졌다 — 행 전체 accessible name을 aria-label로 고정하면서
// "최신 파노"·"기록 없음" 같은 단위·상태 문구가 그 문장 안으로 들어갔다.

export function MotorRow({
  summary,
  onSelect,
  reorderDisabled = false,
  onEdit,
  onDelete,
  swipeOpen,
  onSwipeOpenChange,
  actionsPending = false,
}: MotorRowProps) {
  const {motor, lastMeasure, panoTrend} = summary
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const visual = motorKindColors[motor.kind]
  const kindLabel = MOTOR_KIND_LABELS[motor.kind]
  // 행 전체를 한 문장으로 고정한다 — 2열 구조의 텍스트를 그대로 읽히면 순서가 산만해진다.
  // rpm·추세는 보조 정보라 이름에 넣지 않는다(상세에서 확인).
  const rowLabel =
    lastMeasure !== undefined
      ? `${motor.name}, ${kindLabel}, 최신 파노 ${formatFanoHz(lastMeasure.panoHz)}`
      : `${motor.name}, ${kindLabel}, 기록 없음`

  // 키보드(Space 들기 → ↑/↓ → Space 놓기 / Esc 취소)와 포인터 드래그가 동일 경로 —
  // 센서·announcements는 MotorList(DndContext)가 소유한다(§5.1).
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: motor.id,
    disabled: reorderDisabled, // 잠금 시 센서 자체가 이 항목을 집지 않는다(v2.4)
    // reduced-motion: 이동/드롭 애니메이션 0ms(§5.1)
    transition: prefersReducedMotion
      ? null
      : {duration: motionTokens.enterMs, easing: motionTokens.easeStandard},
  })

  return (
    <SwipeActions
      open={swipeOpen}
      onOpenChange={onSwipeOpenChange}
      // 드래그 정렬 중에는 행이 이미 다른 제스처에 점유돼 있다 — 가로 판정을 붙이지 않는다.
      // (핸들 자체는 data-swipe-ignore로 항상 제외되므로 여기는 "들린 뒤" 방어다)
      gestureDisabled={isDragging}
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
        ref={setNodeRef}
        variant="outlined"
        style={{
          transform: CSS.Transform.toString(transform),
          transition: transition ?? undefined,
        }}
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
            // 검정/흰색처럼 배경에 가까운 종류도 윤곽이 남게 한다(뱃지와 동일 근거)
            borderRight: '1px solid',
            borderRightColor: visual.border,
          },
          ...(isDragging && {zIndex: 2, borderColor: 'primary.main'}),
        }}>
        <Box sx={{display: 'flex', alignItems: 'center', minHeight: 64, pl: 0.5, pr: 1.5}}>
          {/*
          DnD 핸들 — 44×44 독립 button. attributes/listeners는 핸들에만 부착(핸들 전용 활성화).
          v2.4 잠금 시: listeners 미부착 + disabled + 잠금 사유를 aria-label에 포함해
          스크린리더에서도 "왜 못 쓰는지"가 드러나게 한다(무음 비활성 금지).
        */}
          <IconButton
            ref={setActivatorNodeRef}
            // 핸들은 스와이프 판정에서 제외한다 — 여기서 시작한 포인터는 DnD 소유다
            data-swipe-ignore=""
            {...attributes}
            {...(reorderDisabled ? {} : listeners)}
            disabled={reorderDisabled}
            aria-label={
              reorderDisabled
                ? `'${motor.name}' 순서 변경 — 필터를 해제하면 사용할 수 있습니다`
                : `'${motor.name}' 순서 변경`
            }
            {...(reorderDisabled ? {} : {'aria-roledescription': '정렬 가능'})}
            sx={{
              touchAction: 'none', // PointerSensor 터치 드래그 요건 — 스크롤은 행 본체가 담당
              cursor: reorderDisabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
              color: 'text.secondary',
            }}>
            <DragHandleIcon />
          </IconButton>
          {/*
          행 본체 = 상세 진입 native button. accessible name은 aria-label로 고정한다 —
          2열 텍스트를 그대로 읽히면 "이름 종류 값 rpm" 순서가 산만해진다.
        */}
          <ButtonBase
            onClick={() => onSelect(motor.id)}
            aria-label={rowLabel}
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 64,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 1,
              textAlign: 'left',
            }}>
            {/* 좌측 2줄 — 이름(주) / 종류 라벨(부). 종류색은 카드·bar가 담당하므로 칩은 없다 */}
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

            {/*
            추세 스파크라인 — 장식(aria-hidden). 2점 미만이면 렌더되지 않는다.
            색은 종류색이 아니라 currentColor(=text.primary 상속)를 쓴다: 종류색으로 그리면
            검정 종류가 다크 카드에서, 흰색 종류가 라이트 카드에서 배경에 묻혀 선이 사라진다
            (실측 확인). 종류 식별은 카드 tint·accent bar·종류 라벨 3중으로 이미 충족되므로
            이 채널은 가독성을 우선한다.
          */}
            <Sparkline values={panoTrend} color="currentColor" />

            {/* 우측 2줄 — 최신 파노(주) / rpm(부). 값 없음은 EM_DASH (0·이전 값 위장 금지) */}
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
                  <Typography
                    component="span"
                    sx={{...numericTypography.listValue, lineHeight: 1.2}}>
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
        </Box>
      </Paper>
    </SwipeActions>
  )
}
