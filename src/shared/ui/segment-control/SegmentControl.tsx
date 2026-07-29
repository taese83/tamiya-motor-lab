import {Box, ToggleButton, ToggleButtonGroup} from '@mui/material'
import {layoutTokens} from '@shared/config/design-tokens'
import {CheckIcon} from '@shared/ui/icons'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

export interface SegmentControlProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>
  value: T | null
  onChange: (value: T | null) => void
  /** 선택 항목 재탭 시 해제 — GradeSegment만 true (CP2-3) */
  allowDeselect?: boolean | undefined
  /** 4택 320px 대응 — 각 타깃 h44 유지, 줄바꿈 금지(fontSize 13px 축소 허용) */
  wrap?: '2x2' | null | undefined
  'aria-label': string
  /** 그룹 외곽 error 표시 — 오류 문구는 도메인 바인딩/폼 소유 */
  error?: boolean | undefined
  'aria-describedby'?: string | undefined
  disabled?: boolean | undefined
}

/**
 * 세그먼트 컨트롤 (component-spec §3.3) — ToggleButtonGroup exclusive fullWidth(theme 기본).
 * 선택 상태 3중 표시: 배경(blue700, theme)+fontWeight 700(theme)+check 아이콘 병행
 * (forced-colors·색각 대응). 비선택은 동일 폭 투명 placeholder — 폭 흔들림 금지.
 */
export function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  allowDeselect = false,
  wrap = null,
  error = false,
  disabled = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
}: SegmentControlProps<T>) {
  const handleChange = (_event: unknown, next: unknown) => {
    // exclusive 그룹은 선택 항목 재탭 시 null을 전달한다
    const nextValue = typeof next === 'string' ? (next as T) : null
    if (nextValue === null && !allowDeselect) return
    onChange(nextValue)
  }
  return (
    <ToggleButtonGroup
      value={value}
      onChange={handleChange}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      sx={[
        wrap === '2x2' && {flexWrap: 'wrap'},
        error &&
          (theme => ({
            outline: `2px solid ${theme.palette.error.main}`,
            outlineOffset: '2px',
            borderRadius: `${theme.shape.borderRadius}px`,
          })),
      ]}>
      {options.map(option => (
        <ToggleButton
          key={option.value}
          value={option.value}
          disabled={disabled}
          sx={[
            // v2.10: 폼 공통 높이 고정(고정값 — 1줄 라벨이므로 늘어날 이유가 없다).
            // 이전에는 아이콘+패딩으로 52px가 되어 같은 폼의 입력(48)과 어긋났다
            {gap: 0.5, height: layoutTokens.formControlHeight},
            wrap === '2x2' && {
              flex: '1 1 40%',
              '@media (max-width: 399px)': {fontSize: '0.8125rem'},
            },
          ]}>
          <Box
            component="span"
            aria-hidden="true"
            sx={{
              width: 16,
              height: 16,
              display: 'inline-flex',
              alignItems: 'center',
              flexShrink: 0,
            }}>
            {value === option.value && <CheckIcon size={16} />}
          </Box>
          <Box component="span" sx={{whiteSpace: 'nowrap'}}>
            {option.label}
          </Box>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
