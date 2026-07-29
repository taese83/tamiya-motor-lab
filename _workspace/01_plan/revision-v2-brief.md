# Revision v2 Brief — 측정·모터·레이스 개편 (2026-07-28, 사용자 사양 + 확정 결정)

> 설계 개정(state-contract·api-schema·layout-spec·component-spec v2)의 **단일 입력 문서**.
> 이 브리프는 사용자 원문 사양을 정규화한 것이며, 충돌 시 이 문서가 기존 plan 문서(feature-plan v1, requirements v1)를 이긴다.
> 디자인 v3(라임 시그니처·컷코너·히어로 레이아웃, design-system.md v3)를 이 기능 개편과 **같은 라운드에 병합 구현**한다.

## 확정 결정 (사용자, 2026-07-28)

| ID | 결정 |
|---|---|
| RV-1 | 레이스 폼 [측정] 왕복: 수치가 안정되면(기존 안정 판정 재사용) **자동 확정·자동 복귀**. 이 모드에서 측정 화면에 [기록] 버튼 없음 |
| RV-2 | 전압 추천 기능(computeGuide·만족 토글·GUIDE_MIN_SATISFIED) **완전 제거** |
| RV-3 | 기존 저장 데이터 **초기화** — 마이그레이션 없음. IndexedDB DB 스키마 v2로 재정의, 구버전 DB 감지 시 삭제 후 새로 생성 |
| RV-4 | v3 UI 선택지: 숫자 전용 폰트(Oxanium 서브셋)·페이지 전환 페이드 — recommended대로 **둘 다 도입** (체크포인트에서 이의 시 제거, 각 1곳 롤백) |

## 1. 측정 (`/`)

- M-1 **진입 시 자동 시작**: 페이지 진입에서 곧바로 캡처 시작 시도. 권한 없으면 즉시 권한 요청.
  - ⚠️ 기술 제약: iOS Safari는 AudioContext 시작에 사용자 제스처를 요구할 수 있다 — 자동 시작을 시도하고, 브라우저가 거부하면 "탭하여 시작" 1탭 fallback UI를 보인다(실패를 오류로 표시하지 않음). 이 fallback은 계약이며 QA 대상.
- M-2 **중지 버튼 없음**. 탭 이탈·백그라운드 시 자동 정지, 복귀 시 자동 재시작.
- M-3 **연속 측정**: '측정완료(stable 잠금)' 상태 제거 — 값은 계속 갱신 표시. 내부 안정 판정 로직은 유지하되(레이스 왕복 RV-1과 [기록] 활성 판단에 사용) UI 상태로 노출하지 않는다.
- M-4 **게이지 주지표 = 파노(Hz), 보조 = RPM** (기존과 반대). 게이지 눈금도 파노 기준(170~620Hz)으로 재설계.
- M-5 하단 **[기록] 버튼 상시 존재**: 유효 측정값 표시 중(수치 null 아님)일 때만 활성.
- M-6 [기록] 탭 → **모터 선택 팝업**(등록 모터 목록) → 선택 즉시 해당 모터에 수집(MeasureRecord 생성). 성공 토스트. 모터 0개면 팝업에서 등록 유도.
- M-7 상태 표시는 유지하되 단순화: 권한 없음/신호 약함/측정 중 구분은 남는다(REQ-NFR-003 3요소 병행 유지).

## 2. 모터 (`/motors` — 메뉴명 "이력"→"모터")

- T-1 **등록 단순화**: 이름 + 종류만. 종류 enum(9종, 저장은 안정 식별자·표시는 라벨 맵):
  `m130`(130) · `atomic`(아토믹튠) · `torque`(토크튠) · `rev`(렙튠) · `hyper_dash`(하이퍼대시) · `power_dash`(파워대시) · `sprint_dash`(스프린트대시) · `ultra_dash`(울트라대시) · `mach_dash`(마하대시)
  - 기존 statusGrade·statusMemo 필드 제거.
