// 분석 엔진 산출 타입 (analysis-algorithm v2 §1·§5·§7 / feature-plan §3)
// AD-12: 이 디렉터리는 zero-dependency 순수 TS — 상대 경로 외 import 금지.

// status 6종의 canonical 타입. 엔진(track)은 이 중 EngineStatus 3종만 산출하고,
// idle/no-permission/suspended는 측정 세션 상태 머신(F2)이 소유한다 (feature-plan §0 분리 계약).
export type MeasureStatus =
  | 'idle'
  | 'measuring'
  | 'stable'
  | 'weak-signal'
  | 'no-permission'
  | 'suspended'

export type EngineStatus = Extract<MeasureStatus, 'measuring' | 'stable' | 'weak-signal'>

/** pYIN 후보 (estimateFrame 출력) — f0는 [fMin, fMax] 대역 내, ÷3·÷6 확장 반영 후 */
export interface FrameCandidate {
  f0: number
  /** pYIN 임계 분포 집계 확률 (0~1) — comb 점수 산출 전의 잠정 salience */
  salience: number
  /** 프레임 voicing 확률 (0~1) — 후보 공통 */
  voicedProb: number
}

/**
 * 출력 계약 (v2 §7). weak-signal이면 f0/rpm은 반드시 null — 수치 미표시를 타입으로 강제(REQ-ST-003).
 * 필드명은 v2 canonical `f0` 유지 — Measurement.panoHz 매핑은 F2가 stable 확정 시 수행 (api-schema NR-1).
 */
/**
 * 게이트 진단 계측 (v2.x — 사용자: "측정됐다 안 됐다 반복, 원인 확인 필요").
 * 게이트가 **어느 조건에서** 떨어지는지 화면에서 바로 보기 위한 값. 판정에 관여하지 않는다.
 * 프레임마다 항상 채워진다(게이트 실패·무음 포함) — 실패 원인을 보려는 목적이므로.
 */
export interface EngineDiagnostics {
  /** 입력 음량 — proximityRms(근접 게이트) 미만이면 분석 자체를 생략한다 */
  rms: number
  /** 고조파 대역 SNR(dB) — gateSnrDb(8) 미만이면 게이트 실패 */
  snrDb: number
  /** pYIN voicing 확률 — gateVoicingThreshold(0.15) 미만이면 게이트 실패 */
  voicedProb: number
  /** 검출된 고조파 개수 — gateMinHarmonics 미만이면 게이트 실패 */
  detectedHarmonics: number
  /** 게이트 통과 여부 — false면 수치 미표시(weak-signal) */
  gatePassed: boolean
  /**
   * 게이트가 평가한 후보 f₀ — 차단된 프레임에서도 채운다.
   * 후보가 진짜 기본파(예: 591)인지 그 1/3(197)인지 구분하는 결정적 값이다:
   * 후보가 옳은데 차단되면 임계 문제, 후보가 틀렸으면 채점 문제.
   */
  candidateF0: number | null
  /**
   * 스펙트럼 상위 피크 (주파수 오름차순, 최대 5개) — 실제 배음 구조를 눈으로 확인하기 위한 값.
   * 특정 모터에서만 절반으로 잠기는 원인(진짜 기본파가 어디인지)을 이걸로 판별한다.
   */
  topPeaks: readonly {readonly freq: number; readonly snrDb: number}[]
}

export interface DisplayEstimate {
  f0: number | null
  rpm: number | null
  confidence: number
  status: EngineStatus
  /**
   * 회전 안정도 — 최근 1.5s 창의 f₀ 변동계수(CV, 0~). 창 미충족·weak-signal이면 null.
   * v2.x 컨디션 지표(사용자 승인): 브러시·정류자·베어링 마모 시 공회전 요동이 커진다 —
   * 같은 모터의 시간에 따른 상대 비교 전용(절대 진단 아님). ±rpm 환산·등급화는 표시 계층 소관.
   */
  stabilityCv: number | null
  /**
   * 순간 편차 — 현재 프레임 f₀(kf)가 창 중앙값에서 벗어난 **부호 있는 상대량**((kf−median)/median).
   * stabilityCv(1.5s 평균)와 달리 매 프레임 값이 바뀌므로, 표시 계층이 게이지 바늘을 실시간으로
   * "떨리게" 하는 데 쓴다(사용자 req). 창 미충족·weak-signal이면 null. 기록·등급은 이 값을 쓰지
   * 않는다(바늘 시각 효과 전용 — 기록값에 딜레이·잡음을 더하지 않기 위함).
   */
  microVariation: number | null
  /** 게이트 진단 (v2.x 임시 계측) — 표시 전용, 판정 비관여 */
  diagnostics: EngineDiagnostics
}

