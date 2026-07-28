# Design System — minicar-motor-lab (v2 — 다크 기본 + 라이트 토글, 레이싱 계기판)

> **v2 개정판** (design-system-architect, 2026-07-28). v1(light 단일)을 사용자 결정으로 개정 — DS-A1 폐기.
> 입력: v1 본 문서 · `_workspace/03_dev/change-scope.md`(순수 프리젠테이션 변경 계약) · 현행 `src/shared/config/design-tokens.ts` · `src/app/theme.ts` · 사용자 확정 방향("레이싱 계기판 무드, 다크 기본 + 라이트 토글, 토글 영속").
> 소비자: 재설계 구현 담당(app-shell/theme 개정) · shared/ui 스타일 조정 담당. **§8 코드 블록 2개(design-tokens.ts · theme.ts)는 그대로 이식 가능해야 한다.**
> 불변 계약(change-scope): 기능·데이터·라우팅·상태 머신·컴포넌트 public props·FSD 경계 불변. 상태 6종 3요소 병행(REQ-NFR-003) · tabular-nums · 고정 높이 · 44px 타깃 · WCAG 2.2 AA — 다크/라이트 각각.

## 0. 디자인 방향 요약 (v2)

| 항목 | 결정 |
|---|---|
| 비주얼 성격 | **레이싱 계기판(tachometer/instrument cluster)** — 장식 없는 계측 도구 골격(v1)은 유지하되, 다크 표면 위 고대비 흰 숫자가 주인공. RPM 대형 숫자 = 계기판의 바늘 |
| 테마 | **다크 기본 + 라이트 토글** (v1 DS-A1 폐기 — 사용자 명시 결정). 토글 선택은 localStorage 영속(`mml-mode`) |
| 깊이 표현 | **그림자 대신 표면 밝기 단차 + 1px 헤어라인 보더**(white 10% alpha). 다크: 순흑 배경(#05060A) → 카드 표면(#12151B) → 상승 표면(#1A1F28) 3단 |
| 악센트 규율 | 레이싱 앰버(#FFB300)·레드(#FF5A5F)는 **의미 있는 순간에만** — measuring 활성 펄스, weak-signal 경고, destructive/no-permission. stable 확정 = shift-light처럼 블루 잠금(bg tint + lock). **만족 = 그린 유지** |
| 다크 시맨틱 색 | light용 800 계열 → 다크용 300~400 계열로 채도·명도 상향 조정 — AA 대비 확보 (§1.3) |
| 라이트 팔레트 | v1 값 그대로 승계. 단 measuring 악센트만 blue700 → **amber800**으로 교체(모드 간 악센트 의미 일치 — DS-A6) |
| 타이포·밀도 | v1 불변 — 시스템 폰트(웹폰트 금지), 전 수치 tabular-nums, 수치 영역 고정 높이, 480px 중앙, 터치 타깃 ≥44px. **rpmValue 크기·클램프 변경 금지(layout 계약)** — 계기판 무드는 색·표면으로만 |
| 토큰 소비 규칙 | **hex 직접 소비 금지** — `theme.palette`/`theme.vars` 또는 design-tokens export 경유. 상태 색은 CSS 변수 간접층(`--mml-status-*`)이라 컴포넌트 코드 무변경으로 모드 전환 |

## 1. 색상 팔레트

### 1.1 원시 토큰 — light (v1 승계, 값 불변)

| 토큰 | 값 | 역할 (v2 변경점만 굵게) |
|---|---|---|
| `blue700` | `#1565C0` | primary.main — CTA·선택·**stable 여정** (v2: measuring 라벨에서는 제외) |
| `blue900` | `#0D47A1` | primary.dark — stable 강조·pressed |
| `blue50` | `#E3F2FD` | stable 수치 영역 배경 tint |
| `red800` | `#C62828` | error / destructive — 삭제·no-permission·저장 실패 |
| `red50` | `#FDEDED` | error 배경 tint |
| `amber800` | `#A15C00` | warning — weak-signal·저장 불가 배너 + **v2: measuring 라벨·펄스**(레이싱 앰버의 light 대응) |
| `amber50` | `#FFF4E5` | warning 배경 tint |
| `green800` | `#2E7D32` | success / positive — 만족 전용 |
| `green50` | `#EAF4EB` | success 배경 tint |
| `gray900` | `#1C1B1F` | text.primary·확정(stable) 수치 |
| `gray700` | `#444746` | 중립 상태 전경(idle·suspended) |
| `gray600` | `#5F6368` | text.secondary·measuring 미확정 수치 |
| `gray500` | `#747775` | 입력 외곽선 (비텍스트 3:1) |
| `gray300` | `#C4C7C5` | disabled 전경 |
| `gray100` | `#F1F3F4` | divider·suspended 배경 |
| `gray50` | `#F8F9FA` | background.default |
| `white` | `#FFFFFF` | background.paper |

### 1.2 원시 토큰 — dark (v2 신설, 레이싱 계기판)

| 토큰 | 값 | 역할 |
|---|---|---|
| `night950` | `#05060A` | **background.default** — 순흑 블루블랙(계기판 베젤 밖). `<meta theme-color>` 다크 값 |
| `night900` | `#0C0F15` | **S1 수치 영역 기본 bg**(idle·measuring — 베젤 안 다크 글래스). 페이지 배경보다 미세하게 밝음 + 헤어라인 보더로 베젤 표현 |
| `night700` | `#12151B` | **background.paper** — 카드·시트·탭 바 표면 |
| `night600` | `#1A1F28` | 상승 표면 — suspended bg·hover 표면 |
| `hairline` | `rgba(255,255,255,0.10)` | **divider·1px 헤어라인 보더** — 그림자 대체 깊이 장치(장식, 대비 요건 비대상) |
| `ice100` | `#F5F7FA` | text.primary — 고대비 흰 글자(18.9:1) |
| `ice300` | `#C3CBD9` | **measuring 미확정 수치** — 순백 직전의 밝은 톤(11.8:1). 확정(white)과의 명도 단차 유지 |
| `slate400` | `#9AA3B2` | text.secondary·중립 상태 전경(idle·suspended)·"—" placeholder |
| `slate500` | `#6A7684` | 입력 외곽선·SegmentControl 보더 (비텍스트 3.9:1) |
| `slate600` | `#556070` | disabled 전경 |
| `blue300` | `#64B5F6` | **primary.main(다크)** — CTA·선택·stable 잠금. 다크 위 9.1:1, contained 버튼은 다크 글자 |
| `blue500` | `#3D8FD9` | primary.dark(다크) — hover/pressed |
| `blueTint` | `#0E2138` | stable 수치 영역 배경 tint(딥 블루 — shift-light 잠금면) |
| `amber400` | `#FFB300` | **레이싱 앰버** — measuring 라벨·펄스, weak-signal, warning |
| `amberTint` | `#2A1F0A` | weak-signal·warning 배경 tint |
| `red400` | `#FF5A5F` | **레이싱 레드** — destructive·no-permission·error |
| `redTint` | `#2B1113` | error 배경 tint |
| `green400` | `#66BB6A` | success — 만족 전용(다크 상향) |
| `greenTint` | `#122A16` | success 배경 tint |
| `white` | `#FFFFFF` | **stable 확정 수치** — 계기판 주인공 |

### 1.3 WCAG 2.2 AA 대비 검증 — dark (계산치, QA gate에서 다크/라이트 각각 axe 재검증)

| 조합 | 용도 | 대비 | 기준 | 판정 |
|---|---|---:|---|---|
| ice100 / night950 | 본문·페이지 타이틀 | 18.9:1 | 4.5:1 | 통과(AAA) |
| ice100 / night700 | 카드 위 본문 | 17.0:1 | 4.5:1 | 통과 |
| slate400 / night950 | 보조 텍스트 | 8.0:1 | 4.5:1 | 통과 |
| slate400 / night700 | 카드 위 보조 텍스트 | 7.2:1 | 4.5:1 | 통과 |
| slate400 / night900 | idle 라벨·안내 | 8.5:1 | 4.5:1 | 통과 |
| ice300 / night900 | **measuring 미확정 수치** | 11.8:1 | 3:1 (대형) | 통과 |
| white / blueTint | **stable 확정 수치** | 16.2:1 | 3:1 (대형) | 통과 |
| blue300 / blueTint | stable 라벨·lock 아이콘 | 7.3:1 | 4.5:1 | 통과 |
| blue300 / night950 (양방향) | primary 텍스트·contained 버튼(다크 글자) | 9.1:1 | 4.5:1 | 통과 |
| night950 / blue500 | primary 버튼 hover | 5.9:1 | 4.5:1 | 통과 |
| amber400 / night900 | **measuring 라벨·펄스** | 10.7:1 | 4.5:1 | 통과 |
| amber400 / amberTint | weak-signal 라벨·저장 불가 배너 | 9.0:1 | 4.5:1 | 통과 |
| slate400 / amberTint | weak-signal "—"·안내 | 7.1:1 | 4.5:1 | 통과 |
| red400 / redTint | no-permission 라벨·오류 배너 | 5.8:1 | 4.5:1 | 통과 |
| red400 / night950 (양방향) | destructive contained 버튼(다크 글자)·오류 텍스트 | 6.6:1 | 4.5:1 | 통과 |
| slate400 / redTint | no-permission 안내 문구 | 7.8:1 | 4.5:1 | 통과 |
| slate400 / night600 | suspended 라벨·안내 | 7.3:1 | 4.5:1 | 통과 |
| green400 / night700 | 만족 star·success 텍스트 | 7.7:1 | 4.5:1 | 통과 |
| green400 / greenTint | success Alert | 6.5:1 | 4.5:1 | 통과 |
| slate500 / night700 | 입력 외곽선 | 3.9:1 | 3:1 (비텍스트) | 통과 |
| slate500 / night950 | 페이지 배경 위 외곽선 | 4.4:1 | 3:1 (비텍스트) | 통과 |

- `hairline`(white 10%)·`night900 vs night950` 표면 단차는 장식 — 의미 있는 경계·상태 구분은 항상 라벨+아이콘+본 표의 텍스트 대비가 담당한다.
- disabled(`slate600`)는 대비 예외(WCAG 1.4.3 incidental).

### 1.4 WCAG 2.2 AA 대비 검증 — light (v1 표 전량 유효 — 값 무변경)

v1 §1.2 표 그대로 승계(gray900/white 17.1:1 … gray500/white 4.5:1 — 전 행 통과). v2 변경분만 추가:

| 조합 | 용도 | 대비 | 기준 | 판정 |
|---|---|---:|---|---|
| amber800 / white | **v2: measuring 라벨·펄스** (v1의 저장 불가 배너와 동일 조합) | 5.2:1 | 4.5:1 | 통과 |
| blue700 / white (양방향) | primary 버튼·stable 여정 (v1 "measuring 라벨" 용도만 제거) | 5.7:1 | 4.5:1 | 통과 |

## 2. 측정 상태 6종 시각 토큰 (S1 핵심 계약 — v2: 모드별 2벌, CSS 변수 간접층)

status enum `idle · measuring · stable · weak-signal · no-permission · suspended` 불변. **`measureStatusTokens`의 export 형태(fg/bg/valueFg/icon)와 소비 방식도 불변** — 값만 hex → `var(--mml-status-{status}-{part})` 문자열로 바뀌고, 실값은 theme(MuiCssBaseline)이 모드별로 주입한다. StatusLabel·BigNumber 코드 무변경으로 모드 전환.

| status | 라벨 | dark: fg / bg / valueFg | light: fg / bg / valueFg | icon | 비색상 구분 장치 (v1 불변) |
|---|---|---|---|---|---|
| `idle` | "측정 대기" | slate400 / night900 / slate400 | gray700 / white / gray700 | `mic` | 대형 [녹음 활성화] 버튼이 주인공 |
| `measuring` | "측정 중" | **amber400** / night900 / **ice300** | **amber800** / white / gray600 | `pulse-dot` | 라벨 상시 + 앰버 펄스(레이싱 앰버 — 활성 순간) |
| `stable` | "측정 완료 · 확정" | **blue300** / **blueTint** / **white** | blue900 / blue50 / gray900 | `lock` | **잠금 아이콘 + 라벨 + 배경 3중**(shift-light 잠금) + 갱신 정지 + CTA 노출 |
| `weak-signal` | "신호 약함" | amber400 / amberTint / slate400 | amber800 / amber50 / gray700 | `signal-low` | 숫자 미표시 — "—" placeholder만 (REQ-ST-003) |
| `no-permission` | "마이크 권한 필요" | **red400** / redTint / slate400 | red800 / red50 / gray700 | `mic-off` | 일시/영구 문구 분리 + 복구 버튼 상시 |
| `suspended` | "오디오 일시 중지됨" | slate400 / night600 / slate400 | gray700 / gray100 / gray700 | `pause` | [탭하여 다시 시작] 대형 버튼 — 오류 톤 아님 |

**a11y 규칙 (v1 전량 승계 + v2 보강)**
1. 색 단독 구분 금지 — fg/bg는 반드시 라벨+아이콘과 병행(StatusLabel 캡슐화). measuring과 weak-signal이 같은 앰버 계열을 공유해도 라벨("측정 중"/"신호 약함")·아이콘(`pulse-dot`/`signal-low`)·bg(투명/tint)가 구분을 보장한다.
2. 상태 전이 `aria-live="polite"` 텍스트 알림 유지.
3. measuring ↔ stable: 라벨·색·잠금 아이콘 3중 + 수치 명도 단차(dark: ice300 → white / light: gray600 → gray900).
4. stable 잠금 신호: bg 전환 1회 400ms(`motionTokens.stableTransitionMs`), reduced-motion 시 0ms — 정지 화면만으로 판별 가능해야 한다.
5. weak-signal "—"는 `rpmValue` 토큰으로 렌더 — 고정 높이 유지.
6. **v2**: S1 수치 영역(dark)은 `night900` bg + `hairline` 1px 보더로 베젤을 표현한다 — BigNumber 내부 스타일 조정만, props 불변.

## 3. 타이포그래피 (v1 불변 — 요약만)

- 폰트 스택: 시스템 폰트(v1 §3.1 그대로, 웹폰트 금지 — DS-A2 유지).
- 수치 토큰 4종(`rpmValue`·`fanoValue`·`guideRange`·`listValue`) 크기·굵기·clamp **변경 금지** — 전부 tabular-nums. 계기판 무드 극대화는 색(§2)·표면(§1.2)으로만 달성한다.
- 수치 포맷 규칙(v1 §3.3)·수치 영역 고정 높이 `measureValueMinHeight`(v1 §3.4)·일반 텍스트 스케일(v1 §3.5) 전량 불변.
- **v2 추가**: 다크 모드에서만 `-webkit-font-smoothing: antialiased`(§8 CssBaseline) — 어두운 배경 위 흰 글자 번짐 완화. 라이트 렌더링은 무변경.

## 4. 시맨틱 색 규칙 (v2 개정)

| 대상 | 규칙 | v2 변경점 |
|---|---|---|
| **primary(blue)** | 행동(CTA)·선택(세그먼트/탭/라디오)·**확정(stable 잠금)** | **진행(measuring)이 primary에서 분리** — 레이싱 앰버로 이동 |
| **레이싱 앰버(warning)** | **의미 있는 활성 순간 전용**: measuring 라벨·펄스, weak-signal, 전역 저장 불가 배너. 버튼 색으로 사용 금지 | measuring 편입 (dark `amber400` / light `amber800`) |
| **레이싱 레드(error)** | destructive(삭제·resetAllData)·no-permission·저장 실패 — ConfirmDialog 계약 밖 red 버튼 금지 | 값만 다크 상향(`red400`) |
| **만족 체크** | positive = success(그린) 전용 유지 — Switch `color="success"` + 라벨 상시, S4 star 아이콘+색 병행 | 값만 다크 상향(`green400`) |
| 주행 결과 3종·모터 등급 4단계 | 중립 텍스트 — 시맨틱 색 미부여(DS-A5 유지). 선택 상태만 primary | 무변경 |
| 분산 큼 보조 문구(S5) | `text.secondary` 중립 유지 | 무변경 |

## 5. 간격·크기 토큰 (v1 불변)

spacing 8px base·스케일 4~48 / `contentMaxWidth` 480 / `touchTargetMin` **44px** / 버튼 48·56 / 행 ≥56 / `bottomNavHeight` 56+safe-area / radius 12·16·8 / safe-area 변수(`--mml-safe-top`·`--mml-safe-bottom`) — v1 §5 전량 승계. `layoutTokens` export 무변경.

## 6. 포커스·forced-colors·모션 (v2 — 모드 대응)

| 항목 | 계약 |
|---|---|
| **focus ring** | 전역 `*:focus-visible { outline: 2px solid var(--mml-focus-ring); outline-offset: 2px }` — **outline 방식 유지**(forced-colors 생존). 실값: dark `blue300`(인접 대비 bg 9.1 / paper 8.3 / blueTint 7.3 — 전부 ≥3:1), light `blue700`(v1 검증 유지) |
| **forced-colors** | v1 계약 그대로 — 시스템 색 승계 허용, 상태 구분은 라벨+아이콘이 보장. 커스텀 CSS 변수도 forced-colors에서 시스템 색으로 대체됨 — 문제 없음(색 비의존 설계) |
| **prefers-reduced-motion** | v1 그대로 — 전역 0ms, measuring 펄스는 정지 점, stable 전환 즉시. **모드 토글 전환도 애니메이션 없음**(ThemeProvider `disableTransitionOnChange`) |
| 모션 토큰 | `motionTokens` 무변경 (`stableTransitionMs: 400` / `pulsePeriodMs: 1200`). 펄스 색만 currentColor 상속으로 앰버가 됨 — 코드 무변경 |
| 터치 타깃 | 44px 유지 — **테마 토글 IconButton 포함**(§9) |

## 7. 모드 아키텍처 (다크 기본 + 라이트 토글) — v1 §7 "다크 모드 판단" 대체

### 7.1 결정

- **다크가 기본값** — OS `prefers-color-scheme` 추종 없음(2택: dark/light, 'system' 미제공 — DS-A7). 최초 방문 = 다크.
- 토글 선택은 **localStorage `mml-mode` 영속** — MUI `useColorScheme` + `modeStorageKey` 내장 기능만 사용(신규 의존성 0 — change-scope CHANGE_BUDGET).

### 7.2 부팅 시퀀스 (no-flash 계약)

1. **`index.html` `<head>`에 인라인 스크립트** — 페인트 전에 `data-mui-color-scheme` 속성을 설정한다. 주의: MUI `InitColorSchemeScript` 컴포넌트는 SSR 파싱 시에만 실행된다(CSR에서 innerHTML 삽입 script는 실행 안 됨) — Vite SPA에서는 아래 동등 스크립트를 index.html에 직접 둔다:

```html
<meta name="theme-color" content="#05060A">
<style>html{background-color:#05060A}</style>
<script>
  ;(function () {
    var mode = 'dark'
    try { if (localStorage.getItem('mml-mode') === 'light') mode = 'light' } catch (e) {}
    document.documentElement.setAttribute('data-mui-color-scheme', mode)
    if (mode === 'light') document.documentElement.style.backgroundColor = '#F8F9FA'
  })()
</script>
```

2. theme은 `defaultColorScheme: 'dark'` — `:root` CSS가 다크 변수를 기본 탑재하므로 JS 실패 시에도 다크로 뜬다(라이트 사용자에게 최악 케이스 = 짧은 다크 플래시, 흰 플래시는 없음).
3. ThemeProvider: `<ThemeProvider theme={theme} defaultMode="dark" modeStorageKey="mml-mode" disableTransitionOnChange noSsr>`.
4. **`<meta name="theme-color">` 동기화**: 초기값 `#05060A`(위 1번). 토글 시 app-shell effect가 `themeColorMeta[mode]`(§8.1 export — dark `#05060A` / light `#F8F9FA`)로 content를 갱신한다. hex는 design-tokens export 경유 — 소비 규칙 준수.

### 7.3 토글 UI 배치 (구현 지시)

| 위치 | 형태 |
|---|---|
| **S1 (측정 탭)** | 우상단 고정 IconButton — 44×44px, safe-area-top 고려, 수치 영역 밖 |
| **PageHeader (이력·가이드·상세 스택 화면)** | 우측 액션 슬롯 — PageHeader에 optional `action?: ReactNode` prop 추가(additive — 기존 호출부 무변경, props 계약 위반 아님) |

- 컴포넌트: `ThemeToggle`(`shared/ui/theme-toggle`, §9) — `useColorScheme()`의 `mode`/`setMode`로 dark↔light 2택 토글. 아이콘 `moon`(현재 다크)·`sun`(현재 라이트) + `aria-label` "라이트 모드로 전환"/"다크 모드로 전환". `mode`가 undefined인 초기 프레임은 렌더 스킵(noSsr로 최소화).

## 8. MUI Theme 설정 (v2 — 이 두 블록을 각 파일로 그대로 이식)

> v1과 달리 코드는 두 파일이다(Phase 3에서 이미 분리됨): 토큰 canonical은 `src/shared/config/design-tokens.ts`, MUI theme은 `src/app/theme.ts`(하위 호환 re-export 유지). **export 4종 이름(`measureStatusTokens`·`numericTypography`·`layoutTokens`·`motionTokens`) 불변.**

### 8.1 `src/shared/config/design-tokens.ts`

```ts
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
```

### 8.2 `src/app/theme.ts`

```ts
// src/app/theme.ts
// design-system.md v2 §8.2 — 토큰 정의는 src/shared/config/design-tokens.ts가 canonical (app→shared 방향).
// 소비 규칙: 컴포넌트에서 hex 직접 사용 금지. theme.palette/theme.vars 또는 design-tokens export 경유.
// v2: 다크 기본 + 라이트 토글 — colorSchemes 2벌, 컴포넌트 오버라이드는 theme.vars로 모드 중립.
import { createTheme } from '@mui/material/styles'
import { buildModeCssVars, color, darkColor } from '@shared/config/design-tokens'

// 하위 호환 re-export — 기존 `@app/theme` 소비자 유지.
export {
  measureStatusTokens,
  numericTypography,
  layoutTokens,
  motionTokens,
} from '@shared/config/design-tokens'
export type { MeasureStatusVisual } from '@shared/config/design-tokens'

/* ------------------------------------------------------------------ *
 * MUI theme — 최소 오버라이드 (AD-8 유지: MUI 기본 + 토큰만)
 * 다크 기본: defaultColorScheme 'dark' → :root가 다크 변수 탑재 (no-flash, §7.2)
 * ------------------------------------------------------------------ */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data' }, // [data-mui-color-scheme="…"] — index.html 부팅 스크립트와 결속
  defaultColorScheme: 'dark',
  colorSchemes: {
    dark: {
      palette: {
        primary: { main: darkColor.blue300, dark: darkColor.blue500, light: darkColor.blueTint, contrastText: darkColor.night950 },
        error: { main: darkColor.red400, light: darkColor.redTint, contrastText: darkColor.night950 },
        warning: { main: darkColor.amber400, light: darkColor.amberTint, contrastText: darkColor.night950 },
        success: { main: darkColor.green400, light: darkColor.greenTint, contrastText: darkColor.night950 },
        text: { primary: darkColor.ice100, secondary: darkColor.slate400, disabled: darkColor.slate600 },
        background: { default: darkColor.night950, paper: darkColor.night700 },
        divider: darkColor.hairline,
      },
    },
    light: {
      palette: {
        primary: { main: color.blue700, dark: color.blue900, light: color.blue50, contrastText: color.white },
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
        // focus ring: outline 방식 — forced-colors 모드에서 생존 (box-shadow 금지). 모드별 실값은 --mml-focus-ring.
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
        root: ({ theme: t }) => ({
          minHeight: 44,
          textTransform: 'none',
          fontWeight: 500,
          color: (t.vars ?? t).palette.text.secondary,
          borderColor: 'var(--mml-outline)',
          '&.Mui-selected': {
            backgroundColor: (t.vars ?? t).palette.primary.main,
            color: (t.vars ?? t).palette.primary.contrastText,
            fontWeight: 700,
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
          color: (t.vars ?? t).palette.text.secondary,
          '&.Mui-selected': { color: (t.vars ?? t).palette.primary.main },
        }),
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
        // 모드 중립: 각 scheme의 {severity}.light = 배경 tint, .main = 전경 (§1.2·§1.4 대비 검증 조합)
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
    },
  },
})
```

**이식 시 주의 (구현 담당)**
1. `index.html`: §7.2의 인라인 스크립트 + `<meta name="theme-color" content="#05060A">` + `<style>html{background-color:#05060A}</style>` 필수. viewport `viewport-fit=cover` 유지(v1 승계).
2. ThemeProvider props: `defaultMode="dark" modeStorageKey="mml-mode" disableTransitionOnChange noSsr` — 부팅 스크립트의 localStorage 키와 동일해야 한다.
3. **`InitColorSchemeScript` 컴포넌트를 React 트리에 넣지 말 것** — CSR에서 실행되지 않는다(§7.2-1). index.html 인라인 스크립트가 그 역할.
4. `defaultColorScheme: 'dark'`(createTheme 옵션, MUI v6+)가 현행 7.3.0에서 `:root`에 다크 변수를 붙이는지 빌드 후 devtools로 확인 — 미동작 시 `cssVariables: { colorSchemeSelector: 'data' }`는 유지한 채 MUI 문서의 동등 옵션으로 교체(계약은 "CSS 기본값 = 다크").
5. `measureStatusTokens` 값이 hex → `var()` 문자열로 바뀐다 — 소비처(StatusLabel·BigNumber 등)는 sx/style 색 지정이므로 무변경으로 동작. **canvas 등 비-CSS 소비는 금지**(DS-A8) — 현재 소비처 전수는 CSS 컨텍스트임을 이식 시 grep으로 확인.
6. `MeasureStatus` 타입 결속(`Record<MeasureStatus, MeasureStatusVisual>`) 유지 — `measureStatusSchemeValues`의 dark/light 두 벌 모두에 적용.
7. `CssBaseline` 프로바이더 트리 포함 유지 — safe-area·상태 CSS 변수·focus ring·reduced-motion·html 배경이 전부 여기서 나온다.
8. theme-color 동기화 effect는 `themeColorMeta` export 소비(§7.2-4) — app 코드에 hex 금지 규칙 유지.

## 9. 컴포넌트 인벤토리 (v1 승계 + v2 추가분)

v1 §9 표 전량 유효(매핑·FSD 위치·핵심 규칙 불변 — 스타일은 theme/토큰이 자동 전환). v2 변경·추가만 기록:

| 컴포넌트 | FSD 위치 | MUI 매핑 | v2 규칙 |
|---|---|---|---|
| **ThemeToggle (신규)** | `shared/ui/theme-toggle` | IconButton (44×44) | `useColorScheme` mode/setMode 2택 토글. 아이콘 `moon`/`sun` + aria-label "라이트/다크 모드로 전환". 배치: S1 우상단 고정 + PageHeader 우측 액션(§7.3) |
| PageHeader | `shared/ui/page-header` | 커스텀 | **optional `action?: ReactNode` 슬롯 추가**(additive — 기존 호출부 무변경). 이력·가이드·상세에서 ThemeToggle 주입 |
| BigNumber | `shared/ui/big-number` | 커스텀 | 다크: `night900` bg + `hairline` 1px 보더로 베젤 표현(§2-6). 고정 높이·rpmValue 크기 불변 |
| StatusLabel | `shared/ui/status-label` | 커스텀 | 무변경 — `measureStatusTokens`가 var() 기반이라 코드 그대로 모드 전환. 펄스 점 색 currentColor 상속(앰버) |
| 카드류 전반 | 각 위치 | Paper `variant="outlined"` | 무변경 — 다크에서 border = divider(헤어라인) 자동. elevation 그림자 금지 유지. Dialog/Drawer/Snackbar의 MUI 다크 elevation overlay는 허용(DS-A9) |

### 아이콘 인벤토리 (v2: 14종 → 16종)

v1 14종(`mic` `mic-off` `lock` `pause` `signal-low` `check` `plus` `trash` `pencil` `star` `chevron-left` `close` `list` `bolt`) + **`sun` `moon`**(ThemeToggle). 규격 동일: 24×24 viewBox, `fill="currentColor"`, `aria-hidden="true"`.

### RpmGauge — S1 타코미터 (v2 신설, 사용자 결정: 커스텀 SVG·의존성 0)

| 항목 | 사양 |
|---|---|
| FSD 위치 | `features/measure-session/ui/RpmGauge.tsx` — MeasureFigures 내부 조립(공용 킷 아님, S1 전용) |
| 형태 | 220° 아크(좌하→우하), viewBox 고정(`0 0 200 120`) — **layout shift 0**. Z2 고정 높이 안에서 게이지+수치 오버레이가 함께 배치되고 §3.4 높이 계약은 MeasureFigures가 계속 소유 |
| 눈금·대역 | 10,000~37,000 RPM 고정 매핑(엔진 대역 170~620Hz × 60). 주 눈금 5k 간격, 라벨 `10`/`20`/`30`(천 단위 축약, `×1000 RPM` 캡션 1회) |
| 레드존 | 32k~37k 상단 밴드 — `amber → red` 그라디언트(위험 경고가 아닌 계기판 시그니처. 시맨틱 의미 없음 → `aria-hidden` 장식) |
| 상태 연동 | idle/suspended/no-permission: 트랙만(dim, 바늘 없음) · measuring: 바늘 실시간 + 앰버 · weak-signal: **바늘 숨김**(수치 없음 원칙 — 트랙 dim) · stable: 바늘 고정 + 잠금 블루 |
| 바늘 전환 | CSS `transform: rotate()` transition 100ms linear. `prefers-reduced-motion`: 0ms. rAF/JS 애니메이션 금지(엔진 ≥10Hz 갱신을 CSS가 보간) |
| 색 소비 | 전부 `var(--mml-status-*)`·`theme.vars` 경유(hex 금지 규칙 동일). 트랙 = 헤어라인, 눈금 텍스트 = text.secondary |
| 접근성 | 게이지 전체 `aria-hidden="true"` — canonical 수치는 기존 BigNumber 텍스트(스크린리더 경로 무변경) |

## 10. 하류 지시 요약 (v2 재설계 구현)

- **theme/토큰 담당**: §8.1 → `src/shared/config/design-tokens.ts`, §8.2 → `src/app/theme.ts` 그대로 이식(이식 주의 1~8). 두 파일 외 hex 사용 금지 관례 유지.
- **app-shell 담당**: index.html(부팅 스크립트·theme-color·html 배경) / ThemeProvider props(§7.2-3) / theme-color 동기화 effect / ThemeToggle 신설·배치(§7.3).
- **shared/ui 담당**: BigNumber 베젤(§2-6)·PageHeader action 슬롯만 — props 계약 additive, 나머지는 토큰 자동 전환이므로 손대지 않는 것이 기본. sx 안 하드코딩 hex 발견 시 theme.vars/토큰으로 치환(change-scope 예산 내).
- **QA gate**: 다크/라이트 각각 — 전 화면 렌더 스모크 + axe 대비 재검증(§1.3·§1.4) + 토글 영속(localStorage `mml-mode`) + 새로고침 no-flash + reduced-motion/forced-colors 정지 화면 판별 + 기존 22건 엔진 테스트 회귀 없음.

## 11. 개정 이력·ASSUMPTION

### v2 개정 이력 (2026-07-28)

| 항목 | v1 | v2 |
|---|---|---|
| 테마 모드 | light 단일 (DS-A1) | **다크 기본 + 라이트 토글, localStorage 영속** — 사용자 명시 결정으로 DS-A1 폐기 |
| §7 | "다크 모드 판단" | "모드 아키텍처(다크 기본+토글)" — 부팅 시퀀스·토글 배치 계약 |
| §8 | light 단일 palette, 코드 블록 1개 | `colorSchemes: {dark, light}` + CSS 변수 간접층, 코드 블록 2개(현행 파일 분리 반영). export 4종 이름 불변 |
| measuring 악센트 | blue700 (primary 여정) | **레이싱 앰버** (dark `amber400` / light `amber800`) — 앰버 = "의미 있는 활성 순간" |
| measureStatusTokens 값 | hex 리터럴 | `var(--mml-status-*)` 문자열 (형태·키·소비 방식 불변) |
| 아이콘 | 14종 | 16종 (+sun, moon) |

### ASSUMPTION (v1 유지: DS-A2~A5 / v2 신규: DS-A6~A10)

| ID | 내용 | 근거·검증 |
|---|---|---|
| ~~DS-A1~~ | ~~다크 미지원~~ | **v2에서 폐기** — 사용자 결정. v1이 강제한 "hex 직접 소비 금지 + cssVariables" 규칙이 확장 전제였고 그대로 활용됨 |
| DS-A2 | 웹폰트 미도입 — 시스템 폰트 | 유지 (change-scope NON_GOALS에도 명시) |
| DS-A3 | 수치 영역 고정 높이 clamp | 유지 — 6-status 동일 높이 불변식 |
| DS-A4 | stable 전환 400ms 1회 | 유지 — reduced-motion 0ms |
| DS-A5 | 주행 결과·등급 중립색 | 유지 — green=만족, red=destructive 예약 |
| DS-A6 | **light measuring 악센트 blue700→amber800 변경** — 모드 간 악센트 의미 일치 우선 | 사용자 검토 대상. 이의 시 light만 blue700 롤백 가능(`measureStatusSchemeValues.light.measuring` 1곳) |
| DS-A7 | 모드 2택(dark/light) — OS 선호 추종('system') 미제공 | "다크 기본" 결정의 단순 해석. system 추종 요구 시 setMode('system') + 부팅 스크립트에 matchMedia 분기 추가로 대응 |
| DS-A8 | 상태 토큰 var() 간접층 — CSS 색 컨텍스트 전용 | 소비처 전수 CSS(sx/style)임을 이식 시 확인. canvas 등 비-CSS 소비 필요 시 `measureStatusSchemeValues` 직접 소비로 우회 |
| DS-A9 | Dialog/Drawer/Snackbar의 MUI 다크 elevation overlay 허용 | "그림자 최소화" 원칙과 충돌 아님 — overlay는 표면 밝기 단차 방식이라 무드에 부합 |
| DS-A10 | 모드 영속 키 `mml-mode`(localStorage), MUI modeStorageKey 내장 사용 | 신규 의존성 0. 부팅 스크립트(§7.2)와 키 문자열 결속 — 불일치 시 no-flash 깨짐(QA 스모크 확인 항목) |

승계 baseline 불변: CP-1a 등급 4단계 · D4 주행 결과 3택 · A5 전압 0.1~9.9V.
