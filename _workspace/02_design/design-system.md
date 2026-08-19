# Design System — minicar-motor-lab (v4.2 — Pit-Wall Amber 5축 완결 + 레이스 기록 화면 셀렉션/인풋 마이크로 개정)

> **v4 개정판** (design-system-architect, 2026-08-19). 사용자 브리프("더 스타일리쉬·깔끔·트렌디하게 —
> 현재는 투박·구식·색감 별로")에 대해 발산 3후보(A. Pit-Wall Amber / B. Track Ceramic / C. Graphite
> Signal)를 스타일 타일로 비교하고, **후보 A(Pit-Wall Amber)**를 사용자 승인 + 오케스트레이터 렌더
> 판정으로 확정 — v4는 **색 팔레트만 교체**(웜틴트 카본 `umber` + 시그니처 `copper`)했고 형태·타이포·
> 밀도·컴포넌트 구조는 v3 그대로 두었다(스코핑 결함 — 아래 v4.1 참조).
> 입력: v3 본 문서 · `_workspace/02_design/design-system/style-tiles/candidate-a/tokens.css`(승인된
> 다크 대표값) · `style-tiles/README.md`(발산 5축·라이트 제안값·MUI 매핑) ·
> `style-tiles/RENDER-VERDICT.md`(대비 실측·상투 판정) · 현행 `src/shared/config/design-tokens.ts`.
> 소비자: 재설계 구현 담당(app-shell-builder 등). **§8 코드 블록 2개(design-tokens.ts · theme.ts)는
> 그대로 이식 가능한 완성본.** 파일별 구현 낙차는 §10.

> **v4.1 결함 보수** (design-system-architect, 2026-08-20). v4는 승인 시안 A의 **색 축만**
> 반영했다 — 사용자가 실기기에서 "버튼 디자인·글자 폰트·인풋 폼 등이 적용되지 않고 색상만
> 적용됨"을 발견해 스코핑 결함으로 확인됐다(원인 1줄: v4가 §1.0-v4에서 "이번 라운드 범위:
> 색 팔레트만"이라고 스스로 명시해놓고 후속 라운드를 만들지 않은 채 종료됨). v4.1은 candidate-a의
> **나머지 4축**(타이포 페어링·밀도·형태 언어·그에 따른 컴포넌트 형태)을 §3·§5·§8·§9에 반영해
> 시안 A를 완결한다. 색 토큰(§1·§2·§4)은 v4에서 이미 반영 완료 — 이번 라운드는 무변경.
> 입력 추가: `style-tiles/candidate-a/index.html`(실제 `--st-font-display` 배선 지점 확인 —
> h1/h2에만 적용, 라벨·버튼·인풋·표는 body 스택) · 현행 `src/shared/ui/form-field/FormField.tsx`·
> `src/pages/motor-detail/ui/MotorDetailPage.tsx`(형태 변경의 실제 소비처 확인, §8.2·§10).
> 불변 계약(v3 승계): 기능·데이터·라우팅·상태 머신·컴포넌트 public props·FSD 경계 불변. 상태 6종
> 3요소 병행(REQ-NFR-003) · tabular-nums · 수치 고정 높이 · 44px 타깃 · WCAG 2.2 AA(다크/라이트
> 각각) · hex 직접 소비 금지 · `--mml-status-*` 간접층 · export 토큰 이름(`measureStatusTokens`·
> `numericTypography`·`layoutTokens`·`motionTokens`·`shapeTokens`) · colorSchemes 구조 ·
> **`motorKindColors`(실물 엔드벨 색) 무변경** — v4 팔레트와의 공존 점검은 §1.0-v4 부록.

> **v4.2 마이크로 개정** (design-system-architect, 2026-08-20). 사용자가 실기기에서 3건을
> 발견: ① 레이스 기록 화면(`RaceEntrySheet.tsx`)의 셀렉션·인풋 여전히 미적용 — 원인은 §8.2
> 본문 주석이 요구한 `FormField.tsx`/`VoltageStepper.tsx` 동기화가 §10 하류 지시 표에 행으로
> 반영되지 않은 **문서 내부 불일치**. ② 같은 화면 세그먼트(`MuiToggleButton`/`Group`) 직각이
> v4.1에서 "범위 밖"으로 유보된 채 남은 **과도기 상태**. ③ 측정 페이지 [기록] 버튼 비활성
> 라벨 저대비 — 원인은 v4.1이 `contained` 면을 `::before`에서 root palette 배경으로 옮기며
> 생긴 **`::before` 고아 소비자**(`MeasureActionDock.tsx`·`MotorDetailPage.tsx`, DS-A22).
> v4.2는 §10에 누락 행을 추가하고, 세그먼트를 소프트라운드 12px로 편입해 과도기를 종료하며
> (pill 999 계열은 의도적으로 제외 — DS-A21), `::before` 고아 2건을 처방한다(전수 스윕 완료 —
> `MotorRow.tsx`/`RaceMotorList.tsx`의 `::before`는 종류색 액센트 바로 무관 확인). 레이스
> 기록 화면(`RaceEntrySheet.tsx`·`RaceGoalSheet.tsx`)의 셀렉션·인풋 소비처를 전수 스윕했다 —
> 상세는 §9.1·§10·§11 v4.2 개정 이력.

## 0. 디자인 방향 요약 (v3 승계 + v4 색 교체 + v4.1/v4.2 형태·타이포·밀도)

| 항목 | 결정 |
|---|---|
| 비주얼 성격 | 레이싱 계기판 유지. 문법: 무채 카본→**웜틴트 카본(v4)** + 시그니처 1색, 대형 디스플레이 숫자(계기 전용 가변 폰트) + **모노 디스플레이 헤딩(v4.1)**, **소프트라운드 12px 버튼(v4.1: 컷코너 폐기)**, 편집디자인 리듬(번호·오버라인·헤어라인) |
| **시그니처 악센트** | **v4: Pit-Wall Amber `copper`** — dark `#FF8A3D` / light `#B85C1E` 1색 체계(발산 후보 A 채택, §1.0-v4). v3의 Shift-Light Lime(`#D8F542`/`#566E00`)를 대체 |
| 악센트 규율 | **평시 화면 = 무채색 + 코퍼 1색만.** 시맨틱 색은 해당 순간에만: 레드 = destructive·no-permission·저장 실패 / 앰버 = weak-signal·저장 불가 경고 / 그린 = 만족·success. measuring·stable·CTA·선택·탭 활성은 전부 코퍼 |
| 다크 뉴트럴 | **웜틴트 카본(umber) 4단**(v4: 후보 A `--st-bg`/`--st-surface` 앵커 + 보간 2단) — 코퍼가 유일한 유채색으로 빛나게. 깊이는 표면 단차 + 헤어라인 2종(장식 rgba 0.18 / 구조 솔리드) + 히어로 비네트 1개 |
| 타이포 | **v4.1**: 2패밀리 분리 — 디스플레이(h1·h2) = 시스템 모노스페이스(`displayFontStack`, 후보 A `--st-font-display`, "기계식 크로노그래프"), 본문·라벨·버튼·인풋 = 기존 휴머니스트 산세리프(한글 폴백 포함, 무변경). RPM 숫자 디스플레이(`rpmValue`/`guideRange`)는 별도 계기 전용 가변 폰트(OPTION-F1, §3.6)로 무변경 — 세 스택의 역할 경계는 §3.1 |
| 밀도 | **v4.1 신규** — 후보 A `--st-space:6px`(조밀)을 전역 spacing 유닛이 아니라 `cardPad`(20→16)·`sectionGap`(40→32)·버튼/인풋 내부 패딩의 **국소 오버라이드**로 반영(근거·리스크는 §5.1) |
| 버튼 | **v4.1**: 컷코너 폐기, **contained = 소프트라운드 12px**(후보 A `--st-radius`, `shapeTokens.radius`), hover 밝기+**코퍼** 글로우(v4 승계), press scale(0.98), 라벨 w700·자간. outlined = 소프트라운드+보더, text = 시그니처 밑줄. 컷코너 토큰은 롤백용으로만 보존(DS-A20, §5·§8.2) |
| 레이아웃 리듬 | v3 승계 — 대형 타이틀 블록+메타 행, 카드 편집 요소, S1 = 게이지 중심 "계기판 한 장" 히어로(§9.4). 480px 중앙 제약. **v4.1**: 카드류에 매트 카퍼 글로우 그림자 추가(후보 A `--st-shadow`, §8.2) |
| 마이크로 인터랙션 | v3 승계 — hover 140ms / press 120ms / enter 200ms, `cubic-bezier(0.2,0,0,1)`. reduced-motion 전역 0ms |
| 불변 승계 | 다크 기본+라이트 토글·부팅 시퀀스(색값만 v4)·상태 6종 3요소·tabular-nums·고정 높이·44px·hex 금지·`--mml-status-*` 간접층·`motorKindColors` |

## 1. 색상 팔레트

### 1.0 시그니처 악센트 결정 — v3 당시 기록 (참고, v4에서 후보 A로 대체됨)

> **v4 갱신**: 아래 표는 v3 당시(라임 vs 시안 비교) 기록이다. v4에서는 라임 자체가 발산 후보
> A(코퍼)로 교체됐다 — 최신 근거는 바로 다음 절(§1.0-v4).

| 후보 | dark / light | 성격 | 판정 |
|---|---|---|---|
| A. Shift-Light Lime | `#D8F542` / `#566E00` | 타코미터 시프트 램프·모터스포츠 리버리(acid green)의 직계 — "레드라인 직전의 빛". 다크 카본 위 발광감 최대(16.1:1), 앰버(warning)·그린(success)과 hue 거리 확보 | v3 채택(2026-07-29) |
| B. Telemetry Cyan | `#45E0DC` / `#007069` | 텔레메트리·HUD 무드. 깨끗하나 크립토 대시보드·게이밍 UI 클리셰로 포화 — "계기판" 서사와의 결속이 약하고 차별화 실패 위험 | 기각 |

- v3 채택 근거(기록 보존): ① 레이싱 계기판 컨셉과 의미가 직결 ② 무채 카본 위 유일 유채색일 때 발광 대비가 가장 큼 ③ 시맨틱 3색과 혼동 없는 hue 슬롯 ④ cyan 대비 유행 소모도가 낮음.

### 1.0-v4 색 팔레트 교체 근거 — Pit-Wall Amber 채택 (2026-08-19)

**v3 자기진단**: v3의 무채 카본(`#0A0A0B`) + 라임 1색(`#D8F542`)은 `design-principles-research.md`
상투 회피 목록의 **"near-black + 단일 애시드(형광 그린/버밀리언) 포인트"와 문자 그대로 일치**한다 —
v3 자체가 AI 수렴 상투 룩이었고, 사용자가 "색감 별로"라고 느낀 구조적 원인으로 진단됐다
(`style-tiles/RENDER-VERDICT.md`).

**발산 3후보** (5축: 색 전략·타이포 전략·밀도·형태 언어·위계 표현 — 후보 쌍마다 최소 3축, A×B/B×C는
5축 전부 상이. 상세는 `style-tiles/README.md`):

| 후보 | 색 전략 | 판정 |
|---|---|---|
| **A. Pit-Wall Amber** | 웜틴트 카본(브라운블랙) + 웜 카퍼/앰버 단일 시그니처, 표면 단차 위계, 모노 디스플레이+휴머니스트 본문 | **채택** |
| B. Track Ceramic | 쿨 네이비차콜 + 파스텔 아이스시안 글로우, 반투명 글래스 표면 | 2순위(기각) |
| C. Graphite Signal | 미드톤 그래파이트 + 틸/스틸블루 듀얼 시그널, 하드엣지 0-radius | 3순위(기각) |

