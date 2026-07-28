import {Alert, Box, Button, Paper, Typography} from '@mui/material'
import {useQuery} from '@tanstack/react-query'
import {motorQueries, MotorRadioList} from '@entities/motor'
import {MOTOR_STATUS_GRADE_LABELS} from '@shared/config/domain'
import {layoutTokens} from '@shared/config/design-tokens'
import {ResultSegment} from '@shared/ui/segment-control'
import {SatisfiedToggle} from '@shared/ui/satisfied-toggle'
import {VoltageStepper} from '@shared/ui/voltage-stepper'
import {useEffect, useRef, useState} from 'react'
import type {FormEvent, ReactNode} from 'react'
import {useCreateRecord} from '../api'
import {useRecordEntryForm} from '../model'
import type {RecordEntryMeasurement} from '../model'
import {MeasurementFillBlock} from './MeasurementFillBlock'
import type {MeasurementFillState} from './MeasurementFillBlock'

import type {MotorRadioOption} from '@entities/motor'

export interface RecordEntryFormProps {
  /** page가 `takeConfirmedMeasurement()` 1회 소비 결과 주입 — 빈 slot(직접 입력·새로고침 소실)이면 null (D2, H-5) */
  initialMeasurement: RecordEntryMeasurement | null
  /** 저장 성공 시 1회 — pop(+딥링크 replace)·토스트 "저장됨"은 page 소유 (§5.2) */
  onSaved: () => void
  /**
   * 모터 0개 인라인 카드의 [모터 등록] 탭 핸들러 — MotorFormSheet(features/motor-management)는
   * feature 간 직접 import 금지라 page가 열고 닫는다. 미전달 시 버튼 미렌더(안내 문구만).
   */
  onRegisterMotor?: (() => void) | undefined
  /**
   * 인라인 등록 시트 저장 성공 후 자동 선택할 motorId (§5.2 "해당 모터 자동 선택") —
   * page가 생성된 motor.id를 주입하면 1회 선택에 반영한다. 같은 id 재주입은 no-op.
   */
  autoSelectMotorId?: string | null | undefined
}

// 하단 고정 도크(pt12+h56+pb12) 높이 예약 — layout-spec §5 [D]
const DOCK_RESERVE_PADDING_BOTTOM = `calc(96px + ${layoutTokens.safeAreaBottom})`

/** 폼 항목 시각 라벨 — 그룹 accessible name은 각 컨트롤(aria-label)이 이미 소유, 이 라벨은 시각 안내 */
function FieldLabel({children}: {children: ReactNode}) {
  return (
    <Typography component="p" variant="subtitle2" sx={{mb: 1}}>
      {children}
    </Typography>
  )
}

/**
 * S2 기록 입력 폼 조립 루트 (component-spec §5.2 — REQ-F-004, REQ-ST-005).
 * 폼 5항목 고정 순서(= DOM = focus order): ①MotorRadioList ②MeasurementFillBlock
 * ③VoltageStepper ④ResultSegment ⑤SatisfiedToggle + 하단 고정 도크 [저장].
 * 폼 상태·검증·제출 상태 머신은 useRecordEntryForm(model)이 소유 — 이 컴포넌트는
 * 렌더 + 첫 오류 필드 focus 이동(§5.2 validating 실패 계약)만 담당한다.
 * mutation은 같은 slice api 세그먼트의 useCreateRecord를 mutateAsync로 주입 —
 * 실패 시 입력값 전부 유지 + 도크 배너 + [다시 저장] (C-4/REQ-ST-005, 성공 위장 금지).
 */
