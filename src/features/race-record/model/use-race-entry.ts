import {useRef, useState} from 'react'

import {createRaceRecordDraftSchema, voltageSchema} from '@entities/race-record'
import {LAP_TIME_MAX_MS, VOLTAGE_RANGE} from '@shared/config/domain'
import {isDomainError} from '@shared/lib/errors'
import {useToast} from '@shared/ui/toast'

import {recommendVoltageHeuristic} from '@shared/lib/voltage-advisor'

import {recommendVoltage, useCreateRaceRecord, useUpdateRaceRecord} from '../api'

import type {RaceEntryDraft, RaceEntryField, RaceEntryFieldErrors, RaceEntryPano} from '../ui'
import type {CreateRaceRecordDraft, RaceRecord} from '@entities/race-record'
import type {RaceGoal} from '@shared/config/domain'
import type {DomainError} from '@shared/lib/errors'
import type {VoltageAdviceInput, VoltageAdviceRace} from '@shared/lib/voltage-advisor'

/** 시트 모드 — create(신규 기록) / edit(기존 기록 수정, v2.3) */
export type RaceEntryMode = 'create' | 'edit'

// S6 레이스 입력 시트 상태 훅 (component-spec §6.3·§7.2 — R-3·R-4, form-state-builder 소유).
// draft·pano 표시·오류 전부 이 훅이 소유 — RaceEntrySheet는 순수 렌더+콜백(제어형).
// 타입 canonical은 ui/RaceEntrySheet.tsx(RaceEntryPano·RaceEntryDraft·RaceEntryFieldErrors) —
// type-only import로 소비하고 재정의하지 않는다.
// [측정] 왕복(beginRaceMeasure/navigate)은 page 소유 — 이 훅은 복원 API(restoreFromMeasureReturn)만
// 제공한다(feature 간 직접 import 금지). mutation·invalidation은 같은 slice api 세그먼트 소관.

/** §6.3 고정 오류·고지 문구 — 하드코딩 분산 금지, UI는 이 상수만 소비 */
export const RACE_ENTRY_MESSAGES = {
  voltageNotNumeric: '숫자를 입력하세요',
  voltageOutOfRange: `${VOLTAGE_RANGE.min}~${VOLTAGE_RANGE.max} V 범위로 입력하세요`,
  lapTimeNotNumeric: '초 단위 숫자로 입력하세요 (소수 둘째 자리까지)',
  lapTimeOutOfRange: '0초 초과 1시간 이하로 입력하세요',
  // pano 슬롯은 RaceEntryFieldErrors 3키(canonical)에 없음 — 방어 경로는 배너로 수렴(아래 각주)
  panoRequired: '[측정]으로 파노를 먼저 측정하세요',
  /** §7.2-3 storage 실패 비차단 고지 — 측정값 자체는 유효(성공 오표시 금지) */
  measureSaveFailed: '측정 이력 저장 실패',
} as const

const UNKNOWN_ERROR_REASON = '알 수 없는 오류가 발생했습니다'

export const createInitialRaceEntryDraft = (): RaceEntryDraft => ({
  result: null,
  voltageRaw: '',
  lapTimeRaw: '',
  goal: null,
})

// 정수 또는 소수 표기만 — 부호·지수·'.5' 시작 표기는 비수치 취급 (record-entry 규칙 승계)
const VOLTAGE_NUMERIC_PATTERN = /^\d+(\.\d+)?$/
// CD2-A4: 초 단위, 소수 최대 2자리 — ms 변환은 제출 시 Math.round(초×1000)
const LAP_TIME_PATTERN = /^\d+(\.\d{1,2})?$/
const LAP_TIME_MAX_SEC = LAP_TIME_MAX_MS / 1000 // 상수 1곳(SC2-A2) 파생 — 재정의 금지

/** draft 스키마 경로 → 폼 필드 매핑 — lapTimeMs는 UI 필드명 lapTime으로 수렴 */
const mapDraftPathToField = (head: PropertyKey | undefined): RaceEntryField | null => {
  if (head === 'result') return 'result'
  if (head === 'voltage') return 'voltage'
  if (head === 'lapTimeMs') return 'lapTime'
  return null // motorId·panoHz — 폼 필드 슬롯 없음 → 배너로 수렴
}

