import {Box, ListItemButton, Paper, Typography} from '@mui/material'
import {numericTypography} from '@shared/config/design-tokens'
import {StarIcon} from '@shared/ui/icons'
import {GradeChip} from './GradeChip'

/** listMotorSummaries 파생 뷰모델 — 영속·캐시 금지(읽기 시 계산), 매핑은 데이터 계층 소유 */
export interface MotorSummaryView {
  /** stable UUID — 이벤트는 index가 아니라 id 사용 */
  motorId: string
  name: string
  /** shared/config 라벨 맵 통과 값 — null이면 칩 미표시(CP2-3) */
  gradeLabel: string | null
  /** '' 허용 — 빈 값이면 행 생략 */
  statusMemo: string
  recordCount: number
  lastRecord: {
    dateLabel: string
    voltageLabel: string
    /** null = 측정값 없음 (D2) */
    rpmLabel: string | null
    resultLabel: string
    satisfied: boolean
  } | null
}

export interface MotorListItemProps {
  summary: MotorSummaryView
  /** 행 전체 탭 → /motors/:id */
  onSelect: (motorId: string) => void
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

/**
 * S3 모터 카드 행 (component-spec §4.1) — 행 전체 단일 탭 타깃(min-height 56px).
 * 행 내 보조 버튼 없음(수정·삭제는 S4). accessible name은 자연 텍스트로 구성.
 */
export function MotorListItem({summary, onSelect}: MotorListItemProps) {
  const {lastRecord} = summary
  return (
    <Paper variant="outlined" sx={{overflow: 'hidden'}}>
      <ListItemButton
        onClick={() => onSelect(summary.motorId)}
        sx={{
          minHeight: '3.5rem',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 0.5,
          px: 2,
          py: 1.5,
        }}>
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
          <Typography variant="body1" noWrap sx={{fontWeight: 600, flex: 1, minWidth: 0}}>
            {summary.name}
          </Typography>
          {summary.gradeLabel !== null && <GradeChip label={summary.gradeLabel} />}
        </Box>
        {summary.statusMemo !== '' && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {summary.statusMemo}
          </Typography>
        )}
        {lastRecord !== null ? (
          <Box>
            <Typography component="p" sx={{...numericTypography.listValue, color: 'text.secondary'}}>
              기록 {summary.recordCount}건 · 최근 {lastRecord.dateLabel} {lastRecord.voltageLabel}
            </Typography>
            <Typography
              component="p"
              sx={{
                ...numericTypography.listValue,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}>
              {lastRecord.rpmLabel ?? '측정값 없음'} · {lastRecord.resultLabel}
              {lastRecord.satisfied && (
                <>
                  <Box
                    component="span"
                    aria-hidden="true"
                    sx={{display: 'inline-flex', color: 'success.main'}}>
                    <StarIcon size={16} />
                  </Box>
                  <Box component="span" sx={srOnlySx}>
                    만족
                  </Box>
                </>
              )}
            </Typography>
          </Box>
        ) : (
          <Typography component="p" sx={{...numericTypography.listValue, color: 'text.secondary'}}>
            기록 0건
          </Typography>
        )}
      </ListItemButton>
    </Paper>
  )
}
