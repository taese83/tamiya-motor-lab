// MeasureView — S1 UI 계약 discriminated union (component-spec §2.1).
//
// canonical 정의는 현재 ../ui/measure-view.ts에 있다 (component-builder wave 선행 산출).
// ui 파일의 handoff 주석은 "model 구현 시 정의를 model로 이동하고 ui는 재수출"을 지시하지만,
// 본 wave의 소유 범위는 model/** 뿐이라 ui 파일을 수정할 수 없다 — 대신 model이 ui의 타입
// 모듈(부수효과·의존성 0의 순수 타입 파일)을 재수출해 중복 정의 금지 계약을 지킨다.
// ui 소유자가 재수출 방향을 뒤집는 시점(ui → model)에 이 파일이 canonical이 된다.
export type {MeasureView} from '../ui/measure-view'
