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

/**
 * weak-signal 세부 사유 (R27) — 표시 계층이 사용자 안내를 분기하는 데 쓴다.
 * 'too-quiet': 입력이 근접 게이트 미만 → "더 가까이" / 'no-pitch': 레벨은 충분하나 명확한 피치 없음(잡음·간섭).
 */
export type WeakReason = 'too-quiet' | 'no-pitch'

/**
 * R53 진단 — 프레임이 기각된 게이트 식별자 (분석 순서대로):
 * 'rms' 무음·근접 하한 미달 / 'no-dip' pYIN 후보 0건 / 'no-winner' comb 승자 없음 /
 * 'voicing' voicing 확률 임계 미달 / 'snr' 고조파 SNR 임계 미달 / 'harmonics' 검출 고조파 수 부족.
 * 신뢰 게이트(voicing·snr·harmonics)는 동시 기각이 가능해 배열로 전부 담는다.
 */
export type GateReject = 'rms' | 'no-dip' | 'no-winner' | 'voicing' | 'snr' | 'harmonics'

/**
 * R53 진단 계측 — 실기기에서 "어느 게이트가 measuring을 끊는가"를 판정하기 위한 프레임 지표.
 * 표시·기록·안정 판정 등 제품 로직은 이 필드를 소비하지 않는다(진단 오버레이 전용 계약).
 */
export interface EstimateDebug {
  rms: number
  snrDb: number
  voicedProb: number
  /** 게이트 계측 기준 검출 고조파 수 */
  harmonicCount: number
  /** 이 프레임을 기각시킨 게이트들 — 통과 프레임이면 빈 배열 */
  rejects: readonly GateReject[]
  /**
   * 게이트가 실제로 평가한 f0 (comb 승자 → 옥타브 교정 → VP 정밀 추정 후) — 기각 프레임에서도
   * 채워진다. 기각 시 snr이 크게 음수인데 evalF0가 추적값에서 벗어나 있으면 "후보 미끄러짐",
   * evalF0가 정답 부근인데도 음수면 "실제 스펙트럼 요동"으로 판별한다 (R53 핵심 계측).
   * rms·no-dip 단계 기각은 평가 자체가 없어 null.
   */
  evalF0: number | null
}

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
  /** weak-signal 시 세부 사유 (R27) — measuring/stable이면 미설정. UI 안내 분기용(수치 계약과 무관). */
  weakReason?: WeakReason
  /** R53 진단 계측 — 항상 채워진다(값 미소비 시 무해). 제품 로직 소비 금지, 오버레이 전용. */
  debug?: EstimateDebug
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
  /** R53 진단: 기각 게이트 식별자들 — gatePassed=true면 빈 배열 */
  rejects: readonly GateReject[]
  /** R53 진단: 게이트가 평가한 f0 — 신뢰 게이트 기각 프레임에서도 채워진다 (rms·no-dip은 null) */
  evalF0: number | null
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
}

/**
 * R57 검출 모드 (사용자 확정: "그냥 파노튜너처럼").
 * - 'tuner'(기본): pYIN 지배 주기 — 임계 이하 dip 최단 lag(=salience 1위)를 그대로 채택.
 *   시간영역 주기성은 스펙트럼 기본파 라인이 약해도 강하므로(300대 모터), comb 채점이
 *   만들던 ÷3 미끄러짐·저파노 기각이 원천적으로 없다. 검증은 rms(무음·근접)·voicing만.
 * - 'comb': 스펙트럼 comb 채점 + 엄격 게이트 + 소리원 그룹 선택 (v2 §1 원안) —
 *   합성 fixture의 comb 능력 회귀 검증·실기기 A/B(?pitchMode=comb) 용도로 보존.
 */
export type PitchMode = 'tuner' | 'comb'

