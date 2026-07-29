// src/shared/config/design-tokens.ts
// design-system.md v3 §8.1 원본 — 수정 시 문서와 동기화할 것.
// FSD: 토큰 정의는 shared가 canonical이고 app/theme.ts가 이를 소비한다 (app→shared 방향만 허용).
// 소비 규칙: 컴포넌트에서 hex 직접 사용 금지. theme.palette/theme.vars 또는 아래 export 토큰 경유.
// v3: 시그니처 라임 1색 체계 — 평시 = 무채 카본 + lime, 시맨틱(red/amber/green)은 해당 순간에만.

/* ------------------------------------------------------------------ *
 * 1. 원시 색 토큰 — light (v3: 무채 gray 승계 + 시그니처 라임, 블루 삭제. §1.4 대비 검증 값)
 * ------------------------------------------------------------------ */
export const color = {
  lime700: '#566E00', // 시그니처(light) — primary.main, 흰 글자 5.8:1
  lime800: '#435600', // primary.dark — hover/pressed, 흰 글자 8.2:1
  limeTintL: '#F0F6DC', // stable 배경 tint·선택 tint
  red800: '#C62828', //  error/destructive — 순간색
  red50: '#FDEDED',
  amber800: '#A15C00', // warning — weak-signal·저장 불가 전용 (v3: measuring 제외)
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
 * 1b. 원시 색 토큰 — dark (v3: 무채 카본 + 시그니처 라임. §1.3 대비 검증 값)
 * ------------------------------------------------------------------ */
export const darkColor = {
  carbon950: '#0A0A0B', // background.default — 무채 카본 블랙
  carbon900: '#111114', // S1 히어로 존 bg (베젤 안 다크 글래스)
  carbon800: '#16161A', // background.paper — 카드 표면
  carbon700: '#1E1E24', // 상승 표면 — suspended bg·hover
  hairline: 'rgba(255, 255, 255, 0.08)', // divider·기본 헤어라인 (그림자 대체)
  hairlineStrong: 'rgba(255, 255, 255, 0.16)', // 편집 구분선·베젤 링·카드 인덱스 룰
  chalk100: '#F4F5F2', // text.primary — 18.1:1
  smoke200: '#CDCFC9', // measuring 미확정 수치 — 12.0:1
  smoke400: '#A6A8A3', // text.secondary·중립 상태 전경 — 8.2:1
  smoke600: '#757871', // 입력 외곽선 — 비텍스트 4.0:1
  smoke700: '#5A5C57', // disabled
  lime400: '#D8F542', // 시그니처(dark) — primary.main·CTA·measuring·stable, 카본 글자 16.1:1
  lime300: '#E4FF66', // primary.dark — hover/pressed 상승
  limeTint: '#202B08', // stable 배경 tint (shift-light 잠금면)
  limeGlow: 'rgba(216, 245, 66, 0.25)', // primary hover 글로우 (장식)
  amber400: '#FFB300', // warning — weak-signal·저장 불가 전용 (v3: measuring 제외)
  amberTint: '#2A1F0A',
  red400: '#FF5A5F', //  error — destructive·no-permission·레드라인 밴드(장식)
  redTint: '#2B1113',
  green400: '#66BB6A', // success — 만족 전용
  greenTint: '#122A16',
  white: '#FFFFFF', //   stable 확정 수치
} as const

/** <meta name="theme-color"> 동기화용 (app-shell effect 소비 — §7.2-4) */
export const themeColorMeta = {
  dark: darkColor.carbon950,
  light: color.gray50,
} as const

/* ------------------------------------------------------------------ *
 * 2. 측정 상태 6종 시각 토큰 (design-system.md §2와 1:1)
 *    키는 shared의 MeasureStatus enum과 일치해야 한다 (shared 타입이 canonical).
 *    색 단독 구분 금지 — StatusLabel이 라벨 텍스트+icon과 함께만 소비한다.
 *    값은 CSS 변수 참조 문자열 — 실값은 theme(MuiCssBaseline)이 모드별 주입.
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
    idle: { fg: darkColor.smoke400, bg: darkColor.carbon900, valueFg: darkColor.smoke400 },
    measuring: { fg: darkColor.lime400, bg: darkColor.carbon900, valueFg: darkColor.smoke200 },
    stable: { fg: darkColor.lime400, bg: darkColor.limeTint, valueFg: darkColor.white },
    // v2.2 버그 수정: bg amberTint → carbon900 — 게이지를 덮는 노란 레이어 제거(실기기 피드백).
    // 상태 구분은 fg 앰버 + 라벨 + signal-low 아이콘 3요소가 유지한다(REQ-NFR-003).
    'weak-signal': { fg: darkColor.amber400, bg: darkColor.carbon900, valueFg: darkColor.smoke400 },
    'no-permission': { fg: darkColor.red400, bg: darkColor.redTint, valueFg: darkColor.smoke400 },
    suspended: { fg: darkColor.smoke400, bg: darkColor.carbon700, valueFg: darkColor.smoke400 },
  },
  light: {
    idle: { fg: color.gray700, bg: color.white, valueFg: color.gray700 },
    measuring: { fg: color.lime700, bg: color.white, valueFg: color.gray600 }, // v3: amber800→lime700 (시그니처 통합)
    stable: { fg: color.lime700, bg: color.limeTintL, valueFg: color.gray900 },
    'weak-signal': { fg: color.amber800, bg: color.white, valueFg: color.gray700 }, // v2.2: 노란 레이어 제거 — 다크와 동일 원칙
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
  '--mml-focus-ring': scheme === 'dark' ? darkColor.lime400 : color.lime700,
  '--mml-outline': scheme === 'dark' ? darkColor.smoke600 : color.gray500,
  // S1 히어로 존 장식 비네트 — 상태 bg 위에 겹치는 overlay 전용 (aria-hidden, §9.4)
  '--mml-hero-vignette':
    scheme === 'dark'
      ? 'radial-gradient(140% 100% at 50% 18%, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.28) 100%)'
      : 'none',
})

/* ------------------------------------------------------------------ *
 * 3. 수치 타이포 토큰 — 전부 tabular-nums (layout shift 방지, §3)
 *    v3: rpmValue·guideRange 디스플레이 스케일 상향 — 고정 높이 재클램프는 layoutTokens와 동조.
 * ------------------------------------------------------------------ */

// OPTION-F1 채택(RV-4): 숫자 디스플레이 전용 가변 폰트 — @font-face는 theme(MuiCssBaseline)이
// 주입(digits unicode-range·font-display: optional — 로드 실패 세션은 시스템 폰트 고정, shift 0).
// 대형 디스플레이 수치(rpmValue·guideRange)에만 적용 — 본문·라벨·목록 수치는 시스템 스택 유지.
export const numericFontStack = "'Oxanium Variable', system-ui, sans-serif"

export const numericTypography = {
  /** S1 파노 대형 수치·weak-signal "—" — 상태 간 동일 크기. v3: 화면의 주인공 스케일 */
  rpmValue: {
    fontFamily: numericFontStack,
    fontSize: 'clamp(64px, 22vw, 120px)',
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: '-0.045em',
    fontVariantNumeric: 'tabular-nums lining-nums',
  },
  /** S1 파노 보조 수치 (Hz, 소수 1자리) — 크기 동결(행 높이 파생 불변), 웨이트만 상향 */
  fanoValue: {
    fontSize: 'clamp(20px, 6.5vw, 28px)',
    fontWeight: 600,
    lineHeight: 1.3,
    fontVariantNumeric: 'tabular-nums lining-nums',
  },
  /** 대형 범위 수치 (v2: 레이스 요약 등) — v3 상향 */
  guideRange: {
    fontFamily: numericFontStack,
    fontSize: 'clamp(40px, 12vw, 56px)',
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums lining-nums',
  },
  /** S3/S4 목록 행 내 수치 (전압·RPM) */
  listValue: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums lining-nums',
  },
} as const

