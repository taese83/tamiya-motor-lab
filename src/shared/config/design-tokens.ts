// src/shared/config/design-tokens.ts
// design-system.md v2 §8.1 원본 — 수정 시 문서와 동기화할 것.
// FSD: 토큰 정의는 shared가 canonical이고 app/theme.ts가 이를 소비한다 (app→shared 방향만 허용).
// 소비 규칙: 컴포넌트에서 hex 직접 사용 금지. theme.palette/theme.vars 또는 아래 export 토큰 경유.
// v2: 다크 기본 + 라이트 토글 — 상태 토큰은 CSS 변수 간접층(--mml-status-*)으로 모드 자동 전환.

/* ------------------------------------------------------------------ *
 * 1. 원시 색 토큰 — light (v1 승계, §1.4 대비 검증 값)
 * ------------------------------------------------------------------ */
export const color = {
  blue700: '#1565C0', // primary.main — 흰 글자 5.7:1
  blue900: '#0D47A1', // primary.dark — stable 강조
  blue50: '#E3F2FD', //  stable 배경 tint
  red800: '#C62828', //  error/destructive — 흰 글자 5.6:1
  red50: '#FDEDED',
  amber800: '#A15C00', // warning — measuring(v2)·weak-signal·저장 불가
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
 * 1b. 원시 색 토큰 — dark (v2 레이싱 계기판, §1.3 대비 검증 값)
 * ------------------------------------------------------------------ */
export const darkColor = {
  night950: '#05060A', // background.default — 순흑 블루블랙
  night900: '#0C0F15', // S1 수치 영역 bg (베젤 안 다크 글래스)
  night700: '#12151B', // background.paper — 카드 표면
  night600: '#1A1F28', // 상승 표면 — suspended bg·hover
  hairline: 'rgba(255, 255, 255, 0.10)', // divider·1px 헤어라인 (그림자 대체)
  ice100: '#F5F7FA', //  text.primary — 18.9:1
  ice300: '#C3CBD9', //  measuring 미확정 수치 — 11.8:1
  slate400: '#9AA3B2', // text.secondary·중립 상태 전경
  slate500: '#6A7684', // 입력 외곽선 — 비텍스트 3.9:1
  slate600: '#556070', // disabled
  blue300: '#64B5F6', // primary.main — CTA·stable 잠금, 다크 글자 9.1:1
  blue500: '#3D8FD9', // primary.dark — hover/pressed
  blueTint: '#0E2138', // stable 배경 tint (shift-light 잠금면)
  amber400: '#FFB300', // 레이싱 앰버 — measuring 펄스·weak-signal
  amberTint: '#2A1F0A',
  red400: '#FF5A5F', //  레이싱 레드 — destructive·no-permission
  redTint: '#2B1113',
  green400: '#66BB6A', // success — 만족 전용
  greenTint: '#122A16',
  white: '#FFFFFF', //   stable 확정 수치
} as const

/** <meta name="theme-color"> 동기화용 (app-shell effect 소비 — §7.2-4) */
export const themeColorMeta = {
  dark: darkColor.night950,
  light: color.gray50,
} as const

/* ------------------------------------------------------------------ *
 * 2. 측정 상태 6종 시각 토큰 (design-system.md §2와 1:1)
 *    키는 shared의 MeasureStatus enum과 일치해야 한다 (shared 타입이 canonical).
 *    색 단독 구분 금지 — StatusLabel이 라벨 텍스트+icon과 함께만 소비한다.
 *    v2: 값은 CSS 변수 참조 문자열 — 실값은 theme(MuiCssBaseline)이 모드별 주입.
 *    CSS 색 컨텍스트 전용(canvas 등 비-CSS 소비 금지 — DS-A8).
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

const sv = (status: string, part: 'fg' | 'bg' | 'value-fg') => `var(--mml-status-${status}-${part})`

export const measureStatusTokens = {
  idle: { fg: sv('idle', 'fg'), bg: sv('idle', 'bg'), valueFg: sv('idle', 'value-fg'), icon: 'mic' },
  measuring: { fg: sv('measuring', 'fg'), bg: sv('measuring', 'bg'), valueFg: sv('measuring', 'value-fg'), icon: 'pulse-dot' },
  stable: { fg: sv('stable', 'fg'), bg: sv('stable', 'bg'), valueFg: sv('stable', 'value-fg'), icon: 'lock' },
  'weak-signal': { fg: sv('weak-signal', 'fg'), bg: sv('weak-signal', 'bg'), valueFg: sv('weak-signal', 'value-fg'), icon: 'signal-low' },
  'no-permission': { fg: sv('no-permission', 'fg'), bg: sv('no-permission', 'bg'), valueFg: sv('no-permission', 'value-fg'), icon: 'mic-off' },
  suspended: { fg: sv('suspended', 'fg'), bg: sv('suspended', 'bg'), valueFg: sv('suspended', 'value-fg'), icon: 'pause' },
} as const satisfies Record<string, MeasureStatusVisual>

/** 모드별 실값 — theme(MuiCssBaseline)만 소비. 컴포넌트 직접 사용 금지. */
export const measureStatusSchemeValues = {
  dark: {
    idle: { fg: darkColor.slate400, bg: darkColor.night900, valueFg: darkColor.slate400 },
    measuring: { fg: darkColor.amber400, bg: darkColor.night900, valueFg: darkColor.ice300 },
    stable: { fg: darkColor.blue300, bg: darkColor.blueTint, valueFg: darkColor.white },
    'weak-signal': { fg: darkColor.amber400, bg: darkColor.amberTint, valueFg: darkColor.slate400 },
    'no-permission': { fg: darkColor.red400, bg: darkColor.redTint, valueFg: darkColor.slate400 },
    suspended: { fg: darkColor.slate400, bg: darkColor.night600, valueFg: darkColor.slate400 },
  },
  light: {
    idle: { fg: color.gray700, bg: color.white, valueFg: color.gray700 },
    measuring: { fg: color.amber800, bg: color.white, valueFg: color.gray600 }, // v2: blue700→amber800 (악센트 체계 정합 — DS-A6)
    stable: { fg: color.blue900, bg: color.blue50, valueFg: color.gray900 },
    'weak-signal': { fg: color.amber800, bg: color.amber50, valueFg: color.gray700 },
    'no-permission': { fg: color.red800, bg: color.red50, valueFg: color.gray700 },
    suspended: { fg: color.gray700, bg: color.gray100, valueFg: color.gray700 },
  },
} as const

/** scheme → CSS 변수 선언 객체 (theme MuiCssBaseline 주입 전용) */
export const buildModeCssVars = (scheme: 'dark' | 'light'): Record<string, string> => ({
  ...Object.fromEntries(
    // Object.entries가 union 객체에서 값 타입을 잃으므로(암묵 any) 명시 튜플로 고정
    Object.entries<{fg: string; bg: string; valueFg: string}>(
      measureStatusSchemeValues[scheme],
    ).flatMap(([status, t]) => [
      [`--mml-status-${status}-fg`, t.fg],
      [`--mml-status-${status}-bg`, t.bg],
      [`--mml-status-${status}-value-fg`, t.valueFg],
    ]),
  ),
  '--mml-focus-ring': scheme === 'dark' ? darkColor.blue300 : color.blue700,
  '--mml-outline': scheme === 'dark' ? darkColor.slate500 : color.gray500,
})

/* ------------------------------------------------------------------ *
 * 3. 수치 타이포 토큰 — 전부 tabular-nums (layout shift 방지, §3) — v1 불변
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
 * 4. 레이아웃·모션 토큰 — v1 불변
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
