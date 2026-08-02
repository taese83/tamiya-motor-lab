# change-journal — route-builder

> 기록 주체: 오케스트레이터 대필 — subagent 저널 Write가 hook 차단되어 반환 원문 기록.

## 2026-07-31 R22
- MODIFIED: src/pages/race-detail/ui/RaceDetailPage.tsx (1파일) — 레이스 인사이트 S 배선 + 동작 보존 치환.
  - 치환: advisor 윈도우 인라인(RECENT_FALLBACK/lastFinishedIdx/slice) → selectAdviceWindow(races). entity 구현이 인라인과 동일(desc→최근 완주 포함 slice, 폴백 5) — adviceHistory·추천 흐름 무변경.
  - 배선: computeRaceInsight(races) 파생 + insightHelpOpen useState. RaceInsightCard를 고정 셸 스크롤 영역 상단(회차 목록 <ol> 바로 위, 목록 성공 분기 한정 — loading/error/gate/notFound 미렌더, empty는 카드 자체 null). RaceInsightHelpDialog는 RaceGoalSheet·ConfirmDialog 사이 mount.
  - 보존: racesQuery·목표 팝업·[+ 기록]·초기화·왕복·삭제·스와이프·고정 셸 무변경. 카드 표시 전용.
- EVIDENCE: 게이트 typecheck·lint·test(183)·build PASS + selectAdviceWindow 동치 회귀(test-writer). 프리뷰 회귀 없음.

## 2026-08-02 R30 U5
- MODIFIED: pages/race-detail/ui/RaceDetailPage.tsx 1파일 — computeRaceInsight 아래에 `selectGoalRecommendation(races, insight)`·`selectPrerunChecklist(races)` 동기 계산(결정론, DL-036). RaceGoalSheet에 `recommendation`, RaceEntrySheet에 `prerunChecklist={entry.mode === 'create' ? prerunChecklist : []}`(edit 미노출 — REQ-AF-008, 판별은 기존 노출값 entry.mode 재사용). import는 기존 문에 이름만 추가.
- 보존: 목표 팝업 오케스트레이션·미완성 확인·왕복 복원·삭제·초기화·로그인 게이트·corrupted·AI 분석 카드(R25)·전압 프리필 전부 무접촉.
