import {useSortable} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import {Box, ButtonBase, IconButton, Paper, Typography, useMediaQuery} from '@mui/material'

import {MotorKindChip} from '@entities/motor'
import {motionTokens, numericTypography} from '@shared/config/design-tokens'
import {EM_DASH, formatFanoHz} from '@shared/lib/format'

import {DragHandleIcon} from './motor-icons'

import type {MotorSummary} from '@entities/motor'

// MotorRow v2.2 (버그 리포트 #2 — 인라인 확장 폐지): 행 = [≡ 핸들] + 이름 + 종류 칩 + 최신 파노.
// 행 본체 탭 → onSelect(motorId) — 상세 페이지('/motors/:motorId')가 차트·기록·수정·삭제를 소유.
// 핸들과 행 본체는 독립 타깃(중첩 금지) — 드래그는 핸들 전용, 행 본체는 이동·스크롤 귀속.
// 상태 전수: idle / dragging / keyboard-lifted(§5.1 — isDragging 동일 처리).

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
}

const srOnlySx = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const

export function MotorRow({summary, onSelect, reorderDisabled = false}: MotorRowProps) {
  const {motor, lastMeasure} = summary
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  // 키보드(Space 들기 → ↑/↓ → Space 놓기 / Esc 취소)와 포인터 드래그가 동일 경로 —
  // 센서·announcements는 MotorList(DndContext)가 소유한다(§5.1).
  const {attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging} =
    useSortable({
      id: motor.id,
      disabled: reorderDisabled, // 잠금 시 센서 자체가 이 항목을 집지 않는다(v2.4)
      // reduced-motion: 이동/드롭 애니메이션 0ms(§5.1)
      transition: prefersReducedMotion
        ? null
        : {duration: motionTokens.enterMs, easing: motionTokens.easeStandard},
    })

  return (
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
        ...(isDragging && {zIndex: 2, borderColor: 'primary.main'}),
      }}>
      <Box sx={{display: 'flex', alignItems: 'center', minHeight: 56, pr: 1}}>
        {/*
          DnD 핸들 — 44×44 독립 button. attributes/listeners는 핸들에만 부착(핸들 전용 활성화).
          v2.4 잠금 시: listeners 미부착 + disabled + 잠금 사유를 aria-label에 포함해
          스크린리더에서도 "왜 못 쓰는지"가 드러나게 한다(무음 비활성 금지).
        */}
        <IconButton
          ref={setActivatorNodeRef}
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
        {/* 행 본체 = 상세 진입 native button — accessible name "{이름}, {종류}, 최신 파노 {값}" */}
        <ButtonBase
          onClick={() => onSelect(motor.id)}
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 1,
            px: 1,
            textAlign: 'left',
          }}>
          <Typography
            component="span"
            sx={{
              fontWeight: 600,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
            {motor.name}
          </Typography>
          <MotorKindChip kind={motor.kind} />
          <Box component="span" sx={{flexGrow: 1}} />
          <Box component="span" sx={srOnlySx}>
            최신 파노
          </Box>
          {lastMeasure !== undefined ? (
            <Typography component="span" sx={{...numericTypography.listValue, flexShrink: 0}}>
              {formatFanoHz(lastMeasure.panoHz)}
            </Typography>
          ) : (
            <>
              {/* 값 없음 = EM_DASH — 0·이전 값 위장 금지. sr에는 중립 문구 */}
              <Typography
                component="span"
                aria-hidden="true"
                sx={{...numericTypography.listValue, color: 'text.secondary', flexShrink: 0}}>
                {EM_DASH}
              </Typography>
              <Box component="span" sx={srOnlySx}>
                기록 없음
              </Box>
            </>
          )}
        </ButtonBase>
      </Box>
    </Paper>
  )
}