interface MappedErrors {
  fieldErrors: RaceEntryFieldErrors
  bannerMessage: string | null
}

/**
 * command 측 validation 실패(DomainError.fieldErrors) → 폼 필드 역매핑 계약.
 * 매핑 가능한 항목이 하나도 없으면 error.message를 배너로 노출한다(무음 실패 금지).
 */
function mapCommandFieldErrors(error: DomainError): MappedErrors {
  const fieldErrors: RaceEntryFieldErrors = {}
  for (const [path, message] of Object.entries(error.fieldErrors ?? {})) {
    const field = mapDraftPathToField(path.split('.')[0])
    if (field !== null && fieldErrors[field] === undefined) fieldErrors[field] = message
  }
  return {
    fieldErrors,
    bannerMessage: Object.keys(fieldErrors).length === 0 ? error.message : null,
  }
}

type RaceEntryValidation =
  | {readonly ok: true; readonly commandDraft: CreateRaceRecordDraft}
  | {readonly ok: false; readonly fieldErrors: RaceEntryFieldErrors; readonly bannerMessage: string | null}

/**
 * 제출 시 전체 검증 → 성공 시 CreateRaceRecordDraft 산출 (CD2-A4·AD-7 검증 이중화).
 * ① 필수(결과)·전압 파싱·랩타임(옵션) 판정을 UI copy로 수행
 * ② pano kind별 panoHz 추출 — none이면 제출 불가. RaceEntryFieldErrors(canonical 3키)에
 *    pano 슬롯이 없어 방어 오류는 배너(bannerMessage)로 수렴한다(시트가 none일 때 이미
 *    [입력] 비활성+유도 문구를 렌더하므로 이 경로는 방어적 이중 게이트).
 * ③ 통과분을 command와 동일한 createRaceRecordDraftSchema로 최종 게이트.
 */
function validateRaceEntry(
  motorId: string,
  pano: RaceEntryPano,
  draft: RaceEntryDraft,
): RaceEntryValidation {
  const fieldErrors: RaceEntryFieldErrors = {}
  let bannerMessage: string | null = pano.kind === 'none' ? RACE_ENTRY_MESSAGES.panoRequired : null

  // v2.31 — result는 옵션(레이스 전 세팅 시 미정). 필수 검증 없음.

  const voltageRaw = draft.voltageRaw.trim()
  let voltage: number | null = null
  if (!VOLTAGE_NUMERIC_PATTERN.test(voltageRaw)) {
    fieldErrors.voltage = RACE_ENTRY_MESSAGES.voltageNotNumeric
  } else {
    const parsed = Number(voltageRaw)
    // 범위(0.1~9.9)·소수 ≤2자리 판정은 entities voltageSchema 재사용 — 규칙 중복 정의 금지
    if (voltageSchema.safeParse(parsed).success) voltage = parsed
    else fieldErrors.voltage = RACE_ENTRY_MESSAGES.voltageOutOfRange
  }

  // 랩타임 옵션 — 빈 문자열이면 생략(undefined — §2.1 null vs 생략 규칙, 저장 안 함)
  const lapTimeRaw = draft.lapTimeRaw.trim()
  let lapTimeMs: number | undefined
  if (lapTimeRaw !== '') {
    if (!LAP_TIME_PATTERN.test(lapTimeRaw)) {
      fieldErrors.lapTime = RACE_ENTRY_MESSAGES.lapTimeNotNumeric
    } else {
      const seconds = Number(lapTimeRaw)
      if (seconds > 0 && seconds <= LAP_TIME_MAX_SEC) lapTimeMs = Math.round(seconds * 1000)
      else fieldErrors.lapTime = RACE_ENTRY_MESSAGES.lapTimeOutOfRange
    }
  }

  if (pano.kind === 'none' || voltage === null || fieldErrors.lapTime !== undefined) {
    return {ok: false, fieldErrors, bannerMessage}
  }

  const commandDraft: CreateRaceRecordDraft = {
    motorId,
    panoHz: pano.panoHz, // kind별 추출 — auto(캐시 인용)/measured(왕복 스냅샷) 동일 경로
    voltage,
    ...(draft.result !== null ? {result: draft.result} : {}), // v2.31 result 옵션
    ...(lapTimeMs !== undefined ? {lapTimeMs} : {}),
    ...(draft.goal !== null ? {goal: draft.goal} : {}), // v2.31 — 목표 팝업 선택값
  }

  // command와 동일 스키마 최종 게이트 — UI 검증에만 의존 금지 (AD-7 스키마 공유)
  const gate = createRaceRecordDraftSchema.safeParse(commandDraft)
  if (!gate.success) {
    const merged: RaceEntryFieldErrors = {...fieldErrors}
    for (const issue of gate.error.issues) {
      const field = mapDraftPathToField(issue.path[0])
      if (field !== null && merged[field] === undefined) merged[field] = issue.message
      else if (field === null && bannerMessage === null) bannerMessage = issue.message
    }
    return {ok: false, fieldErrors: merged, bannerMessage}
  }

  return {ok: true, commandDraft}
}

