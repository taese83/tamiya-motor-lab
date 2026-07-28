# Design System — minicar-motor-lab

> Phase 2 Wave 1 산출물 (design-system-architect).
> 입력: `_workspace/01_plan/project-brief.md`(§design-system-architect) · `ux-brief.md` · `tech-stack.md`(AD-8: MUI 7.3.0 + Emotion 최소 theme) · `checkpoint-phase1.md`(CP-1~3) · `analysis-algorithm.md` v2(§1 status 6종, §출력 계약).
> 소비자: layout-designer · component-designer(Phase 2), **app-shell-builder(Phase 3 — §8 theme 코드 블록을 `src/app/theme.ts`로 그대로 이식)**.
> 원칙 준수: 사용자 확정 방향 "최대한 심플 — 수치 중심, 차트·게이지·일러스트 없음, 모바일 세로 전용, MUI 기본 + 토큰 오버라이드만". 커스텀 컴포넌트는 F10 킷 최소한(BigNumber·StatusLabel·VoltageStepper 등)으로 한정한다.

## 0. 디자인 방향 요약

| 항목 | 결정 |
|---|---|
| 비주얼 성격 | 계측 도구(instrument) — 장식 0, 수치 텍스트가 유일한 주인공. 튜너/스톱워치 계열의 절제된 톤 |
| 테마 | **light 단일** (다크 미지원 — ASSUMPTION DS-A1, §10) |
| 색 사용 | 시맨틱 5색(primary/error/warning/success/neutral)만. 색은 항상 라벨 텍스트+아이콘과 병행 — 색 단독 상태 구분 금지 (REQ-NFR-003) |
| 타이포 | 시스템 폰트 스택(웹폰트 미도입 — DS-A2), 수치는 전부 **tabular-nums**(갱신 시 layout shift 방지) |
| 밀도 | 모바일 세로 단일 컬럼, content max-width 480px 중앙, 터치 타깃 ≥44×44px |
| 표면 | 그림자 최소화 — 카드류는 `Paper variant="outlined"`, elevation은 Dialog/Drawer/Snackbar MUI 기본만 |
| 토큰 소비 규칙 | **컴포넌트에서 hex 직접 사용 금지** — `theme.palette` 또는 §8 export 토큰(`measureStatusTokens` 등) 경유. 이 규칙이 다크 확장 경로(DS-A1)의 전제 |

## 1. 색상 팔레트 (light 기준)

### 1.1 원시 토큰

| 토큰 | 값 | 역할 |
|---|---|---|
| `blue700` | `#1565C0` | **primary.main** — CTA·선택 상태·measuring 라벨. 흰 글자 5.7:1 |
| `blue900` | `#0D47A1` | primary.dark — stable 강조·pressed |
| `blue50` | `#E3F2FD` | stable 수치 영역 배경 tint |
| `red800` | `#C62828` | **error / destructive** — 삭제·no-permission·저장 실패 |
| `red50` | `#FDEDED` | error 배경 tint |
| `amber800` | `#A15C00` | **warning** — weak-signal·저장 불가 배너 (진한 앰버 — 대비 확보용) |
| `amber50` | `#FFF4E5` | warning 배경 tint |
| `green800` | `#2E7D32` | **success / positive — 만족** 전용 |
| `green50` | `#EAF4EB` | success 배경 tint |
| `gray900` | `#1C1B1F` | text.primary·**확정(stable) 수치** |
| `gray700` | `#444746` | 중립 상태 전경(idle·suspended)·아이콘 |
| `gray600` | `#5F6368` | text.secondary·**measuring 미확정 수치**(중간 명도 톤) |
| `gray500` | `#747775` | 입력 외곽선(outlined input border — 비텍스트 3:1 충족) |
| `gray300` | `#C4C7C5` | disabled 전경 |
| `gray100` | `#F1F3F4` | divider·suspended 배경 |
| `gray50` | `#F8F9FA` | background.default (앱 바탕) |
| `white` | `#FFFFFF` | background.paper (surface) |

### 1.2 WCAG 2.2 AA 대비 검증 (계산치 — QA gate에서 axe로 재검증)