/* ------------------------------------------------------------------ *
 * 4. 레이아웃·형태·모션 토큰
 * ------------------------------------------------------------------ */
export const layoutTokens = {
  /** 전 화면 콘텐츠 max-width — 태블릿/데스크탑 동일 레이아웃 중앙 정렬 */
  contentMaxWidth: 480,
  /** 인터랙티브 요소 최소 타깃 (REQ-NFR-003) */
  touchTargetMin: 44,
  /** 하단 탭 콘텐츠 높이 (safe-area 제외) */
  bottomNavHeight: 56,
  /** S1 중앙 수치 영역 고정 높이 — 6-status 전부 동일 (layout shift 금지, DS-A3).
   *  v3: rpmValue 상향에 동조 재클램프 (계약 자체는 불변 — DS-A16) */
  measureValueMinHeight: 'clamp(200px, 60vw, 272px)',
  /** v3 additive: 섹션 간 수직 여백 (px) — 여백 스케일 ~1.5× */
  sectionGap: 40,
  /** v3 additive: 카드 내부 패딩 (px) */
  cardPad: 20,
  safeAreaTop: 'var(--mml-safe-top)',
  safeAreaBottom: 'var(--mml-safe-bottom)',
} as const

/** v3 신설 — 컷코너 버튼 형태 (::before clip-path 전용, §9.1. root에 직접 clip 금지 — focus ring 보존) */
export const shapeTokens = {
  cutCorner: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
  cutCornerLg: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
} as const

export const motionTokens = {
  /** stable 확정 시 배경 tint 전환 1회 — reduced-motion이면 0ms */
  stableTransitionMs: 400,
  /** measuring 펄스 점 주기 — reduced-motion이면 정지 점 */
  pulsePeriodMs: 1200,
  /** v3 additive: hover 전환 */
  hoverMs: 140,
  /** v3 additive: press 전환 (scale 0.98) */
  pressMs: 120,
  /** v3 additive: 요소 등장 (OPTION-M1 페이드 포함) */
  enterMs: 200,
  /** v3 additive: 게이지 바늘·진행 아크 보간 */
  needleMs: 100,
  /** v3 additive: 표준 이징 */
  easeStandard: 'cubic-bezier(0.2, 0, 0, 1)',
  /** v3 additive: 감속 이징 */
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
} as const
