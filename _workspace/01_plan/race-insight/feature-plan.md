# Feature Plan — 레이스 인사이트 (race-insight, Phase 1)

> 근거: `race-insight/planning-context.md`·`requirements.md`·`ux-brief.md` + 코드 직접 확인
> (`RaceDetailPage.tsx`·`voltage-advisor/`·`stability-baseline.ts`·`RaceRecordRow.tsx`·`PanoLineChart.tsx`).
> 구현 없음 — 계획만. 새 제품 결정 없음(D1~D3 유지). 기록 주체: 오케스트레이터 대필.

## 딜리버리 단위 (split 권고 구조 — D1 종속)

| Slice | 단위 | 내용 | 최소 가시 검토 단위 | effort driver |
|---|---|---|---|---|
| 1차 **S** | U1 파생 계산 · U2 요약 카드 · U5 페이지 배선 | 텍스트 요약 카드 1장(완주 전압대·최근 완주 전압·스트릭·추세 방향) | fixture 4종(0건/부족/혼재/미정 포함) 상태 전환 + 375×667 수직 예산 실측 | 화면 1·순수 함수+unit 7종·상태 3분기·신규 계약 없음. 리스크: 수직 예산(NFR-001, layout 몫) |
| 2차 **M** | U3 미니 차트 · U4 완주 vs 이탈 대역 비교 | @mui/x-charts 기존 패턴 준용(신규 의존성 0) | S 카드 아래 차트 1개 + 대역 비교 표시 | 차트 a11y 계약·결측/0~1점 상태·**REQ-RI-101 내 지표 미결(전압×결과 vs 랩타임 — M 착수 시 확정)**·수직 공간 긴장(S 실측 후 판단) |

의존: U2→U1, U5→U1·U2, U3·U4→U1(계산 확장)·Slice 1 검토 완료. U1은 단독 병렬 착수 가능.

## FSD 슬라이스 맵과 owner

| 레이어 | 슬라이스/파일 | 역할 | 근거 |
|---|---|---|---|
| entities | `race-record/model/race-insight.ts` (U1, 신규) | RaceRecord[]→RaceInsight 순수 파생 + `selectAdviceWindow` 추출 | 관례: `entities/measure-record/model/stability-baseline.ts`(기록 배열→파생 순수 함수, entities model 소유). `features/race-record/model/`은 전부 React 훅(use-race-entry 등) — 순수 파생 전례 없음. voltage-advisor가 shared/lib인 것은 RaceRecord 비의존 부분집합(VoltageAdviceRace) 범용 계산이라서 — insight는 RaceRecord 스키마 직결이므로 entities |
| features | `race-record/ui/RaceInsightCard.tsx` (U2, 신규) + `RaceInsightHelpDialog.tsx`([보는 법]) | 순수 렌더 제어형 — `insight` props 주입, 열림 상태는 페이지 소유(ConditionSummary 관례) | ux-brief 패턴 승계. 표기는 formatVoltage/formatLapTimeSec/RACE_RESULT_LABELS 재사용(행 표기 일치) |
| features | `race-record/ui/RaceTrendMiniChart.tsx` (U3, M 신규) | aria-hidden·회차 X축·0~1점 미렌더·결측 점 생략 — PanoLineChart 계약 준용 | `PanoLineChart.tsx` 직접 확인(v2.3 x-charts 기도입) |
| pages | `race-detail/ui/RaceDetailPage.tsx` (U5, 수정) | 스크롤 영역 상단에 카드 배선 + 인라인 윈도우(155-161행)를 `selectAdviceWindow` import로 치환(동작 불변) | 페이지 배선은 route-builder 소유(data-ui-binder 미사용 프로젝트) |

Local domain state: authoritative = IndexedDB `raceRecords`(repository, 무변경) / derived view = RaceInsight(읽기 selector, entities model) / 신규 command·store 없음.

## 파생 계산 계약 (U1 — 구현 의사코드 아님)

- 입력: `races: ReadonlyArray<RaceRecord>` — **최신순(desc)**, `listRaceRecordsByMotor` 결과 그대로(createdAt desc·id desc, repository 보장 — 재정렬 금지, NFR-003 O(n) 1-pass).
- 옵션(D2 파라미터): `sampleWindow: 'all' | 'advisor'` — `'advisor'` = `selectAdviceWindow(races)` 공유. 현행 정의(RaceDetailPage.tsx:155-161 인용): 최신→가장 최근 완주 **포함**까지 slice, 완주 없으면 최근 `RECENT_FALLBACK=5`건. 기본값은 D2 기본 제안('advisor')이되 옵션 1개 변경으로 뒤집기 가능.
- 출력 `RaceInsight`: `kind: 'empty'|'insufficient'|'ready'`(전체 건수 0 / 1~2 / 3+ 기준 — REQ-RI-004) · `finishedBand: {minVoltage, maxVoltage, sampleCount} | null` · `lastFinishedVoltage: number | null` · `streak: ('finished'|'retired')[]`(최신순, result 미정 제외, 표시 상한 상수는 layout 몫) · `trend: {lapTimeMs, panoHz}` 각 `'improving'|'steady'|'worsening'|null`(결측 회차 제외, 판단 불가 시 null=미표시 — 침묵 원칙) · `excluded: {resultPending, lapTimeMissing}`(D3와 무관하게 **항상 산출** — 표기 여부만 UI 결정).
- ⚠️ D2 flag(plan review 필수): advisor 윈도우는 구성상 finished 표본이 항상 1건(desc에서 첫 완주까지 자르므로) → REQ-RI-001 전압대 min~max가 퇴화. D2 확정 시 "전압대 표본은 전체 finished, 추세 표본은 advisor 윈도우" 세분화 여부를 함께 결정해야 함(여기서 결정하지 않음).

