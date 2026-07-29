# Design System — minicar-motor-lab (v3 — awwwards 문법 고급화: 시그니처 라임 1색 · 디스플레이 타이포 · 컷코너 버튼)

> **v3 개정판** (design-system-architect, 2026-07-29). v2(다크+게이지)를 사용자 평가("버튼 밋밋·레이아웃 단조·색 조합 촌스러움·전반 완성도 부족")에 따라 실행 품질을 재설계 — 컨셉(다크 레이싱 계기판)은 유지, 문법을 수상작 수준으로 상향.
> 입력: v2 본 문서 · `_workspace/03_dev/change-scope.md` v3 증보 절 · 현행 `src/shared/config/design-tokens.ts` · `src/app/theme.ts` · `RpmGauge.tsx` · `MeasureFigures.tsx` · `shared/ui` 전반.
> 소비자: 재설계 구현 담당. **§8 코드 블록 2개(design-tokens.ts · theme.ts)는 그대로 이식 가능한 완성본.** 파일별 구현 낙차는 §10.
> 불변 계약(change-scope): 기능·데이터·라우팅·상태 머신·컴포넌트 public props·FSD 경계 불변. 상태 6종 3요소 병행(REQ-NFR-003) · tabular-nums · 수치 고정 높이 · 44px 타깃 · WCAG 2.2 AA(다크/라이트 각각) · hex 직접 소비 금지 · `--mml-status-*` 간접층 · export 토큰 4종 이름(`measureStatusTokens`·`numericTypography`·`layoutTokens`·`motionTokens`) · colorSchemes 구조 유지.

## 0. 디자인 방향 요약 (v3)

| 항목 | 결정 |
|---|---|
| 비주얼 성격 | 레이싱 계기판 유지. v3 문법: **무채 카본 + 시그니처 1색**, 대형 디스플레이 숫자, 컷코너 버튼, 편집디자인 리듬(번호·오버라인·헤어라인) |
| **시그니처 악센트** | **Shift-Light Lime** — dark `#D8F542` / light `#566E00` 1색 체계. v2의 "앰버+레드+블루+그린 동시 노출"(촌스러움의 주범)을 해체 — **블루 계열 완전 제거**(§1·§4). 대안 후보와 결정 근거는 §1.0 |
| 악센트 규율 | **평시 화면 = 무채색 + 라임 1색만.** 시맨틱 색은 해당 순간에만: 레드 = destructive·no-permission·저장 실패 / 앰버 = weak-signal·저장 불가 경고 / 그린 = 만족·success. measuring·stable·CTA·선택·탭 활성은 전부 라임 |
| 다크 뉴트럴 | v2 블루블랙(night)을 **무채 카본(carbon) 4단**으로 교체 — 라임이 유일한 유채색으로 빛나게. 깊이는 표면 단차 + 헤어라인 2종(0.08/0.16) + 히어로 비네트 1개 |
| 타이포 | RPM 숫자 **디스플레이 스케일 상향**(`clamp(64px,22vw,120px)` w800 ls-0.045em lh1 — 화면의 주인공), 페이지 타이틀 대형 디스플레이(28~34px w800), 오버라인(자간 0.12em) 신설. 웹폰트 기본 금지 유지 — 숫자 전용 가변 폰트 1종은 **OPTION-F1 선택지**(§3.6, 체크포인트 결정) |
| 버튼 | MUI 기본 느낌 제거 — **contained = 컷코너**(::before clip-path — focus ring 생존 구조), hover 밝기+라임 글로우, press scale(0.98), 라벨 w700·자간. outlined = 직각+보더, text = 시그니처 밑줄. 위계 명확(§9.1) |
| 레이아웃 리듬 | 상하 나열 탈피 — 대형 타이틀 블록+메타 행(PageHeader 2단), 카드 편집 요소(인덱스 번호·오버라인·헤어라인), **S1 = 게이지 중심 "계기판 한 장" 히어로**(§9.4). 480px 중앙 제약 유지 |
| 마이크로 인터랙션 | hover 140ms / press 120ms / enter 200ms, `cubic-bezier(0.2,0,0,1)`. reduced-motion 전역 0ms. 페이지 전환 페이드는 **OPTION-M1 선택지**(§6). CSS transition만 — 라이브러리 금지 |
| 불변 승계 | 다크 기본+라이트 토글(`mml-mode` 영속)·부팅 시퀀스·상태 6종 3요소·tabular-nums·고정 높이(값만 재클램프, §5)·44px·hex 금지·`--mml-status-*` 간접층 |

## 1. 색상 팔레트

### 1.0 시그니처 악센트 결정 (v3 핵심)

| 후보 | dark / light | 성격 | 판정 |
|---|---|---|---|
| **A. Shift-Light Lime** | `#D8F542` / `#566E00` | 타코미터 시프트 램프·모터스포츠 리버리(acid green)의 직계 — "레드라인 직전의 빛". 다크 카본 위 발광감 최대(16.1:1), 앰버(warning)·그린(success)과 hue 거리 확보 | **채택(recommended)** |
| B. Telemetry Cyan | `#45E0DC` / `#007069` | 텔레메트리·HUD 무드. 깨끗하나 크립토 대시보드·게이밍 UI 클리셰로 포화 — "계기판" 서사와의 결속이 약하고 차별화 실패 위험 | 기각 |

- 채택 근거: ① 레이싱 계기판 컨셉과 의미가 직결(시프트 라이트 = "측정이 확정에 가까워진다"는 서사를 색이 수행) ② 무채 카본 위 유일 유채색일 때 발광 대비가 가장 큼 ③ 시맨틱 3색(red/amber/green)과 혼동 없는 hue 슬롯 ④ cyan 대비 유행 소모도가 낮음.
- 시맨틱 인접성 주의: 라임(hue≈68°) vs 앰버(≈42°) vs success 그린(≈122°)은 색상환에서 분리되고, 상태 구분은 어차피 라벨+아이콘+bg 3요소가 보장한다(§2).

