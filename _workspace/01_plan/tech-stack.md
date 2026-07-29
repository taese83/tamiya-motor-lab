# Tech Stack — minicar-motor-lab (미니카 모터 RPM 측정 모바일 웹앱)

> Phase 1 Wave 4 산출물. 입력: `planning-context.md`, `requirements.md`, `ux-brief.md`, `feature-plan.md`, `analysis-algorithm.md` v2.
> 버전 근거는 전부 로컬(WebSearch 미사용): harness pin(`.nvmrc`, root `package.json`), `.claude/skills/project-init/assets/templates.md`(2026-07 검증 기준선), `.claude/skills/lib-advisor/references/lib-catalog.md`, `workspace/tart-web`(같은 harness의 기존 react-vite-spa — 구세대 검증 조합 보조 근거).
> 앱 위치: `workspace/minicar-motor-lab` (고정).

## Architecture Profile

**`internal-spa`** — 단일 사용자 개인 도구. 인증은 없지만(로그인 없는 개인 도구) 검색 노출·공유 URL·SEO 요구가 전혀 없고, 핵심 기능(getUserMedia, AudioWorklet, Web Worker, IndexedDB)이 전부 클라이언트 전용 API라 SSR 이득이 0이다. CSR + 정적 호스팅이 구조적으로 정확한 선택이다 (기본값 강제가 아니라 요구사항 소거의 결과 — SEO 없음·status code 요구 없음·TTFB 민감 콘텐츠 없음·인증 경계 없음).

