// R53 진단 — URL 쿼리로 엔진 튜닝을 런타임 오버라이드한다 (재배포 없는 소거 실험용).
// 예: /?debug=1&gateSnrDb=0&proximityRms=0 → 해당 게이트 사실상 해제.
// EngineTuning의 숫자 키 + octaveCorrection(boolean)만 허용 — sampleRate는 세션 소유라 제외.
// 진단 전용 계약: 제품 동작은 쿼리 없는 기본 URL에서 불변이다.

import type {EngineTuning} from '@shared/lib/audio-analysis'

/** 오버라이드 허용 숫자 키 전수 — EngineTuning과 satisfies로 정합 강제 */
const TUNING_NUMBER_KEYS = [
  'frameSeconds',
  'hopSeconds',
  'targetDecimatedRate',
  'fMin',
  'fMax',
  'maxCandidates',
  'nonHarmonicPenaltyWeight',
  'subHarmonicPenaltyWeight',
  'consistencyTolRatio',
  'gateSnrDb',
  'gateStrongSnrDb',
  'gateMinHarmonics',
  'gateVoicingThreshold',
  'silenceRms',
  'proximityRms',
  'viterbiLag',
  'driftCostWeight',
  'jumpCostThresholdOctaves',
  'jumpPenalty',
  'harmonicJumpExtraPenalty',
  'missTolerance',
  'stabilitySeconds',
  'stabilityCv',
] as const satisfies readonly (keyof EngineTuning)[]

type TuningNumberKey = (typeof TUNING_NUMBER_KEYS)[number]

/** 현재 URL 쿼리에서 튜닝 오버라이드를 읽는다 — 미지·비수치 값은 무시(방어) */
export function readTuningOverrides(): Partial<EngineTuning> {
  const overrides: Partial<EngineTuning> = {}
  const search = globalThis.location?.search
  if (typeof search !== 'string' || search === '') return overrides
  const params = new URLSearchParams(search)
  for (const key of TUNING_NUMBER_KEYS) {
    const raw = params.get(key)
    if (raw === null) continue
    const value = Number(raw)
    if (Number.isFinite(value)) {
      ;(overrides as Record<TuningNumberKey, number>)[key] = value
    }
  }
  const octave = params.get('octaveCorrection')
  if (octave !== null) {
    overrides.octaveCorrection = octave !== '0' && octave !== 'false'
  }
  return overrides
}

/** 오버레이 표기용 — "key=value" 나열 (없으면 빈 배열) */
export function describeTuningOverrides(): string[] {
  return Object.entries(readTuningOverrides()).map(([key, value]) => `${key}=${String(value)}`)
}
