// src/app/theme.ts
// design-system.md v3 §8.2 — 토큰 정의는 src/shared/config/design-tokens.ts가 canonical (app→shared 방향).
// 소비 규칙: 컴포넌트에서 hex 직접 사용 금지. theme.palette/theme.vars 또는 design-tokens export 경유.
// v3: 시그니처 라임 1색 체계 + 컷코너 버튼 + 마이크로 인터랙션. colorSchemes 2벌 구조 불변.
import { createTheme } from '@mui/material/styles'
import {
  buildModeCssVars,
  color,
  darkColor,
  motionTokens,
  shapeTokens,
} from '@shared/config/design-tokens'
// OPTION-F1: 숫자 전용 가변 폰트 — self-host woff2(14KB), 외부 요청 0 (구글 CDN 금지)
import oxaniumWoff2 from '@fontsource-variable/oxanium/files/oxanium-latin-wght-normal.woff2'

// 하위 호환 re-export — 기존 `@app/theme` 소비자 유지.
export {
  measureStatusTokens,
  numericTypography,
  layoutTokens,
  motionTokens,
  shapeTokens,
} from '@shared/config/design-tokens'
export type { MeasureStatusVisual } from '@shared/config/design-tokens'

const hoverTransition = `${motionTokens.hoverMs}ms ${motionTokens.easeStandard}`

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data' }, // [data-mui-color-scheme="…"] — index.html 부팅 스크립트와 결속
  defaultColorScheme: 'dark',
  colorSchemes: {
    dark: {
      palette: {
        primary: { main: darkColor.lime400, dark: darkColor.lime300, light: darkColor.limeTint, contrastText: darkColor.carbon950 },
        error: { main: darkColor.red400, light: darkColor.redTint, contrastText: darkColor.carbon950 },
        warning: { main: darkColor.amber400, light: darkColor.amberTint, contrastText: darkColor.carbon950 },
        success: { main: darkColor.green400, light: darkColor.greenTint, contrastText: darkColor.carbon950 },
        text: { primary: darkColor.chalk100, secondary: darkColor.smoke400, disabled: darkColor.smoke700 },
        background: { default: darkColor.carbon950, paper: darkColor.carbon800 },
        divider: darkColor.hairline,
      },
    },
    light: {
      palette: {
        primary: { main: color.lime700, dark: color.lime800, light: color.limeTintL, contrastText: color.white },
        error: { main: color.red800, light: color.red50, contrastText: color.white },
        warning: { main: color.amber800, light: color.amber50, contrastText: color.white },
        success: { main: color.green800, light: color.green50, contrastText: color.white },
        text: { primary: color.gray900, secondary: color.gray600, disabled: color.gray300 },
        background: { default: color.gray50, paper: color.white },
        divider: color.gray100,
      },
    },
  },
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', Roboto, 'Noto Sans KR', 'Malgun Gothic', sans-serif",
    // v3 디스플레이 스케일 — 페이지 타이틀 = 대형 디스플레이 (§3.5)
    h1: { fontSize: 'clamp(1.75rem, 7vw, 2.125rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 },
    h2: { fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.01em' },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.45 },
    caption: { fontSize: '0.75rem' },
    // 편집 오버라인 — 카드 인덱스("01")·메타 라벨·단위 캡션 (§9.3)
    overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em', lineHeight: 1.4 },
    button: { fontSize: '1rem', fontWeight: 700, letterSpacing: '0.01em', textTransform: 'none' },
  },
  spacing: 8,
  shape: { borderRadius: 4 }, // v3: 12→4 — 날카로운 편집 톤 (버튼은 0+컷코너, 다이얼로그 8, 시트 상단 20)
  components: {
    MuiCssBaseline: {
      styleOverrides: (t) => ({
        // OPTION-F1 — 숫자 디스플레이 전용(digits+구두점 unicode-range). font-display: optional:
        // 첫 페인트에 못 실으면 그 세션은 시스템 폰트 고정 — tabular 폭 스왑 layout shift 방지.
        '@font-face': {
          fontFamily: 'Oxanium Variable',
          src: `url(${oxaniumWoff2}) format('woff2-variations')`,
          fontWeight: '200 800',
          fontStyle: 'normal',
          fontDisplay: 'optional',
          unicodeRange: 'U+0030-0039, U+002C, U+002E, U+2014, U+00D7, U+0025',
        },
        ':root': {
          '--mml-safe-top': 'env(safe-area-inset-top, 0px)',
          '--mml-safe-bottom': 'env(safe-area-inset-bottom, 0px)',
          ...buildModeCssVars('dark'), // 다크 기본 — defaultColorScheme와 일치
        },
        '[data-mui-color-scheme="light"]': buildModeCssVars('light'),
        html: { backgroundColor: (t.vars ?? t).palette.background.default }, // index.html 인라인 fallback을 부팅 후 승계
        body: { WebkitTapHighlightColor: 'transparent' },
        '[data-mui-color-scheme="dark"] body': {
          WebkitFontSmoothing: 'antialiased', // 다크 흰 글자 번짐 완화 — 라이트 무영향
          MozOsxFontSmoothing: 'grayscale',
        },
        // focus ring: outline 방식 — forced-colors 생존 (box-shadow 금지). 모드별 실값은 --mml-focus-ring.
        '*:focus-visible': { outline: '2px solid var(--mml-focus-ring)', outlineOffset: '2px' },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
          },
        },
      }),
    },
    /* -------------------------------------------------------------- *
     * v3 버튼 재설계 (§9.1)
     * contained = 컷코너: clip-path는 ::before 배경층에만 — root outline(focus ring) 생존.
     * ripple 대신 press scale 피드백 (사각 ripple이 컷코너 밖으로 새는 문제 회피).
     * forced-colors: ::before 배경 소실 대비 — root의 transparent 보더가 ButtonText로 실체화.
     * -------------------------------------------------------------- */
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: true },
      styleOverrides: {
        root: {
          minHeight: 48,
          borderRadius: 0,
          border: '1px solid transparent', // forced-colors 실루엣 가드 (§6)
          position: 'relative',
          isolation: 'isolate',
          transition: `transform ${motionTokens.pressMs}ms ${motionTokens.easeStandard}, box-shadow ${hoverTransition}, border-color ${hoverTransition}, background-color ${hoverTransition}, color ${hoverTransition}`,
          '&:active': { transform: 'scale(0.98)' },
          '@media (prefers-reduced-motion: reduce)': { '&:active': { transform: 'none' } },
        },
        sizeLarge: {
          minHeight: 56,
          fontSize: '1.0625rem',
          letterSpacing: '0.02em',
          '&::before': { clipPath: shapeTokens.cutCornerLg },
        },
        contained: ({ theme: t }) => ({
          backgroundColor: 'transparent', // 실제 면은 ::before가 그린다
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: -1, // transparent 보더 두께 보상 — 컷코너 면이 박스를 정확히 덮는다
            zIndex: -1,
            clipPath: shapeTokens.cutCorner,
            transition: `background-color ${hoverTransition}, filter ${hoverTransition}`,
          },
          '&:hover': { backgroundColor: 'transparent' },
          '&.Mui-disabled': {
            backgroundColor: 'transparent',
            color: (t.vars ?? t).palette.text.disabled,
            '&::before': { backgroundColor: (t.vars ?? t).palette.action.disabledBackground },
          },
        }),
        containedPrimary: ({ theme: t }) => ({
          color: (t.vars ?? t).palette.primary.contrastText,
          '&::before': { backgroundColor: (t.vars ?? t).palette.primary.main },
          // hover: 다크 = 밝기 상승(lime300) + 라임 글로우 / 라이트 = 침강(lime800)
          '&:hover::before': { backgroundColor: (t.vars ?? t).palette.primary.dark },
          ...t.applyStyles('dark', {
            '&:hover': { boxShadow: `0 0 24px ${darkColor.limeGlow}` },
          }),
        }),
        containedError: ({ theme: t }) => ({
          color: (t.vars ?? t).palette.error.contrastText,
          '&::before': { backgroundColor: (t.vars ?? t).palette.error.main },
          '&:hover::before': { filter: 'brightness(1.08)' },
        }),
        // secondary 위계 — 직각 사각 + 1px 보더 (컷코너는 contained 전용, DS-A13)
        outlined: ({ theme: t }) => ({
          color: (t.vars ?? t).palette.text.primary,
          borderColor: 'var(--mml-outline)',
          '&:hover': {
            borderColor: (t.vars ?? t).palette.text.secondary,
            backgroundColor: (t.vars ?? t).palette.action.hover,
          },
        }),
        // tertiary 위계 — 시그니처 텍스트 + hover 밑줄
        text: ({ theme: t }) => ({
          color: (t.vars ?? t).palette.primary.main,
          '&:hover': {
            backgroundColor: 'transparent',
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
            textDecorationThickness: '2px',
          },
        }),
        // v2.6 신설 — tertiary 파괴 톤. 위 `text` 오버라이드가 라임을 고정해 MUI 기본
        // textError 색을 덮어버리므로, color="error"가 실제로 반영되려면 이 슬롯이 필요하다
        // (없으면 [삭제]가 라임으로 렌더돼 안전한 주 행동처럼 보인다).
        textError: ({ theme: t }) => ({
          color: (t.vars ?? t).palette.error.main,
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
    },
    MuiToggleButtonGroup: {
      defaultProps: { fullWidth: true, exclusive: true },
      styleOverrides: { root: { borderRadius: 0 } }, // 세그먼트 = 직각 (버튼 체계와 정합)
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          minHeight: 44,
          borderRadius: 0,
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '0.01em',
          color: (t.vars ?? t).palette.text.secondary,
          borderColor: 'var(--mml-outline)',
          transition: `background-color ${hoverTransition}, color ${hoverTransition}`,
          '&.Mui-selected': {
            backgroundColor: (t.vars ?? t).palette.primary.main,
            color: (t.vars ?? t).palette.primary.contrastText,
            fontWeight: 800,
            '&:hover': { backgroundColor: (t.vars ?? t).palette.primary.dark },
          },
        }),
      },
    },
    MuiBottomNavigation: {
      defaultProps: { showLabels: true },
      styleOverrides: {
        root: ({ theme: t }) => ({
          height: 'auto',
          minHeight: 56,
          paddingBottom: 'var(--mml-safe-bottom)',
          backgroundColor: (t.vars ?? t).palette.background.paper,
          borderTop: `1px solid ${(t.vars ?? t).palette.divider}`, // 다크: 헤어라인 (그림자 대체)
        }),
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          minWidth: 96,
          position: 'relative',
          color: (t.vars ?? t).palette.text.secondary,
          transition: `color ${hoverTransition}`,
          '&.Mui-selected': { color: (t.vars ?? t).palette.primary.main },
          // 활성 탭 상단 2px 시그니처 인디케이터 — 장식(라벨+아이콘이 의미 담당)
          '&.Mui-selected::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 24,
            height: 2,
            backgroundColor: (t.vars ?? t).palette.primary.main,
          },
        }),
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 8, margin: 16 } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: 16, gap: 8 } },
    },
    MuiDrawer: {
      styleOverrides: {
        // BottomSheet(모터 등록/수정) — anchor="bottom" 전용. 상단 라운드는 시트 어포던스로 유지
        paperAnchorBottom: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: 'var(--mml-safe-bottom)',
          maxWidth: 480,
          marginInline: 'auto',
        },
      },
    },
    MuiSnackbar: {
      defaultProps: { anchorOrigin: { vertical: 'bottom', horizontal: 'center' } },
      styleOverrides: {
        // 하단 탭 위에 뜬다 (탭 바 가림 금지)
        anchorOriginBottomCenter: {
          bottom: 'calc(56px + var(--mml-safe-bottom) + 8px)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        // 모드 중립: 각 scheme의 {severity}.light = 배경 tint, .main = 전경 (§1.3·§1.4 대비 검증 조합)
        standardWarning: ({ theme: t }) => ({
          backgroundColor: (t.vars ?? t).palette.warning.light,
          color: (t.vars ?? t).palette.warning.main,
        }),
        standardError: ({ theme: t }) => ({
          backgroundColor: (t.vars ?? t).palette.error.light,
          color: (t.vars ?? t).palette.error.main,
        }),
        standardSuccess: ({ theme: t }) => ({
          backgroundColor: (t.vars ?? t).palette.success.light,
          color: (t.vars ?? t).palette.success.main,
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: { notchedOutline: { borderColor: 'var(--mml-outline)' } },
    },
    MuiRadio: {
      styleOverrides: { root: { padding: 10 } }, // 24px 아이콘 + 20px 패딩 = 44px 타깃
    },
    MuiCheckbox: {
      styleOverrides: { root: { padding: 10 } },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 }, // 카드류 기본 무그림자 — variant="outlined" (다크: 헤어라인 보더)
      styleOverrides: {
        outlined: ({ theme: t }) => ({
          transition: `border-color ${hoverTransition}`,
          // hover 시 헤어라인 승격 — 카드 인터랙션 미세 피드백 (다크 전용 장식)
          ...t.applyStyles('dark', {
            '&:hover': { borderColor: darkColor.hairlineStrong },
          }),
        }),
      },
    },
  },
})
