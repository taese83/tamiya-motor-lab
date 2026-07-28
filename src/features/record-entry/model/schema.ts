import {z} from 'zod'

import {createRecordDraftSchema, voltageSchema} from '@entities/run-record'

import type {CreateRecordDraft} from '@entities/run-record'
import type {RunResult} from '@shared/config/domain'
import type {DomainError} from '@shared/lib/errors'

// S2 기록 입력 폼 상태 계약 (component-spec §5.2 — F6, REQ-F-004·REQ-ST-005).
// 폼 상태는 로컬 useState + zod (react-hook-form 미설치 — tech-stack 확정).
// 검증은 UI 인라인 + command precondition 이중 수행 — 범위·정밀도·쌍 불변식의 단일 원천은
// entities/run-record 소유 스키마(voltageSchema·createRecordDraftSchema)이고,
// 이 파일은 UI 문구(§5.2·§3.2 copy)만 덧씌운다. client 검증은 UX 보조일 뿐
// command 검증을 대체하지 않는다 (state-contract §Commands 공통 계약).

/** §5.2·§3.2 고정 오류 문구 — 하드코딩 분산 금지, UI는 이 상수만 소비 */
export const RECORD_ENTRY_MESSAGES = {
  motorRequired: '모터를 선택하세요',
  voltageNotNumeric: '숫자를 입력하세요',
  voltageOutOfRange: '0.1~9.9 V 범위로 입력하세요',
  resultRequired: '주행 결과를 선택하세요',
} as const

/** handoff 측정값 (panoHz·rpm 쌍 — H-5: stable 확정값만 filled로 진입) */
export interface RecordEntryMeasurement {
  readonly panoHz: number
  readonly rpm: number
}

/**
 * 폼 로컬 상태 (제출 전 원시 값).
 * - voltageRaw: VoltageStepper 계약(§3.2)대로 원시 입력 문자열 — 빈 문자열 허용, 파싱은 검증 시점.
 * - measurement: null = "측정값 없음"(D2 정상 경로 — 직접 입력 기록). 수치 수정 없음, 비우기만(UX-A3).
 * - motorId/result: null = 미선택 → 검증 실패 (H-2).
 */
export interface RecordEntryFormValues {
  motorId: string | null
  measurement: RecordEntryMeasurement | null
  voltageRaw: string
  result: RunResult | null
  satisfied: boolean
}

/** 초기값 — page가 takeConfirmedMeasurement() 1회 소비 결과를 주입 (빈 slot이면 null) */
export const createInitialRecordEntryValues = (
  initialMeasurement: RecordEntryMeasurement | null,
): RecordEntryFormValues => ({
  motorId: null,
  measurement: initialMeasurement,
  voltageRaw: '',
  result: null,
  satisfied: false, // 만족 토글 기본 off — 명시 조작 시에만 true (가이드 집계 유일 원천, INV-10)
})

// 정수 또는 소수 표기만 허용 — 부호·지수·소수점 시작('.5') 표기는 비수치 취급
const VOLTAGE_NUMERIC_PATTERN = /^\d+(\.\d+)?$/

/**
 * 전압 원시 문자열 → 검증된 number (zod 파이프라인).
 * 범위(0.1~9.9)·소수 ≤2자리 판정은 entities/run-record `voltageSchema`(A5, float 안전 비교)를
 * 그대로 재사용하고, 문구만 §3.2 UI copy로 교체한다 — 규칙 중복 정의 금지.
 */
export const voltageInputSchema = z
  .string()
  .trim()
  .refine(raw => VOLTAGE_NUMERIC_PATTERN.test(raw), RECORD_ENTRY_MESSAGES.voltageNotNumeric)
  .transform(raw => Number(raw))
  .refine(
    value => voltageSchema.safeParse(value).success,
    RECORD_ENTRY_MESSAGES.voltageOutOfRange,
  )

