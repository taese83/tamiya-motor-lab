import {useEffect, useRef, useState} from 'react'

import {RECORD_DELAY_OPTIONS} from '@shared/config/domain'

import type {CollectSnapshot} from './use-collect-flow'
import type {RecordDelayKey} from '@shared/config/domain'

// v2.7 지연 수집 게이트 — [기록] 3종(즉시·10초 후·1분 후)의 타이밍만 소유한다.
//
// 설계: 기존 수집 경로(스냅샷 고정 → 모터 선택 → 저장)를 **그대로 재사용**하고, 그 앞에
// 카운트다운 게이트만 끼운다. 즉 지연 타입은 "스냅샷을 언제 고정할지"만 바꾸며
// 선택·저장·rolling·invalidation 계약은 손대지 않는다(SC2-A3·MR-2 스냅샷 고정 계약 유지).
// 캡처 시점의 수치를 그대로 넘기므로 재반올림도 없다(표시-기록 일치).
//
// 만료 시각에 measuring이 아니면(신호 흔들림·모터 정지) 실패로 끝내지 않고 **다음 안정 시점까지
// 대기**한다. 값 없이 기록하거나 만료 전 낡은 값을 기록하는 것보다 안전하고, 오류 표면이
// 필요 없어 Z1/Z2/Z3 고정 높이 레이아웃도 흔들리지 않는다. 무한 대기는 [취소]가 해소한다.
//
// 타이머는 이 훅이 유일하게 소유하고 언마운트·취소 시 정리된다(측정 탭 이탈 시 잔류 금지).

/** 대기 중 표시 상태 — 소비 페이지가 Z3 액션으로 그대로 전달한다 */
export interface DelayedCapturePending {
  /** 선택한 타입 라벨 ("10초 후 기록") */
  label: string
  /** 남은 초(올림) — 만료 후에는 0 */
  remainingSec: number
  /** 만료했지만 수치가 불안정해 안정 시점을 기다리는 중 */
  waitingForStable: boolean
}

export interface DelayedCaptureApi {
  /** 대기 중이 아니면 null */
  pending: DelayedCapturePending | null
  /** 기록 타입 탭 — 즉시는 곧바로 캡처, 지연은 카운트다운 시작 */
  start: (key: RecordDelayKey) => void
  /** [취소] — 대기 파기(멱등) */
  cancel: () => void
}

export interface UseDelayedCaptureInput {
  /**
   * 캡처 시점의 스냅샷 공급자 — measuring이 아니면 null을 반환해야 한다.
   * null이면 훅이 다음 안정 시점까지 대기한다(page가 view에서 파생해 주입).
   */
  readSnapshot: () => CollectSnapshot | null
  /** 캡처 성공 — 기존 수집 플로우 진입(모터 선택 시트) */
  onCapture: (snapshot: CollectSnapshot) => void
}

interface PendingState extends DelayedCapturePending {
  /** 만료 시각(ms) — 표시용 remainingSec의 원천 */
  deadline: number
}

/** 카운트다운·안정 대기 폴링 주기 — 1초 표시 갱신이 늦지 않게 여유를 둔다 */
const TICK_MS = 250

export function useDelayedCapture(input: UseDelayedCaptureInput): DelayedCaptureApi {
  const [pending, setPending] = useState<PendingState | null>(null)

  // 최신 콜백 유지 — 재생성이 타이머를 재시작시키지 않게 분리한다
  const readSnapshotRef = useRef(input.readSnapshot)
  const onCaptureRef = useRef(input.onCapture)
  useEffect(() => {
    readSnapshotRef.current = input.readSnapshot
    onCaptureRef.current = input.onCapture
  })

  useEffect(() => {
    if (pending === null) return
    const timer = setInterval(() => {
      const remainMs = pending.deadline - Date.now()
      if (remainMs > 0) {
        // 표시 갱신만 — 초 단위가 바뀔 때에만 상태를 건드린다(불필요 렌더 방지)
        const remainingSec = Math.ceil(remainMs / 1000)
        if (remainingSec !== pending.remainingSec) setPending({...pending, remainingSec})
        return
      }
      const snapshot = readSnapshotRef.current()
      if (snapshot === null) {
        // 만료했으나 불안정 — 안정 시점까지 대기(1회만 상태 전환)
        if (!pending.waitingForStable) {
          setPending({...pending, remainingSec: 0, waitingForStable: true})
        }
        return
      }
      setPending(null)
      onCaptureRef.current(snapshot)
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [pending])

  const start = (key: RecordDelayKey): void => {
    const option = RECORD_DELAY_OPTIONS.find(candidate => candidate.key === key)
    if (option === undefined) return
    if (option.delayMs === 0) {
      // 즉시 — 카운트다운 없이 탭 시점 스냅샷 고정(기존 [기록]과 동일 동작)
      const snapshot = readSnapshotRef.current()
      if (snapshot !== null) onCaptureRef.current(snapshot)
      return
    }
    setPending({
      deadline: Date.now() + option.delayMs,
      label: option.label,
      remainingSec: Math.ceil(option.delayMs / 1000),
      waitingForStable: false,
    })
  }

  const cancel = (): void => setPending(null)

  return {
    pending:
      pending === null
        ? null
        : {
            label: pending.label,
            remainingSec: pending.remainingSec,
            waitingForStable: pending.waitingForStable,
          },
    start,
    cancel,
  }
}