| 조합 | 용도 | 대비 | 기준 | 판정 |
|---|---|---:|---|---|
| gray900 / white | 본문·확정 수치 | 17.1:1 | 4.5:1 | 통과(AAA) |
| gray700 / white | 중립 상태 라벨 | 9.4:1 | 4.5:1 | 통과 |
| gray600 / white | 보조 텍스트·measuring 수치 | 6.0:1 | 4.5:1 (대형 수치는 3:1) | 통과 |
| blue700 / white (양방향) | primary 버튼(흰 글자)·measuring 라벨 | 5.7:1 | 4.5:1 | 통과 |
| blue900 / blue50 | stable 상태 라벨 | 7.6:1 | 4.5:1 | 통과 |
| gray900 / blue50 | stable 확정 수치 | 14.9:1 | 3:1 (대형) | 통과 |
| amber800 / amber50 | weak-signal 라벨·안내 | 4.8:1 | 4.5:1 | 통과 |
| amber800 / white | 전역 저장 불가 배너 | 5.2:1 | 4.5:1 | 통과 |
| red800 / red50 | no-permission 라벨·안내 | 5.0:1 | 4.5:1 | 통과 |
| red800 / white (양방향) | destructive 버튼(흰 글자)·오류 텍스트 | 5.6:1 | 4.5:1 | 통과 |
| green800 / white (양방향) | 만족 표시·success 토글 | 5.1:1 | 4.5:1 | 통과 |
| gray500 / white | 입력 외곽선 | 4.5:1 | 3:1 (비텍스트) | 통과 |

- disabled(`gray300`)는 대비 예외 대상(WCAG 1.4.3 incidental). divider(`gray100`)는 장식 — 의미 있는 경계는 gray500을 쓴다.
- RPM 대형 수치(≥56px)는 대형 텍스트 기준 3:1이지만, 위 표는 전부 4.5:1 이상으로 여유를 뒀다.

## 2. 측정 상태 6종 시각 토큰 (S1 핵심 계약)

status enum은 `idle · measuring · stable · weak-signal · no-permission · suspended` (analysis-algorithm v2 §1 canonical, 타입은 shared 단일 정의). 시각 토큰은 §8 `measureStatusTokens`로 export되며 아래 표와 1:1이다.

| status | 라벨(ux-brief §5) | fg (라벨·아이콘) | bg (수치 영역) | valueFg (수치/―) | icon | 비색상 구분 장치 |
|---|---|---|---|---|---|---|
| `idle` | "측정 대기" | gray700 | white | — (수치 없음, 안내 1줄) | `mic` | 대형 [녹음 활성화] 버튼이 주인공 |
| `measuring` | "측정 중" | blue700 | white | **gray600 (중간 명도 = 미확정 톤)** | `pulse-dot` (펄스 점) | 라벨 "측정 중" 상시 + 펄스 애니메이션 |
| `stable` | "측정 완료 · 확정" | blue900 | **blue50 (배경 tint 전환 1회)** | **gray900 (고대비 확정 톤)** | `lock` | **잠금 아이콘 + 라벨 + 배경 3중** + 갱신 정지 + [기록 만들기] CTA 노출 |
| `weak-signal` | "신호 약함" | amber800 | amber50 | gray700 — 단 **수치 미표시, "—" placeholder만** | `signal-low` | 숫자가 화면에 없음(0·이전 값 금지 — REQ-ST-003) |
| `no-permission` | "마이크 권한 필요" | red800 | red50 | gray700 (안내 문구) | `mic-off` | 일시/영구 문구 분리 + 복구 버튼 상시 |
| `suspended` | "오디오 일시 중지됨" | gray700 | gray100 | gray700 (안내 문구) | `pause` | [탭하여 다시 시작] 대형 버튼 — 오류 톤(red) 아님, 플랫폼 상태 |