### 1.1 원시 토큰 — light (v3 재정렬: 무채 gray 승계 + 시그니처 라임 신설, **블루 계열 삭제**)

| 토큰 | 값 | 역할 |
|---|---|---|
| `lime700` | `#566E00` | **시그니처(light)** — primary.main·CTA·선택·measuring·stable·텍스트 버튼 (흰 글자 5.8:1) |
| `lime800` | `#435600` | primary.dark — hover/pressed (흰 글자 8.2:1) |
| `limeTintL` | `#F0F6DC` | stable 수치 영역 배경 tint·선택 tint |
| `red800` | `#C62828` | error / destructive — 순간색 (v1 승계) |
| `red50` | `#FDEDED` | error 배경 tint |
| `amber800` | `#A15C00` | warning — **weak-signal·저장 불가 전용**(v3: measuring에서 제외 — 라임으로 이동) |
| `amber50` | `#FFF4E5` | warning 배경 tint |
| `green800` | `#2E7D32` | success — 만족 전용 |
| `green50` | `#EAF4EB` | success 배경 tint |
| `gray900` | `#1C1B1F` | text.primary·확정 수치 |
| `gray700` | `#444746` | 중립 상태 전경(idle·suspended) |
| `gray600` | `#5F6368` | text.secondary·measuring 미확정 수치 |
| `gray500` | `#747775` | 입력 외곽선 (비텍스트 3:1) |
| `gray300` | `#C4C7C5` | disabled 전경 |
| `gray100` | `#F1F3F4` | divider·suspended 배경 |
| `gray50` | `#F8F9FA` | background.default |
| `white` | `#FFFFFF` | background.paper |

~~blue700 / blue900 / blue50~~ — **v3 삭제** (stable·primary가 라임으로 통합. 4색 동시 노출 해소).

### 1.2 원시 토큰 — dark (v3: 무채 카본 + 시그니처 라임)

| 토큰 | 값 | 역할 |
|---|---|---|
| `carbon950` | `#0A0A0B` | **background.default** — 무채 카본 블랙. `<meta theme-color>` 다크 값 |
| `carbon900` | `#111114` | **S1 히어로 존 bg**(idle·measuring — 베젤 안 다크 글래스) |
| `carbon800` | `#16161A` | **background.paper** — 카드·시트·탭 바 표면 |
| `carbon700` | `#1E1E24` | 상승 표면 — suspended bg·hover 표면 |
| `hairline` | `rgba(255,255,255,0.08)` | divider·기본 헤어라인 (장식, 대비 요건 비대상) |
| `hairlineStrong` | `rgba(255,255,255,0.16)` | **편집 구분선·베젤 링·카드 인덱스 룰** — 위계 있는 헤어라인 2종 체계 |
| `chalk100` | `#F4F5F2` | text.primary — 웜 뉴트럴 화이트(18.1:1) |
| `smoke200` | `#CDCFC9` | **measuring 미확정 수치** — 순백 직전 톤(12.0:1). 확정(white)과 명도 단차 |
| `smoke400` | `#A6A8A3` | text.secondary·중립 상태 전경·"—" placeholder (8.2:1) |
| `smoke600` | `#757871` | 입력 외곽선·세그먼트 보더 (비텍스트 4.0:1) |
| `smoke700` | `#5A5C57` | disabled 전경 |
| `lime400` | `#D8F542` | **시그니처(dark)** — primary.main·CTA·선택·measuring·stable 잠금·focus ring. contained 버튼은 카본 글자 |
| `lime300` | `#E4FF66` | primary.dark(다크) — hover/pressed **상승**(다크에서는 밝아지는 방향) |
| `limeTint` | `#202B08` | stable 수치 영역 배경 tint — shift-light 잠금면 |
| `limeGlow` | `rgba(216,245,66,0.25)` | primary 버튼 hover 글로우 전용 (box-shadow — 장식) |
| `amber400` | `#FFB300` | warning — **weak-signal·저장 불가 전용**(v3: measuring에서 제외) |
| `amberTint` | `#2A1F0A` | warning 배경 tint |
| `red400` | `#FF5A5F` | error — destructive·no-permission·레드라인 밴드(장식) |
| `redTint` | `#2B1113` | error 배경 tint |
| `green400` | `#66BB6A` | success — 만족 전용 |
| `greenTint` | `#122A16` | success 배경 tint |
| `white` | `#FFFFFF` | **stable 확정 수치** — 계기판 주인공 |

~~night950/900/700/600 · ice100/300 · slate400/500/600 · blue300/500 · blueTint~~ — **v3 교체·삭제**(키 이름 변경 — 소비처 낙차는 §10).

### 1.3 WCAG 2.2 AA 대비 검증 — dark (계산치, QA gate에서 axe 재검증)

