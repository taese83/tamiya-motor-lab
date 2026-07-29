# Layout Spec — minicar-motor-lab (v2 — 측정·모터·레이스 개편 + 디자인 v3 병합)

> **v2 개정판** (layout-designer, 2026-07-29). canonical 입력: `_workspace/01_plan/revision-v2-brief.md`(M-1~7·T-1~7·R-1~7·RV-1~4 — 충돌 시 이 브리프가 v1 plan 문서를 이긴다) · `design-system.md` **v3**(라임 시그니처·컷코너·히어로·대형 타이틀 — 같은 라운드 병합 구현).
> 소비자: component-designer(v2) · state-contract-designer(v2 — 왕복 슬롯·자동 시작 상태 머신) · Phase 3 route-builder(§2.3 라우팅 코드 생성 + v1 라우트/페이지 삭제).
> 본 문서는 명세다 — `src/` 파일을 직접 생성하지 않는다. 라우팅·레이아웃 코드는 코드 블록으로 포함하며 route-builder가 Phase 3에서 생성한다.

## v2 개정 요약 (v1 대비)

| 항목 | v1 | **v2** |
|---|---|---|
| 라우트 | `/` · `/motors` · `/motors/:id` · `/record/new` · `/guide` · `*` (6) | `/` · `/motors` · `/race` · `/race/:motorId` · `*` (5). **`/record/new`·`/guide`·`/motors/:id` 제거** — `/guide` 딥링크는 `/race`로 redirect(LD-6), 모터 차트는 인라인 확장(LD-1) |
| 탭 | 측정 / 이력 / 가이드 | **측정 / 모터 / 레이스** |
| S1 | 수동 시작·stable 잠금·[중지]/[다시 측정] | **자동 시작(M-1)·중지 버튼 없음(M-2)·연속 측정(M-3)·게이지 주지표 파노 170~620Hz(M-4)·상시 [기록](M-5~6)·레이스 왕복 모드(R-5)** |
| S2 기록 입력 | `/record/new` 5항목 폼 | **화면 자체 제거** — 수집은 S1 [기록]→모터 선택 시트로 대체 |
| S3 | 이력 목록 + 상세 스택 | **모터 목록 + 인라인 확장(차트·기록·수정/삭제) + DnD 정렬(T-6)** |
| S5 | 전압 가이드(computeGuide) | **레이스** — 목록 + 레이스 페이지(`/race/:motorId`) + 입력 시트 + [초기화]. 가이드 완전 제거(RV-2) |
| 시각 언어 | v1 무채 | **v3** — 라임 1색·컷코너·PageHeader 2단 대형 타이틀·히어로 베젤·페이지 전환 페이드(RV-4 채택)·Oxanium 숫자 폰트(RV-4 채택) |

### v2 레이아웃 결정 로그 (근거 포함 — 임의 확정 아님, 이의 시 §11)

| ID | 결정 | 근거 |
|---|---|---|
| **LD-1** | **T-5/T-7: 모터 차트 = 리스트 항목 인라인 확장(아코디언). `/motors/:id` 상세 라우트 제거** | ① 상세에 담을 내용이 차트+기록 ≤10행뿐(T-2로 기록은 수집 전용 — 편집 UI 없음)이라 전용 화면이 과잉 ② 인라인 확장은 목록 컨텍스트를 유지한 채 모터 간 비교 왕복이 빠름(탭 1회 vs push/pop) ③ 라우트 제거로 딥링크 미존재 id·in-place not-found·삭제 후 스택 정리 복잡도가 통째로 사라짐 ④ 확장 상태는 휘발성이라 복원 규칙도 단순. 트레이드오프(DnD와 확장 공존)는 §5.3에서 해소 |
| **LD-2** | **R-5 왕복 컨텍스트(대상 모터 + 폼 초안) = 메모리 단일 슬롯. 새로고침 시 왕복 파기 + 초안 파기** — 영속화(sessionStorage) 안 함 | ① 왕복 모드는 **안정 판정 시 자동으로 데이터를 기록**하는 모드다 — 새로고침으로 의도 증거가 휘발된 상태를 부활시키면 사용자 의도 없는 자동 수집이 발생할 수 있음(안전 우선) ② 초안 필드가 결과·전압·랩타임 3개뿐이라 재입력 비용이 낮음 ③ v1 handoff single-slot("오래된 값 위장 금지") 원칙과 일관. 슬롯 소유·수명은 state-contract 위임 |
| **LD-3** | **레이스 입력 폼 = BottomSheet** (인라인 아님) | ① [+]로 반복 입력하는 작업 — 시트가 리스트 컨텍스트를 유지 ② 모터 등록 시트와 오버레이 문법 통일 ③ 왕복 복귀 시 "시트 재오픈 + 초안 복원"으로 상태 경계가 명확(인라인이면 스크롤 위치·리스트와의 포커스 경합 발생) |
| **LD-4** | **RaceRecord 개별 삭제 = 행 우측 [삭제] 버튼 + ConfirmDialog** (RV-A3 확정, 스와이프 기각) | 스와이프는 발견성이 낮고 세로 스크롤과 제스처 경합. 가시 버튼 44×44가 오입력 복구 수단으로 확실 |
| **LD-5** | **[초기화] 버튼 = `/race` 목록 화면 하단**(콘텐츠 흐름 끝, 고정 도크 아님) | 삭제 범위가 **전체** MeasureRecord+RaceRecord(R-6)이므로 특정 모터의 레이스 페이지에 두면 "이 모터만 초기화"로 오독된다 — 전체 범위 액션은 전체 목록 레벨에. 스크롤 최하단 배치는 파괴적 버튼의 우발 탭 방지. 이의 시 `/race/:motorId` 하단으로 이동 가능(confirm 범위 고지는 동일) |
| **LD-6** | `/guide` 딥링크 → loader `redirect('/race')` (history에 `/guide` 미잔존). **`/record/new` 딥링크는 redirect 없이 `*` NotFound** | `/guide`는 브리프가 명시한 이관("가이드"→"레이스" 메뉴 교체). `/record/new`는 작업 화면이라 북마크 가능성이 낮고, 대응 화면이 소멸했으므로 404가 정직 |

---

## 0. 전제 (변경 금지)