**기각 사유**: B는 반투명 글래스가 밝은 야외/차고 조건에서 저대비로 체감되고 `backdrop-filter`
비용이 트랙사이드 모바일 사용에 부담 — "작동 우선" 기준에서 A에 밀림. C는 0-radius 하드엣지+구조
보더가 v3의 컷코너·직각 세그먼트가 이미 만든 "각지고 딱딱한" 인상을 형태 축에서 충분히 벗어나지
못한다고 판단.

**렌더 판정** (`style-tiles/RENDER-VERDICT.md`, 오케스트레이터 — 사본 무결성 sha256 대조 선행):
내장 대비 검사 3후보 전원 6체크 PASS(하한 미달 없음, A: text/bg 15.58·muted/bg 8.20·text/surface
14.32·on-accent/accent 7.78·danger/bg 6.52·border/bg 4.53), 상투 대조 3후보 전원 통과(A는 웜틴트
bg+비-형광 카퍼로 애시드 시그니처 불성립). **1순위 A 유지 — 거부권 불행사**: "계기판(instrument)
성격(모노 디스플레이+휴머니스트 본문)과 온기 있는 모던함을 동시에 보여주며, 측정 도구라는 서비스
본질과의 결속이 세 후보 중 가장 강함".

**이번 라운드 범위(v4 당시)**: 색 팔레트(원시 토큰·시맨틱 매핑·대비 검증)만 v4로 교체했다. 형태
언어(컷코너 버튼·radius 0/4/8/20)·타이포 페어링·밀도(spacing 8)·컴포넌트 구조·모션 토큰은 v3
승계 — 후보 A가 스타일 타일에서 원래 함께 제안했던 "소프트라운드 12px·조밀 6px" 형태/밀도 축은
당시 반영하지 않았다.

> **v4.1 후속**: 위 범위 제한이 스코핑 결함이었다 — 사용자가 실기기에서 색만 바뀌고 나머지가 그대로임을
> 발견했다. v4.1(§3.1·§5.1·§8·§9)에서 후보 A의 남은 4축(타이포·밀도·형태·컴포넌트 형태)을 마저
> 반영했다. 이 절(§1.0-v4)은 v4 당시 기록으로 보존한다 — 색 관련 판정·근거는 그대로 유효하다.

**motorKindColors 공존 점검** (뱃지 색·hex 무변경, 보존 계약): 시그니처 코퍼(`copper400` `#FF8A3D`,
hue≈24°)가 `torque` 뱃지(`#E8710A`, hue≈28°)와 근접 — 뱃지는 항상 라벨 병행(REQ-NFR-003)이라
식별성 자체는 안전하나, 시그니처는 tint/glow 면·뱃지는 solid 면으로 시각 처리를 분리 유지 권고
(README 승계). v4에서 warning(amber)을 hue 50~53°로 이동한 결과 `light_dash` 뱃지(`#F5D90A`,
hue≈53°)와 새로 근접하나, 뱃지는 solid 필드 배지(항상 라벨 동반)이고 warning은 텍스트/아이콘
전용(항상 라벨+아이콘+"—" 3중, REQ-ST-003)이라 형태 자체가 달라 시각 혼동 위험은 낮다고 판단 —
Phase 3 육안 QA 항목으로 기록.

- 시맨틱 인접성: 코퍼(dark hue≈24° / light hue≈24°) vs 앰버(v4: dark 50° / light 53°) vs
  레드(dark 6° / light 7°) vs success 그린(≈122~140°)은 색상환에서 분리되고, 상태 구분은 어차피
  라벨+아이콘+bg 3요소가 보장한다(§2, §4).

### 1.1 원시 토큰 — light (v4: 후보 A 라이트 제안값 채택, 웜 그레이지 뉴트럴)

| 토큰 | 값 | 역할 |
|---|---|---|
| `copper700` | `#B85C1E` | **시그니처(light)** — primary.main·CTA 면(흰 글자 4.58:1 — 여유 근소, DS-A18)·measuring 라벨(bg white, 4.58:1) |
| `copper800` | `#934A18` | primary.dark — hover/pressed(흰 글자 6.49:1) **및** stable 라벨(bg copperTintL, 5.86:1 — copper700은 tint 배경에서 4.5:1 미달이라 800 사용, §1.4) |
| `copperTintL` | `#F9F2ED` | stable 수치 영역 배경 tint |
| `red800` | `#C6392A` | error/destructive — 순간색(후보 A 라이트 제안값, v3 `#C62828`과 hue 거의 동일) |
| `red50` | `#FDEDED` | error 배경 tint(v3 값 유지 — red800 변경폭이 미미해 재계산 불요) |
| `amber800` | `#7A6C00` | warning — **weak-signal·저장 불가 전용**(v4: hue 34°→53°로 이동, 신규 시그니처와 분리 확보 — §4) |
| `amber50` | `#EFEDE0` | warning 배경 tint |
| `green800` | `#2E7D32` | success — 만족(positive) 전용(입력 없음, v3 값 유지) |
| `green50` | `#EAF4EB` | success 배경 tint(유지) |
| `stone900` | `#241C16` | text.primary·확정 수치(후보 A 라이트 제안값) |
| `stone700` | `#40372F` | 중립 상태 전경(idle·suspended, stone900/600 보간) |
| `stone600` | `#6B5F54` | text.secondary·measuring 미확정 수치(후보 A 라이트 제안값) |
| `stone500` | `#928172` | 입력 외곽선(비텍스트 3:1) — **v4 수정**: README 원안 `#D8CCBE`는 재검증 결과 대비 1.6~1.8:1로 3:1 미달 확인, 3.49~3.75:1로 하향 조정해 교체(§1.4) |
| `stone300` | `#C7BAAC` | disabled 전경(보간) |
| `stone100` | `#F1E9DD` | divider·suspended 배경(보간) |
| `cream50` | `#FBF6F1` | background.default(후보 A 라이트 제안값) |
| `white` | `#FFFFFF` | background.paper |

~~lime700 / lime800 / limeTintL~~ · ~~gray900/700/600/500/300/100/50~~ — **v4 리네임**
(copper*·stone*/cream50, 값도 후보 A 제안 반영).

### 1.2 원시 토큰 — dark (v4: 웜틴트 카본 + 시그니처 코퍼, 후보 A 채택)

| 토큰 | 값 | 역할 |
|---|---|---|
| `umber950` | `#1A1410` | **background.default** — 웜틴트 카본 블랙(후보 A `--st-bg`). `<meta theme-color>` 다크 값 |
| `umber900` | `#1F1813` | S1 히어로 존 bg(idle·measuring) — bg/paper 사이 보간(후보 A는 2단만 정의, 표면 단차 4단 유지 위해 확장) |
| `umber800` | `#241C16` | **background.paper** — 카드·시트·탭 바 표면(후보 A `--st-surface`) |
| `umber700` | `#2E2418` | 상승 표면 — suspended bg·hover 표면(보간) |
| `hairline` | `rgba(140,124,107,0.18)` | divider·기본 헤어라인(장식, 대비 요건 비대상) — 후보 A 보더 hue의 저알파 파생 |
| `hairlineStrong` | `#8C7C6B` | **편집 구분선·베젤 링·입력 외곽선**(후보 A `--st-border`, 비텍스트 4.53:1 실측) — **v4 통합**: v3의 hairlineStrong(rgba 0.16)과 smoke600(입력 외곽선)을 후보 A의 단일 보더 값으로 통합(토큰 1개 감소, DS-A19) |
| `cream100` | `#F4ECE2` | text.primary — 웜 뉴트럴 화이트(후보 A `--st-text`, 15.58:1 실측) |
| `sand200` | `#D6CCC1` | **measuring 미확정 수치** — cream100/sand400 보간(11.07:1 on umber900). 확정(white)과 명도 단차 |
| `sand400` | `#B8ACA0` | text.secondary·중립 상태 전경·"—" placeholder(후보 A `--st-text-muted`, 8.20:1 실측) |
| `sand700` | `#59514A` | disabled 전경(보간) |
| `copper400` | `#FF8A3D` | **시그니처(dark)** — primary.main·CTA·선택·measuring·stable 잠금·focus ring(후보 A `--st-accent`, on-accent 7.78:1 실측). contained 버튼은 umber950 글자 |
| `copper300` | `#FF9D5C` | primary.dark(다크) — hover/pressed **상승**(보간, umber950 대비 8.88:1) |
| `copperTint` | `#382316` | stable 수치 영역 배경 tint — shift-light 잠금면(보간, white 14.78:1 / copper400 6.30:1) |
| `copperGlow` | `rgba(255,138,61,0.25)` | primary 버튼 hover 글로우 전용(box-shadow — 장식, v3 limeGlow와 동일 알파·색만 교체) |
| `copperShadow` | `rgba(255,138,61,0.14)` | **v4 additive(선택, 미배선)** — 후보 A `--st-shadow`의 컬러 성분 그대로. 저채도 글로우 그림자(후보 A 형태 언어 특징), `0 1px 2px rgba(0,0,0,0.4)`와 병행 사용 전제. 이번 라운드는 토큰만 확보, theme.ts 배선은 별도 결정 |
| `amber400` | `#FFD400` | warning — **weak-signal·저장 불가 전용**(v4: hue 42°→50°로 이동, 신규 시그니처(hue≈24°)와 분리 확보 — §4) |
| `amberTint` | `#332B10` | warning 배경 tint(보간) |
| `red400` | `#FF6B5A` | error — destructive·no-permission·레드라인 밴드(장식)(후보 A `--st-danger`, 6.52:1 실측) |
| `redTint` | `#39201A` | error 배경 tint(보간) |
| `green400` | `#66BB6A` | success — 만족 전용(입력 없음, v3 값 유지) |
| `greenTint` | `#122A16` | success 배경 tint(유지) |
| `white` | `#FFFFFF` | **stable 확정 수치** — 계기판 주인공 |

~~carbon950/900/800/700~~ · ~~chalk100~~ · ~~smoke200/400/600/700~~ · ~~lime400/300/Tint/Glow~~ —
**v4 리네임**(umber/cream/sand/copper, 값도 갱신). 키 이름 변경 낙차는 §10.

### 1.3 WCAG 2.2 AA 대비 검증 — dark v4 (계산치, QA gate에서 axe 재검증)