| 조합 | 용도 | 대비 | 기준 | 판정 |
|---|---|---:|---|---|
| chalk100 / carbon950 | 본문·페이지 타이틀 | 18.1:1 | 4.5:1 | 통과(AAA) |
| chalk100 / carbon800 | 카드 위 본문 | 16.5:1 | 4.5:1 | 통과 |
| smoke400 / carbon950 | 보조 텍스트·메타 행 | 8.2:1 | 4.5:1 | 통과 |
| smoke400 / carbon800 | 카드 위 보조 텍스트·인덱스 번호 | 7.5:1 | 4.5:1 | 통과 |
| smoke400 / carbon900 | idle 라벨·안내 | 7.9:1 | 4.5:1 | 통과 |
| smoke200 / carbon900 | **measuring 미확정 수치** | 12.0:1 | 3:1 (대형) | 통과 |
| white / limeTint | **stable 확정 수치** | 14.9:1 | 3:1 (대형) | 통과 |
| lime400 / limeTint | stable 라벨·lock 아이콘 | 12.1:1 | 4.5:1 | 통과 |
| lime400 / carbon950 (양방향) | 시그니처 텍스트·contained 버튼(카본 글자)·focus ring | 16.1:1 | 4.5:1 | 통과 |
| lime400 / carbon900 | **measuring 라벨·펄스·진행 아크** | 15.3:1 | 4.5:1 | 통과 |
| lime400 / carbon800 | 카드 위 시그니처(탭 활성·텍스트 버튼) | 14.7:1 | 4.5:1 | 통과 |
| carbon950 / lime300 | primary 버튼 hover | 17.7:1 | 4.5:1 | 통과 |
| amber400 / amberTint | weak-signal 라벨·저장 불가 배너 | 9.0:1 | 4.5:1 | 통과 |
| amber400 / carbon800 | 경고 순간 텍스트 | 10.1:1 | 4.5:1 | 통과 |
| smoke400 / amberTint | weak-signal "—"·안내 | 7.5:1 | 4.5:1 | 통과 |
| red400 / redTint | no-permission 라벨·오류 배너 | 5.8:1 | 4.5:1 | 통과 |
| red400 / carbon950 (양방향) | destructive contained(카본 글자)·오류 텍스트 | 6.5:1 | 4.5:1 | 통과 |
| smoke400 / redTint | no-permission 안내 문구 | 8.2:1 | 4.5:1 | 통과 |
| smoke400 / carbon700 | suspended 라벨·안내 | 7.7:1 | 4.5:1 | 통과 |
| green400 / carbon800 | 만족 star·success 텍스트 | 7.6:1 | 4.5:1 | 통과 |
| green400 / greenTint | success Alert | 6.5:1 | 4.5:1 | 통과 |
| smoke600 / carbon800 | 입력 외곽선 | 4.0:1 | 3:1 (비텍스트) | 통과 |
| smoke600 / carbon950 | 페이지 배경 위 외곽선 | 4.4:1 | 3:1 (비텍스트) | 통과 |

- `hairline`/`hairlineStrong`·표면 단차·비네트·글로우·레드라인 밴드는 장식(대비 요건 비대상) — 의미 있는 경계·상태는 항상 라벨+아이콘+본 표의 텍스트 대비가 담당.
- disabled(`smoke700`)는 대비 예외(WCAG 1.4.3 incidental).

### 1.4 WCAG 2.2 AA 대비 검증 — light (v1 gray 표 전량 유효 + v3 변경분)

v1 §1.2 무채 표 그대로 승계(gray900/white 17.1:1 … gray500/white 4.5:1 — 전 행 통과). v3 변경분:

| 조합 | 용도 | 대비 | 기준 | 판정 |
|---|---|---:|---|---|
| lime700 / white (양방향) | 시그니처 텍스트·contained 버튼(흰 글자)·measuring 라벨 | 5.8:1 | 4.5:1 | 통과 |
| white / lime800 | primary 버튼 hover | 8.2:1 | 4.5:1 | 통과 |
| lime700 / gray50 | 페이지 배경 위 시그니처·focus ring | 5.5:1 | 4.5:1 | 통과 |
| lime700 / limeTintL | stable 라벨·lock 아이콘 | 5.2:1 | 4.5:1 | 통과 |
| gray900 / limeTintL | **stable 확정 수치** | 15.4:1 | 3:1 (대형) | 통과 |
| amber800 / white | weak-signal·저장 불가(v1 검증 승계) | 5.2:1 | 4.5:1 | 통과 |

~~blue700/white 5.7:1~~ — 블루 삭제로 표에서 제거.

## 2. 측정 상태 6종 시각 토큰 (S1 핵심 계약 — 값만 v3 갱신, 구조 불변)

status enum·`measureStatusTokens` export 형태(fg/bg/valueFg/icon)·`var(--mml-status-{status}-{part})` 간접층·소비 방식 전부 불변. **실값만 교체** — StatusLabel·BigNumber·RpmGauge 코드 무변경으로 모드 전환(§10의 낙차 제외).

| status | 라벨 | dark: fg / bg / valueFg | light: fg / bg / valueFg | icon | 비색상 구분 장치 (불변) |
|---|---|---|---|---|---|
| `idle` | "측정 대기" | smoke400 / carbon900 / smoke400 | gray700 / white / gray700 | `mic` | 대형 [녹음 활성화] 버튼이 주인공 |
| `measuring` | "측정 중" | **lime400** / carbon900 / **smoke200** | **lime700** / white / gray600 | `pulse-dot` | 라벨 상시 + 라임 펄스 + 진행 아크(§9.4) |
| `stable` | "측정 완료 · 확정" | **lime400** / **limeTint** / **white** | lime700 / limeTintL / gray900 | `lock` | **잠금 아이콘 + 라벨 + 배경 tint 3중** + 갱신 정지 + CTA 노출 |
| `weak-signal` | "신호 약함" | amber400 / amberTint / smoke400 | amber800 / amber50 / gray700 | `signal-low` | 숫자 미표시 — "—" placeholder만 (REQ-ST-003) |
| `no-permission` | "마이크 권한 필요" | red400 / redTint / smoke400 | red800 / red50 / gray700 | `mic-off` | 일시/영구 문구 분리 + 복구 버튼 상시 |
| `suspended` | "오디오 일시 중지됨" | smoke400 / carbon700 / smoke400 | gray700 / gray100 / gray700 | `pause` | [탭하여 다시 시작] 대형 버튼 — 오류 톤 아님 |

