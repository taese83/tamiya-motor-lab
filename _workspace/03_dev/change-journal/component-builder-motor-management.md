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

## 2026-07-31 R17 모터 상세 '최근 파노' 강조 (ui-change)
- CREATED: src/features/motor-management/ui/LatestPanoHero.tsx — 모터 상세 '파노 추세' 차트 위
  히어로 표현 컴포넌트. 공개 API `LatestPanoHeroProps {panoHz, measuredAt, rpm}`. 세로 스택
  (overline '최근 파노' → BigNumber size="guide" 라임 primary.main "Hz" → 'MM-DD HH:mm · N,NNN rpm').
  재사용: BigNumber(@shared/ui/big-number), formatPanoValue·formatDateTimeShort·formatRpm(@shared/lib/format).
  실제 콘텐츠(aria-hidden 아님) — 차트(aria-hidden)와 달리 최신값 라벨된 요약. 고정 높이·margin 없음(소비 측 gap 소유).
- MODIFIED: src/features/motor-management/ui/index.ts — barrel에 LatestPanoHero value/type export 2줄
  추가(ConditionSummary와 MotorFormSheet 사이, 알파벳). 기존 export 무변경.
- 보존: PanoLineChart·ConditionSummary·기존 feature ui 공개 API 무변경. 하드코딩 포맷 없음(전부 format 유틸 경유).
- 위임: 계약 선고정 병렬(component-builder∥route-builder). subagent 저널 Write는 hook 차단 → 반환 원문 대필.
- EVIDENCE: Node 22 pin(CI=true pnpm) typecheck·lint·test(123/123)·build 4종 PASS + check-iterate-scope OK.
  프리뷰(:8082) 실측: 히어로 값 computed fontSize 45px(guide clamp)·weight 800·Oxanium·color rgb(216,245,66)=primary.main(라임),
  라이트 모드 rgb(86,110,0)로 자동 적응(대비 확보). 값 309.0==차트 마지막 점==목록 최신행 일치. 콘솔 에러 0.