/** 엔진 파라미터 — 전부 주입 가능 (REQ-F-010/011 hook: 캘리브레이션·10ms hop은 이 객체로 흡수) */
export interface EngineTuning {
  /** R57 검출 모드 — 기본 'tuner' (파노튜너 방식) */
  pitchMode: PitchMode
  /**
   * R57 tuner 모드 YIN 절대 임계 — 대역 내 CMNDF dip 깊이가 이 이하인 것 중 최단 lag
   * (최고 주파수)를 채택한다(비정수배 반증 가드 포함 — pyin.ts). 튜너 구현 관행 0.1~0.3
   * (aubio 기본 0.3). 낮출수록 더 명료한 주기만 인정(기각↑), 높일수록 잡음 주기까지
   * 인정(오검출↑). 0.2 근거: 짧은 lag은 CMNDF 누적 정규화의 초반 결손으로 depth가 부풀어
   * (582 모터 + 실존 291 성분 → 582 depth ≈0.17), 0.12로는 실기기 기본파가 기각된다.
   */
  yinThreshold: number
  /** 분석 프레임 길이 (s) — v2 §1: 200 ms */
  frameSeconds: number
  /** hop (s) — v2 §1: 25 ms (10 ms는 고급 옵션, REQ-F-011) */
  hopSeconds: number
  /** 데시메이션 목표 샘플레이트 (Hz) — v2 §1: 12 kHz */
  targetDecimatedRate: number
  /** f0 탐색 대역 (Hz) — 기본파 기준 170~620 (표시 대역 F0_RANGE와 별개) */
  fMin: number
  fMax: number
  /**
   * pYIN 후보 제수 — 검출 dip을 이 값들로 나눠 후보를 확장한다(정류 고조파가 기본파보다 클 때
   * 하위 f0를 후보에 넣기 위함). 기본 [1,3,6].
   */
  pitchDivisors: readonly number[]
  /**
   * R56 소리원 그룹 선택 게이트 (v2.x 옥타브 승격 → R56 일반화, 사용자 확정 규칙).
   * true(기본): 게이트 통과 후보를 정수배 관계로 묶고, 가장 크게 들리는 그룹 안에서
   * 실증거 기반 최고 f₀를 채택한다 — ÷2(583→291)·÷3(546→182) 미끄러짐의 일반 해법.
   * false: comb 순위 첫 통과 후보 유지 — 엄격 하위 옥타브 고정 검증(fixture ⑧) 레거시 모드.
   */
  octaveCorrection: boolean
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
  /**
   * R54 추적 유지 게이트 — 전 후보가 엄격 게이트를 기각당해도, **추적 중인 f0 부근** 후보는
   * 완화 임계로 승인해 track을 잇는다. 신규 획득(acquisition)은 여전히 엄격 게이트만 통과
   * 가능하므로 "틀린 값 통과" 위험이 낮다 — 완화는 이미 검증된 추적의 연속성 증거에만 적용.
   */
  /** 추적 유지 게이트 SNR 임계 (dB) — 엄격(gateSnrDb=8)보다 낮다 */
  continueSnrDb: number
  /** 추적 유지 게이트 최소 검출 고조파 수 */
  continueMinHarmonics: number
  /** 추적 f0 대비 허용 편차 비율 — 이 밖의 후보(÷3 등)는 완화 대상이 아니다 */
  continueTolRatio: number
  /** 안정 판정 창 (s) — v2 §1: 1.5 */
  stabilitySeconds: number
  /** 안정 판정 변동계수 임계 — v2 §1: 1.5% */
  stabilityCv: number
  /**
   * R67 잡음 하 획득 fallback — YIN(시간영역)이 잡음으로 무성일 때, **획득 단계(추적 없음)에
   * 한해** EMA 평균 스펙트럼(Welch 등가)의 comb 채점 + 엄격 스펙트럼 게이트(gateSnrDb·
   * gateMinHarmonics, voicing 비요구) + R56 그룹 선택 + 연속 합의로 획득한다.
   * 추적·값 갱신 경로는 건드리지 않는다(획득 전용). false = R57 원 동작(A/B: ?noiseAcquisition=0).
   */
  noiseAcquisition: boolean
}

export interface EngineOptions extends Partial<EngineTuning> {
  /** 실제 캡처 샘플레이트 (Hz) — 48 kHz 가정 금지 (v2 §2) */
  sampleRate: number
}

export interface ResolvedEngineOptions extends EngineTuning {
  sampleRate: number
}