**a11y 규칙 (v2 전량 승계 + v3 보강)**
1. 색 단독 구분 금지 — StatusLabel이 라벨+아이콘과 병행 캡슐화. **measuring과 stable이 같은 라임을 공유**하지만 bg(투명 카본 vs limeTint)·아이콘(pulse-dot vs lock)·라벨·수치 명도(smoke200 vs white)·갱신 정지 5중 장치가 구분을 보장한다 — "라임 강도 상승 = 확정에 근접"이라는 시프트 라이트 서사.
2. 상태 전이 `aria-live="polite"` 텍스트 알림 유지.
3. stable 잠금 전환: bg tint 1회 400ms(`motionTokens.stableTransitionMs`), reduced-motion 0ms — 정지 화면만으로 판별 가능.
4. weak-signal "—"는 `rpmValue` 토큰으로 렌더 — 고정 높이 유지.
5. **v3**: S1 히어로 존의 베젤(헤어라인스트롱 링)·비네트(`--mml-hero-vignette`)·레드라인 밴드는 전부 장식(`aria-hidden`) — 상태 판별에 관여하지 않는다.

## 3. 타이포그래피 (v3 — 디스플레이 스케일 상향)

### 3.1 폰트 스택
시스템 폰트 유지(웹폰트 기본 금지 — DS-A2). 스택은 v1 그대로. 숫자 전용 가변 폰트는 §3.6 OPTION-F1.

### 3.2 수치 토큰 4종 (v3 상향 — 전부 tabular-nums 유지)

| 토큰 | v2 | **v3** | 근거 |
|---|---|---|---|
| `rpmValue` | clamp(56,18vw,96) w700 ls-0.02em | **clamp(64px,22vw,120px) w800 ls-0.045em lh1** | 화면의 압도적 주인공 — 480px에서 105px |
| `fanoValue` | clamp(20,6.5vw,28) w500 | 크기 동결·**w600** | 메타 행 위계만 강화(행 높이 파생 불변) |
| `guideRange` | clamp(32,10vw,44) w700 | **clamp(40px,12vw,56px) w800 ls-0.03em lh1.1** | S5 히어로 수치 |
| `listValue` | 0.9375rem w500 | 크기 동결·**w600** | 목록 수치 명료화 |

- rpmValue 상향에 따라 **고정 높이 계약은 유지한 채 값만 재클램프**: `layoutTokens.measureValueMinHeight` = `clamp(200px, 60vw, 272px)`(§5), MeasureFigures `ROW_HEIGHTS.rpm` = `clamp(4rem, 22vw, 7.5rem)`(§10 낙차). 6-status 동일 높이·layout shift 0 불변식은 그대로다(DS-A16).

### 3.3~3.5 수치 포맷·고정 높이 원칙·일반 스케일
v1 포맷 규칙 승계. 일반 텍스트 스케일 v3 변경분:

| variant | v2 | **v3** |
|---|---|---|
| h1 (페이지 타이틀) | 22px w700 | **clamp(28px,7vw,34px) w800 ls-0.02em lh1.15** — 대형 디스플레이 타이틀 |
| h2 (섹션) | 18px w600 | 18px **w700 ls-0.01em** |
| overline (신설) | — | **11px w700 자간 0.12em** — 편집 오버라인(카드 인덱스 "01"·메타 라벨·게이지 캡션) |
| button | 1rem w600 | 1rem **w700 자간 0.01em** (large 1.0625rem·자간 0.02em) |
| body1/body2/caption | 불변 | 불변 |

다크 `-webkit-font-smoothing: antialiased` 유지(§8 CssBaseline).

### 3.6 OPTION-F1 — 숫자 전용 가변 웹폰트 (선택지, 체크포인트에서 사용자 결정 — 기본 OFF)

| 항목 | 내용 |
|---|---|
| 후보 | **Oxanium variable**(SIL OFL, wght 200~800) — 스퀘어드 테크 디스플레이, 계기판 숫자와 정합 |
| 서브셋 | 숫자 전용: `0-9 . , — × %` (unicode-range U+0030-0039, U+002C, U+002E, U+2014, U+00D7, U+0025) |
| 적용 범위 | `rpmValue`·`guideRange`만(폰트 스택 앞에 삽입) — 본문·라벨은 시스템 폰트 유지 |
| 성능 예산 | self-host woff2 서브셋 **≤15KB**, `<link rel="preload">`, 외부 요청 0(구글 CDN 금지) |
| 무결성 장치 | `font-display: optional`(스왑으로 인한 tabular 폭 변화 → layout shift 방지 — 로드 못 하면 그 세션은 시스템 폰트 고정) + `size-adjust` fallback 메트릭 보정 |
| 채택 시 낙차 | design-tokens에 `numericFontStack` export 추가 + rpmValue/guideRange fontFamily 참조 + index.html preload — 3파일 |

## 4. 시맨틱 색 규칙 (v3 — 1색 규율)

| 대상 | 규칙 | v3 변경점 |
|---|---|---|
| **시그니처 라임(primary)** | 행동(CTA)·선택(세그먼트/탭/라디오)·진행(measuring)·확정(stable 잠금)·focus ring — **평시 화면의 유일한 유채색** | 블루(v2 primary·stable)와 앰버(v2 measuring)를 흡수 통합 |
| **앰버(warning)** | **경고 순간 전용**: weak-signal, 전역 저장 불가 배너. 버튼 색 사용 금지 | measuring에서 제외(라임으로 이동) — 평시 미노출 |
| **레드(error)** | destructive(삭제·resetAllData)·no-permission·저장 실패 — ConfirmDialog 계약 밖 red 버튼 금지. 게이지 레드라인 밴드는 장식 예외(DS-A15) | 값 유지 |
| **그린(success)** | 만족(positive) 전용 — Switch `color="success"` + 라벨 상시, S4 star 아이콘+색 병행 | 값 유지 |
| 주행 결과 3종·모터 등급 4단계 | 중립 텍스트 — 시맨틱 색 미부여(DS-A5). 선택 상태만 시그니처 | 무변경 |
| 분산 큼 보조 문구(S5) | `text.secondary` 중립 | 무변경 |