**a11y 규칙 (전 상태 공통)**
1. **색 단독 구분 금지**: fg/bg 토큰은 반드시 라벨 텍스트+아이콘과 함께 렌더링한다. StatusLabel 컴포넌트가 이 3요소를 캡슐화한다(아이콘 없는 사용 금지).
2. 상태 전이는 `aria-live="polite"` 영역에서 텍스트로 알림 — 문구는 component-designer 소유("측정 완료, 18,540 RPM" 등).
3. measuring ↔ stable 구분은 **라벨·색·잠금 아이콘 3중** (ux-brief §5). 추가로 수치 색이 gray600(미확정) → gray900(확정)으로 전환되어 명도 차로도 구분된다.
4. **stable 잠금 시각 신호**: 배경 white→blue50 tint 전환 1회(400ms, §7 모션 토큰) + lock 아이콘 + 수치 갱신 정지. `prefers-reduced-motion`이면 전환 즉시(0ms) — 최종 상태(배경색·아이콘·라벨)만으로 구분이 성립해야 하며, 애니메이션은 보조 신호일 뿐이다.
5. weak-signal의 "—"(em dash)는 RPM 수치와 동일한 타이포 토큰(`rpmValue`)으로 렌더 — 수치 영역 높이 고정 유지(§3.4).

## 3. 타이포그래피

### 3.1 폰트 스택 (DS-A2 — 웹폰트 미도입)

```
-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI',
Roboto, 'Noto Sans KR', 'Malgun Gothic', sans-serif
```

- iOS(SF Pro)·Android(Roboto) 모두 `font-variant-numeric: tabular-nums`를 지원한다(Roboto는 숫자가 기본 등폭). 실기기 세션에서 RPM 갱신 흔들림 확인(DS-A2 검증 항목).

### 3.2 수치 타이포 위계 (핵심 — 전부 tabular-nums)

| 토큰 | 용도 | 크기 | 굵기 | 기타 |
|---|---|---|---|---|
| `rpmValue` | S1 RPM 대형 수치 (확정·실시간 공통) / weak-signal "—" | `clamp(56px, 18vw, 96px)` | 700 | lineHeight 1, letterSpacing −0.02em. **상태 간 크기 동일 — 크기가 아니라 색(gray600↔gray900)·라벨·아이콘으로 확정/미확정 구분** (크기 변경은 layout shift 유발 금지 사항) |
| `fanoValue` | S1 파노 보조 수치 | `clamp(20px, 6.5vw, 28px)` | 500 | lineHeight 1.3, 단위 "Hz" 포함 |
| `guideRange` | S5 추천 전압 범위 (`추천 2.8 ~ 3.0 V`) | `clamp(32px, 10vw, 44px)` | 700 | lineHeight 1.15 |
| `listValue` | S3/S4 목록 행 내 수치(전압·RPM) | 15px (0.9375rem) | 500 | 본문과 같은 줄 흐름 |

- 단위 라벨("RPM"·"Hz"·"V")은 수치보다 작게·`text.secondary`로 — 수치가 위계 1순위 (ux-brief §1).
- **tabular-nums 강제**: 위 4개 토큰 전부 `fontVariantNumeric: 'tabular-nums lining-nums'`. 실시간 갱신(≥10Hz)에서 자릿수 폭이 고정되어 layout shift가 없다. §8 `numericTypography`로 export.

### 3.3 수치 포맷 규칙 (표시 계약 — shared/lib 포맷 유틸 1곳에서 구현)

| 값 | 포맷 | 예 |
|---|---|---|
| RPM | 정수, 천단위 구분 `Intl.NumberFormat('ko-KR')` | `18,540` |
| 파노 | 소수 1자리 고정 `toFixed(1)` + ` Hz` | `309.0 Hz` |
| 전압 | 소수 1자리 표시 + ` V` (A5: 입력 허용은 소수 ≤2자리) | `2.8 V`, 범위 `2.8 ~ 3.0 V` |
| 값 없음 | em dash `—` (0·빈문자열·이전 값 금지) | `—` |

### 3.4 수치 영역 고정 높이 (layout shift 금지)

- 토큰: `measureValueMinHeight = clamp(160px, 48vw, 208px)` (§8 `layoutTokens`). S1 중앙 수치 영역은 **6-status 전부 이 높이로 고정** — 수치↔안내 문구↔"—" 전환 시 화면이 튀지 않는다 (ux-brief §1-6).
- 값 자체는 layout-designer가 조정 가능(DS-A3), 단 "상태 간 동일 높이" 불변식은 유지.

### 3.5 일반 텍스트 스케일 (MUI variant 매핑)

