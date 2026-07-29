import {Box, FormHelperText, IconButton, InputAdornment, OutlinedInput} from '@mui/material'
import {layoutTokens, numericTypography} from '@shared/config/design-tokens'
import {VOLTAGE_RANGE} from '@shared/config/domain'
import {useCallback, useEffect, useId, useRef} from 'react'
import type {KeyboardEvent, MouseEvent, PointerEvent} from 'react'

export interface VoltageStepperProps {
  /** 원시 입력 문자열 (완전 제어형 — 빈 문자열 허용) */
  value: string
  /** 타이핑·스텝 공통 — 저장 가능 여부 검증(zod 스키마)은 폼/command 이중 수행 */
  onChange: (raw: string) => void
  /** 인라인 오류 문구 — 필드 아래 고정 슬롯, aria-describedby로 input에 연결 */
  error?: string | null | undefined
  disabled?: boolean | undefined
  /**
   * v2.11: FormField 안에 들어갈 때 면(테두리·포커스 링)과 오류 슬롯을 FormField에 넘긴다.
   * 오류 문구는 여전히 aria-describedby로 결속되므로 낭독은 유지된다(id는 FormField가 소유).
   */
  borderless?: boolean | undefined
  /** borderless일 때 오류 helper의 id — FormField가 렌더한 helper와 결속한다 */
  errorId?: string | undefined
}

// CD-A2: 롱프레스 지연 400ms / 반복 간격 100ms — 상수 1곳
const LONG_PRESS_DELAY_MS = 400
const LONG_PRESS_INTERVAL_MS = 100

/** parse → VOLTAGE_RANGE clamp → toFixed(1). 빈 값·비수치는 no-op(null) — A5 */
function stepFrom(raw: string, direction: 1 | -1): string | null {
  if (raw.trim() === '') return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return null
  const next = Math.min(
    VOLTAGE_RANGE.max,
    Math.max(VOLTAGE_RANGE.min, parsed + direction * VOLTAGE_RANGE.step),
  )
  return next.toFixed(1)
}

/**
 * 세팅 전압 스테퍼 (component-spec §3.2) — `[−] [input inputmode=decimal] V [+]`.
 * ± 각 48×48, 롱프레스 반복(포인터), 버튼 Enter/Space 단일 스텝, input ArrowUp/Down 동등 조작.
 * 내부 상태는 롱프레스 타이머뿐 — 값은 완전 제어형.
 */
