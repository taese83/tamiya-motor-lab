import {useRef, useState} from 'react'

import {isDomainError} from '@shared/lib/errors'

import {
  createInitialRecordEntryValues,
  mapCommandFieldErrors,
  validateRecordEntryForm,
} from './schema'

import type {
  RecordEntryFieldErrors,
  RecordEntryFormValues,
  RecordEntryMeasurement,
} from './schema'
import type {CreateRecordDraft} from '@entities/run-record'
import type {RunResult} from '@shared/config/domain'

// S2 폼 제출 상태 머신 (component-spec §5.2): editing → (validating 동기) → submitting →
// (saved: onSaved | submit-error: 배너+입력 유지). validating은 동기 순간이라 상태로 노출하지
// 않고, saved는 onSaved 호출로 표면화한다(페이지가 pop+토스트 소유).
export type RecordEntrySubmitStatus = 'editing' | 'submitting' | 'submit-error'

export interface UseRecordEntryFormOptions {
  /** page가 takeConfirmedMeasurement() 1회 소비 결과를 주입 — 빈 slot이면 null (H-5/D2) */
  initialMeasurement: RecordEntryMeasurement | null
  /**
   * createRecord 실행자 주입 — mutation 훅(feature-mutation-builder, features/record-entry/api)의
   * mutateAsync 또는 `async d => { unwrap(await createRecord(d)) }`. 성공 시 resolve,
   * 실패 시 DomainError reject(unwrap 채널). invalidation(recordKeys.root·
   * motorKeys.summaries()·guideKeys.root)은 mutation 훅 소관 — 이 훅은 수행하지 않는다.
   */
  submit: (draft: CreateRecordDraft) => Promise<void>
  /** 저장 성공 시 1회 — pop(+딥링크 replace)·토스트 "저장됨"은 page 소유 */
  onSaved: () => void
}

// 이름 주의: `RecordEntryForm`은 ui 세그먼트 조립 컴포넌트명(§5.2)으로 예약 — 충돌 방지 접미사
export interface RecordEntryFormController {
  values: RecordEntryFormValues
  fieldErrors: RecordEntryFieldErrors
  submitStatus: RecordEntrySubmitStatus
  /** submit-error 도크 배너 문구 — "저장하지 못했습니다 — {사유}" (C-4, 성공 위장 금지) */
  submitErrorMessage: string | null
  /** H-4: [저장] disabled + "저장 중…" 라벨 판정용 */
  isSubmitting: boolean
  setMotorId: (motorId: string) => void
  /** filled → empty 전환 (UX-A3 — slot은 이미 소비됨, 폼 내 복구 불가) */
  clearMeasurement: () => void
  setVoltageRaw: (raw: string) => void
  setResult: (result: RunResult) => void
  setSatisfied: (satisfied: boolean) => void
  /** 검증 → 제출. 제출 중 재호출은 no-op (H-4 single-flight 가드) */
  submitForm: () => void
}

const UNKNOWN_ERROR_REASON = '알 수 없는 오류가 발생했습니다'

/**
 * S2 기록 입력 폼 로컬 상태 훅 (F6).
 * - 서버 상태를 복사하지 않는다 — 모터 목록 등 조회 데이터는 query 캐시 소관.
 * - 실패 시 입력값 전부 유지 + [다시 저장] 재활성 (C-4/REQ-ST-005).
 * - command validation 실패는 필드 인라인으로 역매핑(mapCommandFieldErrors),
 *   그 외 실패는 도크 배너(submit-error)로 수렴한다.
 */
export function useRecordEntryForm(options: UseRecordEntryFormOptions): RecordEntryFormController {
  const [values, setValues] = useState<RecordEntryFormValues>(() =>
    createInitialRecordEntryValues(options.initialMeasurement),
  )
  const [fieldErrors, setFieldErrors] = useState<RecordEntryFieldErrors>({})
  const [submitStatus, setSubmitStatus] = useState<RecordEntrySubmitStatus>('editing')
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null)
  // state 반영 전 같은 tick의 중복 탭까지 차단하는 동기 가드 (H-4)
  const inFlightRef = useRef(false)

  const clearFieldError = (field: keyof RecordEntryFieldErrors): void => {
    setFieldErrors(prev => {
      if (prev[field] === undefined) return prev
      const next = {...prev}
      delete next[field]
      return next
    })
  }

  const setMotorId = (motorId: string): void => {
    setValues(prev => ({...prev, motorId}))
    clearFieldError('motorId')
  }

  const clearMeasurement = (): void => {
    setValues(prev => ({...prev, measurement: null}))
    clearFieldError('form')
  }

  const setVoltageRaw = (raw: string): void => {
    setValues(prev => ({...prev, voltageRaw: raw}))
    clearFieldError('voltage')
  }

  const setResult = (result: RunResult): void => {
    setValues(prev => ({...prev, result}))
    clearFieldError('result')
  }

  const setSatisfied = (satisfied: boolean): void => {
    setValues(prev => ({...prev, satisfied}))
  }

  const submitForm = (): void => {
    if (inFlightRef.current) return // H-4 single-flight

    const validation = validateRecordEntryForm(values)
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors)
      setSubmitStatus('editing')
      setSubmitErrorMessage(null)
      return
    }

    inFlightRef.current = true
    setFieldErrors({})
    setSubmitErrorMessage(null)
    setSubmitStatus('submitting')

    void (async () => {
      try {
        await options.submit(validation.draft)
        setSubmitStatus('editing')
        options.onSaved()
      } catch (e) {
        if (isDomainError(e) && e.code === 'validation') {
          // command 재검증 실패 — 필드 인라인으로 역매핑, 입력 유지 (H-2)
          setFieldErrors(mapCommandFieldErrors(e))
          setSubmitStatus('editing')
          return
        }
        const reason = isDomainError(e) ? e.message : UNKNOWN_ERROR_REASON
        setSubmitErrorMessage(`저장하지 못했습니다 — ${reason}`)
        setSubmitStatus('submit-error')
      } finally {
        inFlightRef.current = false
      }
    })()
  }

  return {
    values,
    fieldErrors,
    submitStatus,
    submitErrorMessage,
    isSubmitting: submitStatus === 'submitting',
    setMotorId,
    clearMeasurement,
    setVoltageRaw,
    setResult,
    setSatisfied,
    submitForm,
  }
}
