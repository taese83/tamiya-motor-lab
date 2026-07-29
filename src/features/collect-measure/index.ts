// collect-measure slice public API (M-5/M-6 — S1 [기록] → 모터 선택 팝업 수집 플로우)
// [기록] 버튼 자체는 MeasureActionDock 단일 슬롯이 렌더 — RecordButton은 중복으로 제거(v2.1)
export {MotorPickSheet} from './ui/MotorPickSheet'
export type {MotorPickItem, MotorPickSheetProps} from './ui/MotorPickSheet'
export {useCollectFlow} from './model/use-collect-flow'
export type {CollectFlowApi, CollectSnapshot} from './model/use-collect-flow'
// v2.7 기록 3종(즉시·10초 후·1분 후)의 타이밍 게이트 — 수집 경로 자체는 위 훅을 그대로 쓴다
export {useDelayedCapture} from './model/use-delayed-capture'
export type {
  DelayedCaptureApi,
  DelayedCapturePending,
  UseDelayedCaptureInput,
} from './model/use-delayed-capture'