| 항목 | 값 |
|---|---|
| Breakpoint | **모바일 세로 단일 기준.** 콘텐츠 `max-width: 480px` 중앙 정렬, 가로 회전 동일 레이아웃(수치 타이포는 clamp 상한이 흡수) |
| 내비게이션 | 하단 탭 3(`측정 /` · `모터 /motors` · `레이스 /race`) + 스택 push 1(`/race/:motorId`) + 오버레이 4(모터 선택 시트, 모터 등록/수정 시트, 레이스 입력 시트, ConfirmDialog — 전부 라우트 없음) |
| 라우터 | react-router **8.2.0** `createBrowserRouter`. DOM `RouterProvider`만 `react-router/dom`에서 import, 나머지(`redirect` 포함)는 전부 `react-router` |
| 데이터 로딩 | route loader **미사용**(유일 예외: `/guide` redirect — 데이터 아님). 읽기는 전부 react-query가 페이지 내부에서 소유 |
| 시각화 | **커스텀 SVG만**(모터 라인 차트 T-5, S1 게이지) — 차트 라이브러리 금지. 모든 상태 구분은 텍스트 라벨 동반(색 단독 금지), canonical 수치는 항상 텍스트 경로 |
| 터치 타깃 | 최소 44×44 CSS px (REQ-NFR-003) |
| 디자인 | design-system v3 — 라임 시그니처 1색·컷코너 primary·radius 0/4/8/20·`sectionGap` 40·PageHeader 2단·페이지 전환 페이드 150ms(RV-4)·Oxanium 숫자 서브셋(RV-4) |
| DnD | @dnd-kit/core + @dnd-kit/sortable (T-6 — exact pin은 tech-stack 갱신 소관) |

---

## 1. 글로벌 레이아웃 (앱 프레임 — `app/`)

```
┌────────────────────────────────────────┐ ← viewport (max-width 480px 중앙)
│ (skip link — 첫 tabbable, 평시 숨김)      │
├────────────────────────────────────────┤
│ [G] 전역 배너 슬롯 (조건부, sticky top)    │ ← persistence 'unavailable' | 'corrupt' 시에만 (§8)
├────────────────────────────────────────┤
│ [H] PageHeader v3 2단 (화면별 소유)       │ ← ① 유틸 행 56px(뒤로/액션 — 있을 때만)
│     대형 디스플레이 h1 (clamp 28~34px)    │    ② 타이틀 행 (S1은 visually-hidden h1 — §4)
├────────────────────────────────────────┤
│ [M] <main id="main"> flex-1, 세로 스크롤  │ ← Outlet + 페이지 전환 페이드 래퍼(150ms, RV-4)
│      padding-bottom: 탭 바 높이 예약      │
├────────────────────────────────────────┤
│ [N] <nav aria-label="주요"> 하단 탭 바     │ ← fixed bottom, h 56px + safe-area-inset-bottom
│  [측정]      [모터]      [레이스]          │    활성 = 상단 2px 라임 인디케이터 + 라임 라벨
└────────────────────────────────────────┘
```

- **Landmark 계약**: 페이지당 `header`(banner) 1 · `main` 1 · `nav`(주요 내비) 1. 전역 배너는 `role="status"`. 오버레이(Dialog/BottomSheet)는 `aria-modal="true"`로 landmark 트리 밖.
- **Skip link**: "본문으로 건너뛰기" → `#main`. DOM 최상단, focus 시에만 표시.
- **Heading 계약**: 화면당 `h1` 정확히 1개 — `/motors` "모터" · `/race` "레이스" · `/race/:motorId` "{모터명}" · `*` "페이지를 찾을 수 없습니다". S1은 visually-hidden h1 "측정"(히어로가 타이틀을 대체하지 않음). 섹션·시트 제목은 `h2`. h3 이하 미사용.
- **Focus order** (공통 골격): skip link → [G] 배너 내 액션 → [H] 헤더(뒤로/액션) → [M] 본문 위→아래 → [N] 탭 바. DOM 순서 = 시각 순서, tabindex 양수 금지.
- **탭 바**: v1 킷 승계(`shared/ui` BottomNavigation), 탭 3개로 재구성. 활성 매핑은 `handle.tab` 명시(`/race/:motorId`도 레이스 탭 활성). 아이콘+텍스트 병행, `aria-current="page"`. v2에서 탭 바를 숨기는 라우트 없음(`hideTabBar` 사용처 소멸 — handle 필드는 예약 유지).
- **페이지 전환 페이드**(RV-4 = OPTION-M1 채택): RootLayout의 Outlet 래퍼가 `location.pathname` key로 opacity 0→1 `enterMs`(150~200ms) `easeOut`. `prefers-reduced-motion` 시 0ms. 왕복 자동 복귀(§7.4)도 동일 페이드 — 별도 모션 없음.
- **safe-area**: 탭 바·모든 BottomSheet에 `env(safe-area-inset-bottom)`, 전역 배너에 top. `viewport-fit=cover` 유지.
- **에러 바운더리**: 루트 `ErrorBoundary` — 렌더 crash 전용 패널(제목 + [새로고침]). persistence/IndexedDB 실패는 Result 값으로 §8 복구 UI가 처리(crash loop 금지). v1 계약 그대로.

---

## 2. 라우팅 맵

### 2.1 Route table

| 경로 | 화면 | 페이지 모듈 (FSD) | 탭 바 | handle 메타 | 근거 |
|---|---|---|---|---|---|
| `/` (index) | S1 측정 (자동 시작) | `pages/measure` | 표시 (측정 활성) | `{ title: '측정', tab: 'measure' }` | M-1~7, R-5 |
| `/motors` | S3 모터 (목록+인라인 차트+DnD) | `pages/motors` | 표시 (모터 활성) | `{ title: '모터', tab: 'motors' }` | T-1~7 |
| `/race` | S5 레이스 목록 | `pages/race` | 표시 (레이스 활성) | `{ title: '레이스', tab: 'race' }` | R-1, R-6 |
| `/race/:motorId` | S6 레이스 페이지 (스택) | `pages/race-detail` | 표시 (레이스 활성) | `{ title: '레이스', tab: 'race' }` — document.title은 모터명 로드 후 페이지가 갱신 | R-2~5, R-7 |
| `/guide` | — redirect | (라우트 정의만, 페이지 없음) | — | loader `redirect('/race')` — history 미잔존(LD-6) | 브리프 §3 |
| `*` | Not Found | `pages/not-found` | 표시 (활성 없음) | `{ title: '페이지를 찾을 수 없음' }` | — |

**제거**: `/record/new`(화면 소멸 — 딥링크는 `*` 404, LD-6) · `/motors/:id`(LD-1 인라인 확장 — 딥링크는 `*` 404. 구버전 데이터가 초기화되므로(RV-3) 잔존 북마크 가치 없음).

### 2.2 복원 규칙 (딥링크·새로고침·뒤로가기)

