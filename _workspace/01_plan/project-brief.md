# Project Brief — minicar-motor-lab

> Phase 1 Wave 5 최종 종합. Phase 2 디자인 팀(design-system-architect · layout-designer · component-designer · state-contract-designer)의 **단일 입력 문서**.
> 입력: `planning-context.md`(W0) · `decision-log.md`(DL-001~006) · `analysis-algorithm.md` v2(측정 canonical) · `requirements.md`(W1) · `ux-brief.md`(W2) · `feature-plan.md`(W3) · `tech-stack.md`(W4) — 모두 `_workspace/01_plan/`.
> Canonical 참조 규칙: 측정 수치·상태·fixture = **analysis-algorithm.md v2** / 화면·상태 시각 계약 = **ux-brief.md** / slice·command·데이터 모델 = **feature-plan.md** / 버전·아키텍처 결정 = **tech-stack.md**. 본 문서와 원본이 다르면 원본이 이긴다(본 문서는 요약·연결·미결 대장 담당).

## 한 줄 요약

스마트폰 마이크만으로 미니카 130 브러시드 3극 모터의 공회전 RPM·파노(f₀ Hz)를 측정·기록하고, 축적된 '만족' 주행 기록의 전압 분포로 다음 주행의 배터리 전압 세팅을 추천하는 **서버 없는 개인용 모바일 웹 도구** (IndexedDB 영속, 수치만 표시하는 심플 UI).

## 프로젝트 Identity & Modes (확정 — 변경 금지)

