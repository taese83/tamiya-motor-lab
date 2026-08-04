# tamiya-motor-lab 디자인 검토 보고서

- **일자**: 2026-08-04
- **대상**: `tamiya-motor-lab` (minicar-motor-lab) — React 19 + Vite + MUI v7, 모바일 전용 SPA(max-width 480), 다크 우선, 한글 UI. 미니사구 모터 RPM 측정·모터/레이스 기록(오프라인·IndexedDB).
- **기준(rubric)**: web-orchestrator `references/design-principles.md` 및 8개 분야 절 — 소비 규칙(원칙은 기본값, 사용자 브랜드 제약 > 원칙, existing 우선, 접근성 하한만 협상 불가, 이탈 시 근거 한 줄이면 pass) 적용.
- **방법**: 7개 도메인(색상/타이포/간격·레이아웃/위계·액션/내비·IA/인터랙션·컨트롤/데이터시각화) 병렬 read-only 검토 + 다크/라이트 실화면 캡처(측정·모터·레이스) + 토큰·앱 셸 직접 정독.

---

## 총평

원칙 정합도가 매우 높은, 잘 설계된 디자인 시스템. **앱 전체에 진짜 WCAG 접근성 하한 위반(BLOCKER)은 없다.** 가장 심각한 결함 1건(StabilityGauge 하드코딩 색)은 색상·데이터시각화 두 검토가 독립적으로 동일 지목했고, 본 검토에서 수정 완료했다.

원칙 KB를 rubric으로 쓴 결과, 취향 지적이 아니라 구체·우선순위화된 실결함을 걸러냈고 강점을 함께 확인했다 — rubric으로서 유효.

---

## 이번에 적용한 수정 (3건)

### FIX-1 · StabilityGauge 하드코딩 색 → 테마 토큰 단일 출처 [원 HIGH, 색상+데이터시각화 교차확인]
- **파일**: `src/features/measure-session/ui/StabilityGauge.tsx`
- **문제**: `VIVID_BAND_COLOR = {#00E5A0, #3DDC46, #FFB300, #FF3B30}` raw hex — ① `hex 직접 사용 금지`(design-system.md 비협상) 위반이자 코드베이스 유일의 raw-hex 위반, ② 모드 무반응 → 라이트 흰 히어로 면에서 비텍스트 대비 3:1 미달(good 1.8·fair 1.8·excellent 1.6), ③ 아크 색이 캡션(`success/warning/error.main`)과 불일치(같은 등급 = 두 색).
- **수정**: 등급→severity 단일 맵 `GRADE_SEVERITY`를 도입해 아크 밴드와 캡션이 동일 테마 토큰을 공유. `VIVID_BAND_COLOR`·중복 `LEVEL_COLOR` 제거.
- **트레이드오프(문서화됨)**: 다크(기본 모드)는 `amber400(#FFB300, 동일)/red400/green400`으로 여전히 선명 → "쨍한 색" 사용자 요청이 주 모드에서 유지. 라이트는 대비를 위해 `green800/amber800/red800`으로 필연적 저채도화. 더 강한 채도가 필요하면 design-tokens에 모드별 grade 토큰 신설(주석에 명시).
- **검증**: typecheck/lint exit 0. 라이트 실화면 — 밴드가 흰 배경에서 또렷(수정 전 씻김). 다크 실화면 — 선명 유지. 콘솔 오류 없음.

### FIX-2 · 3차(text) 버튼 sub-44 → 앱 자체 44px 타깃 하한 준수 [원 spacing BLOCKER(앱 기준)]
- **파일**: `ConditionSummary.tsx:114`("보는 법"), `RaceInsightCard.tsx:295·312`("보는 법"), `RaceEntrySheet.tsx:335`("AI 추천")
- **문제**: `minHeight:0, py:0.25`(~27px)·`minHeight:36`로 테마 48px 바닥을 우회 → 앱 선언 REQ-NFR-003(44px)·"장갑 낀 피트" 맥락 위반. (WCAG 24px 절대 하한은 통과 → WCAG 위반은 아님.)
- **수정**: 형제 버튼(`RaceInsightCard.tsx:287`)의 검증된 패턴대로 `minHeight: layoutTokens.touchTargetMin` + 음수 `my`로 44px 히트 영역 확보 + 시각 밀도 유지. ConditionSummary에 `layoutTokens` import 추가.
- **검증**: typecheck/lint exit 0.

