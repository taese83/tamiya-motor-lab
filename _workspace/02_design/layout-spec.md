# Layout Spec — minicar-motor-lab

> Phase 2 Wave 1 (layout-designer). 입력: `project-brief.md`(§layout-designer) · `ux-brief.md`(canonical — 화면·상태 시각 계약) · `checkpoint-phase1.md`(CP-1 등급+메모, CP-3 cascade) · `plan-review.md`(F-1 resetAllData 복구 경로).
> 소비자: component-designer(영역별 컴포넌트 계약) · state-contract-designer(라우트 복원 ↔ 상태 소유) · Phase 3 route-builder(§3 라우팅 코드 생성).
> 본 문서는 명세다 — `src/` 파일을 직접 생성하지 않는다. 라우팅·레이아웃 코드는 코드 블록으로 포함하며 route-builder가 Phase 3에서 생성한다.

---

## 0. 전제 (변경 금지)

| 항목 | 값 |
|---|---|
| Breakpoint | **모바일 세로 단일 기준.** 별도 브레이크포인트 없음 — 콘텐츠 `max-width: 480px` 중앙 정렬, 가로 회전은 동일 레이아웃(수치 타이포는 clamp 상한이 흡수) |
| 내비게이션 | 하단 탭 3(`측정 /` · `이력 /motors` · `가이드 /guide`) + 스택 push 2(`/record/new`, `/motors/:id`) + 오버레이 2(모터 등록/수정 BottomSheet, ConfirmDialog — 라우트 없음) |
| 라우터 | react-router **8.2.0** `createBrowserRouter`. DOM `RouterProvider`만 `react-router/dom`에서 import, 나머지는 전부 `react-router` |
| 데이터 로딩 | route loader **미사용** — 읽기는 전부 react-query(AD-4a 정책)가 페이지 내부에서 소유. 라우터는 내비게이션만 담당 |
| 시각화 | 금지 — 수치 텍스트만. 모든 상태 구분은 텍스트 라벨 동반(색 단독 금지) |
| 터치 타깃 | 최소 44×44 CSS px (REQ-NFR-003) |

---

## 1. 글로벌 레이아웃 (앱 프레임 — `app/` F9)

```
┌────────────────────────────────────────┐ ← viewport (max-width 480px 중앙, 좌우 여백은 배경)
│ (skip link — 첫 tabbable, 평시 숨김)      │
├────────────────────────────────────────┤
│ [G] 전역 배너 슬롯 (조건부, sticky top)    │ ← persistence 'unavailable' | 'corrupt' 시에만 렌더
├────────────────────────────────────────┤
│ [H] <header> 화면 헤더 (h 56px)          │ ← 화면별 소유 (S1은 상태 라벨 존이 겸함 — §4)
├────────────────────────────────────────┤
│ [M] <main id="main"> flex-1, 세로 스크롤  │
│      화면별 콘텐츠 (Outlet)               │
│      padding-bottom: 탭바/도크 높이 예약   │
├────────────────────────────────────────┤
│ [N] <nav aria-label="주요"> 하단 탭 바     │ ← position: fixed bottom, h 56px
│  [측정]      [이력]      [가이드]          │    + padding-bottom: env(safe-area-inset-bottom)
└────────────────────────────────────────┘   /record/new에서는 숨김(§2.3) → [저장] 도크로 대체
```

- **Landmark 계약**: 페이지당 `header`(banner) 1 · `main` 1 · `nav`(주요 내비) 1. 전역 배너는 `role="status"` — landmark 중복 없음. 오버레이(Dialog/Drawer)는 `aria-modal="true"`로 landmark 트리 밖.
- **Skip link**: "본문으로 건너뛰기" → `#main`. DOM 최상단, focus 시에만 표시.
- **Heading 계약**: 화면당 `h1` 정확히 1개(S1은 visually-hidden "측정" — 상태 라벨이 heading을 대체하지 않음). 섹션은 `h2`(S5 "추천 세팅 전압"·"근거 기록", S4 기록 목록 등). h3 이하 미사용.
- **Focus order** (전 화면 공통 골격): skip link → [G] 배너 내 액션(있으면) → [H] 헤더(뒤로/액션 버튼) → [M] 본문 위→아래 → 하단 도크 버튼(있으면) → [N] 탭 바. DOM 순서 = 시각 순서 — tabindex 양수 금지.
- **탭 바**: MUI `BottomNavigation` 기반 F10 킷(`shared/ui`). 활성 탭 = 경로 prefix 매칭(`/motors/:id`도 이력 탭 활성). 각 탭 = 아이콘+텍스트 라벨(아이콘 단독 금지), 타깃 ≥ 44px, `aria-current="page"`.
- **safe-area**: 하단 탭·S2 저장 도크에 `env(safe-area-inset-bottom)`, 전역 배너에 `env(safe-area-inset-top)`(minimal-ui 대비). `viewport-fit=cover` meta 필요.
- **에러 바운더리**: 루트 라우트 `ErrorBoundary`(react-error-boundary 연동) — 렌더 crash 시 [G/H/N] 골격 유지 없이 전용 패널(제목 "문제가 발생했습니다" + [새로고침]). **rehydrate/IndexedDB 실패는 여기로 오지 않는다** — Result 값으로 전파되어 §8 복구 패널이 처리(crash loop 금지).