| 경로 | 새로고침/딥링크 진입 시 | 뒤로가기/이탈 규칙 |
|---|---|---|
| `/` | **항상 자동 시작 재시도**(M-1). 측정 세션 비영속 — 이전 값 복원 없음. `isSecureContext===false`면 비HTTPS 안내(§4.3). **왕복 슬롯은 메모리 전용 — 새로고침 시 소실 → 일반 측정 모드로 시작**(LD-2). URL에 왕복 흔적을 남기지 않으므로(§7.4 — 쿼리 미사용) 파기 후 잔여 정리 불요 | 탭 이탈·라우트 이탈·백그라운드 → 자동 정지, 복귀 시 **자동 재시작**(M-2 — v1의 "복귀 시 idle"과 다름). 왕복 모드 중 뒤로가기 → `/race/:motorId` 복귀, 슬롯 생존 → 초안 복원(§7.4) |
| `/motors` | react-query 재조회 — normal/empty/error 수렴. **확장 상태는 휘발** — 새로고침 시 전부 접힘(LD-1). DnD 순서는 `sortOrder` 영속이므로 복원됨 | — |
| `/race` | 재조회. 목록 순서 = `sortOrder` | — |
| `/race/:motorId` | `getMotorById` 조회. **미존재 motorId(삭제·오타 딥링크) → in-place not-found**: 헤더 유지 + "모터를 찾을 수 없습니다" + [레이스 목록으로] primary — 라우트 404로 던지지 않음(v1 `/motors/:id` 패턴 승계). 입력 시트는 닫힌 상태로 시작(초안은 메모리 — 새로고침 시 파기, LD-2) | [←]/뒤로가기 → `/race`. history 스택 없는 딥링크 최초 진입이면 [←]는 `/race`로 navigate(replace). 왕복 복귀(자동/수동/브라우저 back) 시 슬롯이 있으면 시트 재오픈+초안 복원(§7.4) |
| `/guide` | loader `redirect('/race')` — 화면 렌더 없음, history에 남지 않음 | — |
| `*` | Not Found (§2.5) | [측정으로 이동] → `/` replace |

- **스크롤 복원**: 루트 `<ScrollRestoration />` 1개 — 뒤로가기 위치 복원, push는 top. v1 승계.
- **document.title**: `useMatches()` 마지막 match `handle.title` + ` — {VITE_APP_TITLE}`. RootLayout 동기화. `/race/:motorId`는 모터명 로드 후 페이지가 "{모터명} 레이스"로 갱신(로드 전 fallback = handle.title).

### 2.3 라우팅 코드 (Phase 3 route-builder가 생성 — 본 블록이 계약)

```tsx
// src/app/routes/router.tsx
import { createBrowserRouter, redirect } from 'react-router';
import { RootLayout } from '@/app/layouts/RootLayout';
import { RootErrorFallback } from '@/app/layouts/RootErrorFallback';

export interface RouteHandle {
  title: string;
  tab?: 'measure' | 'motors' | 'race'; // 하단 탭 활성 매핑 — handle이 명시 (prefix 매칭 아님)
  hideTabBar?: boolean;                 // v2 사용처 없음 — 필드 예약 유지
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RootErrorFallback, // 렌더 crash 전용 — persistence 실패는 §8 복구 UI (Result 값 경로)
    children: [
      { index: true,           lazy: () => import('@/pages/measure'),     handle: { title: '측정', tab: 'measure' } satisfies RouteHandle },
      { path: 'motors',        lazy: () => import('@/pages/motors'),      handle: { title: '모터', tab: 'motors' } satisfies RouteHandle },
      { path: 'race',          lazy: () => import('@/pages/race'),        handle: { title: '레이스', tab: 'race' } satisfies RouteHandle },
      { path: 'race/:motorId', lazy: () => import('@/pages/race-detail'), handle: { title: '레이스', tab: 'race' } satisfies RouteHandle },
      { path: 'guide',         loader: () => redirect('/race') },         // LD-6 — 구 딥링크 이관, history 미잔존
      { path: '*',             lazy: () => import('@/pages/not-found'),   handle: { title: '페이지를 찾을 수 없음' } satisfies RouteHandle },
    ],
  },
]);
```

```tsx
// src/app/App.tsx — RouterProvider는 반드시 react-router/dom에서
import { RouterProvider } from 'react-router/dom';
import { router } from '@/app/routes/router';

export function App() {
  return <RouterProvider router={router} />; // Providers(query/theme/persistence) 구성은 app/providers 소관
}
```

```tsx
// src/app/layouts/RootLayout.tsx — 구조 계약 (스타일·훅 상세는 구현 재량)
import { Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router';

export function RootLayout() {
  const handle = /* useMatches() 마지막 match의 handle as RouteHandle */;
  const { pathname } = useLocation();
  return (
    <>
      <a className="skip-link" href="#main">본문으로 건너뛰기</a>
      <GlobalPersistenceBanner />                {/* 'ready'면 null — §8 */}
      {/* header는 각 페이지가 소유 (PageHeader v3 2단) */}
      <main id="main">
        <PageFade key={pathname}>                {/* RV-4: opacity 0→1 enterMs, reduced-motion 0ms */}
          <Outlet />
        </PageFade>
      </main>
      {!handle?.hideTabBar && <BottomTabBar active={handle?.tab} />}
      <ScrollRestoration />
    </>
  );
}
```

각 페이지 모듈은 lazy route 규약으로 `Component`를 named export: `export { MeasurePage as Component }`.

### 2.4 페이지 파일 맵 (route-builder 생성·삭제 대상)

| 파일 | 역할 |
|---|---|
| `src/app/routes/router.tsx` | §2.3 라우터 + `RouteHandle` |
| `src/app/layouts/RootLayout.tsx` | skip link · 배너 · PageFade Outlet · 탭 바 3종 · ScrollRestoration · title 동기화 |
| `src/app/layouts/RootErrorFallback.tsx` | 렌더 crash 전용 패널 (v1 승계) |
| `src/app/ui/GlobalPersistenceBanner.tsx` | §8 전역 배너 (v1 승계 + DB v2 재생성 토스트 연동) |
| `src/pages/measure/index.ts` + `ui/MeasurePage.tsx` | S1 조립 — 자동 시작·히어로·[기록]·모터 선택 시트·왕복 모드 |
| `src/pages/motors/index.ts` + `ui/MotorsPage.tsx` | S3 조립 — DnD 목록·인라인 확장·등록/수정 시트 |
| `src/pages/race/index.ts` + `ui/RacePage.tsx` | S5 조립 — 레이스 목록 + [초기화] |
| `src/pages/race-detail/index.ts` + `ui/RaceDetailPage.tsx` | S6 조립 — 기록 리스트·입력 시트·왕복 발진/복귀·in-place not-found |
| `src/pages/not-found/index.ts` + `ui/NotFoundPage.tsx` | §2.5 |
| **삭제** | `src/pages/record-new/**` · `src/pages/guide/**` · `src/pages/motor-detail/**` (feature 삭제 목록 — record-entry·voltage-guide — 은 change-scope 소관) |

