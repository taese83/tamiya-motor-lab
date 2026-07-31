import {Alert, Box, Button, Chip, InputAdornment, OutlinedInput, Typography} from '@mui/material'
import {useId, useRef} from 'react'

import {RACE_GOAL_LABELS, RACE_RESULT_LABELS, RACE_RESULTS} from '@shared/config/domain'
import {layoutTokens, numericTypography, srOnlySx} from '@shared/config/design-tokens'
import {formatFanoHz} from '@shared/lib/format'
import {BottomSheet} from '@shared/ui/bottom-sheet'
import {FormField} from '@shared/ui/form-field'
import {SegmentControl} from '@shared/ui/segment-control'
import {VoltageStepper} from '@shared/ui/voltage-stepper'

import {RaceRetireReasonSelect} from './RaceRetireReasonSelect'

import type {RaceGoal, RaceResult, RetireReason} from '@shared/config/domain'
import type {FormEvent, KeyboardEvent} from 'react'

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
  /** v2.31 목표(완주/안정/속도) — 2번째+ 입력 시 팝업에서 선택. 미선택(첫 기록·수정)이면 null */
  goal: RaceGoal | null
  /**
   * R20 이탈 사유(옵션·단일, retire-reason-chipset) — result='retired'일 때만 유의미.
   * 완주/미정 전환 시 클리어(D-R2)는 상위(useRaceEntry) 소유 — 여기는 렌더+콜백만.
   */
  retireReason: RetireReason | null
}

export type RaceEntryField = 'result' | 'voltage' | 'lapTime'
export type RaceEntryFieldErrors = Partial<Record<RaceEntryField, string>>

export interface RaceEntrySheetProps {
  open: boolean
  /** create(신규 입력) / edit(기존 기록 수정, v2.3) — 제목·[측정] 노출·제출 라벨 분기 */
  mode: 'create' | 'edit'
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
  /** v2.31 전압 추천 근거(한국어) — 프리필 전압의 설명(휴리스틱/AI 공통). 없으면 미표시 */
  recommendation: string | null
  /** v2.35 AI 추천 요청 중 — [AI 추천] 버튼 "요청 중…" */
  recommendPending: boolean
  /** v2.35 현재 추천 출처 — 'ai'면 "AI 추천됨" 배지 */
  recommendSource: 'ai' | 'heuristic' | null
  /** v2.35 [AI 추천] 클릭 — 현재 상태로 AI 추천 요청(목표 있을 때만 노출) */
  onRequestAiVoltage: () => void
  onClose: () => void
}

// ── 내부 상수·유틸 ──────────────────────────────────────────────────────────────

const RESULT_OPTIONS = RACE_RESULTS.map(value => ({value, label: RACE_RESULT_LABELS[value]}))

/**
 * v2.10 필드 리듬 — 모든 행이 같은 간격을 쓴다. 이전에는 mb 1.5/2가 섞여 있었다.
 * 오류 슬롯이 각 필드 아래 1줄을 상시 차지하므로 행 간격은 그 위에 얹힌다.
 *
 * v2.11: 라벨·오류 슬롯·읽기전용 표면은 공용 FormField가 소유한다 —
 * 이 파일의 FieldLabel·FieldErrorSlot·readonlyFieldSx는 그쪽으로 흡수돼 제거됐다.
 */
const fieldRowSx = {mb: 2} as const

/**
 * S6 레이스 입력/수정 시트 (component-spec §6.3 — R-3·R-4·LD-3, BottomSheet).
 * 완전 제어형 폼 — draft·pano·오류 전부 상위(useRaceEntry) 소유, 여기는 순수 렌더+콜백.
 * mode=create: 파노 [측정] 왕복 + [입력]. mode=edit(v2.3): panoHz 읽기전용([측정] 미노출),
 * result·voltage·lapTimeMs만 편집 + [저장]. focus order(layout §6.3):
 * (create) 파노 [측정] → 결과 → (이탈 시 사유, R20) → 전압 → 랩타임 → [입력] → [취소].
 * 상태 전수: editing(auto/measured/none) / validating-error / pending / submit-error /
 * just-measured / closed.
 */