---

## 2. 라우팅 맵

### 2.1 Route table

| 경로 | 화면 | 페이지 모듈 (FSD) | 탭 바 | handle 메타 | REQ |
|---|---|---|---|---|---|
| `/` (index) | S1 측정 | `pages/measure` | 표시 (측정 활성) | `{ title: '측정', tab: 'measure' }` | REQ-F-001/002/008, REQ-ST-001~004 |
| `/motors` | S3 이력·모터 목록 | `pages/motors` | 표시 (이력 활성) | `{ title: '이력', tab: 'motors' }` | REQ-F-003/005, REQ-ST-007 |
| `/motors/:id` | S4 모터 상세·이력 (스택) | `pages/motor-detail` | 표시 (이력 활성) | `{ title: '모터 상세', tab: 'motors' }` | REQ-F-005/009, REQ-ST-007 |
| `/record/new` | S2 기록 입력 (스택·작업) | `pages/record-new` | **숨김** — [저장] 도크 대체 | `{ title: '기록 입력', hideTabBar: true }` | REQ-F-004/008, REQ-ST-005 |
| `/guide` | S5 전압 가이드 | `pages/guide` | 표시 (가이드 활성) | `{ title: '가이드', tab: 'guide' }` | REQ-F-006, REQ-ST-006 |
| `*` | Not Found | `pages/not-found` | 표시 (활성 없음) | `{ title: '페이지를 찾을 수 없음' }` | — |

`/record/new`에서 탭 바를 숨기는 근거: 기록 입력은 목적지가 아닌 **작업**(ux-brief §3) — 폼 작성 중 탭 이탈로 입력이 소실되는 경로를 구조적으로 제거하고, 하단 공간을 [저장] 도크에 준다. 이탈 수단은 헤더 [←]와 브라우저 뒤로가기뿐.

### 2.2 복원 규칙 (딥링크·새로고침·뒤로가기)

| 경로 | 새로고침/딥링크 진입 시 | 뒤로가기/이탈 규칙 |
|---|---|---|
| `/` | 측정 세션은 비영속 — **항상 `idle`로 시작.** `isSecureContext===false`면 idle + 버튼 비활성(§4). 이전 stable 값 복원 없음(오래된 값 위장 금지) | measuring 중 라우트 이탈·백그라운드 진입 → `stopCapture` 후 idle (UX-A2). 복귀 시 idle |
| `/record/new` | 측정값 handoff는 메모리 single-slot(`entities/measurement`) — 새로고침 시 소실 → **"측정값 없음" 직접 입력 모드로 정상 렌더**(D2 — 오류 아님, 레이아웃 동일·카드 내용만 교체). 딥링크도 동일 | 저장 성공 → 스택 pop(진입 원점 복귀). history 스택이 없는 딥링크 최초 진입이면 `/motors`로 replace. 뒤로가기 = 폼 파기(confirm 없음 — baseline LO-2, §10) |
| `/motors` | react-query가 IndexedDB 재조회 — normal/empty/error 상태로 수렴 | — |
| `/motors/:id` | `getMotorById` 조회. **미존재 id(삭제됨·오타 딥링크) → in-place not-found 상태**: 헤더 유지 + 본문 "모터를 찾을 수 없습니다" + [이력으로 이동] primary. 라우트 404로 던지지 않음(cascade 삭제 직후 뒤로가기 재진입과 동일 경로) | 모터 삭제 확정 후 → `/motors`로 replace(스택에서 상세 제거 — 뒤로가기로 유령 상세 재진입 방지) |
| `/guide` | 모터 선택은 페이지 로컬 상태 — 새로고침 시 **미선택으로 시작**(baseline LO-1, §10). 집계는 항상 최신 기록으로 재계산(stale 금지) | — |
| `*` | Not Found 페이지(§2.5) | [측정으로 이동] → `/` replace |

- **스크롤 복원**: 루트에 `<ScrollRestoration />` 1개 — 뒤로가기는 위치 복원, push는 top.
- **document.title**: `useMatches()` 마지막 match의 `handle.title` + ` — {VITE_APP_TITLE}`. RootLayout이 동기화.

### 2.3 라우팅 코드 (Phase 3 route-builder가 생성 — 본 블록이 계약)

```tsx
// src/app/routes/router.tsx
import { createBrowserRouter } from 'react-router';
import { RootLayout } from '@/app/layouts/RootLayout';
import { RootErrorFallback } from '@/app/layouts/RootErrorFallback';

export interface RouteHandle {
  title: string;
  tab?: 'measure' | 'motors' | 'guide'; // 하단 탭 활성 매핑 (prefix 아님 — handle이 명시)
  hideTabBar?: boolean;                  // true면 탭 바 대신 화면 소유 하단 도크
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RootErrorFallback, // 렌더 crash 전용 — persistence 실패는 Result 값으로 §8 복구 패널이 처리
    children: [
      { index: true,          lazy: () => import('@/pages/measure'),      handle: { title: '측정', tab: 'measure' } satisfies RouteHandle },
      { path: 'motors',       lazy: () => import('@/pages/motors'),       handle: { title: '이력', tab: 'motors' } satisfies RouteHandle },
      { path: 'motors/:id',   lazy: () => import('@/pages/motor-detail'), handle: { title: '모터 상세', tab: 'motors' } satisfies RouteHandle },
      { path: 'record/new',   lazy: () => import('@/pages/record-new'),   handle: { title: '기록 입력', hideTabBar: true } satisfies RouteHandle },
      { path: 'guide',        lazy: () => import('@/pages/guide'),        handle: { title: '가이드', tab: 'guide' } satisfies RouteHandle },
      { path: '*',            lazy: () => import('@/pages/not-found'),    handle: { title: '페이지를 찾을 수 없음' } satisfies RouteHandle },
    ],
  },
]);
```