### 2.5 Not-found / 403 / HTTP status (v1 승계)

- **클라이언트 404** (`*`): 탭 바 유지(활성 없음), h1 "페이지를 찾을 수 없습니다" + [측정으로 이동] primary. `/race/:motorId` 미존재 motorId는 **화면 내 not-found**(§2.2).
- **403 / 인증**: 해당 없음(로그인 없음).
- **HTTP status**: SPA fallback rewrite로 전 경로 200. `<meta name="robots" content="noindex">` 유지.

---

## 3. 화면 공통 규격 (v3 문법)

| 규격 | 값 |
|---|---|
| PageHeader | v3 2단 — ① 유틸 행 56px(스택: `[← 44px] … [액션]` / 탭 화면: 액션 있을 때만 렌더) ② 디스플레이 타이틀 행(h1 clamp 28~34px w800, 아래 hairlineStrong 룰 옵션). 헤더 아래 콘텐츠 시작 여백 `sectionGap`(40px) |
| 본문 좌우 패딩 | 16px (320px 뷰포트에서 콘텐츠 폭 288px) |
| 섹션 간 여백 | `sectionGap` 40px · 카드 내부 `cardPad` 20px |
| 목록 행 | min-height 56px. 행 내 보조 버튼([삭제]·DnD 핸들)은 44×44 독립 타깃, 행 탭 영역과 중첩 금지 |
| 버튼 | primary = contained 컷코너 full-width h56(large)/h48 · secondary = outlined 직각 h44+ · tertiary = text 밑줄. destructive contained는 ConfirmDialog 계약 내에서만(§7.5) |
| 카드 | Paper outlined + 편집 요소(인덱스 overline·hairlineStrong 룰·수치 우측 baseline `listValue`) |
| 토스트 | 탭 바 위 Snackbar (`bottom: 56px + safe-area + 8px`) |
| 숫자 | 전부 tabular-nums. 대형 수치는 Oxanium 서브셋(RV-4 — `font-display: optional`, 스왑 layout shift 금지) |

---

## 4. S1 측정 (`/`) — 히어로 골격 + Layout Stability 계약 (최중요)

### 4.1 골격 — 상태 전환으로 어떤 요소도 이동하지 않는다 (v1 계약 승계, 존 재편)

```
┌────────────────────────────────────┐
│ [G] 전역 배너 슬롯 (조건부)           │ ← 부팅 시 1회 결정 — 측정 상태 전환과 무관
├────────────────────────────────────┤
│ [R] 왕복 모드 스트립 (왕복 진입시에만)  │ ← §7.4. 페이지 진입 시 1회 결정 — 상태 전환으로
│  "‘모터 A’ 레이스 측정 — 안정되면      │    나타나거나 사라지지 않음(모드 종료 = 라우트 이동).
│   자동으로 돌아갑니다"  role=status   │    일반 모드에서는 미렌더(높이 0) — 모드가 다른 화면
├────────────────────────────────────┤
│ [Z1] 상태 라벨 존        h 48px 고정  │ ← StatusLabel(아이콘+텍스트+펄스), role=status
│      ● 측정 중            [테마 ◐]   │    + visually-hidden aria-live=polite 채널(단일)
├────────────────────────────────────┤    우측: ThemeToggle 44×44 (수치 영역 밖)
│ [Z2] 히어로 존  h=measureValueMinHeight ← "계기판 한 장"(v3 §9.4): hairlineStrong 베젤 링
│   ╭  게이지 아크 220° (aria-hidden) ╮ │    + 상태 bg(--mml-status-*-bg) + 비네트 overlay
│   │   눈금: 파노 170~620 Hz (M-4)   │ │    전부 장식 — canonical 수치는 텍스트 경로
│   │        309.0                   │ │ ← 주지표 파노 대형 수치 (디스플레이 스케일, Oxanium)
│   │         Hz                     │ │ ← 단위 overline
│   │      18,540 rpm                │ │ ← 보조 rpm (fanoValue 스케일 자리 — M-4 주/보조 역전)
│   ╰  (안내/오류 문구 슬롯 1줄 고정)  ╯ │ ← 상태 문구 전용 — 없으면 빈 줄 유지
├────────────────────────────────────┤
│ [Z3] 액션 존 — 단일 슬롯  h 56px 고정  │ ← v1의 [B] 세션 슬롯 폐지(다시 측정 없음 — M-3)
│  [        기록        ]             │    상태의 유일 행동이 이 슬롯을 점유(§4.3)
├────────────────────────────────────┤
│ [N] 하단 탭 (56px + safe-area)       │
└────────────────────────────────────┘
```

**높이 계약 (v1 승계·값은 v3 토큰)**
- Z2 = `layoutTokens.measureValueMinHeight`(clamp 200~272px, v3 재클램프) 고정. Z1 48px · Z3 56px 고정. 존 간 여백 flex 고정 비율. **상태 전환으로 절대 불변** — 재계산은 resize/회전 시에만.
- [R] 스트립은 왕복 모드 진입(라우트 이동) 시에만 존재 — 페이지 수명 내 등장/소멸 없음. 레이아웃 안정 계약과 양립.
- h1 "측정"은 visually-hidden. 게이지 SVG·베젤·비네트 `aria-hidden` — 수치는 텍스트 노드가 canonical.

**게이지 재설계 (M-4)**: 220° 아크·viewBox `0 0 200 120` 기하 승계, **매핑을 파노 170~620 Hz로 교체**. 주 눈금 100 Hz(200·300·400·500·600 라벨 + 끝점 170/620은 무라벨 틱), 보조 눈금 25 Hz(hairline). 캡션 "Hz" overline 톤. 레드라인 밴드 580~620 Hz(`error.main` 단색, 장식 — DS-A15). 진행 아크(라임)·바늘 규칙은 v3 §9.4 승계 — measuring에서 최소점→현재 파노.

### 4.2 상태 머신 v2 (레이아웃 관점 — canonical enum·전이는 state-contract 소관)

v1의 `idle`(수동 시작)·`stable`(잠금 UI) **상태 제거**(M-1·M-3). 안정 판정은 내부 유지 — [기록] 활성 판단·왕복 자동 확정(RV-1)에만 사용, UI 상태로 노출하지 않는다.

