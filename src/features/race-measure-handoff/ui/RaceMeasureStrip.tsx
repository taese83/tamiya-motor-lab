import {Box, Typography} from '@mui/material'

export interface RaceMeasureStripProps {
  /** handoff slot.motorName — slot 존재와 렌더가 동치(INV-21), 표시는 page 조립 소관 */
  motorName: string
  /** handoff slot.origin — 문구만 분기(v2.5). 동작·복귀 경로는 origin 무관 */
  origin: 'race' | 'motor'
}

/**
 * S1 왕복 모드 배너 (component-spec §7.1 — R-5·RV-1).
 * role="status": 왕복 진입 시 1회 발화 — 페이지 수명 내 텍스트 무변경(Z1 채널과 중복 알림 금지).
 * 취소/복귀 버튼은 이 스트립이 아니라 Z3 슬롯([레이스로 돌아가기] — MeasureAction 'back-to-race')
 * 소관(§11 D-5 baseline). 페이지 수명 내 등장/소멸 없음 — 모드 종료 = 라우트 이동(레이아웃 안정).
 * 상태 전수: 표시 / 미렌더 2종.
 */
export function RaceMeasureStrip({motorName, origin}: RaceMeasureStripProps) {
  return (
    <Box
      role="status"
      sx={{
        display: 'flex',
        alignItems: 'center',
        minHeight: 40,
        px: 2,
        py: 1,
        bgcolor: 'action.hover',
        borderBottom: '1px solid',
        borderBottomColor: 'divider',
        borderLeft: '3px solid',
        borderLeftColor: 'primary.main',
      }}>
      <Typography variant="body2" sx={{color: 'text.primary'}}>
        <Box component="span" sx={{fontWeight: 700}}>
          '{motorName}'
        </Box>{' '}
        {origin === 'motor' ? '측정' : '레이스 측정'} — 수치가 안정되면 자동으로 돌아갑니다
      </Typography>
    </Box>
  )
}