```tsx
// src/app/App.tsx — RouterProvider는 반드시 react-router/dom에서
import { RouterProvider } from 'react-router/dom';
import { router } from '@/app/routes/router';

export function App() {
  return <RouterProvider router={router} />; // Providers(query/theme/persistence)로 감싸는 구성은 app/providers 소관
}
```

```tsx
// src/app/layouts/RootLayout.tsx — 구조 계약 (스타일·훅 상세는 구현 재량)
import { Outlet, ScrollRestoration, useMatches } from 'react-router';

export function RootLayout() {
  const handle = /* useMatches() 마지막 match의 handle as RouteHandle */;
  return (
    <>
      <a className="skip-link" href="#main">본문으로 건너뛰기</a>
      <GlobalPersistenceBanner />           {/* 'ready'면 null — §8 */}
      {/* header는 각 페이지가 소유 (S1은 상태 라벨 존이 겸함) */}
      <main id="main"><Outlet /></main>
      {!handle?.hideTabBar && <BottomTabBar active={handle?.tab} />}
      <ScrollRestoration />
    </>
  );
}
```

각 페이지 모듈은 lazy route 규약으로 `Component`를 named export 한다: `export { MeasurePage as Component }`.

### 2.4 페이지 파일 맵 (route-builder 생성 대상)

| 파일 | 역할 |
|---|---|
| `src/app/routes/router.tsx` | §2.3 라우터 정의 + `RouteHandle` 타입 |
| `src/app/layouts/RootLayout.tsx` | skip link · 전역 배너 · Outlet · 탭 바 · ScrollRestoration · title 동기화 |
| `src/app/layouts/RootErrorFallback.tsx` | 렌더 crash 전용 패널 ([새로고침]) |
| `src/app/ui/GlobalPersistenceBanner.tsx` | §8 전역 배너 (unavailable/corrupt) |
| `src/pages/measure/index.ts` + `ui/MeasurePage.tsx` | S1 조립 — `features/measure-session` + `shared/ui` BigNumber/StatusLabel |
| `src/pages/record-new/index.ts` + `ui/RecordNewPage.tsx` | S2 조립 — `features/record-entry` + `entities/measurement` take |
| `src/pages/motors/index.ts` + `ui/MotorsPage.tsx` | S3 조립 — `features/motor-management` 시트 오케스트레이션 포함 |
| `src/pages/motor-detail/index.ts` + `ui/MotorDetailPage.tsx` | S4 조립 — in-place not-found 상태 포함 |
| `src/pages/guide/index.ts` + `ui/GuidePage.tsx` | S5 조립 — `features/voltage-guide` |
| `src/pages/not-found/index.ts` + `ui/NotFoundPage.tsx` | §2.5 |

### 2.5 Not-found / 403 / HTTP status

- **클라이언트 404** (`*`): 탭 바 유지(활성 탭 없음), 본문 = h1 "페이지를 찾을 수 없습니다" + [측정으로 이동] primary. `/motors/:id` 미존재 id는 라우트 404가 아니라 **화면 내 not-found 상태**(§2.2).
- **403 / 인증 route**: 해당 없음 — 로그인·계정 없음(capabilities `base`).
- **HTTP status**: static-cdn SPA fallback rewrite로 모든 경로가 200 + `index.html`. 서버 404/redirect 없음. 개인 도구이므로 `<meta name="robots" content="noindex">`를 `index.html`에 포함(공개 CDN 배포 대비).

---

## 3. 화면 공통 규격

| 규격 | 값 |
|---|---|
| 화면 헤더 [H] | h 56px. 스택 화면: `[← 뒤로 44px] [h1 title flex-1 truncate] [액션 버튼들]`. 탭 화면: `[h1] [액션 버튼들]` |
| 본문 좌우 패딩 | 16px (320px 뷰포트 기준 콘텐츠 폭 288px 확보) |
| 목록 행 | min-height 56px, 행 전체가 탭 타깃. 행 내 보조 버튼(삭제 등)은 44×44 독립 타깃 + 행 탭과 중첩 금지 |
| primary 버튼 | full-width h 56px. secondary h 44px |
| 토스트 | 하단 탭 바 위 (Snackbar) — 탭 바·도크와 겹치지 않게 offset |

---

## 4. S1 측정 (`/`) — Layout Stability 계약 (최중요)

### 4.1 3단 골격 — 상태 6종 전부 동일, 내용만 교체