## 5. 간격·크기 토큰 (v3 — 여백 스케일 ~1.5×)

- spacing 8px base·`contentMaxWidth` 480·`touchTargetMin` **44px**·버튼 48/56·행 ≥56·`bottomNavHeight` 56+safe-area·safe-area 변수 — 전량 승계.
- **v3 변경**: `measureValueMinHeight` → `clamp(200px, 60vw, 272px)`(rpmValue 상향 동조 — 고정 높이 계약 자체는 유지). `layoutTokens`에 **additive 키** `sectionGap: 40`(섹션 간 수직 여백 — 기존 관행 24px 대비 ~1.7×), `cardPad: 20`(카드 내부 패딩) 추가 — 기존 키 이름·의미 불변.
- radius 체계(v3 재정의): **0 = 버튼(컷코너)·세그먼트** · **4 = 카드·인풋(shape.borderRadius)** · **8 = 다이얼로그** · **20 = 바텀시트 상단**(터치 어포던스 유지). v2의 12/16 라운드는 "MUI 기본 느낌"의 일부로 판단해 날카롭게 조정.

## 6. 포커스·forced-colors·모션 (v3 — 마이크로 인터랙션 규정)

| 항목 | 계약 |
|---|---|
| **focus ring** | 전역 `*:focus-visible { outline: 2px solid var(--mml-focus-ring); outline-offset: 2px }` 유지. 실값: dark `lime400`(인접 대비 bg 16.1 / paper 14.7 / limeTint 12.1 — 전부 ≥3:1), light `lime700`(white 5.8 / gray50 5.5). **컷코너 버튼도 ring 생존** — clip-path는 ::before 배경층에만 적용, root 박스의 outline은 잘리지 않는다(§9.1) |
| **forced-colors** | 시스템 색 승계 허용 — 상태 구분은 라벨+아이콘 보장. 컷코너 ::before 배경이 소실되므로 **버튼 root에 `border: 1px solid transparent` 가드**(forced-colors에서 ButtonText 보더로 실체화 — 버튼 실루엣 유지) |
| **prefers-reduced-motion** | 전역 0ms(CssBaseline) + press scale `transform: none` + 펄스 정지 점 + 진행 아크·바늘 즉시 이동 + 모드 토글 무전환 |
| **모션 토큰(v3 additive)** | `hoverMs: 140` / `pressMs: 120` / `enterMs: 200` / `needleMs: 100` / `easeStandard: cubic-bezier(0.2,0,0,1)` / `easeOut: cubic-bezier(0,0,0.2,1)`. 기존 `stableTransitionMs: 400`·`pulsePeriodMs: 1200` 불변 |
| **미세 규정** | hover: 배경/보더 밝기 전환 140ms + (dark primary 한정) 라임 글로우 box-shadow. press: `scale(0.98)` 120ms. 카드 hover: 보더 hairline→hairlineStrong. 탭 활성: 상단 2px 라임 인디케이터. 전부 CSS transition — JS/라이브러리 금지 |
| **OPTION-M1 (선택지)** | 페이지 전환 페이드 — route outlet 래퍼에서 opacity 0→1 150ms easeOut, reduced-motion 0ms. app-shell 1곳 낙차. 기본 OFF — 체크포인트 결정 |
| 터치 타깃 | 44px 유지 — ThemeToggle 포함 |

## 7. 모드 아키텍처 (다크 기본 + 라이트 토글 — v2 구조 불변, 값만 v3)

### 7.1 결정
v2 §7.1 그대로 — 다크 기본, 2택(dark/light, DS-A7), localStorage `mml-mode` 영속, MUI `useColorScheme`+`modeStorageKey`(신규 의존성 0).

### 7.2 부팅 시퀀스 (no-flash 계약 — 색값만 v3 갱신)

1. **`index.html` `<head>` 인라인 스크립트** — MUI `InitColorSchemeScript`는 CSR에서 실행되지 않으므로(SSR 파싱 시에만 innerHTML script 실행) Vite SPA에서는 아래 동등 스크립트를 직접 둔다:

```html
<meta name="theme-color" content="#0A0A0B">
<style>html{background-color:#0A0A0B}</style>
<script>
  ;(function () {
    var mode = 'dark'
    try { if (localStorage.getItem('mml-mode') === 'light') mode = 'light' } catch (e) {}
    document.documentElement.setAttribute('data-mui-color-scheme', mode)
    if (mode === 'light') document.documentElement.style.backgroundColor = '#F8F9FA'
  })()
</script>
```

2. theme `defaultColorScheme: 'dark'` — JS 실패 시에도 다크로 뜬다(흰 플래시 없음).
3. ThemeProvider: `<ThemeProvider theme={theme} defaultMode="dark" modeStorageKey="mml-mode" disableTransitionOnChange noSsr>`.
4. `<meta name="theme-color">` 동기화: 초기 `#0A0A0B`, 토글 시 app-shell effect가 `themeColorMeta[mode]`(dark `#0A0A0B` / light `#F8F9FA`) 소비 — hex 금지 규칙 준수.

### 7.3 토글 UI 배치
v2 그대로 — S1 우상단 고정 IconButton(44×44, safe-area, 수치 영역 밖) + PageHeader `action` 슬롯(additive prop, 기 구현). `ThemeToggle`(`shared/ui/theme-toggle`) 무변경.

## 8. MUI Theme 설정 (v3 — 이 두 블록을 각 파일로 그대로 이식)

> 토큰 canonical = `src/shared/config/design-tokens.ts`, theme = `src/app/theme.ts`(하위 호환 re-export 유지). **export 4종 이름(`measureStatusTokens`·`numericTypography`·`layoutTokens`·`motionTokens`) 불변** — v3는 값 갱신 + additive export(`shapeTokens`) 1종.

