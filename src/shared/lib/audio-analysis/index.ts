// 공개 API — 분석 엔진 파이프라인 v2 (F1).
// 계층 인터페이스 (v2 §5): estimateFrame(pcm) → candidates / refine(candidate) → f0 /
// track(estimates) → display. 스트리밍 소비자는 createAnalysisEngine 하나로 충분하다.

export {createAnalysisEngine} from './engine'
export type {AnalysisEngine} from './engine'
export {createFrameAnalyzer} from './analyze-frame'
export type {FrameAnalyzer} from './analyze-frame'
export {estimateFrame} from './pyin'
export type {EstimateFrameOptions} from './pyin'
export {projectHarmonics, refine} from './refine'
export type {RefineOptions} from './refine'
export {createTracker, track} from './track'
export type {Tracker} from './track'
export {createPreprocessor} from './preprocess'
export type {Preprocessor} from './preprocess'
export {
  checkHarmonicConsistency,
  computeGateMetrics,
  measureHarmonics,
  scoreCandidates,
} from './harmonics'
export type {CombOptions, GateMetrics} from './harmonics'
export {DEFAULT_TUNING, resolveEngineOptions} from './types'
export type {
  DisplayEstimate,
  EngineOptions,
  EngineStatus,
  EngineTuning,
  FrameAnalysis,
  FrameCandidate,
  HarmonicMeasurement,
  MeasureStatus,
  RefineResult,
  ResolvedEngineOptions,
  ScoredCandidate,
  TrackCandidate,
} from './types'
export type {EngineWorkerRequest, EngineWorkerResponse} from './protocol'