```
┌────────────────────────────────────┐
│ [G] 전역 배너 슬롯 (조건부)           │  ← 유일하게 높이 가변이 허용되는 요소: 부팅 시 1회 결정,
├────────────────────────────────────┤     측정 상태 전환으로는 절대 나타나거나 사라지지 않음
│ [Z1] 상태 라벨 존       h = 48px 고정 │  ← StatusLabel: 아이콘+텍스트(+펄스 점), role=status
│      ● 측정 중                       │     + visually-hidden aria-live="polite" 알림 영역
├────────────────────────────────────┤
│ [Z2] 수치 존   h = var(--s1-figure-h)│  ← 높이 고정. 내부 5행 슬롯:
│                                    │     ① RPM 대형 수치  clamp(56px,18vw,96px), 1줄
│           18,540                   │     ② 단위 라벨 "RPM"
│             RPM                    │     ③ 파노 보조 수치 "309.0 Hz"
│           309.0 Hz                 │     ④⑤ 보조 텍스트 2줄 슬롯 (없으면 빈 줄 유지)
│      (보조 텍스트 2줄 슬롯)           │
├────────────────────────────────────┤
│ [Z3] 액션 존            h 고정       │
│  [A] 행동 슬롯  h 56px  (primary 위치)│  ← 상태의 유일 행동. 빈 상태여도 높이 예약
│  [B] 세션 슬롯  h 44px  (secondary)  │  ← stable의 [다시 측정] 전용. 평시 빈 슬롯(높이 예약)
├────────────────────────────────────┤
│ [N] 하단 탭 (56px + safe-area)       │
└────────────────────────────────────┘
```

**높이 계약**
- `--s1-figure-h` = Z2 최대 구성(수치 3행 + 보조 2행 + gap) 기준으로 산출한 **단일 CSS 커스텀 프로퍼티**. `height`(min/max 동일)로 적용. 재계산은 뷰포트 resize/회전 시에만 — **상태 전환으로는 절대 불변**. baseline: `calc(clamp(3.5rem, 18vw, 6rem) * 1.1 + 1.5rem + 2rem + 2 * 1.5rem + 3 * 0.5rem)` ≈ 320px 뷰포트에서 약 244px (토큰화는 design-system 소관).
- Z1(48px) · Z3(56+12+44 = 112px) · [N]도 고정. 세 존 사이 여백은 flex spacer 고정 비율(위 1 : 아래 1) — 상태와 무관.
- 결과: **상태 6종 어느 전환에서도 화면의 어떤 요소도 이동하지 않는다.** 바뀌는 것은 각 존 내부의 텍스트/버튼 내용과 색뿐 (ux-brief 원칙 6, REQ-NFR-003).

### 4.2 상태 6종 × 존 내용 매핑 (골격 불변 — 이 표가 유일한 가변 요소)

| status | Z1 상태 라벨 (고정 h) | Z2 수치 존 (고정 h) | Z3-[A] 행동 슬롯 | Z3-[B] 세션 슬롯 |
|---|---|---|---|---|
| `idle` | "측정 대기" | 수치 없음 — 안내 1줄 수직 중앙: "모터를 공회전시키고 폰을 가까이 대세요" | **[녹음 활성화]** primary (마이크 아이콘+텍스트) | (빈 슬롯 — 높이 예약) |
| `idle` + 비HTTPS | "측정 대기" | 안내 교체: "HTTPS에서만 측정할 수 있습니다" (권한 문구와 혼용 금지 — REQ-ST-002) | [녹음 활성화] **disabled** | (빈 슬롯) |
| `idle` → 활성화 탭 직후 (loading) | "측정 대기" | 안내 유지 | [마이크 준비 중…] disabled (<1 s) | (빈 슬롯) |
| `measuring` | "● 측정 중" (펄스 점) | ①18,540(중간 명도) ②RPM ③309.0 Hz — 실시간 갱신. ④⑤ 빈 줄 유지 | [측정 중지] (secondary 스타일이지만 슬롯 [A] 점유 — 상태의 유일 행동) | (빈 슬롯) |
| `stable` | "🔒 측정 완료 · 확정" | 확정 수치 잠금 — 고대비 강조 + 배경 톤 전환 1회, 이후 갱신 없음 | **[이 측정으로 기록 만들기]** primary | **[다시 측정]** |
| `weak-signal` | "신호 약함" | ① "—" (동일 대형 타이포 행 — 높이 동일) ②③ 빈 값 유지 ④ "신호가 약합니다. 모터에 더 가까이 대세요" | [측정 중지] (measuring과 동일 위치·동일 버튼 — 자동 왕복 D-9에서 버튼 불변) | (빈 슬롯) |
| `no-permission` (일시) | "마이크 권한 필요" | "마이크 권한이 거부되었습니다" | **[권한 다시 요청]** primary | (빈 슬롯) |
| `no-permission` (영구) | "마이크 권한 필요" | "브라우저 설정에서 마이크 권한을 허용해야 합니다" + 설정 경로 접기/펼치기 — **펼침 콘텐츠는 Z2 내부 스크롤로 수용, Z2 높이 불변** | **[설정 방법 보기]** (= 펼치기 토글) | (빈 슬롯) |
| `suspended` | "오디오 일시 중지됨" | "iOS 정책으로 오디오가 중지되었습니다" | **[탭하여 다시 시작]** primary (탭 핸들러 내 `resume()`) | (빈 슬롯) |

