import {Alert, Box, Button, TextField, Typography} from '@mui/material'
import {MOTOR_MEMO_MAX_LENGTH, MOTOR_NAME_MAX_LENGTH} from '@shared/config/domain'
import type {MotorStatusGrade} from '@shared/config/domain'
import {BottomSheet} from '@shared/ui/bottom-sheet'
import {GradeSegment} from '@shared/ui/segment-control'
import {useRef, useState} from 'react'
import type {FormEvent, RefObject} from 'react'

export interface MotorFormValues {
  name: string
  /** null = 미지정 — 기본값 상수 없음, 초기값은 항상 미선택(CP2-3) */
  grade: MotorStatusGrade | null
  memo: string
}

export interface MotorFormSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  /** edit 시 기존 값 채움 — 구조 필드(id·createdAt)는 폼에 노출하지 않음 */
  initial?: MotorFormValues | undefined
  /** createMotor/updateMotor 실행 중 — [저장] disabled "저장 중…" */
  pending: boolean
  /** 저장 실패 인라인 Alert + [저장] 재활성 — 문구 매핑은 feature model 계층 */
  errorMessage?: string | null | undefined
  onSubmit: (values: MotorFormValues) => void
  onClose: () => void
}

const EMPTY_VALUES: MotorFormValues = {name: '', grade: null, memo: ''}

/**
 * 모터 등록/수정 시트 (component-spec §5.3) — BottomSheet 소비.
 * C-7 이름 검증: trim 후 1자 미만 → 인라인 오류 + input focus, 저장 거부.
 * 길이 상한은 스키마 상수(MOTOR_NAME_MAX_LENGTH=30, CP2-4) 소비만.
 * 닫힘(취소·ESC·backdrop) = 폼 파기, 트리거 focus 복귀(MUI 기본).
 */
export function MotorFormSheet({
  open,
  mode,
  initial,
  pending,
  errorMessage = null,
  onSubmit,
  onClose,
}: MotorFormSheetProps) {
  const nameInputRef = useRef<HTMLInputElement>(null)

  return (
    <BottomSheet
      open={open}
      title={mode === 'create' ? '모터 등록' : '모터 수정'}
      onClose={onClose}
      onOpened={() => nameInputRef.current?.focus()}>
      {/*
        닫힘 = 폼 파기(§5.3). 열릴 때만 마운트하므로 initial(또는 빈 값)이 useState 초기값으로 들어가고,
        열려 있는 동안 initial identity가 바뀌어도 사용자 입력은 유지된다 — 동기화 effect 불요.
      */}
      {open && (
        <MotorFormFields
          initial={initial}
          pending={pending}
          errorMessage={errorMessage}
          nameInputRef={nameInputRef}
          onSubmit={onSubmit}
          onClose={onClose}
        />
      )}
    </BottomSheet>
  )
}

interface MotorFormFieldsProps {
  initial: MotorFormValues | undefined
  pending: boolean
  errorMessage: string | null
  nameInputRef: RefObject<HTMLInputElement | null>
  onSubmit: (values: MotorFormValues) => void
  onClose: () => void
}

function MotorFormFields({
  initial,
  pending,
  errorMessage,
  nameInputRef,
  onSubmit,
  onClose,
}: MotorFormFieldsProps) {
  const initialValues = initial ?? EMPTY_VALUES
  const [name, setName] = useState(initialValues.name)
  const [grade, setGrade] = useState<MotorStatusGrade | null>(initialValues.grade)
  const [memo, setMemo] = useState(initialValues.memo)
  const [nameError, setNameError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const trimmedName = name.trim()
    if (trimmedName.length < 1) {
      setNameError('이름을 입력하세요')
      nameInputRef.current?.focus()
      return
    }
    if (trimmedName.length > MOTOR_NAME_MAX_LENGTH) {
      setNameError(`이름은 ${MOTOR_NAME_MAX_LENGTH}자 이내로 입력하세요`)
      nameInputRef.current?.focus()
      return
    }
    setNameError(null)
    onSubmit({name: trimmedName, grade, memo: memo.trim()})
  }

  const hasSubmitError = errorMessage !== null && errorMessage !== ''

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
      <TextField
        label="이름"
        required
        value={name}
        onChange={event => {
          setName(event.target.value)
          if (nameError !== null) setNameError(null)
        }}
        error={nameError !== null}
        helperText={nameError ?? `${name.length}/${MOTOR_NAME_MAX_LENGTH}자`}
        inputRef={nameInputRef}
        slotProps={{htmlInput: {maxLength: MOTOR_NAME_MAX_LENGTH}}}
      />
      <Box>
        <Typography variant="body1" component="p" sx={{mb: 1}}>
          상태 등급 (선택)
        </Typography>
        <GradeSegment value={grade} onChange={setGrade} disabled={pending} />
      </Box>
      <TextField
        label="상태 메모 (선택)"
        value={memo}
        onChange={event => setMemo(event.target.value)}
        slotProps={{htmlInput: {maxLength: MOTOR_MEMO_MAX_LENGTH}}}
      />
      {hasSubmitError && (
        <Alert severity="error" role="alert">
          {errorMessage}
        </Alert>
      )}
      <Box sx={{display: 'flex', gap: 1}}>
        <Button type="submit" variant="contained" fullWidth disabled={pending}>
          {pending ? '저장 중…' : '저장'}
        </Button>
        <Button variant="text" fullWidth onClick={onClose} disabled={pending}>
          취소
        </Button>
      </Box>
    </Box>
  )
}
