import {Alert, Box, Button, TextField} from '@mui/material'
import {useRef, useState} from 'react'

import {F0_RANGE} from '@shared/config/domain'
import {panoHzWriteSchema} from '@shared/lib/schema/pano'
import {BottomSheet} from '@shared/ui/bottom-sheet'

import type {FormEvent} from 'react'

// ManualPanoSheet (R51) — 파노 수동 입력 시트. 모터 상세 "측정 기록" 헤더 [+]가 소비한다.
// 실측 전용 정보(stabilityCv)는 입력받지 않는다 — 파노값 1필드만. rpm은 파노 파생이라 저장 command가
// round(panoHz×60)으로 계산한다(사용자 입력 대상 아님). 저장은 collectMeasureRecord(source:'manual')
// 단일 경로(INV-22) — 검증(F0_RANGE·소수1·쌍 불변식)·rolling(INV-20)이 실측 왕복과 동일하게 적용된다.
// 닫힘(취소·ESC·backdrop) = 폼 파기(MotorFormSheet와 동일 원칙). 오류는 인라인(성공 위장 금지).

// 부호·지수 없는 정수/소수 표기만 (RaceEntrySheet voltage 패턴 승계) — NaN·'e' 표기 사전 차단
const PANO_NUMERIC_PATTERN = /^\d+(\.\d+)?$/

export interface ManualPanoSheetProps {
  open: boolean
  /** collectMeasureRecord 실행 중 — [입력] disabled "저장 중…" (single-flight) */
  pending: boolean
  /** 저장 실패 인라인 Alert + [입력] 재활성 — 문구 매핑은 소비 페이지 */
  errorMessage?: string | null | undefined
  /** 검증 통과 파노값(Hz)만 전달 — rpm 파생·저장은 상위 mutation 훅 소관 */
  onSubmit: (panoHz: number) => void
  onClose: () => void
}

export function ManualPanoSheet({
  open,
  pending,
  errorMessage = null,
  onSubmit,
  onClose,
}: ManualPanoSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <BottomSheet
      open={open}
      title="파노 직접 입력"
      onClose={onClose}
      onOpened={() => inputRef.current?.focus()}>
      {/* 열릴 때만 마운트 — 재오픈 시 입력·오류 초기화(MotorFormSheet와 동일 패턴) */}
      {open && (
        <ManualPanoFields
          pending={pending}
          errorMessage={errorMessage}
          inputRef={inputRef}
          onSubmit={onSubmit}
          onClose={onClose}
        />
      )}
    </BottomSheet>
  )
}

interface ManualPanoFieldsProps {
  pending: boolean
  errorMessage: string | null
  inputRef: React.RefObject<HTMLInputElement | null>
  onSubmit: (panoHz: number) => void
  onClose: () => void
}

function ManualPanoFields({pending, errorMessage, inputRef, onSubmit, onClose}: ManualPanoFieldsProps) {
  const [value, setValue] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const raw = value.trim()
    if (!PANO_NUMERIC_PATTERN.test(raw)) {
      setFieldError('숫자를 입력하세요')
      inputRef.current?.focus()
      return
    }
    // write-strict 검증 재사용(F0_RANGE·소수 1자리) — 규칙 중복 정의 금지, 저장 command와 동일 기준
    const parsed = panoHzWriteSchema.safeParse(Number(raw))
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? '유효한 파노값이 아닙니다')
      inputRef.current?.focus()
      return
    }
    setFieldError(null)
    onSubmit(parsed.data)
  }

  const hasSubmitError = errorMessage !== null && errorMessage !== ''

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
      <TextField
        label="파노 (Hz)"
        required
        value={value}
        onChange={event => {
          setValue(event.target.value)
          if (fieldError !== null) setFieldError(null)
        }}
        error={fieldError !== null}
        helperText={fieldError ?? `${F0_RANGE.min} ~ ${F0_RANGE.max} Hz · 소수 첫째 자리까지`}
        inputRef={inputRef}
        slotProps={{htmlInput: {inputMode: 'decimal', autoComplete: 'off'}}}
      />
      {hasSubmitError && (
        <Alert severity="error" role="alert">
          {errorMessage}
        </Alert>
      )}
      <Box sx={{display: 'flex', gap: 1}}>
        <Button type="submit" variant="contained" fullWidth disabled={pending}>
          {pending ? '저장 중…' : '입력'}
        </Button>
        <Button variant="text" fullWidth onClick={onClose} disabled={pending}>
          취소
        </Button>
      </Box>
    </Box>
  )
}