### FIX-3 · 복구 데드엔드 해소 — `corrupted` 분기를 로그인 게이트보다 우선 [원 MEDIUM #1]
- **파일**: `src/pages/motors/ui/MotorsPage.tsx`, `src/pages/race/ui/RacePage.tsx`
- **문제**: 두 화면의 본문 분기 순서가 `!loggedIn` → `corrupted`라, 로그아웃 사용자의 로컬 DB가 손상되면 전역 배너 [복구 옵션] → `/motors`로 가도 로그인 게이트에 막혀 RecoveryPanel([다시 시도]·[전체 초기화])에 도달 불가. 로컬 IndexedDB 복구는 계정과 무관한데도 로그인을 요구하는 데드엔드.
- **수정**: 분기 순서를 `corrupted` → `!loggedIn`으로 교체(옵션 1). 저장소가 손상되면 로그인 여부와 무관하게 복구 패널을 먼저 렌더. 근거 주석 추가.
- **검증**: typecheck/lint exit 0. **end-to-end 실증** — IndexedDB(`mml-db.motors`)에 스키마 위반 행을 주입해 부팅 full-scan이 `corrupted`를 판정하게 한 뒤, **로그아웃 상태**에서 `/motors`·`/race` 모두 로그인 게이트가 아니라 복구 패널 + 상단 [복구 옵션] 배너가 뜨는 것을 캡처로 확인. 회귀 없음(정상 DB + 로그아웃 → 로그인 게이트 유지)도 확인. 테스트 후 주입 DB 삭제.

---

## 반복되는 구조적 테마 (개별 결함보다 우선)

### A. 스펙·토큰 문서 ↔ 구현 불일치 (가장 큰 시스템 이슈)
구현이 자기 설계 문서를 앞질렀고 문서가 미동기화. 대부분 근거 주석이 있어 원칙상 pass지만 canonical 문서가 제품을 잘못 기술한다.
- 죽은 토큰: `design-tokens.ts:262·264`의 `cardPad:20`·`sectionGap:40` 정의·정당화됐으나 **미사용**(실제 카드 16/12, 섹션 12~16).
- 차트 스펙 이탈: PanoGauge 0~800(spec §2.4 = 170~620), PanoLineChart X = 회차 인덱스(spec §5.5 = `measuredAt`).
- 종류색 모순: 모터 종류 10색이 component-spec §3.7("종류는 중립색")과 충돌.
- 상세 title: layout-spec §2.2 요구한 상세 페이지 `document.title` = 모터명 갱신 미구현.
- **권장**: 스펙/토큰 문서를 구현에 재동기화하거나 죽은 토큰 삭제.

### B. 터치 인체공학 (장갑 낀 피트 도구)
- 스와이프 어포던스 미표시(`MotorRow.tsx:62`, `RaceRecordRow.tsx:82`) — 핸들·트레이 peek·chevron 부재. 키보드 대안은 있음.
- 바텀시트 가시적 닫기 컨트롤 부재(`BottomSheet.tsx:27`; MotorPickSheet는 backdrop 탭에만 의존).
- 스와이프 트레이 `overflow:hidden`이 focus ring 클리핑(`SwipeActions.tsx:170`).
- 헤더 인접 44px 액션 4px 간격(권장 8~24)(`PageHeader.tsx:56`, `MeasurePage.tsx:231`).

### C. 빈 상태·복구 동선
- 미로그인 게이트에 본문 CTA 버튼 부재 — 우상단 아이콘을 "말로만" 지시(`MotorsPage.tsx:175`, `RacePage.tsx:111`). (실화면 확인.)
- **복구 데드엔드(가장 날카로움)**: 손상 DB 배너 "복구 옵션" → `/motors` → 미로그인 분기가 corrupted 분기보다 먼저 걸려 로그인 벽에 막힘(`Routes.tsx:88`, `MotorsPage.tsx:175`). 기기 로컬 저장소 복구가 계정 로그인에 의존해선 안 됨.
- 상세 빈 상태가 본문 CTA 대신 헤더 버튼을 가리킴.

### D. 파괴적 액션 일관성
- 측정 기록 삭제만 confirm·undo 둘 다 없이 즉시 실행(`MotorDetailPage.tsx:130`) — 타 삭제는 ConfirmDialog. → 성공 토스트에 undo 권장.
- 다이얼로그 버튼 배치 3종 혼재(ConfirmDialog 세로 스택 / 미완주 확인 가로 우측 primary / LapTimer 행+text).
- ConfirmDialog에서 빨강 파괴 버튼이 시각적 우세·손이 먼저 닿는 위치(`ConfirmDialog.tsx:84`) — Enter 안전은 지킴.

### E. 한글 타이포 미세
- 한글 라벨에 양수 자간(overline 0.12em)(`theme.ts:66` → `RaceInsightCard.tsx:158`, `LatestPanoHero.tsx:25`).
- 스케일 밖 크기: h2 18px, listValue 15px, sizeLarge 17px.
- overline `textTransform` 미해제로 단위 "Hz"→"HZ"(`MeasureFigures.tsx:149`).

### F. 데이터 정직성(Tufte)
- PanoGauge 0~800 + "의미 없음" 명시된 레드라인(700~800) → 아크 ~40% 낭비, 위험색 오용(`PanoGauge.tsx:41`).
- PanoLineChart 시계열을 등간격 회차축으로(`PanoLineChart.tsx:28`) — 축 라벨 "회차"라 정직성은 유지.
- 둘 다 aria-hidden + 정본 텍스트 존재 → 접근성 영향 낮음.

---

## 미해결 findings 요약 (심각도 순)

