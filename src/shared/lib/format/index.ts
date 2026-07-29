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

// ── v2 신설 (component-spec v2 §1.5) ─────────────────────────────────────────

/** 파노 주지표(히어로): 소수 1자리·단위 없음 — `309 → "309.0"` (단위 "Hz"는 히어로 단위 행 별도) */
export function formatPanoValue(panoHz: number): string {
  return panoHz.toFixed(1)
}

/** 랩타임: ms → 초 소수 2자리 + "s" — `32450 → "32.45s"` (저장은 ms 정수, 표시만 초) */
export function formatLapTimeSec(lapTimeMs: number): string {
  return `${(lapTimeMs / 1000).toFixed(2)}s`
}

// Intl.DateTimeFormat 파생 — 로케일/타임존 규칙은 Intl에 위임하고 구분자만 조립한다.
// 인스턴스는 모듈 스코프 1회 생성(위 rpmFormatter와 동일 근거).
const dateTimeShortFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** 차트 X축·기록 행 일시: ISO(UTC) → 로컬 "MM-DD HH:mm" — `"2026-07-26T00:11:00.000Z" → "07-26 09:11"` */
export function formatDateTimeShort(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return EM_DASH // 방어 — rehydrate 검증 통과 데이터에선 미발생
  const parts = dateTimeShortFormatter.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find(p => p.type === type)?.value ?? ''
  return `${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`
}