export const DEFAULT_TUNING: EngineTuning = {
  pitchMode: 'tuner',
  yinThreshold: 0.2,
  frameSeconds: 0.2,
  hopSeconds: 0.025,
  targetDecimatedRate: 12000,
  // f₀ 탐색 대역 = **측정 가능한 RPM 범위**다 (rpm = f₀ × 60).
  // v2.x(사용자 실측): 울트라대시(최고 RPM)의 기본파가 628Hz(37,680rpm)인데 상한 620Hz 밖이라
  // 후보가 되지 못하고 ÷3인 214Hz가 선택됐다. 그 기준으로는 1884·2514·3140·3770이 전부 잡음이
  // 되어 SNR −16.4까지 무너지며 측정 불가. → 상한을 800Hz(48,000rpm)로 올려 고RPM 모터를 덮는다.
  // 상한 800의 안전성: 6배 배음 4,800Hz < 나이키스트 여유(0.47×12kHz = 5,640Hz)라 배음 계측·
  // 게이트 대역이 그대로 유효하다. 옥타브 상향 오판은 여전히 이 상한이 막는다
  // (예: 기본파 514 모터의 2배 1028은 대역 밖).
  fMin: 170,
  fMax: 800,
  pitchDivisors: [1, 3, 6],
  octaveCorrection: true,
  /**
   * comb 채점 고조파 — v2 §1 원안 1·3·6에 **2를 추가** (R54, 실기기 rejF0 진단 확정).
   * 원안은 3극 정류 물리(3·6배 지배) 가정이었으나, 실측 스펙트럼(514 모터: 514·1028·1542·
   * 2056·3085 = 1·2·3·4·6배)은 **2배음이 항상 강하다**. 1·3·6만 채점하면 2배음(2f₀)이 있는
   * 프레임에서 진짜 f₀는 2f₀를 점수에 못 넣는데 ÷3 후보는 같은 피크를 6배(k6)로 흡수해
   * **÷3이 comb 1위를 빼앗는다** — 546Hz 모터가 기각 프레임 100%에서 182Hz(=546/3)를
   * 평가하던 실기기 증상의 직접 원인. k2(가중 1)를 채점하면 진짜 f₀가 2f₀를 정가중으로
   * 흡수해 역전이 사라지고, 게이트 검출 고조파 수(≥2)도 1·2배만으로 충족된다.
   */
  scoredHarmonics: [1, 2, 3, 6],
  harmonicWeights: [1, 1, 1, 0.7],
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
   * 신뢰 게이트 SNR 임계 (dB) — 8. 낮추지 말 것.
   * v2.x 실험에서 4로 낮췄더니 **틀린 후보(÷3)까지 통과해 엉뚱한 값이 표시**됐다
   * (engine.real-motors 회귀 테스트가 포착). 이 SNR이 낮다는 건 임계가 빡빡한 게 아니라
   * **평가 중인 후보가 틀렸다**는 신호다 — 올바른 f₀라면 고조파 대역이 상위 피크를 모두
   * 담아 SNR이 높다. 따라서 해결은 임계 완화가 아니라 후보 교정(octaveCorrection)이다.
   */
  gateSnrDb: 8,
  gateStrongSnrDb: 15,
  gateMinHarmonics: 2,
  // R27(실측): 0.15→0.08 — 잡음 하 인식률↑(합성 2dB에서 0→회복). SNR·고조파 게이트는 그대로라
  // 순수잡음은 계속 거부됨(오검출 0 실측). voicing만 완화하므로 "틀린 값 통과" 위험 낮음.
  gateVoicingThreshold: 0.08,
  silenceRms: 1e-5,
  // v2.29(사용자: 너무 가까이 대야만 검출됨) — 근접 게이트를 0.008→0.004로 완화.
  // RMS는 거리에 반비례(음압 ∝ 1/거리)라 하한 절반 ≈ 검출 거리 2배.
  // R27(실측): 0.004→0.003 — 더 먼/조용한 모터를 회수.
  // R58(실측): 0.003→0.0005 — 사용자가 편한 측정 거리에서 rms 0.0008 실측. 튜너 모드에서는
  // 잡음 오검출 방어를 YIN 임계(주기성 검증)가 대신하므로, 이 하한의 남은 역할은
  // 무음 차단 + "가장 크게 들리는(가까운) 모터 우선"의 최소 바닥뿐이다. 근접 미달은
  // weakReason 'too-quiet'로 고지.
  proximityRms: 0.0005,

  viterbiLag: 5,
  driftCostWeight: 4,
  jumpCostThresholdOctaves: 0.35,
  jumpPenalty: 2.5,
  harmonicJumpExtraPenalty: 1.5,
  // v2.x(사용자: 깜빡임) 4→8(≈200ms) → R32(여전히 깜빡임) 8→20(≈500ms) — comb 시절 게이트가
  // 수백 ms씩 깜빡여(pass 12~45%) 길게 잡았던 값이다.
  // R58(사용자: 끊겼을 때 이전 값이 너무 오래 남음) — 20→8(≈200ms) 회귀. 튜너 모드(R57)는
  // 검출이 연속적이라 긴 coast가 필요 없고, 모터를 끄면 화면이 빨리 꺼지는 쪽이 맞다.
  // coast 보고값은 Kalman 예측(kf) — 정지 측정 전제.
  missTolerance: 8,
  // R54 추적 유지 게이트(실기기: 3·6배음이 수백 ms 단위로 사라져 pass 12~45%에 그침) —
  // 추적 중 f0 ±12% 후보는 SNR 4dB·고조파 1개면 잇는다. ÷3(1.58옥타브 밖)은 대상 아님.
  continueSnrDb: 4,
  continueMinHarmonics: 1,
  continueTolRatio: 0.12,
  stabilitySeconds: 1.5,
  stabilityCv: 0.015,
  // R67(사용자: 시끄러운 환경에서 파노 미표시) — YIN 사각지대(광대역 SNR ≈6~9dB: 모터는
  // 들리는데 CMNDF dip이 잡음에 희석돼 무성)에서 스펙트럼 증거로 획득한다. 판정 임계는
  // 기존 엄격 게이트 수치를 그대로 쓴다(완화 아님) — analyze-frame.ts R67 주석 참조.
  noiseAcquisition: true,
}

export function resolveEngineOptions(options: EngineOptions): ResolvedEngineOptions {
  if (!Number.isFinite(options.sampleRate) || options.sampleRate <= 0) {
    throw new RangeError(`sampleRate must be a positive finite number: ${options.sampleRate}`)
  }
  return {...DEFAULT_TUNING, ...options}
}
