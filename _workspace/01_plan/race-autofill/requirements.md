# Requirements — 레이스 자동 입력 (race-autofill, Phase 1)

> 근거: planning-context.md(2026-08-01)·DL-033~038 확정. 구현 금지 — 요구사항만.
> 프리필 근거는 **결정론 파생만**(DL-036), 목표는 팝업 유지+추천 표시(DL-037), 체크리스트는 비저장 표시 전용(DL-038), L1(자동 저장 없음) 유지. (기록 주체: 오케스트레이터 대필 — ownership hook.)

## Modes
- LOCAL_DOMAIN_STATE_MODE: true (기존 IndexedDB RaceRecord 읽기 파생만 — 신규 저장 0)
- TIMESERIES_MODE: false / ANALYTICS_BUILDER_MODE: false / EXTERNAL_DATA_INGESTION_MODE: false
- AI_MODE: false — 이 과제 범위에서 LLM 자동 호출 없음(기존 on-demand [AI 추천]은 범위 외 현행 유지)

## 서비스 개요 (이번 과제 범위)
- 가치: [+ 기록] 진입 시 기록이 말해주는 기본값(추천 목표·주행 전 체크리스트)을 받아 **확인만 하고 출발**.
- 사용자: 본인 단독, 트랙사이드 모바일 한 손.
- 시나리오: ① 이탈 반복 → 팝업에서 "완주" 추천 배지+근거 확인 후 선택 ② 완주 연속·추세 양호 → "속도" 추천 ③ 직전 이탈 사유 기반 점검 항목을 시트에서 확인·체크(비저장) 후 [입력].
- 성공 조건: 진입 추가 대기 0 / 프리필 값 저장 전 전부 가시·1탭 수정 / 자동 저장 0건.

## 목표 / 비목표
- 목표: ② 목표 추천 표시, ③ 체크리스트 파생·표시. ① 전압은 **작업량 0**(DL-034/036 — 기존 advisor 현행).
- **Won't**: 자동 저장 / [+ 기록] 시 LLM 자동 호출 / 체크 상태 저장(스키마·동기화·migration 무변경) /
  전압 프리필·advisor 로직 변경 / edit 모드 프리필 / 첫 기록(이력 0건) 경로 변경 / 팝업 스킵.

## 핵심 산출 1 — 목표 추천 규칙 (결정론·설명 가능)
입력: `computeRaceInsight` 산출물(streak·finishedBand·trend — **재계산 금지, selector 재사용**) + 최신 이탈 회차의 `resolveSpeedRelated(retireReason)`. result 미정·사유 미입력 회차는 insight가 이미 제외/결측 처리.

**침묵 임계(전제)**: `insight.kind !== 'ready'`(전체 3건 미만) 또는 `streak.length < 3` → **추천 없음**(현행 팝업 그대로). 근거: 기존 경계(INSIGHT_READY_MIN=3·TREND_MIN_SAMPLES=3) 재사용 — 새 임계 발명 금지, R22 침묵 원칙 계승.

규칙(우선순위순 첫 매치, streak는 최신순):

| # | 조건 | 추천 | 근거 한 줄(예시 카피 — 확정은 layout) |
|---|---|---|---|
| R1 | streak[0..1] 모두 retired (**2연속 이탈**) | finish | "최근 2연속 이탈 — 완주 우선 권장" |
| R2 | streak[0]=retired 1회 & 사유 speedRelated=**true** | stability | "직전 이탈(속도 연관) — 안정 권장" |
| R2' | streak[0]=retired 1회 & speedRelated=false 또는 사유 없음 | **침묵** | 기계·미상 원인은 체크리스트 담당 — 목표 변경 근거 아님 |
| R3 | streak[0..2] 모두 finished (**3연속 완주**) & trend.lapTimeMs ≠ 'worsening' | speed | "3연속 완주·추세 양호 — 속도 도전 가능" |
| R4 | streak[0..2] 모두 finished & trend.lapTimeMs = 'worsening' | stability | "완주 유지 중·랩타임 추세 하락 — 안정 권장" |
| R5 | 그 외(혼조) | **침묵** | 판단하지 않는다 |

