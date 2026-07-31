# Requirements — 레이스 인사이트 (minicar-motor-lab, Phase 1)

> 근거: `_workspace/01_plan/race-insight/planning-context.md`, decision-log DL-007~DL-011.
> 새 제품 결정 없음 — 미결정은 D1~D3로 유지. 열람 인사이트이지 추천 재발명이 아니다(voltage-advisor 기존 유지).
> (기록 주체: 오케스트레이터 대필 — ownership hook 차단으로 requirements-analyst 반환 본문 저장.)

## Modes
- LOCAL_DOMAIN_STATE_MODE: true (기존 유지) · TIMESERIES_MODE: false · ANALYTICS_BUILDER_MODE: false · AI_MODE: false · EXTERNAL_DATA_INGESTION_MODE: false

## 서비스 개요
- 가치: `/race/:motorId` 상세 진입 시 **스크롤 없이** 이 모터의 완주 전압대·최근 추세를 파악해 다음 판 전압을 결정한다(DL-007 pain 단일 확정).
- 사용자: 본인(미니사구 레이서) — 트랙사이드, 폰 한 손, 즉석 열람(DL-008).
- 시나리오: ① "지난번 몇 V에서 완주했지?" 즉답 ② 최근 완주/이탈 흐름 확인 ③ 랩타임·파노가 좋아지는 방향인지 확인.
- 성공 조건(관찰 가능): 375×667에서 요약+목록 첫 행 동시 노출, 요약 수치가 목록·입력 시 추천과 모순되지 않음(D2).

## 비목표 (Won't)
- 대회/세션 구조(회차 그룹핑, 새 엔티티·migration) — DL-007에서 미선택
- 입력 흐름 변경([+ 기록]→목표 팝업→추천→시트 유지), 신규 저장 필드·스키마·동기화 계약 변경(A1)
- 모터 간 비교, `/race` 목록 요약 확장, 전압 추천 로직 재발명·변경, 데스크톱 분석 대시보드·metric 편집기

## 기능 요구사항

### Must Have (S안 — D1에서 S 이상 선택 시 확정)
- [ ] REQ-RI-001 완주 전압대 요약 — finished 회차의 전압 min~max + 가장 최근 완주 전압(A2; goal·랩타임은 보조 표기)
  - Given 완주·이탈 혼재 fixture(3+건), When 상세 진입, Then 요약 카드에 완주 전압 범위와 최근 완주 전압이 목록 원본과 일치하게 표시. `LOCAL_VERIFIABLE`
- [ ] REQ-RI-002 최근 결과 흐름 — 최근 회차들의 완주/이탈 스트릭 표시
  - Given 혼재 fixture, When 상세 진입, Then 최신순 결과 흐름이 목록 순서와 일치. 색 단독 구분 금지(텍스트/기호 병행). `LOCAL_VERIFIABLE`
- [ ] REQ-RI-003 추세 방향 — 랩타임/파노가 좋아지는 중인지 방향 텍스트(수치 나열이 아닌 방향 요약)
  - Given lapTimeMs 일부만 존재 fixture, When 상세 진입, Then 결측 회차 제외 기준으로 방향 텍스트 표시, 판단 불가 시 미표시(오독 유도 금지). `LOCAL_VERIFIABLE`
- [ ] REQ-RI-004 표본 부족 상태 — 0건: 요약 미노출(기존 "첫 기록" 안내만) / 1~2건: "기록이 더 쌓이면" 축약 표시(추세 미표시)
  - Given 0건·1건·2건 fixture 각각, When 상세 진입, Then 위 상태 계약대로 분기하고 1~2건을 "추세"로 표시하지 않음. `LOCAL_VERIFIABLE`
- [ ] REQ-RI-005 partial 데이터 제외 표기 — result 미정·lapTimeMs 없는 회차는 해당 통계에서 제외하고 **제외 n건 고지**(D3 기본 제안; 무표기 제외로 뒤집힐 수 있음)
  - Given result 미정 포함 fixture, When 상세 진입, Then 미정 행이 전압대·스트릭에 미포함되고 제외 건수 문구 표시. `LOCAL_VERIFIABLE`
- [ ] REQ-RI-006 삭제/초기화 직후 재계산 — 개별 삭제·[초기화] 후 요약이 즉시 재계산(stale 금지)
  - Given 3+건 표시 상태, When 최근 완주 회차 삭제 또는 전체 초기화, Then 요약이 새 데이터 기준으로 즉시 갱신(초기화 시 0건 상태로 복귀). `LOCAL_VERIFIABLE`
