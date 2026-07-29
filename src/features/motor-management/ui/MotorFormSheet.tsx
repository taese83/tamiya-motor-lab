import {Alert, Box, Button, FormHelperText, TextField, Typography} from '@mui/material'
import {MOTOR_NAME_MAX_LENGTH} from '@shared/config/domain'
import {BottomSheet} from '@shared/ui/bottom-sheet'
import {useRef, useState} from 'react'

import {MotorKindSelect} from './MotorKindSelect'

import type {MotorKind} from '@shared/config/domain'
import type {FormEvent, RefObject} from 'react'

// MotorFormSheet v2 (component-spec v2 §5.4 — T-1).
// 필드 = 이름 + 종류 10택(MotorKindSelect)만 — v1의 statusGrade·memo 행 제거.
// create/edit 2모드 유지. 닫힘(취소·ESC·backdrop) = 폼 파기 + 트리거 focus 복귀(MUI 기본).

export interface MotorFormValues {
  name: string
  /** null = 미선택 — 기본값 상수 없음, create 초기값은 항상 미선택 */
  kind: MotorKind | null
}

export interface MotorFormSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  /** edit 시 기존 name·kind 채움 — 구조 필드(id·createdAt·sortOrder)는 폼에 노출하지 않음 */
  initial?: MotorFormValues | undefined
  /** createMotor/updateMotor 실행 중 — [저장] disabled "저장 중…" (single-flight) */
  pending: boolean
  /**
   * 저장 실패 인라인 Alert + [저장] 재활성 — 문구 매핑은 feature model/api 계층.
   * not-found(동시 탭 선삭제 — C-8): 시트 유지 + 오류 + 목록 갱신(invalidate는 mutation 훅 소관).
   */
  errorMessage?: string | null | undefined
  /** 검증 통과 값만 — kind는 non-null로 좁혀 전달 */
  onSubmit: (values: {name: string; kind: MotorKind}) => void
  onClose: () => void
}

const EMPTY_VALUES: MotorFormValues = {name: '', kind: null}

/**
 * 모터 등록/수정 시트 — BottomSheet 소비. 초기 포커스는 이름 input.
 * 검증: 이름 trim 1~30(스키마 상수 소비) → 인라인 오류 + input focus /
 * 종류 미선택 저장 → 인라인 오류 "종류를 선택하세요" + 그리드 첫 버튼 focus.
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
        닫힘 = 폼 파기(§5.4). 열릴 때만 마운트하므로 initial(또는 빈 값)이 useState 초기값으로 들어가고,
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
  onSubmit: (values: {name: string; kind: MotorKind}) => void
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
  const [kind, setKind] = useState<MotorKind | null>(initialValues.kind)
  const [nameError, setNameError] = useState<string | null>(null)
  const [kindError, setKindError] = useState<string | null>(null)
  const kindGroupRef = useRef<HTMLDivElement>(null)

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
    if (kind === null) {
      // 종류 미선택 — 인라인 오류 + 그리드 첫 버튼 focus (§5.4 검증 계약)
      setKindError('종류를 선택하세요')
      kindGroupRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
      return
    }
    setKindError(null)
    onSubmit({name: trimmedName, kind})
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
          종류 (필수)
        </Typography>
        <Box ref={kindGroupRef}>
          <MotorKindSelect
            value={kind}
            onChange={next => {
              setKind(next)
              if (kindError !== null) setKindError(null)
            }}
            error={kindError !== null}
          />
        </Box>
        {/* 오류 슬롯 1줄 상시 확보 — 오류 등장으로 필드가 이동하지 않는다(§10 고정 높이 원칙) */}
        <FormHelperText error sx={{minHeight: '1.25em'}}>
          {kindError ?? ' '}
        </FormHelperText>
      </Box>
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
