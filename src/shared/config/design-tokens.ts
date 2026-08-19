// src/shared/config/design-tokens.ts
// design-system.md v4 §8.1 원본 — 수정 시 문서와 동기화할 것.
// FSD: 토큰 정의는 shared가 canonical이고 app/theme.ts가 이를 소비한다 (app→shared 방향만 허용).
// 소비 규칙: 컴포넌트에서 hex 직접 사용 금지. theme.palette/theme.vars 또는 아래 export 토큰 경유.
// v4: Pit-Wall Amber 리컬러 — 웜틴트 카본(umber) + 시그니처 코퍼(copper) 1색.
// 평시 = 무채(웜) + copper, 시맨틱(red/amber/green)은 해당 순간에만. 발산·판정 근거는 design-system.md §1.0-v4.

/* ------------------------------------------------------------------ *
 * 0. 모터 종류 뱃지 색 (v2.6 — 사용자 지정 색상표. v4: 무변경 — 공존 점검은 design-system.md §1.0-v4)
 *
 * 평시 무채 원칙의 **예외**다: 종류는 상태·경고가 아니라 물리 제품의 식별색이고
 * (실제 엔드벨 색), 사용자가 색으로 종류를 빠르게 구분하길 요구했다.
 * 시맨틱 red/amber/green과 톤이 겹칠 수 있으나 뱃지는 항상 라벨 텍스트를 동반하므로
 * 색 단독 구분이 아니다(REQ-NFR-003). 하이퍼대시·마하대시는 요구대로 같은 빨강 —
 * 두 종류의 구분은 라벨이 담당한다.
 *
 * 모드별 변종을 두지 않는 이유: 채워진 뱃지는 bg·fg 대비를 자체적으로 만족하므로
 * 텍스트 가독성이 모드와 무관하다. 모드에 걸리는 유일한 문제는 **면 분리**다
 * (라이트 배경의 흰 뱃지, 다크 배경의 검정 뱃지가 배경에 녹는다). 이건 각 뱃지의
 * fg를 옅게 깐 border로 해결한다 — 흰 뱃지는 어두운 테두리, 검정 뱃지는 밝은 테두리가
 * 자동으로 생겨 모드 분기 없이 양쪽에서 떠 보인다.
 *
 * 대비(bg↔fg)는 전부 WCAG AA 4.5:1 이상으로 검증했다.
 * ------------------------------------------------------------------ */
export interface MotorKindVisual {
  /** 뱃지 면 색 */
  bg: string
  /** 라벨 색 — bg와 4.5:1 이상 */
  fg: string
  /** 면 분리용 테두리 — fg를 옅게 깐 값(배경색과 무관하게 윤곽 확보) */
  border: string
}

/**
 * hex(#RRGGBB) → rgba 문자열. 종류색을 **면 tint**로 재사용하기 위한 유틸(v2.12).
 *
 * 카드를 종류색으로 꽉 채우지 않는 이유: 우리 종류색은 채도가 높고(빨강·검정·흰색) 솔리드로
 * 채우면 ① 글자 대비를 종류마다 따로 계산해야 하고 ② 다크 카본에서 흰 카드/라이트에서 검정
 * 카드가 튄다. tint로 깔면 글자는 테마 전경색을 그대로 쓸 수 있어 양 모드에서 대비가 안전하다.
 * 식별성은 solid accent bar가 담당한다.
 */