- T-2 **기록(MeasureRecord)은 수집 전용**: 측정 화면 [기록]으로만 생성. 수동 입력·수정 불가. 삭제는 모터 삭제(cascade)와 전체 초기화뿐(개별 삭제 없음 — ASSUMPTION RV-A1, 이의 시 개별 삭제 추가).
- T-3 **모터당 최대 10건 rolling**: 11번째 수집 시 가장 오래된 기록 자동 삭제(단일 트랜잭션).
- T-4 기록 표시: **파노(주) + rpm(부)** + 측정 일시.
- T-5 **모터 리스트 항목 탭 → 라인 차트**: X=측정 날짜(시각), Y=파노값, 점 ≤10개. 커스텀 SVG(차트 라이브러리 금지). 항목 확장(인라인) 또는 상세 화면 중 layout-designer가 결정.
- T-6 **드래그앤드롭 정렬**: Motor에 `sortOrder` 필드, 리스트 순서 영속. 구현은 @dnd-kit/core+sortable 채택(키보드 접근성 내장 — a11y 계약 충족, 신규 의존성 2개, exact pin은 tech-stack 갱신). 터치·스크롤 공존 처리 포함.
- T-7 기존 모터 상세 화면(`/motors/:id`)의 존치 여부는 layout-designer 결정 — 차트를 인라인 확장으로 하면 상세 라우트 제거 가능.

## 3. 레이스 (`/race` — 메뉴명 "가이드"→"레이스", 라우트명도 교체)

- R-1 진입 시 **모터 리스트** 표시, 각 항목에 **마지막 레이스 기록 요약** 노출. 항목 탭 → 해당 모터의 레이스 페이지(`/race/:motorId`).
- R-2 레이스 페이지: 레이스 기록 리스트(최신순) + **[+] 버튼** → 레이스 입력 폼(시트/인라인은 layout 결정).
- R-3 **레이스 입력 폼 필드**: ① 파노 — 해당 모터 최신 MeasureRecord 파노 자동 입력, 또는 [측정] 버튼으로 즉석 측정(RV-1 왕복) ② 결과 — 완주/이탈 2택 ③ 전압 ④ 랩타임(옵션) ⑤ [입력] 버튼.
- R-4 [입력] → RaceRecord 생성, 리스트에 추가. [+]로 반복 입력.
- R-5 **[측정] 왕복 계약**: 폼 상태(결과·전압·랩타임 입력분)를 보존한 채 측정 화면으로 이동(`/?raceReturn=…` 또는 세션 상태) → 안정 판정 시 자동으로 해당 모터에 MeasureRecord 수집 + 폼 파노값 갱신 + 레이스 폼으로 자동 복귀. 이 모드의 측정 화면에는 [기록] 버튼 없음(모드 표시).
- R-6 레이스 화면 하단 **[초기화] 버튼**: 확인 다이얼로그(명시 확인 + 삭제 범위 고지) 후 **모든 기록 초기화**. 범위 = 전체 MeasureRecord + RaceRecord (ASSUMPTION RV-A2: 모터 등록 자체는 유지 — "기록 초기화" 문언 해석. 이의 시 전체 삭제로 변경).
- R-7 RaceRecord: 수정 없음, 개별 삭제는 행 스와이프/버튼으로 허용할지 layout 결정(기본: 개별 삭제 있음 — 오입력 복구 수단, ASSUMPTION RV-A3).

## 데이터 모델 v2 (state-contract 개정 방향)

- `Motor { id, name(≤30), kind: MotorKind, sortOrder: number, createdAt, updatedAt }`
- `MeasureRecord { id, motorId, panoHz, rpm, measuredAt }` — immutable, 모터당 ≤10 rolling
- `RaceRecord { id, motorId, panoHz, result: 'finished'|'retired', voltage, lapTimeMs?: number, createdAt }` — immutable(개별 삭제 RV-A3)
- 제거: statusGrade/statusMemo, RunRecord(만족·주행결과 3택), Measurement handoff의 S2 소비 경로(S2 기록 입력 화면 자체가 제거됨 — `/record/new` 라우트 삭제)
- DB: `mml-db` v2 — 구버전 감지 시 전체 삭제 후 재생성(RV-3)

## 제거 대상 (구현에서 삭제)

`/record/new` 라우트·RecordEntryForm·useRecordEntryForm·만족 토글·ResultSegment(레이스 폼의 완주/이탈 2택으로 대체)·GradeSegment/GradeChip(종류 Chip으로 대체)·computeGuide·GuideResult/GuideInsufficient·voltage-guide slice 전체·cascade confirm의 "기록 n건" 문구는 유지(모터 삭제 시 MeasureRecord+RaceRecord cascade).

## 불변 유지

분석 엔진(F1) 무변경(안정 판정 내부 재사용) · FSD 경계 · WCAG AA·44px·tabular-nums·고정 높이 · 다크 기본+라이트 토글 · Vercel 배포 · 엔진 테스트 22건 회귀 기준선.