/** §7.2 왕복 복귀 복원 입력 — page가 consumeRaceMeasureReturn() 반환값으로 조립한다 */
export interface RaceMeasureReturnRestore {
  /** 왕복 전 보존 draft — 그대로 교체 복원 */
  draft: RaceEntryDraft
  /**
   * 자동 확정 스냅샷 panoHz — number면 pano를 {kind:'measured'}로 갱신(§7.2-2·3),
   * null이면 수동 복귀(§7.2-5) — 파노 원값(auto) 유지, measured 미설정
   */
  measuredPanoHz: number | null
  /** 자동 복귀 직후 1회 sr 고지(§6.3) — 수동 복귀면 false(미발화) */
  justMeasured: boolean
  /** collectMeasureRecord storage 실패(§7.2-3) — 비차단 배너 고지, 복귀·파노 갱신은 수행 */
  saveFailed: boolean
  /**
   * v2.33 — 재측정 재추천 입력. 목표가 있고 새 파노가 측정됐을 때 page가 (새 파노 + 이력)을
   * 담아 넘기면, 복귀 즉시 그 파노에 맞게 전압을 다시 추천한다(파노↔전압 상관 재평가). 없으면 생략.
   */
  recompute?: VoltageAdviceInput | undefined
}

/** RaceEntrySheet props에 그대로 전개 가능한 형태(open·onSubmit·onClose만 이름 매핑) */
export interface RaceEntryController {
  sheetOpen: boolean
  /** 시트 모드 — RaceEntrySheet에 전달(create/edit로 제목·버튼·[측정] 노출 분기) */
  mode: RaceEntryMode
  /** [+ 기록] — 새 draft로 시트 오픈 (create, R-4 반복 입력). 첫 기록·목표 없이 진입 */
  openSheet: () => void
  /** v2.31 — 목표 팝업 선택 후 진입(2번째+). 시트 오픈 + **휴리스틱** 전압 추천 프리필(기본) */
  openWithGoal: (
    goal: RaceGoal,
    adviceInput: {currentPanoHz: number; history: ReadonlyArray<VoltageAdviceRace>},
  ) => void
  /** v2.35 — [AI 추천] 버튼: 현재 상태로 서버리스 LLM 추천 요청(실패 시 휴리스틱 폴백) */
  requestAiVoltage: (adviceInput: VoltageAdviceInput) => void
  /** 행 [수정] — 기존 기록 값으로 시트를 edit 모드로 오픈 (v2.3). pending 중 no-op */
  editRecord: (record: RaceRecord) => void
  /** 취소·ESC·backdrop — draft 파기(§6.3, 왕복 복원은 slot이 별도 보존). pending 중 no-op */
  closeSheet: () => void
  draft: RaceEntryDraft
  onDraftChange: (patch: Partial<RaceEntryDraft>) => void
  /** measured 우선, 아니면 페이지 주입 initialPano(auto/none) 파생 */
  pano: RaceEntryPano
  fieldErrors: RaceEntryFieldErrors
  /** [입력] disabled "저장 중…" (single-flight, H-4) */
  pending: boolean
  /** 저장 실패·측정 이력 저장 실패 배너 — 입력 유지 + [다시 저장] */
  errorMessage: string | null
  /** 왕복 자동 복귀 직후 1회 true — 해제는 이 훅 소유(사용자 조작·제출 시) */
  justMeasured: boolean
  /** v2.31 추천 전압 근거(한국어) — 없으면 null(첫 기록·수정·미선택) */
  rationale: string | null
  /** v2.35 AI 추천 요청 중 — [AI 추천] 버튼 "요청 중…" */
  recommendPending: boolean
  /** v2.35 현재 추천 출처(휴리스틱 기본 / AI) — 배지·버튼 라벨용. null = 추천 없음 */
  recommendSource: 'ai' | 'heuristic' | null
  submit: () => void
  restoreFromMeasureReturn: (restore: RaceMeasureReturnRestore) => void
}

