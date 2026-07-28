import {Box, FormControlLabel, Switch} from '@mui/material'
import {StarIcon} from '@shared/ui/icons'

export interface SatisfiedToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean | undefined
}

/**
 * S2 만족 토글 (component-spec §3.4) — Switch color="success" + 라벨 "이 세팅에 만족" 상시.
 * success 색+아이콘 병행: on일 때 star(success) 표시, off는 아이콘 없음(빈 별 금지 — DS §4).
 * 아이콘은 aria-hidden — 상태는 switch role의 checked가 전달한다.
 */
export function SatisfiedToggle({checked, onChange, disabled = false}: SatisfiedToggleProps) {
  return (
    <FormControlLabel
      control={
        <Switch
          color="success"
          checked={checked}
          onChange={event => onChange(event.target.checked)}
          disabled={disabled}
        />
      }
      label={
        <Box component="span" sx={{display: 'inline-flex', alignItems: 'center', gap: 0.5}}>
          이 세팅에 만족
          {/* 고정 폭 슬롯 — 아이콘 등장/소멸로 라벨이 흔들리지 않게 폭 예약 */}
          <Box
            component="span"
            aria-hidden="true"
            sx={{
              width: 18,
              height: 18,
              display: 'inline-flex',
              alignItems: 'center',
              color: 'success.main',
            }}>
            {checked && <StarIcon size={18} />}
          </Box>
        </Box>
      }
      sx={{minHeight: '2.75rem', width: '100%', m: 0}}
    />
  )
}