export function VoltageStepper({
  value,
  onChange,
  error = null,
  disabled = false,
  borderless = false,
  errorId,
}: VoltageStepperProps) {
  const ownHelperId = useId()
  // borderless면 helper는 FormField가 렌더하므로 그쪽 id와 결속한다
  const helperId = borderless ? errorId : ownHelperId

  // 반복 tick(100ms)이 부모 리렌더보다 빠를 수 있어 최신 값·핸들러를 ref로 미러링한다
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    valueRef.current = value
  }, [value])
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const delayTimerRef = useRef<number | null>(null)
  const repeatTimerRef = useRef<number | null>(null)

  const stopRepeat = useCallback(() => {
    if (delayTimerRef.current !== null) {
      window.clearTimeout(delayTimerRef.current)
      delayTimerRef.current = null
    }
    if (repeatTimerRef.current !== null) {
      window.clearInterval(repeatTimerRef.current)
      repeatTimerRef.current = null
    }
  }, [])

  // unmount 시 타이머 cleanup
  useEffect(() => stopRepeat, [stopRepeat])

  const step = useCallback(
    (direction: 1 | -1) => {
      const next = stepFrom(valueRef.current, direction)
      if (next === null || next === valueRef.current) {
        stopRepeat() // 빈 값 no-op·경계 도달 — 진행 중 반복 정지
        return
      }
      valueRef.current = next
      onChangeRef.current(next)
    },
    [stopRepeat],
  )

  const handlePressStart = (direction: 1 | -1) => (event: PointerEvent<HTMLButtonElement>) => {
    // 포인터 전용 — 키보드 활성화는 click(detail 0)에서 단일 스텝 처리
    event.preventDefault()
    step(direction)
    delayTimerRef.current = window.setTimeout(() => {
      repeatTimerRef.current = window.setInterval(() => step(direction), LONG_PRESS_INTERVAL_MS)
    }, LONG_PRESS_DELAY_MS)
  }

  const handleKeyboardActivate = (direction: 1 | -1) => (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) step(direction) // Enter/Space 합성 click만 — 포인터 click 중복 방지
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      step(1)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      step(-1)
    }
  }

  const parsed = Number(value)
  const hasNumber = value.trim() !== '' && Number.isFinite(parsed)
  const decrementDisabled = disabled || !hasNumber || parsed <= VOLTAGE_RANGE.min
  const incrementDisabled = disabled || !hasNumber || parsed >= VOLTAGE_RANGE.max
  const hasError = error !== null && error !== ''

  // v2.10: ± 버튼을 테두리 안쪽 요소로 둔다 — 자체 테두리·라운드 없음(래퍼가 면을 소유)
  const stepButtonSx = {
    width: layoutTokens.formControlHeight,
    height: layoutTokens.formControlHeight,
    borderRadius: 0,
    flexShrink: 0,
    touchAction: 'manipulation',
    userSelect: 'none',
  } as const

  return (
    <Box>
      {/*
        v2.10 정렬 정정: [−] 입력 [+]를 **하나의 테두리** 안에 묶는다.
        이전에는 세 요소가 gap으로 떨어져 있어 입력이 안쪽으로 들어가고(l=72) ±가 필드 밖에
        떠 보였으며, 같은 폼의 다른 행(l=16→431)과 좌우가 어긋났다(실측 확인).
        이제 래퍼가 다른 필드와 동일한 테두리·높이·좌우 폭을 가지므로 격자가 맞는다.
      */}
      <Box
        role="group"
        aria-label="세팅 전압"
        sx={[
          {
            display: 'flex',
            alignItems: 'center',
            height: layoutTokens.formControlHeight,
            overflow: 'hidden',
            width: '100%',
          },
          // borderless면 면·포커스·오류 표시를 모두 FormField에 넘긴다(이중 테두리/링 방지)
          !borderless && {
            border: '1px solid',
            borderColor: hasError ? 'error.main' : 'var(--mml-outline)',
            // 내부 입력의 outline을 없앤 대신 래퍼가 포커스를 표시한다(포커스 가시성 보전)
            '&:focus-within': {
              outline: '2px solid var(--mml-focus-ring)',
              outlineOffset: '1px',
            },
          },
        ]}>
        <IconButton
          aria-label="0.1볼트 내리기"
          disabled={decrementDisabled}
          onPointerDown={handlePressStart(-1)}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          onPointerCancel={stopRepeat}
          onClick={handleKeyboardActivate(-1)}
          onContextMenu={event => event.preventDefault()}
          sx={stepButtonSx}>
          <Box component="span" aria-hidden="true" sx={{fontSize: '1.5rem', lineHeight: 1}}>
            −
          </Box>
        </IconButton>
        <OutlinedInput
          value={value}
          onChange={event => onChange(event.target.value)}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          error={hasError}
          // 단위는 [+]와 붙지 않게 우측 여백을 둔다 (한 테두리 안에 들어온 뒤 필요해진 간격)
          endAdornment={
            <InputAdornment position="end" sx={{mr: 0.5}}>
              V
            </InputAdornment>
          }
          slotProps={{
            input: {
              inputMode: 'decimal',
              'aria-label': '세팅 전압',
              'aria-invalid': hasError || undefined,
              'aria-describedby': hasError ? helperId : undefined,
              style: {textAlign: 'center'},
            },
          }}
          sx={{
            flex: 1,
            minWidth: 0,
            ...numericTypography.listValue,
            // 래퍼가 테두리를 소유 — 내부 입력의 outline은 제거하고 ± 사이를 꽉 채운다.
            // 포커스 표시는 아래 focus-within 링이 대신한다(포커스 가시성 유지).
            '& .MuiOutlinedInput-notchedOutline': {border: 0},
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {border: 0},
            height: '100%',
          }}
        />
        <IconButton
          aria-label="0.1볼트 올리기"
          disabled={incrementDisabled}
          onPointerDown={handlePressStart(1)}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          onPointerCancel={stopRepeat}
          onClick={handleKeyboardActivate(1)}
          onContextMenu={event => event.preventDefault()}
          sx={stepButtonSx}>
          <Box component="span" aria-hidden="true" sx={{fontSize: '1.5rem', lineHeight: 1}}>
            +
          </Box>
        </IconButton>
      </Box>
      {/* 오류 슬롯 — 필드 아래 고정 위치(높이 예약, layout shift 방지).
          borderless면 FormField가 같은 역할을 하므로 렌더하지 않는다(이중 여백·이중 문구 방지) */}
      {!borderless && (
        <Box sx={{minHeight: '1.25rem', mt: 0.5}}>
          {hasError && (
            <FormHelperText error id={ownHelperId} sx={{m: 0}}>
              {error}
            </FormHelperText>
          )}
        </Box>
      )}
    </Box>
  )
}
