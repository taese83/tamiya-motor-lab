// src/shared/config/design-tokens.ts
// design-system.md §8 원본 — 수정 시 문서와 동기화할 것.
// FSD: 토큰 정의는 shared가 canonical이고 app/theme.ts가 이를 소비한다 (app→shared 방향만 허용).
// 소비 규칙: 컴포넌트에서 hex 직접 사용 금지. theme.palette 또는 아래 export 토큰 경유.

/* ------------------------------------------------------------------ *
 * 1. 원시 색 토큰 (light 단일 — DS-A1. §1.2 대비 검증 완료 값만 사용)
 * ------------------------------------------------------------------ */
export const color = {
  blue700: '#1565C0', // primary.main — 흰 글자 5.7:1
  blue900: '#0D47A1', // primary.dark — stable 강조
  blue50: '#E3F2FD', //  stable 배경 tint
  red800: '#C62828', //  error/destructive — 흰 글자 5.6:1
  red50: '#FDEDED',
  amber800: '#A15C00', // warning — weak-signal·저장 불가
  amber50: '#FFF4E5',
  green800: '#2E7D32', // success — 만족(positive) 전용
  green50: '#EAF4EB',
  gray900: '#1C1B1F', // text.primary·확정 수치
  gray700: '#444746', // 중립 상태 전경(idle·suspended)
  gray600: '#5F6368', // text.secondary·measuring 미확정 수치
  gray500: '#747775', // 입력 외곽선 (비텍스트 3:1)
  gray300: '#C4C7C5', // disabled
  gray100: '#F1F3F4', // divider·suspended 배경
  gray50: '#F8F9FA', //  background.default
  white: '#FFFFFF',
} as const

/* ------------------------------------------------------------------ *
 * 2. 측정 상태 6종 시각 토큰 (design-system.md §2와 1:1)
 *    키는 shared의 MeasureStatus enum과 일치해야 한다 (shared 타입이 canonical).
 *    색 단독 구분 금지 — StatusLabel이 라벨 텍스트+icon과 함께만 소비한다.
 * ------------------------------------------------------------------ */
export interface MeasureStatusVisual {
  /** 상태 라벨·아이콘 전경색 */
  fg: string
  /** S1 수치 영역 배경 */
  bg: string
  /** 수치(또는 "—" placeholder)·안내 문구 색 */
  valueFg: string
  /** 병행 아이콘 (svgr 개별 SVG, currentColor) */
  icon: 'mic' | 'pulse-dot' | 'lock' | 'signal-low' | 'mic-off' | 'pause'
}

export const measureStatusTokens = {
  idle: { fg: color.gray700, bg: color.white, valueFg: color.gray700, icon: 'mic' },
  measuring: { fg: color.blue700, bg: color.white, valueFg: color.gray600, icon: 'pulse-dot' },
  stable: { fg: color.blue900, bg: color.blue50, valueFg: color.gray900, icon: 'lock' },
  'weak-signal': { fg: color.amber800, bg: color.amber50, valueFg: color.gray700, icon: 'signal-low' },
  'no-permission': { fg: color.red800, bg: color.red50, valueFg: color.gray700, icon: 'mic-off' },
  suspended: { fg: color.gray700, bg: color.gray100, valueFg: color.gray700, icon: 'pause' },
} as const satisfies Record<string, MeasureStatusVisual>

/* ------------------------------------------------------------------ *
 * 3. 수치 타이포 토큰 — 전부 tabular-nums (layout shift 방지, §3.2)
 *    확정/미확정 구분은 크기가 아니라 색(measureStatusTokens.valueFg)으로.
 * ------------------------------------------------------------------ */
export const numericTypography = {
  /** S1 RPM 대형 수치·weak-signal "—" — 상태 간 동일 크기 */
  rpmValue: {
    fontSize: 'clamp(56px, 18vw, 96px)',
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums lining-nums',
  },
  /** S1 파노 보조 수치 (Hz, 소수 1자리) */
  fanoValue: {
    fontSize: 'clamp(20px, 6.5vw, 28px)',
    fontWeight: 500,
    lineHeight: 1.3,
    fontVariantNumeric: 'tabular-nums lining-nums',
  },
  /** S5 추천 전압 범위 대형 수치 */
  guideRange: {
    fontSize: 'clamp(32px, 10vw, 44px)',
    fontWeight: 700,
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums lining-nums',
  },
  /** S3/S4 목록 행 내 수치 (전압·RPM) */
  listValue: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums lining-nums',
  },
} as const

/* ------------------------------------------------------------------ *
 * 4. 레이아웃·모션 토큰
 * ------------------------------------------------------------------ */
export const layoutTokens = {
  /** 전 화면 콘텐츠 max-width — 태블릿/데스크탑 동일 레이아웃 중앙 정렬 */
  contentMaxWidth: 480,
  /** 인터랙티브 요소 최소 타깃 (REQ-NFR-003) */
  touchTargetMin: 44,
  /** 하단 탭 콘텐츠 높이 (safe-area 제외) */
  bottomNavHeight: 56,
  /** S1 중앙 수치 영역 고정 높이 — 6-status 전부 동일 (layout shift 금지, DS-A3) */
  measureValueMinHeight: 'clamp(160px, 48vw, 208px)',
  safeAreaTop: 'var(--mml-safe-top)',
  safeAreaBottom: 'var(--mml-safe-bottom)',
} as const

export const motionTokens = {
  /** stable 확정 시 배경 tint 전환 1회 — reduced-motion이면 0ms */
  stableTransitionMs: 400,
  /** measuring 펄스 점 주기 — reduced-motion이면 정지 점 */
  pulsePeriodMs: 1200,
} as const