| variant | 크기/굵기 | 용도 |
|---|---|---|
| h1 | 22px / 700 | 페이지 타이틀 (스택 화면 헤더) |
| h2 | 18px / 600 | 섹션 제목 (폼 그룹·근거 블록) |
| body1 | 16px / 400, lh 1.5 | 본문·안내 문구·폼 라벨 |
| body2 | 14px / 400, lh 1.45 | 목록 보조 정보·근거 텍스트 |
| caption | 12px / 400 | 단위 라벨·타임스탬프 |
| button | 16px / 600, textTransform none | 전 버튼 (대문자 변환 없음) |

## 4. 시맨틱 색 규칙 (만족·등급·결과·destructive)

| 대상 | 규칙 | 근거 |
|---|---|---|
| **만족 체크** | **positive = success(green800) 전용**. S2 토글 `Switch color="success"` + 라벨 "이 세팅에 만족" 상시. S4 목록 행은 `star` 아이콘(green800)+색 병행 — 미만족은 아이콘 자체 없음(빈 별 금지 — 심플) | 만족이 가이드 집계의 유일 원천 — 시각적으로도 유일한 positive |
| **주행 결과 3종** (`완주·코스아웃·미주행` — D4) | **중립 텍스트 — 시맨틱 색 미부여**. 세그먼트 선택 상태만 primary. 코스아웃에 red 금지 — 결과는 실패가 아니라 데이터 | DS-A5. red는 destructive 전용 예약 |
| **모터 등급 4단계** (`신품·길들이기중·전성기·노화` — CP-1a) | **중립 텍스트/outlined Chip — 가치판단 색 미부여**. 노화≠나쁨(용도 정보) | DS-A5. 등급 enum은 shared/config 상수 1곳 |
| **destructive** | error(red800) contained 버튼 — 삭제·resetAllData에만. ConfirmDialog 계약(§9) 밖에서 red 버튼 금지 | REQ-ST-007, CP-3, F-1 |
| **warning(amber)** | weak-signal·전역 저장 불가 배너 전용. 분산 큼 보조 문구(S5)는 `text.secondary` 중립 텍스트(경고 아님 — 정보) | 색 의미 과잉 방지 |
| **primary(blue)** | 행동(CTA)·선택(세그먼트/탭/라디오)·진행(measuring)·확정(stable) — "측정 여정"의 단일 축 | 브랜드=도구 신뢰성 |

## 5. 간격·크기 토큰

| 토큰 | 값 | 용도 |
|---|---|---|
| spacing base | **8px** (`theme.spacing(1)`) | MUI 기본 유지 |
| 스케일 | 4 / 8 / 16 / 24 / 32 / 48 | 0.5=인라인 갭, 1=관련 요소, 2=화면 좌우 패딩·카드 내부, 3=폼 필드 간, 4=섹션 간, 6=대형 버튼 상하 여백 |
| `contentMaxWidth` | 480px | 전 화면 콘텐츠 중앙 정렬 (REQ-NFR-002 — 태블릿/데스크탑 동일 레이아웃) |
| 화면 좌우 패딩 | 16px | 단일 컬럼 기준 |
| `touchTargetMin` | **44×44px** | 전 인터랙티브 요소 하한 (REQ-NFR-003 — WCAG 2.2 2.5.8의 24px보다 엄격한 프로젝트 기준) |
| 버튼 높이 | 기본 48px / 대형(S1 primary) 56px | theme `MuiButton` 오버라이드 |
| 목록 행 높이 | ≥56px | 모터 카드·기록 행·라디오 행 |
| `bottomNavHeight` | 56px (+safe-area) | 하단 탭 |
| radius | 기본 12px / Dialog·BottomSheet 16px / Chip·인풋 내부 8px | `shape.borderRadius: 12` |

### safe-area (iOS 노치·홈 인디케이터)

- 전제: `index.html`에 `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` — **app-shell-builder 필수 반영**.
- CSS 변수 (CssBaseline `:root`에서 정의, §8):
  - `--mml-safe-top: env(safe-area-inset-top, 0px)` — 전역 고정 배너·스택 헤더 상단 패딩
  - `--mml-safe-bottom: env(safe-area-inset-bottom, 0px)` — BottomNavigation·BottomSheet 하단 패딩, Snackbar offset
- 적용 규칙: BottomNavigation 높이 = `56px + var(--mml-safe-bottom)` (콘텐츠는 56px 안, 패딩으로 확장). Snackbar bottom = `calc(56px + var(--mml-safe-bottom) + 8px)` — 탭 바 위에 뜬다.

