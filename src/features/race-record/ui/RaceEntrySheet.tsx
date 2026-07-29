import {
  Alert,
  Box,
  Button,
  Chip,
  FormHelperText,
  InputAdornment,
  OutlinedInput,
  Typography,
} from '@mui/material'
import {useId, useRef} from 'react'

import {RACE_RESULT_LABELS, RACE_RESULTS} from '@shared/config/domain'
import {numericTypography} from '@shared/config/design-tokens'
import {formatFanoHz} from '@shared/lib/format'
import {BottomSheet} from '@shared/ui/bottom-sheet'
import {SegmentControl} from '@shared/ui/segment-control'
import {VoltageStepper} from '@shared/ui/voltage-stepper'

import type {RaceResult} from '@shared/config/domain'
import type {FormEvent, KeyboardEvent, ReactNode} from 'react'

// ── 공개 폼 타입 (component-spec §6.3 — 이 파일이 canonical 정의처) ──────────────

/**
 * 파노 필드 discriminated union (boolean prop 조합 금지 — 재사용 원칙 3).
 * - auto: 최신 MeasureRecord 인용(캐시 select 파생 — 전용 query 금지, AR-5)
 * - measured: 왕복 복귀 갱신값(§7.2) — "방금 측정" 배지 + justMeasured sr 고지 대상
 * - none: 측정 기록 없음 — [입력] 비활성 + [측정] 유도 (SC2-A6)
 */
export type RaceEntryPano =
  | {kind: 'auto'; panoHz: number}
  | {kind: 'measured'; panoHz: number}
  | {kind: 'none'}

/** 폼 draft — 원시 문자열 유지(완전 제어형·왕복 복원 대응). ms 변환은 제출 검증 시(CD2-A4) */
export interface RaceEntryDraft {
  result: RaceResult | null
  /** VoltageStepper 원시 문자열 */
  voltageRaw: string
  /** 초 단위 원시 문자열("32.45") — 제출 시 Math.round(초×1000) ms 변환 */
  lapTimeRaw: string
}

export type RaceEntryField = 'result' | 'voltage' | 'lapTime'
export type RaceEntryFieldErrors = Partial<Record<RaceEntryField, string>>

export interface RaceEntrySheetProps {
  open: boolean
  motorName: string
  pano: RaceEntryPano
  /** 제어형 — 왕복 복원을 위해 상위(useRaceEntry)가 소유 */
  draft: RaceEntryDraft
  onDraftChange: (patch: Partial<RaceEntryDraft>) => void
  /**
   * [측정] — beginRaceMeasure(motorId, draft) + navigate('/')는 page 소유
   * (feature 간 직접 import 금지 — race-measure-handoff 접속은 콜백 위임)
   */
  onMeasure: () => void
  onSubmit: () => void
  /** [입력] disabled "저장 중…" (single-flight, H-4) */
  pending: boolean
  /** 저장 실패 — 시트 내 role="alert" 배너 + 입력 유지 + [다시 저장] */
  errorMessage: string | null
  fieldErrors: RaceEntryFieldErrors
  /** 왕복 자동 복귀 직후 1회 true — sr 고지 후 해제는 상위 소유 */
  justMeasured: boolean
  onClose: () => void
}

// ── 내부 상수·유틸 ──────────────────────────────────────────────────────────────

const RESULT_OPTIONS = RACE_RESULTS.map(value => ({value, label: RACE_RESULT_LABELS[value]}))

const visuallyHiddenSx = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const

/** 인라인 오류 슬롯 — 각 필드 아래 1줄 상시 확보(오류 등장으로 필드 이동 금지, §6.3) */
function FieldErrorSlot({id, message}: {id: string; message: string | undefined}) {
  return (
    <Box sx={{minHeight: '1.25rem', mt: 0.5}}>
      {message !== undefined && message !== '' && (
        <FormHelperText error id={id} sx={{m: 0}}>
          {message}
        </FormHelperText>
      )}
    </Box>
  )
}

const fieldLabelSx = {display: 'block', mb: 0.5} as const

function FieldLabel({children, htmlFor}: {children: ReactNode; htmlFor?: string | undefined}) {
  if (htmlFor !== undefined) {
    return (
      <Typography
        component="label"
        htmlFor={htmlFor}
        variant="overline"
        color="text.secondary"
        sx={fieldLabelSx}>
        {children}
      </Typography>
    )
  }
  return (
    <Typography component="span" variant="overline" color="text.secondary" sx={fieldLabelSx}>
      {children}
    </Typography>
  )
}

/**
 * S6 레이스 입력 시트 (component-spec §6.3 — R-3·R-4·LD-3, BottomSheet).
 * 완전 제어형 폼 — draft·pano·오류 전부 상위(useRaceEntry) 소유, 여기는 순수 렌더+콜백.
 * focus order(layout §6.3): 파노 [측정] → 결과 세그먼트 → 전압 → 랩타임 → [입력] → [취소].
 * 상태 전수: editing(auto/measured/none) / validating-error / pending / submit-error /
 * just-measured / closed.
 */