| 항목 | 값 |
|---|---|
| 프로젝트 이름 / 위치 | `minicar-motor-lab` / `workspace/minicar-motor-lab` (pnpm workspace + `apps/minicar-motor-lab-web` 단일 앱, AD-14) |
| REQUEST_TYPE / WEB_PROFILE | greenfield-service / `react-vite-spa` |
| Architecture / 배포 | `internal-spa` CSR / `static-cdn` (provider는 TS-D1 미결), **HTTPS 필수**, SPA fallback rewrite |
| LOCAL_DOMAIN_STATE_MODE | **true** — IndexedDB가 유일한 authoritative store |
| TIMESERIES / ANALYTICS_BUILDER / AI / EXTERNAL_DATA_INGESTION | 전부 **false** — 시계열 SLO·ingestion 계약·차트 renderer 결정 자체가 해당 없음 (시각화는 Won't) |
| 서버·HTTP API | **없음** — REST 대신 도메인 command/query(§Traceability, §state-contract 입력). axios·fetch 호출 0건 |
| MSW | **미도입 확정** (AD-10) — HTTP 경계가 없어 handler 0건. mock 경계는 합성 신호 fixture + fake-indexeddb seed |
| capabilities | `base`만 (auth/cookie/BFF/server-mutation/external-ingestion 미선택 — 해당 REQ 없음) |
| 사용자/인증 | 단일 사용자 개인 도구, 로그인 없음, 계정·공유·동기화 없음 (A3) |

## Product Frame & Current Planning Memo

- **끝내려는 업무**: 모터 컨디션을 측정·기록하고, 만족 기록을 근거로 다음 주행의 전압 세팅을 판단한다.
- **현재 pain**: 전압 세팅을 감으로 함(근거 없음) / 모터 상태(길들이기·마모) 추적 수단 없음(광학 타코미터 없음).
- **측정 방식 (DL-001, v2 canonical)**: 마이크 소음 → 대역통과·데시메이션 → pYIN 후보(÷3·÷6 확장) → 1·3·6차 고조파 점수 → VP 정밀 추정 → 일치도 검사 → 신뢰 게이트 → Viterbi+Kalman 추적 → 안정 판정. 파노 = f₀(Hz, 소수 1자리), RPM = f₀×60(정수). 핵심 위험 = 정류 성분 3f₀/6f₀ 오판 — 파이프라인 전체가 이 모호성 해소 중심.
- **관찰 가능한 성공 조건**: ① 측정 시작→확정 3 s 이내 수치 표시 ② 동일 조건 반복 측정 시 일관 대역 수렴(상대 비교 신뢰성 — 절대 정확도 아님) ③ 측정→기록이 한 흐름 + IndexedDB 영속 ④ 만족 기록 쌓인 모터의 추천 전압 범위·근거 확인.
- **Scope**: Must = 마이크 활성화 흐름 / 측정→수치 표시 / 모터 CRUD / 기록 저장 / 추천 전압 범위 / 측정 실패 피드백. Should = 측정값 자동 채움, 근거 노출, 모터별 이력. **Won't** = 주행 중 측정 · 서버/계정/동기화 · export/import · 차트/스펙트럼/파형 시각화(수치만) · AI 추천 · 절대 정확도 보장 · 전압 자동 측정(수동 입력만).
- **Planning memo**: 요구·기술 제약 확정(HTTPS, iOS 제스처, 3극 모터 대역). 빠졌던 시나리오(권한/suspended/소음/배음/IndexedDB 실패/기록 부족/cascade)는 전부 REQ-ST-001~007로 승격 완료. 가정 A1~A7 + UX-A/FP-A/TS-A 계열은 미결 대장 참조. 상대 노력도 M / split 권고.

## UX Risks & Critical States

**측정 상태 계약 (canonical — v2 §1, 전 팀 공통 enum)**: `idle · measuring · stable · weak-signal · no-permission · suspended`
- `measuring·stable·weak-signal`은 분석 엔진(track)이 산출, `idle·no-permission·suspended`는 측정 세션 상태 머신이 소유. 타입 `MeasureStatus`는 shared 단일 정의.
- **신뢰 게이트**: 고조파 SNR ≥ 8 dB & 검출 고조파 ≥ 2 & pYIN voicing 임계. 미달 시 **수치 미표시 + `weak-signal`** — 무음·피크 미검출·저신호 전부 여기로 수렴. `weak-signal`이면 f0/rpm은 타입상 null (오값·0 RPM·이전 값 표시 금지).
- **안정 판정**: 최근 1.5 s 창 변동계수 < 1.5% → 중앙값 확정 잠금(`stable`). f₀ 탐색 대역 170~620 Hz(≈10,000~37,000 RPM) — 대역 밖 쓰레기 값은 구조적으로 차단(UI 별도 경고 불요로 ux-brief에서 종결).

**핵심 UX 리스크와 차단 장치** (planning-context UX Check → ux-brief 해소):
| 리스크 | 차단 장치 |
|---|---|
| 실패 상태에서 쓰레기 값/이전 값/0 RPM을 믿게 됨 | weak-signal에서 수치 자체를 표시하지 않음("—") — 상태를 수치로 위장 금지 |
| measuring 실시간 값을 확정값으로 오인 | stable 3중 구분(라벨·색·잠금 아이콘) + [기록 만들기] CTA는 stable에서만 노출 |
| iOS AudioContext suspended를 사용자가 모름 | `state !== 'running'`이면 측정 시작 금지 + "탭하여 다시 시작" 전용 상태 |
| 권한 일시/영구 거부 혼동 | 문구·복구 버튼 분리 (다시 요청 vs 설정 안내) |
| 배음으로 RPM 3·6배 튐 | 알고리즘 계층 해소(대역 제한+고조파 점수) — UI 경고 없음 |
| 상태 전환 시 화면 튐 | 수치 영역 높이 고정 — layout shift 금지 |
| 측정값 수동 수정으로 기록 신뢰 훼손 | 자동 채움 값 읽기전용, 비우기만 허용 (UX-A3) |

**화면별 상태 matrix** (ux-brief §6 — layout-designer 필수 입력):
| 화면 | normal | empty | loading | error/partial | permission/destructive |
|---|---|---|---|---|---|
| S1 측정 | measuring 실시간 / stable 확정 잠금 | idle — "녹음 활성화" 안내(온보딩 겸용) | 활성화 직후 "마이크 준비 중…"(<1 s) | weak-signal(수치 미표시) / suspended(재개 버튼) | no-permission 일시·영구 분리 / HTTPS 불가 안내 |
| S2 기록 입력 | 자동 채움 폼 | 직접 입력 — "측정값 없음" 카드(D2) / 모터 0개 인라인 등록 유도 | 저장 중 버튼 비활성 | write 실패·quota — 입력 유지+재시도 / private 모드 배너 | — |
| S3/S4 이력 | 모터·기록 목록 | 모터 0개 등록 유도 / 기록 0건 안내 | 읽기 스피너(순간) | 읽기 실패 — 위장 금지, 오류+[다시 시도] / rehydrate 실패 — 복구 UI(crash loop 금지) | 기록 삭제 confirm / 모터 cascade confirm "기록 n건 함께 삭제" |
| S5 가이드 | 추천 범위+근거 | 모터 0개 / 만족 기록 <3건 "n건 더 필요 (n/3)" | 로컬 계산(순간) | 분산 큼 보조 문구(폭 ≥0.5 V) | — |

전역: 시작 시 IndexedDB 불가(private 모드) → 고정 배너 "기록 저장 불가 (측정은 가능)". Annotation intent: greenfield — 스크린샷 주석 없음, intake 의도는 ux-brief §10 표로 정규화 승계(수치로만·심플 / 녹음 활성화 / 측정→기록 한 흐름 / 기록이 유일 자산 → cascade 고지 / 근거 투명 추천).

## Data Review Strategy & Mock→real

- **strategy: `mock`** (DL-006). MSW 아님 — 두 fixture 축이 대체:
  1. **합성 오디오 fixture** (`shared/lib/audio-analysis/__fixtures__/synth.ts`, v2 §3 = REQ-NFR-005 수용 기준): 순음 300 Hz(오차<0.3 Hz) / 배음 지배(f₀ 채택, 3·6배 오판 금지) / 고조파 오염(6차 제외) / SNR 10 dB(오차<0.5 Hz) / SNR 0 dB(`weak-signal`) / 무음(`weak-signal`, 0 RPM 금지) / 스핀업 chirp(추적 지연<0.5 s) / 옥타브 유혹(점프 없음) + VP CRLB sanity(이론 분산 3배 이내). 기대 출력이 결정적 — Vitest 수치 assert.
  2. **IndexedDB seed** (fake-indexeddb): 모터 empty/normal/max(30) · 만족 기록 0·1·2·3건 · 전압 분산 큰 케이스 · 측정값 null 기록 · max 1,000건 · 손상/구버전 스키마 seed.
- **mock 재현 불가 → Phase 2 실기기(device) 항목**: 권한 영구 거부(D-3), iOS suspended(D-5), 실모터 공회전 피크 검출률·수치 안정성. Playwright는 fake media stream + grantPermissions로 D-1/D-2/D-4 재현, `127.0.0.1`은 secure context라 HTTPS 배포 전에도 캡처 E2E 가능.
- **Mock→real 전환**: 코드 변경 아님 — HTTPS 실기기 검증 세션(iOS Safari 우선). 조건 = 실모터 접근 + 사용자 참여(owner: 사용자). Order 2(측정 화면) 완료 후 첫 회. production 데이터·PII·mutation 위험 없음.

## Effort Trade-off

- **rough size: M** / **recommendation: split** — (1) 측정 파이프라인+측정 화면 먼저(측정 신뢰성이 무너지면 나머지 가치 없음), (2) 기록 CRUD+가이드 뒤에.
- **최대 driver**: 분석 엔진 F1 (pYIN·VP·Viterbi·Kalman zero-dependency 직접 구현 — v2 §5, 프로젝트 최대 작업 항목). 그 외: 측정 화면 상태 6종+실패 5종, iOS 플랫폼 편차. IndexedDB·가이드는 단순.
- **smallest visible review**: 측정 화면 단독 — 녹음 활성화 → 수치 표시 → stable 확정 + 실패 상태 전환(no-permission/weak-signal/suspended/HTTPS).
- **구현 순서 (feature-plan §9)**: ① F1 엔진+fixture(앱과 독립, 즉시 착수) → ② F2+F9/F10 최소분 = smallest visible review → ③ F4/F5/F7 persistence+모터 → ④ F6/F3 기록+handoff → ⑤ F8 가이드+성능·a11y 마감. ①·③·(F9/F10) 3트랙 병렬 가능.
- **production integration delta**: 서버 없음 — mock과 real의 차이는 "합성 신호 vs 실기기 실측"뿐(검증 세션이지 코드 아님).

## 확정된 화면 목록

내비게이션: **하단 탭 3 + 작업 화면 스택 push 2 + 오버레이 2** (ux-brief §3 확정 — 기록 입력은 목적지가 아닌 작업, 측정↔가이드 왕복이 핵심 여정).

| 화면 | 경로 | 진입 | 핵심 기능 | REQ |
|---|---|---|---|---|
| S1 측정 (탭 ①, 시작) | `/` | 앱 시작 | 녹음 활성화 → 실시간 파노·RPM → stable 확정 잠금 → [이 측정으로 기록 만들기]. 6-status 전환의 중심 | REQ-F-001/002/008, REQ-ST-001~004 |
| S2 기록 입력 (스택) | `/record/new` | S1 stable CTA · S3 "+기록" | 폼 5항목: 모터 선택(필수)·측정값 카드(읽기전용/없음)·전압 스테퍼(필수, A5)·주행 결과 세그먼트(필수, D4)·만족 토글 → 저장 | REQ-F-004/008, REQ-ST-005 |
| S3 이력·모터 목록 (탭 ②) | `/motors` | 탭 | 모터 카드(이름·메모·기록 수·최근 요약) + [+모터][+기록] + 빈 상태 유도 | REQ-F-003/005, REQ-ST-007 |
| S4 모터 상세·이력 (스택) | `/motors/:id` | S3 모터 탭 | 해당 모터 기록 시간 역순 텍스트 행(날짜·전압·RPM·결과·만족★) + 수정/삭제 | REQ-F-005/009, REQ-ST-007 |
| S5 전압 가이드 (탭 ③) | `/guide` | 탭 | 모터 선택 → 추천 범위 대형 수치(`추천 2.8 ~ 3.0 V`) + 분포 텍스트 + 근거 기록 / 부족 시 "n건 더 필요 (n/3)" | REQ-F-006, REQ-ST-006 |
| 모터 등록/수정 시트 | (S3/S4 bottom sheet) | [+모터]/[수정] | 이름(필수)+상태 메모(선택) — 라우트 없음 | REQ-F-003 |
| confirm 대화상자 | (모달) | 삭제 액션 | destructive 확인 + cascade 건수 고지, 초기 포커스=[취소] | REQ-ST-007 |

측정 세션 수명 규칙: stable 확정 시 캡처 자동 정지(UX-A1), measuring 중 탭 전환·백그라운드 진입 시 세션 종료(UX-A2 — 백그라운드 녹음 없음).

## Traceability — REQ ↔ 화면 ↔ Feature ↔ Slice (전수 압축)

| REQ | 화면 | Feature | Owner slice | Command/Query·핵심 계약 | Evidence |
|---|---|---|---|---|---|
| REQ-F-001 캡처 계약 | S1 | F2 측정 세션 | `features/measure-session` | `startCapture`(탭 핸들러 내 getUserMedia DSP-off+resume, 실제 sampleRate)·`resumeAudio` | D-1 browser+device |
| REQ-F-002 측정→수치 | S1 | F1 분석 엔진 (P0·L·최대 항목) | `shared/lib/audio-analysis` | 순수 함수 `estimateFrame`/`refine`/`track` | D-6/7/9 unit fixture+device |
| REQ-F-003 모터 CRUD | S3/시트 | F5 | `features/motor-management`, `entities/motor` | `createMotor`·`updateMotor`(편집 필드만) | C-1, E-1 |
| REQ-F-004 기록 입력 | S2 | F6 | `features/record-entry`, `entities/run-record` | `createRecord`(FK 동일 트랜잭션 확인, A5 재검증, D2 null 허용) | H-1~H-4 |
| REQ-F-005 목록 조회 | S3/S4 | F7 | `pages/motors`, `pages/motor-detail` | `listMotorSummaries`·`listMotors`·`getMotorById`·`listRecordsByMotor` | E-1/5/6+읽기 실패 |
| REQ-F-006 전압 가이드 | S5 | F8 | `features/voltage-guide` | `listSatisfiedRecords` + 순수 함수 `computeGuide`(D1/A6) | E-2/3/4 |
| REQ-F-007 영속·복구 | 전역 | F4 | `shared/lib/persistence` | `initPersistence`('ready'/'unavailable'/'corrupt')·`resetAllData`·`withTransaction` | C-6 |
| REQ-F-008 자동 채움 (Should) | S1→S2 | F3 | `entities/measurement` | `set/take/clearConfirmedMeasurement`(single-slot, 1회 소비) | H-5 |
| REQ-F-009 모터별 이력 (Should) | S4 | F7 부분 | `pages/motor-detail` | `listRecordsByMotor` | browser |
| REQ-F-010/011 (Could) | — | backlog | F1 옵션 객체 hook만 | — | — |
| REQ-ST-001 권한 거부/영구 | S1 | F2 | `features/measure-session` | `retryPermission` — 일시/영구 문구 분리 | D-2 browser / D-3 device |
| REQ-ST-002 비보안 컨텍스트 | S1 | F2 | 〃 | `isSecureContext` 진입 가드 — 권한 오류와 혼용 금지 | D-4 |
| REQ-ST-003 weak-signal | S1 | F1+F2 | 엔진(게이트)+세션(표시) | `track` → f0/rpm null 타입 강제 | D-8 unit+browser |
| REQ-ST-004 suspended | S1 | F2 | `features/measure-session` | `resumeAudio` — `running` 아니면 측정 금지 | D-5 device+unit 가드 |
| REQ-ST-005 IndexedDB 실패 | S2/전역 | F4+F6+F9 | persistence+record-entry+app | 실패를 Result 값으로 전파, 입력 유지+재시도, 배너/복구 UI | C-4/5/6 |
| REQ-ST-006 기록 부족 | S5 | F8 | `features/voltage-guide` | `computeGuide` → `insufficient(needed)` | E-2 |
| REQ-ST-007 삭제 destructive | S3/S4 | F5+F6+F10 | motor-management+entities+shared/ui | `deleteMotorCascade`(단일 트랜잭션)·`deleteRecord`·`countRecordsByMotor` | C-2/C-3 |
| REQ-NFR-001/005 성능·품질 | S1·목록 | F1 | audio-analysis, pages | 1코어<20%·UI≥10 Hz·확정≤3 s·p95<200 ms / fixture 8종+CRLB | fixture+E-5+device |
| REQ-NFR-002 반응형 | 전 화면 | F9 | `app/` | 모바일 세로 기준, max-width ~480px 중앙 | reflow-320 |
| REQ-NFR-003 접근성 | 전 화면 | F10 | `shared/ui` | WCAG 2.2 AA, aria-live, focus trap/복귀, 44×44px | F-1 axe |
| REQ-NFR-004 브라우저 | — | — | — | iOS Safari(최신+직전) 우선, Android Chrome 최신 | CI+device |
| REQ-NFR-006 데이터 안전 | 전역 | F4 | persistence | version 필드·migration·recovery, zod rehydrate 검증 | C-6 |

## 확정된 기술 스택

Node **22.22.3** · pnpm **11.13.0** · TypeScript **6.0.0** · React **19.2.7** · Vite **8.1.4** — templates.md 2026-07 certified 기준선 (support level: certified).

| 영역 | 선택 | 근거 (AD) |
|---|---|---|
| 라우팅 | react-router **8.2.0** `createBrowserRouter` (단일 패키지 — `react-router-dom` 불요) | AD-3 |
| 비동기 query | @tanstack/react-query **5.90.0** — IndexedDB 읽기+명시 invalidation. **정책 필수**: `networkMode:'always'` / `staleTime:Infinity`+mutation 후 invalidate / `retry:false`(재시도는 명시 `refetch` 버튼) | AD-4/4a |
| 클라이언트 상태 | zustand **5.0.11** — measure-session feature-scope store(순수 전이 함수+가드 unit). 고빈도 f₀ 프레임은 전역·영속 store 금지 | AD-5 |
| IndexedDB | idb **8.0.0** (typed DBSchema+upgrade 콜백, ~1KB) | AD-6 |
| 런타임 검증 | zod **4.3.0** — rehydrate/env/command precondition/UI 인라인 동일 스키마 | AD-7 |
| UI/스타일 | @mui/material **7.3.0** + Emotion 11.14.x, **최소 theme**. Dialog/Snackbar/Drawer/ToggleButtonGroup/BottomNavigation이 F10 킷과 1:1 | AD-8 |
| 테스트 | Vitest **4.1.0**(projects: 엔진=node env, 컴포넌트=jsdom) + Testing Library + fake-indexeddb **6.0.0** + Playwright **1.61.0** + @axe-core/playwright | AD-9 |
| Worker | Vite 네이티브 `new Worker(new URL(...))` + transferable Float32Array — SAB/COOP/COEP 불요(호스팅 자유도 확보) | AD-11 |
| 분석 엔진 | **zero-dependency 순수 TS 직접 구현**(FFT·IIR·pYIN·VP·Viterbi·Kalman) — ESLint restricted import로 DOM 접근 0건 강제 | AD-12 |
| PWA | manifest+아이콘만, SW 없음, `display: browser\|minimal-ui` | AD-13 (TS-A2) |
| 에러 경계 | react-error-boundary **6.0.0** (crash loop 금지) | — |

- 템플릿 외 신규 패키지는 **idb, fake-indexeddb 2개뿐** (knowledge pin — lockfile operation에서 실재·integrity 검증, major 변경 금지).
- **미설치 확정**: msw, axios, react-hook-form(+resolvers), date-fns(→`Intl.DateTimeFormat('ko-KR')`), uuid(→`crypto.randomUUID()`), fft.js/dsp.js/meyda, comlink, dexie, redux-toolkit/XState, 차트 전부, vite-plugin-pwa/workbox, @mui/icons-material(→개별 SVG+svgr), web-vitals.
- env: `VITE_PHASE`, `VITE_APP_TITLE` 2개뿐 — project-init의 `VITE_API_URL`은 SHARED_CONFIG 스키마·`vite-env.d.ts`에서 **제거**(잔존 시 env 검증이 부팅 차단). TEST_SETUP·MAIN_TSX 템플릿의 MSW lifecycle도 제거. secrets 0건.
- 배포: build `tsc -b && vite build --mode production` → `dist/`. provider 결정(TS-D1) 후 SPA rewrite + `index.html` no-cache/해시 자산 immutable.

## 확정된 FSD 구조

레이어 5 (widgets 미사용). 의존 방향 app→pages→features→entities→shared, **feature 간 직접 의존 금지** — 측정→기록 handoff는 `entities/measurement` 경유.

```
app/                        라우터(탭3+스택2)·프로바이더·persistence 부트스트랩·전역 배너/복구 UI·에러 바운더리 (F9)
pages/measure               S1 조립          pages/record-new    S2 조립
pages/motors                S3 조립          pages/motor-detail  S4 조립          pages/guide  S5 조립
features/measure-session    6-status 상태 머신·getUserMedia 래퍼·AudioWorklet 캡처·Worker 브리지·세션 로컬 스트림 (F2)
features/record-entry       폼 5항목·검증(A5)·제출 중 가드 (F6)
features/motor-management   등록/수정 시트·cascade confirm 오케스트레이션 (F5)
features/voltage-guide      모터 선택·추천 표시·computeGuide 순수 함수 (F8)
entities/motor              Motor 타입·zod 스키마·motors repository (command/query)
entities/run-record         RunRecord 타입·RunResult enum(D4)·records repository
entities/measurement        Measurement 값 객체 + 비영속 single-slot 확정값 store (F3)
shared/lib/audio-analysis   zero-dep 순수 엔진 + worker.ts + protocol.ts + __fixtures__/ (F1)
shared/lib/persistence      DB open/version/migration/validate-rehydrate/availability probe/withTransaction/resetAllData (F4)
shared/ui                   ConfirmDialog·Toast·BottomSheet·SegmentControl·VoltageStepper·StatusLabel·BigNumber (F10)
shared/config               도메인 상수 교체 지점(D1/D4/A5/A6)·라우트 경로
shared/testing/seeds        motors.seed / records.seed
```

`deleteMotorCascade`는 두 store를 걸치므로 `entities/motor/api` 소유 + `shared/lib/persistence`의 다중 store 트랜잭션 helper 사용(entity 간 import 금지 유지 — 원자성 계약은 state-contract 위임 1).

## Phase 2 디자이너별 입력 (자기 섹션에서 시작)

### design-system-architect

- **방향 확정**: 심플 · 수치 중심 · 모바일 세로 우선 · **MUI 7.3.0 최소 theme** — "심플"은 theme으로 달성(색 토큰 소수, 장식 배제, AD-8). 차트·게이지·시각화 전면 금지(수치 텍스트만).
- 토큰 요구: 6-status 구분용 상태 색(단, **색 단독 구분 금지** — 항상 텍스트 라벨+아이콘 3중), measuring=중간 명도(미확정 톤), stable=고대비 강조+배경 톤 전환 1회, destructive 스타일. RPM 대형 타이포 `clamp(56px, 18vw, 96px)` 계열, 천단위 구분 / 파노 소수 1자리+`Hz`.
- 제약: WCAG 2.2 AA, 터치 타깃 ≥44×44px, 콘텐츠 max-width ~480px 중앙 정렬(태블릿/데스크탑은 동일 레이아웃), 아이콘은 개별 SVG+svgr 소량(마이크·잠금·탭 3종 등).

### layout-designer

- **화면 5(S1~S5) + 탭 3 + 스택 2 + 오버레이 2** — §확정된 화면 목록 + ux-brief §3~§5 와이어프레임.
- **상태 matrix** — §UX Risks의 화면별 표가 레이아웃 명세의 행 목록. 전 상태 × 전 화면을 빠짐없이.
- S1 골격 계약: 상단 상태 라벨 / 중앙 수치 영역(**높이 고정 — layout shift 금지**) / 하단 액션 영역 — 6-status 모두 동일 골격, 내용만 교체. 모든 상태에서 primary 버튼 정확히 1개.
- 반응형: 단일 컬럼 기준, 가로 회전은 동일 레이아웃+수치 축소, 별도 브레이크포인트 없음. 전역 상단 고정 배너(IndexedDB 불가) 자리 확보.

### component-designer

- **S1 6-status 측정 화면 계약이 최우선** — ux-brief §5 상태별 표(라벨 텍스트/수치 영역/하단 액션/구분 장치)가 canonical. weak-signal은 수치 자리 "—", no-permission은 일시/영구 두 문구·두 버튼, suspended는 [탭하여 다시 시작], confidence는 UI 비노출.
- **공용 킷 F10 ↔ MUI 매핑**: ConfirmDialog(Dialog — destructive 스타일·초기 포커스=취소·focus trap·닫힘 후 트리거 복귀), Toast(Snackbar), BottomSheet(Drawer), SegmentControl(ToggleButtonGroup 3택), 탭 바(BottomNavigation), VoltageStepper(`inputmode="decimal"`+±0.1 V — 커스텀), StatusLabel(텍스트+색+아이콘 — 커스텀), BigNumber(높이 고정 — 커스텀).
- S2 폼 5항목 고정 순서: 모터 라디오(최근 사용순, S5와 공통 패턴) → 측정값 카드(읽기전용·비우기만) → 전압 스테퍼 → 결과 세그먼트(`완주·코스아웃·미주행` D4 baseline) → 만족 토글. 저장 버튼: 탭 즉시 비활성→토스트, 실패 시 입력 유지+오류 배너+[다시 저장].
- a11y: status 전이 aria-live="polite"("측정 완료, 18,540 RPM"), 전 컴포넌트 keyboard 조작.

### state-contract-designer

- **영속 엔티티 2**: `Motor`(id·name·statusMemo·createdAt·updatedAt), `RunRecord`(id·motorId·voltage·fanoHz·rpm·result·satisfied·createdAt, **immutable — update 없음**) + 비영속 `Measurement` 값 객체 + `DbMeta{schemaVersion}`. store: `motors`(keyPath id) / `records`(keyPath id, index by-motorId·by-createdAt) / `meta`. ID=UUID v4, 정렬 키=createdAt(동률 시 2차 키 id — FP-A3).
- **command/query 인벤토리 (feature-plan §4 전수)**: command 14건 = persistence 2(`initPersistence`·`resetAllData`) + motor 3(`createMotor`·`updateMotor`·`deleteMotorCascade`) + record 2(`createRecord`·`deleteRecord`) + measurement handoff 3(`set/take/clearConfirmedMeasurement`) + 세션 비영속 4(`startCapture`·`stopCapture`·`retryPermission`·`resumeAudio`) / query 6건 = `listMotors`·`getMotorById`·`countRecordsByMotor`·`listRecordsByMotor`·`listMotorSummaries`·`listSatisfiedRecords` / 순수 함수 1(`computeGuide`) + 내부 helper 1(`withTransaction`). 전 command `Result<T, DomainError>` 반환 — throw로 UI 관통 금지, 검증은 UI+command 이중.
- **불변식(승계분)**: 구조 필드(id·createdAt·motorId) 불변 — `updateMotor` patch 타입에서 제외 / dangling reference·duplicate ID 0건 / `(fanoHz===null)===(rpm===null)` 쌍 / weak-signal이면 f0·rpm null 타입 강제 / satisfied가 가이드 집계의 유일 원천 / 파생 값(기록 수·최근 요약·추천 범위) 영속·캐시 금지 / 고빈도 스트림은 세션 로컬만.
- **위임 4건 (본 wave에서 확정할 것)**: ① `deleteMotorCascade`·`createRecord`(FK 확인)의 다중 store 트랜잭션 원자성·실패 롤백 계약 ② schema v1 정의·version bump·migration·invalid-state recovery 절차(REQ-NFR-006) ③ 동시 탭 마지막 쓰기 정책 ④ command별 pre/postcondition 전수 + fixture 매핑 상세.
- 상수 교체 지점(1곳 원칙, `shared/config`): `GUIDE_MIN_SATISFIED=3`(D1) / fanoHz·rpm nullable(D2) / cascade 정책 command 내부(D3) / `RUN_RESULTS`+라벨 맵(D4) / `VOLTAGE_RANGE` 0.1~9.9 V(A5) / `WIDE_VARIANCE_THRESHOLD=0.5`(A6) / 파노 표시 라벨(A1). react-query 정책은 AD-4a 고정.

## Conflicts — 문서 간 충돌·불일치 (교차 검증 결과)

| # | 불일치 | 상태 | 처리 |
|---|---|---|---|
| PB-C1 | **모터 상태 입력 방식**: planning-context A4 "모터 상태·주행 결과는 **선택형** 입력" ↔ requirements REQ-F-003·ux-brief 등록 시트·feature-plan `Motor.statusMemo`는 **자유 텍스트 메모**(주행 결과만 선택형 D4로 확정) | **미해소 — NEEDS_DECISION** | 하류 3개 문서(W1~W3)가 일관 수렴했으므로 baseline은 `statusMemo`(자유 텍스트·선택 입력·기본 ''). 단 A4 원문과 충돌하므로 임의 확정하지 않음 — 미결 대장 PB-C1, Phase 2 중(state-contract Motor 스키마 확정 전) 사용자 확인. 선택형으로 바뀌면 statusMemo → enum 필드 교체(스키마 영향) |
| PB-C2 | **D1 임계값**: planning-context 초안 제안 "2건 미만이면 안내만" ↔ requirements 이후 baseline "3건 미만 → 추천 미표시+'n건 더 필요'" | 문서화된 교체(requirements가 변경 사실 명시) — 표현 충돌 아님 | baseline 3건으로 통일 승계. D1 자체는 여전히 미결(상수 1곳 교체 가능 설계 완료) |
| PB-C3 | **대역 밖 값 경고**: planning-context UX Check "기대 대역 밖 경고 장치 필요" ↔ ux-brief "UI 경고 불요" | 해소 — 근거 있는 종결 | v2 탐색 대역 제한(170~620 Hz)+고조파 점수가 구조적으로 차단. UI 계층 경고 없음이 확정 |
| PB-C4 | **RPM 대역 표기**: 기술 고지 12,000~30,000 RPM ↔ v2 탐색 대역 10,000~37,000 RPM | 해소 — v2 canonical | 탐색 대역(알고리즘) ⊃ 기대 대역(실측 검증 기준, A2). 두 수치는 용도가 다름 |

그 외 화면 목록(4 surface → S1~S5+오버레이 2 분해) ↔ 기능(F1~F10) ↔ 로컬 계약(command/query)은 Traceability 표 기준 전수 일치 — 누락·고아 항목 없음.

## 미결 전체 대장 (Open Ledger — 결정 시한 포함)

### NEEDS_DECISION

| ID | 내용 (선택지) | Baseline (진행 기준) | 영향 범위 | 결정 시한 |
|---|---|---|---|---|
| D1 | 가이드 최소 만족 기록 건수·미달 표시 (3건 vs 2건 vs 기타) | 3건 미만 → 추천 미표시 + "n건 더 필요 (n/3)" | `GUIDE_MIN_SATISFIED` 상수 1곳, E-2 | **Phase 2 중** (첫 사용자 검토) |
| D2 | 측정 없이 직접 기록 입력 (허용 vs 불허) | 허용 — fanoHz/rpm nullable | records 스키마 nullable, H-3, S3 "+기록" | **Phase 2 중 — state-contract 스키마 확정 전 확인 권장** |
| D3 | 모터 삭제 시 소속 기록 (cascade vs 차단) | confirm "기록 n건 함께 삭제" 후 cascade | `deleteMotorCascade` 내부 정책, C-3 | **Phase 2 중 — state-contract 트랜잭션 계약 확정 전 확인 권장** |
| D4 | 주행 결과 선택지 (`완주·코스아웃·미주행` vs `좋음·보통·아쉬움`) | `finished·course_out·not_run` | `RUN_RESULTS` enum+라벨 맵, S2/S4/S5 표시 | **Phase 3 전** (실기기 세션에서 사용자 어휘 확인 — enum 상수만 교체) |
| TS-D1 | 정적 호스팅 provider (Vercel/Netlify/GitHub Pages/기타 — 전부 요건 충족) | `generic` — 로컬 개발·CI·E2E는 무관하게 진행 | 배포 설정만 (HTTPS+SPA rewrite+헤더 불요) | **Phase 2 중 — 실기기 검증 세션 전** (HTTPS URL 필요) |
| PB-C1 | 모터 상태: 자유 텍스트 메모 vs 선택형 (본 brief 신규 — A4 충돌) | `statusMemo` 자유 텍스트 (W1~W3 수렴안) | Motor 스키마, 등록 시트 UI | **Phase 2 중 — state-contract Motor 스키마 확정 전** |

### ASSUMPTION (검토 시 이의 없으면 유지)

| ID | 내용 | 검증/시한 |
|---|---|---|
| A1 | 파노값 = 파이프라인 f₀(Hz) — 오케스트레이터 해석, 사용자 고지(명시 확정 아님) | **첫 검토(Phase 2 전·최우선)** 사용자 명시 확인 — 다르면 표시 라벨/환산식만 교체 |
| A2 | RPM = f₀×60 (3극 브러시드, 3f₀/6f₀ 구분은 파이프라인 담당) | fixture + 실기기 12,000~30,000 RPM 대역 (Phase 2 중) |
| A3 | 단일 기기 — 브라우저 데이터 삭제 시 소실 허용, export Won't | 소실 위험 고지 후 이의 없으면 유지 (Phase 2 중) |
| A4 | 입력 심플화(선택형) — 주행 결과는 D4로 구체화, 모터 상태는 PB-C1 충돌 참조 | PB-C1과 함께 (Phase 2 중) |
| A5 | 전압 허용 0.1~9.9 V, 소수 ≤2자리 | 실사용 전압대(예: 2.4~3.2 V) 확인 후 `VOLTAGE_RANGE` 조정 (Phase 2 중) |
| A6 | 추천 범위 = 만족 기록 전압 min~max, 분산 문구 임계 0.5 V | seed 계산 + 사용자 검토 (Phase 2 중), 임계 상수 1곳 (Phase 3 전 조정 가능) |
| A7 | max 규모 = 모터 30·기록 1,000, 상호작용 p95<200 ms | 실사용 규모 확인 (Phase 3 전) |
| UX-A1 | stable 확정 시 캡처 자동 정지, [다시 측정]=새 세션 | Phase 2 검토 (캡처 수명 정책 1곳) |
| UX-A2 | measuring 중 탭 전환/백그라운드 → 세션 종료(idle) | Phase 2 검토 |
| UX-A3 | 자동 채움 측정값 수정 불가·비우기만 | Phase 2 검토 |
| FP-A1 | "최근 사용순" = 소속 기록 max createdAt(없으면 motor.createdAt), 파생 계산 | Phase 2 검토 (정렬 비교자 1곳) |
| FP-A2 | Measurement.confidence·capturedAt은 RunRecord에 비영속 | Phase 2 검토 — 필요 시 additive migration 경로 확보(위임 2) |
| FP-A3 | UUID v4 + createdAt 정렬(동률 2차 키 id) | state-contract에서 명문화 (Phase 2 중) |
| TS-A1 | 버전 pin 근거 = templates.md 2026-07 (WebSearch 금지) — 실재·integrity는 lockfile operation이 확정 | **Phase 3 전** (lockfile resolve+frozen install+CI) |
| TS-A2 | PWA = manifest+아이콘만, SW 없음, standalone 미승격 | Phase 2 실기기에서 standalone getUserMedia 확인 전 승격 금지 |
| TS-A3 | 환경 2단(dev/production), staging 없음 | provider 확정 후 필요 시 확장 (Phase 3 전) |
| TS-A4 | 단일 앱 모노레포 골격, 독립 package 0개 | 엔진 배포 요구 발생 시 재검토 (근거 없음) |

### state-contract-designer 위임 4건 (Phase 2 중 — 해당 wave 산출물에서 확정, Phase 3 전 필수)

1. `deleteMotorCascade`·`createRecord`(FK 확인) 다중 store 트랜잭션 원자성·실패 롤백 계약
2. schema v1 정의·version bump·migration·invalid-state recovery 절차 (REQ-NFR-006)
3. 동시 탭 마지막 쓰기 정책
4. command별 precondition/postcondition 전수 + fixture 매핑 상세

### BLOCKER (운영 — 제품 blocker 없음)

| 항목 | 내용 | 시한/owner |
|---|---|---|
| B1 실기기 검증 세션 | mock 재현 불가 항목(D-3/D-5/실모터 실측)은 HTTPS 실기기(iOS Safari 우선) 사용자 참여 세션 필요 — Order 2 완료 후 첫 회 | Phase 2 중 / owner: 사용자 (DL-006) |
| B2 harness 산출물 경로 정책 | 오케스트레이터 지시 경로 `workspace/minicar-motor-lab/_workspace/01_plan/` vs agent-registry 허용 경로 harness root `_workspace/01_plan/`(전 산출물 실제 위치) 불일치 — 이관 vs registry 조정 | **Phase 2 전** / owner: 오케스트레이터·사용자 |

## 디자인 팀 액션 아이템

- [ ] (design-system) MUI 최소 theme 정의 — 6-status 상태 색·destructive·수치 타이포 토큰, 시각화 금지·색 단독 구분 금지 준수
- [ ] (layout) 화면 5+오버레이 2 레이아웃 명세 — 상태 matrix 전 셀 커버, S1 3영역 골격·수치 영역 높이 고정
- [ ] (component) S1 6-status 컴포넌트 계약 + F10 공용 킷(MUI 매핑/커스텀 구분) + S2 폼 5항목 명세
- [ ] (state-contract) 엔티티 2 스키마 v1 + command/query 전수 pre/postcondition + 위임 4건 확정 + 상수 교체 지점 반영
- [ ] (공통) D1~D4·PB-C1·A1 baseline을 명시 표기로 사용 — 임의 확정 금지, 교체 지점 1곳 원칙 유지
- [ ] (공통) a11y 계약 구체화 — aria-live 문구, focus trap/복귀, 44px 타깃

## 개발 팀 액션 아이템

- [ ] `workspace/minicar-motor-lab` 스캐폴딩 (pnpm workspace + turbo + Vite 8 + React 19, project-init 골격 — `VITE_API_URL`·MSW 부트스트랩 제거)
- [ ] Package Changes 표 전수 반영 → typed lockfile operation(idb·fake-indexeddb knowledge pin 검증) → frozen install
- [ ] Order 1: `shared/lib/audio-analysis` zero-dep 엔진 + 합성 fixture 8종+CRLB sanity Vitest (node env, 앱과 독립 즉시 착수)
- [ ] Order 2: F2 측정 세션 상태 머신 + S1 = smallest visible review (권한/HTTPS/suspended/weak-signal 전환 포함)
- [ ] Order 3: F4 persistence(v1 schema·migration·복구) + F5/F7 모터·목록 + cascade
- [ ] Order 4: F6/F3 기록 입력 + 측정값 handoff (6탭 이내 흐름)
- [ ] Order 5: F8 가이드 + E-5 max seed 성능 + F-1 a11y 마감
- [ ] Playwright: fake media stream 권한 시나리오(D-1/D-2/D-4) + a11y(axe) + mobile-chrome/reflow-320
- [ ] Phase 2 실기기 세션 준비: TS-D1 provider 확정 → HTTPS 배포 URL (B1)

## 결정이 필요한 사항 (요약 — 상세는 미결 대장)

- **A1 파노값 정의 확인** (f₀ Hz 해석 유지 vs 다른 의미) — 첫 검토 최우선. 이유: 사용자 고지만 된 오케스트레이터 해석이며 표시 계층 전반의 라벨에 영향.
- **PB-C1 모터 상태 입력** (자유 텍스트 메모 vs 선택형) — planning-context A4와 하류 문서가 충돌. Motor 스키마 확정 전 필요.
- **D1 가이드 최소 건수** (3건 vs 2건) — 상수 1곳. 첫 사용자 검토에서.
- **D2 직접 입력 허용** (허용 vs 불허) — 스키마 nullable 여부. state-contract 전 권장.
- **D3 모터 삭제** (cascade vs 차단) — 트랜잭션 계약. state-contract 전 권장.
- **D4 주행 결과 선택지** (`완주·코스아웃·미주행` vs 주관 평가형) — enum 상수만 교체. Phase 3 전.
- **TS-D1 호스팅 provider** (Vercel/Netlify/GitHub Pages/기타) — 전부 요건 충족, 운영 선호로 결정. 실기기 세션 전.
- **B2 harness 경로 정책** (이관 vs registry 조정) — 오케스트레이터. Phase 2 전.