| # | 심각도 | 항목 | 위치 |
|---|---|---|---|
| 1 | ~~MEDIUM~~ **FIX-3 완료** | 복구 배너가 로그인 벽으로 막힘(데드엔드) | `MotorsPage.tsx` / `RacePage.tsx` |
| 2 | MEDIUM | 측정기록 삭제 confirm·undo 부재 | `MotorDetailPage.tsx:130` |
| 3 | MEDIUM | 미로그인 게이트 본문 CTA 부재 | `MotorsPage.tsx:175`, `RacePage.tsx:111` |
| 4 | MEDIUM | 스와이프 어포던스 미표시 | `SwipeActions.tsx`, `MotorRow.tsx:62` |
| 5 | MEDIUM | 바텀시트 닫기 컨트롤 부재 | `BottomSheet.tsx:27` |
| 6 | MEDIUM | 스와이프 트레이 focus ring 클리핑 | `SwipeActions.tsx:170` |
| 7 | MEDIUM | 다이얼로그 버튼 배치 3종 혼재 | ConfirmDialog / RaceDetail / LapTimer |
| 8 | MEDIUM | 상세 `document.title` 미갱신 | `MotorDetailPage.tsx`, `RaceDetailPage.tsx` |
| 9 | MEDIUM | 죽은 토큰(cardPad/sectionGap) + 섹션 위계 붕괴 | `design-tokens.ts:262`, `MotorDetailPage.tsx:345` |
| 10 | MEDIUM | PanoGauge 눈금 정직성 / PanoLineChart 시계열축 | `PanoGauge.tsx:41`, `PanoLineChart.tsx:28` |
| 11 | MEDIUM | 한글 overline 양수 자간 / off-grid 크기 | `theme.ts:66` 외 |
| 12 | MEDIUM | 모터 종류 10색 vs component-spec §3.7 | `design-tokens.ts:53` |
| — | LOW | HZ 대문자, danger-red on "정지", 네/아니오 라벨, 2px/10px off-grid, 종류 편차 색단독, 스와이프 DOM 순서 등 | 다수 |

---

## 도메인별 판정

| 도메인 | 판정 | 최상위 이슈 |
|---|---|---|
| 색상·대비·다크모드 | 강함 (BLOCKER 없음) | StabilityGauge 하드코딩 색 → **FIX-1 완료** |
| 타이포그래피 | 견고 | 한글 overline 자간, off-grid 크기 |
| 간격·레이아웃·밀도 | 강함(테마 소유) | 3차 버튼 sub-44 → **FIX-2 완료**; 죽은 토큰·섹션 위계 |
| 위계·액션 | 강함 | 파괴 플로우 일관성 |
| 내비게이션·IA | 강함 | 상세 title, 게이트 CTA, 복구 데드엔드 |
| 인터랙션·컨트롤 | 강함 | 스와이프 어포던스·시트 닫기·포커스 링 |
| 데이터 시각화 | 견고(a11y 우선) | 게이지 눈금·시계열축 |

---

## 보존할 강점

- 완전한 이중 색 스킴 + 토큰별 대비 실측 주석. 순검정(#0A0A0B)·순백(#F4F5F2 ~18:1) 회피 — 반전 아닌 진짜 다크 재설계.
- 라임 희소성 유지(60-30-10) — CTA·활성탭·포커스·측정 중에만.
- 앱 셸 모범 — 하단 탭 3개(showLabels), 색+형태 이중 활성 신호 + `aria-current`, skip link, `ScrollRestoration`, `document.title` 동기화, persistence 3-상태 배너, 404 URL 보존.
- 화면당 primary(contained) 정확히 1개(버튼 sweep 전수 검증). 측정 dock = discriminated-union 단일 슬롯 모범.
- 파괴 액션에 브랜드 라임 미사용 — 빨강 contained는 ConfirmDialog 1곳 전용.
- 폼 설계 교과서적 — top 라벨, placeholder-as-label 금지, submit 검증, 입력값 미삭제 + 첫 에러 포커스.
- 차트/정본 텍스트 분리 — 게이지·차트 전부 aria-hidden + 인접 텍스트에 정본값. 결측을 0으로 그리지 않음.

---

## 부록 — 원칙 지식 베이스 자체 점검

앱과 별개로, 방금 추가된 KB 통합 상태에서 검증된 실이슈(원래 요청 맥락):
- **foundations 배선 공백**: 허브가 foundations를 "전체(모든 design·plan agent)"로 선언했으나 실제로는 ux-researcher 1개만 읽음 — 결정 우선순위·밀도 전략·Laws of UX가 `design-system-architect`·`design-reviewer`에 미도달.
- **소비자 맵 누락 + dangling 경로**: `component-builder`가 interaction-controls를 읽으나 허브 맵에 없음. 허브의 `design-readiness-contract.md` 참조가 상대경로상 실존 파일(`../web-plan/references/`)을 못 가리킴.
- **문서 수치 오류(교차확인)**: `design-principles-typography.md`의 큰 텍스트 대비 임계값 "18px+/14px bold"는 WCAG(24px / 18.66px bold) 기준 오기 — 타이포 검토도 독립 지적. 단 이 앱은 모든 텍스트를 엄격한 4.5:1로 검증해 이 오류에 의존하지 않음.