### 4.3 stable 전환 시 CTA 등장 규칙 (기존 요소를 밀지 않는 방식)

1. **[A] 슬롯 내용 교체**: [측정 중지] → [이 측정으로 기록 만들기]. 슬롯 위치·크기 불변 — 아무것도 밀리지 않는다.
2. **[B] 슬롯 채움**: 모든 상태에서 44px 높이가 예약된 빈 슬롯에 [다시 측정]이 나타난다 — 등장이 레이아웃을 바꾸지 않는다.
3. UX-A1: stable 진입과 동시에 캡처 자동 정지 — [측정 중지]의 의도는 시스템이 이미 수행했으므로 [A] 교체 직후 오탭 피해가 없다(최악: S2 진입 후 뒤로가기). 오탭 가드(전환 직후 짧은 입력 무시)는 component-designer 검토 항목(LO-3, §10).
4. Z1 라벨·Z2 색/잠금 아이콘·aria-live("측정 완료, 18,540 RPM")가 동시 전환 — 3중 구분(ux-brief §5).

### 4.4 S1 세션 수명 × 레이아웃

- measuring/weak-signal 중 **탭 전환·라우트 이탈·백그라운드** → 세션 종료, 복귀 시 idle 골격 (UX-A2). "측정이 중단되었다"는 별도 화면 없음 — idle이 그 상태다.
- stable에서 CTA 탭 → `/record/new` push. S1은 스택에 stable 화면 그대로 유지(뒤로가기 시 확정값 재표시 — 단 handoff slot 소비 여부는 state-contract 소관, S2는 빈 slot이면 직접 입력 모드로 렌더하므로 레이아웃 파손 없음).

---

## 5. S2 기록 입력 (`/record/new`)

```
┌────────────────────────────────────┐
│ [H] [←] 기록 입력 (h1)               │  ← 탭 바 없음 (handle.hideTabBar)
├────────────────────────────────────┤
│ [M] 폼 — 세로 스크롤, 5항목 고정 순서   │
│                                    │
│ 1 모터 선택 (필수) — 라디오, 최근 사용순 │  ← 모터 0개: 이 자리에 인라인 카드
│   ◉ 모터 A   신품                    │     "등록된 모터가 없습니다" + [모터 등록]
│   ○ 모터 B   전성기                  │     → 등록 시트(§7.1) → 저장 시 즉시 반영+자동 선택
│                                    │
│ 2 측정값 카드                        │  ← 두 모드, 카드 외형·높이 동일(내용만 교체):
│   ┌ 측정값 (읽기전용) ──── [비우기] ┐  │     (a) 자동 채움: RPM·파노 읽기전용 + [비우기]만
│   │ 18,540 RPM · 309.0 Hz        │  │     (b) "측정값 없음 (직접 입력 기록)" — D2
│   └──────────────────────────────┘  │     수동 수정 UI 없음 (UX-A3)
│                                    │
│ 3 세팅 전압 (필수)                    │
│   [−0.1]   [ 2.8 ] V   [+0.1]      │  ← inputmode="decimal", 범위 0.1~9.9 (A5)
│   (인라인 필드 오류 슬롯)              │     범위 밖·비수치 → 인라인 오류, 저장 거부
│                                    │
│ 4 주행 결과 (필수) — 세그먼트 3택       │
│   [ 완주 ][ 코스아웃 ][ 미주행 ]       │  ← D4 baseline, 라벨은 shared/config 맵
│                                    │
│ 5 [ ] 이 세팅에 만족 — 단일 토글        │
├────────────────────────────────────┤
│ [D] 하단 고정 도크 (+safe-area)       │
│   (오류 배너 슬롯 — 저장 실패 시)       │  ← 배너가 도크 위에 나타남: "저장 실패 — 공간 부족"
│   [ 저장 ] primary h56              │     + 입력값 전부 유지 (REQ-ST-005)
└────────────────────────────────────┘
```

- 진입 2경로 + 새로고침 모두 **동일 레이아웃** — 측정값 카드 내용만 (a)/(b) 교체. weak-signal·미측정 값은 절대 채우지 않음(H-5).
- [저장] 탭 즉시 disabled + "저장 중…" (H-4 중복 탭 방지). 실패 시 도크 내 오류 배너(`role="alert"`) + 버튼 재활성 = [다시 저장]. 성공 시 pop + 토스트 "저장됨".
- 모터 미선택 저장 시도 → 항목 1에 인라인 오류 + 해당 라디오 그룹으로 focus 이동.
- private 모드(unavailable): 전역 배너(§8)가 이미 상단 고지 — S2 자체 레이아웃 변화 없음, 저장 실패 계약이 커버.
- Focus order: [←] → 모터 라디오 → 측정값 카드 [비우기] → 전압 스테퍼(− → input → +) → 결과 세그먼트 → 만족 토글 → [저장].

---

## 6. S3 이력 (`/motors`) · S4 모터 상세 (`/motors/:id`)

### 6.1 S3 모터 목록