export const withAlpha = (hex: string, alpha: number): string => {
  const value = hex.replace('#', '')
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 모터 카드 면 tint 농도 — 종류 식별을 돕되 글자 대비를 해치지 않는 수준(v2.12) */
export const MOTOR_CARD_TINT_ALPHA = 0.16

/** 종류별 뱃지 색 — 소비는 MotorKindChip 1곳(다른 곳에서 hex 재정의 금지). v4: 무변경 */
export const motorKindColors = {
  m130: {bg: '#5F6368', fg: '#FFFFFF', border: 'rgba(255,255,255,0.28)'}, // 회색 — 5.7:1
  torque: {bg: '#E8710A', fg: '#1C1B1F', border: 'rgba(28,27,31,0.30)'}, // 주황 — 5.5:1. v4: copper400(hue≈24°)와 근접(hue≈28°) — 뱃지 라벨 병행으로 안전(§1.0-v4)
  atomic: {bg: '#37474F', fg: '#FFFFFF', border: 'rgba(255,255,255,0.28)'}, // 짙은 회색 — 9.1:1
  rev: {bg: '#1565C0', fg: '#FFFFFF', border: 'rgba(255,255,255,0.28)'}, // 파랑 — 5.8:1
  light_dash: {bg: '#F5D90A', fg: '#1C1B1F', border: 'rgba(28,27,31,0.30)'}, // 노랑 — 12.4:1. v4: amber(hue≈50~53°)와 근접(hue≈53°) — 뱃지(solid)/warning(텍스트) 형태 차이로 저위험(§1.0-v4)
  hyper_dash: {bg: '#C62828', fg: '#FFFFFF', border: 'rgba(255,255,255,0.28)'}, // 빨강 — 5.6:1
  power_dash: {bg: '#00838F', fg: '#FFFFFF', border: 'rgba(255,255,255,0.30)'}, // 청록 — 4.6:1
  sprint_dash: {bg: '#FFFFFF', fg: '#1C1B1F', border: 'rgba(28,27,31,0.38)'}, // 흰색 — 17.6:1
  ultra_dash: {bg: '#18181B', fg: '#FFFFFF', border: 'rgba(255,255,255,0.38)'}, // 검정 — 16.4:1
  mach_dash: {bg: '#C62828', fg: '#FFFFFF', border: 'rgba(255,255,255,0.28)'}, // 빨강(하이퍼와 동일 — 라벨로 구분)
} as const satisfies Record<string, MotorKindVisual>

/* ------------------------------------------------------------------ *
 * 1. 원시 색 토큰 — light (v4: 후보 A 라이트 제안값. §1.4 대비 검증 값)
 * ------------------------------------------------------------------ */
export const color = {
  copper700: '#B85C1E', // 시그니처(light) — primary.main, 흰 글자 4.58:1(여유 근소 — DS-A18)
  copper800: '#934A18', // primary.dark — hover/pressed(흰 글자 6.49:1) + stable 라벨(tint 배경, 5.86:1)
  copperTintL: '#F9F2ED', // stable 배경 tint
  red800: '#C6392A', //  error/destructive — 순간색(후보 A 제안값)
  red50: '#FDEDED',
  amber800: '#7A6C00', // warning — weak-signal·저장 불가 전용 (v4: hue 34°→53°로 이동)
  amber50: '#EFEDE0',
  green800: '#2E7D32', // success — 만족(positive) 전용
  green50: '#EAF4EB',
  stone900: '#241C16', // text.primary·확정 수치(후보 A 제안값)
  stone700: '#40372F', // 중립 상태 전경(idle·suspended)
  stone600: '#6B5F54', // text.secondary·measuring 미확정 수치(후보 A 제안값)
  stone500: '#928172', // 입력 외곽선 (비텍스트 3:1 — README 원안 D8CCBE 대비 실패로 재조정)
  stone300: '#C7BAAC', // disabled
  stone100: '#F1E9DD', // divider·suspended 배경
  cream50: '#FBF6F1', //  background.default(후보 A 제안값)
  white: '#FFFFFF',
} as const

/* ------------------------------------------------------------------ *
 * 1b. 원시 색 토큰 — dark (v4: 웜틴트 카본 + 시그니처 코퍼. §1.3 대비 검증 값)
 * ------------------------------------------------------------------ */
export const darkColor = {
  umber950: '#1A1410', // background.default — 웜틴트 카본 블랙(후보 A --st-bg)
  umber900: '#1F1813', // S1 히어로 존 bg (베젤 안 다크 글래스, 보간)
  umber800: '#241C16', // background.paper — 카드 표면(후보 A --st-surface)
  umber700: '#2E2418', // 상승 표면 — suspended bg·hover(보간)
  hairline: 'rgba(140, 124, 107, 0.18)', // divider·기본 헤어라인 (장식, 보더 hue 저알파)
  hairlineStrong: '#8C7C6B', // 편집 구분선·베젤 링·입력 외곽선(후보 A --st-border, 통합 — DS-A19)
  cream100: '#F4ECE2', // text.primary — 15.58:1(후보 A --st-text)
  sand200: '#D6CCC1', // measuring 미확정 수치 — 11.07:1
  sand400: '#B8ACA0', // text.secondary·중립 상태 전경 — 8.20:1(후보 A --st-text-muted)
  sand700: '#59514A', // disabled
  copper400: '#FF8A3D', // 시그니처(dark) — primary.main·CTA·measuring·stable, umber950 글자 7.78:1(후보 A --st-accent)
  copper300: '#FF9D5C', // primary.dark — hover/pressed 상승
  copperTint: '#382316', // stable 배경 tint (shift-light 잠금면)
  copperGlow: 'rgba(255, 138, 61, 0.25)', // primary hover 글로우 (장식)
  copperShadow: 'rgba(255, 138, 61, 0.14)', // v4 additive(선택, 미배선) — 후보 A --st-shadow 컬러 성분
  amber400: '#FFD400', // warning — weak-signal·저장 불가 전용 (v4: hue 42°→50°로 이동)
  amberTint: '#332B10',
  red400: '#FF6B5A', //  error — destructive·no-permission·레드라인 밴드(장식)(후보 A --st-danger)
  redTint: '#39201A',
  green400: '#66BB6A', // success — 만족 전용
  greenTint: '#122A16',
  white: '#FFFFFF', //   stable 확정 수치
} as const

/** <meta name="theme-color"> 동기화용 (app-shell effect 소비 — §7.2-4) */
export const themeColorMeta = {
  dark: darkColor.umber950,
  light: color.cream50,
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
    idle: { fg: darkColor.sand400, bg: darkColor.umber900, valueFg: darkColor.sand400 },
    measuring: { fg: darkColor.copper400, bg: darkColor.umber900, valueFg: darkColor.sand200 },
    stable: { fg: darkColor.copper400, bg: darkColor.copperTint, valueFg: darkColor.white },
    // v2.2 버그 수정(v3→v4 승계): bg amberTint → umber900 — 게이지를 덮는 노란 레이어 제거(실기기 피드백).
    // 상태 구분은 fg 앰버 + 라벨 + signal-low 아이콘 3요소가 유지한다(REQ-NFR-003).
    'weak-signal': { fg: darkColor.amber400, bg: darkColor.umber900, valueFg: darkColor.sand400 },
    'no-permission': { fg: darkColor.red400, bg: darkColor.redTint, valueFg: darkColor.sand400 },
    suspended: { fg: darkColor.sand400, bg: darkColor.umber700, valueFg: darkColor.sand400 },
  },
  light: {
    idle: { fg: color.stone700, bg: color.white, valueFg: color.stone700 },
    measuring: { fg: color.copper700, bg: color.white, valueFg: color.stone600 }, // v4: copper700 — bg는 white 고정(cream50 아님, DS-A18)
    stable: { fg: color.copper800, bg: color.copperTintL, valueFg: color.stone900 }, // v4: copper700이 아닌 800 — tint 배경 대비 확보(§1.4)
    'weak-signal': { fg: color.amber800, bg: color.white, valueFg: color.stone700 }, // v2.2: 노란 레이어 제거 — 다크와 동일 원칙
    'no-permission': { fg: color.red800, bg: color.red50, valueFg: color.stone700 },
    suspended: { fg: color.stone700, bg: color.stone100, valueFg: color.stone700 },
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
  '--mml-focus-ring': scheme === 'dark' ? darkColor.copper400 : color.copper700,
  '--mml-outline': scheme === 'dark' ? darkColor.hairlineStrong : color.stone500,
  // S1 히어로 존 장식 비네트 — 상태 bg 위에 겹치는 overlay 전용 (aria-hidden, §9.4). 무채 오버레이 — 색 무관, v4 무변경.
  '--mml-hero-vignette':
    scheme === 'dark'
      ? 'radial-gradient(140% 100% at 50% 18%, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.28) 100%)'
      : 'none',
})

