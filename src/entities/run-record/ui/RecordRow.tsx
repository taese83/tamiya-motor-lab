import {Box, IconButton, Typography} from '@mui/material'
import {layoutTokens, numericTypography} from '@shared/config/design-tokens'
import {StarIcon} from '@shared/ui/icons'
import type {IconProps} from '@shared/ui/icons'

/**
 * 주행 기록 행 뷰모델 (component-spec §4.4) — 라벨은 전부 사전 포맷 문자열.
 * 포맷(shared/lib/format)·라벨 맵(shared/config/domain) 통과는 데이터 계층 소관 —
 * 이 컴포넌트는 도메인 값을 직접 받지 않는다.
 */
export interface RecordRowView {
  /** stable UUID — 삭제 이벤트 키 (index 금지) */
  id: string
  /** "07-25 14:02" */
  dateTimeLabel: string
  voltageLabel: string
  /** null → "측정값 없음" 중립 문구 (D2 — 오류 아님) */
  rpmLabel: string | null
  resultLabel: string
  satisfied: boolean
}

export interface RecordRowProps {
  record: RecordRowView
  /**
   * S4에서만 전달 — 44×44 독립 [삭제] 타깃 렌더. confirm 오케스트레이션은 feature 소유.
   * 미전달(S5 근거 목록) 시 삭제 버튼 미렌더 — 완전 비인터랙티브 표시 행.
   */
  onDelete?: (id: string) => void
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
 * trash 아이콘 — shared/ui/icons 규격(24×24 viewBox, currentColor, aria-hidden) 준수.
 * icons 인벤토리 주석에 따라 소비 owner가 추가하되, shared 경로가 본 작업 범위 밖이라
 * slice 내부 비공개로 둔다 — shared/ui/icons 승격 시 이 정의를 제거하고 import로 교체.
 */
function TrashIcon({size = 24}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM8 9h8v10H8zm7.5-5-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  )
}

/**
 * S4 기록 행 · S5 근거 목록 공용 (component-spec §4.4) — 텍스트 1~2줄, RunRecord immutable.
 * 행 자체는 비인터랙티브(행 탭 액션 없음 — FP-A4). [삭제]는 행 우측 독립 타깃으로
 * 행 텍스트와 중첩하지 않는다. 시간 역순 정렬·list 시맨틱(ul/li)은 소비자 소관.
 */
export function RecordRow({record, onDelete}: RecordRowProps) {
  return (
    <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
      <Box sx={{flex: 1, minWidth: 0}}>
        <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
          <Typography variant="body2">{record.dateTimeLabel}</Typography>
          {record.satisfied && (
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
        </Box>
        <Typography component="p" sx={{...numericTypography.listValue}}>
          {record.voltageLabel} · {record.rpmLabel ?? '측정값 없음'} · {record.resultLabel}
        </Typography>
      </Box>
      {onDelete !== undefined && (
        <IconButton
          aria-label={`${record.dateTimeLabel} 기록 삭제`}
          onClick={() => onDelete(record.id)}
          sx={{
            width: layoutTokens.touchTargetMin,
            height: layoutTokens.touchTargetMin,
            flexShrink: 0,
            color: 'text.secondary',
          }}>
          <TrashIcon size={20} />
        </IconButton>
      )}
    </Box>
  )
}