export function RaceEntrySheet({
  open,
  mode,
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
  recommendation,
  recommendPending,
  recommendSource,
  onRequestAiVoltage,
  onClose,
}: RaceEntrySheetProps) {
  const resultErrorId = useId()
  const voltageErrorId = useId()
  const lapTimeId = useId()
  const lapTimeErrorId = useId()
  const measureButtonRef = useRef<HTMLButtonElement>(null)

  const isEdit = mode === 'edit'
  const hasSubmitError = errorMessage !== null && errorMessage !== ''
  const hasLapTimeError = fieldErrors.lapTime !== undefined && fieldErrors.lapTime !== ''
  // [입력] 활성 = 파노·전압 충족. v2.31: result는 옵션이라 활성 조건에서 제외(레이스 전 세팅)
  const canSubmit = pano.kind !== 'none' && draft.voltageRaw.trim() !== ''

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
      title={`${isEdit ? '레이스 수정' : '레이스 입력'} — ${motorName}`}
      onClose={() => {
        if (!pending) onClose() // 저장 중 닫힘 차단(single-flight — 성공/실패 확정 후 닫힘)
      }}
      onOpened={() => measureButtonRef.current?.focus()}>
      {/* 왕복 자동 복귀 sr 고지 1회 (§6.3) — 수동 복귀(파노 원값)면 미발화 */}
      <Box role="status" sx={srOnlySx}>
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

        {/*
          ① 파노 — create: 자동 인용값 + [측정] 왕복 진입 / edit: 측정값 읽기전용(수정 불가).
          v2.11: [측정]을 필드 **안쪽 우측** 인라인 액션으로 옮겼다(레퍼런스 EDIT 위치).
          읽기전용이므로 labelFor를 주지 않는다 — 포커스 대상 입력이 없다.
        */}
        <Box sx={fieldRowSx}>
          <FormField
            label={isEdit ? '파노 · 수정 불가' : '파노 · 자동'}
            helperText={
              !isEdit && pano.kind === 'none' ? '[측정]으로 파노를 먼저 측정하세요' : undefined
            }
            action={
              !isEdit ? (
                <Button
                  ref={measureButtonRef}
                  variant="text"
                  onClick={onMeasure}
                  disabled={pending}
                  sx={{minWidth: 44, height: layoutTokens.formControlHeight - 8, px: 1.5}}>
                  측정
                </Button>
              ) : undefined
            }>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, px: 1.75, minWidth: 0}}>
              {pano.kind === 'none' ? (
                <Typography component="span" color="text.secondary">
                  측정 기록 없음
                </Typography>
              ) : (
                <>
                  <Typography component="span" sx={numericTypography.listValue}>
                    {formatFanoHz(pano.panoHz)}
                  </Typography>
                  {pano.kind === 'measured' && (
                    <Chip size="small" variant="outlined" color="primary" label="방금 측정" />
                  )}
                </>
              )}
            </Box>
          </FormField>
        </Box>

        {/*
          ② 결과 (필수) — 2택 exclusive, 시맨틱 색 없음(중립 — 선택 표시는 테마 3중).
          SegmentControl이 aria-label을 이미 갖고 있어 FormField 라벨은 aria-hidden으로 둔다
          (labelFor 미지정 → 이중 낭독 방지).
        */}
        <Box sx={fieldRowSx}>
          <FormField label="결과 · 옵션" error={fieldErrors.result ?? null} errorId={resultErrorId}>
            <SegmentControl<RaceResult>
              options={RESULT_OPTIONS}
              value={draft.result}
              // v2.31 result 옵션 — 재탭으로 미정(null) 해제 허용
              onChange={next => onDraftChange({result: next})}
              allowDeselect
              aria-label="레이스 결과"
              error={fieldErrors.result !== undefined}
              aria-describedby={fieldErrors.result !== undefined ? resultErrorId : undefined}
              disabled={pending}
              borderless
            />
          </FormField>
        </Box>

        {/*
          ②-b 이탈 사유 (R20, retire-reason-chipset) — result='retired'일 때만 노출되는 옵션
          필드. 무검증이라 오류 결속이 없다(FormField 기본 helper 슬롯은 행 리듬 유지용으로 유지).
          재귀 트리 드릴다운·선택 상태는 RaceRetireReasonSelect가, 값 소유는 상위 draft가 가진다.
        */}
        {draft.result === 'retired' && (
          <Box sx={fieldRowSx}>
            <FormField label="이탈 사유 · 옵션">
              <RaceRetireReasonSelect
                value={draft.retireReason}
                onChange={next => onDraftChange({retireReason: next})}
              />
            </FormField>
          </Box>
        )}

        {/*
          ③ 전압 (필수) — 오류 슬롯은 FormField가 소유(스테퍼 내장 슬롯은 끈다).
          v2.31: 목표 팝업 후 추천 전압이 프리필되고, 근거를 helperText로 노출한다(AI/휴리스틱 공통).
          추천은 시작값일 뿐 — 사용자가 스테퍼로 자유롭게 조정 가능(최종 검증은 voltageSchema).
        */}
        <Box sx={fieldRowSx}>
          <FormField
            label={
              draft.goal !== null
                ? `전압 · ${RACE_GOAL_LABELS[draft.goal]} 추천`
                : '전압 · 필수'
            }
            error={fieldErrors.voltage ?? null}
            errorId={voltageErrorId}
            helperText={
              recommendPending
                ? 'AI 추천 요청 중…'
                : recommendation !== null
                  ? recommendation
                  : undefined
            }>
            <VoltageStepper
              value={draft.voltageRaw}
              onChange={raw => onDraftChange({voltageRaw: raw})}
              error={fieldErrors.voltage ?? null}
              disabled={pending}
              borderless
              errorId={voltageErrorId}
            />
          </FormField>
          {/*
            v2.35 — 기본 추천은 휴리스틱(즉시). [AI 추천]을 누르면 현재 상태(목표·파노·최근 이력)로
            서버리스 LLM에 요청한다(실패 시 휴리스틱 폴백). 목표가 있을 때만 노출(추천은 목표 기반).
          */}
          {draft.goal !== null && (
            <Box
              sx={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mt: 0.5}}>
              {recommendSource === 'ai' && !recommendPending && (
                <Typography component="span" variant="caption" color="primary">
                  AI 추천됨
                </Typography>
              )}
              <Button
                variant="text"
                size="small"
                onClick={onRequestAiVoltage}
                disabled={pending || recommendPending}
                sx={{minHeight: 36}}>
                {recommendPending ? 'AI 추천 요청 중…' : 'AI 추천'}
              </Button>
            </Box>
          )}
        </Box>

        {/* ④ 랩타임 (옵션) — 초 단위 입력, ms 변환은 제출 시(state-contract).
            텍스트 입력이라 labelFor로 실제 <label for> 결속을 만든다 */}
        <Box sx={fieldRowSx}>
          <FormField
            label="랩타임 · 옵션"
            labelFor={lapTimeId}
            error={fieldErrors.lapTime ?? null}
            errorId={lapTimeErrorId}>
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
              sx={{...numericTypography.listValue, height: '100%'}}
            />
          </FormField>
        </Box>

        {/*
          액션 — v2.11: 레퍼런스처럼 주/보조를 나란히 배치한다(세로 적층 → 가로 2열).
          주 액션이 좌측 넓은 비율(2)을 차지해 위계가 유지되고, 시트 높이도 한 줄 줄어든다.
          둘 다 폼 공통 높이(이전 48/44 불일치는 v2.10에서 정정).
        */}
        <Box sx={{display: 'flex', gap: 1}}>
          <Button
            type="submit"
            variant="contained"
            disabled={pending || !canSubmit}
            sx={{flex: 2, height: layoutTokens.formControlHeight}}>
            {pending ? '저장 중…' : hasSubmitError ? '다시 저장' : isEdit ? '저장' : '입력'}
          </Button>
          <Button
            variant="outlined"
            onClick={onClose}
            disabled={pending}
            sx={{flex: 1, height: layoutTokens.formControlHeight}}>
            취소
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  )
}