임계 근거(확정 제안): 보수 전환 N=2 — 1회는 단발 노이즈, 2연속이 "반복" 관찰 최소 표본이며 3연속 대기는 트랙사이드 3판 낭비. 공격 전환 N=3 — 오추천 비용 비대칭(잘못된 speed 추천은 이탈 유발) → 보수보다 높은 문턱, 기존 3건 경계와 정렬. R3의 null 허용 — lapTime은 옵션 필드라 미기록 사용자를 배제하지 않는다("악화 신호 없음"으로 취급).

## 핵심 산출 2 — 이탈 사유 → 체크리스트 매핑 표 (leaf 11종)
원칙: causal 메타 기반, 앱이 측정하지 않는 세팅은 단정 금지("~확인" 수준). **전압 항목 판정: 전 leaf 미포함** — 전압 수치의 단독 출처는 advisor(DL-034)이고 시트에 이미 프리필+rationale이 있어 중복·상충 채널이 된다. speedRelated=true 계열도 비전압 정비 항목만 담는다.

| leaf | causal | 점검 항목(1~2) |
|---|---|---|
| corner | 속도 과다 | 롤러 상태·스태빌라이저 확인 |
| jump_overshoot | 순수 속도 | 브레이크 세팅 확인 |
| jump_attitude | 밸런스/댐퍼 | 댐퍼 상태 확인 / 무게중심(배터리 위치) 확인 |
| jump_rebound | 속도+댐퍼 | 댐퍼 작동 확인 / 타이어 상태 확인 |
| jump_other | 미상 | 점프 세팅(브레이크·댐퍼) 전반 확인 |
| down_step | 속도 or 밸런스 | 브레이크·무게중심 확인 |
| wave | 속도 or 댐퍼 | 댐퍼·롤러 폭 확인 |
| lane_change | 속도 과다 | 브레이크·롤러 각도 확인 |
| parts | 전압 무관 | 롤러·기어 체결(나사 조임) 확인 |
| stall | 전압 무관 | 배터리 잔량·접점 확인 / 기어 물림·이물질 확인 |
| other | 미상 | 차체 전반 체결·배터리 확인 |

문구는 leaf key → items 상수 맵 1곳(append-only, 도메인 상수 관례 준수). ASSUMPTION AF-A1: 항목 문구는 통상 정비 상식 수준 — 사용자 검토로 조정 가능(맵 1곳 수정).

## 핵심 산출 3 — 체크리스트 선정 규칙
- 윈도우: **최신 5건**의 result 확정 회차(STREAK_LIMIT=5 경계 재사용) 중 retired + retireReason 보유 회차만.
- 중복: leaf 단위 dedupe, 빈도 내림차순 → 동률 시 최신 우선. **상위 2개 사유** 채택.
- 상한: 총 **3항목**(초과 시 후순위 사유의 항목부터 절삭 — 수직 예산).
- 근거 표기: 사유 그룹당 한 줄 "최근 이탈: {retireReasonRowLabel} ×n".
- 유효 사유 0건(이탈 없음·사유 미입력만) → 블록 **비노출**(D5 확정 제안: 침묵. 고정 일반 항목은 매번 동일해 무시되고 수직 예산만 소모 — R22 정합).

## 기능 요구사항 (Must — 전부 LOCAL_VERIFIABLE, fixture 주입 mock 검토로 검증)
- [ ] **REQ-AF-001** 목표 추천 selector — 위 규칙 표의 결정론 순수 함수(`{goal, rationale} | null`), 저장·IO 없음.
  - AC: Given 이탈 2연속 fixture, When 팝업 오픈, Then finish에 추천 배지+근거 1줄. Given 3연속 완주+추세 양호, Then speed 추천. 동일 입력 → 동일 출력. [LOCAL_VERIFIABLE]