## 6. 포커스·forced-colors·모션 (WCAG 2.2)

| 항목 | 계약 |
|---|---|
| **focus ring** | 전역 `*:focus-visible { outline: 2px solid #1565C0; outline-offset: 2px }` — **box-shadow가 아니라 outline** (forced-colors 모드에서 살아남는 유일한 방식). tint 배경(blue50 등) 위에서도 인접 대비 ≥3:1 |
| **forced-colors** (Windows 고대비) | `forced-color-adjust` 비활성화 금지 — 시스템 색 승계 허용. 상태 구분은 어차피 라벨+아이콘이 보장(§2 규칙 1). 세그먼트 선택은 체크 아이콘 병행(§9 SegmentControl)이라 배경색 소실에도 생존 |
| **prefers-reduced-motion** | CssBaseline 전역 오버라이드(§8)로 애니메이션·전환 0ms. 영향: measuring 펄스 점(정지 점으로 대체 — 라벨 "측정 중"이 상태 전달), stable 배경 전환(즉시). **모든 상태는 정지 화면만으로 판별 가능해야 한다** |
| 모션 토큰 | `stableTransitionMs: 400`(1회, 반복 금지) / `pulsePeriodMs: 1200`(measuring 점). 그 외 커스텀 애니메이션 금지 — MUI 기본 트랜지션만 |
| 터치 타깃 | §5 44px — Radio/Checkbox 패딩 오버라이드로 충족(§8) |

## 7. 다크 모드 판단

**light 단일 — 다크 미지원** (ASSUMPTION DS-A1, §11). 판단 근거:
1. 사용자 확정 방향 "최대한 심플" — 상태 6종×시맨틱 5색의 AA 대비 매트릭스를 두 벌 유지하는 비용이 개인 도구 가치 대비 과잉.
2. 사용 맥락: 모터 측정은 주간·실내외 밝은 환경이 지배적 — light가 판독성 유리.
3. 데이터 대시보드류 장시간 주시 화면 아님(측정 3초 확정 후 종료).

확장 경로(비용 최소화 장치): §8 theme은 `cssVariables: true`로 생성 — 후속에 `colorSchemes: { dark }` 추가만으로 확장 가능하다. 전제는 §0 토큰 소비 규칙(hex 직접 사용 금지)이며, 이 규칙은 지금부터 강제한다.

## 8. MUI Theme 설정 (Phase 3 `src/app/theme.ts` — 이 블록을 그대로 이식)

```ts
// src/app/theme.ts
// design-system.md §8 원본 — 수정 시 문서와 동기화할 것.
// 소비 규칙: 컴포넌트에서 hex 직접 사용 금지. theme.palette 또는 아래 export 토큰 경유.
import { createTheme } from '@mui/material/styles'

/* ------------------------------------------------------------------ *
 * 1. 원시 색 토큰 (light 단일 — DS-A1. §1.2 대비 검증 완료 값만 사용)
 * ------------------------------------------------------------------ */
const color = {
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

/* ------------------------------------------------------------------ *
 * 5. MUI theme — 최소 오버라이드 (AD-8: MUI 기본 + 토큰만)
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
```

이식 시 주의 (app-shell-builder):
- `index.html` viewport meta에 `viewport-fit=cover` 필수 (§5 safe-area 전제).
- `MeasureStatus` 타입이 shared에 생기면 `measureStatusTokens`의 키 타입을 그 타입으로 결속(`Record<MeasureStatus, MeasureStatusVisual>`)해 enum-토큰 불일치를 컴파일 오류로 만든다.
- `CssBaseline`(또는 `ScopedCssBaseline`)을 프로바이더 트리에 반드시 포함 — safe-area 변수·focus ring·reduced-motion이 여기서 나온다.

## 9. 컴포넌트 인벤토리 (F10 킷 ↔ MUI 매핑)

상세 인터랙션 계약은 component-designer 소유. 여기서는 매핑·토큰 소비·핵심 규칙만 고정한다.