### 8.1 `src/shared/config/design-tokens.ts`

```ts
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
    'weak-signal': { fg: darkColor.amber400, bg: darkColor.amberTint, valueFg: darkColor.smoke400 },
    'no-permission': { fg: darkColor.red400, bg: darkColor.redTint, valueFg: darkColor.smoke400 },
    suspended: { fg: darkColor.smoke400, bg: darkColor.carbon700, valueFg: darkColor.smoke400 },
  },
  light: {
    idle: { fg: color.gray700, bg: color.white, valueFg: color.gray700 },
    measuring: { fg: color.lime700, bg: color.white, valueFg: color.gray600 }, // v3: amber800→lime700 (시그니처 통합)
    stable: { fg: color.lime700, bg: color.limeTintL, valueFg: color.gray900 },
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
export const numericTypography = {
  /** S1 RPM 대형 수치·weak-signal "—" — 상태 간 동일 크기. v3: 화면의 주인공 스케일 */
  rpmValue: {
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
  /** S5 추천 전압 범위 대형 수치 — v3 상향 */
  guideRange: {
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
```

### 8.2 `src/app/theme.ts`

```ts
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
```

**이식 시 주의 (구현 담당)**
1. `index.html`: §7.2 인라인 스크립트 + `<meta name="theme-color" content="#0A0A0B">` + `<style>html{background-color:#0A0A0B}</style>` — **v2의 `#05060A` 2곳을 `#0A0A0B`로 교체.** viewport `viewport-fit=cover` 유지.
2. ThemeProvider props: `defaultMode="dark" modeStorageKey="mml-mode" disableTransitionOnChange noSsr` — 부팅 스크립트 localStorage 키와 동일해야 한다.
3. **`InitColorSchemeScript` 컴포넌트를 React 트리에 넣지 말 것** — CSR에서 실행되지 않는다(§7.2-1). index.html 인라인 스크립트가 그 역할.
4. `defaultColorScheme: 'dark'`가 현행 MUI 7.x에서 `:root`에 다크 변수를 붙이는지 빌드 후 devtools 확인 — v2 이식에서 이미 검증된 경로면 생략 가능.
5. `measureStatusTokens`는 var() 문자열 유지 — 소비처 무변경. **canvas 등 비-CSS 소비 금지**(DS-A8).
6. `MeasureStatus` 타입 결속(`Record<MeasureStatus, MeasureStatusVisual>`) — `measureStatusSchemeValues` dark/light 두 벌 모두.
7. `CssBaseline` 프로바이더 트리 포함 유지 — safe-area·상태 변수·focus ring·reduced-motion·html 배경·`--mml-hero-vignette`가 전부 여기서 나온다.
8. theme-color 동기화 effect는 `themeColorMeta` export 소비 — app 코드 hex 금지 유지.
9. **v3 신규**: `darkColor` 키 이름 변경(night→carbon, ice/slate→chalk/smoke, blue→lime) — `darkColor.*`를 직접 소비하던 코드(현행 BigNumber의 `night900` 1곳)는 §10 낙차대로 수정. 이식 후 `rg 'night|slate|ice[13]00|blue300' src/`로 잔존 참조 0 확인.
10. 버튼 ripple 비활성(`disableRipple`) — press 피드백은 scale(0.98)이 담당. IconButton·ToggleButton의 ripple은 유지(사각형이라 문제 없음).

## 9. 컴포넌트 인벤토리 (v2 승계 + v3 개정)

v1·v2 표의 매핑·FSD 위치·public props 전량 불변. v3 스타일 개정만 기록:

### 9.1 버튼 위계 (v3 재설계 — theme이 전담, 호출부 무변경)

| 위계 | MUI variant | 형태 | 상호작용 |
|---|---|---|---|
| **Primary** | `contained` color=primary | **컷코너**(10px, large 12px — livery slash), 라임 면 + 카본(다크)/화이트(라이트) 라벨 w700 | hover: 다크 밝기 상승+라임 글로우 / 라이트 침강. press: scale 0.98 |
| **Secondary** | `outlined` | 직각 사각 + 1px `--mml-outline` 보더, text.primary 라벨 | hover: 보더 승격 + action.hover 면 |
| **Tertiary** | `text` | 시그니처 텍스트 | hover: 2px 밑줄(offset 4px) |
| **Destructive** | `contained` color=error | 컷코너, 레드 면 — **ConfirmDialog 계약 내에서만** | hover: brightness 1.08 |

- 구조 원칙(DS-A13): clip-path는 **::before 배경층 전용** — root 박스는 온전해서 focus ring outline·글로우 box-shadow가 잘리지 않는다. root의 transparent 1px 보더는 forced-colors 실루엣 가드.

### 9.2 컴포넌트 개정표