```
┌────────────────────────────────────┐
│ [H] 이력 (h1)      [+ 모터] [+ 기록]  │  ← 헤더 우측 컴팩트 버튼 2 (각 h44)
├────────────────────────────────────┤
│ [M] 모터 카드 목록 (최근 사용순 FP-A1)  │
│ ┌──────────────────────────────┐    │
│ │ 모터 A            [전성기]     │    │  ← 행 1: 이름 + 등급 chip(텍스트, CP-1)
│ │ 브러시 마모 의심               │    │  ← 행 2: 상태 메모 1줄 truncate (없으면 행 생략)
│ │ 기록 12건 · 최근 07-25 2.9V   │    │  ← 행 3: 기록 수 + 최근 기록 요약 (파생 계산)
│ │   18,540 RPM 완주 ★          │    │
│ └──────────────────────────────┘    │  행 전체 탭 → /motors/:id
├────────────────────────────────────┤
│ [N] 탭 (이력 활성)                    │
└────────────────────────────────────┘
```

- empty(모터 0개): 목록 자리에 빈 상태 블록 — "첫 모터를 등록하세요" + [+ 모터] primary (오류로 위장 금지, E-1). 헤더 [+ 기록]은 비활성(기록은 모터 필수).
- [+ 모터] → 등록 시트(§7.1). [+ 기록] → `/record/new` push (직접 입력 모드).

### 6.2 S4 모터 상세

```
┌────────────────────────────────────┐
│ [H] [←] 모터 A (h1, truncate) [수정][삭제] │
├────────────────────────────────────┤
│ [M]                                │
│  등급 [전성기] · 기록 12건            │  ← 요약 행 + 메모 1줄 (CP-1)
│  브러시 마모 의심                     │
│  ── h2: 기록 (visually-hidden 가능) ──│
│  ┌ 07-25 14:02            ★  [삭제]┐ │  ← 기록 행: 텍스트 1~2줄
│  │ 2.9 V · 18,540 RPM · 완주      │ │     행1: 날짜(+만족★) / 행2: 전압·측정값·결과
│  └────────────────────────────────┘ │     측정값 null이면 "측정값 없음" (D2)
│  ┌ 07-24                     [삭제]┐ │     행 우측 [삭제] 44×44 독립 타깃
│  │ 2.8 V · 측정값 없음 · 미주행     │ │     기록 행은 시간 역순, immutable — 행 탭 액션 없음
│  └────────────────────────────────┘ │
├────────────────────────────────────┤
│ [N] 탭 (이력 활성)                    │
└────────────────────────────────────┘
```

- **삭제 진입점 2곳**: ① 기록 행 [삭제] → ConfirmDialog "이 기록을 삭제할까요?" ② 헤더 [삭제] → cascade ConfirmDialog "'{모터명}'과 기록 {n}건이 함께 삭제됩니다. 되돌릴 수 없습니다." (n = `countRecordsByMotor` 실측, CP-3). destructive 스타일 + 초기 포커스 [취소] + 닫힘 후 트리거 복귀.
- 모터 삭제 확정 → `/motors` replace.
- [수정] → 등록/수정 시트(§7.1, 기존 값 채움).
- empty(기록 0건): 기록 목록 자리에 "아직 기록 없음" 텍스트 블록 (진입 버튼 추가 여부는 LO-4, §10).
- in-place not-found(§2.2): 헤더는 [←]+"모터 상세"로 유지, 본문 전체가 not-found 블록.

---

## 7. S5 전압 가이드 (`/guide`) + 오버레이 2

### 7.1 오버레이 — 모터 등록/수정 시트 (라우트 없음, S3/S4/S2 인라인에서 호출)

```
╭────────────────────────────────────╮  ← BottomSheet(Drawer anchor=bottom), aria-modal
│  모터 등록 (h2)                      │     focus trap, 닫힘 후 트리거로 focus 복귀
│  이름 (필수)     [______________]    │  ← 미입력 저장 → 인라인 오류 (C-7)
│  상태 등급 (선택) — 세그먼트 4택       │  ← CP-1/CP-1a: 신품·길들이기중·전성기·노화
│   [ 신품 ][ 길들이기중 ]              │     320px에서 2×2 wrap 허용 (각 타깃 h44 유지)
│   [ 전성기 ][ 노화 ]                 │     미선택 허용·기본값은 state-contract 소관
│  상태 메모 (선택) [______________]    │  ← 자유 텍스트 1줄 (CP-1 병행)
│  [ 저장 ] primary   [ 취소 ]         │
│  (+ safe-area-inset-bottom)         │
╰────────────────────────────────────╯
```

### 7.2 오버레이 — ConfirmDialog (destructive 공용)

- 용도 3종: 기록 삭제 / 모터 cascade 삭제(건수 고지) / **resetAllData**(§8 — "모든 모터와 기록이 삭제되며 되돌릴 수 없습니다", F-1).
- 레이아웃: 중앙 모달, 메시지 + [취소](초기 포커스) + [삭제/초기화](destructive). focus trap + ESC 닫기 + 닫힘 후 트리거 복귀. 상세 계약은 component-designer.

### 7.3 S5 가이드

