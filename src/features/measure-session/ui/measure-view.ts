// MeasureView v2 — S1 UI 계약 discriminated union (component-spec v2 §2.1 / state-contract v2 M-1~3).
// 필드명은 api-schema NR-1 표준(panoHz). confidence는 view에 포함하지 않는다(UI 비노출 확정).
//
// v1 대비:
// - `idle`(수동 시작)·`stable`(잠금 variant) 제거 — 자동 시작(M-1)·연속 측정(M-3).
// - `starting`(자동 시작 시도·권한 프롬프트 중 — v1 idle+activating 흡수)·
//   `insecure`(비보안 컨텍스트 — 권한 문구와 혼용 금지)·
//   `awaiting-gesture`(자동 시작이 제스처 부재로 거부된 iOS fallback — 오류 아님, 중립 톤) 신설.
// - measuring에 `isStable: boolean` — **UI 상태가 아니라 내부 신호**(M-3): 렌더 분기·수치 잠금·
//   announce에 사용 금지. 소비처는 RV-1 왕복 자동 확정 트리거(page single-flight)뿐이다.
//
// [소유권 handoff] canonical 소유는 features/measure-session/model/view.ts(useMeasureView 셀렉터).
// model owner가 v2 store를 구현하면 이 정의를 model로 이동하고 여기서는 재수출로 교체한다 —
// 중복 정의 금지. (현재 model/view.ts가 이 파일을 재수출하는 방향 — v1 handoff 계약 승계.)
import type {WeakReason} from '@shared/lib/audio-analysis'

export type MeasureView =
  | {status: 'starting'} // 자동 시작 시도·권한 프롬프트 중 — 게이지 dim, "—"
  | {status: 'insecure'} // isSecureContext === false — HTTPS 안내 전용
  | {status: 'awaiting-gesture'} // M-1 fallback — [탭하여 시작] 1탭, 오류 표현 금지
  // v2.18: measuredMs = **연속** measuring 지속시간(ms). 신호가 끊기면 0부터 다시 센다.
  // 소비처는 ① 경과 표시 ② 기록 하한 게이트(MIN_MEASURE_DURATION_MS) ③ RV-1 자동 확정 게이트.
  // stabilityCv(컨디션 지표): 1.5s 창 회전 CV — 창 미충족 null. ±rpm 환산·등급은 표시 계층 소관.
  | {
      status: 'measuring'
      panoHz: number
      rpm: number
      isStable: boolean
      measuredMs: number
      stabilityCv: number | null
      // 순간 편차(바늘 실시간 떨림용) — 매 프레임 갱신, 창 미충족이면 null. 기록·등급 비관여.
      microCv: number | null
    } // 연속 갱신 ≥10Hz — 잠금 없음
  // reason(R27): weak-signal 세부 사유 — too-quiet면 "더 가까이" 안내. 수치 계약(INV-13)은 불변.
  | {status: 'weak-signal'; reason?: WeakReason} // 수치 없음 — 타입으로 강제 (INV-13)
  | {status: 'no-permission'; permanent: boolean; settingsHelpOpen: boolean} // F-2
  | {status: 'suspended'} // 실행 중 세션의 오디오 중단 — [탭하여 다시 시작]
