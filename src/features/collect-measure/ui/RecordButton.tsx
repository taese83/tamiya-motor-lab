import {Button} from '@mui/material'

export interface RecordButtonProps {
  /** = !(view.status==='measuring' && persistence ready) — 판정은 조립부 순수 함수 소유(M-5) */
  disabled: boolean
  /** 탭 시점 수치 스냅샷 캡처는 useCollectFlow 소유(CD2-A6) — 버튼은 탭 알림만 */
  onPress: () => void
}

/**
 * S1 Z3 [기록] primary (component-spec §4.1 — M-5).
 * disabled여도 상시 렌더 — 자리 이동 없음(Z3 h56 고정 계약). native disabled 대신
 * aria-disabled를 사용해 포커스·accessible name을 유지한다. 비활성 사유 설명은
 * Z2 문구/전역 배너 소관 — 버튼 자체 설명 금지(단일 채널).
 * 상태 전수: enabled / disabled 2종.
 */
export function RecordButton({disabled, onPress}: RecordButtonProps) {
  return (
    <Button
      variant="contained"
      size="large"
      fullWidth
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onPress()
      }}
      sx={{
        height: 56,
        // aria-disabled 채택으로 MUI disabled 스타일이 적용되지 않아 시각 상태를 theme
        // palette 공개 키(action.disabled*)로 재현한다 — generated class 의존 없음.
        ...(disabled && {
          color: 'action.disabled',
          bgcolor: 'action.disabledBackground',
          boxShadow: 'none',
          cursor: 'default',
          '&:hover': {bgcolor: 'action.disabledBackground', boxShadow: 'none'},
          '&:active': {bgcolor: 'action.disabledBackground'},
        }),
      }}>
      기록
    </Button>
  )
}