| 컴포넌트 | FSD 위치 | v3 규칙 |
|---|---|---|
| **PageHeader** | `shared/ui/page-header` | props 불변(`title/onBack/actions/action`). **내부 2단 재구성**: ① 유틸 행(뒤로/actions/action — onBack·액션 존재 시에만 렌더, 56px) ② **디스플레이 타이틀 행**(h1 v3 스케일, px 16, 하단 여백 8 + hairlineStrong 룰 옵션). 헤더 아래 콘텐츠 시작 여백 `sectionGap` 적용은 페이지 소관 |
| BigNumber | `shared/ui/big-number` | **v2 개별 베젤(applyStyles dark + 음수 마진 핵) 제거** — 베젤은 히어로 존(MeasureFigures) 소유로 이동(§9.4). `darkColor` import 삭제, 순수 수치 렌더로 회귀. props·"—"·sr-only 불변 |
| StatusLabel | `shared/ui/status-label` | 무변경 — var() 토큰이 자동 전환. 펄스 점 currentColor(라임) 상속 |
| SegmentControl 계열 | `shared/ui/segment-control` | theme ToggleButton 개정이 자동 적용(직각·라임 선택·w800) — 코드 무변경 |
| 카드류 전반 | 각 위치 | Paper `variant="outlined"` 유지 + **편집 요소**(sx 조정): 좌상단 인덱스 번호(`overline` 변형, smoke400/gray500, "01"·"02"…), 타이틀 행 아래 hairlineStrong 룰, 수치는 우측 baseline 정렬(`listValue`), 내부 패딩 `cardPad`(20px). hover 보더 승격은 theme 자동 |
| 목록 행(S3/S4) | features/pages | 단조 나열 탈피 — 행 좌측: 회차 인덱스(overline) / 중앙: 라벨 / 우측: 수치(listValue, tabular). 구분은 hairline. press 피드백은 MUI ListItemButton 기본 유지 |
| EmptyState | `shared/ui/empty-state` | 대형 디스플레이 문구(h1 스케일 아님 — h2 + 여백 상향) + Tertiary 버튼 |
| ThemeToggle | `shared/ui/theme-toggle` | 무변경 (44×44·aria-label 유지) |

### 9.3 아이콘 인벤토리
v2의 16종 그대로(24×24 viewBox, `fill="currentColor"`, `aria-hidden="true"`). 추가 없음.

### 9.4 S1 히어로 — "계기판 한 장" (RpmGauge + MeasureFigures, v3 개정)

| 항목 | 사양 |
|---|---|
| 존 구성 | Z2 고정 높이(`measureValueMinHeight` v3 재클램프) 안에서 **베젤 프레임 = 존 자체**: 1px `hairlineStrong` 링(radius 4) + 상태 bg(`--mml-status-*-bg`) + 그 위 `--mml-hero-vignette` overlay div(absolute·`aria-hidden`·pointer-events none — 라이트 모드는 `none`) |
| 수치 오버레이 | RPM 숫자(v3 디스플레이 스케일)가 게이지 중앙 — 압도적 주인공. 파노 Hz·단위는 메타 행. BigNumber는 베젤 스타일 없이 순수 숫자(§9.2) |
| 게이지 형태 | 220° 아크·viewBox `0 0 200 120` 고정 — 기하·매핑(10k~37k, 5k 주 눈금) v2 승계 |
| **눈금(v3)** | 주 눈금 5k(stroke `smoke400`/`text.secondary`) + **보조 눈금 1k 신설**(stroke hairline — 계기판 밀도감). 라벨 10/20/30 + `×1000 RPM` 캡션은 `overline` 토큰 톤 |
| **레드라인(v3)** | v2 amber→red **그라디언트 폐기**(4색 동시 노출 해소) — `error.main` **단색** 밴드, strokeWidth 8→5, opacity 0.9. 장식(`aria-hidden`) — 시맨틱 의미 없음(DS-A15) |
| **진행 아크(v3 신설)** | measuring·stable에서 트랙 위 최소점→현재 RPM까지 **시그니처 라임 아크**(strokeWidth 4, `--mml-status-measuring-fg` 소비). `stroke-dashoffset` transition `needleMs`(100ms) linear — 바늘과 동일 보간. reduced-motion 0ms. weak-signal·idle 등에서는 미표시 |
| **바늘(v3)** | measuring: `fg`(라임) / **stable: `valueFg`(white)** — 확정 수치와 동일 위계로 승격(잠금 구분 보조). 전환 CSS rotate 100ms linear 유지, rAF/JS 금지 |
| 상태 연동 | v2 승계 — idle/suspended/no-permission 트랙 dim(바늘·진행 아크 없음), weak-signal 바늘·아크 숨김(REQ-ST-003) |
| 접근성 | 게이지·비네트·베젤 전체 `aria-hidden` — canonical 수치는 BigNumber 텍스트 경로 불변 |

## 10. 하류 지시 — v3 구현 낙차 (파일별)

| 파일 | 낙차 | 규모 |
|---|---|---|
| `src/shared/config/design-tokens.ts` | §8.1 전체 교체 — 팔레트 v3(카본/라임), `shapeTokens` 신설, `motionTokens`/`layoutTokens` additive 키, rpmValue/guideRange 상향, 비네트 변수 | 파일 교체 |
| `src/app/theme.ts` | §8.2 전체 교체 — colorSchemes 라임 팔레트, 타이포 디스플레이 스케일, MuiButton 재설계(컷코너), 세그먼트/탭/카드/다이얼로그 개정 | 파일 교체 |
| `index.html` | theme-color·`<style>` bg `#05060A` → `#0A0A0B` (2곳) | 2줄 |
| `src/shared/ui/big-number/BigNumber.tsx` | v2 다크 베젤 블록(applyStyles+음수 마진) 제거, `darkColor` import 삭제 | -15줄 |
| `src/shared/ui/page-header/PageHeader.tsx` | 2단 재구성(유틸 행 조건부 + 디스플레이 타이틀 행) — props 불변 | 중 |
| `src/features/measure-session/ui/MeasureFigures.tsx` | `ROW_HEIGHTS.rpm` → `clamp(4rem, 22vw, 7.5rem)` 동조, 존 베젤(hairlineStrong 링 — theme.vars 경유)·비네트 overlay div 추가, stable 전환 ease → `easeOut` 토큰 | 소~중 |
| `src/features/measure-session/ui/RpmGauge.tsx` | 레드존 그라디언트 폐기→`error.main` 단색(defs 삭제), 보조 눈금 1k, 진행 아크 신설, stable 바늘 색 `fg`→`valueFg` | 중 |
| `src/pages/**`·features sx | 섹션 여백 `sectionGap`, 카드 인덱스 번호·오버라인·hairlineStrong 룰, 목록 행 리듬(§9.2) — CHANGE_BUDGET(≤12파일) 내 | 소×다수 |
| 소비처 전수 검사 | `rg 'night|slate|ice[13]00|blue300|blueTint' src/` → 잔존 참조 0 (darkColor 키 개명 여파) | 검사 |
| **QA gate** | 다크/라이트 전 화면 스모크 + axe 대비 재검증(§1.3·§1.4) + 토글 영속·no-flash + reduced-motion(press scale 무효 포함)·forced-colors(버튼 실루엣 가드) + 컷코너 버튼 focus ring 육안 확인 + 22건 엔진 테스트 회귀 없음 | — |