/** 고조파별 스펙트럼 계측 (comb 점수·일치도 검사 입력) */
export interface HarmonicMeasurement {
  k: number
  /** 국소 노이즈 플로어 대비 피크 SNR (dB, 0~40 클램프) */
  snrDb: number
  /** 보간된 국소 피크 주파수 (Hz) — 피크 미검출이면 null */
  peakFreq: number | null
  peakPower: number
}

/** comb 점수가 매겨진 후보 */
export interface ScoredCandidate {
  f0: number
  combScore: number
  harmonics: HarmonicMeasurement[]
  voicedProb: number
  salience: number
}

/** variable projection 정밀 추정 결과 (refine 출력) */
export interface RefineResult {
  f0: number
  /** 사용된 고조파 차수 목록 (일치도 검사 제외 반영) */
  usedHarmonics: number[]
  /** 고조파별 포착 전력 (usedHarmonics와 정렬) */
  harmonicPowers: number[]
  /** 포착 전력 합 — 신뢰 게이트 보조 지표 */
  capturedPower: number
}

/** Viterbi 격자 노드 — 프레임당 후보 (analyzeFrame 출력) */
export interface TrackCandidate {
  f0: number
  /** 정규화 전 emission 점수 (comb 점수 기반, 클수록 우세) */
  score: number
}

/** 프레임 단위 전체 분석 결과 — track()의 입력 단위 */
export interface FrameAnalysis {
  /** 신뢰 게이트 통과 여부 — false면 candidates는 비어 있고 수치가 표시되면 안 된다 */
  gatePassed: boolean
  /** 게이트 통과 시 VP 정밀 추정 f0 (Hz), 아니면 null */
  f0: number | null
  candidates: TrackCandidate[]
  voicedProb: number
  /** 고조파 대역 합산 전력 vs 잔여 대역 전력 (dB) */
  snrDb: number
  /** 검출된 고조파 차수 (scoredHarmonics 부분집합, 대역 전력 기준) */
  detectedHarmonics: number[]
  /** 일치도 검사 후 VP에 실제 사용된 고조파 차수 */
  usedHarmonics: number[]
  rms: number
  /** 스펙트럼 상위 피크 (진단 전용 — 판정 비관여). 무음·근접 미달 프레임은 빈 배열 */
  topPeaks: readonly {readonly freq: number; readonly snrDb: number}[]
  /** 게이트가 평가한 후보 f₀ (차단돼도 채움) — 후보 선정 오류 vs 임계 문제 구분용 */
  candidateF0: number | null
}