/**
 * 레이스 입력 폼 상태 훅 (F6-R).
 * - auto 파노는 페이지가 주입(initialPano — 최신 MeasureRecord 캐시 select 파생, AR-5:
 *   전용 query 금지)하고, 이 훅은 왕복 measured 덮어쓰기만 소유한다 — 서버 상태 미복사.
 * - 성공: 시트 닫힘 + draft 초기화 + 토스트 "저장됨"(§6.3). 실패: 배너 + 입력 유지(성공 위장 금지).
 * - command validation 실패는 필드 인라인 역매핑, not-found(모터 삭제 C-8) 등은 배너로 수렴 —
 *   목록 invalidate는 mutation 훅(api 세그먼트) 소관.
 */
export function useRaceEntry(motorId: string, initialPano: RaceEntryPano): RaceEntryController {
  const createRaceRecord = useCreateRaceRecord()
  const updateRaceRecord = useUpdateRaceRecord()
  const {showSuccess} = useToast()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [mode, setMode] = useState<RaceEntryMode>('create')
  // edit 대상 기록 id — create이면 null. submit에서 update/create 분기 결정.
  const [editingId, setEditingId] = useState<string | null>(null)
  // edit 모드에서 표시할 기존 기록의 panoHz(측정값 — 수정 불가, 읽기전용 인용)
  const [editPanoHz, setEditPanoHz] = useState<number | null>(null)
  const [draft, setDraft] = useState<RaceEntryDraft>(createInitialRaceEntryDraft)
  // 왕복 measured 덮어쓰기(create 전용) — null이면 initialPano(auto/none) 그대로 표시
  const [measuredPanoHz, setMeasuredPanoHz] = useState<number | null>(null)
  const [justMeasured, setJustMeasured] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<RaceEntryFieldErrors>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  // v2.31 전압 추천 — 근거 문구 + 계산 중 플래그(하이브리드: 서버리스 LLM 또는 휴리스틱 폴백)
  const [rationale, setRationale] = useState<string | null>(null)
  const [recommendPending, setRecommendPending] = useState(false)
  // v2.35 — 현재 추천 출처(기본 휴리스틱 / [AI 추천] 클릭 시 ai). null = 추천 없음(첫 기록·수정)
  const [recommendSource, setRecommendSource] = useState<'ai' | 'heuristic' | null>(null)
  // state 반영 전 같은 tick의 중복 탭까지 차단하는 동기 가드 (H-4)
  const inFlightRef = useRef(false)
  // 추천 응답 경합 방지 — 최신 요청 seq만 반영(빠른 목표 재선택·닫힘 대비)
  const recommendSeqRef = useRef(0)

  // edit이면 기존 기록의 panoHz를 읽기전용 인용(auto)으로, create이면 measured 우선·아니면 initialPano
  const pano: RaceEntryPano =
    mode === 'edit' && editPanoHz !== null
      ? {kind: 'auto', panoHz: editPanoHz}
      : measuredPanoHz !== null
        ? {kind: 'measured', panoHz: measuredPanoHz}
        : initialPano

  const resetEntry = (): void => {
    setDraft(createInitialRaceEntryDraft())
    setMode('create')
    setEditingId(null)
    setEditPanoHz(null)
    setMeasuredPanoHz(null)
    setJustMeasured(false)
    setFieldErrors({})
    setErrorMessage(null)
    setRationale(null)
    setRecommendPending(false)
    setRecommendSource(null)
    recommendSeqRef.current += 1 // 진행 중 추천 무효화(닫힘·재오픈 시 stale 반영 금지)
  }

  const openSheet = (): void => {
    if (pending) return
    resetEntry()
    setSheetOpen(true)
  }

  // v2.31/v2.35 — 목표 팝업에서 목표 선택 후 진입. **기본 추천은 휴리스틱**(즉시·오프라인·무료).
  // AI 추천은 시트 내 [AI 추천] 버튼(requestAiVoltage)으로 명시 요청한다.
  const openWithGoal = (
    goal: RaceGoal,
    adviceInput: {currentPanoHz: number; history: ReadonlyArray<VoltageAdviceRace>},
  ): void => {
    if (pending) return
    resetEntry()
    const advice = recommendVoltageHeuristic({
      goal,
      currentPanoHz: adviceInput.currentPanoHz,
      history: adviceInput.history,
    })
    setDraft({...createInitialRaceEntryDraft(), goal, voltageRaw: advice.voltage.toFixed(2)})
    setRationale(advice.rationale)
    setRecommendSource(advice.source)
    setSheetOpen(true)
  }

  // v2.35 — [AI 추천] 클릭 시 현재 상태(목표·현재 파노·최근 이력)로 서버리스 LLM 요청.
  // 실패·오프라인·키없음이면 recommendVoltage 내부에서 휴리스틱으로 폴백(무음 실패 금지).
  const requestAiVoltage = (adviceInput: VoltageAdviceInput): void => {
    if (pending || recommendPending) return
    setRecommendPending(true)
    const seq = ++recommendSeqRef.current
    void (async () => {
      const advice = await recommendVoltage(adviceInput)
      if (recommendSeqRef.current !== seq) return // 최신 요청만 반영(경합·닫힘 방어)
      setDraft(prev => ({...prev, voltageRaw: advice.voltage.toFixed(2)}))
      setRationale(advice.rationale)
      setRecommendSource(advice.source)
      setRecommendPending(false)
    })()
  }

  // v2.3 — 행 [수정]: 기존 기록 값으로 edit 모드 오픈. panoHz는 읽기전용 인용, 편집은 3필드만.
  const editRecord = (record: RaceRecord): void => {
    if (pending) return
    setMode('edit')
    setEditingId(record.id)
    setEditPanoHz(record.panoHz)
    setMeasuredPanoHz(null)
    setDraft({
      result: record.result ?? null, // v2.31 result 옵션 — 미정이면 null
      voltageRaw: String(record.voltage),
      lapTimeRaw: record.lapTimeMs !== undefined ? String(record.lapTimeMs / 1000) : '',
      goal: record.goal ?? null, // 기존 목표 보존(수정 시 추천은 재실행하지 않음 — 값 그대로)
    })
    setJustMeasured(false)
    setFieldErrors({})
    setErrorMessage(null)
    setSheetOpen(true)
  }

  const closeSheet = (): void => {
    if (pending) return // 저장 중 닫힘 차단 — 성공/실패 확정 후에만 (single-flight)
    resetEntry()
    setSheetOpen(false)
  }

  const onDraftChange = (patch: Partial<RaceEntryDraft>): void => {
    setDraft(prev => ({...prev, ...patch}))
    setJustMeasured(false) // sr 고지 1회 — 사용자 조작 시 해제(§6.3 상위 소유)
    setFieldErrors(prev => {
      const next = {...prev}
      if ('result' in patch) delete next.result
      if ('voltageRaw' in patch) delete next.voltage
      if ('lapTimeRaw' in patch) delete next.lapTime
      return next
    })
  }

  const submit = (): void => {
    if (inFlightRef.current || pending) return // H-4 single-flight

    setJustMeasured(false)
    const validation = validateRaceEntry(motorId, pano, draft)
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors)
      setErrorMessage(validation.bannerMessage)
      return
    }

    inFlightRef.current = true
    setPending(true)
    setFieldErrors({})
    setErrorMessage(null)

    // 제출 시점 모드 고정 — 비동기 중 mode 변경 경합 방지 (create/edit 분기는 진입 시 결정)
    const editingTarget = mode === 'edit' && editingId !== null ? editingId : null
    const actionLabel = editingTarget !== null ? '수정' : '저장'

    void (async () => {
      try {
        if (editingTarget !== null) {
          // edit — panoHz·구조 필드는 command가 보존, patch는 편집 3필드만(commandDraft에서 추출)
          await updateRaceRecord.mutateAsync({
            id: editingTarget,
            patch: {
              voltage: validation.commandDraft.voltage,
              ...(validation.commandDraft.result !== undefined
                ? {result: validation.commandDraft.result}
                : {}),
              ...(validation.commandDraft.lapTimeMs !== undefined
                ? {lapTimeMs: validation.commandDraft.lapTimeMs}
                : {}),
            },
          })
        } else {
          await createRaceRecord.mutateAsync(validation.commandDraft)
        }
        // invalidation(raceKeys.byMotor·motorKeys.summaries)은 mutation 훅 소관 — 완료 후 resolve
        resetEntry()
        setSheetOpen(false)
        showSuccess(editingTarget !== null ? '수정되었습니다' : '저장됨') // §6.3 성공 토스트 copy
      } catch (e) {
        if (isDomainError(e) && e.code === 'validation') {
          // command 재검증 실패 — 필드 인라인 역매핑, 입력 유지 (H-2)
          const mapped = mapCommandFieldErrors(e)
          setFieldErrors(mapped.fieldErrors)
          setErrorMessage(mapped.bannerMessage)
        } else {
          // not-found(동시 탭 선삭제 — 시트 유지+배너, 목록 invalidate는 mutation 훅)·storage 등
          const reason = isDomainError(e) ? e.message : UNKNOWN_ERROR_REASON
          setErrorMessage(`${actionLabel}하지 못했습니다 — ${reason}`)
        }
      } finally {
        setPending(false)
        inFlightRef.current = false
      }
    })()
  }

  const restoreFromMeasureReturn = (restore: RaceMeasureReturnRestore): void => {
    // §7.2-2·3·5: 시트 재오픈 + draft 교체 복원 + (스냅샷 있으면) pano measured 설정.
    // 왕복 [측정]은 create 전용(edit은 [측정] 미노출) — 복원 시 create 모드 확정.
    setMode('create')
    setEditingId(null)
    setEditPanoHz(null)
    setDraft(restore.draft)
    setMeasuredPanoHz(restore.measuredPanoHz)
    setJustMeasured(restore.justMeasured)
    setFieldErrors({})
    setErrorMessage(restore.saveFailed ? RACE_ENTRY_MESSAGES.measureSaveFailed : null)
    setRationale(null)
    setRecommendPending(false)
    setRecommendSource(null)
    recommendSeqRef.current += 1 // 진행 중 AI 요청 무효화(재오픈 시 stale 반영 금지)
    setSheetOpen(true)
    // v2.33/v2.35 — 재측정 재추천: 새 파노로 **휴리스틱** 재추천(기본). AI는 [AI 추천] 버튼으로.
    if (restore.recompute !== undefined) {
      const advice = recommendVoltageHeuristic(restore.recompute)
      setDraft(prev => ({...prev, voltageRaw: advice.voltage.toFixed(2)}))
      setRationale(advice.rationale)
      setRecommendSource(advice.source)
    }
  }

  return {
    sheetOpen,
    mode,
    openSheet,
    openWithGoal,
    requestAiVoltage,
    editRecord,
    closeSheet,
    draft,
    onDraftChange,
    pano,
    fieldErrors,
    pending,
    errorMessage,
    justMeasured,
    rationale,
    recommendPending,
    recommendSource,
    submit,
    restoreFromMeasureReturn,
  }
}