```
┌────────────────────────────────────┐
│ [H] 가이드 (h1)                      │
├────────────────────────────────────┤
│ [M]                                │
│  모터 선택 — 라디오, 최근 사용순        │  ← S2와 동일 패턴 공유
│  ◉ 모터 A   ○ 모터 B                │
│  ─────────────────────────────      │
│  ▼ 선택 후, 만족 기록 ≥3건 (normal):   │
│  h2: 추천 세팅 전압                   │
│      추천 2.8 ~ 3.0 V               │  ← 대형 수치 텍스트 (S1 다음 크기 위계)
│  (분산 큼 보조 문구 슬롯 — 폭 ≥0.5 V:   │
│   "기록 간 전압 편차가 큽니다 —         │
│    근거 기록을 확인하세요")             │
│  h2: 근거                            │
│   만족 기록 6건 기준                  │
│   2.8V ×2 · 2.9V ×1 · 3.0V ×3      │  ← 분포는 텍스트 (시각화 금지)
│   (근거 기록 목록 — S4 행 포맷 재사용)   │
│                                    │
│  ▼ 만족 기록 <3건 (insufficient):     │
│   추천 미표시. "기록 부족 — 만족 기록    │
│   2건 더 필요합니다 (1/3)"             │
│   [측정하러 가기] → 탭 ① 전환          │
│                                    │
│  ▼ 모터 0개: 등록 유도 블록            │
│   "먼저 모터를 등록하세요"             │
│   [이력으로 이동] → /motors           │
├────────────────────────────────────┤
│ [N] 탭 (가이드 활성)                  │
└────────────────────────────────────┘
```

- 분산 문구·근거 블록은 선택 시 1회 계산되어 렌더 — S1 같은 높이 고정 계약 없음(빠른 상태 왕복이 없는 화면). **높이 고정 계약은 S1 전용**임을 명시한다.
- 로컬 계산은 순간(스피너 불요) — loading 상태 시각 요소 없음.

---

## 8. 전역 배너 · 복구 UI (persistence 3-상태 — F4/F9, plan-review F-1)

`initPersistence` 결과에 따라 앱 프레임 [G] 슬롯과 데이터 화면 본문이 결정된다. **부팅 시 1회 결정 — 측정 상태 전환과 무관하므로 S1 layout stability를 침해하지 않는다.**

| persistence 상태 | [G] 전역 배너 (전 화면 sticky top) | 데이터 화면(S3/S4/S5) 본문 | S1/S2 영향 |
|---|---|---|---|
| `ready` | 없음 (슬롯 미렌더) | 정상 | 없음 |
| `unavailable` (private 모드 등) | `role="status"` 정보 톤: "이 브라우저에서는 기록이 저장되지 않습니다 (측정은 가능)" — 비해제 고정 | 목록 조회 불가 → 각 화면 빈 상태가 아닌 **불가 안내 블록** "저장소를 사용할 수 없습니다" | S1 측정 전 기능 정상. S2 저장 실패는 REQ-ST-005 계약이 커버(사전 고지 = 이 배너) |
| `corrupt` (rehydrate 실패) | 오류 톤: "저장된 데이터를 읽을 수 없습니다" + [복구 옵션] 링크 → `/motors`로 이동 | 본문 전체를 **복구 패널**로 대체 (아래) | S1 측정 정상. S1 stable CTA → S2 진입은 허용하되 저장 실패 계약으로 수렴 |

**복구 패널** (S3/S4/S5 본문 대체 — crash loop 금지, ErrorBoundary 경유 아님):

```
┌──────────────────────────────────┐
│  h2: 데이터를 읽을 수 없습니다        │
│  "앱은 계속 사용할 수 있지만 저장된    │
│   기록에 접근할 수 없습니다."         │
│  [ 다시 시도 ]  ← initPersistence 재시도 (primary)
│  [ 모든 데이터 초기화 ]  ← destructive 스타일 secondary
│      └→ ConfirmDialog (§7.2, F-1 계약):
│         "모든 모터와 기록이 삭제되며 되돌릴 수 없습니다"
│         초기 포커스=[취소] → 확인 시 resetAllData → 성공 시 ready로 전환 + 토스트
└──────────────────────────────────┘
```

- **resetAllData 진입점은 이 복구 패널이 유일하다** — 설정 화면 없음, 숨은 삭제 경로 노출 최소화(F-1). confirm 계약 상세(문구·pre/postcondition)는 state-contract 위임 ④ + component-designer ConfirmDialog 계약.
- 일반 읽기 실패(D-10, corrupt 아님): 배너 없이 해당 화면 목록 영역만 오류 블록 "기록을 불러오지 못했습니다" + [다시 시도](명시 `refetch`). 빈 목록 위장 금지.

---

## 9. 화면 × 상태 레이아웃 차이 표 (ux-brief §6 matrix의 레이아웃 해석 — 전 셀)