/** 엔진 파라미터 — 전부 주입 가능 (REQ-F-010/011 hook: 캘리브레이션·10ms hop은 이 객체로 흡수) */
export interface EngineTuning {
  /** 분석 프레임 길이 (s) — v2 §1: 200 ms */
  frameSeconds: number
  /** hop (s) — v2 §1: 25 ms (10 ms는 고급 옵션, REQ-F-011) */
  hopSeconds: number
  /** 데시메이션 목표 샘플레이트 (Hz) — v2 §1: 12 kHz */
  targetDecimatedRate: number
  /** f0 탐색 대역 (Hz) — v2.x(사용자): 지배 피치 기준 100~700 (60Hz 험 회피 하한, 42k rpm 상한) */
  fMin: number
  fMax: number
  /**
   * pYIN 후보 하위-복원 제수 (v2.x 신설). 검출 dip을 이 값들로 나눠 후보를 확장한다.
   * v2 초기 설계는 [1,3,6](정류 고조파가 기본파보다 클 때 하위 f0 복원)이었으나, 실측 결과
   * 지배 피치(파노튜너 기준)를 하위로 과하게 끌어내리는 부작용이 있어 **기본을 [1]로**
   * (하위-복원 끔 = 검출된 지배 피치를 그대로 보고). 옵션이라 [1,3,6]로 되돌릴 수 있다.
   */
  pitchDivisors: readonly number[]
  /** comb 점수·검출 대상 고조파 차수 — v2 §1: 1·3·6 */
  scoredHarmonics: readonly number[]
  /** scoredHarmonics와 정렬된 가중치 (물리 기반 고정값 baseline) */
  harmonicWeights: readonly number[]
  /** pYIN 후보 상한 — v2 §1: 상위 3~5 */
  maxCandidates: number
  /** 비고조파 스펙트럼 피크 페널티 가중 (comb 점수) */
  nonHarmonicPenaltyWeight: number
  /** 가정 f₀보다 낮은 유의 피크 가중치 (하위 고조파 veto) */
  subHarmonicPenaltyWeight: number
  /**
   * 고조파 일치도 허용 편차 — |peak_k − k·f0| ≤ ratio·f0 (기본 주파수 영역 절대 오차).
   * v2 §1 "±0.5%"의 정합 해석: 1805 Hz 오염(6f0=1800 대비 5 Hz)을 제외 가능해야 한다 (§3 fixture).
   */
  consistencyTolRatio: number
  /** 신뢰 게이트: 고조파 SNR 임계 (dB) — v2 §1: 8 */
  gateSnrDb: number
  /** 단일 고조파만 검출된 경우(순음)의 강한 SNR 임계 (dB) — §3 순음 fixture 정합용 */
  gateStrongSnrDb: number
  /** 신뢰 게이트: 최소 검출 고조파 수 — v2 §1: 2 */
  gateMinHarmonics: number
  /** 신뢰 게이트: pYIN voicing 확률 임계 */
  gateVoicingThreshold: number
  /** 무음 판정 RMS 임계 */
  silenceRms: number
  /**
   * 근접 필터 RMS 임계 (v2.1 실기기 피드백) — 이 값 미만이면 분석 생략(weak-signal).
   * 폰을 가까이 댄 모터는 원거리 모터보다 수십 배 큰 진폭으로 들어오므로,
   * 절대 음량 하한이 "측정 대상 = 가까운 모터 하나"를 강제한다. 여러 모터가 하한을
   * 함께 넘으면 고조파 에너지 최강(=가장 크게 들리는) 후보를 채택한다(comb 채점 순위).
   * 실기기 튜닝 대상 — 합성 fixture(진폭 ≥0.4 RMS)에는 영향 없는 값이어야 한다.
   */
  proximityRms: number
  /** fixed-lag Viterbi 지연 (프레임 수) — v2 §1: 5 */
  viterbiLag: number
  /** 연속 드리프트 전이 비용 가중 (옥타브당) */
  driftCostWeight: number
  /** 이 이상 |log2 비율|이면 점프로 간주 (옥타브) */
  jumpCostThresholdOctaves: number
  /** 점프 전이 고정 페널티 */
  jumpPenalty: number
  /** 옥타브/고조파(×2·×3·×6) 점프 추가 페널티 — v2 §1 */
  harmonicJumpExtraPenalty: number
  /** 게이트 실패 연속 허용 프레임 수 — 초과 시 weak-signal 전환 (D-9 stale 방지) */
  missTolerance: number
  /** 안정 판정 창 (s) — v2 §1: 1.5 */
  stabilitySeconds: number
  /** 안정 판정 변동계수 임계 — v2 §1: 1.5% */
  stabilityCv: number
}

export interface EngineOptions extends Partial<EngineTuning> {
  /** 실제 캡처 샘플레이트 (Hz) — 48 kHz 가정 금지 (v2 §2) */
  sampleRate: number
}

export interface ResolvedEngineOptions extends EngineTuning {
  sampleRate: number
}

