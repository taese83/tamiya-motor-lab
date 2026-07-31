# change-journal — route-builder

> 기록 주체: 오케스트레이터 대필 — subagent의 저널 Write가 enforce-agent-ownership hook에
> 차단되어(execution-contract "subagent가 부분 능력으로 계약을 못 채우면 현재 agent가 완결")
> 반환된 저널 원문을 그대로 기록한다.

## 2026-07-31 R17 모터 상세 '최근 파노' 히어로 배선 (ui-change)
- MODIFIED: src/pages/motor-detail/ui/MotorDetailPage.tsx — additive 3곳:
  1. import에 `LatestPanoHero`(@features/motor-management/ui) 추가(알파벳: ConditionSummary–PanoLineChart 사이).
  2. `const records = recordsQuery.data` 다음 줄에 `latestRecord` 파생 —
     `records !== undefined && records.length > 0 ? records[records.length - 1] : undefined`
     (measuredAt asc 배열의 마지막 = 최신, noUncheckedIndexedAccess 안전).
  3. fixedTop 영역, ConditionSummary 다음·'파노 추세' SectionHeading+PanoLineChart 앞에
     `{latestRecord !== undefined && <LatestPanoHero panoHz=… measuredAt=… rpm=… />}` 삽입.
- 보존(무회귀): 고정 셸(pageShellSx/fixedTopSx/scrollAreaSx/footerSx)·PageHeader·하단 고정 [측정]·
  PanoLineChart·기록 목록(canonical 텍스트, ≤20행 역순·회차 규칙)·밀어서 삭제(v2.38)·측정 왕복(v2.5)·
  ConditionSummary·not-found/error/corrupted/pending 분기. import 정렬 외 재포맷 없음, 3곳 순수 추가.
- 위임: 계약 선고정 병렬(component-builder∥route-builder). subagent 저널 Write는 hook 차단 → 반환 원문 대필.
- EVIDENCE: Node 22 pin 게이트 4종 PASS(123 tests) + check-iterate-scope OK(소스 3건 = ALLOWED_PATHS).
  프리뷰(:8082) 실측: /motors/:id에 IndexedDB fixture 주입(모터 1 + 측정 6, 최신 309.0Hz) 후 히어로가
  ConditionSummary 아래·차트 위에 렌더, DOM 순서 '최근 파노'→'파노 추세' 확인. 히어로 값 == 목록 최신행 == 차트 마지막 점.
  (모터 목록/상세 진입은 로그인+서버데이터라 DEPLOY_ONLY — 페이지 렌더 자체는 fixture로 LOCAL 검증.)