- [ ] **REQ-AF-002** 추천 침묵 — kind≠ready·streak<3·R2'·R5이면 null.
  - AC: Given 이력 2건 fixture, Then 추천 UI 요소 0(현행과 동등 렌더). [LOCAL_VERIFIABLE]
- [ ] **REQ-AF-003** RaceGoalSheet 추천 표시(D4 해소) — 직전 목표 contained 강조는 **현행 유지**, 추천은 별도 배지 "추천"+캡션 근거로 병기. 동일 버튼이면 두 표기 공존. 선택 탭은 항상 사용자, 자동 진행 없음.
  - AC: Given 추천=speed·직전=finish, Then finish=contained, speed=배지+근거, 어느 쪽도 자동 선택되지 않음. [LOCAL_VERIFIABLE]
- [ ] **REQ-AF-004** 체크리스트 파생 selector — 매핑 표+선정 규칙의 결정론 순수 함수.
  - AC: Given 최근 5건 중 jump_attitude×2·stall×1, Then 댐퍼·무게중심+배터리 항목 총 ≤3, 근거 라벨 "점프 · 공중 자세 무너짐 ×2". [LOCAL_VERIFIABLE]
- [ ] **REQ-AF-005** 시트 체크리스트 블록 — 체크 가능하되 **ephemeral**(닫힘·저장 시 소멸), RaceRecord·draft·스키마 무영향, "표시 전용" 명시 카피.
  - AC: Given 체크 후 [입력] 저장, Then 저장 기록에 체크 관련 필드 부재·기존 스키마 그대로. 재오픈 시 초기화. [LOCAL_VERIFIABLE]
- [ ] **REQ-AF-006** 체크리스트 비노출 — 유효 사유 0건이면 블록 자체 미렌더(D5).
  - AC: Given 완주만 5건, Then 체크리스트 DOM 부재, 시트 높이 현행 동등. [LOCAL_VERIFIABLE]
- [ ] **REQ-AF-007** 프리필 후 사용자 우선(A3) — 파생·프리필은 오픈 시 1회, 사용자 수정 후 재덮어쓰기 금지. 측정 왕복 복귀 시 체크리스트는 동일 입력 재파생(결정론 — 동일 결과), 전압 재추천은 현행 로직 그대로.
  - AC: Given 사용자가 값 수정, When 다른 필드 조작, Then 수정값 유지. [LOCAL_VERIFIABLE]
- [ ] **REQ-AF-008** 전압·기존 경로 무회귀 — openWithGoal 프리필·[AI 추천]·edit·첫 기록 흐름 변경 0.
  - AC: 기존 게이트 전건 통과 + edit/첫 기록 fixture에서 신규 UI 미노출. [LOCAL_VERIFIABLE]

## 상태 요구
- REQ-AF-S01 추천 침묵 시 잔여 placeholder 없음(현행 팝업과 동일). S02 체크 상태는 세션 한정 ephemeral. S03 결측(result 미정·사유 없음)은 규칙 입력에서 제외 — 오류 아님, 조용히 축소.

## 비기능 요구사항
- REQ-AF-N01 즉시성: 전 파생 동기 순수 계산(네트워크·비동기 0) — 진입 추가 대기 없음. [LOCAL]
- REQ-AF-N02 오프라인: 기내 모드에서 추천·체크리스트 완전 동작. [LOCAL]
- REQ-AF-N03 수직 예산: 체크리스트 ≤3항목+근거, 팝업 추천은 기존 버튼 내 캡션 — 상세 배치는 layout 단계. [LOCAL]
- REQ-AF-N04 a11y: 추천 배지 색상 외 텍스트 병기, 체크 항목 checkbox role+라벨·44px, 근거 텍스트 SR 접근 가능. [LOCAL]

## 미결 연결
- D4 → REQ-AF-003으로 해소 제안(직전=contained 유지, 추천=배지 병기). D5 → REQ-AF-006으로 해소 제안(비노출). 두 건 모두 사용자 최종 확인 후 decision-log 등재 권고.