| 상태 | Z1 라벨 (톤) | Z2 히어로 | 문구 슬롯 | Z3 슬롯 |
|---|---|---|---|---|
| `starting` (자동 시작 시도·권한 프롬프트 중) | "측정 준비 중…" (중립) | 게이지 dim, 수치 "—" | (빈 줄) | [기록] disabled |
| `awaiting-gesture` (iOS fallback — M-1 ⚠️) | "시작 대기" (**중립 — 오류 톤 금지**) | 게이지 dim, 수치 "—" | "탭하여 측정을 시작하세요" | **[탭하여 시작]** primary(라임) — 1탭 계약, QA 대상 |
| `measuring` | "● 측정 중" (라임 펄스) | 파노 대형 수치 + rpm 보조 — **연속 갱신**(잠금 없음). 진행 아크·바늘 라임 | (빈 줄) | **[기록]** — 표시 수치 non-null이면 활성(M-5) |
| `weak-signal` | "신호 약함" (앰버) | 수치 "—"(동일 스케일 행), 바늘·아크 숨김 | "신호가 약합니다. 모터에 더 가까이 대세요" | [기록] disabled |
| `no-permission` (일시) | "마이크 권한 필요" (레드) | 게이지 dim, "—" | "마이크 권한이 거부되었습니다" | **[권한 다시 요청]** primary |
| `no-permission` (영구) | "마이크 권한 필요" (레드) | 게이지 dim, "—" | "브라우저 설정에서 마이크 권한을 허용해야 합니다" (+설정 경로 접기 — Z2 내부 스크롤, 높이 불변) | **[설정 방법 보기]** (펼치기 토글) |
| `suspended` (iOS 오디오 중단) | "오디오 일시 중지됨" (중립) | 게이지 dim, "—" | "iOS 정책으로 오디오가 중지되었습니다" | **[탭하여 다시 시작]** primary |
| 비HTTPS | "측정 불가" (중립) | 게이지 dim, "—" | "HTTPS에서만 측정할 수 있습니다" (권한 문구와 혼용 금지) | [기록] disabled |

- **자동 시작(M-1)**: 마운트 즉시 캡처 시도 → 성공 `measuring` / 브라우저가 제스처 요구 시 `awaiting-gesture`(실패·오류로 표현 금지 — 중립 라벨+라임 primary) / 권한 거부 `no-permission`.
- **수명(M-2)**: visibilitychange 숨김·라우트 이탈 → 자동 정지. 복귀·재진입 → 자동 재시작(`starting`부터). 중지 버튼 없음.
- **3요소 병행(M-7)**: 권한 없음/신호 약함/측정 중 구분은 라벨+아이콘+bg 3중 유지(REQ-NFR-003). aria-live 채널은 Z1 단일.
- persistence `unavailable`이면 [기록] 상시 disabled — 이유는 전역 배너가 고지(§8).

### 4.3 [기록] → 모터 선택 시트 (M-6)

```
╭────────────────────────────────────╮ ← BottomSheet, aria-modal, focus trap
│  h2: 기록할 모터                     │
│  309.0 Hz · 18,540 rpm   ← 스냅샷    │ ← [기록] 탭 시점 값 고정 표시 — 시트가 열려 있는 동안
│  ────────────────────────────       │    측정은 계속되지만 기록되는 값은 이 스냅샷(계약)
│  ▸ 모터 A   토크튠      291.5 Hz     │ ← 행: 이름·종류 라벨·최신 파노. sortOrder 순, h≥56
│  ▸ 모터 B   하이퍼대시   305.0 Hz     │    행 탭 → 즉시 MeasureRecord 수집(rolling ≤10, T-3)
│  ▸ 모터 C   마하대시     (기록 없음)   │    → 시트 닫힘 + 토스트 "'모터 A'에 기록됨"
╰────────────────────────────────────╯
```

- 모터 0개: 시트 본문 = "등록된 모터가 없습니다" + [모터 등록] primary → **등록 시트(§5.4)로 교체** → 저장 성공 시 방금 등록한 모터로 **즉시 수집** + 토스트(선택 단계 생략 — 유일 모터).
- 수집 실패(쓰기 오류): 시트 유지 + 시트 내 오류 배너 `role="alert"` + 행 재탭 가능.
- 닫기: 시트 밖 탭/ESC/스와이프 다운 — 수집 없이 닫힘, 측정 화면 무변화.

---

## 5. S3 모터 (`/motors`) — 목록 + DnD + 인라인 확장 (LD-1)

### 5.1 골격

```
┌────────────────────────────────────┐
│ [H] 유틸 행:              [+ 등록]   │ ← h44 secondary
│     모터  (h1 디스플레이)            │
├────────────────────────────────────┤
│ [M] 모터 목록 — sortOrder 순 (T-6)   │
│ ┌──────────────────────────────┐   │
│ │[≡] 모터 A · 토크튠    291.5 Hz ▾│  │ ← 접힘 행: [≡ DnD 핸들 44×44] + 이름·종류 라벨
│ └──────────────────────────────┘   │    + 최신 파노(listValue) + 확장 캐럿
│ ┌──────────────────────────────┐   │
│ │[≡] 모터 B · 하이퍼대시 305.0 Hz ▴│ │ ← 펼침 행 (aria-expanded=true)
│ │  ── hairlineStrong ──          │  │
│ │  [라인 차트 SVG  h160 고정]      │  │ ← X=측정일시 Y=파노, 점 ≤10 (T-5) — §5.2
│ │  01  07-25 14:02  289.0 Hz ·   │  │ ← 기록 리스트 ≤10행 (T-4: 파노 주 + rpm 부 + 일시)
│ │              17,340 rpm        │  │    수집 전용 — 행 액션 없음 (T-2, 개별 삭제 없음 RV-A1)
│ │  02  07-26 09:11  305.0 Hz · … │  │
│ │  [수정]              [삭제]      │  │ ← 패널 푸터 h44×2 — 등록 시트(기존 값)/cascade confirm
│ └──────────────────────────────┘   │
├────────────────────────────────────┤
│ [N] 탭 (모터 활성)                   │
└────────────────────────────────────┘
```

- **확장 동작**: 행 본체(핸들 제외) = `aria-expanded` 토글 버튼. 다중 확장 허용(비교 용도 — 단일 강제 안 함). 확장 상태 휘발(§2.2). 확장/접힘 높이 전환은 `enterMs` — reduced-motion 0ms.
- empty(모터 0개): 목록 자리 EmptyState — "첫 모터를 등록하세요" + [+ 등록] primary (오류 위장 금지).
- 기록 0건 확장: 차트 자리에 "아직 기록 없음 — 측정 탭에서 [기록]으로 수집하세요" 텍스트 블록(h160 유지 안 함 — 확장 패널은 S1류 높이 고정 계약 비대상).

### 5.2 라인 차트 (T-5 — 커스텀 SVG)

