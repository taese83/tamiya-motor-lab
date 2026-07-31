import {Box, ToggleButton, ToggleButtonGroup} from '@mui/material'
import {layoutTokens} from '@shared/config/design-tokens'

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
  /**
   * v2.11: FormField 안에 들어갈 때 자기 테두리를 그리지 않는다(면은 FormField가 소유).
   * 옵션 사이 구분선만 남겨 2택 경계를 유지한다.
   */
  borderless?: boolean | undefined
  /**
   * v2.27(사용자): 목록 정렬처럼 폼 밖 리스트 컨트롤로 쓸 때 그룹 바깥 좌·우 모서리를
   * 종류 필터 칩과 동일한 pill(999)로 라운딩해 톤을 맞춘다(앱 기본 세그먼트는 각진 0).
   * 안쪽 구분선은 직각 유지 — iOS식 둥근 세그먼트. 폼 사용처는 기본값(false)이라 무변경.
   */
  rounded?: boolean | undefined
  'aria-describedby'?: string | undefined
  disabled?: boolean | undefined
}

/**
 * 세그먼트 컨트롤 (component-spec §3.3) — ToggleButtonGroup exclusive fullWidth(theme 기본).
 * 선택 상태 표시: 배경(blue700, theme)+fontWeight 700(theme)+aria 상태
 * (체크 아이콘 제거 — R21 사용자 요청). 색 단독 구분 아님(fontWeight·aria 병행).
 */
export function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  allowDeselect = false,
  wrap = null,
  error = false,
  borderless = false,
  rounded = false,
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
        // v2.27: pill 바깥 모서리 — 첫/끝 버튼의 바깥 코너만 둥글리고 안쪽 구분선은 직각 유지.
        // overflow:hidden으로 선택 bg가 둥근 모서리를 넘지 않게 클립(칩과 동일한 999 radius).
        rounded && {
          borderRadius: 999,
          overflow: 'hidden',
          '& .MuiToggleButton-root': {
            // 위 종류 필터 칩(minHeight 44)과 동일한 높이로 맞춘다(폼용 48 대신 — 사용자: "동일한 크기")
            height: 44,
            minHeight: 44,
            '&:first-of-type': {borderTopLeftRadius: 999, borderBottomLeftRadius: 999},
            '&:last-of-type': {borderTopRightRadius: 999, borderBottomRightRadius: 999},
          },
        },
        // FormField가 면을 소유할 때: 그룹을 꽉 채우고 외곽 테두리를 제거, 옵션 경계만 남긴다
        borderless && {
          width: '100%',
          height: '100%',
          '& .MuiToggleButton-root': {
            border: 0,
            borderRadius: 0,
            '&:not(:first-of-type)': {borderLeft: '1px solid var(--mml-outline)'},
          },
        },
        // borderless면 오류 표시는 FormField 테두리가 담당한다 — 이중 링 방지
        error &&
          !borderless &&
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
            {height: layoutTokens.formControlHeight},
            wrap === '2x2' && {
              flex: '1 1 40%',
              '@media (max-width: 399px)': {fontSize: '0.8125rem'},
            },
          ]}>
          <Box component="span" sx={{whiteSpace: 'nowrap'}}>
            {option.label}
          </Box>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
