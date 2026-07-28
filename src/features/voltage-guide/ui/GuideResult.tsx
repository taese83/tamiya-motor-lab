import {Box, Typography} from '@mui/material'
import {numericTypography} from '@shared/config/design-tokens'
import {formatVoltageRange} from '@shared/lib/format'
import {BigNumber} from '@shared/ui/big-number'
import {StarIcon} from '@shared/ui/icons'

/**
 * 근거 기록 행 뷰모델 — entities/run-record/ui RecordRowView와 동일 구조(§4.4).
 * RecordRow(entity ui)가 생기면 이 타입·행 렌더를 entity 컴포넌트 소비로 교체한다
 * (S5 근거 목록 = onDelete 미전달 RecordRow와 동일 표시 계약 — 비인터랙티브, 삭제 버튼 없음).
 */
export interface GuideEvidenceRecord {
  /** stable UUID */
  id: string
  /** "07-25 14:02" */
  dateTimeLabel: string
  voltageLabel: string
  /** null → "측정값 없음" 중립 문구 (D2 — 오류 아님) */
  rpmLabel: string | null
  resultLabel: string
  satisfied: boolean
}

export interface GuideResultView {
  /** 추천 범위 = 만족 기록 min~max (A6) — 좁혀 보정 금지 */
  minV: number
  maxV: number
  satisfiedCount: number
  /** 전압 오름차순 그룹 */
  distribution: ReadonlyArray<{voltage: number; count: number}>
  /** (maxV−minV) ≥ WIDE_VARIANCE_THRESHOLD(0.5V, A6) — 판정은 computeGuide 소유 */
  wideVariance: boolean
}

export interface GuideResultProps {
  guide: GuideResultView
  /** 근거 기록 — createdAt 역순 정렬은 데이터 계층 소관 */
  records: ReadonlyArray<GuideEvidenceRecord>
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
 * S5 추천 결과 (component-spec §5.4) — 수치 텍스트만, 시각화 금지.
 * wideVariance 보조 문구는 text.secondary 중립 텍스트 — warning 색 금지(정보이지 경고 아님, DS §4).
 * 높이 고정 계약 없음(S1 전용) — loading 시각 요소 없음(로컬 계산 순간).
 */
export function GuideResult({guide, records}: GuideResultProps) {
  const distributionText = guide.distribution
    .map(entry => `${entry.voltage.toFixed(1)}V ×${entry.count}`)
    .join(' · ')
  return (
    <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
      <Box>
        <Typography variant="h2" component="h2" sx={{mb: 1}}>
          추천 세팅 전압
        </Typography>
        <BigNumber size="guide" value={`추천 ${formatVoltageRange(guide.minV, guide.maxV)}`} />
        {guide.wideVariance && (
          <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
            기록 간 전압 편차가 큽니다 — 근거 기록을 확인하세요
          </Typography>
        )}
      </Box>
      <Box>
        <Typography variant="h2" component="h2" sx={{mb: 1}}>
          근거
        </Typography>
        <Typography variant="body2" color="text.secondary">
          만족 기록 {guide.satisfiedCount}건 기준
        </Typography>
        <Typography component="p" sx={{...numericTypography.listValue, mt: 0.5}}>
          {distributionText}
        </Typography>
        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            m: 0,
            mt: 1.5,
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}>
          {records.map(record => (
            <Box component="li" key={record.id} sx={{borderTop: 1, borderColor: 'divider', pt: 1.5}}>
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
          ))}
        </Box>
      </Box>
    </Box>
  )
}