/**
 * 필드 인라인 오류 슬롯 (§5.2 — 필드 아래 고정 위치).
 * form: 특정 필드에 매핑할 수 없는 이슈(측정값 쌍 불변식 등) — 도크 오류 배너 표시용.
 */
export interface RecordEntryFieldErrors {
  motorId?: string
  voltage?: string
  result?: string
  form?: string
}

export type RecordEntryValidation =
  | {readonly ok: true; readonly draft: CreateRecordDraft}
  | {readonly ok: false; readonly fieldErrors: RecordEntryFieldErrors}

const mapDraftIssueField = (head: PropertyKey | undefined): keyof RecordEntryFieldErrors => {
  if (head === 'motorId') return 'motorId'
  if (head === 'voltage') return 'voltage'
  if (head === 'result') return 'result'
  return 'form'
}

/**
 * 제출 시 폼 전체 검증 → 성공 시 CreateRecordDraft 산출.
 * ① 필수(모터·주행 결과)·전압 파싱을 UI copy로 판정(H-2)
 * ② 통과분을 command와 동일한 createRecordDraftSchema로 최종 게이트(검증 이중화 —
 *    측정값 쌍 INV-06·panoHz write-strict 대역 포함). D2: measurement null이면 panoHz=rpm=null.
 * 첫 오류 필드로의 focus 이동은 UI(§5.2) 소유 — 이 함수는 필드→문구 매핑만 반환한다.
 */
export function validateRecordEntryForm(values: RecordEntryFormValues): RecordEntryValidation {
  const fieldErrors: RecordEntryFieldErrors = {}

  if (values.motorId === null) fieldErrors.motorId = RECORD_ENTRY_MESSAGES.motorRequired

  const voltageParsed = voltageInputSchema.safeParse(values.voltageRaw)
  if (!voltageParsed.success) {
    fieldErrors.voltage =
      voltageParsed.error.issues[0]?.message ?? RECORD_ENTRY_MESSAGES.voltageNotNumeric
  }

  if (values.result === null) fieldErrors.result = RECORD_ENTRY_MESSAGES.resultRequired

  if (values.motorId === null || !voltageParsed.success || values.result === null) {
    return {ok: false, fieldErrors}
  }

  const draft: CreateRecordDraft = {
    motorId: values.motorId,
    voltage: voltageParsed.data,
    panoHz: values.measurement?.panoHz ?? null,
    rpm: values.measurement?.rpm ?? null,
    result: values.result,
    satisfied: values.satisfied,
  }

  // command와 동일 스키마 최종 게이트 — UI 검증에만 의존 금지 (AD-7 스키마 공유)
  const draftParsed = createRecordDraftSchema.safeParse(draft)
  if (!draftParsed.success) {
    const merged: RecordEntryFieldErrors = {...fieldErrors}
    for (const issue of draftParsed.error.issues) {
      const field = mapDraftIssueField(issue.path[0])
      if (merged[field] === undefined) merged[field] = issue.message
    }
    return {ok: false, fieldErrors: merged}
  }

  return {ok: true, draft}
}

/**
 * command 측 validation 실패(DomainError.fieldErrors) → 폼 필드 오류 매핑 계약.
 * repository는 createRecordDraftSchema 경로를 fieldErrors 키('voltage', 'rpm' 등)로 전파한다 —
 * 매핑 불가 경로는 form 슬롯으로 수렴, 아무 항목도 없으면 error.message를 form에 노출한다.
 */
export function mapCommandFieldErrors(error: DomainError): RecordEntryFieldErrors {
  const mapped: RecordEntryFieldErrors = {}
  for (const [path, message] of Object.entries(error.fieldErrors ?? {})) {
    const field = mapDraftIssueField(path.split('.')[0])
    if (mapped[field] === undefined) mapped[field] = message
  }
  if (Object.keys(mapped).length === 0) mapped.form = error.message
  return mapped
}
