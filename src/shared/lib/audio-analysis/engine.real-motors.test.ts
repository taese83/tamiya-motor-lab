import {describe, expect, test} from 'vitest'

import {FIXTURE_SAMPLE_RATE, toneSet} from './__fixtures__/synth'
import {createAnalysisEngine} from './engine'

import type {DisplayEstimate} from './types'

// 실기기 스펙트럼 회귀 테스트 (v2.x) — 사용자 실측 진단 화면의 피크 목록을 그대로 재현한다.
// 이 두 케이스가 이 엔진의 계약이다: **기본파를 고르고, 그 1/2·1/3로 내려가지 않는다.**
//
// 정상 모터: 피크 514·1028·1542·2056·3085 (514의 1·2·3·4·6배). 앱 표시 517.5 — 정상.
// 실패 모터: 피크 584·1753·2337·2921·3505 (584의 1·3·4·5·6배) + 292 부근 하위 성분.
//   → 하위 고조파 veto(2.5)가 진짜 기본파 584를 감점시켜 1/3인 194.7이 승자가 되던 버그.
//   veto 가중치를 0.5로 낮춰 584를 되찾는다(이 테스트가 그 회귀를 막는다).

const SECONDS = 2.5
/** 과도 구간 제외 — 필터·추적 수렴 후 */
const SETTLE_SEC = 1.0

function runToSettled(pcm: Float32Array): DisplayEstimate[] {
  const engine = createAnalysisEngine({sampleRate: FIXTURE_SAMPLE_RATE})
  const out: DisplayEstimate[] = []
  let produced = 0
  const chunk = 1024
  for (let offset = 0; offset < pcm.length; offset += chunk) {
    for (const est of engine.process(pcm.subarray(offset, Math.min(offset + chunk, pcm.length)))) {
      const endSec = (engine.frameLength + produced * engine.hopLength) / engine.decimatedRate
      if (endSec >= SETTLE_SEC) out.push(est)
      produced += 1
    }
  }
  return out
}

/** 정착 구간에서 수치가 나온 추정들의 f0 (weak-signal 제외) */
function settledF0s(estimates: readonly DisplayEstimate[]): number[] {
  return estimates.flatMap(e => (e.f0 === null ? [] : [e.f0]))
}

describe('실측 재현 ① 정상 모터 (기본파 514 — 2배가 가장 강함)', () => {
  // 1028(2f)이 기본파보다 강하지만, 대역 상한(fMax 620) 밖이라 옥타브 상향은 구조적으로 불가.
  const pcm = toneSet(
    [
      {freqHz: 514, amplitude: 0.35},
      {freqHz: 1028, amplitude: 1.0, phase: 0.6},
      {freqHz: 1542, amplitude: 0.7, phase: 1.4},
      {freqHz: 2056, amplitude: 0.3, phase: 2.2},
      {freqHz: 3085, amplitude: 0.6, phase: 0.9},
    ],
    SECONDS,
  )
  const f0s = settledF0s(runToSettled(pcm))

  test('수치가 산출되고 514 Hz를 채택한다', () => {
    expect(f0s.length).toBeGreaterThan(20)
    for (const f0 of f0s) expect(Math.abs(f0 - 514)).toBeLessThan(6)
  })
})

describe('실측 재현 ② 실패 모터 (기본파 584 + 하위 성분 292) — 1/3(194.7)로 내려가지 않는다', () => {
  // 사용자 화면: 피크 584(46dB)·1753(35)·2337(22)·2921(21)·3505(38). 2f(1168)는 top5에 없어 약하게.
  // 292는 하위 고조파 veto를 유발한 실제 성분 — 이것이 있어도 584를 유지해야 한다.
  const pcm = toneSet(
    [
      {freqHz: 292, amplitude: 0.22},
      {freqHz: 584, amplitude: 1.0, phase: 0.3},
      {freqHz: 1168, amplitude: 0.12, phase: 1.1},
      {freqHz: 1753, amplitude: 0.55, phase: 2.0},
      {freqHz: 2337, amplitude: 0.2, phase: 0.7},
      {freqHz: 2921, amplitude: 0.18, phase: 1.7},
      {freqHz: 3505, amplitude: 0.6, phase: 2.6},
    ],
    SECONDS,
  )
  const f0s = settledF0s(runToSettled(pcm))

  test('게이트를 통과해 수치가 나온다 (이전에는 weak-signal로 막혔다)', () => {
    expect(f0s.length).toBeGreaterThan(20)
  })

  test('584 Hz를 채택한다 — 194.7(÷3)·292(÷2)로 내려가지 않는다', () => {
    for (const f0 of f0s) {
      expect(Math.abs(f0 - 584), `f0=${f0.toFixed(1)}`).toBeLessThan(8)
    }
  })
})

describe('실측 재현 ③ 폰을 떼었을 때 (기본파 583인데 후보가 291로 미끄러지던 케이스)', () => {
  // 사용자 화면(밀착): 후보 583Hz·SNR 14.1 → 통과, 582.6 표시.
  //           (떼었을 때): 후보 291Hz·SNR 2.7 → 차단. 같은 모터·같은 피크인데 후보만 절반.
  // 291의 배음은 582(2배)·1747(6배)·2329(8배)·3493(12배)로 **짝수 배만** 존재하고
  // 홀수 배(873·1455)가 비어 있다 — 이것이 옥타브 하향 오판의 직접 증거이자 교정 근거다.
  const pcm = toneSet(
    [
      {freqHz: 291, amplitude: 0.3}, // 오판을 유발하던 하위 성분
      {freqHz: 582, amplitude: 1.0, phase: 0.3},
      {freqHz: 1747, amplitude: 0.5, phase: 2.0},
      {freqHz: 2329, amplitude: 0.14, phase: 0.7},
      {freqHz: 2911, amplitude: 0.24, phase: 1.7},
      {freqHz: 3493, amplitude: 0.62, phase: 2.6},
    ],
    SECONDS,
  )
  const f0s = settledF0s(runToSettled(pcm))

  test('582 Hz를 채택한다 — 291(÷2)로 미끄러지지 않는다', () => {
    expect(f0s.length).toBeGreaterThan(20)
    for (const f0 of f0s) {
      expect(Math.abs(f0 - 582), `f0=${f0.toFixed(1)}`).toBeLessThan(8)
    }
  })
})
