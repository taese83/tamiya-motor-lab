// src/app/theme.ts
// design-system.md §8 — 토큰 정의는 src/shared/config/design-tokens.ts가 canonical (app→shared 방향).
// 소비 규칙: 컴포넌트에서 hex 직접 사용 금지. theme.palette 또는 design-tokens export 경유.
import { createTheme } from '@mui/material/styles'
import {color} from '@shared/config/design-tokens'

// 하위 호환 re-export — 기존 `@app/theme` 소비자 유지.
export {
  measureStatusTokens,
  numericTypography,
  layoutTokens,
  motionTokens,
} from '@shared/config/design-tokens'
export type {MeasureStatusVisual} from '@shared/config/design-tokens'

/* ------------------------------------------------------------------ *
 * MUI theme — 최소 오버라이드 (AD-8: MUI 기본 + 토큰만)
 * ------------------------------------------------------------------ */
export const theme = createTheme({
  cssVariables: true, // --mui-palette-* CSS 변수 생성 — 다크 확장 경로(DS-A1)
  palette: {
    mode: 'light',
    primary: { main: color.blue700, dark: color.blue900, light: color.blue50, contrastText: color.white },
    error: { main: color.red800, light: color.red50, contrastText: color.white },
    warning: { main: color.amber800, light: color.amber50, contrastText: color.white },
    success: { main: color.green800, light: color.green50, contrastText: color.white },
    text: { primary: color.gray900, secondary: color.gray600, disabled: color.gray300 },
    background: { default: color.gray50, paper: color.white },
    divider: color.gray100,
  },
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', Roboto, 'Noto Sans KR', 'Malgun Gothic', sans-serif",
    h1: { fontSize: '1.375rem', fontWeight: 700 }, // 22px 페이지 타이틀
    h2: { fontSize: '1.125rem', fontWeight: 600 }, // 18px 섹션
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.45 },
    caption: { fontSize: '0.75rem' },
    button: { fontSize: '1rem', fontWeight: 600, textTransform: 'none' },
  },
  spacing: 8,
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          '--mml-safe-top': 'env(safe-area-inset-top, 0px)',
          '--mml-safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        },
        body: { WebkitTapHighlightColor: 'transparent' },
        // focus ring: outline 방식 — forced-colors 모드에서 생존 (box-shadow 금지)
        '*:focus-visible': { outline: `2px solid ${color.blue700}`, outlineOffset: '2px' },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 48, borderRadius: 12 },
        sizeLarge: { minHeight: 56, fontSize: '1.0625rem' }, // S1 대형 primary
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
    },
    MuiToggleButtonGroup: {
      defaultProps: { fullWidth: true, exclusive: true },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          textTransform: 'none',
          fontWeight: 500,
          color: color.gray700,
          borderColor: color.gray500,
          '&.Mui-selected': {
            backgroundColor: color.blue700,
            color: color.white,
            fontWeight: 700,
            '&:hover': { backgroundColor: color.blue900 },
          },
        },
      },
    },
    MuiBottomNavigation: {
      defaultProps: { showLabels: true },
      styleOverrides: {
        root: {
          height: 'auto',
          minHeight: 56,
          paddingBottom: 'var(--mml-safe-bottom)',
          borderTop: `1px solid ${color.gray100}`,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 96,
          color: color.gray600,
          '&.Mui-selected': { color: color.blue700 },
        },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 16, margin: 16 } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: 16, gap: 8 } },
    },
    MuiDrawer: {
      styleOverrides: {
        // BottomSheet(모터 등록/수정) — anchor="bottom" 전용
        paperAnchorBottom: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
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
        standardWarning: { backgroundColor: color.amber50, color: color.amber800 },
        standardError: { backgroundColor: color.red50, color: color.red800 },
        standardSuccess: { backgroundColor: color.green50, color: color.green800 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: { notchedOutline: { borderColor: color.gray500 } },
    },
    MuiRadio: {
      styleOverrides: { root: { padding: 10 } }, // 24px 아이콘 + 20px 패딩 = 44px 타깃
    },
    MuiCheckbox: {
      styleOverrides: { root: { padding: 10 } },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 }, // 카드류 기본 무그림자 — variant="outlined" 사용
    },
  },
})
