import {Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography} from '@mui/material'

import {S1_SETTINGS_HELP_ID} from './constants'

// 마이크 권한(영구 거부) 설정 안내 — v2.20에서 **인라인 Collapse → Dialog**로 옮겼다.
//
// 이전에는 Z2 히어로 존 안에서 Collapse로 펼쳐졌다. 그 존은 게이지를 장식 배경층으로
// 깔고 전경에 수치를 얹는 구조라, 펼친 안내 5줄이 **게이지 위에 겹쳐** 눈금·라벨과
// 뒤섞였다(사용자 지적). 게이지 대비를 올린 v2.19 이후 그 충돌이 더 뚜렷해졌다.
//
// Dialog로 옮기면서 부수적으로 정리된 것:
// - Z2의 `scrollable` 특수 분기(no-permission·permanent일 때만 flex-start + overflow auto)가
//   사라졌다. 존은 항상 중앙 정렬 고정 높이다 — 상태별 레이아웃 분기가 하나 줄었다.
// - 안내가 길어져도 히어로 존 높이 계약(layout shift 0)에 영향을 주지 않는다.
//
// a11y: disclosure(aria-expanded/aria-controls)가 아니라 **modal**이다 —
// 트리거 버튼의 aria-expanded는 제거했다(열리는 것이 인접 영역이 아니라 대화상자이므로
// disclosure 패턴을 쓰면 스크린리더에 잘못된 구조를 알린다). 포커스 트랩·ESC·트리거 복귀는
// MUI Dialog 기본. 파괴 액션이 없어 alertdialog가 아닌 일반 dialog다.

export interface PermissionHelpDialogProps {
  open: boolean
  onClose: () => void
}

const HELP_STEPS = [
  'iOS Safari: 설정 → Safari(또는 앱 → Safari) → 마이크 허용',
  'Android Chrome: 주소창 자물쇠 아이콘 → 권한 → 마이크 허용',
  '매번 묻지 않게 하기 — iOS Safari: 주소창 ᴀA → 웹 사이트 설정 → 마이크 → 허용',
  '매번 묻지 않게 하기 — Chrome: 권한 요청에서 "방문할 때마다 허용" 선택',
  '변경 후 이 페이지를 새로고침하세요',
] as const

export function PermissionHelpDialog({open, onClose}: PermissionHelpDialogProps) {
  const titleId = `${S1_SETTINGS_HELP_ID}-title`
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby={titleId} fullWidth maxWidth="sm">
      <DialogTitle id={titleId}>마이크 권한 허용 방법</DialogTitle>
      <DialogContent>
        {/* 순서가 아니라 플랫폼별 선택지 + 마지막 공통 안내라 ul을 유지한다 */}
        <Typography
          id={S1_SETTINGS_HELP_ID}
          variant="body2"
          component="ul"
          sx={{m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 1}}>
          {HELP_STEPS.map(step => (
            <li key={step}>{step}</li>
          ))}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  )
}
