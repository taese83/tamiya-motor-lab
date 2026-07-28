// MeasureView — S1 UI 계약 discriminated union (component-spec §2.1).
// 필드명은 api-schema NR-1 표준(panoHz)을 따른다 — spec §2.1 본문의 fanoHz 표기는 정정 전 표기.
// confidence는 view에 포함하지 않는다 — UI 비노출 확정(analysis-algorithm §1).
//
// [소유권 handoff] canonical 소유는 features/measure-session/model/view.ts(useMeasureView 셀렉터).
// model wave(data-ui-binder)가 store를 구현하면 이 정의를 model로 이동하고
// 여기서는 재수출로 교체한다 — 중복 정의 금지.
export type MeasureView =
  | {status: 'idle'; secureContext: boolean; activating: boolean} // activating: getUserMedia 대기 <1s
  | {status: 'measuring'; rpm: number; panoHz: number} // 실시간 갱신 ≥10Hz
  | {status: 'weak-signal'} // 수치 없음 — 타입으로 강제 (REQ-ST-003)
  | {status: 'stable'; rpm: number; panoHz: number} // 확정 잠금 — 이후 불변
  | {status: 'no-permission'; permanent: boolean; settingsHelpOpen: boolean} // F-2
  | {status: 'suspended'}
