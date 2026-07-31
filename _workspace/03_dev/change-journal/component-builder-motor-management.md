# change-journal — component-builder (motor-management)

> 기록 주체: 오케스트레이터 대필 — subagent의 저널 Write가 enforce-agent-ownership hook에
> 차단되어(execution-contract "subagent가 부분 능력으로 계약을 못 채우면 현재 agent가 완결")
> 반환된 저널 원문을 그대로 기록한다.

## 2026-07-31 R15 안정도 용어 통일 (ui-change)
- MODIFIED: src/features/motor-management/ui/ConditionSummary.tsx — L61 사용자 노출 문구
  `변동{' '}` → `안정도{' '}` (컨디션 요약 1줄 접두 라벨). L22·L32 주석의 '변동률'은 사용자 노출
  문구가 아니므로 NON_GOALS로 보존. aria-label 등 다른 사용자 노출 '변동' 문자열 없음(grep 확인).
- MODIFIED: src/features/motor-management/ui/ConditionHelpDialog.tsx — L39 `<strong>변동률(±rpm)</strong>은
  모터가` → `<strong>안정도(±rpm)</strong>는 모터가` (조사 은→는 조정, 후속 문장 "값이 작을수록 회전이
  일정합니다"는 수치 의미 설명으로 유지). L44 `<strong>① 변동 — 지금 상태가 괜찮은가</strong>
  (변동률 자체의 구간)` → `<strong>① 안정도 — 지금 상태가 괜찮은가</strong> (안정도 자체의 구간)`.
  L30 주석의 '변동률'은 NON_GOALS로 보존. 다이얼로그 제목 "컨디션 보는 법"·"② 추세" 등 다른 문구 무변경.
- EVIDENCE: 상수(STABILITY_LEVEL_LABELS 등)·판정 함수·색 체계·레이아웃 무변경(텍스트 노드만 교체).
  잔존 '변동' grep 3건 전부 코드 주석(ConditionSummary L22·L32, ConditionHelpDialog L30).
  게이트 4종·프리뷰 문구 실측은 오케스트레이터 게이트 담당.