| 컴포넌트 | FSD 위치 | MUI 매핑 | 핵심 규칙 (토큰 소비) |
|---|---|---|---|
| 하단 탭 바 | `app/` (shell 조립) | **BottomNavigation** + Action ×3 | 탭 3(측정·이력·가이드) 라벨 상시 노출(showLabels), 높이 56+safe-area, 선택=primary+라벨(색 단독 아님). 아이콘: `mic`·`list`·`bolt` |
| StatusLabel | `shared/ui/status-label` | 커스텀 (Box+아이콘+텍스트) | `measureStatusTokens` 유일 소비자 — 라벨+색+아이콘 3요소 캡슐화, 아이콘 없는 렌더 금지. aria-live 문구는 별도 영역(component-designer) |
| BigNumber | `shared/ui/big-number` | 커스텀 (Box) | `numericTypography.rpmValue/fanoValue` + `layoutTokens.measureValueMinHeight` 고정 높이. placeholder "—" 지원, §3.3 포맷 규칙 준수 |
| SegmentControl | `shared/ui/segment-control` | **ToggleButtonGroup** (exclusive, fullWidth) | 용도 2곳: ① 주행 결과 3택 `완주·코스아웃·미주행`(D4, 필수) ② 모터 등급 4택 `신품·길들이기중·전성기·노화`(CP-1a, 선택 — 기본값 허용). 선택 상태 = 배경(blue700)+굵기(700)+**체크 아이콘 병행**(forced-colors·색각 대응). 최소 높이 44. 4택은 320px 뷰포트에서 fontSize 13px 축소 허용(줄바꿈 금지) |
| VoltageStepper | `shared/ui/voltage-stepper` | 커스텀: OutlinedInput(`inputmode="decimal"`) + IconButton ± ×2 | ±0.1V 스텝, 허용 0.1~9.9V(A5 — `shared/config` 상수), 표시 소수 1자리 `listValue` tabular-nums. ± 버튼 각 48×48. 범위 밖·비수치 = 인라인 필드 오류(error.main)+저장 거부 |
| 만족 토글 | `features/record-entry` (조립) | **Switch** `color="success"` + FormControlLabel | 라벨 "이 세팅에 만족" 상시(§4). 행 높이 ≥44. 상태는 스위치 위치+색 병행 |
| ConfirmDialog | `shared/ui/confirm-dialog` | **Dialog** | destructive 계약: 삭제 버튼 = `error` contained(흰 글자 5.6:1) 우측 배치, **초기 포커스 = [취소]**(Enter 오폭 방지), focus trap(MUI 기본)+닫힘 후 트리거 복귀. cascade 문구에 실측 건수 "기록 n건이 함께 삭제됩니다"(CP-3). `resetAllData`도 동일 계약(checkpoint F-1) |
| Toast | `shared/ui/toast` | **Snackbar** | bottom center, 탭 바 위 offset(theme 오버라이드), autoHide 3000ms. **성공 확인 전용**("저장됨") — 오류는 Toast 금지, 인라인 Alert+재시도 버튼 |
| BottomSheet | `shared/ui/bottom-sheet` | **Drawer** `anchor="bottom"` | 모터 등록/수정 시트. 상단 radius 16, safe-area 하단 패딩, max-width 480 중앙(theme 오버라이드) |
| 전역 상태 배너 | `app/` | **Alert** `severity="warning"` 상단 고정 | IndexedDB 불가: "이 브라우저에서는 기록이 저장되지 않습니다 (측정은 가능)". safe-area-top 패딩, 닫기 버튼 없음(상태 지속형). 레이아웃 자리는 layout-designer가 전 화면에 확보 |
| 인라인 오류 배너 | 각 feature 조립 | **Alert** `severity="error"` + action | 저장/읽기 실패 — 오류 문구+[다시 저장]/[다시 시도] 버튼 동반(ux-brief §1-3). 성공 위장 금지 |
| 측정값 카드 | `features/record-entry` | **Paper** `variant="outlined"` | 자동 채움 시 파노·RPM 읽기전용(`listValue`) + [비우기] 텍스트 버튼만. 직접 입력 진입 시 "측정값 없음 (직접 입력 기록)" 중립 문구(D2) |
| 모터 라디오 리스트 | `entities/motor/ui` | RadioGroup + FormControlLabel | S2·S5 공통 패턴, 최근 사용순(FP-A1). 행 높이 ≥56, Radio 패딩 오버라이드로 44 타깃 |
| 등급 Chip (표시용) | `entities/motor/ui` | **Chip** `variant="outlined"` size small | S3 모터 카드에 등급 텍스트 표시 — 중립색(gray700/gray500 테두리), 가치판단 색 금지(§4) |
| PageHeader (스택 화면) | `shared/ui/page-header` | 커스텀 (Box + IconButton) | 뒤로가기 `chevron-left` 48×48 + h1 타이틀. AppBar 미사용(그림자·장식 배제) |
| EmptyState | `shared/ui/empty-state` | 커스텀 (Box + Button) | 빈 상태 안내 1~2줄(`text.secondary`) + primary 행동 버튼 1개 — 오류로 위장 금지(E-1) |

