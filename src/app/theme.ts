// src/app/theme.ts
// design-system.md v4.1 §8.2 — 토큰 정의는 src/shared/config/design-tokens.ts가 canonical (app→shared 방향).
// 소비 규칙: 컴포넌트에서 hex 직접 사용 금지. theme.palette/theme.vars 또는 design-tokens export 경유.
// v4: Pit-Wall Amber 리컬러 — 웜틴트 카본(umber) + 시그니처 코퍼(copper) 1색.
// v4.1: 시안 A 5축 완결 — 디스플레이 헤딩 모노스페이스(h1/h2)·소프트라운드 12px(버튼·인풋·카드,
// 컷코너 폐기)·카드 매트 카퍼 글로우 그림자·밀도 국소 조정(cardPad/sectionGap/버튼·인풋 패딩).
// colorSchemes 2벌 구조는 불변 — 컴포넌트 오버라이드 구조는 버튼/인풋/카드에 한해 v4.1로 갱신.
import { createTheme } from '@mui/material/styles'
import {
  buildModeCssVars,
  color,
  darkColor,
  displayFontStack,
  motionTokens,
  shapeTokens,
} from '@shared/config/design-tokens'

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
        primary: { main: darkColor.copper400, dark: darkColor.copper300, light: darkColor.copperTint, contrastText: darkColor.umber950 },
        error: { main: darkColor.red400, light: darkColor.redTint, contrastText: darkColor.umber950 },
        warning: { main: darkColor.amber400, light: darkColor.amberTint, contrastText: darkColor.umber950 },
        success: { main: darkColor.green400, light: darkColor.greenTint, contrastText: darkColor.umber950 },
        text: { primary: darkColor.cream100, secondary: darkColor.sand400, disabled: darkColor.sand700 },
        background: { default: darkColor.umber950, paper: darkColor.umber800 },
        divider: darkColor.hairline,
      },
    },
    light: {
      palette: {
        primary: { main: color.copper700, dark: color.copper800, light: color.copperTintL, contrastText: color.white },
        error: { main: color.red800, light: color.red50, contrastText: color.white },
        warning: { main: color.amber800, light: color.amber50, contrastText: color.white },
        success: { main: color.green800, light: color.green50, contrastText: color.white },
        text: { primary: color.stone900, secondary: color.stone600, disabled: color.stone300 },
        background: { default: color.cream50, paper: color.white },
        divider: color.stone100,
      },
    },
  },
  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', Roboto, 'Noto Sans KR', 'Malgun Gothic', sans-serif",
    // v4.1(§3.1): 디스플레이 2종만 모노스페이스 — 본문·라벨·버튼·인풋은 위 기본 휴머니스트 스택 그대로.
    h1: { fontFamily: displayFontStack, fontSize: 'clamp(1.75rem, 7vw, 2.125rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 },
    h2: { fontFamily: displayFontStack, fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.01em' },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.45 },
    caption: { fontSize: '0.75rem' },
    overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em', lineHeight: 1.4 }, // 본문 스택 유지(§3.1)
    button: { fontSize: '1rem', fontWeight: 700, letterSpacing: '0.01em', textTransform: 'none' }, // 본문 스택 유지(§3.1)
  },
  spacing: 8, // v4.1: 전역 유닛 미변경 — 밀도는 국소 오버라이드로 반영(§5.1 근거)
  shape: { borderRadius: shapeTokens.radius }, // v4.1: 4 → 12 — 버튼·인풋·카드 소프트라운드(§5, DS-A20). 다이얼로그 8·시트 상단 20은 개별 override로 별도 유지
  components: {
    MuiCssBaseline: {
      styleOverrides: (t) => ({
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
     * 버튼 (v4.1: 컷코너 폐기 — 후보 A 소프트라운드 12px, §5·DS-A20)
     * clip-path ::before 이중층 구조를 걷어내고 표준 MUI contained/outlined/text 배경 모델로
     * 복귀 — background-color가 root에 직접 걸리므로 forced-colors 실루엣 가드(구 transparent
     * border)가 더 이상 필요 없다(그 가드는 ::before 배경이 forced-colors에서 사라지는 문제의
     * 대응책이었다 — DS-A13 폐기). ripple은 계속 비활성(press scale 피드백 유지, v3 승계).
     * 패딩은 v4.1 밀도 전략(§5.1)에 따라 리터럴 px로 소폭 축소 — theme.spacing() 비경유라
     * 전역 파급 없음.
     * -------------------------------------------------------------- */
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: true },
      styleOverrides: {
        root: {
          minHeight: 48,
          borderRadius: shapeTokens.radius, // v4.1: 0(컷코너) → 12(소프트라운드)
          padding: '10px 20px', // v4.1 밀도(§5.1): MUI 기본보다 소폭 조밀 — minHeight가 44px 하한을 별도 보장
          position: 'relative',
          transition: `transform ${motionTokens.pressMs}ms ${motionTokens.easeStandard}, box-shadow ${hoverTransition}, border-color ${hoverTransition}, background-color ${hoverTransition}, color ${hoverTransition}`,
          '&:active': { transform: 'scale(0.98)' },
          '@media (prefers-reduced-motion: reduce)': { '&:active': { transform: 'none' } },
        },
        sizeLarge: {
          minHeight: 56,
          fontSize: '1.0625rem',
          letterSpacing: '0.02em',
          padding: '14px 24px', // v4.1 밀도(§5.1)
        },
        // contained/containedError의 배경·라벨색은 MUI 표준 palette 매핑(disableElevation로 그림자만 제거) —
        // v3처럼 별도로 backgroundColor를 재선언할 필요 없음(컷코너 ::before 폐기로 표준 경로 복귀).
        containedPrimary: ({ theme: t }) => ({
          // hover: 다크 = 밝기 상승(copper300) + 코퍼 글로우 / 라이트 = 침강(copper800) — v3 승계
          ...t.applyStyles('dark', {
            '&:hover': { boxShadow: `0 0 24px ${darkColor.copperGlow}` },
          }),
        }),
        containedError: {
          '&:hover': { filter: 'brightness(1.08)' },
        },
        // secondary 위계 — 소프트라운드 12px + 1px 보더(v4.1: 직각 → 라운드, 그 외 무변경)
        outlined: ({ theme: t }) => ({
          color: (t.vars ?? t).palette.text.primary,
          borderColor: 'var(--mml-outline)',
          '&:hover': {
            borderColor: (t.vars ?? t).palette.text.secondary,
            backgroundColor: (t.vars ?? t).palette.action.hover,
          },
        }),
        // tertiary 위계 — 시그니처 텍스트 + hover 밑줄 (형태 축 무관 — 무변경)
        text: ({ theme: t }) => ({
          color: (t.vars ?? t).palette.primary.main,
          '&:hover': {
            backgroundColor: 'transparent',
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
            textDecorationThickness: '2px',
          },
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
    },
    MuiToggleButtonGroup: {
      defaultProps: { fullWidth: true, exclusive: true },
      // v4.2(§5·§9.2): 직각(0) 과도기 종료 — root radius override를 제거했다(추가 안 함).
      // MUI 내장 grouped-edge 로직이 theme.shape.borderRadius(12)를 그룹 첫/끝 세그먼트
      // 바깥 모서리에만 자동 적용하고 중간 세그먼트 안쪽 모서리는 자체적으로 0 처리한다 —
      // 이 자동 처리를 신뢰하고 :first-of-type/:last-of-type을 손으로 재구현하지 않는다.
      // SegmentControl의 borderless(내부 radius 0 로컬 override — FormField가 프레임 소유)·
      // rounded(pill 999 — 리스트/필터 계열, §5.1) 두 변형은 이 정책과 독립, 무영향.
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          minHeight: 44,
          // v4.2: borderRadius 명시 제거(과거 0 강제 폐기) — 단독 ToggleButton과 그룹 바깥
          // 모서리는 theme.shape.borderRadius(12)를 그대로 물려받는다(위 MuiToggleButtonGroup 주석).
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
      // v4.1: 8 무변경 — 후보 A는 다이얼로그 축을 정의하지 않아 기존 값 승계, 12(카드)보다
      // 의도적으로 각진 위계 차등 유지(§5).
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
    /*
     * v4.1 주의(구현 담당 필독, §10): 실제 앱 폼 필드의 보더는 이 컴포넌트가 그리지 않는다 —
     * `shared/ui/form-field/FormField.tsx`와 `shared/ui/voltage-stepper/VoltageStepper.tsx`가
     * `.MuiOutlinedInput-notchedOutline`을 `border: 0`으로 직접 꺼버리고 자기 Box가 테두리를
     * 소유한다(라벨-위 레이아웃 채택 당시 설계, v2.13 — FormField.tsx 주석 참조). 그 결과 여기
     * root/notchedOutline의 radius를 12로 올려도 **화면에는 반영되지 않는다** — FormField.tsx·
     * VoltageStepper.tsx의 감싸는 Box(`border: '1px solid'`)에 `borderRadius: shapeTokens.radius`
     * (12)를 직접 추가해야 시안 A의 인풋 형태 언어가 실제로 보인다. 그 두 파일은
     * design-system.md 범위 밖(§10 하류 지시) — 이 오버라이드는 그 두 컴포넌트를 쓰지 않는
     * 잔여 TextField(있다면)에만 유효하다.
     */
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: shapeTokens.radius }, // v4.1: 소프트라운드 12px(§5)
        notchedOutline: { borderColor: 'var(--mml-outline)' },
        input: { padding: '12px 14px' }, // v4.1 밀도(§5.1): MUI 기본(16.5px)보다 소폭 조밀
      },
    },
    MuiRadio: {
      styleOverrides: { root: { padding: 10 } }, // 24px 아이콘 + 20px 패딩 = 44px 타깃
    },
    MuiCheckbox: {
      styleOverrides: { root: { padding: 10 } },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 }, // 카드류 기본 — variant="outlined"(1px 보더, v4.1: + 매트 그림자)
      styleOverrides: {
        root: { borderRadius: shapeTokens.radius }, // v4.1: 소프트라운드 12px(§5). Dialog/Drawer는 자체 paper override로 별도 유지(8/20) — variant="outlined"를 쓰지 않아 무영향
        outlined: ({ theme: t }) => ({
          transition: `border-color ${hoverTransition}, box-shadow ${hoverTransition}`,
          // v4.1(§5): 매트 카퍼 글로우 그림자(후보 A --st-shadow) — 카드류 전용, outlined variant만
          boxShadow: `0 4px 20px ${darkColor.copperShadow}, 0 1px 2px rgba(0, 0, 0, 0.4)`,
          ...t.applyStyles('light', {
            boxShadow: `0 4px 16px ${color.copperShadowL}, 0 1px 2px rgba(36, 28, 22, 0.06)`,
          }),
          // hover 시 헤어라인 승격 — 카드 인터랙션 미세 피드백 (다크 전용 장식)
          ...t.applyStyles('dark', {
            '&:hover': { borderColor: darkColor.hairlineStrong },
          }),
        }),
      },
    },
  },
})