## 데이터 모델·API — 변경 없음 (A1)

스키마·repository·keys/queries·동기화 계약 무변경. 카드는 기존 `racesQuery.data` 파생 → REQ-RI-006(삭제/초기화 재계산)은 기존 invalidation 매트릭스가 보장, REQ-NFR-004(오프라인) 자동 충족. 서버 API 0건.

## 신규/수정 파일 (CHANGE_BUDGET 추정)

- S 신규 5: `entities/race-record/model/race-insight.ts`·`race-insight.test.ts`, `features/race-record/ui/RaceInsightCard.tsx`·`RaceInsightCard.test.tsx`·`RaceInsightHelpDialog.tsx`
- S 수정 3: `entities/race-record/index.ts`(export 추가), `features/race-record/ui/index.ts`, `pages/race-detail/ui/RaceDetailPage.tsx`
- M 신규 2: `RaceTrendMiniChart.tsx`·`.test.tsx` / M 수정 3: `race-insight.ts`(+test — 대역 비교 확장), `RaceInsightCard.tsx` 또는 페이지 배선

## 테스트 계획 · REQ Traceability

unit fixture 7종(요구사항 §검증 fixture, 테스트는 관례대로 colocated — `voltage-advisor.test.ts` 전례):

| Fixture | 단언 | REQ |
|---|---|---|
| F1 0건 | `kind='empty'`, 카드 미렌더 | RI-004 |
| F2 1~2건 | `kind='insufficient'`, trend 전부 null, 카피에 '추세' 부재(render) | RI-004 |
| F3 완주·이탈 혼재 3+ | band·lastFinishedVoltage·streak가 목록 원본과 일치 | RI-001·002 |
| F4 result 미정 포함 | 미정 행 band·streak 미포함 + `excluded.resultPending` 정확 | RI-005(D3) |
| F5 lapTimeMs 일부만 | 결측 제외 방향 판정, 표본 부족 시 null | RI-003 |
| F6 동일 전압 반복 | band min=max 단일값 안정 처리 | RI-001 |
| F7 20+건 누적 | 입력 배열 불변·순서 보존·O(n) 동작 | NFR-003 |

- `selectAdviceWindow` 회귀 테스트: 페이지 인라인(155-161행)과 동일 결과(완주 포함 slice/폴백 5건) — D2 정합·추출 refactor 안전망.
- 컴포넌트 render(U2): empty 미렌더 / insufficient 카피 / ready 3요소 우선순위 / 제외 고지 문구(D3 기본안) / 기호+텍스트 병행(색 단독 금지, NFR-002) / formatVoltage 표기 일치.
- M render(U3): 0~1점 미렌더·결측 점 생략·aria-hidden(RI-101), 대역 비교 unit(RI-102).
- REQ-RI-006·007, NFR-001, D2 삼자 대조(요약↔목록↔추천), A2 확인: Phase 2 프로토타입 수동 검토(ux-brief 목록 1~7) + 실기기 열람은 `DEPLOY_ONLY`(NFR-005, owner 사용자).

## D1~D3 영향표

| 미결 | U1 계산 | U2 카드 | U3·U4 (M) | U5 배선 | 테스트 |
|---|---|---|---|---|---|
| D1 크기 | 영향 없음 | 영향 없음 | **존재 여부 자체** | M이면 차트 배선+수직 예산 재실측 | M 테스트 편입 여부 |
| D2 윈도우 | `sampleWindow` 옵션 값 1곳 | 근거 문구([보는 법] 설명) | 차트 표본 범위 | 없음 | F3·F5 기대값 재산출 + ⚠️ band 퇴화 flag 해소 필요 |
| D3 미정 표기 | 없음(excluded 항상 산출) | 고지 문구 렌더 여부만 | 없음 | 없음 | render 단언 1건 토글 |

## Won't (재확인)

모터 간 비교·`/race` 목록 확장·세션/대회 구조·추천 로직 변경·신규 저장 필드 — 전부 범위 외(requirements §비목표).