export function RecordEntryForm({
  initialMeasurement,
  onSaved,
  onRegisterMotor,
  autoSelectMotorId = null,
}: RecordEntryFormProps) {
  const createRecord = useCreateRecord()
  const form = useRecordEntryForm({
    initialMeasurement,
    // mutateAsync는 성공 시 resolve, 실패 시 DomainError reject(unwrap 채널) — 훅 계약과 일치
    submit: async draft => {
      await createRecord.mutateAsync(draft)
    },
    onSaved,
  })

  // S2 선택 리스트 원본 = listMotors (state-contract §Queries — 정렬은 데이터 계층 소관)
  const motorsQuery = useQuery(motorQueries.list())

  // §5.2 모터 0개 → 인라인 등록 시트 저장 성공 시 자동 선택 — props 변화에 대한
  // render-time 상태 조정(You-might-not-need-an-effect 패턴, side effect 아님)
  const [appliedAutoSelectId, setAppliedAutoSelectId] = useState<string | null>(null)
  if (autoSelectMotorId != null && autoSelectMotorId !== appliedAutoSelectId) {
    setAppliedAutoSelectId(autoSelectMotorId)
    form.setMotorId(autoSelectMotorId)
  }

  const motorSectionRef = useRef<HTMLDivElement | null>(null)
  const voltageSectionRef = useRef<HTMLDivElement | null>(null)
  const resultSectionRef = useRef<HTMLDivElement | null>(null)
  // [저장] 탭 직후에만 true — fieldErrors 반영 후 첫 오류 필드로 focus 이동(§5.2)
  const pendingFocusRef = useRef(false)

  const {fieldErrors} = form
  useEffect(() => {
    if (!pendingFocusRef.current) return
    pendingFocusRef.current = false
    // DOM 순서(모터 → 전압 → 결과)의 첫 오류 필드 — 모터 미선택은 라디오 그룹 첫 radio
    const target =
      (fieldErrors.motorId !== undefined
        ? motorSectionRef.current?.querySelector<HTMLElement>('input[type="radio"]')
        : null) ??
      (fieldErrors.voltage !== undefined
        ? voltageSectionRef.current?.querySelector<HTMLElement>('input')
        : null) ??
      (fieldErrors.result !== undefined
        ? resultSectionRef.current?.querySelector<HTMLElement>('button')
        : null)
    target?.focus()
  }, [fieldErrors])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    pendingFocusRef.current = true
    form.submitForm() // 제출 중 재호출은 훅의 single-flight 가드가 무시 (H-4)
  }

  // [비우기] 후 focus는 카드 다음 필드(전압 input)로 — §5.1 계약의 폼 소유 부분
  const handleClearMeasurement = () => {
    form.clearMeasurement()
    voltageSectionRef.current?.querySelector<HTMLInputElement>('input')?.focus()
  }

  const measurementState: MeasurementFillState =
    form.values.measurement === null
      ? {mode: 'empty'}
      : {
          mode: 'filled',
          rpm: form.values.measurement.rpm,
          panoHz: form.values.measurement.panoHz,
        }

  const motorOptions: ReadonlyArray<MotorRadioOption> = (motorsQuery.data ?? []).map(motor => ({
    id: motor.id,
    name: motor.name,
    gradeLabel: motor.statusGrade === null ? null : MOTOR_STATUS_GRADE_LABELS[motor.statusGrade],
  }))

  // 도크 오류 배너: submit-error 사유 또는 필드 매핑 불가 오류(form 슬롯) — §5.2/스키마 계약
  const dockError = form.submitErrorMessage ?? fieldErrors.form ?? null
  const saveLabel = form.isSubmitting
    ? '저장 중…'
    : form.submitStatus === 'submit-error'
      ? '다시 저장'
      : '저장'

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      {/* [M] 폼 영역 — 하단 고정 도크 높이만큼 padding-bottom 예약 */}
      <Box
        sx={{
          px: 2,
          py: 2,
          pb: DOCK_RESERVE_PADDING_BOTTOM,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}>
        {/* ① 모터 선택 (필수) */}
        <Box ref={motorSectionRef}>
          <FieldLabel>모터 선택 (필수)</FieldLabel>
          {motorsQuery.isPending ? (
            <Typography color="text.secondary">모터 목록을 불러오는 중…</Typography>
          ) : motorsQuery.isError ? (
            // D-10 준용: 빈 목록 위장 금지 — 오류 + [다시 시도](명시 refetch)
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => void motorsQuery.refetch()}>
                  다시 시도
                </Button>
              }>
              모터 목록을 불러오지 못했습니다
            </Alert>
          ) : (
            <MotorRadioList
              motors={motorOptions}
              value={form.values.motorId}
              onChange={form.setMotorId}
              legend="모터 선택"
              error={fieldErrors.motorId ?? null}
              emptyContent={
                // §5.2 모터 0개 인라인 카드 — 시트 열기·자동 선택 주입은 page 소유
                <Paper
                  variant="outlined"
                  sx={{
                    px: 2,
                    py: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 1.5,
                  }}>
                  <Typography color="text.secondary">등록된 모터가 없습니다</Typography>
                  {onRegisterMotor !== undefined && (
                    <Button
                      variant="contained"
                      onClick={onRegisterMotor}
                      sx={{minHeight: '2.75rem'}}>
                      모터 등록
                    </Button>
                  )}
                </Paper>
              }
            />
          )}
        </Box>

        {/* ② 측정값 카드 — filled/empty 두 모드, 카드 외형·높이 동일 (D2·UX-A3) */}
        <MeasurementFillBlock state={measurementState} onClear={handleClearMeasurement} />

        {/* ③ 세팅 전압 (필수) */}
        <Box ref={voltageSectionRef}>
          <FieldLabel>세팅 전압 (필수)</FieldLabel>
          <VoltageStepper
            value={form.values.voltageRaw}
            onChange={form.setVoltageRaw}
            error={fieldErrors.voltage ?? null}
          />
        </Box>

        {/* ④ 주행 결과 (필수) — 라벨은 shared/config 라벨 맵 결속(ResultSegment 내부) */}
        <Box ref={resultSectionRef}>
          <FieldLabel>주행 결과 (필수)</FieldLabel>
          <ResultSegment
            value={form.values.result}
            onChange={form.setResult}
            error={fieldErrors.result ?? null}
          />
        </Box>

        {/* ⑤ 만족 토글 — 기본 off, 명시 조작 시에만 true (INV-10) */}
        <SatisfiedToggle checked={form.values.satisfied} onChange={form.setSatisfied} />
      </Box>

      {/* [D] 하단 고정 도크 — 오류 배너는 [저장] 위 (S2에서 유일하게 허용된 높이 변화 지점) */}
      <Box component="footer" sx={{position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 'appBar'}}>
        <Box
          sx={{
            maxWidth: layoutTokens.contentMaxWidth,
            mx: 'auto',
            px: 2,
            pt: 1.5,
            pb: `calc(12px + ${layoutTokens.safeAreaBottom})`,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}>
          {dockError !== null && (
            <Alert severity="error" role="alert">
              {dockError}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={form.isSubmitting}>
            {saveLabel}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