/* ------------------------------------------------------------------ *
 * 3. 수치 타이포 토큰 — 전부 tabular-nums (layout shift 방지, §3). v4: 색 변경 없음(값 v3 승계).
 * ------------------------------------------------------------------ */

// OPTION-F1 채택(RV-4): 숫자 디스플레이 전용 가변 폰트 — @font-face는 theme(MuiCssBaseline)이
// 주입(digits unicode-range·font-display: optional — 로드 실패 세션은 시스템 폰트 고정, shift 0).
// 대형 디스플레이 수치(rpmValue·guideRange)에만 적용 — 본문·라벨·목록 수치는 시스템 스택 유지.
export const numericFontStack = "'Oxanium Variable', system-ui, sans-serif"

export const numericTypography = {
  /** S1 파노 대형 수치·weak-signal "—" — 상태 간 동일 크기 */
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
  /** 대형 범위 수치 (레이스 요약 등) */
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
 * 4. 레이아웃·형태·모션 토큰 (v4: 색 변경 없음 — 값 v3 승계)
 * ------------------------------------------------------------------ */
export const layoutTokens = {
  /** 전 화면 콘텐츠 max-width — 태블릿/데스크탑 동일 레이아웃 중앙 정렬 */
  contentMaxWidth: 480,
  /** 인터랙티브 요소 최소 타깃 (REQ-NFR-003) */
  touchTargetMin: 44,
  /**
   * v2.10 신설 — 폼 컨트롤 공통 높이(px). 입력·세그먼트·스테퍼·시트 액션이 모두 이 값을 쓴다.
   * 44(최소 타깃)보다 크므로 타깃 요건도 자동 충족한다.
   */
  formControlHeight: 48,
  /** 하단 탭 콘텐츠 높이 (safe-area 제외) */
  bottomNavHeight: 56,
  /** S1 중앙 수치 영역 고정 높이 — 6-status 전부 동일 (layout shift 금지, DS-A3).
   *  게이지 확대 후속 재클램프 — 계약(전 status 동일 높이)은 불변. */
  measureValueMinHeight: 'clamp(224px, 66vw, 300px)',
  /** 섹션 간 수직 여백 (px) */
  sectionGap: 40,
  /** 카드 내부 패딩 (px) */
  cardPad: 20,
  safeAreaTop: 'var(--mml-safe-top)',
  safeAreaBottom: 'var(--mml-safe-bottom)',
} as const

/** 컷코너 버튼 형태 (::before clip-path 전용, §9.1. root에 직접 clip 금지 — focus ring 보존). v4: 무변경 */
export const shapeTokens = {
  cutCorner: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
  cutCornerLg: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
} as const

/**
 * 스크린리더 전용 숨김 — 시각 렌더 없음, 레이아웃 점유 없음.
 *
 * v2.15 신설: 이 레시피는 네 곳에 손으로 복제돼 있었고 그중 한 곳(RaceEntrySheet)에서
 * 단위가 빠져 실제 버그가 났다. MUI `sx`는 단위 없는 숫자를 px로 읽지 않는다 —
 * `width: 1`은 100%(0~1은 배수), `margin: -1`은 theme.spacing(-1) = -8px다.
 * 그 결과 폭 100% + 좌측 -8px가 되어 BottomSheet에 8px 가로 스크롤이 생겼다.
 * 단위 실수가 조용히 통과하지 않도록 px 문자열로 고정한 단일 출처를 둔다.
 *
 * `clip`은 폐기 속성이지만 `clip-path`보다 지원 폭이 넓어 관례상 함께 유지한다.
 */
export const srOnlySx = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const

export const motionTokens = {
  /** stable 확정 시 배경 tint 전환 1회 — reduced-motion이면 0ms */
  stableTransitionMs: 400,
  /** measuring 펄스 점 주기 — reduced-motion이면 정지 점 */
  pulsePeriodMs: 1200,
  /** hover 전환 */
  hoverMs: 140,
  /** press 전환 (scale 0.98) */
  pressMs: 120,
  /** 요소 등장 (OPTION-M1 페이드 포함) */
  enterMs: 200,
  /** 게이지 바늘·진행 아크 보간 */
  needleMs: 100,
  /** 표준 이징 */
  easeStandard: 'cubic-bezier(0.2, 0, 0, 1)',
  /** 감속 이징 */
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
} as const