체크포인트(사용자 결정 대기): **OPTION-F1**(숫자 웹폰트, §3.6) · **OPTION-M1**(페이지 전환 페이드, §6) — 둘 다 기본 OFF로 진행 가능.

## 11. 개정 이력·ASSUMPTION

### v3 개정 이력 (2026-07-29 — awwwards 문법 고급화)

| 항목 | v2 | v3 |
|---|---|---|
| 악센트 체계 | 앰버(measuring)+블루(primary/stable)+레드+그린 동시 | **시그니처 라임 1색**(CTA·선택·measuring·stable) + 시맨틱 순간색(red/amber/green) — 블루 완전 삭제 |
| 다크 뉴트럴 | 블루블랙 night 4단 | **무채 카본 4단** + 헤어라인 2종 + 히어로 비네트 |
| rpmValue | clamp(56,18vw,96) w700 — "변경 금지" | **clamp(64,22vw,120) w800 ls-0.045em** — change-scope v3가 상향 지시(고정 높이 계약은 재클램프로 유지, DS-A16) |
| 페이지 타이틀 | 22px w700 단일 행 | **clamp(28~34px) w800 디스플레이** + PageHeader 2단 |
| 버튼 | MUI 기본 + radius 12 | **컷코너 contained / 직각 outlined / 밑줄 text** + hover 글로우 + press scale + ripple 제거 |
| 여백·radius | spacing 관행 24 / radius 12·16 | `sectionGap` 40(~1.5×) / radius 0·4·8·20 체계 |
| 게이지 | amber→red 그라디언트 레드존 | **단색 레드라인 + 라임 진행 아크 + 1k 보조 눈금 + 존 베젤·비네트** |
| 모션 | stable 400·펄스 1200만 | + hover 140 / press 120 / enter 200 / needle 100 / 이징 2종 |
| BigNumber 베젤 | 개별 pill 베젤(음수 마진) | 제거 — 베젤은 히어로 존 소유 |

### ASSUMPTION (유지: DS-A2~A5, A7~A10 / v3 신규: A11~A16 / 폐기: A1, A6)

| ID | 내용 | 근거·검증 |
|---|---|---|
| ~~DS-A1~~ | ~~다크 미지원~~ | v2에서 폐기 |
| DS-A2 | 웹폰트 미도입 — 시스템 폰트 | 유지. 단 v3에서 OPTION-F1(숫자 전용, 예산 ≤15KB)을 선택지로 개방 — 채택 시에만 부분 해제 |
| DS-A3 | 수치 영역 고정 높이 clamp | 유지 — 값만 v3 재클램프(DS-A16) |
| DS-A4 | stable 전환 400ms 1회 | 유지 — reduced-motion 0ms |
| DS-A5 | 주행 결과·등급 중립색 | 유지 |
| ~~DS-A6~~ | ~~light measuring = amber800~~ | **v3 폐기** — measuring은 양 모드 모두 시그니처 라임(1색 규율) |
| DS-A7 | 모드 2택 — 'system' 미제공 | 유지 |
| DS-A8 | 상태 토큰 var() 간접층 — CSS 컨텍스트 전용 | 유지 — RpmGauge SVG도 style 속성(CSS) 소비라 적합 |
| DS-A9 | Dialog/Drawer/Snackbar의 MUI 다크 elevation overlay 허용 | 유지 |
| DS-A10 | 모드 영속 키 `mml-mode` | 유지 |
| **DS-A11** | 시그니처 = Shift-Light Lime(cyan 기각, §1.0) | 사용자 체크포인트 대상 — cyan 선호 시 lime400/300/Tint·lime700/800/TintL 6값 + limeGlow 교체로 국소 롤백 가능 |
| **DS-A12** | stable도 시그니처 라임 계열(블루 제거) — 잠금 구분은 tint bg+lock+white 수치+갱신 정지 | REQ-NFR-003 3요소 병행으로 색 의존 없음 — QA에서 grayscale 스크린샷 판별 확인 |
| **DS-A13** | 컷코너는 contained 전용, clip-path는 ::before 배경층 전용 | focus ring(outline)·글로우(box-shadow)가 clip에 잘리는 문제의 구조적 회피. outlined/text는 직각 — 혼합 기하가 위계를 오히려 강화 |
| **DS-A14** | 버튼 ripple 제거, press scale 대체 | 사각 ripple이 컷코너 밖으로 새는 시각 결함 회피. IconButton 등 사각 요소는 ripple 유지 |
| **DS-A15** | 게이지 레드라인 = error.main 장식 예외 | "시맨틱 색은 순간에만" 규율의 유일한 상시 예외 — 타코미터 관용 기호이며 aria-hidden·저채도(opacity 0.9)·소면적으로 제한 |
| **DS-A16** | rpm 스케일 상향 → `measureValueMinHeight`·`ROW_HEIGHTS.rpm` 동조 재클램프 | 고정 높이·6-status 동일·layout shift 0 불변식 자체는 유지 — QA에서 상태 6종 왕복 스크린샷 diff로 검증 |

승계 baseline 불변: CP-1a 등급 4단계 · D4 주행 결과 3택 · A5 전압 0.1~9.9V.
