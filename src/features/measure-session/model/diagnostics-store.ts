import {create} from 'zustand'

import type {EngineDiagnostics} from '@shared/lib/audio-analysis'

// 게이트 진단 계측 store (v2.x 임시 — 사용자: "측정됐다 안 됐다 반복, 원인 확인 필요").
//
// MeasureView(판별 union)에 넣지 않는 이유: 진단은 **판정에 관여하지 않는 표시 전용** 값이라
// UI 계약(union)에 섞으면 모든 소비처가 불필요한 필드를 다루게 된다. 별도 store로 분리해
// 원인 파악이 끝나면 이 파일과 표시 1곳만 지우면 된다(제거 지점 최소화).
//
// 게이트 판정 기준(엔진 DEFAULT_TUNING)과 대조해 읽는다:
//   rms   < proximityRms(0.004)      → 근접 게이트: 소리가 작다(폰이 멀다)
//   snrDb < gateSnrDb(8)             → 잡음 대비 신호 부족
//   voicedProb < gateVoicing(0.15)   → 주기성 부족(피치가 안 잡힘)
//   detectedHarmonics < 1            → 고조파 미검출

interface DiagnosticsState {
  latest: EngineDiagnostics | null
}

const useDiagnosticsStore = create<DiagnosticsState>()(() => ({latest: null}))

/** 세션이 프레임마다 기록 — 렌더 유발을 줄이려 값이 실제로 바뀔 때만 set */
export function setEngineDiagnostics(next: EngineDiagnostics): void {
  useDiagnosticsStore.setState({latest: next})
}

export function clearEngineDiagnostics(): void {
  useDiagnosticsStore.setState({latest: null})
}

export function useEngineDiagnostics(): EngineDiagnostics | null {
  return useDiagnosticsStore(state => state.latest)
}
