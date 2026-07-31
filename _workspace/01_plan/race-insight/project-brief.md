# Project Brief — 레이스 인사이트 (minicar-motor-lab, Phase 1 통합)

> Phase 2(디자인) 단일 진입점. 상세는 원 문서 참조: `planning-context.md`(맥락·증거) · `requirements.md`(REQ) ·
> `ux-brief.md`(플로우·상태 UX) · `feature-plan.md`(딜리버리·계약) · `tech-note.md`(스택 판정).
> 새 결정 없음 — 미결은 §미결정. Mode: LOCAL_DOMAIN_STATE_MODE true(기존 유지), 그 외 전부 false.
> (기록 주체: 오케스트레이터 대필 — ownership hook, DL-011.)

## 한 단락 요약

기록 열람이 목록뿐이라(pain 단일 확정, DL-007) 회차가 쌓여도 "몇 V에서 완주했지 / 전압 올리면 이탈했었나 / 좋아지는 중인가"에 스크롤·암산이 필요하다. 해법은 `/race/:motorId` 스크롤 영역 상단의 **저장 없는 파생 요약 카드**(완주 전압대+최근 완주 전압·결과 스트릭·추세 방향) — 열람 인사이트이지 추천 재발명·대시보드·대회 구조가 아니다. 성공 조건: 375×667에서 요약+목록 첫 행 동시 노출(스크롤 없이), 요약 수치가 목록·입력 시 추천과 모순 없음(D2).

## 범위 스냅샷 (split 권고 — D1 종속)

| Slice | 단위 | 내용 | 최소 가시 검토 단위 |
|---|---|---|---|
| 1차 **S** | U1 파생 계산 · U2 요약 카드 · U5 페이지 배선 | 텍스트 카드 1장 (REQ-RI-001~007) | fixture 4종(0건/부족/혼재/미정) 상태 전환 + 375×667 수직 예산 실측 |
| 2차 **M** | U3 미니 차트 · U4 완주 vs 이탈 대역 비교 | REQ-RI-101·102 — Slice 1 검토 완료 후 | 카드 아래 차트 1개 + 대역 비교 표시 |

**Won't**: 세션/대회 구조 · 입력 흐름 변경 · 신규 저장 필드/스키마/동기화 변경 · 모터 간 비교 · `/race` 목록 확장 · 추천 로직 변경 · 데스크톱 대시보드/metric 편집기 (requirements §비목표).

## 핵심 계약 요약

- **RaceInsight 파생 계약(U1)**: 입력 `races: ReadonlyArray<RaceRecord>`(최신순 desc, repository 보장 — 재정렬 금지, O(n) 1-pass) + `sampleWindow: 'all' | 'advisor'`(D2 파라미터). 출력 `RaceInsight`: `kind('empty'|'insufficient'|'ready')` · `finishedBand{minVoltage,maxVoltage,sampleCount}|null` · `lastFinishedVoltage|null` · `streak[]`(최신순, result 미정 제외) · `trend{lapTimeMs,panoHz}`(각 improving/steady/worsening/null=침묵) · `excluded{resultPending,lapTimeMissing}`(**항상 산출** — 표기 여부만 D3). 상세: feature-plan §파생 계산 계약.
- **FSD owner 맵**: U1 `entities/race-record/model/race-insight.ts`(신규, `selectAdviceWindow` 추출 포함) / U2 `features/race-record/ui/RaceInsightCard.tsx`+`RaceInsightHelpDialog.tsx`(제어형 — insight props 주입, 열림 상태는 페이지 소유) / U3 `RaceTrendMiniChart.tsx`(M) / U5 `pages/race-detail` 배선(route-builder 소유). 상세: feature-plan §FSD.
- **스택 변경 0건**: S·M 모두 의존성 추가·버전·설정 변경 없음(`@mui/x-charts` 9.10.1 기설치, PanoLineChart production 실적). Phase 3 기술 제약 5개는 tech-note §5.
- **baseline 보존(REQ-RI-007)**: [+ 기록] 헤더 주 행동·목록·입력/수정 흐름·하단 초기화 푸터·로그인 게이트 무변경. 요약은 표시 전용 — 새 행동 진입점 아님. 데이터·API 무변경(서버 API 0건, IndexedDB 읽기 파생만 — A1).

## 상태 계약

| 상태 | 화면 | REQ |
|---|---|---|
| 0건 | 카드 미노출 — 기존 "첫 기록" 안내만(빈 카드 금지) | RI-004 |
| 1~2건 | 축약 1줄 + "기록이 더 쌓이면" — '추세' 단어 사용 금지 | RI-004 |
| 3+건 ready | 카드 전체 — 강조는 최근 완주 전압 한 곳만 | RI-001~003 |
| partial | 미정·랩타임 결측 행 통계 제외 + "미정 n건 제외" 고지(D3 기본안) | RI-005 |
| loading | 기존 racesQuery pending 공유 — 요약 전용 스피너/스켈레톤 금지 | RI-007 |
| error | 기존 Alert 경로 — 요약도 목록과 함께 미노출 | RI-007 |
| 삭제/초기화 직후 | 즉시 재계산(stale 금지), 초기화 시 0건 복귀 — 기존 invalidation이 보장 | RI-006 |

## 결정 확정 (2026-07-31, 사용자 — decision-log DL-012~014)