| 항목 | 사양 |
|---|---|
| 크기 | width 100%(288px@320) × height 160px 고정. viewBox 비율 유지 |
| 축 | X = measuredAt(시각 등간격 아님 — 실제 시간 축), Y = panoHz. Y 라벨 min/max 2개만(overline 톤), X 라벨 처음/끝 날짜 2개 |
| 표현 | 라임 라인(strokeWidth 2) + 점(r 3, 마지막 점 강조 r 4). 점 1개면 점만. 그리드는 hairline 수평 2줄 이하 |
| 접근성 | SVG 전체 `aria-hidden` — **canonical 데이터는 아래 기록 리스트 텍스트**(중복 채널 금지). 차트는 추세 보조 |
| 금지 | 차트 라이브러리·애니메이션 트윈(진입 페이드는 패널 전환에 포함) |

### 5.3 DnD 정렬 (T-6 — @dnd-kit)

- **핸들 전용 활성화**: 드래그는 [≡] 핸들에서만 시작(PointerSensor `activationConstraint` — 터치 스크롤과 공존). 행 본체 스와이프/탭은 확장 토글과 스크롤에 귀속.
- **키보드 대체 수단**(a11y 계약): 핸들 focusable — Space/Enter 들기 → ↑/↓ 이동 → Space 확정/Esc 취소 (@dnd-kit KeyboardSensor + `sortableKeyboardCoordinates`). 핸들 `aria-label="'{모터명}' 순서 변경"`, 이동 결과 aria-live 안내는 dnd-kit announcements 사용.
- 드래그 시작 시 **확장 패널 전부 접힘**(드래그 프리뷰 높이 안정 — LD-1 트레이드오프 해소). 드롭 시 `sortOrder` 영속(쓰기 실패 → 순서 롤백 + 토스트).
- 드래그 중 자동 스크롤은 dnd-kit 기본. reduced-motion 시 드롭 애니메이션 0ms.

### 5.4 모터 등록/수정 시트 (T-1)

```
╭────────────────────────────────────╮ ← BottomSheet(상단 radius 20), aria-modal, focus trap
│  h2: 모터 등록 (수정 시 "모터 수정")   │
│  이름 (필수, ≤30) [______________]  │ ← 미입력/초과 저장 → 인라인 오류
│  종류 (필수) — 9택 그리드 3열         │
│   [130]      [아토믹튠] [토크튠]     │ ← ToggleButton 직각·라임 선택. 셀 min-h 44,
│   [렙튠]     [하이퍼대시][파워대시]    │    긴 라벨 2줄 wrap 허용. 저장 값 = 안정 식별자
│   [스프린트대시][울트라대시][마하대시]  │    (m130·atomic·…), 표시 = 라벨 맵(shared/config)
│  [ 저장 ] primary   [ 취소 ]        │
╰────────────────────────────────────╯
```

- v1의 상태 등급·메모 필드 **제거**(T-1). 종류 미선택 저장 → 인라인 오류 + 그리드로 focus.
- [삭제](확장 패널) → cascade ConfirmDialog: **"'{모터명}'과 측정 기록 {n}건, 레이스 기록 {m}건이 함께 삭제됩니다. 되돌릴 수 없습니다."** (n·m 실측 — cascade 범위에 RaceRecord 포함, 브리프 §제거 대상). 확정 후 목록 갱신(라우트 이동 없음 — 상세 화면이 없으므로 스택 정리 불요).

---

## 6. S5 레이스 목록 (`/race`) · S6 레이스 페이지 (`/race/:motorId`)

### 6.1 S5 레이스 목록 (R-1)

```
┌────────────────────────────────────┐
│ [H] 레이스 (h1 디스플레이)            │
├────────────────────────────────────┤
│ [M] 모터 목록 — sortOrder 순         │
│ ┌──────────────────────────────┐   │
│ │ 모터 A · 토크튠                 │   │ ← 행 1: 이름·종류
│ │ 마지막 레이스 07-28 완주 · 3.1V  │   │ ← 행 2: 마지막 RaceRecord 요약
│ │              · 291.5 Hz       │   │    (없으면 "레이스 기록 없음" — 중립)
│ └──────────────────────────────┘   │  행 전체 탭 → /race/:motorId (h≥56)
│  …                                 │
│                                    │
│  ── (스크롤 최하단, sectionGap) ──    │
│  [ 기록 초기화 ]  ← outlined destructive 톤, h44 (LD-5)
├────────────────────────────────────┤
│ [N] 탭 (레이스 활성)                  │
└────────────────────────────────────┘
```

- empty(모터 0개): 목록 자리 EmptyState — "모터를 먼저 등록하세요" + [모터로 이동] → `/motors`. **[기록 초기화]는 이때 미렌더**(초기화할 대상 없음).
- **[기록 초기화]**(R-6): ConfirmDialog — "모든 측정 기록과 레이스 기록이 삭제됩니다. 모터 등록 {k}대는 유지됩니다. 되돌릴 수 없습니다." (RV-A2 범위 고지) + 초기 포커스 [취소] + destructive [초기화]. 성공 토스트. §8 복구 패널의 [모든 데이터 초기화](모터 포함 전체 삭제)와는 **별개 액션** — 문구로 범위 구분.

### 6.2 S6 레이스 페이지 (R-2·R-4·R-7)

```
┌────────────────────────────────────┐
│ [H] 유틸 행: [←]            [+ 입력] │ ← [+]: h44 primary(컷코너 소형)
│     모터 A  (h1 디스플레이)           │ ← 타이틀 = 모터명, 아래 "토크튠 · 레이스 {n}회" 메타
├────────────────────────────────────┤
│ [M] 레이스 기록 리스트 — 최신순        │
│ ┌──────────────────────────────┐   │
│ │ 05  07-28 20:14        [삭제] │   │ ← 행1: 회차 인덱스(overline)+일시+[삭제] 44×44(LD-4)
│ │ 완주 · 3.1V · 291.5Hz · 32.45s│   │ ← 행2: 결과(텍스트, 중립색 DS-A5)·전압·파노·랩타임(있으면)
│ └──────────────────────────────┘   │    수치는 listValue tabular. 수정 없음(immutable)
│ │ 04  07-28 20:02        [삭제] │   │
│ │ 이탈 · 3.1V · 291.5Hz          │   │
│  …                                 │
├────────────────────────────────────┤
│ [N] 탭 (레이스 활성)                  │
└────────────────────────────────────┘
```

- empty(기록 0건): 리스트 자리 "아직 레이스 기록이 없습니다" + [+ 입력] primary 반복 노출.
- 행 [삭제] → ConfirmDialog "이 레이스 기록을 삭제할까요?" (LD-4).
- in-place not-found(§2.2): 헤더 [←]+"레이스" 유지, 본문 = "모터를 찾을 수 없습니다" + [레이스 목록으로] primary.