| 화면 | normal | empty | loading | error/partial | permission/destructive |
|---|---|---|---|---|---|
| **S1 측정** | measuring/stable — §4.2 표. 골격 3단 불변, 존 내용만 교체 | idle — Z2에 안내 1줄, [A]=[녹음 활성화]. 골격 동일 | 활성화 탭 직후 [A] 버튼만 "마이크 준비 중…" disabled (<1 s) — 다른 존 불변 | weak-signal — Z2 "—"+보조문구, [A]=[측정 중지] / suspended — Z2 문구, [A]=[다시 시작]. 골격 불변 | no-permission 일시/영구 — Z2 문구 분리, [A] 버튼 분리 / 비HTTPS — idle 변형(버튼 disabled). destructive 없음 |
| **S2 기록 입력** | 5항목 폼 + 측정값 카드(a) 자동 채움 | 측정값 카드(b) "측정값 없음" — 카드 외형 동일 / 모터 0개 — 항목 1 자리 인라인 등록 유도 카드 | [저장] disabled "저장 중…" — 폼 불변 | 저장 실패 — 도크 위 오류 배너 등장(폼·입력 유지, 유일한 높이 변화 지점은 도크) / unavailable — 전역 배너만 | destructive 없음 (사전 고지 = 전역 배너) |
| **S3 모터 목록** | 카드 목록 | 목록 자리 빈 상태 블록 + [+ 모터], 헤더 [+ 기록] 비활성 | 목록 영역 중앙 스피너(순간) — 헤더 불변 | 읽기 실패(D-10) — 목록 영역 오류 블록 + [다시 시도] / corrupt — 본문 = 복구 패널(§8) | 모터 cascade confirm (건수 고지) |
| **S4 모터 상세** | 요약 행 + 기록 행 목록 | 기록 0건 — 목록 자리 "아직 기록 없음" 텍스트 | 동일 스피너(순간) | 읽기 실패 — 오류 블록 + [다시 시도] / id 미존재 — 본문 = in-place not-found / corrupt — 복구 패널 | 기록 삭제 confirm / 모터 cascade confirm |
| **S5 가이드** | 모터 선택 + 추천 대형 수치 + 근거 블록 | 모터 0개 — 등록 유도 + [이력으로 이동] / 만족 <3건 — 추천 자리에 "n건 더 필요 (n/3)" + [측정하러 가기] | 시각 요소 없음(로컬 계산 순간) | 분산 큼 — 추천 아래 보조 문구 1줄 추가 / corrupt — 복구 패널 | — |
| **전역** | — | — | 부팅 중 짧은 빈 프레임 허용(스플래시 없음) | unavailable/corrupt 배너(§8) — 부팅 시 1회 결정 | resetAllData confirm(§8) / 렌더 crash — RootErrorFallback |

---

## 10. 반응형 · reflow · 접근성 레이아웃 계약

- **320 CSS px / 400% zoom reflow**: 전 화면 단일 컬럼 — 가로 스크롤 0. 등급 세그먼트 4택만 2×2 wrap(§7.1). RPM 타이포는 320px에서 clamp 하한 56px로 수렴. 헤더 액션은 truncate+아이콘 유지로 흡수.
- **200% text resize**: 고정 높이 존(S1 Z1/Z2/Z3, 헤더, 탭)은 전부 **rem 기반** — 텍스트 확대 시 존이 비례 확장. 세로 오버플로 시 화면 전체 세로 스크롤로 수용, 골격 순서 불변. px 하드코딩 금지(수치는 위 baseline을 rem 환산해 토큰화 — design-system 소관).
- **가로 회전**: 동일 레이아웃. clamp 상한 96px가 수치 크기를 캡. 세로 공간 부족 시 main 스크롤(S1 3단 골격 순서 유지).
- **키보드/포커스**: §1 focus order + 화면별 명시(§5). 오버레이는 focus trap + 트리거 복귀. 상태 전이 알림은 S1 Z1의 aria-live polite 단일 채널(중복 알림 금지).
- **모션**: S1 stable 배경 톤 전환·펄스 점은 `prefers-reduced-motion` 시 정적 표현으로 대체(라벨+아이콘이 이미 3중 구분을 보장).

---

## 11. 미결·Handoff (신규 LO 계열 — 임의 확정 아님, baseline 명시)

| ID | 내용 | Baseline | Owner / 시한 |
|---|---|---|---|
| LO-1 | `/guide` 초기 모터 선택 (미선택 시작 vs 최근 사용 자동 선택) | **미선택 시작** — 명시 선택 원칙, 잘못된 모터 추천 오독 방지 | component-designer 검토, Phase 3 전 |
| LO-2 | S2 이탈(뒤로가기) 시 confirm 여부 | **confirm 없음** — 폼 5항목이 짧아 재입력 비용 낮음, 심플 원칙 | 사용자 검토 시 확인, Phase 3 전 |
| LO-3 | stable 전환 직후 [A] 슬롯 오탭 가드(짧은 입력 무시) 필요 여부 | **가드 없음** — UX-A1(자동 정지)로 오탭 피해가 뒤로가기 1회 수준 | component-designer, Phase 3 전 |
| LO-4 | S4 기록 0건 empty에 [+ 기록] 진입점(모터 사전 선택 `?motorId=`) 추가 여부 | **추가 안 함** — ux-brief §6 원문 유지, 라우트 파라미터 증가 회피 | 사용자 검토 시, Phase 3 전 |
| 승계 | 등급 세그먼트 기본값·미선택 허용(CP-1a), resetAllData pre/postcondition(F-1), 권한 일시/영구 감지 전략(F-2)은 각각 state-contract·component wave 소관 — 본 문서는 레이아웃 자리만 확정 | — | state-contract / component |