| 조합 | 용도 | 대비 | 기준 | 판정 | 근거 |
|---|---|---:|---|---|---|
| cream100 / umber950 | 본문·페이지 타이틀 | 15.58:1 | 4.5:1 | 통과 | RENDER-VERDICT 실측 |
| cream100 / umber800 | 카드 위 본문 | 14.32:1 | 4.5:1 | 통과 | RENDER-VERDICT 실측 |
| sand400 / umber950 | 보조 텍스트·메타 행 | 8.20:1 | 4.5:1 | 통과 | RENDER-VERDICT 실측 |
| sand400 / umber900 | idle 라벨·안내 | 7.89:1 | 4.5:1 | 통과 | 손계산 |
| sand200 / umber900 | **measuring 미확정 수치** | 11.07:1 | 3:1(대형) | 통과 | 손계산 |
| white / copperTint | **stable 확정 수치** | 14.78:1 | 3:1(대형) | 통과 | 손계산 |
| copper400 / copperTint | stable 라벨·lock 아이콘 | 6.30:1 | 4.5:1 | 통과 | 손계산 |
| copper400 / umber950 (양방향) | 시그니처 텍스트·contained 버튼(umber950 글자)·focus ring | 7.78:1 | 4.5:1 | 통과 | RENDER-VERDICT 실측(on-accent/accent) |
| copper400 / umber900 | **measuring 라벨·펄스·진행 아크** | 7.47:1 | 4.5:1 | 통과 | 손계산 |
| copper400 / umber800 | 카드 위 시그니처(탭 활성·텍스트 버튼) | 7.15:1 | 4.5:1 | 통과 | 손계산 |
| umber950 / copper300 | primary 버튼 hover | 8.88:1 | 4.5:1 | 통과 | 손계산 |
| amber400 / umber900 | weak-signal 라벨·"—"·저장 불가 안내 | 12.24:1 | 4.5:1 | 통과 | 손계산(v4 hue 이동 후) |
| amber400 / amberTint | Alert 경고 배너(MuiAlert standardWarning) | 9.47:1 | 4.5:1 | 통과 | 손계산 |
| red400 / redTint | no-permission 라벨·오류 배너 | 5.38:1 | 4.5:1 | 통과 | 손계산 |
| red400 / umber950 (양방향) | destructive contained(umber950 글자)·오류 텍스트 | 6.52:1 | 4.5:1 | 통과 | RENDER-VERDICT 실측(danger/bg) |
| sand400 / redTint | no-permission 안내 문구 | 6.77:1 | 4.5:1 | 통과 | 손계산 |
| sand400 / umber700 | suspended 라벨·안내 | 6.84:1 | 4.5:1 | 통과 | 손계산 |
| green400 / umber800 | 만족 star·success 텍스트 | 7.09:1 | 4.5:1 | 통과 | 손계산(값 유지, 재검증) |
| green400 / greenTint | success Alert | 6.49:1 | 4.5:1 | 통과 | 손계산(값 유지, 재검증) |
| hairlineStrong / umber950 | 입력 외곽선·페이지 배경 위 보더 | 4.53:1 | 3:1(비텍스트) | 통과 | RENDER-VERDICT 실측(border/bg) |
| hairlineStrong / umber800 | 카드 위 보더 | 4.16:1 | 3:1(비텍스트) | 통과 | 손계산 |

- `hairline`(장식)·표면 단차·비네트·`copperShadow`·레드라인 밴드는 장식(대비 요건 비대상) — 의미
  있는 경계·상태는 항상 라벨+아이콘+본 표의 텍스트 대비가 담당.
- disabled(`sand700`)는 대비 예외(WCAG 1.4.3 incidental).
- "손계산" 행은 RENDER-VERDICT의 실측 방법론(sRGB→linear 상대휘도 공식)과 동일 공식을 사용 —
  실측 6건과 대조해 오차 0.1 이내로 정합 확인(방법론 검산 완료).

### 1.4 WCAG 2.2 AA 대비 검증 — light v4

| 조합 | 용도 | 대비 | 기준 | 판정 | 근거 |
|---|---|---:|---|---|---|
| copper700 / white (양방향) | 시그니처 텍스트·contained 버튼(흰 글자)·measuring 라벨 | **4.58:1** | 4.5:1 | 통과(여유 근소 0.08 — QA axe 필수, 미달 시 DS-A18 대체 경로) | 손계산 |
| white / copper800 | primary 버튼 hover | 6.49:1 | 4.5:1 | 통과 | 손계산 |
| copper800 / copperTintL | **stable 라벨·lock 아이콘** — copper700 대신 800 사용(§1.1) | 5.86:1 | 4.5:1 | 통과 | 손계산 |
| stone900 / copperTintL | **stable 확정 수치** | 15.13:1 | 3:1(대형) | 통과 | 손계산 |
| amber800 / white | weak-signal·저장 불가 | 5.29:1 | 4.5:1 | 통과 | 손계산(v4 hue 이동 후, v3는 5.2:1) |
| stone700 / stone100 | suspended 라벨·안내 | 9.66:1 | 4.5:1 | 통과 | 손계산 |
| stone500 / white | 입력 외곽선 | 3.75:1 | 3:1(비텍스트) | 통과 | 손계산(README 원안 실패 후 재조정, §1.1) |
| stone500 / cream50 | 페이지 배경 위 보더 | 3.49:1 | 3:1(비텍스트) | 통과 | 손계산 |

~~lime700/gray50 5.5:1~~ — v4에서 페이지 배경(cream50) 위 시그니처 텍스트 직접 사용은 **금지**
(copper700/white의 여유가 근소해 cream50 위에서는 4.5:1 미달 위험 — DS-A18). v1/v3 gray 무채 표는
stone/cream 리네임으로 대체(§1.1, 값은 후보 A 라이트 제안 반영).

## 2. 측정 상태 6종 시각 토큰 (S1 핵심 계약 — 값만 v4 갱신, 구조 불변)

status enum·`measureStatusTokens` export 형태(fg/bg/valueFg/icon)·`var(--mml-status-{status}-{part})`
간접층·소비 방식 전부 불변. **실값만 교체** — StatusLabel·BigNumber·RpmGauge 코드 무변경으로 모드
전환(§10의 낙차 제외).

| status | 라벨 | dark: fg / bg / valueFg | light: fg / bg / valueFg | icon | 비색상 구분 장치(불변) |
|---|---|---|---|---|---|
| `idle` | "측정 대기" | sand400 / umber900 / sand400 | stone700 / white / stone700 | `mic` | 대형 [녹음 활성화] 버튼이 주인공 |
| `measuring` | "측정 중" | **copper400** / umber900 / **sand200** | **copper700** / white / stone600 | `pulse-dot` | 라벨 상시 + 코퍼 펄스 + 진행 아크(§9.4) |
| `stable` | "측정 완료 · 확정" | **copper400** / **copperTint** / **white** | **copper800** / copperTintL / stone900 | `lock` | **잠금 아이콘 + 라벨 + 배경 tint 3중** + 갱신 정지 + CTA 노출 |
| `weak-signal` | "신호 약함" | amber400 / umber900 / sand400 | amber800 / white / stone700 | `signal-low` | 숫자 미표시 — "—" placeholder만(REQ-ST-003). bg는 상태색 레이어 없이 중립 표면(v2.2 버그 수정 승계 — 게이지를 덮는 노란 레이어 방지) |
| `no-permission` | "마이크 권한 필요" | red400 / redTint / sand400 | red800 / red50 / stone700 | `mic-off` | 일시/영구 문구 분리 + 복구 버튼 상시 |
| `suspended` | "오디오 일시 중지됨" | sand400 / umber700 / sand400 | stone700 / stone100 / stone700 | `pause` | [탭하여 다시 시작] 대형 버튼 — 오류 톤 아님 |

**a11y 규칙 (v2 전량 승계 + v3 보강 + v4 값 갱신)**
1. 색 단독 구분 금지 — StatusLabel이 라벨+아이콘과 병행 캡슐화. **다크에서는 measuring·stable이
   동일 `copper400`을 공유**하지만 bg(투명 umber900 vs copperTint)·아이콘(pulse-dot vs lock)·라벨·
   수치 명도(sand200 vs white)·갱신 정지 5중 장치가 구분을 보장한다. **라이트는 copper700
   (measuring)·copper800(stable)로 값이 갈라진다** — tint 배경에서 700의 대비 여유가 부족해 800을
   쓴 v4 조정(§1.4)이며, 이 경우도 bg·아이콘·라벨·수치 명도·갱신 정지 5중 장치가 구분을 보장한다.
2. 상태 전이 `aria-live="polite"` 텍스트 알림 유지.
3. stable 잠금 전환: bg tint 1회 400ms(`motionTokens.stableTransitionMs`), reduced-motion 0ms —
   정지 화면만으로 판별 가능.
4. weak-signal "—"는 `rpmValue` 토큰으로 렌더 — 고정 높이 유지.
5. S1 히어로 존의 베젤(hairlineStrong 링)·비네트(`--mml-hero-vignette`)·레드라인 밴드는 전부
   장식(`aria-hidden`) — 상태 판별에 관여하지 않는다.

## 3. 타이포그래피 (v4.1: 디스플레이/본문 2패밀리 분리 신설 — 색은 무변경)

