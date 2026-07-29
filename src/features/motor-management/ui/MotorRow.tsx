import {useSortable} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Collapse,
  IconButton,
  Paper,
  Typography,
  useMediaQuery,
} from '@mui/material'
import {useId} from 'react'

import {MotorKindChip} from '@entities/motor'
import {motionTokens, numericTypography} from '@shared/config/design-tokens'
import {EM_DASH, formatDateTimeShort, formatFanoHz, formatRpm} from '@shared/lib/format'

import {PanoLineChart} from './PanoLineChart'
import {ChevronDownIcon, DragHandleIcon} from './motor-icons'

import type {MotorSummary} from '@entities/motor'
import type {MeasureRecord} from '@entities/measure-record'

// MotorRow (component-spec v2 §5.2 — MotorListItem 대체).
// 접힘 행: [≡ 핸들 44×44] + 이름 + MotorKindChip + 최신 파노 + 확장 캐럿.
// 탭(행 본체) → 인라인 확장: PanoLineChart + 기록 리스트(asc ≤10, canonical 텍스트 채널)
// + [수정][삭제]. 다중 확장 허용·확장 상태 휘발(상위 소유).
// 핸들과 행 본체는 독립 타깃(중첩 금지) — 드래그는 핸들 전용, 행 본체는 확장 토글·스크롤 귀속.
// 상태 전수: collapsed / expanded(records) / expanded-empty / expanded-error /
// dragging(접힘 강제) / keyboard-lifted(§5.1 키보드 경로 — isDragging 동일 처리).

export interface MotorRowProps {
  /** motor + measureCount + lastMeasure? + raceCount + lastRace? — sortOrder 순 상위 공급 */
  summary: MotorSummary
  expanded: boolean
  onToggleExpand: (motorId: string) => void
  onEdit: (motorId: string) => void
  onDelete: (motorId: string) => void
  /** 확장 시에만 주입 — measuredAt asc ≤10 (listMeasureRecordsByMotor 결과 그대로, 재정렬 금지) */
  records: ReadonlyArray<MeasureRecord> | undefined
  /** 확장 내 기록 읽기 실패 — 오류 블록 + [다시 시도] (빈 목록 위장 금지, D-10) */
  recordsError?: boolean | undefined
  onRetryRecords?: (() => void) | undefined
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

export function MotorRow({
  summary,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  records,
  recordsError = false,
  onRetryRecords,
}: MotorRowProps) {
  const {motor, lastMeasure} = summary
  const panelId = useId()
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  // 키보드(Space 들기 → ↑/↓ → Space 놓기 / Esc 취소)와 포인터 드래그가 동일 경로 —
  // 센서·announcements는 MotorList(DndContext)가 소유한다(§5.1).
  const {attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging} =
    useSortable({
      id: motor.id,
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
        {/* DnD 핸들 — 44×44 독립 button. attributes/listeners는 핸들에만 부착(핸들 전용 활성화) */}
        <IconButton
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`'${motor.name}' 순서 변경`}
          aria-roledescription="정렬 가능"
          sx={{
            touchAction: 'none', // PointerSensor 터치 드래그 요건 — 스크롤은 행 본체가 담당
            cursor: isDragging ? 'grabbing' : 'grab',
            color: 'text.secondary',
          }}>
          <DragHandleIcon />
        </IconButton>
        {/* 행 본체 = 확장 토글 native button — accessible name "{이름}, {종류}, 최신 파노 {값}" */}
        <ButtonBase
          onClick={() => onToggleExpand(motor.id)}
          aria-expanded={expanded}
          aria-controls={panelId}
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
          <Box
            component="span"
            aria-hidden="true"
            sx={{
              display: 'inline-flex',
              color: 'text.secondary',
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: prefersReducedMotion
                ? 'none'
                : `transform ${motionTokens.hoverMs}ms ${motionTokens.easeStandard}`,
            }}>
            <ChevronDownIcon />
          </Box>
        </ButtonBase>
      </Box>
      {/* 드래그/들기 중엔 확장 강제 접힘(상위가 expandedIds clear — 여기는 방어적 이중화) */}
      <Collapse
        in={expanded && !isDragging}
        timeout={prefersReducedMotion ? 0 : motionTokens.enterMs}
        unmountOnExit>
        <Box
          id={panelId}
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider', // hairlineStrong 룰 — 실값은 theme divider 변수 소관
            px: 2,
            py: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}>
          {recordsError ? (
            <Box role="alert" sx={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1}}>
              <Typography variant="body2">기록을 불러오지 못했습니다</Typography>
              <Button variant="outlined" sx={{minHeight: 44}} onClick={() => onRetryRecords?.()}>
                다시 시도
              </Button>
            </Box>
          ) : records === undefined ? (
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minHeight: 44}}>
              <CircularProgress size={20} aria-hidden="true" />
              <Typography variant="body2" sx={{color: 'text.secondary'}}>
                기록 불러오는 중…
              </Typography>
            </Box>
          ) : records.length === 0 ? (
            <Typography variant="body2" sx={{color: 'text.secondary'}}>
              아직 기록 없음 — 측정 탭에서 [기록]으로 수집하세요
            </Typography>
          ) : (
            <>
              {/* 차트는 추세 보조(aria-hidden) — canonical 데이터는 아래 기록 리스트 텍스트 */}
              <PanoLineChart
                points={records.map(record => ({
                  id: record.id,
                  measuredAt: record.measuredAt,
                  panoHz: record.panoHz,
                }))}
              />
              {/* 기록 리스트 ≤10행 — 오래된 순 01부터(차트 X축과 정렬 일치, CD2-A1). 행 액션 없음(T-2·RV-A1) */}
              <Box
                component="ol"
                sx={{listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 0.5}}>
                {records.map((record, index) => (
                  <Box
                    component="li"
                    key={record.id}
                    sx={{display: 'flex', alignItems: 'baseline', gap: 1}}>
                    <Typography
                      variant="overline"
                      component="span"
                      sx={{color: 'text.secondary', lineHeight: 1.5, minWidth: '1.5em'}}>
                      {String(index + 1).padStart(2, '0')}
                    </Typography>
                    <Typography variant="body2" component="span" sx={{color: 'text.secondary'}}>
                      {formatDateTimeShort(record.measuredAt)}
                    </Typography>
                    <Typography component="span" sx={{...numericTypography.listValue, ml: 'auto'}}>
                      {formatFanoHz(record.panoHz)}
                    </Typography>
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{color: 'text.secondary', fontVariantNumeric: 'tabular-nums lining-nums'}}>
                      · {formatRpm(record.rpm)} rpm
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}
          {/* 패널 푸터 — [수정] outlined / [삭제] outlined error 톤(red contained는 ConfirmDialog 전용) */}
          <Box sx={{display: 'flex', justifyContent: 'space-between', gap: 1}}>
            <Button variant="outlined" sx={{minHeight: 44}} onClick={() => onEdit(motor.id)}>
              수정
            </Button>
            <Button
              variant="outlined"
              sx={{minHeight: 44, color: 'error.main', borderColor: 'error.main'}}
              onClick={() => onDelete(motor.id)}>
              삭제
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  )
}