- 서버·HTTP API 없음 (DL-005). IndexedDB가 유일한 authoritative store (LOCAL_DOMAIN_STATE_MODE).
- 렌더링: CSR 단일 전략. 라우트는 탭 3(`/`, `/motors`, `/guide`) + 스택 2(`/record/new`, `/motors/:id`) — SPA history fallback(모든 경로 → `index.html` rewrite)이 배포 요건.
- **HTTPS 배포 필수**: `getUserMedia`는 secure context 전용 (REQ-ST-002). 배포 provider는 HTTPS 기본 제공이어야 한다. 로컬 개발은 `localhost`/`127.0.0.1`이 secure context이므로 지장 없다.
- FSD 채택 (feature-plan §2 확정 승계) — surface 4개 + 분석 엔진/persistence/UI 킷 분리로 slice 소유권이 이미 정의됨. 규모 대비 과하지 않은 수준(레이어 5, widgets 미사용)으로 유지.
- TIMESERIES_MODE / ANALYTICS_BUILDER_MODE / EXTERNAL_DATA_INGESTION_MODE 전부 false → Timeseries Profile·Static Crawl Profile 섹션 해당 없음. 차트 renderer 결정 자체가 없음(시각화 Won't — 수치 표시만). 실시간 오디오 파이프라인의 transport/Worker 결정은 analysis-algorithm v2가 canonical이며 본 문서는 번들링·실행 기반만 결정한다(AD-11).

## Harness Profile

- **WEB_PROFILE**: `react-vite-spa` (built-in, 고정)
- **deployment provider**: **`vercel` (static-cdn) — TS-D1 확정 (2026-07-28 사용자 결정)**. 요건: HTTPS 기본, SPA fallback rewrite, 커스텀 응답 헤더 불요(SharedArrayBuffer 미사용 — AD-11). Vercel static은 harness `react-vite-spa` 어댑터가 공식 지원하는 provider/target 조합이다. `vercel.json`은 vercel-config-writer가 소유하며 build root·static output·SPA rewrite·캐시 헤더를 고정한다.
- **deployment target**: `static-cdn` (고정) — 서버사이드 코드·빌드타임 데이터 수집 없음. build command `tsc -b && vite build --mode production`, 산출물 `dist/`.
- **selected capabilities**: `base`만. auth/cookie/BFF/server-mutation/external-ingestion 해당 요구사항 ID 없음 — 복사 금지 원칙에 따라 미선택.
- **exact Node / pnpm / framework versions**: Node `22.22.3` · pnpm `11.13.0` · React `19.2.7` · TypeScript `6.0.0` · Vite `8.1.4` · react-router `8.2.0`
- **support level**: `certified` — project-init templates.md의 2026-07 검증 기준선 조합 그대로.
- **excluded scope / blocker**: SSR/SSG/Route Handler 없음(범위 외), HTTP 접속 시 측정 불가는 REQ-ST-002 안내 UI로 처리(blocker 아님), 마이크 실기기 검증은 Phase 2 사용자 참여 세션(DL-006 — 승계 항목).

## Compatibility Matrix

Primary Source 표기: `harness-pin` = `.nvmrc`/root package.json, `templates` = project-init templates.md(2026-07 검증 기준선), `knowledge` = 템플릿 외 패키지의 지식 기반 pin — **lockfile operation 단계에서 registry 실재·integrity 검증 후 확정** (WebSearch 금지 지시로 registry 재검증을 lockfile 계약에 위임).

| Component | Version | Engine/Peer Constraints | Primary Source | Decision |
|---|---|---|---|---|
| Node.js | 22.22.3 | engines `>=22.22.0` 충족 | harness-pin | 채택 (`.nvmrc` 동일 값 생성) |
| pnpm | 11.13.0 | Node 22 | harness-pin | 채택 (`packageManager` pin) |
| TypeScript | 6.0.0 | — | templates | 채택. TS 7은 2026-07 신규 major — 생태계 CI fixture 통과 전 미채택 (templates 각주 준수) |
| react / react-dom | 19.2.7 | react-dom은 react와 동일 버전 필수 | templates | 채택 |
| @types/react(-dom) | 19.2.0 | React 19.2 대응 | templates | 채택 |
| Vite | 8.1.4 | Node 22.12+ 요구 → 22.22.3 충족 | templates | 채택 |
| @vitejs/plugin-react | 6.0.3 | Vite 8 peer | templates | 채택 |
| react-router | 8.2.0 | React 19 peer (templates 조합으로 검증) | templates | 채택 — `react-router` 단일 패키지(`react-router/dom`), `react-router-dom` 별도 설치 불요 |
| @tanstack/react-query | 5.90.0 | React ^18 \|\| ^19 | templates | 채택 (AD-4 — IndexedDB query 계층) |
| zustand | 5.0.11 | React >=18 | templates | 채택 |
| zod | 4.3.0 | peer 없음 | templates | 채택 |
| idb | 8.0.0 | 의존성 0, 모던 브라우저 (iOS Safari/Android Chrome 충족) | knowledge | 채택 — 템플릿 외 유이(唯二)한 신규 패키지 ① |
| @mui/material | 7.3.0 | React 17–19, Emotion 11 peer | templates | 채택 |
| @emotion/react / styled | 11.14.0 / 11.14.1 | React peer | templates | 채택 (tart-web도 동일 계열 — harness 관례) |
| react-error-boundary | 6.0.0 | React peer | templates | 채택 (복구 UI·crash loop 방지 REQ-ST-005) |
| Vitest / @vitest/coverage-v8 | 4.1.0 | Vite 8 계열·Node 20+ | templates | 채택 |
| jsdom | 29.0.0 | Node 20+ | templates | 채택 (컴포넌트 테스트 환경 — 엔진 fixture는 node env) |
| @testing-library/react · jest-dom · user-event | 16.3.0 · 6.6.3 · 14.6.1 | React 19 지원 | templates | 채택 |
| fake-indexeddb | 6.0.0 | Node 테스트 전용 | knowledge | 채택 — 템플릿 외 신규 패키지 ② (repository·persistence·computeGuide seed unit) |
| @playwright/test | 1.61.0 | Node 20+ | templates | 채택 |
| @axe-core/playwright | 4.11.0 | Playwright peer | templates | 채택 (F-1 a11y evidence) |
| ESLint + @eslint/js | 9.39.5 | Flat Config — jsx-a11y 등 필수 plugin의 ESLint 10 peer 공식 지원 전 기준 | templates | 채택 |
| typescript-eslint | 8.57.0 | TS 6.0 지원 (templates 조합 검증) | templates | 채택 |
| eslint-plugin-jsx-a11y / react-hooks | 6.10.2 / 7.0.1 | ESLint 9 | templates | 채택 |
| globals / prettier / husky / lint-staged / turbo / vite-plugin-svgr | 16.5.0 / 3.8.1 / 9.1.7 / 16.2.7 / 2.8.0 / 4.5.0 | — | templates | 채택 |

**tart-web 조합을 쓰지 않은 이유**: tart-web(React 18.3.1 / Vite 5.4.21 / TS 5.9.3 / Jest 29 / react-router-dom 6)은 같은 harness에서 동작이 검증된 조합이지만 구세대 기준선이다. templates.md가 2026-07 현재 harness의 certified 기준선이고 스캐폴더·품질 스크립트·ESLint Flat Config 계약이 이 조합을 전제한다. tart-web은 "React SPA + Vite + TanStack Query v5 + zustand v5 + Emotion 계열이 이 harness에서 실제 운영된다"는 계열 검증 근거로만 사용한다.

## Architecture Decisions

| # | Decision | Requirement | Choice | Rejected Alternative | Trade-off |
|---|---|---|---|---|---|
| AD-1 | Rendering/배포 | 개인 도구·SEO 없음·클라이언트 전용 API | CSR SPA + static-cdn | Next.js SSR/SSG | 마이크·Worker·IndexedDB 전부 클라이언트 — SSR 이득 0, 정적 호스팅 단순성·비용 우위. SEO 요구 발생 시 재검토(현재 근거 없음) |
| AD-2 | Toolchain exact pin | REQ-NFR-004, harness 계약 | Node 22.22.3 / pnpm 11.13.0 / React 19.2.7 / TS 6.0.0 / Vite 8.1.4 | tart-web 구세대 조합(React 18.3.1/Vite 5.4.21/TS 5.9.3) | templates.md 2026-07 certified 기준선이 스캐폴더·CI 계약과 일치. TS 7 미채택(신규 major — 생태계 검증 전) |
| AD-3 | 라우팅 | ux-brief §3 탭 3 + 스택 2 | react-router 8.2.0, `createBrowserRouter` data router | TanStack Router | 라우트 5개 규모에 route-level 타입 안전의 이득 < harness 템플릿(RouterProvider/Routes) 이탈 비용. 스택 push/뒤로가기는 브라우저 히스토리로 충분 |
| AD-4 | IndexedDB 비동기 query 계층 | REQ-F-005(읽기 실패 상태·재시도), REQ-F-006(stale 집계 금지), H-4(제출 중 가드) | **@tanstack/react-query 5.90.0 채택** — 서버가 없어도 "비동기 읽기 + 명시적 invalidation" 문제는 동일 | 수제 hook + 이벤트 버스 재발명 | entity-query-builder 규약(queryOptions factory)을 그대로 유지: `entities/motor·run-record/api`가 queryOptions를 export하고 mutation(command) 성공 시 queryKey invalidate → 가이드·목록 stale 금지가 선언적으로 보장. 로딩/오류/재시도 상태 무료. 비용: ~13KB gzip + 계층 1개 — 수제 구현의 stale 버그 위험보다 싸다 |
| AD-4a | Query 기본 정책 (로컬 store 특화) | REQ-F-005/006 | `networkMode: 'always'`(기본 'online'은 오프라인에서 IndexedDB 쿼리를 pause시킴 — 로컬 데이터에 치명), `staleTime: Infinity` + mutation 후 명시 invalidate(데이터 변경 경로가 자체 command뿐), `retry: false`(IndexedDB 오류는 자동 재시도 무의미 — 명시 재시도 버튼이 `refetch`) | 기본값 유지 | 기본값 방치 시 비행기 모드에서 목록이 영원히 로딩되는 결함이 생긴다. QUERY_CLIENT 템플릿의 AppError/HTTP retry 로직은 제거 대상 |
| AD-5 | 클라이언트 상태 | REQ-F-001/002(6-status 상태 머신), F6 폼 | zustand 5.0.11 — measure-session은 **feature-scope store**(세션 수명, 명시 전이 함수 + 가드 unit 검증), record-entry 폼 상태도 zustand slice. 고빈도 f₀/RPM 프레임은 전역·영속 store 금지(feature-plan 원칙) — 세션 store에는 throttle된 표시값·status만 | XState / jotai | 상태 6종·전이 소수 — 순수 전이 함수 + Vitest로 충분, XState는 번들·학습 비용 과잉. jotai는 관례 밖 |
| AD-6 | IndexedDB 접근 | REQ-F-007, REQ-NFR-006(version/migration/invalid-state recovery) | **idb 8.0.0** — typed `DBSchema` + `upgrade(db, oldVersion, newVersion, tx)` 콜백이 LOCAL_DOMAIN_STATE_MODE의 migration 계약 표면과 1:1, ~1KB, 의존성 0 | 직접 구현 / Dexie | 직접 구현은 트랜잭션 auto-commit·이벤트→promise 변환 실수 위험이 크고 코드량이 idb 크기를 초과. Dexie는 자체 쿼리 계층(~25KB)이 command/query 설계와 중복. `withTransaction` helper(F4)는 idb의 `transaction()` 위에 얇게 구현 |
| AD-7 | 런타임 검증 | REQ-F-007(persisted 데이터를 외부 입력으로 검증 — type assertion 금지), A5 전압 범위 | zod 4.3.0 — rehydrate 스키마(Motor/RunRecord/DbMeta), env 스키마(SHARED_CONFIG), command precondition과 UI 인라인 검증이 동일 스키마 공유 | valibot | harness 템플릿 표준이 zod이고 검증 대상이 소규모라 번들 차이 미미. RHF 없이 스키마 단독 사용에 문제 없음 |
| AD-8 | 스타일링/UI | REQ-NFR-003(WCAG 2.2 AA, focus trap·복귀, 44px), F10 UI 킷 | @mui/material 7.3.0 + Emotion, **최소 theme**(색 토큰 소수·장식 배제 — "심플"은 theme으로 달성) | Radix+Tailwind / 순수 Emotion 수제 | Dialog(focus trap+복귀), Snackbar(Toast), Drawer(BottomSheet), ToggleButtonGroup(3택 세그먼트), BottomNavigation(탭 3)이 F10 계약과 1:1 — a11y 프리미티브 직접 구현 위험 제거. 순수 Emotion은 confirm focus 관리 수제 구현 위험, Radix+Tailwind는 harness 관례(템플릿·tart-web 모두 Emotion 계열) 이탈 + 스타일 시스템 이원화. BigNumber/StatusLabel/VoltageStepper는 어차피 커스텀(shared/ui) |
| AD-9 | 테스트 러너 | REQ-NFR-005(fixture 8종), Scenario evidence unit/browser | Vitest 4.1.0 + Testing Library + fake-indexeddb + Playwright 1.61.0 + @axe-core/playwright | Jest 29 (tart-web 방식) | Vite 네이티브 통합·ESM·워크스페이스 단일 transform. Jest는 babel 이중 설정. 엔진 fixture는 `environment: node`(jsdom 불요·고속), 컴포넌트는 jsdom — vitest projects로 분리 |
| AD-10 | MSW | — (HTTP 경계 자체가 없음) | **미도입** (상세 근거 아래 "테스트 전략" — QA integration gate 참조용) | 관례상 도입 | handler가 영원히 0건인 의존성. mock 경계는 합성 신호 fixture + fake-indexeddb seed가 대체(DL-006) |
| AD-11 | Worker/Worklet 실행 기반 | REQ-F-001(AudioWorklet 수집·Worker 분석), REQ-NFR-001 | Vite 네이티브 번들: 분석 Worker는 `new Worker(new URL('./worker.ts', import.meta.url), {type:'module'})`, AudioWorklet은 `audioWorklet.addModule(new URL(...))`. PCM 전달은 **transferable Float32Array**(v2 §4 protocol) — SharedArrayBuffer 미사용 | comlink / SAB 링버퍼 | 메시지 2종(in: pcm+sampleRate, out: DisplayEstimate)뿐 — `protocol.ts` 직접 정의가 comlink보다 단순·타입 엄격. SAB 미사용이라 COOP/COEP 헤더 불요 → **어떤 정적 호스팅에서도 추가 헤더 설정 없이 동작** (TS-D1 provider 선택 자유도 확보) |
| AD-12 | 분석 엔진 의존성 | F1, v2 §5 | `shared/lib/audio-analysis`는 **zero-dependency 순수 TypeScript** — FFT(radix-2)·IIR·pYIN·VP·Viterbi·Kalman 전부 직접 구현 (고정) | fft.js/dsp.js 등 | v2 §5 명시: 품질 보장된 JS 라이브러리 부재. 직접 구현이 fixture 8종 합격 기준으로 검증됨. DOM/브라우저 API import 0건 규칙은 ESLint restricted import로 강제 |
| AD-13 | PWA | 홈 화면 진입 편의 vs 범위 최소화 | **manifest.webmanifest + 아이콘만** 추가, Service Worker 없음 (ASSUMPTION TS-A2) | vite-plugin-pwa/Workbox | manifest는 정적 파일 1개로 비용 극소·반복 사용 도구라 홈 화면 진입 가치 높음. SW는 update 수명주기·캐시 무효화 복잡성 대비 이득 없음(오프라인 요구 없음 — IndexedDB는 SW 무관 영속). `display`는 `browser`/`minimal-ui`로 시작 — iOS standalone 모드의 getUserMedia 동작은 Phase 2 실기기 검증 통과 전 신뢰하지 않음 |
| AD-14 | 저장소 구조 | 원칙: 단일 workspace graph·단일 lockfile | `workspace/minicar-motor-lab`을 root로 하는 pnpm workspace + `apps/minicar-motor-lab-web` 단일 앱 + turbo 2.8.0 (project-init 골격 그대로) | 엔진 독립 package 분리 | 분석 엔진은 npm 배포 대상이 아님 — FSD `shared/lib/audio-analysis`로 충분(feature-plan §2 확정). 독립 package 0개, lockfile 1개, root quality script(turbo lint/typecheck/test)가 전체 포함 |
| AD-15 | 데이터 전략 연결 | planning-context Data Review Strategy `mock` | Mock 검토 = 합성 신호 fixture + seed. Mock→real 전환은 코드 변경이 아니라 **HTTPS 실기기 검증 세션**(iOS Safari 우선) — production 연결·PII 경계 자체가 없음(외부 데이터 0) | 조기 실기기 강제 | shape 검증 단계(Order 1~2)는 CI fixture로 완결. 실기기 조건: 실모터 접근 가능 + 사용자 참여(owner: 사용자) |

## 테스트 전략 (QA integration gate 참조)

- **MSW 불필요 — 확정 근거**: 이 앱에는 네트워크 계층이 존재하지 않는다 (서버·HTTP API 없음, axios 미설치, fetch 호출 0건). MSW의 존재 이유인 "HTTP 경계 mock"의 경계 자체가 없으므로 handler는 영원히 0건이고, `onUnhandledRequest` 검출 대상도 없다. QA integration gate는 "MSW handler coverage" 대신 다음을 통과 기준으로 삼는다: ① 합성 신호 fixture 8종 + CRLB sanity (REQ-NFR-005 표 그대로), ② fake-indexeddb seed 기반 repository/persistence/computeGuide unit (C-1~C-6, E-2~E-5, H-1~H-3), ③ Playwright browser 시나리오 (D-1/D-2/D-4/D-8/D-9, H-4/H-5, E-1/E-6, F-1). project-init의 TEST_SETUP·MAIN_TSX 템플릿에서 MSW lifecycle/worker 부트스트랩은 제거한다(템플릿 각주가 허용하는 경로).
- **엔진 unit (F1)**: `vitest projects`로 `shared/lib/audio-analysis`는 `environment: 'node'` — 합성 fixture(`__fixtures__/synth.ts`)는 결정적이므로 snapshot 아닌 수치 assert (f₀ 오차 한계·status enum). Worker 래퍼는 얇게 유지하고 순수 함수(`estimateFrame/refine/track`)를 직접 호출해 검증. 실제 Worker 경유는 E2E에서 확인.
- **권한/캡처 browser evidence**: Playwright chromium launch args `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream` + `context.grantPermissions(['microphone'])`/`clearPermissions()`로 D-1(허용)·D-2(거부) 재현. D-4(비보안 컨텍스트)는 http origin 컨텍스트로 재현. D-3(영구 거부)·D-5(iOS suspended)·실모터 실측은 mock 재현 불가 — Phase 2 device 세션 (requirements Evidence 열 그대로).
- **E2E secure context**: Playwright baseURL `http://127.0.0.1:4173`은 secure context로 취급되어 getUserMedia 동작 — HTTPS 배포 전에도 캡처 flow E2E 가능.
- **a11y**: @axe-core/playwright + aria-live/focus 복귀 명시 assert (F-1). mobile-chrome(Pixel 7)·reflow-320 프로젝트는 PLAYWRIGHT_CONFIG 템플릿 그대로 활용 (REQ-NFR-002).

## 서비스 특화 추가 라이브러리

Base 프로필(React/Router/Query/zustand/zod/MUI/테스트 스택) 외 이 서비스 때문에 추가되는 것은 2개뿐이다.

| 역할 | 라이브러리 | 버전 | 이유 | 대안 |
|---|---|---|---|---|
| IndexedDB promise/typed wrapper | `idb` | 8.0.0 | AD-6 — DBSchema 타입 + upgrade(oldVersion) migration 표면, ~1KB, 의존성 0 | 직접 구현(실수 위험)·Dexie(중복 계층) |
| 테스트용 IndexedDB 구현 | `fake-indexeddb` | 6.0.0 (dev) | seed 기반 repository/persistence/가이드 unit — feature-plan §6 fixture 계약 | Playwright 실브라우저만 사용(unit 피드백 루프 상실) |

FFT·pitch 추정·추적은 라이브러리를 추가하지 않는다 — `shared/lib/audio-analysis` zero-dependency 직접 구현 고정 (AD-12).

## 피하는 라이브러리

| 라이브러리 | 이유 |
|---|---|
| msw | HTTP 경계 없음 — handler 0건 (AD-10, 테스트 전략 참조) |
| axios | HTTP 호출 0건 — SHARED_API 템플릿 전체 미사용 |
| react-hook-form + @hookform/resolvers | 폼 5항목 중 자유 입력은 전압 1개 — 선택형(라디오/세그먼트/토글)은 제어 컴포넌트가 자연스럽고 zod 스키마 + zustand로 충분. 비제어 리렌더 최적화의 이득 없음 |
| date-fns | 시각 표시 1~2 포맷뿐 — `Intl.DateTimeFormat('ko-KR')` 내장으로 충분. 정렬 키는 ISO 문자열 비교 |
| uuid | `crypto.randomUUID()` 내장 — secure context 전용이지만 이 앱은 secure context가 전제(HTTPS/localhost) |
| fft.js / dsp.js / meyda 등 오디오 라이브러리 | AD-12 zero-dependency 계약 (v2 §5) |
| comlink | Worker 메시지 2종 — protocol.ts 직접 정의가 더 단순·엄격 (AD-11) |
| dexie | idb로 충분 — 자체 쿼리 계층이 command/query 설계와 중복 (AD-6) |
| redux-toolkit / XState | 상태 규모 대비 과잉 (AD-5, lib-catalog 지침) |
| recharts / echarts 등 차트 | 시각화 금지 — 수치 표시만 (Won't) |
| vite-plugin-pwa / workbox | SW 범위 외 (AD-13) — manifest는 정적 파일로 직접 관리 |
| @mui/icons-material | 필요 아이콘 소량(마이크·잠금·탭 3종 등) — 개별 SVG + vite-plugin-svgr로 관리, 전체 아이콘 패키지 불필요 |
| web-vitals | 수집 endpoint·observability 백엔드 없음(개인 도구) — 성능 검증은 fixture·E2E 예산으로 수행 |

## Package Changes

전 항목 public registry exact version. 직접 `pnpm add/install` 금지 — package-scaffolder 반영 → typed `lockfile` operation → lockfile source/integrity 검토 → typed frozen `install` 계약으로 실행한다.

| Package | Exact Version | Scope | Requirement | Source |
|---|---:|---|---|---|
| react | 19.2.7 | app dep | 전체 | templates |
| react-dom | 19.2.7 | app dep | 전체 | templates |
| react-router | 8.2.0 | app dep | ux-brief §3, F9 | templates |
| @tanstack/react-query | 5.90.1 | app dep | REQ-F-005/006, AD-4 | templates — 5.90.0 registry 부재로 lockfile 검토 단계에서 최근접 실존 patch로 조정 (2026-07-28, TS-A1 절차) |
| zustand | 5.0.11 | app dep | REQ-F-001/002, F2/F6 | templates |
| zod | 4.3.0 | app dep | REQ-F-007, A5, AD-7 | templates |
| idb | 8.0.0 | app dep | REQ-F-007, REQ-NFR-006 | knowledge — lockfile 단계 검증 |
| @mui/material | 7.3.0 | app dep | REQ-NFR-003, F10 | templates |
| @emotion/react | 11.14.0 | app dep | AD-8 peer | templates |
| @emotion/styled | 11.14.1 | app dep | AD-8 peer | templates |
| react-error-boundary | 6.0.0 | app dep | REQ-ST-005 (crash loop 금지) | templates |
| typescript | 6.0.2 | app+root dev | 전체 | templates — 6.0.0 registry 부재로 lockfile 검토 단계에서 최근접 실존 patch로 조정 (2026-07-28, TS-A1 절차) |
| vite | 8.1.4 | app dev | 빌드 | templates |
| @vitejs/plugin-react | 6.0.3 | app dev | 빌드 | templates |
| vite-plugin-svgr | 4.5.0 | app dev | 아이콘 | templates |
| @types/node | 22.19.21 | app dev | playwright.config.ts `process.env` (Node 22 계열) | 2026-07-28 Gate A에서 누락 발견해 추가 |
| @dnd-kit/core | 6.3.1 | app dep | v2 T-6 모터 DnD 정렬 (키보드 접근성 내장) | 2026-07-28 registry 실측 확정 |
| @dnd-kit/sortable | 10.0.0 | app dep | 〃 (단일 컬럼 sortable) | 〃 |
| @dnd-kit/utilities | 3.2.2 | app dep | 〃 (CSS transform 유틸) | 〃 |
| @fontsource-variable/oxanium | 5.3.0 | app dep | v3 RV-4 숫자 디스플레이 가변 폰트 (self-host woff2, 수치 전용 적용) | 〃 |
| @types/react | 19.2.0 | app dev | — | templates |
| @types/react-dom | 19.2.0 | app dev | — | templates |
| vitest | 4.1.0 | app dev | REQ-NFR-005, unit evidence | templates |
| @vitest/coverage-v8 | 4.1.0 | app dev | coverage gate | templates |
| jsdom | 29.0.0 | app dev | 컴포넌트 테스트 | templates |
| @testing-library/react | 16.3.0 | app dev | browser-adjacent unit | templates |
| @testing-library/jest-dom | 6.6.3 | app dev | — | templates |
| @testing-library/user-event | 14.6.1 | app dev | H-2/H-4 등 | templates |
| fake-indexeddb | 6.0.0 | app dev | C-1~C-6 seed unit | knowledge — lockfile 단계 검증 |
| @playwright/test | 1.61.0 | app dev | browser evidence | templates |
| @axe-core/playwright | 4.11.0 | app dev | F-1 a11y | templates |
| eslint | 9.39.5 | root dev | 품질 게이트 | templates |
| @eslint/js | 9.39.5 | root dev | — | templates |
| typescript-eslint | 8.57.0 | root dev | — | templates |
| eslint-plugin-jsx-a11y | 6.10.2 | root dev | REQ-NFR-003 정적 검사 | templates |
| eslint-plugin-react-hooks | 7.0.1 | root dev | — | templates |
| globals | 16.5.0 | root dev | — | templates |
| prettier | 3.8.1 | root dev | — | templates |
| husky | 9.1.7 | root dev | — | templates |
| lint-staged | 16.2.7 | root dev | — | templates |
| turbo | 2.8.0 | root dev | AD-14 | templates |

- `knowledge` 표기 2건(idb, fake-indexeddb)은 templates.md에 없는 패키지로, pin은 확실히 존재하는 안정 버전 기준이다. lockfile operation에서 resolve 실패 또는 상위 안정 patch 확인 시 lockfile 검토 단계에서 exact를 조정하고 본 문서를 갱신한다 (major 변경 금지).
- 템플릿 대비 **미설치**: axios, react-hook-form, @hookform/resolvers, date-fns, msw, web-vitals (근거는 "피하는 라이브러리" 표).

## 환경 설정 필요 항목

서버·외부 API가 없어 환경변수는 표시/모드 구분용 2개뿐이다. project-init의 `VITE_API_URL`은 SHARED_CONFIG zod 스키마와 `vite-env.d.ts`에서 **제거**한다 (존재하지 않는 API URL 요구를 남기면 env 검증이 부팅을 막는다).

- `.env.dev` — `VITE_PHASE=dev`, `VITE_APP_TITLE=minicar-motor-lab (dev)`
- `.env.production` — `VITE_PHASE=production`, `VITE_APP_TITLE=minicar-motor-lab`
- `.env.staging` — 미사용 (TS-A3: 개인 도구, dev/production 2단. provider 확정 후 preview 환경이 생기면 추가)
- secrets 없음 (API 키·토큰 0건). 배포 provider 결정(TS-D1) 후 provider 쪽 설정: HTTPS(기본), SPA fallback rewrite(`/* → /index.html`), 캐시 정책(`index.html` no-cache, 해시 자산 immutable).

## Open Items (본 wave 신규)

### NEEDS_DECISION

- **TS-D1. 정적 호스팅 provider** — target은 `static-cdn` 고정, provider만 미정. 요건: ① HTTPS 기본(마이크 권한 — 미충족 시 앱 자체가 성립 불가), ② SPA fallback rewrite, ③ 추가 응답 헤더 불요(AD-11로 확보). 후보: Vercel(static)/Netlify/GitHub Pages/기타 정적 호스팅 — 전부 요건 충족 가능하므로 사용자 계정/운영 선호로 결정하면 된다. **로컬 개발·CI·E2E는 provider 미정과 무관하게 진행 가능** (localhost는 secure context). 결정 시점: Phase 2 실기기 검증 세션 전(HTTPS URL 필요).

### ASSUMPTION

- **TS-A1. 버전 기준선** — WebSearch 금지 지시에 따라 registry 실시간 재검증 대신 project-init templates.md(2026-07 검증 기준선)를 exact pin 근거로 사용. 최종 실재·integrity 확인은 lockfile operation 검토가 담당. 검증: lockfile resolve 성공 + frozen install + CI 통과.
- **TS-A2. PWA 범위** — manifest + 아이콘만, SW 없음, `display: browser|minimal-ui`. iOS 홈 화면 standalone 모드의 getUserMedia 동작은 Phase 2 실기기에서 확인 후에만 standalone 승격. 검증: Phase 2 device 세션 항목에 추가.
- **TS-A3. 환경 2단(dev/production)** — staging 없음. provider 확정 후 preview 환경 필요 시 `.env.staging` + `VITE_PHASE` union 확장(비용 1곳).
- **TS-A4. 모노레포 골격 단일 앱** — project-init 계약 준수(pnpm workspace + turbo), 독립 package 0개·lockfile 1개. 엔진 npm 배포 요구가 생기면 그때 packages/로 승격 (현재 근거 없음 — Won't).

### 승계 (변경 없음)

제품 D1~D4·A1~A7(requirements/ux-brief), 실기기 검증 사용자 참여(Phase 2, DL-006), harness 산출물 경로 정책(오케스트레이터 결정 사항 — 본 문서는 허용 경로 `_workspace/01_plan/`에 작성).
