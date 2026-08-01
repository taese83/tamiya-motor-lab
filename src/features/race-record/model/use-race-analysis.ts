import {useEffect, useRef, useState} from 'react'

import {analyzeRace, buildAnalyzeRacePayload} from '../api'

import type {AnalyzeUnavailableReason, RaceAnalysis} from '../api'
import type {RaceInsight, RaceRecord} from '@entities/race-record'

// 레이스 AI 분석 상태기계 훅 (R25 U6 — component-spec race-ai §3, form-state-builder 소유).
// 페이지가 파생값(races·insight)을 analyze 입력으로 주입하고, 이 훅은 요청 수명주기만
// 소유한다 — payload 조립은 U2 buildAnalyzeRacePayload, 결과 계약은 U1 analyzeRace.
//
// ⚠️ 비영속(D3 미채택 기본값): useState만 — react-query·storage·모듈 캐시 금지.
//   재마운트하면 idle로 시작한다(분석은 요청 시에만 생성·응답은 저장하지 않는 신뢰 경계).
// 상태기계(§3): idle→loading→success|error.
//   success→analyze→refreshing(성공 시 data 교체 + expanded 접힘 복귀).
//   error→analyze→retrying. cancel→ loading이면 idle, refreshing·retrying이면 플래그만
//   해제(기존 표시 유지). 자동 재시도 없음 — 1탭=1요청(REQ-RAI-005).

export type RaceAnalysisState =
  | {phase: 'idle'}
  | {phase: 'loading'}
  | {phase: 'success'; data: RaceAnalysis; refreshing: boolean}
  | {phase: 'error'; reason: AnalyzeUnavailableReason; retrying: boolean}

/** analyze 입력 — 페이지가 매 호출 시점의 최신 파생값으로 전달(retry 최신성 보장, §3) */
export interface RaceAnalysisInput {
  races: ReadonlyArray<RaceRecord>
  insight: RaceInsight
}

export interface RaceAnalysisController {
  state: RaceAnalysisState
  /** 응답 카드 펼침 — 새 success마다 false(접힘 기본, §3) */
  expanded: boolean
  toggleExpanded: () => void
  /** loading || refreshing || retrying — 진입점 "분석 중…"·[취소] 표시용 */
  pending: boolean
  /** single-flight — pending 중 재호출은 no-op(동기 가드) */
  analyze: (input: RaceAnalysisInput) => void
  cancel: () => void
}

export function useRaceAnalysis(): RaceAnalysisController {
  const [state, setState] = useState<RaceAnalysisState>({phase: 'idle'})
  const [expanded, setExpanded] = useState(false)
  // state 반영 전 같은 tick의 중복 탭까지 차단하는 동기 가드 (use-race-entry H-4 선례)
  const inFlightRef = useRef(false)
  // 최신 요청 seq만 반영 — cancel·unmount가 증가시켜 진행 중 응답을 stale로 폐기한다
  const seqRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  // unmount cleanup — 진행 중 요청 abort + seq 무효화(unmount 후 setState 경로 차단)
  useEffect(
    () => () => {
      seqRef.current += 1
      abortRef.current?.abort()
      abortRef.current = null
      inFlightRef.current = false
    },
    [],
  )

  const analyze = (input: RaceAnalysisInput): void => {
    if (inFlightRef.current) return // single-flight — 1탭=1요청
    inFlightRef.current = true
    const seq = ++seqRef.current
    const controller = new AbortController() // analyze마다 신규 — cancel·unmount에서 abort
    abortRef.current = controller

    setState(prev => {
      if (prev.phase === 'success') return {...prev, refreshing: true} // 기존 data 표시 유지
      if (prev.phase === 'error') return {...prev, retrying: true} // 기존 error 카드 유지
      return {phase: 'loading'} // idle → 첫 요청(loading 재진입은 가드가 차단)
    })

    const payload = buildAnalyzeRacePayload(input.races, input.insight)
    void (async () => {
      const result = await analyzeRace(payload, controller.signal)
      if (seqRef.current !== seq) return // cancel·unmount로 무효화된 stale 응답 — 폐기
      inFlightRef.current = false
      abortRef.current = null
      if (result.status === 'ok') {
        // verdict ok·insufficient 모두 성공 상태(서버의 정상 판단) — 뷰 분기는 페이지 소유
        setState({phase: 'success', data: result.data, refreshing: false})
        setExpanded(false) // 새 응답은 접힘 기본(§3)
        return
      }
      // cancelled는 cancel()이 이미 동기 전이 처리 — 여기서는 상태 전이 없음(§3).
      // seq 가드가 취소분을 위에서 폐기하므로 방어 분기(도달 시에도 무전이).
      if (result.reason === 'cancelled') return
      setState({phase: 'error', reason: result.reason, retrying: false})
    })()
  }

  const cancel = (): void => {
    if (!inFlightRef.current) return // 진행 중 요청 없음 — no-op
    seqRef.current += 1 // 진행 중 응답 무효화(도착해도 stale 폐기)
    abortRef.current?.abort()
    abortRef.current = null
    inFlightRef.current = false
    setState(prev => {
      if (prev.phase === 'loading') return {phase: 'idle'} // 첫 요청 취소 — 대기 복귀
      if (prev.phase === 'success') return {...prev, refreshing: false} // 기존 표시 유지
      if (prev.phase === 'error') return {...prev, retrying: false} // 기존 표시 유지
      return prev
    })
  }

  const pending =
    state.phase === 'loading' ||
    (state.phase === 'success' && state.refreshing) ||
    (state.phase === 'error' && state.retrying)

  return {
    state,
    expanded,
    toggleExpanded: () => setExpanded(prev => !prev),
    pending,
    analyze,
    cancel,
  }
}