- [ ] REQ-RI-007 기존 흐름 무변경(baseline 보존) — 헤더 [+ 기록] 주 행동·목록·입력/수정 흐름·하단 초기화 푸터·로그인 게이트 현행 유지, 요약은 스크롤 영역 상단의 파생 표시 전용. loading은 기존 racesQuery pending 공유(별도 스피너 금지), error는 기존 Alert 경로
  - Given 기존 상세 화면, When 요약 추가 후 전 흐름 재검토, Then 기존 인터랙션·상태 경로 변화 없음. `LOCAL_VERIFIABLE`

### Should Have (M안 — NEEDS_DECISION D1 결정 종속)
- [ ] REQ-RI-101 미니 차트 1개 — 회차 X축(전압×결과 또는 랩타임 추이), @mui/x-charts 기존 패턴 준용(신규 의존성 없음). 0~1점 미렌더, 결측 점 생략+연결 규칙 명시, 2+점만 렌더. `LOCAL_VERIFIABLE`
- [ ] REQ-RI-102 완주 vs 이탈 전압 대역 비교 표시. `LOCAL_VERIFIABLE`

### Could Have
- 없음(범위 고정 — split 시 M항목이 2차 단위)

## 비기능 요구사항
- REQ-NFR-001 모바일 한 손/한눈: 375×667에서 요약+목록 첫 행 동시 노출(스크롤 없이). 요약 카드 1~2장 이내. `LOCAL_VERIFIABLE`
- REQ-NFR-002 a11y: 차트는 aria-hidden + canonical=텍스트(차트 단독 정보 전달 금지, PanoLineChart 계약 준용), 결과 구분에 색 단독 사용 금지. `LOCAL_VERIFIABLE`
- REQ-NFR-003 성능: 파생 계산은 렌더 중 O(n) 순수 함수(n=회차 수). RaceRecord는 rolling 상한 없음 — 20+건 누적 fixture로 확인, 정렬 재수행·중첩 순회 금지. `LOCAL_VERIFIABLE`
- REQ-NFR-004 오프라인: 로컬 IndexedDB 읽기 파생만 — 네트워크 없이 동일 동작. `LOCAL_VERIFIABLE`
- REQ-NFR-005 저장·동기화 계약 무변경: 신규 엔티티/필드/migration/production mutation 없음(A1). 실기기·로그인 실데이터 열람 확인은 `DEPLOY_ONLY`(읽기 전용, owner: 사용자).

## 화면 목록
1. `/race/:motorId` 레이스 상세 — 스크롤 영역 상단에 파생 요약 블록(S) + 미니 차트(M, D1 종속). 유일한 변경 화면.

## API 필요 목록
- 없음 — 서버 API 신설·변경 없음. 기존 로컬 RaceRecord query(racesQuery)의 읽기 파생 전용.

## Open Items (요구사항 연결)
- ASSUMPTION A1 → REQ-RI-007, REQ-NFR-005 (검증 완료: plan review 2026-07-31 — 스키마 무변경 확인)
- ASSUMPTION A2 → REQ-RI-001 "최적 세팅" 정의 (검증: fixture 검토에서 사용자 확인)
- ~~NEEDS_DECISION~~ **D1 확정(2026-07-31, DL-012)**: split — 1차 S(Must), 2차 M(REQ-RI-101·102)은 S 검토 후 별도 라운드
- ~~NEEDS_DECISION~~ **D2 확정(2026-07-31, DL-013)**: 세분화 — REQ-RI-001 전압대 표본=**전체 finished 회차** / REQ-RI-003 추세 표본=advisor 동일 윈도우(selectAdviceWindow 공유). [보는 법]에 기준 2개 설명
- ~~NEEDS_DECISION~~ **D3 확정(2026-07-31, DL-014)**: 제외 + 건수 고지 → REQ-RI-005 그대로

## 검증 fixture (DL-010)
0건 / 1~2건 / 완주·이탈 혼재 / result 미정 포함 / lapTimeMs 일부만 / 동일 전압 반복 / 20+건 누적 / **3+건 완주 0건(전부 이탈·미정 — band null 카드 표현)** / **삭제로 3→2건 경계 전환(ready→insufficient)** — 격리 seed로만 검토, 실데이터 변경 금지. (마지막 2종은 plan review 2026-07-31 보강)