### 6.3 레이스 입력 시트 (R-3 — BottomSheet, LD-3)

```
╭────────────────────────────────────╮ ← [+ 입력] 탭으로 오픈. aria-modal, focus trap
│  h2: 레이스 입력 — 모터 A            │
│  ① 파노 (자동)                      │
│  ┌ 291.5 Hz  (읽기전용) ─ [측정] ┐   │ ← 최신 MeasureRecord 파노 자동 입력.
│  └──────────────────────────────┘   │    [측정] h44 → 왕복(§6.4). 기록 없으면 값 자리
│     (없으면: "측정 기록 없음")         │    "측정 기록 없음" + [측정] 유도 — 파노는 필수
│  ② 결과 (필수) — 세그먼트 2택         │
│   [   완주   ][   이탈   ]          │ ← ToggleButton 직각, 각 h44
│  ③ 전압 (필수)                      │
│   [−0.1]  [ 3.1 ] V  [+0.1]        │ ← v1 스테퍼 재사용, inputmode=decimal, 0.1~9.9
│  ④ 랩타임 (옵션)  [ 32.45 ] s       │ ← inputmode=decimal, 초 단위 (ms 변환은 state-contract)
│  [ 입력 ] primary   [ 취소 ]        │ ← 파노·결과·전압 충족 시 활성. 성공: 시트 닫힘 +
╰────────────────────────────────────╯    리스트 최상단 추가 + 토스트. [+]로 반복(R-4)
```

- 검증 상세(범위·포맷)는 component/state-contract 소관 — 레이아웃은 인라인 오류 슬롯을 각 필드 아래 예약.
- Focus order: 파노 [측정] → 결과 세그먼트 → 전압(− → input → +) → 랩타임 → [입력] → [취소].

### 6.4 [측정] 왕복 계약 (R-5·RV-1) — 레이아웃 관점

```
S6 입력 시트 [측정] 탭
  → 왕복 슬롯 기록: { motorId, 폼 초안(결과·전압·랩타임) }   ← 메모리 단일 슬롯 (LD-2)
  → navigate('/')  ※ push, 쿼리 파라미터 없음 — 모드는 슬롯 존재로 판정 (URL 오염·잔존 쿼리 문제 회피)
S1 왕복 모드:
  · [R] 스트립: "'모터 A' 레이스 측정 — 수치가 안정되면 자동으로 돌아갑니다" (role=status)
  · Z3 슬롯: [기록] 대신 [레이스로 돌아가기] secondary  ← RV-1: 이 모드에 [기록] 없음. 수동 취소 수단
  · 안정 판정(내부, 기존 로직 재사용) 도달 시 자동으로:
      ① 해당 모터에 MeasureRecord 수집(rolling ≤10)
      ② 슬롯 초안의 파노값 갱신
      ③ navigate(-1) — /race/:motorId 복귀 (페이드 전환만, 별도 모션 없음)
S6 복귀(자동·[돌아가기]·브라우저 back 공통):
  · mount 시 슬롯 존재 → 입력 시트 재오픈 + 초안 복원 (자동 복귀면 파노 갱신됨,
    수동/뒤로가기 취소면 파노 원값 유지 — 자동 수집 없음) → 슬롯 소비(clear)
```

- **새로고침 정책(LD-2 확정)**: 왕복 중 `/` 새로고침 → 슬롯 소실 → **일반 측정 모드로 시작, 폼 초안 파기**. S6 새로고침도 초안 파기(시트 닫힌 상태). 근거는 결정 로그 LD-2 — 자동 수집 모드의 유령 부활 방지 + 재입력 비용 3필드.
- 슬롯의 데이터 구조·소비 시점·안정 판정 연결은 **state-contract 소유** — 본 문서는 레이아웃 계약(스트립·슬롯 버튼 교체·시트 재오픈)만 확정.
- 왕복 모드에서 weak-signal·no-permission 등 상태 표시는 §4.2와 동일(스트립·슬롯 버튼만 다름). 안정 도달 불가로 오래 머물러도 타임아웃 강제 복귀 없음 — [레이스로 돌아가기]가 탈출구.

---

## 7. 오버레이 인벤토리 (전부 라우트 없음)

| # | 오버레이 | 형태 | 호출처 | 명세 |
|---|---|---|---|---|
| 7.1 | 모터 선택 시트 | BottomSheet | S1 [기록] | §4.3 — 스냅샷 값 표시, 행 탭 즉시 수집, 0개면 등록 유도 |
| 7.2 | 모터 등록/수정 시트 | BottomSheet | S3 [+ 등록]·확장 [수정], 7.1의 0개 유도 | §5.4 — 이름+종류 9택 |
| 7.3 | 레이스 입력 시트 | BottomSheet | S6 [+ 입력]·왕복 복귀 재오픈 | §6.3 |
| 7.4 | ConfirmDialog (destructive 공용) | 중앙 모달 | ① RaceRecord 개별 삭제(LD-4) ② 모터 cascade 삭제(측정 n·레이스 m건 고지) ③ [기록 초기화](RV-A2 범위 고지) ④ resetAllData(§8 복구 패널 — 전체 삭제) | 초기 포커스 [취소], destructive contained, focus trap + ESC + 트리거 복귀. 상세는 component-designer |

공통: `aria-modal="true"` · focus trap · 닫힘 후 트리거 focus 복귀 · 시트 하단 safe-area. 시트 위 시트 금지 — 7.1→7.2 는 **교체**(닫고 열기).

---

## 8. 전역 배너 · 복구 UI (persistence 3-상태 — v1 계약 승계 + DB v2)

부팅 시 1회 결정 — 측정 상태 전환과 무관, S1 layout stability 비침해. v1 §8 계약 전량 승계, v2 변경분:

| 항목 | v2 |
|---|---|
| **DB v2 재정의(RV-3)** | `mml-db` v2 — 부팅 시 구버전 감지하면 **삭제 후 재생성**(마이그레이션 없음). 이때 1회 정보 톤 토스트 "데이터 형식이 변경되어 초기화되었습니다" — 사용자가 데이터 소실을 오류로 오해하지 않게 고지. 이후 상태는 `ready` |
| `unavailable` | 배너 "이 브라우저에서는 기록이 저장되지 않습니다 (측정은 가능)". S1 [기록] 상시 disabled(§4.2). S3/S5/S6 본문 = 불가 안내 블록 |
| `corrupt` | 배너 + S3/S5/S6 본문 = 복구 패널(v1 골격 그대로: [다시 시도] + [모든 데이터 초기화] → ConfirmDialog "모든 모터와 기록이 삭제되며 되돌릴 수 없습니다"). **resetAllData(모터 포함 전체) 진입점은 여기가 유일** — `/race`의 [기록 초기화](기록만, 모터 유지)와 문구·범위 구분 |
| 일반 읽기 실패 | 배너 없이 해당 목록 영역만 오류 블록 + [다시 시도](명시 refetch). 빈 목록 위장 금지 |

