# Planning Context — 레이스 인사이트 (minicar-motor-lab, 2026-07-31)

> Phase 1 planning only. 원 사양은 `_workspace/01_plan/revision-v2-brief.md` §3(R-1~R-7), 결정 이력은
> `_workspace/01_plan/decision-log.md` "2026-07-31 레이스 개선 기획" 섹션(DL-007~DL-011).
> (기록 주체: 오케스트레이터 대필 — planning-facilitator의 race-insight/ 하위 쓰기가
> enforce-agent-ownership hook에 차단되어 반환 본문을 그대로 저장.)

## Product Frame

- 대상 화면/기능: `/race/:motorId` 레이스 상세(주 대상 — 목록 위 파생 요약/인사이트). `/race` 목록은 현행 유지.
- 주 사용자: 사용자 본인(미니사구 레이서) — 트랙 옆에서 폰 한 손 조작, 속도 중요.
- 끝내려는 업무: 다음 판 세팅(특히 전압)을 결정할 때 이 모터의 과거 기록을 즉시 참고한다.
- 현재 pain(사용자 단일 선택, 2026-07-31 intake): **기록 열람이 목록뿐** — 회차가 쌓여도 추세·비교가 안 보임. "지난번 몇 V에서 완주했지?", "전압 올리면 이탈했었나?", "랩타임이 좋아지고 있나?"에 답하려면 스크롤·암산 필요. (입력 번거로움·대회 구조·기록 항목 부족은 선택 안 함 → Won't/후순위.)
- 관찰 가능한 성공 조건: 레이스 상세 진입 시 **스크롤 없이** 이 모터의 최적 세팅(완주 전압대)·최근 추세를 파악하고 다음 판 전압을 결정할 수 있다. 모바일 한눈 요약이지 데스크톱 분석 대시보드가 아니다.

## Mode 판별 (기록)

TIMESERIES_MODE false(소량 로컬 회차 데이터) · ANALYTICS_BUILDER_MODE false(고정 인사이트, metric 편집기 아님) · AI_MODE false · LOCAL_DOMAIN_STATE_MODE true(기존 유지) · EXTERNAL_DATA_INGESTION_MODE false · VISUAL_QA_MODE false.

## Evidence Inventory

| Source/annotation | 확인한 사실 | 신뢰 범위 | 후속 검증 |
|---|---|---|---|
| `src/entities/race-record/model/schema.ts` | RaceRecord = panoHz(불변)·result(optional, 완주/이탈)·voltage(0.1~9.9V, 소수2)·lapTimeMs(optional, ≤1h)·goal(optional, 완주/안정/속도)·createdAt(정렬 키). 수정은 result·voltage·lapTimeMs만 | 코드 직접 확인 | — |
| `src/pages/race-detail/ui/RaceDetailPage.tsx` | 고정 셸(헤더/스크롤 목록/하단 초기화 푸터), 최신순 목록, [+ 기록]→목표 팝업→전압 추천→입력 시트. **스크롤 영역 상단이 요약 삽입 후보** | 코드 직접 확인 | layout에서 고정 셸 높이 예산 확인 |
| `src/shared/lib/voltage-advisor/` + RaceDetailPage v2.31~v2.37 | **입력 시점 전압 추천은 이미 존재**(파노↔전압 최소제곱 학습, 지수 가중, 윈도우=최근 완주까지·폴백 5건, LLM 하이브리드) | 코드 직접 확인 | 이번 과제는 추천 재발명이 아니라 **열람 인사이트** — 요약 수치가 추천 근거와 모순되지 않게 윈도우 정합 검토(D2) |
| `src/features/motor-management/ui/PanoLineChart.tsx` | ⚠️ intake 전제 정정: 자체 SVG 아님 — v2.3에서 **@mui/x-charts LineChart로 교체됨**(회차 X축, aria-hidden, canonical=리스트 텍스트, 차트 단독 사용 금지). 의존성 이미 도입 → M안 차트에 신규 의존성 불필요 | 코드 직접 확인 | M안 채택 시 동일 a11y 계약 준용 |
| `RaceMotorList.tsx`/`RacePage.tsx` | `/race` 목록은 모터별 마지막 레이스 요약(파노 주/결과·전압·랩타임 부) 이미 제공, 종류 필터·정렬 공유 | 코드 직접 확인 | 목록 화면 변경은 이번 범위 외 |
| `revision-v2-brief.md` §3·데이터 모델 | RaceRecord에는 rolling 상한 **없음**(≤20은 MeasureRecord만 — MEASURE_RECORD_LIMIT=20, plan review 정정) — 회차 무제한 누적 가능 | 문서+스키마 정합 | 요약 표본 윈도우 결정 필요(D2) |
| 2026-07-31 intake | pain 단일 선택·현장 즉석 맥락·크기 사용자 선택 — 확정 답변, 재질문 금지 | 사용자 확정 | — |

## UX Check

(trigger: 목록+파생 요약+차트 후보 — 정보 밀도 높은 화면)

- 첫눈에 알 수 있어야 하는 것: ① 완주한 전압대(최근 완주 전압 포함) ② 최근 결과 흐름(완주/이탈) ③ 랩타임·파노가 좋아지는 중인지 방향.
- 다음 행동이 보이는가: [+ 기록]이 여전히 헤더의 주 행동 — 요약은 참고 표시이지 새 행동 진입점이 아니다. 요약이 목록 첫 행을 뷰포트 밖으로 밀어내면 실패.
- 실수하거나 오해할 지점: result 미정·lapTimeMs 없는 회차가 통계를 왜곡(표본 제외를 표기해야 함) / 표본 1~2건을 "추세"로 오독 / 열람 요약 수치와 입력 시 전압 추천 수치가 달라 보이면 불신(윈도우 정합 D2).
- 먼저 정할 방향: 요약은 **저장 없는 파생 표시 전용**(스키마·동기화 무변경), 카드 1~2장 이내, 기존 목록·입력 흐름은 그대로 유지.
- prototype/Phase 2에서 확인할 것: 작은 뷰포트(예 375×667)에서 요약+목록 첫 행이 스크롤 없이 보이는지 / 표본 부족(0~2건) 문구 / 요약↔목록↔추천 수치 일치 / 초기화·삭제 직후 요약 즉시 재계산.

## Annotation Review

해당 없음 — 이번 요청에 화면 주석·스크린샷 입력이 없다(텍스트 intake만).

## Critical State Inventory

| Surface | normal | empty | loading | error/partial | permission/destructive |
|---|---|---|---|---|---|
| 상세 요약 블록(S안 기본) | 기록 3+건: 요약 카드 표시 | 0건: 요약 미노출(기존 "첫 기록" 안내만) / 1~2건: "기록이 더 쌓이면" 축약 표시 | 기존 racesQuery pending 공유(별도 스피너 금지) | query error는 기존 Alert 경로 / partial = result 미정·랩타임 없음 행 **제외 + 제외 n건 표기** | 로그인 게이트 기존 유지 / 개별 삭제·[초기화] 후 요약 즉시 재계산(stale 금지) |
| 미니 차트(M안 추가) | 2+점 라인 | 0~1점: 차트 미렌더(PanoLineChart 패턴 — 상위가 텍스트 소유) | 요약 블록과 동일 query | 결측(랩타임 없는 회차)은 점 생략, 연결 규칙 명시 | aria-hidden + canonical=목록 텍스트 계약 준용 |

## Data Review Strategy

- strategy: `mock` — 기존 IndexedDB 로컬 RaceRecord에서 **읽기 파생만**. 신규 엔티티·필드·migration 없음. production mutation 없음(서버 로그인 동기화 스키마 영향 없음).
- fixtures/source and safety: seed fixture 세트 — 0건 / 1~2건(표본 부족) / 완주·이탈 혼재 / result 미정 포함 / lapTimeMs 일부만 존재 / 동일 전압 반복 / 20+건 장기 누적. 격리 fixture로만 검토, 사용자 실데이터 변경 금지.
- Mock→real transition: 사용자 본인 실기기·실데이터(로그인 상태)로 열람 확인 — 읽기 전용이라 전환 위험 없음. owner: 사용자.

## Effort Trade-off

크기는 사용자가 선택한다(intake ③ — "페인 기준 제안 받기"). 비교:

| 안 | 내용 | effort driver | pain 적합도 |
|---|---|---|---|
| **S** | 상세 상단 파생 요약 카드 1장: 완주 전압대(min~max+최근 완주 전압)·최근 결과 스트릭·랩타임/파노 방향 텍스트 | 화면 1·신규 상태 3(부족/partial 포함)·새 계약 없음·파생 계산 순수 함수+테스트 | "몇 V에서 완주했지" 즉답 — pain의 핵심 60~70% 해소 |
| **M** | S + 미니 차트 1개(회차 X축 — 전압×결과 또는 랩타임 추이, x-charts 패턴 준용) + 완주 vs 이탈 전압 대역 비교 | S + 차트 a11y 계약·결측 처리·1점 상태·수직 공간 예산(스크롤 없이 조건과 긴장) | "추세가 보이나"까지 해소 — pain 전체 대응 |
| L | 세션·대회 구조(회차 그룹핑, 새 엔티티·migration) | 새 도메인·저장 구조·입력 흐름 변경 | **사용자가 pain으로 선택 안 함 — Won't** |
| production integration delta | 없음 — 로컬 파생 전용, 동기화 계약 무변경 | — | — |

- rough size: S 또는 M (L은 범위 외)
- recommendation: **split** — S(요약 카드)를 최소 가시 검토 단위로 먼저 만들어 검토하고, "추세" 갈증이 남으면 M의 차트를 2차로 얹는다. M을 한 번에 가도 위험은 낮으나(의존성·데이터 무변경) 수직 공간 예산은 S 검토에서 먼저 확인하는 편이 안전하다.
- smallest visible review: 요약 카드 1장 + fixture 4종(0건/부족/혼재/미정 포함) 상태 전환.

## Open Decisions

- ASSUMPTION A1: 인사이트는 저장 없는 파생 전용(스키마·동기화 무변경) — 검증: plan review에서 확인.
- ASSUMPTION A2: "최적 세팅" 1차 정의 = finished 회차의 전압 범위 + 가장 최근 완주 전압(goal·랩타임은 보조 표기) — 검증: fixture 검토에서 사용자 확인.
- NEEDS_DECISION D1 (사용자, 최우선): 크기 선택 — S 단독 / split(S→M) / M 일괄.
- NEEDS_DECISION D2: 요약 표본 윈도우 — 전체 누적 vs voltage-advisor와 동일 윈도우(최근 완주까지·폴백 5건). 추천과 요약이 다른 근거를 말하면 불신 → advisor 정합이 기본 제안.
- NEEDS_DECISION D3: result 미정 회차 표기 — 제외+건수 고지(기본 제안) vs 무표기 제외.
- BLOCKER 해소(2026-07-31): 산출물 경로는 `race-insight/` 하위로 확정 — 쓰기는 오케스트레이터 대필(DL-011).

## Current Planning Memo

- 확인된 요구: 레이스 상세에 스크롤 없는 파생 요약(완주 전압대·최근 흐름·추세 방향). 열람 인사이트이지 추천 재발명·대시보드·대회 구조 아님.
- 빠진 시나리오: 모터 간 비교(여러 모터 세팅 비교)는 언급 없음 — 범위 외로 두되 plan review에서 Won't 명시. `/race` 목록 요약 확장도 범위 외.
- 가정과 검증: A1·A2는 fixture 기반 plan/prototype 검토로 검증. PanoLineChart 전제 정정(@mui/x-charts 기도입)은 Evidence Inventory에 기록됨.
- 다음 질문/행동: ① D1(크기) 사용자 선택 ② D2·D3는 기본 제안 채택 여부만 확인 ③ 이후 layout-designer가 요약 카드 배치(고정 셸 상단)·수직 예산 결정.
