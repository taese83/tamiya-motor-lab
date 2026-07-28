import {Box, FormHelperText, IconButton, InputAdornment, OutlinedInput} from '@mui/material'
import {numericTypography} from '@shared/config/design-tokens'
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
}: VoltageStepperProps) {
  const helperId = useId()

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

  const stepButtonSx = {
    width: '3rem',
    height: '3rem',
    touchAction: 'manipulation',
    userSelect: 'none',
  } as const

  return (
    <Box>
      <Box role="group" aria-label="세팅 전압" sx={{display: 'flex', alignItems: 'center', gap: 1}}>
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
          endAdornment={<InputAdornment position="end">V</InputAdornment>}
          slotProps={{
            input: {
              inputMode: 'decimal',
              'aria-label': '세팅 전압',
              'aria-invalid': hasError || undefined,
              'aria-describedby': hasError ? helperId : undefined,
              style: {textAlign: 'center'},
            },
          }}
          sx={{flex: 1, ...numericTypography.listValue}}
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
      {/* 오류 슬롯 — 필드 아래 고정 위치(높이 예약, layout shift 방지) */}
      <Box sx={{minHeight: '1.25rem', mt: 0.5}}>
        {hasError && (
          <FormHelperText error id={helperId} sx={{m: 0}}>
            {error}
          </FormHelperText>
        )}
      </Box>
    </Box>
  )
}