export function RaceEntrySheet({
  open,
  motorName,
  pano,
  draft,
  onDraftChange,
  onMeasure,
  onSubmit,
  pending,
  errorMessage,
  fieldErrors,
  justMeasured,
  onClose,
}: RaceEntrySheetProps) {
  const resultErrorId = useId()
  const lapTimeId = useId()
  const lapTimeErrorId = useId()
  const measureButtonRef = useRef<HTMLButtonElement>(null)

  const hasSubmitError = errorMessage !== null && errorMessage !== ''
  const hasLapTimeError = fieldErrors.lapTime !== undefined && fieldErrors.lapTime !== ''
  // [입력] 활성 = 파노·결과·전압 충족(§6.3) — 범위·포맷 검증은 제출 시(fieldErrors)
  const canSubmit =
    pano.kind !== 'none' && draft.result !== null && draft.voltageRaw.trim() !== ''

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending || !canSubmit) return
    onSubmit()
  }

  // CJK IME 조합 중 Enter는 조합 확정 — implicit form submit로 보내지 않는다
  const handleLapTimeKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault()
  }

  return (
    <BottomSheet
      open={open}
      title={`레이스 입력 — ${motorName}`}
      onClose={() => {
        if (!pending) onClose() // 저장 중 닫힘 차단(single-flight — 성공/실패 확정 후 닫힘)
      }}
      onOpened={() => measureButtonRef.current?.focus()}>
      {/* 왕복 자동 복귀 sr 고지 1회 (§6.3) — 수동 복귀(파노 원값)면 미발화 */}
      <Box role="status" sx={visuallyHiddenSx}>
        {justMeasured && pano.kind === 'measured'
          ? `측정 완료 — 파노 ${formatFanoHz(pano.panoHz)}로 갱신되었습니다`
          : ''}
      </Box>

      <Box component="form" noValidate onSubmit={handleFormSubmit}>
        {hasSubmitError && (
          <Alert severity="error" role="alert" sx={{mb: 2}}>
            {errorMessage}
          </Alert>
        )}

        {/* ① 파노 (자동) — 읽기전용 인용값 + [측정] 왕복 진입 */}
        <Box sx={{mb: 1.5}}>
          <FieldLabel>파노 (자동)</FieldLabel>
          <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
            {pano.kind === 'none' ? (
              <Typography component="span" color="text.secondary" sx={{flex: 1}}>
                측정 기록 없음
              </Typography>
            ) : (
              // Chip은 div 렌더 — Typography(span) 내부 금지, Box(div) 행으로 병치
              <Box sx={{flex: 1, display: 'flex', alignItems: 'center', gap: 1}}>
                <Typography component="span" sx={numericTypography.listValue}>
                  {formatFanoHz(pano.panoHz)}
                </Typography>
                {pano.kind === 'measured' && (
                  <Chip size="small" variant="outlined" color="primary" label="방금 측정" />
                )}
              </Box>
            )}
            <Button
              ref={measureButtonRef}
              variant="outlined"
              onClick={onMeasure}
              disabled={pending}
              sx={{minHeight: 44, flexShrink: 0}}>
              측정
            </Button>
          </Box>
          {/* 파노는 필수 — none이면 [입력] 비활성, 유도 문구 슬롯(1줄 상시) */}
          <Box sx={{minHeight: '1.25rem', mt: 0.5}}>
            {pano.kind === 'none' && (
              <FormHelperText sx={{m: 0}}>[측정]으로 파노를 먼저 측정하세요</FormHelperText>
            )}
          </Box>
        </Box>

        {/* ② 결과 (필수) — 2택 exclusive, 시맨틱 색 없음(중립 — 선택 표시는 테마 3중) */}
        <Box sx={{mb: 1.5}}>
          <FieldLabel>결과 (필수)</FieldLabel>
          <SegmentControl<RaceResult>
            options={RESULT_OPTIONS}
            value={draft.result}
            onChange={next => {
              if (next !== null) onDraftChange({result: next})
            }}
            aria-label="레이스 결과"
            error={fieldErrors.result !== undefined}
            aria-describedby={fieldErrors.result !== undefined ? resultErrorId : undefined}
            disabled={pending}
          />
          <FieldErrorSlot id={resultErrorId} message={fieldErrors.result} />
        </Box>

        {/* ③ 전압 (필수) — 오류 슬롯은 VoltageStepper 내장 */}
        <Box sx={{mb: 1.5}}>
          <FieldLabel>전압 (필수)</FieldLabel>
          <VoltageStepper
            value={draft.voltageRaw}
            onChange={raw => onDraftChange({voltageRaw: raw})}
            error={fieldErrors.voltage ?? null}
            disabled={pending}
          />
        </Box>

        {/* ④ 랩타임 (옵션) — 초 단위 입력, ms 변환은 제출 시(state-contract) */}
        <Box sx={{mb: 2}}>
          <FieldLabel htmlFor={lapTimeId}>랩타임 (옵션)</FieldLabel>
          <OutlinedInput
            id={lapTimeId}
            fullWidth
            value={draft.lapTimeRaw}
            onChange={event => onDraftChange({lapTimeRaw: event.target.value})}
            onKeyDown={handleLapTimeKeyDown}
            disabled={pending}
            error={hasLapTimeError}
            endAdornment={<InputAdornment position="end">s</InputAdornment>}
            slotProps={{
              input: {
                inputMode: 'decimal',
                'aria-invalid': hasLapTimeError || undefined,
                'aria-describedby': hasLapTimeError ? lapTimeErrorId : undefined,
              },
            }}
            sx={numericTypography.listValue}
          />
          <FieldErrorSlot id={lapTimeErrorId} message={fieldErrors.lapTime} />
        </Box>

        <Box sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={pending || !canSubmit}
            sx={{minHeight: 48}}>
            {pending ? '저장 중…' : hasSubmitError ? '다시 저장' : '입력'}
          </Button>
          <Button variant="text" fullWidth onClick={onClose} disabled={pending} sx={{minHeight: 44}}>
            취소
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  )
}