### 3.1 폰트 스택 — 3계 구조 (v4.1)
시스템 폰트 유지(웹폰트 기본 금지 — DS-A2, 후보 A도 시스템 스택만 사용해 동일 원칙). **v4.1**:
후보 A의 타이포 축("모노스페이스 디스플레이 + 휴머니스트 본문, 2패밀리 분리, 위계는 크기·웨이트
대비")을 반영해 `displayFontStack`을 신설한다. 기존 `numericFontStack`(OPTION-F1, §3.6)과
역할이 겹치지 않도록 아래 표로 경계를 명시한다 — **중복 아님, 완전 분리**: 하나는 '헤딩', 하나는
'계기 숫자'.

| 스택 | 값 | 적용 범위 | 근거 |
|---|---|---|---|
| `displayFontStack`(v4.1 신규) | `"SFMono-Regular", "Roboto Mono", ui-monospace, Menlo, Consolas, monospace` | **h1(페이지 타이틀)·h2(섹션 헤딩)만** | 후보 A `--st-font-display`. 후보 A `index.html` 템플릿에서 이 변수가 실제로 걸리는 두 셀렉터(`.st-display`·`.st-h2`)만 근거로 확정 — 라벨(`.st-label`)·본문(`.st-body`)·버튼·인풋·표는 전부 `--st-font-body`를 쓴다(템플릿 CSS 확인, 육안 추정 아님) |
| 본문 스택(무변경) | `-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', Roboto, 'Noto Sans KR', 'Malgun Gothic', sans-serif` | body1/body2/caption/**overline**/button/**listValue**/**fanoValue**/입력·버튼 라벨/S1 메타 행 | 후보 A `--st-font-body`(제네릭 휴머니스트)를 그대로 쓰지 않고 기존 한글 폴백 포함 스택을 유지 — **원칙 대비 근거**: 서비스가 한국어 UI라 `Noto Sans KR`/`Malgun Gothic` 폴백이 없으면 한글 렌더가 시스템 기본 세리프/미스매치 폰트로 깨질 위험이 있다. 값은 사실상 동등한 휴머니스트 산세리프 계열이라 시각적 차이는 없다 |
| `numericFontStack`(§3.6, 무변경) | `'Oxanium Variable', system-ui, sans-serif` | `rpmValue`·`guideRange`만(S1 계기 초대형 숫자·`guideRange`) | OPTION-F1(RV-4 채택 완료) — displayFontStack과 적용 지점이 전혀 겹치지 않는다(하나는 텍스트 헤딩, 하나는 숫자 전용 가변 폰트) |

overline·listValue·fanoValue·button은 모두 본문 스택을 유지한다 — 후보 A 템플릿의 `.st-label`이
`--st-font-display`를 쓰지 않는 것과 정합.

### 3.2 수치 토큰 4종 (v3 값 — 전부 tabular-nums 유지)

| 토큰 | 값 | 근거 |
|---|---|---|
| `rpmValue` | clamp(64px,22vw,120px) w800 ls-0.045em lh1 | 화면의 압도적 주인공 — 480px에서 105px |
| `fanoValue` | clamp(20px,6.5vw,28px) w600 | 메타 행 위계만 강화(행 높이 파생 불변) |
| `guideRange` | clamp(40px,12vw,56px) w800 ls-0.03em lh1.1 | S5 히어로 수치 |
| `listValue` | 0.9375rem w600 | 목록 수치 명료화 |

- `layoutTokens.measureValueMinHeight`(현행 `clamp(224px, 66vw, 300px)` — 게이지 확대 후속
  재클램프, §5)와 동조. 6-status 동일 높이·layout shift 0 불변식은 그대로다(DS-A16).

### 3.3~3.5 수치 포맷·고정 높이 원칙·일반 스케일 (v3 값)

| variant | 값 |
|---|---|
| h1 (페이지 타이틀) | clamp(28px,7vw,34px) w800 ls-0.02em lh1.15, **fontFamily: `displayFontStack`(v4.1)** |
| h2 (섹션) | 18px w700 ls-0.01em, **fontFamily: `displayFontStack`(v4.1)** |
| overline | 11px w700 자간 0.12em — 편집 오버라인(카드 인덱스 "01"·메타 라벨·게이지 캡션). 본문 스택 유지(§3.1) |
| button | 1rem w700 자간 0.01em(large 1.0625rem·자간 0.02em). 본문 스택 유지(§3.1) |
| body1/body2/caption | v1 승계, 본문 스택 유지 |

다크 `-webkit-font-smoothing: antialiased` 유지(§8 CssBaseline).

### 3.6 OPTION-F1 — 숫자 전용 가변 웹폰트 (채택 완료, RV-4)

| 항목 | 내용 |
|---|---|
| 채택 폰트 | **Oxanium Variable**(SIL OFL, wght 200~800) |
| 서브셋 | 숫자 전용: `0-9 . , — × %` |
| 적용 범위 | `rpmValue`·`guideRange`만(`numericFontStack` export) — 본문·라벨·목록 수치는 시스템 스택 유지 |
| 무결성 장치 | `font-display: optional` — 로드 못 하면 그 세션은 시스템 폰트 고정(layout shift 0) |

## 4. 시맨틱 색 규칙 (v3 원칙 유지 + v4 값 갱신)

| 대상 | 규칙 | v4 변경점 |
|---|---|---|
| **시그니처 코퍼(primary)** | 행동(CTA)·선택(세그먼트/탭/라디오)·진행(measuring)·확정(stable 잠금)·focus ring — **평시 화면의 유일한 유채색** | v3 라임(hue≈68°)을 발산 후보 A 카퍼(dark/light hue≈24°)로 교체. 1색 규율 원리는 불변 |
| **앰버(warning)** | **경고 순간 전용**: weak-signal, 전역 저장 불가 배너. 버튼 색 사용 금지 | **v4**: hue를 42°(dark)/34°(light)에서 **50°/53°**로 이동 — 신규 시그니처(hue≈24°)와 26°+ 분리 확보(README §시맨틱 순간색 원칙 Phase 2 후속 이행, DS-A17). 용도·구조(measuring에서 제외) 불변 |
| **레드(error)** | destructive(삭제·resetAllData)·no-permission·저장 실패 — ConfirmDialog 계약 밖 red 버튼 금지. 게이지 레드라인 밴드는 장식 예외(DS-A15) | 발산 후보 A danger 값 채택(dark `#FF6B5A`, light `#C6392A`) — hue는 v3와 거의 동일(적색 계열, 6~7°), 시그니처 코퍼(hue≈24°)와 17°+ 분리 유지 |
| **그린(success)** | 만족(positive) 전용 — Switch `color="success"` + 라벨 상시, S4 star 아이콘+색 병행 | 입력 없음(후보 A 13변수에 success 슬롯 없음) — v3 값 유지(hue≈122~140°, 코퍼·앰버 모두와 90°+ 분리) |
| 주행 결과 3종·모터 등급 4단계 | 중립 텍스트 — 시맨틱 색 미부여(DS-A5) | 무변경 |
| 분산 큼 보조 문구(S5) | `text.secondary` 중립 | 무변경 |
| **motorKindColors(뱃지)** | 실물 엔드벨 색 — 상태·경고가 아닌 물리 제품 식별색. 항상 라벨 텍스트 병행이라 색 단독 구분 아님(REQ-NFR-003) | **무변경**(hex·bg·fg·border 전량 유지). v4 팔레트와의 공존 점검은 §1.0-v4 부록 |

## 5. 간격·크기 토큰 (v4.1: 밀도·형태 축 반영 — §5.1·radius 체계 갱신)

- MUI `spacing` 유닛 **8px 그대로 유지**(전역 미변경 — 근거는 §5.1)·`contentMaxWidth` 480·
  `touchTargetMin` **44px**·`formControlHeight` 48·버튼 48/56·행 ≥56·`bottomNavHeight`
  56+safe-area·safe-area 변수 — 전량 승계, 이번 라운드 무변경.
- `measureValueMinHeight` = `clamp(224px, 66vw, 300px)`(게이지 확대 후속 재클램프 — 고정 높이
  계약은 유지, §3.2).
- `layoutTokens` additive 키(**v4.1 값 갱신**): `sectionGap: 32`(v4: 40 → v4.1: 32, 8×4 — 밀도
  전략 §5.1), `cardPad: 16`(v4: 20 → v4.1: 16, 8×2).
- radius 체계(**v4.2 갱신** — 후보 A 소프트라운드 축 반영, DS-A20·DS-A21): **12 = 버튼·인풋·
  카드·세그먼트(ToggleButtonGroup/ToggleButton — v4.2: 직각 과도기 종료, `theme.shape.
  borderRadius`가 MUI 내장 grouped-edge 로직으로 그룹 첫/끝 바깥 모서리에 적용)** · **999 =
  필터/태그 계열 pill**(`SegmentControl.rounded`·`RaceRetireReasonSelect`의 `Chip` — 후보 A가
  다루지 않는 별도 형태 언어, 이미 앱 전역에서 서로 정합돼 있어 12로 낮추면 오히려 기존 정합이
  깨진다. DS-A21) · **8 = 다이얼로그**(무변경 — 후보 A가 다이얼로그 축을 다루지 않아 기존 값
  승계, 12보다 각진 위계로 의도적 차등) · **20 = 바텀시트 상단**(무변경). **범위 밖(이번
  라운드 미반영)**: `MotorKindSelect`의 그리드 셀(로컬 `borderRadius:0` 강제, theme 정책이
  닿지 않음 — §10)과 S1 히어로 베젤 링(radius 4, §9.4)은 레이스 기록 화면 스코프 밖이라 이번
  v4.2에서 건드리지 않는다 — 사용자가 명시 요청 시 별도 반영.
- ~~컷코너(clip-path polygon)~~ 버튼 형태는 v4.1로 폐기됐다. `shapeTokens.cutCorner`/
  `cutCornerLg` 값은 **보존**(롤백용 + `MotorDetailPage.tsx`의 개별 참조 — 그 파일은 v4.1
  동기화 시 소프트라운드로 교체 대상, §8.2·§10) — 전역 버튼 시스템은 더 이상 참조하지 않는다.
- 그림자(형태 언어 3요소 중 하나): 매트 카퍼 글로우(후보 A `--st-shadow`) — 카드류(`MuiPaper`
  `outlined`)에 신규 배선. dark `0 4px 20px rgba(255,138,61,0.14), 0 1px 2px rgba(0,0,0,0.4)`
  (후보 A 값 그대로) / light `0 4px 16px rgba(184,92,30,0.10), 0 1px 2px rgba(36,28,22,0.06)`
  (v4.1 신규 결정 — 근거: 후보 A는 다크 대표값만 제공, 라이트는 순검정 고알파 그림자 대신
  copper700 계열 저알파 글로우 + 저알파 웜뉴트럴 근접 그림자로 재구성해 밝은 표면에서 그림자가
  과중하게 읽히는 문제를 피했다). 보더는 이미 1px(얇음) — 변경 불요.
- 버튼(v4.1): `contained` = 소프트라운드 12px, 표준 MUI 배경 모델(clip-path 이중층 폐기) + hover
  밝기/침강 + (다크) 코퍼 글로우, press scale 0.98 유지. `outlined`/`text` = 형태만 12px로
  갱신, 나머지 규칙 무변경(§8.2·§9.1).

### 5.1 밀도 전략 — v4.1 결정 (후보 A `--st-space: 6px` 적용 방식과 근거)

**결정: 컴포넌트/토큰 국소 오버라이드 — MUI 전역 `spacing` 유닛(8)은 바꾸지 않는다.**

이유:
1. `theme.spacing(n)`을 경유하는 `sx` 숏핸드(`p`/`m`/`gap`/`px`/`mx` 등 숫자 prop)는 FSD 전역
   30~50+ 파일에 흩어져 있다. 전역 유닛을 8→6으로 내리면 이 라운드에서 리뷰하지 않은 모든
   sx 숏핸드 지점이 **동시에, 조용히** 25% 줄어든다 — `srOnlySx`(§8.1) 주석이 기록한 v2.15
   사고(단위 없는 숫자 sx prop이 `theme.spacing()` 배수로 조용히 해석되어 `BottomSheet`에
   실제 가로 스크롤 버그가 난 전례)가 정확히 이 클래스의 리스크를 실증한다. 이번 라운드는
   design-system.md 한 파일만 수정하는 CHANGE_BUDGET이라 그 30~50+ 파일을 전수 검증할 수 없다.
2. `layoutTokens`(formControlHeight·bottomNavHeight·sectionGap·cardPad·measureValueMinHeight
   등)는 이미 `theme.spacing()`을 거치지 않는 raw px 상수다 — 즉 앱의 핵심 레이아웃 리듬과
   44px 타깃 계약은 애초에 MUI spacing 유닛과 독립이라, 유닛을 바꿔도 이 불변식들은 전혀
   영향받지 않는다(바꿔서 얻는 이득이 없다 — 이득 없이 전역 리스크만 지는 셈).
3. 후보 A `README.md` 자신이 "타일 단일 토큰이 요소/그룹/섹션 3단 간격을 동시에 표현해야
   하는 제약 속의 근접값 — 실제 토큰화 시 4/8/12/16/24/32 전 스케일로 환원"이라고 명시한다.
   6px 리터럴 고수를 후보 자신도 요구하지 않는다.

대신 조밀함은 8pt 스케일(design-principles-spacing-layout.md 준수) 안에서 **명명된 토큰**으로
국소 반영한다:
- `layoutTokens.cardPad`: 20 → **16**(8×2) — 카드 내부 패딩.
- `layoutTokens.sectionGap`: 40 → **32**(8×4) — 섹션 간 여백.
- `MuiButton`/`MuiOutlinedInput` 내부 패딩: 리터럴 px로 소폭 축소(§8.2, MUI 기본 대비 조밀) —
  `theme.spacing()`을 경유하지 않는 CSS-in-JS 리터럴이라 전역 파급이 없다.

**터치 타깃 불변식(요구 4)**: `formControlHeight`(48)·버튼 `minHeight`(48/56)·`touchTargetMin`
(44)은 이번 조밀화에서 전혀 건드리지 않는다. 패딩 축소는 `minHeight`가 명시적으로 하한을
고정하는 한 콘텐츠 상자를 작게 만들 뿐 실제 렌더 높이를 44px 아래로 내리지 않는다 — CSS
`min-height`가 패딩·콘텐츠 합보다 크면 그 값으로 강제되므로 구조적으로 보장된다.

**레이아웃 파손 리스크(v2.x 이력 문화 명시적 반영)**: `cardPad`/`sectionGap`은 raw px 상수이므로
`layoutTokens` export를 실제로 참조하는 소비처만 자동으로 값이 바뀐다. 위험은 반대 방향 —
`layoutTokens`를 우회해 `20`/`40`을 로컬 sx에 직접 하드코딩한 지점이 있다면 이번 갱신 후
그 지점만 새 값(16/32)과 시각적으로 어긋나 보인다. 동기화 담당은 `rg
'padding:\s*20\b|gap:\s*40\b|padding:\s*\x2740px|padding:\s*\x2720px'` 류로 `layoutTokens`
우회 하드코딩 잔존을 먼저 확인할 것(§10).

## 6. 포커스·forced-colors·모션 (v3 구조 승계 + v4 값 갱신)

| 항목 | 계약 |
|---|---|
| **focus ring** | 전역 `*:focus-visible { outline: 2px solid var(--mml-focus-ring); outline-offset: 2px }` 유지. 실값: dark `copper400`(인접 대비 umber950 7.78 / umber800 7.15 / copperTint 6.30 — 전부 ≥3:1), light `copper700`(white 4.58:1 — 여유 근소, DS-A18로 cream50 직접 사용 금지). **v4.1**: 버튼이 표준 MUI 배경 모델(컷코너 clip-path 폐기)로 복귀해 outline이 잘릴 우려 자체가 없다 — 과거 "컷코너에서도 ring 생존" 구조 원칙(DS-A13)은 폐기, 이제는 일반 규칙만 적용(§9.1) |
| **forced-colors** | 시스템 색 승계 허용 — 상태 구분은 라벨+아이콘 보장. **v4.1**: 컷코너 폐기로 버튼이 표준 MUI contained 배경 모델(배경색이 root에 직접 걸림)로 복귀해 `border: 1px solid transparent` 가드가 더 이상 필요 없다(그 가드는 ::before 배경층이 forced-colors에서 소실되는 문제의 대응책이었다 — DS-A13 폐기, DS-A20) — 제거 |
| **prefers-reduced-motion** | 전역 0ms(CssBaseline) + press scale `transform: none` + 펄스 정지 점 + 진행 아크·바늘 즉시 이동 + 모드 토글 무전환 |
| **모션 토큰** | v3 값 승계 — `hoverMs: 140` / `pressMs: 120` / `enterMs: 200` / `needleMs: 100` / `easeStandard` / `easeOut` / `stableTransitionMs: 400` / `pulsePeriodMs: 1200` |
| **미세 규정** | hover: 배경/보더 밝기 전환 140ms + (dark primary 한정) **코퍼 글로우** box-shadow. press: `scale(0.98)` 120ms. 카드 hover: 보더 hairline→hairlineStrong. 탭 활성: 상단 2px **코퍼** 인디케이터. 전부 CSS transition — JS/라이브러리 금지 |
| **OPTION-M1 (선택지)** | 페이지 전환 페이드 — 기본 OFF, 체크포인트 결정(v3 승계) |
| 터치 타깃 | 44px 유지 — ThemeToggle 포함 |

## 7. 모드 아키텍처 (다크 기본 + 라이트 토글 — v2 구조 불변, 값만 v4)

### 7.1 결정
v2 §7.1 그대로 — 다크 기본, 2택(dark/light, DS-A7), localStorage `mml-mode` 영속, MUI
`useColorScheme`+`modeStorageKey`(신규 의존성 0).

### 7.2 부팅 시퀀스 (no-flash 계약 — 색값만 v4 갱신)

1. **`index.html` `<head>` 인라인 스크립트**:

```html
<meta name="theme-color" content="#1A1410">
<style>html{background-color:#1A1410}</style>
<script>
  ;(function () {
    var mode = 'dark'
    try { if (localStorage.getItem('mml-mode') === 'light') mode = 'light' } catch (e) {}
    document.documentElement.setAttribute('data-mui-color-scheme', mode)
    if (mode === 'light') document.documentElement.style.backgroundColor = '#FBF6F1'
  })()
</script>
```

2. theme `defaultColorScheme: 'dark'` — JS 실패 시에도 다크로 뜬다(흰 플래시 없음).
3. ThemeProvider: `<ThemeProvider theme={theme} defaultMode="dark" modeStorageKey="mml-mode" disableTransitionOnChange noSsr>`.
4. `<meta name="theme-color">` 동기화: 초기 `#1A1410`, 토글 시 app-shell effect가
   `themeColorMeta[mode]`(dark `#1A1410` / light `#FBF6F1`) 소비 — hex 금지 규칙 준수.

### 7.3 토글 UI 배치
v2 그대로 — S1 우상단 고정 IconButton(44×44, safe-area, 수치 영역 밖) + PageHeader `action` 슬롯.
`ThemeToggle`(`shared/ui/theme-toggle`) 무변경.

## 8. MUI Theme 설정 (v4 — 이 두 블록을 각 파일로 그대로 이식)

> 토큰 canonical = `src/shared/config/design-tokens.ts`, theme = `src/app/theme.ts`(하위 호환
> re-export 유지). **export 심볼 이름(`color`·`darkColor`·`measureStatusTokens`·`numericTypography`·
> `layoutTokens`·`motionTokens`·`shapeTokens`·`buildModeCssVars`) 전부 불변** — v4는 그 내부 **키
> 이름·값만 갱신**한다(carbon→umber / chalk→cream / smoke→sand / lime→copper / gray→stone,
> gray50→cream50). import 구문은 변경 불요.

### 8.1 `src/shared/config/design-tokens.ts`

```ts
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
  // v4.1 신규 — 카드류 매트 그림자(light) 글로우 성분. 후보 A는 다크 대표값만 제공해 라이트는
  // 신규 결정: copper700 계열 저알파(순검정 고알파 대신 — §5 근거). 장식(대비 요건 비대상).
  copperShadowL: 'rgba(184, 92, 30, 0.10)',
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
  copperShadow: 'rgba(255, 138, 61, 0.14)', // v4.1: MuiPaper outlined에 배선 완료(§8.2) — 후보 A --st-shadow 컬러 성분, `0 4px 20px ${copperShadow}, 0 1px 2px rgba(0,0,0,0.4)`로 조합
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

/**
 * v4.1 신규 — 후보 A `--st-font-display`(시스템 모노스페이스, "기계식 크로노그래프" 서사).
 * 적용은 h1(페이지 타이틀)·h2(섹션 헤딩)만(theme.ts typography, §3.1) — numericFontStack과
 * 역할이 겹치지 않는다(하나는 헤딩 텍스트, 하나는 S1 계기 숫자 전용). 웹폰트 아님 — 전부
 * 시스템 설치 폰트 스택(DS-A2 승계).
 */
export const displayFontStack = '"SFMono-Regular", "Roboto Mono", ui-monospace, Menlo, Consolas, monospace'

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
 * 4. 레이아웃·형태·모션 토큰 (v4.1: cardPad·sectionGap·shapeTokens.radius 갱신 — §5·§5.1. 나머지 값 v3 승계)
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
  /** 섹션 간 수직 여백 (px) — v4.1: 40 → 32(8×4), 밀도 전략 §5.1 */
  sectionGap: 32,
  /** 카드 내부 패딩 (px) — v4.1: 20 → 16(8×2), 밀도 전략 §5.1 */
  cardPad: 16,
  safeAreaTop: 'var(--mml-safe-top)',
  safeAreaBottom: 'var(--mml-safe-bottom)',
} as const

/**
 * v4.1(DS-A20, §5): 전역 버튼 시스템은 컷코너를 더 이상 쓰지 않는다 — 후보 A 소프트라운드
 * 12px 채택. cutCorner/cutCornerLg 값은 **롤백·개별 참조용으로 보존**한다(삭제 금지):
 * `MotorDetailPage.tsx`가 이 clip-path를 outlined 보조 버튼 하나에 직접 import해 쓰고 있어
 * 삭제하면 그 파일이 컴파일 에러로 깨진다 — 그 파일은 v4.1 동기화 시 소프트라운드로 교체
 * 대상이다(§8.2 이식 주의, §10). `radius`는 버튼·인풋·카드 3종이 공유하는 신규 형태 토큰이며
 * `theme.shape.borderRadius`와 같은 값(12)을 별도 이름으로도 노출한다 — 컴포넌트 override에서
 * `theme.shape.borderRadius` 대신 명시적 상수를 참조하고 싶은 지점(root sx 직접 소비 등)을 위함.
 */
export const shapeTokens = {
  cutCorner: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)', // DEPRECATED — 전역 버튼 미사용(v4.1)
  cutCornerLg: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)', // DEPRECATED — 전역 버튼 미사용(v4.1)
  /** v4.1 신규 — 버튼·인풋·카드 공통 소프트라운드(후보 A `--st-radius`, §5). 다이얼로그(8)·시트 상단(20)은 별도 값 유지 — 여기 포함 안 됨 */
  radius: 12,
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
```

### 8.2 `src/app/theme.ts`

```ts
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
```

**이식 시 주의 (구현 담당)**
1. `index.html`: §7.2 인라인 스크립트 + `<meta name="theme-color" content="#1A1410">` +
   `<style>html{background-color:#1A1410}</style>` — **v3의 `#0A0A0B` 2곳을 `#1A1410`으로,
   라이트 `#F8F9FA`는 `#FBF6F1`로 교체.** viewport `viewport-fit=cover` 유지.
2. ThemeProvider props: `defaultMode="dark" modeStorageKey="mml-mode" disableTransitionOnChange noSsr`
   — 부팅 스크립트 localStorage 키와 동일해야 한다.
3. **`InitColorSchemeScript` 컴포넌트를 React 트리에 넣지 말 것** — CSR에서 실행되지 않는다
   (§7.2-1). index.html 인라인 스크립트가 그 역할.
4. `defaultColorScheme: 'dark'`가 현행 MUI 버전에서 `:root`에 다크 변수를 붙이는지 빌드 후
   devtools 확인 — v3 이식에서 이미 검증된 경로면 생략 가능.
5. `measureStatusTokens`는 var() 문자열 유지 — 소비처 무변경. **canvas 등 비-CSS 소비 금지**
   (DS-A8).
6. `MeasureStatus` 타입 결속(`Record<MeasureStatus, MeasureStatusVisual>`) — `measureStatusSchemeValues`
   dark/light 두 벌 모두.
7. `CssBaseline` 프로바이더 트리 포함 유지 — safe-area·상태 변수·focus ring·reduced-motion·html
   배경·`--mml-hero-vignette`가 전부 여기서 나온다.
8. theme-color 동기화 effect는 `themeColorMeta` export 소비 — app 코드 hex 금지 유지.
9. **v4 신규**: `darkColor`/`color` 키 이름 변경 — dark(`carbon`→`umber`, `chalk`→`cream`,
   `smoke2/4/7`→`sand2/4/7`, `smoke6`은 `hairlineStrong`으로 흡수·폐기, `lime`→`copper`,
   신규 `copperShadow` 추가) / light(`gray9/7/6/5/3/1`→`stone9/7/6/5/3/1`, `gray50`→`cream50`,
   `lime`→`copper`). **하위 호환 깨지는 지점**: 위 구키(`carbon*`·`chalk100`·`smoke200/400/600/700`·
   `lime400/300/Tint/Glow`·`gray900/700/600/500/300/100/50`·`lime700/800/TintL`)를 직접 임포트해
   쓰던 코드는 전부 컴파일 에러로 드러난다(타입 체크가 곧 회귀 검출망) — 신규 이름으로 치환할 것.
   이식 후 `rg 'carbon9|carbon8|carbon7|chalk100|smoke2|smoke4|smoke6|smoke7|lime4|lime3|limeTint|limeGlow|gray9|gray7|gray6|gray5|gray3|gray1|gray50|lime7|lime8' src/`로 잔존 참조 0 확인.
10. 버튼 ripple 비활성(`disableRipple`) — press 피드백은 scale(0.98)이 담당. IconButton·
    ToggleButton의 ripple은 유지(사각형이라 문제 없음).
11. **v4.1로 배선 완료**: `copperShadow`(dark)·`copperShadowL`(light)는 이제 `MuiPaper`
    `outlined`에 배선돼 있다(카드류 전용, §8.2) — 더 이상 "선택 토큰"이 아니다. 버튼에는
    의도적으로 배선하지 않았다(후보 A 템플릿의 `--st-shadow`는 `.st-card`에만 걸리고
    버튼 CSS에는 없음 — 근거는 candidate-a/index.html).
12. **v4.1 신규**: 컷코너 버튼 폐기 — `shapeTokens.cutCorner`/`cutCornerLg`는 전역 버튼
    시스템에서 더 이상 참조되지 않는다(값은 보존, DS-A20). `border: 1px solid transparent`
    forced-colors 가드도 함께 제거됐다(§6) — 표준 MUI contained 배경 모델은 이 가드가 불요.
13. **v4.1 신규**: `MotorDetailPage.tsx`의 "레이스 보기" 버튼(수동 컷코너 outlined 복제 —
    `shapeTokens.cutCorner`를 `::before`/`::after` 2겹으로 직접 참조)은 전역 버튼이
    소프트라운드로 바뀌면 시각적으로 어긋난다(그 페이지만 컷코너로 남는다). 표준
    `variant="outlined"`(자동 12px 라운드) 또는 `borderRadius: shapeTokens.radius` 적용으로
    교체할 것 — **필수 동기화 항목**(§10).
14. **v4.1 신규**: `shared/ui/form-field/FormField.tsx`·`shared/ui/voltage-stepper/
    VoltageStepper.tsx`는 `.MuiOutlinedInput-notchedOutline`을 꺼두고 자체 Box 테두리를
    그린다(§8.2 MuiOutlinedInput 주석) — 그 Box에 `borderRadius: shapeTokens.radius`를
    추가해야 인풋 폼이 실제로 소프트라운드로 보인다. theme.ts만 갱신하고 이 두 파일을
    건드리지 않으면 "적용됐다고 문서에는 쓰여 있지만 화면엔 안 보이는" v4와 동일한 결함이
    재발한다 — **필수 동기화 항목**(§10).
15. **v4.1 신규**: `SegmentControl`·`MuiToggleButtonGroup`·`BottomNavigation`·`VoltageStepper`
    내부 스테퍼 버튼 등 기존 0-radius(직각) 컴포넌트군은 이번 라운드에서 의도적으로
    미반영(§5 범위 밖 항목) — 직각·소프트라운드 혼재가 과도기로 남는다. 회귀가 아니라
    스코프 결정이다.
16. **v4.1 신규**: `layoutTokens.cardPad`(20→16)·`sectionGap`(40→32) 갱신 후
    `rg 'padding:\s*20\b|gap:\s*40\b'` 류로 `layoutTokens`를 우회한 하드코딩(20/40 리터럴)
    잔존 여부를 확인할 것(§5.1) — 있다면 그 지점만 새 값과 어긋나 보인다.
17. **v4.1 신규**: `displayFontStack` import 추가 확인 — h1/h2 variant가 이 스택을 못 찾으면
    타입 에러가 아니라 **조용히 기본 폰트로 폴백**한다(문자열 오탈자는 TS가 못 잡음) — 빌드 후
    페이지 타이틀·섹션 헤딩이 실제로 모노스페이스로 렌더되는지 육안 확인 필수(QA gate 추가,
    §10).

## 9. 컴포넌트 인벤토리 (v2 승계 + v3 개정 + v4 색 갱신 + v4.1 형태·밀도·타이포 갱신)

v1·v2 표의 매핑·FSD 위치·public props 전량 불변. v3 스타일 개정(구조)은 그대로이며, v4는 색
참조 표현(라임→코퍼)만 갱신했다. **v4.1**은 버튼·인풋·카드 3종의 형태(소프트라운드 12px·매트
그림자)·밀도(패딩)와 헤딩 타이포(모노 디스플레이)를 갱신한다 — 나머지 컴포넌트는 이번에도
색/구조 참조가 theme에서 자동 전환될 뿐 개별 코드 변경은 없다(단, §8.2 이식 주의 12~14의
예외: `MotorDetailPage.tsx`·`FormField.tsx`·`VoltageStepper.tsx`는 로컬 하드코딩 때문에
theme만으로 전환되지 않아 수동 동기화가 필요하다):

### 9.1 버튼 위계 (v4.1 재설계 — 소프트라운드, theme이 전담, 호출부 무변경)

| 위계 | MUI variant | 형태 | 상호작용 |
|---|---|---|---|
| **Primary** | `contained` color=primary | **소프트라운드 12px**(v4.1: 컷코너 폐기, DS-A20), **코퍼** 면 + umber950(다크)/화이트(라이트) 라벨 w700, 표준 MUI 배경 모델 | hover: 다크 밝기 상승+**코퍼** 글로우 / 라이트 침강. press: scale 0.98 |
| **Secondary** | `outlined` | 소프트라운드 12px(v4.1: 직각 → 라운드) + 1px `--mml-outline` 보더, text.primary 라벨 | hover: 보더 승격 + action.hover 면 |
| **Tertiary** | `text` | 시그니처 텍스트 | hover: 2px 밑줄(offset 4px) |
| **Destructive** | `contained` color=error | 소프트라운드 12px, 레드 면 — **ConfirmDialog 계약 내에서만** | hover: brightness 1.08 |

- 구조 원칙(**v4.1: DS-A13 폐기, DS-A20 신설**): 컷코너 clip-path 이중층(`::before`) 구조를
  걷어내고 표준 MUI `contained`/`outlined`/`text` 배경 모델로 복귀했다 — `borderRadius:
  shapeTokens.radius`(12)만으로 형태가 결정되고, forced-colors 실루엣 가드(구 transparent
  보더)도 함께 제거됐다(§6, §8.2). 값·롤백 경로는 §5·DS-A20.
- **v4.2(DS-A22) — soft-disabled 버튼의 v4 표준 시각**: 위 구조 변경(면이 `::before`가 아니라
  root palette 배경)의 **고아 소비자**가 실사용에서 드러났다 — 사용자가 측정 페이지 [기록]
  버튼의 비활성 라벨 저대비를 발견(§11 v4.2 이력). 전수 스윕(`rg '&::before' src/`) 결과 이
  클래스는 정확히 2건: `MeasureActionDock.tsx`(soft-disabled)·`MotorDetailPage.tsx`(수동
  컷코너 아웃라인, 아래 별도 항목) — `MotorRow.tsx`/`RaceMotorList.tsx`의 `::before`는 자기
  소유 종류색 액센트 바(v2.12 보존 계약)라 이 클래스가 아니다(오인 편입 금지, §10).
  **처방**: `aria-disabled` soft-disabled(M-5 — 항상 렌더, 자리 이동 없음) 상태는 root
  `backgroundColor: (t.vars ?? t).palette.action.disabledBackground` + 기존
  `color: text.secondary` 유지로 root에서 함께 처리한다(`::before` 타깃 제거, §10).
  **결정: 컴포넌트 로컬 유지 — theme `MuiButton`으로 승격하지 않는다.** 근거: 이 패턴
  (aria-disabled + 상시 렌더)의 소비처가 전수 검색 결과 `MeasureActionDock.tsx` 1곳뿐이고,
  네이티브 `disabled` prop을 쓰는 일반 버튼은 MUI 기본 `.Mui-disabled` 처리로 이미 충분하다 —
  단일 소비처를 위해 theme에 새 전역 variant/색을 만드는 것은 과잉이다. QA gate에
  `text.secondary`/`action.disabledBackground` 대비 실측(다크·라이트 각각)을 추가한다(§10).
- **v4.2 — `MotorDetailPage.tsx` 수동 컷코너 아웃라인 처방**: **12px 소프트라운드로 편입**
  (근거 있는 예외로 남길 이유 없음 — 평범한 보조 버튼, theme 표준 `outlined`가 이미 12px+
  hover 보더 승격 제공). 처방·상세는 §10.

### 9.2 컴포넌트 개정표

| 컴포넌트 | FSD 위치 | 규칙 |
|---|---|---|
| **PageHeader** | `shared/ui/page-header` | props 불변(`title/onBack/actions/action`). 2단 재구성(v3): ① 유틸 행 ② 디스플레이 타이틀 행. v4는 색 참조만 자동 전환. **v4.1**: 디스플레이 타이틀 행이 `h1`(모노 `displayFontStack`) variant를 쓰면 자동 전환, 로컬에서 fontFamily를 별도 하드코딩했다면 확인 필요 |
| BigNumber | `shared/ui/big-number` | 개별 베젤 없음 — 베젤은 히어로 존(MeasureFigures) 소유. `darkColor` import 없음, 순수 수치 렌더. props·"—"·sr-only 불변. numericFontStack 계기 폰트 무변경(§3.1) |
| StatusLabel | `shared/ui/status-label` | 무변경 — var() 토큰이 자동 전환. 펄스 점 currentColor(**코퍼**) 상속 |
| SegmentControl 계열 | `shared/ui/segment-control` | **v4.2**: 기본(폼) 형태는 theme 정책 변경으로 자동 소프트라운드 12px(그룹 첫/끝 바깥 모서리만, MUI 내장 grouped-edge)·**코퍼** 선택·w800 — 코드 무변경, theme.ts만 갱신. `borderless`(FormField 내부용 — 이번 라운드의 `RaceEntrySheet.tsx` "결과" 필드가 이 경로)는 로컬에서 내부 세그먼트 radius 0을 유지하되 **FormField.tsx의 Box가 프레임 radius 12 + overflow:hidden을 새로 가져야** 실제로 라운드로 보인다(§10, 필수 동기화). `rounded`(pill 999, 목록/필터용)는 무변경 — 후보 A가 다루지 않는 별도 형태 언어로 유지(§5, DS-A21) |
| 카드류 전반 | 각 위치 | Paper `variant="outlined"` 유지 + 편집 요소(sx 조정): 좌상단 인덱스 번호(`overline` 변형, sand400/stone500), 타이틀 행 아래 hairlineStrong 룰, 수치는 우측 baseline 정렬(`listValue`), 내부 패딩 `cardPad`(**v4.1: 20→16px**). hover 보더 승격은 theme 자동. **v4.1 신규**: 소프트라운드 12px + 매트 카퍼 글로우 그림자(dark/light, §5·§8.2 MuiPaper)도 theme에서 자동 적용 |
| 목록 행(S3/S4) | features/pages | 좌: 회차 인덱스(overline) / 중앙: 라벨 / 우: 수치(listValue, tabular). 구분은 hairline |
| EmptyState | `shared/ui/empty-state` | 대형 디스플레이 문구(h2 + 여백 상향) + Tertiary 버튼 |
| ThemeToggle | `shared/ui/theme-toggle` | 무변경 (44×44·aria-label 유지) |

### 9.3 아이콘 인벤토리
v2의 16종 그대로(24×24 viewBox, `fill="currentColor"`, `aria-hidden="true"`). 추가 없음.

### 9.4 S1 히어로 — "계기판 한 장" (RpmGauge + MeasureFigures, v3 구조 승계 + v4 색 갱신)

| 항목 | 사양 |
|---|---|
| 존 구성 | Z2 고정 높이(`measureValueMinHeight`) 안에서 **베젤 프레임 = 존 자체**: 1px `hairlineStrong` 링(radius 4) + 상태 bg(`--mml-status-*-bg`) + 그 위 `--mml-hero-vignette` overlay div(absolute·`aria-hidden`·pointer-events none — 라이트 모드는 `none`) |
| 수치 오버레이 | RPM 숫자(디스플레이 스케일)가 게이지 중앙 — 압도적 주인공. 파노 Hz·단위는 메타 행. BigNumber는 베젤 스타일 없이 순수 숫자(§9.2) |
| 게이지 형태 | 220° 아크·viewBox `0 0 200 120` 고정 — 기하·매핑(10k~37k, 5k 주 눈금) v2 승계 |
| 눈금 | 주 눈금 5k(stroke `sand400`/`text.secondary`) + 보조 눈금 1k(stroke hairline — 계기판 밀도감). 라벨 10/20/30 + `×1000 RPM` 캡션은 `overline` 토큰 톤 |
| 레드라인 | `error.main` 단색 밴드(v4: red400/red800 자동 반영), strokeWidth 5, opacity 0.9. 장식(`aria-hidden`) — 시맨틱 의미 없음(DS-A15) |
| **진행 아크** | measuring·stable에서 트랙 위 최소점→현재 RPM까지 **시그니처 코퍼 아크**(strokeWidth 4, `--mml-status-measuring-fg` 소비). `stroke-dashoffset` transition `needleMs`(100ms) linear. reduced-motion 0ms. weak-signal·idle 등에서는 미표시 |
| **바늘** | measuring: `fg`(**코퍼**) / stable: `valueFg`(white/stone900) — 확정 수치와 동일 위계로 승격. 전환 CSS rotate 100ms linear 유지, rAF/JS 금지 |
| 상태 연동 | v2 승계 — idle/suspended/no-permission 트랙 dim(바늘·진행 아크 없음), weak-signal 바늘·아크 숨김(REQ-ST-003) |
| 접근성 | 게이지·비네트·베젤 전체 `aria-hidden` — canonical 수치는 BigNumber 텍스트 경로 불변 |

## 10. 하류 지시 — v4/v4.1/v4.2 구현 낙차 (파일별)

| 파일 | 낙차 | 규모 |
|---|---|---|
| `src/shared/config/design-tokens.ts` | §8.1 전체 교체 — 팔레트 v4(umber/copper) + v4.1(`displayFontStack`·`shapeTokens.radius`·`cardPad`16·`sectionGap`32·`copperShadowL`), `motorKindColors`·`withAlpha`·`formControlHeight`·`srOnlySx`·`numericFontStack` 등 기존 additive 요소는 값 유지한 채 승계 | 파일 교체 |
| `src/app/theme.ts` | §8.2 전체 교체 — colorSchemes 코퍼 팔레트(v4) + 컷코너 폐기·소프트라운드 12px·매트 그림자·밀도 패딩·h1/h2 모노 디스플레이·ToggleButton 그룹 radius 정책(v4.1·v4.2). 세그먼트/탭/카드/다이얼로그 구조는 v3~v4.1 유지 | 파일 교체 |
| `index.html` | theme-color·`<style>` bg `#0A0A0B` → `#1A1410`(2곳), 라이트 `#F8F9FA` → `#FBF6F1`(부팅 스크립트 1곳) | 3줄 |
| `src/shared/ui/big-number/BigNumber.tsx` | 변경 없음(§9.2 승계) — `darkColor` import 없는 상태 유지 확인 | 확인만 |
| `src/features/measure-session/ui/RpmGauge.tsx` | 색 참조가 theme.palette 경유라면 무변경. `darkColor`/`color` 구키 직접 참조가 있으면 §8 신규 키로 치환 | 조건부 |
| **`src/shared/ui/form-field/FormField.tsx`**(v4.1/v4.2 신규) | 감싸는 Box(`border: '1px solid'`, 현재 radius 미지정=0)에 `borderRadius: shapeTokens.radius`(12) 추가. **동시에 `overflow: 'hidden'`도 추가**해야 한다 — `borderless` SegmentControl·VoltageStepper 내부 세그먼트/± 버튼이 여전히 `borderRadius: 0`(각자 로컬 override, §9.2)이라 그 사각 모서리가 새 라운드 프레임 밖으로 삐져나온다(VoltageStepper 자체 래퍼가 이미 이 `overflow:hidden` 패턴을 쓰고 있음 — 동일 근거로 정합). `:focus-within` outline은 overflow:hidden에 클립되지 않는다(표준 outline 페인트 규칙 — 그래도 육안 QA 필수). `RaceEntrySheet.tsx`·`RaceGoalSheet.tsx`·`MotorFormSheet.tsx`(FormField 소비처)가 전부 영향받는다 — theme.ts만으로는 화면에 반영되지 않는 실사용 소비처 1순위(v4 결함과 같은 클래스 재발 방지) | 컴포넌트 파일 1곳, sx 2줄 |
| **`src/shared/ui/voltage-stepper/VoltageStepper.tsx`**(v4.1/v4.2 신규) | `!borderless` 분기(스탠드얼론 사용 시 자체 테두리)의 래퍼 Box에 `borderRadius: shapeTokens.radius` 추가(현재 미지정=0, `overflow:hidden`은 이미 있음 — 라인 156). `borderless` 분기(FormField 내부 사용, `RaceEntrySheet.tsx` 전압 필드)는 변경 불요 — 프레임은 FormField Box가 소유(위 행). `stepButtonSx.borderRadius:0`(± 버튼)은 무변경 유지 — 버튼이 래퍼에 꽉 차므로 래퍼의 `overflow:hidden`이 시각적으로 정리한다 | 컴포넌트 파일 1곳, sx 1줄 |
| **`src/app/theme.ts` — `MuiToggleButtonGroup`/`MuiToggleButton`**(v4.2 신규, §5·§9.2) | 명시적 `borderRadius: 0`을 **제거**(추가 안 함) — MUI 내장 grouped-edge 로직이 `theme.shape.borderRadius`(12)를 그룹 첫/끝 세그먼트 바깥 모서리에 자동 적용하고 중간 세그먼트는 자체적으로 0 처리한다(§8.2). `SegmentControl.tsx`의 `borderless`(내부 세그먼트 radius 0 로컬 override, FormField가 프레임 소유 — 무변경)·`rounded`(pill 999, 무변경 — 근거는 §5.1) 두 변형은 이 정책 변경과 독립, 손대지 않는다 | theme.ts 2개 override 블록에서 각 1줄 삭제 |
| **`src/features/motor-management/ui/MotorKindSelect.tsx`**(v4.2 스윕 발견 — 레이스 기록 화면 밖, 동류 항목으로 기재) | `[& .${toggleButtonGroupClasses.grouped}]`에 `borderRadius: 0`을 로컬로 강제하고 있어(그리드 셀 개별 보더, 연결형 그룹이 아님) 위 theme 정책 변경이 도달하지 못한다 — 3열 그리드 셀도 소프트라운드로 통일하려면 이 파일의 `0`을 `shapeTokens.radius`로 교체해야 한다. **결정 보류**: 이번 v4.2는 레이스 기록 화면 스코프라 이 파일 자체는 수정 대상에 포함하지 않는다(사용자가 명시 요청 시 별도 반영) — 다만 v4 결함과 동일 클래스(로컬 하드코딩이 theme 갱신을 차단)라 기록만 남긴다 | 확인·보류 |
| **`src/features/measure-session/ui/MeasureActionDock.tsx`**(v4.2 3호 — `::before` 고아 소비자 1/2) | `slot.softDisabled` sx가 `'&::before': {backgroundColor: action.disabledBackground}`를 조준하는데, v4.1이 `contained`의 실제 면을 `::before`에서 root 표준 palette 배경으로 옮기면서 이 타깃이 **no-op**이 됐다 — 결과: 면은 그대로 코퍼(활성처럼 보임) + 라벨만 `text.secondary`(저대비), 사용자가 발견한 "기록 버튼 라벨 저대비"의 원인. **처방**(§9.1 DS-A22): `'&::before': {...}` 두 곳(기본·hover)을 제거하고 그 자리에 root `backgroundColor: (t.vars ?? t).palette.action.disabledBackground`를 추가(hover 블록도 동일하게 유지, hover 시에도 같은 배경) — `color: text.secondary`·`boxShadow:'none'`·`cursor:'default'`·`'&:active':{transform:'none'}`은 무변경. **결정: 컴포넌트 로컬 유지**(theme MuiButton으로 승격 안 함) — 이 패턴(soft-disabled=aria-disabled 상시 렌더, M-5)의 소비처가 전수 검색(`rg "&::before" src/`) 결과 이 파일 1곳뿐이라 단일 소비처를 위한 전역 variant 신설은 과잉 | 컴포넌트 파일 1곳, sx 재타깃(약 6줄) |
| **`src/pages/motor-detail/ui/MotorDetailPage.tsx`**(v4.1에서 지시, v4.2에서 처방 확정 — `::before` 고아 소비자 2/2) | "레이스 보기" 버튼이 이미 `variant="outlined"`이면서 `border:'none'` + `::before`(보더색 층)+`::after`(1px 인셋 배경층) 2겹으로 v3 컷코너 아웃라인을 수동 재현하고 있다. **결정: 12px 소프트라운드로 편입**(근거 있는 예외로 남길 이유 없음 — 평범한 보조 버튼이고 theme의 표준 `outlined` override가 이미 12px 라운드+hover 보더 승격을 제공) — 처방: `sx`의 `theme => ({...})` 오버라이드 전체(`border:'none'`·`::before`·`::after`·커스텀 hover)를 **삭제**하고 `variant="outlined"`만 남긴다(약 30줄 감소, 앱 전역 버튼 형태와 자동 정합) | 컴포넌트 파일 1곳, sx 블록 삭제(~30줄) |
| 소비처 전수 검사 | ① `rg 'carbon9|carbon8|carbon7|chalk100|smoke2|smoke4|smoke6|smoke7|lime4|lime3|limeTint|limeGlow|gray9|gray7|gray6|gray5|gray3|gray1|gray50|lime7|lime8' src/` → 잔존 참조 0(구키 개명 여파). ② **v4.2 신규**: `rg '&::before' src/` → v4.2 처방 반영 후 잔존 2건(`MotorRow.tsx`·`RaceMotorList.tsx`, 종류색 액센트 바 — 이 클래스 아님, v2.12 보존 계약)만 남아야 한다. `MeasureActionDock.tsx`·`MotorDetailPage.tsx`의 `::before`는 처방 적용 후 제거되어 있어야 함 | 검사 |
| **QA gate** | 다크/라이트 전 화면 스모크 + axe 대비 재검증(§1.3·§1.4, 특히 copper700/white 4.58:1 여유 근소 항목·stone500 3:1 항목 중점) + 토글 영속·no-flash + reduced-motion + forced-colors + 소프트라운드 버튼/인풋/카드 focus ring 육안 확인 + **v4.2 추가**: `RaceEntrySheet.tsx`(결과 세그먼트·전압 스테퍼·이탈 사유 칩)·`RaceGoalSheet.tsx` 폼 프레임이 실제로 12px로 렌더되는지, ToggleButtonGroup 첫/끝 세그먼트만 바깥 라운드인지(중간 세그먼트 사각 유지) 육안 확인 + **측정 페이지 [기록] soft-disabled 상태**가 회색 면(`action.disabledBackground`)+`text.secondary` 라벨로 렌더되는지, `text.secondary`/`action.disabledBackground` 대비가 다크·라이트 각각 4.5:1 이상인지 axe 재검증(§9.1 DS-A22) + `MotorDetailPage.tsx` "레이스 보기" 버튼이 12px 소프트라운드로 나오는지 육안 확인 + 회귀 테스트 통과 + light_dash/torque 뱃지 육안 대조(§1.0-v4) | — |

## 11. 개정 이력·ASSUMPTION

### v4 개정 이력 (2026-08-19 — Pit-Wall Amber 리컬러)

| 항목 | v3 | v4 |
|---|---|---|
| 다크 뉴트럴 | 무채 카본(carbon950~700, cool/무채) | **웜틴트 카본(umber950~700)** — 후보 A `--st-bg`/`--st-surface` 앵커, 나머지 2단 보간 |
| 시그니처 | Shift-Light Lime(dark `#D8F542`/light `#566E00`, hue≈68°) | **Pit-Wall Amber copper(dark `#FF8A3D`/light `#B85C1E`, hue≈24°)** — 발산 후보 A 채택(§1.0-v4) |
| text/muted | chalk100/smoke200/400/600/700(무채) | **cream100/sand200/400/700**(웜틴트) — smoke600은 hairlineStrong으로 통합(토큰 1개 감소, DS-A19) |
| light 무채 | gray900~50(cool gray) | **stone900~100 + cream50**(웜 그레이지) — 후보 A 라이트 제안값 |
| warning hue | dark 42°/light 34° | **dark 50°/light 53°**로 이동 — 신규 시그니처(hue≈24°)와 26°+ 분리 확보(DS-A17) |
| error(danger) | dark `#FF5A5F`/light `#C62828` | dark `#FF6B5A`/light `#C6392A`(후보 A 제안값, hue 변화 미미) |
| success | 값 유지 | 값 유지(입력 없음) |
| light stable 라벨 | lime700 단일(measuring과 동일 값) | **copper700(measuring) / copper800(stable) 분리**(DS-A18 관련, §1.4) |
| hairlineStrong | rgba(255,255,255,0.16) | 솔리드 `#8C7C6B`(후보 A `--st-border`, 4.53:1) — 입력 외곽선과 통합 |
| 형태·타이포·밀도·컴포넌트 구조 | — | v3 승계, 무변경(당시 범위 밖, §1.0-v4) — **v4.1에서 반영, 아래 표** |

### v4.1 개정 이력 (2026-08-20 — 시안 A 5축 완결)

**계기(1줄)**: v4가 §1.0-v4에서 색 팔레트만 반영하고 형태·타이포·밀도·컴포넌트 축을 스스로
"범위 밖"으로 미룬 뒤 후속 라운드 없이 종료돼, 사용자가 실기기에서 "버튼·폰트·인풋 폼이
색상만 바뀌고 나머지는 그대로"임을 발견한 결함 보수.

| 항목 | v4 | v4.1 |
|---|---|---|
| 타이포 | 단일 스택(휴머니스트), 색만 v4 | **디스플레이(h1·h2) = 시스템 모노스페이스**(`displayFontStack`, 후보 A `--st-font-display`) + 본문 스택 무변경 2패밀리 분리(§3.1) |
| 버튼 형태 | 컷코너(clip-path `::before` 이중층, radius 0) | **소프트라운드 12px**(`shapeTokens.radius`) — 표준 MUI contained 배경 모델로 복귀, forced-colors 가드 제거(DS-A20) |
| 인풋 형태 | 직각(radius 0, MuiOutlinedInput 기본) | 소프트라운드 12px(theme 레벨) — 단, 실제 화면은 `FormField.tsx`/`VoltageStepper.tsx` 로컬 override에 가려 v4.1 시점에는 **미반영**(§10, v4.2에서 지시 보강) |
| 카드 형태 | 1px 보더만, 그림자 없음 | 소프트라운드 12px + **매트 카퍼 글로우 그림자**(dark/light, `MuiPaper` `outlined`) |
| 밀도 | spacing 8, cardPad 20, sectionGap 40 | **국소 조정**: cardPad 16(8×2)·sectionGap 32(8×4)·버튼/인풋 패딩 리터럴 축소 — 전역 spacing 유닛은 8 유지(근거 §5.1) |
| 세그먼트(ToggleButton) | 직각(0) | v4.1 시점 **무변경(범위 밖 유보)** — v4.2에서 정책 확정 |

### v4.2 개정 이력 (2026-08-20 — 마이크로 개정: §10 결손 보수 + 셀렉션 편입 + `::before` 고아 처방)

**계기(3건, 전부 사용자 실기기 발견)**: ① 레이스 기록 화면에서 셀렉션·인풋이 여전히
미적용 — 원인은 §8.2 본문 주석이 요구한 `FormField.tsx`/`VoltageStepper.tsx` 동기화가 §10
표에 행으로 반영되지 않은 문서 내부 불일치. ② 같은 화면의 세그먼트(ToggleButton) 직각이
v4.1에서 "범위 밖"으로 유보된 채 과도기로 남음. ③ 측정 페이지 [기록] 버튼의 비활성 라벨
저대비 — 원인은 v4.1이 `contained`의 실제 면을 `::before`에서 root 표준 palette 배경으로
옮기면서 `::before`를 겨냥해 만들어진 로컬 오버라이드(`MeasureActionDock.tsx`)가 조용히
no-op이 된 것(같은 클래스로 `MotorDetailPage.tsx`의 수동 컷코너 아웃라인도 스윕에서 확인).

| 항목 | v4.1 | v4.2 |
|---|---|---|
| §10 하류 지시 | `FormField.tsx`/`VoltageStepper.tsx` 낙차가 §8.2 주석에만 있고 §10 표에 없음 | **행 추가**(§10) — Box radius 12 + `FormField.tsx`는 `overflow:hidden` 신설 필요까지 명시 |
| 세그먼트(ToggleButton) 형태 | 직각(0) 유지, "범위 밖" 유보 | **소프트라운드 12px로 편입**(DS-A20 확장) — theme의 명시적 `borderRadius:0`을 제거해 MUI 내장 grouped-edge 로직이 `theme.shape.borderRadius`(12)를 그룹 바깥 모서리에 자동 적용 |
| pill(999) 계열 | 미검토 | **의도적으로 12px 통일에서 제외**(DS-A21 신설) — `SegmentControl.rounded`·`RaceRetireReasonSelect`의 `Chip`은 이미 서로 정합된 별도 형태 언어(필터/태그)로 유지 |
| `::before` 고아 소비자 | v4.1이 `contained` 면을 root로 옮기며 생성(미인지) | **전수 스윕 완료, 2건 처방**(DS-A22) — `MeasureActionDock.tsx`(soft-disabled: root `backgroundColor` 재타깃, 컴포넌트 로컬 유지)·`MotorDetailPage.tsx`(수동 컷코너 아웃라인: 12px `outlined`로 편입). `MotorRow.tsx`/`RaceMotorList.tsx`의 `::before`(종류색 액센트 바)는 무관 확인 |
| 스윕 | — | `RaceEntrySheet.tsx`(결과 세그먼트·전압 스테퍼·이탈 사유 칩·측정값 칩)·`RaceGoalSheet.tsx` 전수 확인 + `rg '&::before' src/` 전수 확인(4건 중 2건만 처방 대상). 동류 추가 발견: `MotorKindSelect.tsx` 그리드 셀도 로컬 `borderRadius:0` 강제라 theme 정책이 닿지 않음 — 이번 라운드는 레이스 기록 화면 스코프라 **수정 대상에 넣지 않고 기록만**(§10) |

### ASSUMPTION (v3 승계: DS-A2~A5, A7~A10, A12·A14~A16 / v4 갱신: DS-A11 / v4 신규: DS-A17~A19 / v4.1 폐기: DS-A13 / v4.1 신규: DS-A20 / v4.2 확장: DS-A20 / v4.2 신규: DS-A21~A22)

| ID | 내용 | 근거·검증 |
|---|---|---|
| DS-A2 | 웹폰트 미도입 — 시스템 폰트. 숫자 전용 가변 폰트(OPTION-F1)만 예외 채택 완료 | 유지 |
| DS-A3 | 수치 영역 고정 높이 clamp | 유지 |
| DS-A4 | stable 전환 400ms 1회 | 유지 |
| DS-A5 | 주행 결과·등급 중립색 | 유지 |
| DS-A7 | 모드 2택 — 'system' 미제공 | 유지 |
| DS-A8 | 상태 토큰 var() 간접층 — CSS 컨텍스트 전용 | 유지 |
| DS-A9 | Dialog/Drawer/Snackbar의 MUI 다크 elevation overlay 허용 | 유지 |
| DS-A10 | 모드 영속 키 `mml-mode` | 유지 |
| **DS-A11(v4 갱신)** | 시그니처 = Pit-Wall Amber copper(발산 3후보 중 A 채택, cyan/lime 모두 대체됨) | 발산·렌더 판정 근거는 §1.0-v4. 롤백 시 copper400/300/Tint/Glow(dark)·copper700/800/TintL(light) 7값 교체로 국소 롤백 가능(구조 불변) |
| DS-A12 | stable도 시그니처 계열(블루 제거) — 잠금 구분은 tint bg+lock+수치+갱신 정지 | 유지 — REQ-NFR-003 3요소 병행으로 색 의존 없음 |
| ~~DS-A13~~ | ~~컷코너는 contained 전용, clip-path는 ::before 배경층 전용~~ | **v4.1로 폐기** — 컷코너 자체가 사라짐(DS-A20으로 대체). 값은 `shapeTokens.cutCorner`/`cutCornerLg`로 보존(롤백·`MotorDetailPage.tsx` 개별 참조용) |
| DS-A14 | 버튼 ripple 제거, press scale 대체 | 유지 |
| DS-A15 | 게이지 레드라인 = error.main 장식 예외 | 유지 |
| DS-A16 | rpm 스케일 상향 → `measureValueMinHeight` 등 동조 재클램프 | 유지 |
| **DS-A17** | warning(amber) hue를 42°/34°→50°/53°로 이동 | 신규 시그니처(hue≈24°)와의 시맨틱 분리 확보(README 후속 지시 이행) — 값만 변경, 키 이름·용도·구조 불변 |
| **DS-A18** | copper700(light)은 **white(paper) 배경 전용** — cream50(페이지 배경) 위 직접 텍스트/시그니처 사용 금지 | 대비 여유가 근소(4.58:1, cream50 위에서는 4.5 미달 추정) — 위반 시 stone900 또는 copper800 대체(§1.4) |
| **DS-A19** | hairlineStrong(dark)을 솔리드 `#8C7C6B`로 통합, 구 smoke600(입력 외곽선) 폐기 | 후보 A가 단일 보더 값만 정의 — 별도 유지보다 통합이 토큰 표면·혼동 감소(비텍스트 4.53:1 검증) |
| **DS-A20(v4.1 신설, v4.2 확장)** | 버튼(v4.1)·인풋·카드(v4.1)·세그먼트/ToggleButton(v4.2)에 소프트라운드 12px(`shapeTokens.radius`) 통일 — 컷코너·직각 폐기 | 후보 A `--st-radius` 채택(§5). 세그먼트는 v4.1 시점 "범위 밖"이었다가 v4.2에서 편입(과도기 종료). 롤백 시 `theme.shape.borderRadius`를 4로, `MuiButton`/`MuiOutlinedInput`/`MuiPaper` root radius·`MuiToggleButtonGroup`/`MuiToggleButton`의 명시적 `borderRadius:0` 재추가로 국소 롤백 가능 |
| **DS-A21(v4.2 신설)** | pill(999) 계열(`SegmentControl.rounded`·`RaceRetireReasonSelect`의 `Chip`)은 DS-A20의 12px 통일에서 **의도적으로 제외** | 후보 A는 태그/필터 형태 언어를 다루지 않는다. 이 pill 계열은 v2.27부터 이미 서로 정합된 별도 체계(필터 칩과 톤 일치가 목적)라 12로 낮추면 오히려 기존 정합이 깨진다 — "12px 통일"은 폼/작동 컨트롤(버튼·인풋·카드·세그먼트) 축이지 태그/필터 축이 아니다 |
| **DS-A22(v4.2 신설)** | `contained` 버튼 면이 `::before`가 아니라 root palette 배경이 된 v4.1 변경(DS-A20)의 여파 — `::before`를 겨냥한 로컬 오버라이드는 root 대상으로 재타깃해야 한다. soft-disabled(aria-disabled 상시 렌더, M-5)류 상태 스타일은 **컴포넌트 로컬에 둔다**(theme MuiButton으로 승격 안 함) | 전수 스윕(`rg '&::before' src/`) 결과 소비처 4건 중 2건(`MeasureActionDock.tsx`·`MotorDetailPage.tsx`)만 이 클래스 — 단일/소수 소비처를 위한 전역 variant 신설은 과잉이라 판단. `MotorRow.tsx`/`RaceMotorList.tsx`는 종류색 액센트 바(v2.12, 무관)로 확인 완료 |

승계 baseline 불변: CP-1a 등급 4단계 · D4 주행 결과 3택 · A5 전압 0.1~9.9V.