export const DEFAULT_TUNING: EngineTuning = {
  frameSeconds: 0.2,
  hopSeconds: 0.025,
  targetDecimatedRate: 12000,
  // v2.x(진단 확정): 실기기 계측 결과 이 모터의 **기본주파수는 287Hz**이고 파노튜너의 570은
  // 그 2배(2차 고조파)였다. 후보를 570으로 잡으면 실제로 강한 287이 게이트 대역 밖이라 통째로
  // 잡음으로 계산돼 SNR·고조파가 미달(사용자 스크린샷: 570에서 둘 다 빨강, 287에서 전부 통과).
  // 즉 엔진이 287을 잡는 것이 정상이며, 지배 피치 채점으로의 전환은 게이트와 구조적으로 충돌한다.
  // → 287을 안정적으로 잡던 원래 설정으로 복귀한다. 튜너 표시값(570)은 표시 계층의 배수로 맞춘다.
  fMin: 170,
  fMax: 620,
  pitchDivisors: [1, 3, 6],
  scoredHarmonics: [1, 3, 6],
  harmonicWeights: [1, 1, 0.7],
  maxCandidates: 5,
  nonHarmonicPenaltyWeight: 0.5,
  /**
   * 하위 고조파 veto — 가정 f₀보다 낮은 유의 피크에 주는 감점 가중치.
   *
   * v2.x(실기기 스펙트럼 진단으로 2.5 → 0.5): 원 설계는 "회전원은 회전수보다 낮은 성분을
   * 만들지 못한다"는 전제였으나, 브러시 모터에서 이는 사실이 아니다(브러시 비대칭·불평형이
   * 회전수 이하 성분을 만든다). 실측 근거:
   *   정상 모터: 피크 514·1028·1542·2056·3085 → 514의 배수. 하위 성분 없음 → 정상 동작.
   *   실패 모터: 피크 584·1753·2337·2921·3505 → **584의 배수**(기본파 584, 튜너 570과 일치).
   *              그런데 292 부근 실제 성분 때문에 584가 2.5배 감점돼 탈락하고, 1/3인 194.7이
   *              승자가 됐다(고조파 1/2·SNR 5.5 = 194.7 기준으로 상위 피크 대부분이 잡음 처리).
   * 옥타브 상향 오판은 탐색 대역 상한(fMax)이 이미 막는다(예: 1028은 대역 밖) —
   * veto는 보조 신호로만 남기고 가중치를 낮춘다. 엄격 veto가 필요한 검증은 fixture가
   * 명시 튜닝으로 계속 커버한다(engine.fixtures ④·⑧ LEGACY 모드).
   */
  subHarmonicPenaltyWeight: 0.5,
  consistencyTolRatio: 0.005,
  /**
   * 신뢰 게이트 SNR 임계 (dB) — 8 유지.
   * v2.x 실험: 실패 모터의 게이트 SNR이 5.6이라 4로 낮춰봤으나, engine.real-motors 회귀
   * 테스트에서 **틀린 후보(÷3)까지 통과해 엉뚱한 값이 표시**되는 것이 드러나 되돌렸다.
   * 이 SNR이 낮다는 것은 임계가 빡빡한 게 아니라 **평가 중인 후보가 틀렸다**는 신호다 —
   * 올바른 f₀라면 고조파 대역이 상위 피크를 모두 담아 SNR이 높게 나온다.
   * 따라서 해결은 임계 완화가 아니라 후보 선정 교정이다(진단의 `후보 f0`로 확인).
   */
  gateSnrDb: 8,
  gateStrongSnrDb: 15,
  gateMinHarmonics: 2,
  gateVoicingThreshold: 0.15,
  silenceRms: 1e-5,
  // v2.29(사용자: 너무 가까이 대야만 검출됨) — 근접 게이트를 0.008→0.004로 완화.
  // RMS는 거리에 반비례(음압 ∝ 1/거리)라 하한 절반 ≈ 검출 거리 2배. 원거리 잡음 <0.005와
  // 근접하므로 먼 모터를 간헐 포착할 수 있으나, comb 채점이 최강(=가장 크게 들리는) 후보를
  // 채택하므로 가까운 모터가 우선된다. 실기기 튜닝 대상 — 더 넓히려면 0.003/0.002로.
  proximityRms: 0.004,

  viterbiLag: 5,
  driftCostWeight: 4,
  jumpCostThresholdOctaves: 0.35,
  jumpPenalty: 2.5,
  harmonicJumpExtraPenalty: 1.5,
  // v2.x(사용자: 깜빡임) — 게이트 결손 coast 허용을 4→8 프레임(≈200ms)으로 늘려 표시 깜빡임을 줄인다
  missTolerance: 8,
  stabilitySeconds: 1.5,
  stabilityCv: 0.015,
}

export function resolveEngineOptions(options: EngineOptions): ResolvedEngineOptions {
  if (!Number.isFinite(options.sampleRate) || options.sampleRate <= 0) {
    throw new RangeError(`sampleRate must be a positive finite number: ${options.sampleRate}`)
  }
  return {...DEFAULT_TUNING, ...options}
}
