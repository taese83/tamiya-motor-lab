// 수치 표시 계약 1곳 구현 (design-system §3.3 · component-spec §1.5) —
// 컴포넌트는 이 유틸만 경유한다. 하드코딩 포맷 금지.

/** 값 없음 placeholder — 0·빈문자열·이전 값 표시 금지 (DS §3.3) */
export const EM_DASH = '—'

// Intl.NumberFormat 인스턴스는 생성 비용이 있어 모듈 스코프에 1회 생성 —
// S1 실시간 갱신(≥10 Hz) 경로에서 매 호출 생성을 피한다.
const rpmFormatter = new Intl.NumberFormat('ko-KR', {maximumFractionDigits: 0})

/** RPM: 정수·천단위 구분 — `18540 → "18,540"` (단위 라벨 "RPM"은 표시 계층 별도) */
export function formatRpm(rpm: number): string {
  return rpmFormatter.format(rpm)
}

/** 파노(f₀): 소수 1자리 고정 + " Hz" — `309 → "309.0 Hz"` */
export function formatFanoHz(panoHz: number): string {
  return `${panoHz.toFixed(1)} Hz`
}

/** 전압: 소수 1자리 표시 + " V" — `2.8 → "2.8 V"` (입력 허용은 소수 ≤2자리 — A5) */
export function formatVoltage(voltage: number): string {
  return `${voltage.toFixed(1)} V`
}

/** 전압 범위: `(2.8, 3.0) → "2.8 ~ 3.0 V"` — S5 추천 범위 (`추천` 접두는 소비 측) */
export function formatVoltageRange(min: number, max: number): string {
  return `${min.toFixed(1)} ~ ${max.toFixed(1)} V`
}