---

## 9. 화면 × 상태 레이아웃 매트릭스 (전 셀 — v2)

| 화면 | normal | empty | loading | error/partial | permission/destructive |
|---|---|---|---|---|---|
| **S1 측정** | measuring — 연속 갱신, [기록] 활성. 왕복 모드 = +[R] 스트립, Z3=[돌아가기] | (해당 없음 — 자동 시작) | starting — "측정 준비 중…", [기록] disabled. 다른 존 불변 | weak-signal — "—"+안내, [기록] disabled / suspended — [탭하여 다시 시작] / 비HTTPS — 안내+disabled. 골격 불변 | awaiting-gesture — **중립 톤** [탭하여 시작](오류 표현 금지, M-1) / no-permission 일시·영구 문구 분리. destructive 없음 |
| **S3 모터** | DnD 목록 + 인라인 확장(차트+기록+수정/삭제) | 모터 0 — EmptyState+[+ 등록] / 확장 내 기록 0 — "아직 기록 없음" 안내 | 목록 영역 스피너(순간) — 헤더 불변 | 읽기 실패 — 오류 블록+[다시 시도] / sortOrder 쓰기 실패 — 순서 롤백+토스트 / corrupt — 복구 패널 | 모터 cascade confirm(측정 n·레이스 m건 고지) |
| **S5 레이스 목록** | 모터 행+마지막 레이스 요약 + 하단 [기록 초기화] | 모터 0 — "모터를 먼저 등록하세요"+[모터로 이동], [기록 초기화] 미렌더 / 레이스 0인 행 — "레이스 기록 없음"(중립) | 스피너(순간) | 읽기 실패 — 오류 블록+[다시 시도] / corrupt — 복구 패널 | [기록 초기화] confirm — 범위 고지(모터 유지, RV-A2) |
| **S6 레이스 페이지** | 기록 리스트 최신순 + [+ 입력] 시트 | 기록 0 — 안내+[+ 입력] | [입력] 탭 즉시 disabled "저장 중…"(중복 탭 방지) | 저장 실패 — 시트 내 오류 배너 `role=alert`+입력값 유지 / motorId 미존재 — in-place not-found / corrupt — 복구 패널 | RaceRecord 개별 삭제 confirm(LD-4) |
| **오버레이** | 각 §7 | 7.1 모터 0 — 등록 유도(시트 교체) | 저장 버튼 disabled 패턴 공통 | 수집·저장 실패 — 시트 내 배너, 시트 유지 | ConfirmDialog 4용도(§7.4) — 초기 포커스 [취소] |
| **전역** | — | — | 부팅 중 짧은 빈 프레임 허용(스플래시 없음) | unavailable/corrupt 배너·복구 패널(§8) / 렌더 crash — RootErrorFallback | resetAllData confirm(복구 패널 유일 진입점) / DB v2 재생성 — 1회 정보 토스트(RV-3) |

---

## 10. 반응형 · reflow · 접근성 레이아웃 계약

- **320 CSS px / 400% zoom reflow**: 전 화면 단일 컬럼, 가로 스크롤 0. 종류 9택 그리드는 3열 유지(긴 라벨 2줄 wrap, 셀 min-h 44). 파노 대형 수치는 clamp 하한(64px)으로 수렴. 차트 SVG는 width 100% 축소(viewBox 비율).
- **200% text resize**: 고정 높이 존(S1 Z1/Z3, 헤더, 탭, 목록 행)은 rem 기반 — 비례 확장, 세로 오버플로는 main 스크롤 수용, 골격 순서 불변. Z2는 `measureValueMinHeight`(clamp — vw 항이 흡수). px 하드코딩 금지(토큰 경유 — design-system 소관).
- **가로 회전**: 동일 레이아웃, clamp 상한이 캡. 세로 부족 시 main 스크롤(S1 존 순서 유지).
- **키보드/포커스**: §1 공통 순서 + 화면별 명시(§4.3·§5.3·§6.3). **DnD 키보드 대체 수단(§5.3)은 a11y 필수 계약 — QA gate 대상.** 오버레이 focus trap+트리거 복귀. S1 상태 알림은 Z1 aria-live polite 단일 채널(왕복 스트립은 진입 시 1회 status — 중복 알림 금지).
- **모션**: 펄스·진행 아크·페이지 페이드·시트 전환·press scale 전부 `prefers-reduced-motion` 0ms/정적 대체. 상태 판별은 정지 화면만으로 가능(라벨+아이콘+bg 3중).
- **iOS fallback(M-1)**: [탭하여 시작]은 44px 이상 primary 1탭 — 실패 톤 금지 계약, QA 대상.

---

## 11. 미결·Handoff (v2 — LO 갱신. 임의 확정 아님, baseline 명시)

| ID | 내용 | Baseline | Owner / 시한 |
|---|---|---|---|
| LO-5 | S3 인라인 확장 다중 허용 vs 단일(아코디언 배타) | **다중 허용** — 모터 간 비교가 목록의 핵심 용도 | component-designer, Phase 3 전 |
| LO-6 | 모터 선택 시트(§4.3)의 값 스냅샷 시점 — [기록] 탭 시 고정(baseline) vs 행 탭 시 재샘플 | **[기록] 탭 시 고정** — 사용자가 보고 누른 값이 기록되는 값(표시-기록 일치) | state-contract, Phase 3 전 |
| LO-7 | 왕복 모드 안정 도달 실패 장기 체류 시 타임아웃 자동 복귀 | **없음** — [레이스로 돌아가기]가 탈출구, 자동 이동은 예측 불가성 추가 | component-designer 검토 |
| LO-8 | `/race` [기록 초기화] 위치(목록 하단) — LD-5 이의 시 `/race/:motorId` 하단 이동 | **`/race` 목록 하단** (전체 범위 = 전체 목록 레벨) | 사용자 체크포인트 |
| 승계 | 왕복 슬롯 구조·소비 시점(§6.4)·안정 판정 연결·랩타임 ms 변환·검증 규칙 = **state-contract v2 소유**. 시트·confirm 문구/상호작용 상세 = component-designer v2. DnD 라이브러리 exact pin = tech-stack 갱신 | — | Wave 병행 문서 |
| 폐기 | v1 LO-1(가이드 초기 선택)·LO-2(S2 이탈 confirm)·LO-3(stable 오탭 가드)·LO-4(S4 empty 진입점) — 대상 화면·상태 소멸 | — | — |
