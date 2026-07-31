> **폐기(2026-07-31, 사용자 결정)** — 본 기획은 구현 착수 단계에서 폐기됨. 소스 변경분은 전량 원복(0 diff). 재개 시 이 문서를 다시 검토.

# 모터 길들이기(Break-in) 기능 기획 — v2 (2026-07-31, 사용자 개정)

사용자 확정: **표준 가이드 없음 — 자신의 노하우(레시피)를 만들어 저장·재사용**.
완료 판정 = 파노 상승 정체(+1%×2회) + 목표 수치(선택) / 타이머 세션 / 세션은 메모리(새로고침 소실).

## 1. 핵심 개념

### 노하우(레시피) — 사용자 자산
- 레시피 = 이름 + **사이클 목록**(1개씩 직접 구성). 저장해 두고 어느 모터에든 재사용.
- **사이클 구성 요소**(사용자 정의):
  - 설정 전압 (V — 기존 VOLTAGE_RANGE 0.1~9.9 재사용)
  - 구동 시간 (초/분)
  - 회전 방향 (정방향/역방향 — 극성 반전은 사용자가 직접, 앱은 지시만)
  - 휴식 시간 (0이면 생략)
  - 캐미컬 추가 (예/아니오 — 지시 단계)
  - 세척 (예/아니오 — 지시 단계)
  - 측정 (예/아니오 — 왕복 측정 재사용)
- 사이클 실행 순서(고정): **구동(전압·방향·시간) → 휴식 → 캐미컬 → 세척 → 측정**
  (사용자 나열 순서 준수. 캐미컬/세척/측정은 해당 사이클에 켠 경우만 등장)

### 세션 (타이머 모드, 메모리 상태)
- 레시피 선택(또는 새로 만들기) → 목표 파노(선택) → 시작.
- 구동/휴식 = 카운트다운 타이머(종료 시각 기준 — 백그라운드 복귀에도 정확).
- 캐미컬/세척 = 지시 + [완료] 탭. 측정 = 왕복(origin 'break-in') 후 자동 복귀.
- 측정 사이클마다 판정 배너: "+N% 상승 — 계속" / "정체 — 완료 권장" / "목표 도달!".
- [중단] 상시. 종료(완료·중단) 시에만 세션 기록 저장 — 진행 중 상태는 비영속(확정 ③).

### 완료 판정 (확정 ②)
- 정체: 측정 사이클 기준 직전 대비 상승 +1% 미만 × 2회 연속 → 완료 권장.
- 목표: targetPanoHz 입력 시 도달 즉시 완료.

## 2. 데이터 (additive — IndexedDB v3 + 서버 migration 004)

```
BreakInRecipe  {id, name, cycles: BreakInCycle[], createdAt, updatedAt}   // 전역 자산
BreakInCycle   {voltageV, runSec, direction: 'forward'|'reverse', restSec,
                chemical: boolean, wash: boolean, measure: boolean}
BreakInSession {id, motorId, recipeName, cycles(스냅샷), targetPanoHz?,
                results: [{cycleIndex, panoHz, rpm, stabilityCv?, measuredAt}],
                startedAt, endedAt, outcome: 'finished'|'stalled'|'target-reached'|'aborted'}
```
- IndexedDB: `breakInRecipes`(전역) + `breakInSessions`(by-motorId) — **DB v3 additive upgrade**.
- 서버: `break_in_recipes`·`break_in_sessions`(JSONB cycles/results) — migration 004, 스냅샷 동기화 포함.
- 삭제 계약: deleteMotorCascade → 해당 모터 세션 삭제 / resetAllRecords → 세션만 삭제(레시피는 자산이라 유지).
- 측정 사이클 값은 일반 측정 기록에도 수집(기존 차트·컨디션 기준선 흡수).

## 3. 화면 (MVP)

1. 모터 상세: [길들이기] 진입 → **레시피 선택 시트**(저장된 노하우 목록 + [새 노하우 만들기]).
2. **레시피 편집기**: 이름 + 사이클 리스트(추가/수정/삭제/복제) — 사이클 폼(위 7요소).
3. **세션 페이지** `/motors/:id/break-in`: 단계 대형 타이머/지시, 사이클 진행(n/총), 파노 추이, 판정 배너, [중단].
4. 완료 화면: 시작→최종 파노(+상승률)·사이클 수·소요 시간 → 모터 상세 복귀(이력 표시).

## 4. 구현 순서 (MVP)

A. 도메인 상수·엔티티 스키마·IndexedDB v3·서버 004·동기화 확장 (데이터 계층)
B. 세션 상태 머신(타이머·단계 진행·판정) + 왕복 origin 'break-in' 확장
C. UI: 레시피 시트·편집기 → 세션 페이지 → 완료·이력 → 게이트·배포

후속: 레시피 공유, 종류별 추천, 백그라운드 알림.