### 아이콘 인벤토리 (개별 SVG + vite-plugin-svgr — @mui/icons-material 미설치)

`mic` `mic-off` `lock` `pause` `signal-low` `check` `plus` `trash` `pencil` `star` `chevron-left` `close` `list` `bolt` — 14종.
규격: 24×24 viewBox, `fill="currentColor"`(색은 토큰 상속), `aria-hidden="true"` 기본(의미 전달은 항상 병행 텍스트). `pulse-dot`은 아이콘이 아니라 CSS 원+애니메이션(StatusLabel 내부, `motionTokens.pulsePeriodMs`).

## 10. 하류 지시 요약

- **layout-designer**: §3.4 수치 영역 고정 높이 불변식 / §5 safe-area 변수·전역 배너 자리 / `contentMaxWidth` 480 중앙 / 모든 상태에서 primary 버튼 정확히 1개(ux-brief §9).
- **component-designer**: §2 상태 토큰 표가 StatusLabel/BigNumber 계약의 색 원천 / §9 표의 "핵심 규칙" 열을 상세 계약으로 확장 / 등급 4택 라벨(CP-1a)은 사용자 노출 확인 대상 — `shared/config` 상수 1곳 유지 / aria-live 문구 명세.
- **state-contract-designer**: 시각 토큰 키 = `MeasureStatus` enum 1:1 결속(§8 이식 주의) — enum 변경 시 theme 컴파일 오류로 검출.
- **app-shell-builder(Phase 3)**: §8 코드 블록 → `src/app/theme.ts` 그대로 / viewport-fit=cover / CssBaseline 포함 / `src/app/theme.ts` 외의 곳에서 hex 사용 금지 lint 관례.

## 11. ASSUMPTION (검토 시 이의 없으면 유지)

| ID | 내용 | 근거·검증 |
|---|---|---|
| DS-A1 | **다크 모드 미지원 — light 단일** | §7. 확장 경로: `cssVariables: true` + hex 직접 소비 금지 규칙으로 후속 `colorSchemes.dark` 추가 비용 최소. 사용자 요구 발생 시 재검토 |
| DS-A2 | **웹폰트 미도입 — 시스템 폰트 스택** | 패키지·정적 자산 0 추가(심플·성능). tabular-nums는 SF Pro(iOS)·Roboto(Android) 지원. 검증: Phase 2 실기기 세션에서 RPM 실시간 갱신 흔들림 확인 |
| DS-A3 | S1 수치 영역 고정 높이 = `clamp(160px, 48vw, 208px)` | layout-designer가 값 조정 가능 — 단 "6-status 동일 높이" 불변식은 유지 |
| DS-A4 | stable 전환 효과 = 배경 tint 400ms 1회 (아이콘·라벨은 즉시) | ux-brief §14-2 실기기 체감 검토 — 부족 시 vibrate 추가 검토(범위 외 보류). reduced-motion 시 0ms |
| DS-A5 | 주행 결과·모터 등급에 시맨틱 색 미부여(중립) — green=만족, red=destructive 전용 예약 | §4. 색 의미 과잉 방지. 사용자 검토에서 등급별 색 요구 시 토큰 1곳 추가로 대응 |

승계 baseline (본 문서에서 그대로 사용, 임의 확정 없음): CP-1a 등급 enum 4단계(component-spec 검토 시 사용자 확인) · D4 주행 결과 3택(Phase 3 전 어휘 재확인 — 라벨 맵 상수 교체만) · A5 전압 0.1~9.9V.