- **D1 = split**: 1차 S(U1·U2·U5) 구현·검토 → 2차 M(U3·U4) 별도 라운드. REQ-RI-101·102는 2차 편입.
- **D2 = 세분화**: 완주 전압대 표본=**전체 finished 회차** / 추세 표본=advisor 동일 윈도우(`selectAdviceWindow` 공유). band 퇴화 flag 해소. `sampleWindow` 파라미터는 지표별로 적용. [보는 법]에 기준 2개 설명.
- **D3 = 제외+건수 고지**: "미정 n건 제외" 보조 문구 표시.
- 잔여 미결: (M 한정) REQ-RI-101 차트 지표(전압×결과 vs 랩타임) — 2차 라운드 착수 시 확정. A2는 S 검토에서 사용자 확인.

## 미결정 (원문 보존 — 위 확정으로 대체됨)

- **D1 (사용자, 최우선)**: 크기 — S 단독 / split(S→M, 전 문서 일치 권고) / M 일괄. REQ-RI-101·102 편입 여부 결정.
- **D2**: 표본 윈도우 — 전체 누적 vs voltage-advisor 동일 윈도우(최신→가장 최근 완주 **포함** slice, 완주 없으면 폴백 5건; 기본 제안=advisor 정합). ⚠️ **flag(plan review 필수)**: advisor 윈도우는 구성상 finished 표본이 항상 1건(desc에서 첫 완주까지 자름) → REQ-RI-001 전압대 min~max 퇴화. D2 확정 시 "전압대 표본=전체 finished, 추세 표본=advisor 윈도우" 세분화 여부를 함께 결정(feature-plan §파생 계산 계약). 또한 `selectAdviceWindow` 추출로 추천 이력·insight 두 소비처가 단일 정의에 자동 동조 — [보는 법] 문구가 이를 설명해야 하는 이유(tech-note §3).
- **D3**: result 미정 회차 표기 — 제외+건수 고지(기본 제안) vs 무표기 제외. `excluded`는 항상 산출 → render 단언 1건 토글.
- **(M 한정)** REQ-RI-101 차트 지표 미결: 전압×결과 vs 랩타임 추이 — M 착수 시 확정(feature-plan).
- **ASSUMPTION A1**: 저장 없는 파생 전용(스키마·동기화 무변경) — 검증: plan review → RI-007·NFR-005.
- **ASSUMPTION A2**: "최적 세팅" = finished 전압 범위 + 최근 완주 전압(goal·랩타임 보조) — 검증: fixture 검토에서 사용자 확인 → RI-001.

## 문서 간 상충

- 실질 상충 없음 — 화면 1개·API 0건·스택 0건·split 권고가 5개 문서에서 일치. 긴장 2건은 이미 미결로 표면화됨: ① D2 기본 제안 vs band 퇴화(위 ⚠️) ② M 차트 높이(200px급) vs NFR-001 수직 예산 — 채택 시 완화(높이 축소·접기)는 layout 소관(ux-brief §S안 vs M안).

## Phase 2로 넘길 것

- **layout**: 요약 카드 배치(고정 셸 스크롤 영역 상단) · 수직 예산 실측(S 먼저) · streak 표시 상한 상수 · M 채택 시 차트 높이 완화안.
- **visual**: 강조 위계 — 최근 완주 전압 단 한 곳(numericTypography 계열 큰 수치), 스트릭은 기호+텍스트(색 단독 금지), 추세는 가장 조용한 텍스트(발화 조건 없으면 줄 생략, ConditionSummary 침묵 원칙). 탭 가능해 보이는 affordance 금지. 수치 표기는 formatVoltage 등 RaceRecordRow와 동일 함수 + tabular-nums.
- **프로토타입 확인**: ux-brief §Phase 2 목록 1~7 그대로 — 375×667 실측(S/M 각각) / fixture 전환·카피 / 요약↔목록↔추천 삼자 대조(D2) / A2 사용자 확인 / 그레이스케일+낭독 순서 / 20+건 지연 / D3 두 안 화면 비교.

## Traceability (REQ ↔ 딜리버리 단위 ↔ 검증)

| REQ | 단위 | 검증 |
|---|---|---|
| RI-001 완주 전압대 | U1·U2 | F3 혼재 · F6 동일 전압(min=max) |
| RI-002 스트릭 | U1·U2 | F3 |
| RI-003 추세 방향 | U1·U2 | F5 랩타임 일부 · F2 trend null |
| RI-004 표본 부족 | U1·U2 | F1 0건 · F2 1~2건('추세' 부재 render) |
| RI-005 제외 표기 | U1·U2 | F4 미정 포함(excluded 정확) |
| RI-006 재계산 · RI-007 baseline | U5 | Phase 2 수동 검토(프로토타입 목록 2) |
| RI-101 차트 · RI-102 대역 | U3·U4 (M) | 0~1점 미렌더·결측 생략·aria-hidden render / 대역 unit |
| NFR-001 한눈 | U5+layout | Phase 2 375×667 실측 |
| NFR-002 a11y | U2·U3 | render 단언 + 그레이스케일·낭독 확인 |
| NFR-003 O(n) | U1 | F7 20+건(입력 불변·순서 보존) |
| NFR-004 오프라인 · NFR-005 계약 무변경 | 전체 | 로컬 파생으로 자동 충족 / 실기기 열람 `DEPLOY_ONLY`(owner 사용자) |
| selectAdviceWindow 추출 | U1·U5 | 회귀 fixture(인라인 155-161행과 동일 결과) 선행 후 치환 |
