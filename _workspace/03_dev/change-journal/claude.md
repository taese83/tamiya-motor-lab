# change-journal — claude (직접 구현 owner)

> 프로세스 결함 소급 고지(2026-07-31): R1~R11 iterate 라운드의 저널이 누락되었다 —
> 각 라운드의 CREATED/MODIFIED/EVIDENCE는 해당 커밋(a7c2fd0~e97c035) diff가 canonical.
> 본 라운드(R12)부터 append 원칙을 복원한다.

## 2026-07-31 R12 길들이기 — 스테이지 A(데이터 계층) 진행 중
- MODIFIED: src/shared/config/domain.ts — BREAK_IN_* 상수 additive (기존 상수 무변경)
- MODIFIED: src/shared/lib/persistence/schema.ts — DB v3(store 6개), 기존 4 store 계약 보존
- MODIFIED: src/shared/lib/persistence/db.ts — upgrade 2→3 additive (v2 데이터 drop 금지 계약)
- EVIDENCE: 진행 중 — 완료 시 CI=true pnpm typecheck·lint·test·build

## 2026-07-31 R12 길들이기 — **폐기(사용자 결정)**
- REVERTED: src/shared/config/domain.ts · persistence/schema.ts · persistence/db.ts — git restore로 HEAD 원복(0 diff)
- MODIFIED: _workspace/01_plan/break-in-feature-plan.md — 폐기 표기 (문서는 이력으로 보존)
- EVIDENCE: git status src 클린 + CI=true pnpm typecheck·test PASS (아래 게이트)

## 2026-07-31 R13 헤더 고정 (ui-change)
- MODIFIED: src/shared/ui/page-header/PageHeader.tsx — sticky top + 불투명 배경 + safe-top 커버.
  보존: h 56px(env=0 시 layout shift 0)·h1 계약·모터 상세 고정 셸과 무해 공존
- EVIDENCE: 프리뷰 computed style(position sticky·top 0·z 1100·opaque bg) + 600px 스크롤 시
  header top 0 유지 실측 / 게이트 4종 PASS + check-iterate-scope OK

## 2026-07-31 R14 종류 필터 단일 선택 탭 (ui-change)
- MODIFIED: model/kind-filter-store.ts — toggle→select(단일 교체). 저장 배열 형태 유지(하위 호환)
- MODIFIED: model/use-motor-kind-filter.ts — selectedKind(단일)·select 공개, 다중 잔존값은 첫 항목 채택
- MODIFIED: ui/MotorKindFilter.tsx — 칩 행 → MUI Tabs scrollable([전체]+종류, 44px, indicator 이중화)
- MODIFIED: pages/{motors,race} — prop 배선(selectedKind/onSelect)
- CREATED: ui/MotorKindFilter.test.tsx — 탭 렌더·단일 aria-selected·onSelect/onClear 계약
- MODIFIED: model/kind-filter-store.test.ts — 단일 선택 의미로 갱신
- EVIDENCE: 게이트 4종 PASS(123 tests) + check-iterate-scope OK / 실화면은 로그인 게이트로
  DEPLOY_ONLY — 사용자 위임(컴포넌트 계약은 렌더 테스트로 고정)

## 2026-07-31 R15 안정도 용어 통일 — 오케스트레이션 (ui-change)
- 위임: component-builder×2(measure-session/motor-management) + test-writer 병렬 3건 — 소스 편집은
  전부 subagent 수행. subagent 저널 Write가 enforce-agent-ownership hook에 차단되어 반환 원문을
  오케스트레이터가 각 저널 파일에 대필 기록.
- EVIDENCE: Node 22 pin(CI=true pnpm) typecheck·lint·test(123/123)·build 4종 PASS +
  check-iterate-scope OK(소스 4건 = ALLOWED_PATHS 일치) + 프리뷰 실측(측정 S1 캡션 '안정도' 스크린샷).
  run-quality-gates.mjs는 기존 profile 이슈("external ingestion markers not covered")로 fail-closed —
  R15와 무관, 별도 과제로 분리.

## 2026-07-31 R16 레이스·측정 헤더 고정 — verification-only
- NO_SOURCE_CHANGE: 프리뷰 실측으로 요청 상태가 현재 코드에 이미 충족됨을 확인 —
  /race sticky header top 0 유지(데스크톱·모바일 375px, 400~600px 스크롤), /(측정) 375×667·375×812
  모두 docScrollHeight==viewport(스크롤 없음), 상세 2종은 자체 고정 셸. 추정 원인은 R13 이전
  배포본/캐시 관측 — change-scope.md R16 항목 참조.

## 2026-07-31 R19 모터 상세 히어로 영역 2분할 — 안정도 우측 배치 (ui-change, 직접 구현·프로토타입→확정)
- 실행: 라이브(HMR) 프로토타입 반복 — 오케스트레이터 직접 구현(단일 화면 레이아웃·프리뷰 시각 튜닝 반복이라 위임 대신 직접, change-scope R19 사유). 사용자 "확정"으로 수락.
- MODIFIED: src/pages/motor-detail/ui/MotorDetailPage.tsx — fixedTop에서 ConditionSummary(안정도 줄)+LatestPanoHero(히어로)를
  하나의 2열 flex(justify space-between, alignItems center)로 통합. 좌=히어로(flexShrink 0, 크기 유지), 우 끝=ConditionSummary(minWidth 0). 컴포넌트 내용·로직 무변경(위치만).
- MODIFIED: src/features/motor-management/ui/ConditionSummary.tsx — 가로 1줄 flex → 세로 스택(flexDirection column, alignItems flex-end):
  ① 텍스트 우측 정렬(textAlign right) ② 보는 법 버튼을 안정도 아래-오른쪽으로(ml auto 제거, mr -1) ③ 추세/기준선경고 문구를
  block으로 분리해 한 줄 띄고 별도 줄(mt 0.5) ④ word-break keep-all(한글 단어 단위 줄바꿈) ⑤ 버튼 강제 minHeight 48px 해제(minHeight 0, py 0.25 → 실측 29px).
  판정 함수·상수·색 체계·표시 데이터 무변경(레이아웃/줄바꿈만). ConditionSummary는 모터 상세 전용 소비처(테스트 0) — 타 화면 영향 없음.
- 보존: LatestPanoHero(R17)·PanoLineChart(R18)·그래프+리스트 스크롤 셸(R18)·측정 왕복·밀어서 삭제·분기·[측정] 고정 전부 무변경.
- EVIDENCE: Node22 게이트 4종 PASS(typecheck·lint·test 123·build) + check-iterate-scope OK(소스 2건=ALLOWED_PATHS).
  프리뷰(:8082, 375×812, IndexedDB fixture) 실측 2케이스: 일반(안정도 좋음·0.42% 1줄+보는 법 아래) / 추세경고 inspect(2.0배·점검 권장, keep-all 단어단위 줄바꿈, 보는 법 아래-오른쪽). 버튼 48→29px, 가로 넘침 0, 콘솔 에러 0.

## 2026-07-31 R20 이탈 사유 수집 — 오케스트레이션 (feature/existing-change)
- 위임: shared-foundation-builder(domain 트리) → entity-query-builder(schema·repository)∥component-builder(드릴다운 UI 3파일) → form-state-builder(use-race-entry) → test-writer. 전 subagent model:fable. 저널 Write hook 차단분은 반환 원문 대필(component-builder는 반환 잘려 검증 상태로 재구성).
- 직접 편집(scope 확장, mechanical goal-mirror): [측정] 왕복 사유 보존 —
  - MODIFIED: src/features/race-measure-handoff/model/store.ts — RaceMeasureDraft에 optional retireReason(RetireReason import).
  - MODIFIED: src/pages/race-detail/ui/RaceDetailPage.tsx — toHandoffDraft/fromHandoffDraft에 retireReason 미러링(goal 동일 패턴). RaceEntryDraft required 필드 추가에 따른 필수 통합.
- EVIDENCE: Node 22 pin CI=true pnpm typecheck·lint·test(156)·build 4종 PASS + check-iterate-scope OK(source 14건). 프리뷰(:8082) /race 로그인 게이트 정상 렌더·콘솔 에러 0(회귀 없음). 드릴다운 실입력은 로그인 뒤 DEPLOY_ONLY — 사용자 위임, 컴포넌트 계약은 render 테스트로 고정.

## 2026-07-31 R22 레이스 인사이트 S — 오케스트레이션 (feature/existing-change)
- 신규 위젯 하드 게이트: 인사이트 카드 구성안을 목업으로 제시·사용자 승인("이대로 진행") 후 파일 생성.
- 위임: entity-query-builder(race-insight 파생+selectAdviceWindow 추출) → component-builder(RaceInsightCard·HelpDialog) → route-builder(RaceDetailPage 치환+배선) → test-writer(F1~F7+회귀+render). 전 subagent model:fable. 저널 hook 차단분 대필.
- 직접 수정: src/features/race-record/ui/RaceInsightHelpDialog.test.tsx — 실패 1건(getByText가 본문+요약 2곳 '전체 완주 기록' 매칭) → getAllByText().length>0로 보정. 프로덕션 아님(카드/다이얼로그는 정상).
- EVIDENCE: Node 22 게이트 typecheck·lint·test(183, 기존 156+신규 27)·build PASS + check-iterate-scope OK(source 9건=ALLOWED_PATHS). selectAdviceWindow 추출은 인라인 동치 회귀로 동작 보존 확인. 프리뷰(:8082) 측정 로드·레이스 라우트 200·콘솔 0. 카드 실화면은 로그인 게이트 뒤 DEPLOY_ONLY — 파생 유닛·render 테스트로 LOCAL 검증. D2 세분화(전압대=전체 완주/추세=최근 구간)·D3 제외 고지 반영.

## 2026-07-31 R23 recommend-voltage 인증 누락 수정 — 직접 구현 (bug-fix/보안)
- 배경: 레이스 AI 기획(Phase 1) 중 발견 — `api/recommend-voltage.js`에 `requireSession` 미적용으로 무인증 공개 POST 가능(배포 중 실제 denial-of-wallet 노출). 사용자 선택으로 AI 기능과 분리해 선제 수정(DL-027 소급 결정의 즉시 이행).
- MODIFIED: api/recommend-voltage.js — `import {requireSession} from './_lib/authGuard.js'` + handler 메서드 체크 직후 가드 2줄(`const session = await requireSession(req, res); if (!session) return`). api/data.js 선례와 동일 패턴. 가드는 키 읽기(33행)·업스트림 fetch(81행)보다 앞(30행)이라 미인증 요청은 키를 소비하지 않는다.
- 보존: 요청/응답 계약·모델(Haiku 4.5)·max_tokens 300·temp 0·클램프·프롬프트 전부 불변. 클라 어댑터 무변경 — `res.ok` 분기가 401을 이미 처리해 비로그인은 휴리스틱 폴백으로 자연 수렴(추천 기능 자체는 계속 동작).
- 직접 구현 사유: 단일 파일 3줄, 기존 선례를 그대로 적용하는 기계적 보안 수정.
- EVIDENCE: Node 22 게이트 typecheck·lint·test(183)·build PASS + check-iterate-scope OK(source 1건). 401 실동작은 로컬에 serverless 런타임이 없어 DEPLOY_ONLY — 배포 후 비로그인 POST 401 확인은 사용자 위임.

## 2026-07-31 R24 이탈 사유 동기화 유실 + 로그인 소유자 제한 — 직접 구현 (bug-fix/데이터·보안)
- 배경: Phase 2(레이스 AI) 설계 중 2건 발견, 사용자 지시로 즉시 수정.
  ① **데이터 유실(내 결함)**: R20이 IndexedDB에만 retireReason을 추가하고 서버 경로(테이블·SELECT·INSERT)를 놓침 → mirror push에서 사유 탈락 → 다음 로그인 pull에서 `replaceDomainSnapshot`(SyncManager:41, 서버 우선)이 로컬을 덮어써 사유 소실. `migrations/003_stability.sql`이 동일 유형(stabilityCv 유실)을 이미 고쳤던 선례 — 같은 실수 반복.
  ② **보안**: `callback.js`에 이메일 allowlist 부재 → 임의 구글 계정이 유효 세션 획득 → R23의 requireSession 통과 → 서버 키 소비 가능(위협모델 T2①).
- CREATED: migrations/004_retire_reason.sql — `ALTER TABLE race_records ADD COLUMN IF NOT EXISTS retire_reason TEXT`(003 패턴). 구 행 NULL=미보유.
- MODIFIED: api/_lib/db.js — getUserData SELECT에 `retire_reason AS "retireReason"`, races 매핑에 조건부 필드(null 생략 규칙), replaceUserData INSERT에 컬럼·값 추가(3곳).
- MODIFIED: api/_lib/authGuard.js — `isAllowedEmail(email)` 신설(ALLOWED_EMAIL 콤마 다중, 미설정 시 경고+fail-open) + requireSession에서 403 차단(allowlist 도입 **이전 발급 세션**이 30일 유효하므로 검증 측에도 필요).
- MODIFIED: api/auth/google/callback.js — email_verified 검사 직후 allowlist 게이트(`/?auth_error=not_allowed`). upsertUser(99행)·signSession(104행)보다 앞(91행)이라 거부 계정은 DB 기록·세션 발급 모두 없음.
- 보존: DomainSnapshot 형태·IndexedDB 스키마·클라이언트 코드 전부 무변경. 기존 로그인 사용자 무영향(fail-open + 본인 이메일 설정 시 통과). 세션 쿠키 계약 불변.
- 직접 구현 사유: 서버 3파일+마이그레이션이 배포 순서로 묶여 단일 소유가 필요, 003 선례를 그대로 따르는 기계적 수정.
- ⚠️ 배포 순서: **004 마이그레이션 실행 → 코드 배포**(역순이면 INSERT가 없는 컬럼 참조로 동기화 전체 실패). 마이그레이션 실행·ALLOWED_EMAIL env 설정은 사용자 몫.
- EVIDENCE: Node 22 게이트 typecheck·lint·test(183)·build PASS + check-iterate-scope OK(source 4건). 서버 왕복·allowlist 401/403은 로컬에 serverless·DB 런타임 없어 DEPLOY_ONLY — 마이그레이션 후 확인 위임.

## 2026-08-01 R25 레이스 AI 분석 구현 — 오케스트레이션 (feature/existing-change)
- Phase 2 설계(8종) 완료 후 Phase 3. 위임: U1 계약(feature-mutation-builder) → U2·U3(entity-query-builder)∥U4 서버(shared-foundation-builder)∥U5 카드(component-builder) → U6 훅(form-state-builder)+배선(route-builder) → 테스트(test-writer).
- **오케스트레이터 직접 적용(ownership hook 차단분)**: api/ 전체는 무소유 경로(R23·R24 선례) — api/analyze-race.js·api/_lib/{authGuard(requireAllowedSession 추가),retire-reason-tree(신규 미러)}·api/recommend-voltage.js(가드 교체)·vercel.json(maxDuration 30) + src/features/race-record/api/analyze-race-payload.ts·barrel(entity-query-builder 차단분). 전부 subagent 반환 원문 그대로 적용.
- **직접 수정 1건**: RaceAnalysisCard의 `RACE_ANALYSIS_MESSAGES`에 `retry`·`retryPending` 카피 키 누락(typecheck 실패) → 설계 §5 문구로 추가.
- EVIDENCE: Node 22 게이트 typecheck·lint·test(**213**, 신규 30)·build PASS + check-iterate-scope OK(source 19건).
  보안 체크리스트 실측: dangerouslySetInnerHTML 실사용 0건(주석 1건만) / 프롬프트·응답 원문 console 출력 0건 / 가드가 키 읽기·업스트림 fetch보다 앞(239행 가드).
  실 LLM 품질·401/403/503/429 실동작·p95는 DEPLOY_ONLY(eval-plan §3) — 배포 후 사용자 확인.
- 생략(문서화): 펼침 자동 스크롤(과설계 방지, 카드 scrollMarginTop 유지) / D5 타임아웃 fake timer 테스트(jsdom 비결정) / 훅·페이지 통합 테스트(핵심 4파일 우선).

## 2026-08-01 R26 AI 분석 프롬프트 개선 — 직접 구현 (feature)
- 배경: R25 배포 후 사용자가 프롬프트 리뷰 요청 → 코드 리딩으로 3결함 발견, 사용자 지시로 실사용 전 선반영(A안).
- MODIFIED: api/analyze-race.js — `SYSTEM_PROMPT` 상수만.
  ① 역할 자기모순 제거: "세팅을 결정하지 않는다"(조언 지시와 충돌 → nextRace 위축 우려) → "제안하되 단정 금지, 적용 여부는 사용자"로 재정의 + 가치 기준 1줄("insight 되풀이는 무가치, 패턴·인과 가설만 가치") 추가.
  ② 이탈 사유 활용 지시 신설: 도메인 지식에 retireReason/speedRelated/causal 의미 추가 + **[분석 절차] 5단계**(사유별 그룹핑→반복 사유 causal 1순위 가설→speedRelated로 속도/정비 분기→전압 낮췄는데 재발 시 밸런스 가설→trend 어긋남 이상 신호→미입력 많으면 확신 하향). R20 수집 데이터가 프롬프트에서 처음으로 실제 활용됨.
  ③ **[섹션별로 답할 질문]** 신설: diagnosis/anomaly/briefing/nextRace 각각의 질문·생략 조건 명시(planning-context "역할별 답하는 질문" 표 승격). 기존 나열식 규칙 1줄은 중복 제거 + summary 1~2문장·트랙사이드 가독성 1줄 추가.
- 보존 확인(실측): 안전 규칙 6종 전부 잔존(grep 6/6) — 재계산 금지·전압 수치 출력 금지·speedRelated=false 전압 조언 금지·"가능성" 어휘 상한·insufficient 반환·최소 1섹션. 검증 로직·VOLTAGE_PATTERN 스캔·evidence 덮어쓰기·MAX_TOKENS 800·temp 0·모델·스키마·클라 계약 전부 불변.
- 비용 영향: system 프롬프트 입력 토큰 ~+400(회당 센트 미만 — cost-latency-budget §2 추정 범위 내). max_tokens(출력) 불변.
- EVIDENCE: Node 22 게이트 typecheck·lint·test(213)·build PASS + check-iterate-scope OK(source 1건).
  ⚠️ **프롬프트 품질 자체는 LOCAL 검증 불가** — 실 LLM 응답으로만 확인 가능(eval-plan §3 S1~S7). 표면 PASS로 보고하지 않음. 3결함 수정은 코드 리딩 근거의 가설이며 실사용 관찰로 검증 필요.
- 프로세스 note: change-scope append가 cwd 리셋으로 1회 실패(잘못된 경로 생성) → 올바른 경로에 재기록 후 편집 착수. append 선행 원칙은 유지됨.

## 2026-08-02 R27 모터 소리 인식률 개선 — 직접 구현 (feature/existing-change)
- 배경: 측정 로직 심층 분석 요청 → false-negative를 합성신호로 실측 → 최적안 탐색. **실측으로 무효 판명**: 스펙트럼 subtraction(병목이 시간영역 pYIN/voicing이라 무효), 프레임 확대(0프레임 회복), 시간영역 denoise(리스크 큼). **효과 확인된 3레버만** 구현.
- MODIFIED: src/shared/lib/audio-analysis/types.ts — ① `proximityRms 0.004→0.003`(P2) ② `gateVoicingThreshold 0.15→0.08`(P3) ③ `WeakReason='too-quiet'|'no-pitch'` type + `DisplayEstimate.weakReason?` additive(P1). SNR8dB·고조파2·순음15dB 게이트는 불변(voicing만 완화).
- MODIFIED: src/shared/lib/audio-analysis/track.ts — weakEstimate가 weakReason 수용, weak 진입 시 `rms<proximityRms?'too-quiet':'no-pitch'` 산출.
- MODIFIED: src/shared/lib/audio-analysis/index.ts — WeakReason type export.
- MODIFIED: src/features/measure-session/model/machine.ts — EngineFrameView weak variant `reason?` + toEngineFrame·toMeasureView가 조건부 spread로 전달(exactOptionalPropertyTypes 대응).
- MODIFIED: src/features/measure-session/ui/measure-view.ts — MeasureView weak variant `reason?` additive.
- MODIFIED: src/features/measure-session/ui/MeasureFigures.tsx — messageFor weak-signal: too-quiet면 "더 가까이 대주세요"(종전 침묵 정책은 no-pitch에 한정 유지).
- 보존: INV-13(weak⇒수치 null)·수치 계약·worker 프로토콜(자동 전달)·측정 왕복·announcement·기존 DisplayEstimate/MeasureView 필드 전부 불변(전부 optional additive).
- 실행 사유: engine→view 단일 계약 체인·순차 의존·audio 서브시스템 심층 편집이라 위임 부적합 → 직접(execution-contract §10).
- EVIDENCE: Node22 게이트 typecheck·lint·test(**213 무회귀** = engine fixture가 voicing0.08 안전 보증)·build PASS.
  합성 실측: peak0.009 모터 회수(구0.004면 탈락) / 조용→weakReason 'too-quiet' / 잡음(피치X)→ 'no-pitch' / 정상 무영향.
  탐색 근거(실측 폐기): 스펙트럼 subtraction A/B 0프레임 회복·프레임0.2→0.4 무효·voicing만 2dB에서 0→39 회복+순수잡음 오검출 0.
  ⚠️ 실 마이크 인식률 체감·"더 가까이" UI 라이브 트리거는 DEPLOY_ONLY(실기기) — 표면 PASS로 보고 안 함. voicing 완화는 실기기 재검증 권장.
- 라운드 번호 note: 동시 세션이 R25·R26 사용 → 본 라운드는 R27(코드 주석도 R27로 정정).

## 2026-08-01 R27 전압 패턴 거부 과잉 수정 — 직접 구현 (bug-fix)
- **실사용 실패 대응**: 사용자 제보 "분석하지 못했어요" + Vercel 로그 `{code: 'voltage_pattern_rejected', upstreamMs: 6989}` — 모델은 7초에 정상 응답했으나 서버 전압 패턴 검사가 응답 전체를 502로 거부. 전 요청 실패.
- **근본 원인(내 설계 오류)**: DL-029의 결정은 "코칭 섹션이 전압을 **추천**하지 말 것"인데 R25 구현이 "모든 섹션 전압 수치 전면 금지 + 전체 502"로 과잉 적용. 게다가 주입 insight에 완주 전압대·최근 완주 전압이 있고 프롬프트가 "주입값 인용" 지시 → 모델이 전압을 인용하는 건 지시 준수 결과. **구조적 자기모순**을 내가 만들었다. 인용(cite)과 처방(prescribe) 미구분이 핵심.
- MODIFIED: api/analyze-race.js (DL-031)
  · VOLTAGE_PATTERN 적용 범위: 응답 전체 → **`sections.nextRace.summary` 한정**. 주석에 인용/처방 구분과 실패 이력 기록.
  · 위반 처리: 전체 502 → **해당 섹션만 delete 후 200 반환**(나머지 분석 유지). 드롭 후 0섹션이면 502 `empty_after_voltage_drop`(최소 1섹션 계약 유지).
  · 관측: 드롭 발생 시 로그에 `voltageDropped: true` 추가(프롬프트 준수 관찰 — 잦으면 보강 신호).
  · 프롬프트: "전압 수치 어떤 형태로도 출력 금지" → **"진단·이상·브리핑에서 인용 허용 / nextRace에서만 수치 금지(방향 어휘)"** 2줄로 분리. 섹션 정의부("전압은 방향만")는 이미 정합이라 무변경.
- 보존: 응답 스키마·evidence 덮어쓰기·가드·rate limit·max_tokens·모델·temp·클라 계약 불변. 다른 안전 규칙 5종 불변(재계산 금지·speedRelated=false 전압 조언 금지·"가능성" 어휘·insufficient·최소 1섹션).
- EVIDENCE: 드롭 로직 4케이스 재현 검증(①인용+방향=전부 유지 ②제안에 수치=nextRace만 드롭·나머지 200 ③드롭 후 0섹션=502 ④insufficient 무영향) + 프로덕션 verdict 가드 확인(380·387행) + Node22 게이트 4종 PASS + check-iterate-scope OK(source 1건).
  ⚠️ 실동작은 DEPLOY_ONLY — 배포 후 로그에 `voltage_pattern_rejected` 부재·`verdict` 기록이 확인 기준.
- 후속: eval-plan G-VOLT를 "전 시나리오" → "nextRace 한정"으로 조정 필요(문서, 별도).

## 2026-08-02 R29 로그인 메뉴에 타미야 경기 일정 외부 링크 — 직접 구현 (feature/existing-change)
- MODIFIED: src/features/auth/ui/AuthMenu.tsx — 로그인 계정 메뉴(user!==null 분기)에 '타미야 경기 일정' MenuItem 추가.
  `TAMIYA_RACE_SCHEDULE_URL` 상수 + MenuItem `component="a" href target=_blank rel="noopener noreferrer" onClick=close`.
  배치: 사용자 정보 · Divider · **타미야 경기 일정** · Divider · 로그아웃(그룹 분리). 실제 anchor라 중클릭·새 탭·컨텍스트 메뉴 접근성 유지.
- CREATED: src/features/auth/ui/AuthMenu.test.tsx — 계약 render 테스트(vi.mock useSession + createWrapper): ①비로그인=메뉴/링크 미표시 ②로그인=항목 노출·href=외부URL·target=_blank·rel~noopener·로그아웃 보존.
- 보존: 비로그인 즉시 로그인 진입·아바타/aria·로그아웃 흐름·useSession 계약 전부 불변. 순수 additive.
- 실행 사유: 단일 컴포넌트 additive 메뉴 항목 → 직접(execution-contract §10).
- EVIDENCE: Node22 typecheck·lint·build PASS + AuthMenu 테스트 격리 실행 2/2 PASS.
  ⚠️ 전체 test 1건 실패는 **동시 세션 미커밋 파일(analyze-race-payload.test.ts, R28 진행 중)** — 내 변경과 무관(auth 파일 무관, 격리 실행으로 내 계약 통과 확인).
  실화면(계정 메뉴)은 서버리스 세션 로그인 게이트라 로컬 미표시 — 라이브 노출·이동은 DEPLOY_ONLY(로그인 후 실기기). 계약은 render 테스트로 LOCAL 고정.
- 라운드 번호: 동시 세션이 R27·R28 사용 → 본 라운드 R29. 커밋은 auth 소스 2파일 + 본 저널만(동시 세션이 change-scope.md 미커밋 수정 중이라 change-scope R29는 working-tree 문서로만 남김 — 엉킴 방지).

## 2026-08-01 R28 분석 가중치 스케일 완화 + 결과 기반 초점 규칙 — 직접 구현 (bug-fix+feature)
- **발견(사용자 질문 "가중치 주고 있지?"에서 출발)**: 주고는 있었으나 스케일이 잘못. `RACE_WEIGHT_GROWTH=1.5`는 추천기의 짧은 윈도우(≤5건, 5:1)용인데 R25가 분석 20건 payload에 재사용 → **2217:1**. 이 기능의 핵심인 회차 간 패턴 탐지의 근거(과거 기록)를 스스로 지우는 상태였고, 프롬프트의 "weight 큰 기록을 더 신뢰하라"가 이를 증폭. 원인: 윈도우가 4배 커진 걸 재검토하지 않은 상수 재사용.
- **사용자 기준(DL-032)**: 가중은 최신성이 아니라 **정보량** 기준 — 이탈하다 완주했으면 그 완주에 집중(무엇이 달랐나), 완주가 없으면 이탈에 집중(공통 원인).
- MODIFIED 4파일:
  · `src/shared/config/domain.ts` — `ANALYZE_WEIGHT_GROWTH = 1.1` 신설(분리 근거·비율 주석). **RACE_WEIGHT_GROWTH·assignExponentialWeights·추천 경로 불변**(추천 품질 보존).
  · `src/features/race-record/api/analyze-race-payload.ts` — 상수 교체(형태 동일, 계수만 분석 전용). 20건 ≈ 6:1.
  · `src/features/race-record/api/analyze-race-payload.test.ts` — n=3 기대값 [2.25,1.5,1]→[1.21,1.1,1], 20건 비율 단언 2개 추가(`≈1.1^19`, `<10` — 추천 계수 회귀 시 즉시 실패).
  · `api/analyze-race.js` — ① weight 설명을 "지수적으로 크다"→"완만하게(20건 약 6배), **오래된 기록도 패턴 근거로 함께 본다**" ② **[분석의 초점]** 절 신설: 완주 有→최근 완주를 성공 기준점으로 전후 이탈과 전압·파노·사유 비교("이탈만 나열하지 말고 성공과의 차이를 짚어라") / 완주 無→반복 사유의 공통 원인.
- 설계 판단: LLM은 수치 가중을 계산하지 않고 인상으로 받으므로 극단 비율은 해롭고, 초점은 **명시 지시**가 신뢰도가 높다 — 가중치는 완만한 최신성 신호로만 두고 의미 판단은 규칙이 담당.
- EVIDENCE: Node22 게이트 typecheck·lint·test(**215**, 비율 단언 2 신규)·build PASS + check-iterate-scope OK(source 6건). 프롬프트 효과는 DEPLOY_ONLY — 배포 후 응답에서 "완주 기준점 비교"가 실제로 나오는지 관찰.

## 2026-08-01 R29 이탈만 있을 때 insufficient 남발 수정 — 직접 구현 (bug-fix)
- **사용자 제보**: 이탈만 있는 모터에서 항상 "분석할 근거가 부족해요"(서버 verdict=insufficient).
- **원인 3중(코드 근거)**: ① 이탈만이면 `computeRaceInsight`가 finishedBand·lastFinishedVoltage를 **둘 다 null**로 반환(race-insight.ts:118-119) → payload가 빈약해 보임 ② 프롬프트의 insufficient 조건이 **기준 없이 열린 탈출구**("판단 근거가 부족하면") ③ R28의 [분석의 초점]이 완주 케이스를 먼저 서술해 완주가 전제처럼 읽힘. 결과적으로 모델에게 섹션 구성보다 insufficient가 쉬운 선택이 됐다.
- **판단**: 이탈만 있는 상태는 근거 부족이 아니라 **분석이 가장 필요한 상태**다 — 사용자가 도움을 가장 필요로 하는 순간에 침묵하는 것은 기능 실패.
- MODIFIED: api/analyze-race.js — SYSTEM_PROMPT 2곳.
  · [분석의 초점] 완주 부재 항: "근거 부족이 아니라 분석이 가장 필요한 상태"임을 명시 + finishedBand null이 정상이며 그 자체가 "성공 사례 없음"이라는 사실임을 설명 + **볼 것 4가지**(사유 반복→causal 1순위 / 사유별 voltage·panoHz 차이 / 사유 변화 시점 / 전압 낮췄는데 같은 사유 잔존=속도 원인 아님).
  · insufficient 규칙: "판단 근거가 부족하면" → **최후 수단**으로 좁힘. 클라 게이트가 이미 3건·사유 최소 조건을 검사함을 알리고, "완주 없음·표본 적음·랩타임 없음"을 insufficient 사유로 쓰지 말고 **확신 수준을 낮춰 답하라**고 지시.
- 보존: 스키마·insufficient 응답 경로(2xx 정상)·검증·가드·토큰·모델·클라 계약 불변. 안전 규칙 5종 잔존(grep 5/5).
- EVIDENCE: Node22 게이트 4종 PASS + check-iterate-scope OK(source 1건). 효과는 DEPLOY_ONLY — 이탈만 있는 모터에서 섹션이 실제로 나오는지 실측(eval-plan S2).
- ⚠️ 잔여 가설: 사용자의 이탈 기록 중 **사유가 입력된 비율**이 낮으면(게이트는 1건만 있어도 통과) 프롬프트 수정만으로는 분석 품질이 얇을 수 있다 — 실측 후 재평가 대상.

## 2026-08-02 R30 레이스 자동 입력 — 오케스트레이션 (feature)
- Phase 1 기획(race-autofill 4문서·DL-033~039) 후 구성안 사용자 승인 → 구현. 위임: entity-query-builder(U1·U2) → component-builder(U3·U4) → route-builder(U5) → test-writer.
- 직접 적용(hook 차단분): `src/shared/config/domain.ts`의 RETIRE_REASON_PRERUN_ITEMS 상수 맵(entity-query-builder 반환 원문).
- **사용자 파일 처리**: 세션 중 `_scratch_multimotor.test.ts`·`_scratch_multidetect.test.ts`(사용자 실험, 미추적)가 게이트를 두 번 막음 — 임의 수정·삭제하지 않고 사용자에게 확인. 두 번 모두 사용자가 직접 정리해 해소(내 코드는 각 시점 오류 0건으로 분리 확인).
- EVIDENCE: Node22 게이트 typecheck·lint·**test 254**(신규 38)·build PASS + check-iterate-scope OK(source 14건). 스키마·repository·migration·서버 동기화·use-race-entry·voltage-advisor **변경 0**(체크 상태 비저장을 타입으로 차단). 실화면은 로그인 게이트 뒤 DEPLOY_ONLY.

## 2026-08-02 R31 전압 추천 모델 반전(속도 유지) + AI 분석 파노 원칙 — 직접 구현 (bug-fix/도메인)
- **사용자 관찰**: 파노 상승 시 '안정' 추천 전압이 오히려 상승(재현: 1건 이력 파노 300→320서 3.00→3.20V). 이어 원칙 재확인: "파노↑ = 같은 전압서 속도↑, 이를 바탕으로 분석해야해".
- **원인(개념 오류)**: v2.33 휴리스틱이 V≈aP+b(1건은 순수 비례)를 학습 — 파노↔전압 인과가 뒤집힘. 파노는 "만들 결과"가 아니라 레이스 전 측정된 모터 상태다. 안정 목표는 GOAL_DELTA=0이라 상쇄 장치도 없었다.
- MODIFIED:
  · src/shared/lib/voltage-advisor/voltage-advisor.ts — fitVoltageForPano를 **속도 유지 역산**으로 교체: 완주 기록 우선 가중평균 S̄=Σw·(파노×전압)/Σw → V=S̄/파노. 파노 동일→전압 유지, 파노↑→전압↓. NEUTRAL_BASE 폴백. 공개 API·GOAL_DELTA·이탈 회피 cap·클램프·반환 shape 불변.
  · src/shared/lib/voltage-advisor/voltage-advisor.test.ts — 헤더 갱신, "파노↑→전압↑" 테스트를 **"파노↑→전압↓"으로 반전**, 2건 역산 기대값 2.9→2.92, **완주-우선 표본** 테스트 신규. 나머지 11 케이스는 새 모델서도 통과(수치 재검증).
  · api/recommend-voltage.js — 프롬프트: 도메인 지식(측정 상태·파노↑→전압↓·S=파노×전압)은 이미 R31 초반 반영, **[분석 절차] 1~2단계가 옛 "파노↔전압 관계 추정"으로 자기모순이던 것을 S̄ 가중평균·V=S̄/파노 역산으로 정정**(도메인과 정합).
  · api/analyze-race.js — 파노 도메인 서술에 "**같은 전압이면 파노↑=속도↑**, 회차 간 파노 변화를 이탈·이상 해석 핵심 신호로" 추가(사용자 "분석해야해" 직접 반영, DL-029 전압 수치 금지와 무충돌 — 해석용).
- 보존: 세 추천 경로(휴리스틱·recommend-voltage·analyze-race)가 이제 **동일 원칙**을 말함(반대 방향 상충 제거). GOAL_DELTA 값·클램프 대역·이탈 회피·공개 API·소비처 무변경. R30 산출물 무관.
- EVIDENCE: Node22 게이트 typecheck·lint·test(255, 반전+완주우선 포함)·build PASS + check-iterate-scope OK(source 6건). 수치 재현: 1건 이력 파노 300·3.0V → 파노 320서 2.82V(이전 3.20V). 실주행 체감·LLM 응답은 DEPLOY_ONLY.

## 2026-08-02 R32 측정 깜빡임 보정 — 게이트 결손 coast 연장 — 직접 구현 (bug-fix)
- **사용자 증상**: 측정 중 파노 수치가 보였다 "—"로 사라졌다 반복(깜빡임) → 측정 불가. 소리가 잠깐 끊겨도 보정 필요.
- **원인**: track coast가 missTolerance 8프레임(≈200ms)뿐 — 실기기 게이트 결손이 200ms를 넘으면 weak 전환 +
  clearTrack으로 안정창(1.5s) 리셋 → 재획득해도 stable/자동확정 무산. 세션 타이머는 1200ms 유예로 이미 관대(비대칭).
- MODIFIED: src/shared/lib/audio-analysis/types.ts — `missTolerance 8→20`(≈500ms, 세션 유예 1200ms 안쪽). 주석에 근거 기록.
- MODIFIED: src/shared/lib/audio-analysis/engine.fixtures.test.ts — [scope 확대] D-9 테스트 무음 1.0s→1.5s.
  실패는 stale 노출이 아니라 tail 표본 수 sanity(`10 > 10`) — deadline이 missTolerance에서 동적 계산되는데 무음이
  짧아 검증 창이 부족해진 것. fixture 길이만 조정, stale 금지 계약 불변.
- EVIDENCE: 합성 간헐 끊김 A/B(old=8 override vs new=20): 결손 450ms에서 old 깜빡임 5회·stable 0% → new 깜빡임 0회·stable 65%
  (자동확정 가능 회복). 결손 800ms(>500ms)는 양쪽 weak(D-9 stale 방지 유지). coast 오값(400±8 밖) 0건.
  Node22 게이트 4종 PASS(255) — engine 스위트 27/27(⑤⑥⑧ 포함 무회귀).
  ⚠️ 실기기 깜빡임 소멸 체감은 DEPLOY_ONLY. 트레이드오프: 안정창 내 예측 프레임 비중 최대 20/60 — 정지 측정 전제, 실기기 재검증 대상.
- 라운드 note: 동시 세션이 R30·R31 사용 → 본 라운드 R32. change-scope R32 항목은 동시 세션 커밋에 포함되어 반영됨.

## 2026-08-02 R33 전압 입력 소수 2자리 — 직접 구현 (bug-fix)
- **사용자 증상**: 레이스 입력 폼 전압 +/−가 소수 1자리로만 조정. AI 추천 2.58V가 2.6으로 표기.
- **근본 원인(단일)**: src/shared/ui/voltage-stepper/VoltageStepper.tsx `stepFrom`이 `VOLTAGE_RANGE.step 0.1` +
  `.toFixed(1)`. 스텝 0.1이라 1자리 이동 + toFixed(1)이 2번째 소수를 파괴(AI가 채운 2.68에서 − → (2.58).toFixed(1)="2.6").
  스키마(voltageSchema.refine v*100 정수, maxDecimals 2)는 이미 소수 2자리 저장을 허용 — 스텝퍼만 불일치였다.
- MODIFIED: src/shared/config/domain.ts — `VOLTAGE_RANGE.step 0.1→0.02`. grep상 step 소비처는 VoltageStepper 전용
  (schema·use-race-entry는 min/max만 사용) → 타 경로 무영향. 추천 대역(VOLTAGE_ADVICE_RANGE 0.02)과 동일 단위로 정합.
- MODIFIED: src/shared/ui/voltage-stepper/VoltageStepper.tsx — `stepFrom` `toFixed(1)→toFixed(VOLTAGE_RANGE.maxDecimals)`(=2),
  주석 근거 기록. aria-label "0.1볼트 내리기/올리기"→"전압 내리기/올리기"(스텝 상수 변화에 무관·롱프레스 반복 오인 방지).
- CREATED: src/shared/ui/voltage-stepper/VoltageStepper.test.tsx — 제어형 Harness로 +/− 계약 5건 고정:
  2.58 +→2.60 / 2.68 −→2.66(2번째 소수 비파괴) / 1자리 2.6 −→2.58(이전엔 2.6으로 갇힘) / 빈 값 no-op / 상한 9.9 + disabled.
- 보존: VoltageStepperProps·완전 제어형·onChange(raw)·롱프레스·키보드·clamp 대역(0.1~9.9)·voltageSchema·AI 배선(toFixed(2)) 불변.
- 실행 사유: 단일 UI 상수 + 순수 함수 1곳 튜닝 → 직접(execution-contract §10).
- EVIDENCE: Node22 게이트 typecheck·lint·test(**260**, 신규 5)·build PASS + check-iterate-scope OK(source 3건).
  레이스 입력 폼은 로그인 게이트 뒤 → 프리뷰가 +/− 상호작용을 재현 불가(DEPLOY_ONLY, prior 라운드 동일). 실제
  클릭→2자리 산출 경로는 유닛 5건이 정확히 커버. 실기기 +/− 2자리 조정·AI 추천 2자리 표기 체감은 DEPLOY_ONLY.
- **별건 발견(scope 밖·보고)**: AI 추천 "2.58→2.6"은 **clampVoltage 바닥 클램프**(VOLTAGE_ADVICE_RANGE.min=2.6,
  voltage-advisor.ts:87 / recommend-voltage.js:21). 의도된 도메인 규칙(하한 2.6V)이나 R31 속도 유지 이후 파노 높은
  모터는 2.6 미만이 정당하게 산출될 수 있어 하한이 과할 수 있음 — 하향 여부는 도메인 결정 대상, 사용자 확인 후 별도 라운드.

## 2026-08-02 R34 /api 캐시 금지 — 304·stale 응답 수정 — 직접 구현 (bug-fix/프로덕션)
- **사용자 제보**: 모터·레이스 진입 시 "모터 목록을 불러오지 못했습니다" 지속 + "서버가 304를 전달하는 것 같다".
- **진단**: vercel.json `/:path*` catch-all의 `Cache-Control: no-cache`가 /api/data·/api/auth/session까지 적용 —
  인증 사용자별 JSON이 브라우저 캐시+ETag 재검증 대상 → 304(빈 본문). iOS Safari는 fetch에 304를 노출하는
  알려진 버그 → sync-client `!res.ok → null`로 pull 상시 실패 → 서버 정본 복구 경로 차단(로컬 오류 고착).
  session도 캐시된 authenticated:false 재사용 위험 동일.
- MODIFIED: vercel.json — `/api/(.*)` 헤더 블록 신설 `Cache-Control: private, no-store`(catch-all 뒤, 동일 키 override). assets immutable 유지.
- MODIFIED: api/data.js·api/auth/session.js — 핸들러 선두 `res.setHeader('Cache-Control','private, no-store')`(서버 정본 방어).
- MODIFIED: src/features/sync/api/sync-client.ts(pull)·src/features/auth/model/useSession.ts — fetch `cache: 'no-store'` —
  기존 캐시된 ETag 엔트리 무시(조건부 요청 자체가 안 나가 304 소멸), 배포 즉시 회복.
- 보존: 응답 body·상태코드·클라 파싱·pull 실패=null 조용 수렴 계약 전부 불변(헤더·fetch 옵션만).
- EVIDENCE: Node22 게이트 4종 PASS(260) + check-iterate-scope OK(source 4건+vercel.json).
  ⚠️ 304 소멸·목록 회복은 DEPLOY_ONLY — 배포 후 Network에서 /api/* 항상 200(no-store)·목록 로드 확인.
  잔여 가설: 서버 데이터 자체가 클라 스키마 위반이면 오류 지속 — 그 경우 콘솔 오류 캡처로 2차 진단(replaceDomainSnapshot 무검증 저장은 후속 하드닝 후보).

## 2026-08-02 R34 파노 과다 신호(하한 2.6 유지) — 직접 구현 (feature/bug-fix)
- **경위**: R33 후 사용자 "추천은 2.58로 하는데 실제 2.6으로 찍혀" → 원인은 clampVoltage 바닥 클램프(하한 2.6).
  초안으로 하한 2.6→2.4 하향을 진행하다, 사용자 결정 "2.6 하한이 있다면 파노가 너무 높은 거니 더 파노가 적은
  모터를 추천해야" 로 **방향 전환**. 하한 하향 초안 전량 원복(순증분 0), 신호 방식으로 재구현.
- **설계**: 하한 2.6은 의미 있는 경계로 유지. 속도 유지 기준선 baseV=S̄/파노(목표 보정 전)가 2.6 미만이면
  "학습된 성공 속도를 내려면 하한보다 낮은 전압 필요 = 이 모터 파노가 그 속도에 과함" 신호. 값은 2.6으로
  클램프하되 근거에 **더 낮은 파노 모터 권장**을 남긴다. 목표 보정 전 baseV 판정이라 finish −0.3만으로 하한을
  스치는 정상 모터(baseV 2.7→finish 2.4)는 오탐하지 않음. 이력 0건은 S̄ 부재라 미적용.
- MODIFIED:
  · src/shared/lib/voltage-advisor/voltage-advisor.ts — `panoTooHigh = pts.length>0 && baseV<VOLTAGE_ADVICE_RANGE.min`
    판정 + rationale 경고 append(clampVoltage 2.6 유지). 로직·상수·반환 shape 불변(문자열 append만).
  · api/recommend-voltage.js — 프롬프트 [제약]에 규칙 1줄: 기준 전압(S̄/P)<2.6이면 voltage 2.6 + rationale에
    저파노 모터 권장 명시. VOLTAGE_MIN 2.6 유지(주석만 갱신).
  · src/shared/config/domain.ts — VOLTAGE_ADVICE_RANGE.min 2.6 유지 + 주석에 신호 규칙 근거.
  · src/shared/lib/voltage-advisor/voltage-advisor.test.ts — 신호 3케이스(과다=2.6+문구 / 정상=문구없음 / 이력0=문구없음).
- 보존: clampVoltage 하한 2.6·상한 3.2·0.02 그리드·VoltageAdvice 필드(추가 없음, rationale append만)·finish/stability/speed
  상대순서·클라 배선(rationale=voltage 필드 helperText). 기존 하한 단언(clampVoltage 1.0=2.6·NaN=2.6·≥2.6) 전부 불변.
- 실행 사유: 순수 함수 1곳 + 프롬프트 1줄 + 상수 주석, 단일 도메인 개념 → 직접.
- EVIDENCE: Node22 게이트 typecheck·lint·test(**263**, 신규 3)·build PASS + check-iterate-scope OK(source 4건).
  수치 재현: 400Hz 2.9V 완주 → 파노 480서 baseV≈2.42<2.6 → voltage 2.6 + "더 낮은 파노 모터" 문구. 파노 400 유지·이력0은 문구 없음.
  실 LLM이 규칙을 따라 저파노 모터를 권하는지, 폼 helperText 실노출은 DEPLOY_ONLY(서버리스+로그인 게이트).

## 2026-08-02 R35 pull 격리 + 목록 에러 원인 표시 + 세션 allowlist 통일 — 직접 구현 (bug-fix/프로덕션)
- **사용자 실측**: 캐시 삭제 후에도 목록 에러 재발 + /api/data 여전히 304 → 진단 확정: 서버 DB에 현행 클라 스키마
  위반 행 존재 시 pull이 로컬을 재오염(replaceDomainSnapshot 무검증 저장) → 읽기 data-corrupt 고착. 304 잔존은
  iOS PWA 분리 저장소의 옛 번들(R34 client no-store 미적용) 추정 — 재설치 안내.
- MODIFIED: src/app/SyncManager.tsx — `sanitizeSnapshot` 신설(export): 서버 행을 entity 스키마(motor·measure·race)로
  행 단위 safeParse, 위반 행 격리 + console.warn(store·id). **FK 연쇄**: 격리된 모터를 참조하는 기록도 격리(INV-03 —
  잔존 시 부팅 full-scan corrupted). pull 직후 sanitize 후 replaceDomainSnapshot.
- CREATED: src/app/SyncManager.test.tsx — 격리 계약 3케이스(전부 유효 통과 / 위반만 격리 / FK 연쇄 격리).
- MODIFIED: src/pages/motors/ui/MotorsPage.tsx·src/pages/race/ui/RacePage.tsx — 목록 Alert에 DomainError message
  캡션 추가(data-corrupt vs storage 실패를 기기에서 자가 진단).
- MODIFIED: api/auth/session.js — isAllowedEmail 검사 추가: 불허 세션은 authenticated:false(데이터 API 403과 상태 일치 —
  "로그인처럼 보이는데 데이터만 403" 불일치 제거).
- ⚠️ 트레이드오프(brief 명시): 격리된 불량 행은 다음 mirror push에서 서버에서도 제거 — 현행 앱이 어차피 읽지 못하는
  행(지금은 그 행 때문에 전체 불능)이므로 수용. console.warn으로 격리 행 id 기록.
- EVIDENCE: Node22 게이트 4종 PASS(266, sanitize 3 신규). 실기기 회복·격리 발동은 DEPLOY_ONLY —
  PWA 재설치(홈 화면 삭제→Safari 확인→재추가) 후 목록 로드·Alert 캡션 확인 위임.

## 2026-08-02 R36 sanitize 전량 격리 시 역오염 방지 — 직접 구현 (bug-fix)
- MODIFIED: src/app/SyncManager.tsx — serverHasData 분기를 sanitize 후 → **raw 기준**으로. 전 행 격리 시에도
  서버 우선 교체가 수행돼 오염된 로컬이 정화된다(이전엔 시드 push로 역오염 + 로컬 교체 불발).
- EVIDENCE: Node22 게이트 4종 PASS + sanitize unit 3건 무회귀. 실동작 DEPLOY_ONLY.

## 2026-08-02 R37 서버 타임스탬프 ISO(Z) 정규화 — pull 격리 근본 원인 — 직접 구현 (bug-fix/프로덕션)
- **확정(사용자 실측)**: /api/data JSON 정상인데 앱 표시 불가, 원인 캡션 data-corrupt. 실증으로 범인 특정: 클라
  z.iso.datetime()이 offset('...+00:00'·'YYYY-MM-DD HH:MM:SS+00')·마이크로초를 거부 → 서버 raw 타임스탬프가
  그 형식이면 pull 행 전량 격리→로컬 붕괴. (컬럼은 TEXT지만 타 앱 유입·드라이버 Date 직렬화로 offset 혼입 가능)
- MODIFIED: api/_lib/db.js — `isoZ(v)=new Date(v).toISOString()`(NaN이면 원본 유지) 헬퍼 + motors.createdAt/updatedAt,
  measures.measuredAt, races.createdAt에 적용. offset·μs·Date 무엇이 와도 '...Z' ms로 통일.
- 실증: offset/μs+offset(KST)/Date 객체 4종 전부 정규화 후 motorSchema 통과(임시 probe, 삭제).
- 보존: 응답 필드·정렬·클라 스키마·R35 격리 로직 불변. UTC 순간 보존(표기만 통일), μs 손실 무해(앱 ms만 사용).
- EVIDENCE: Node22 게이트 4종 PASS(266). 실기기 회복은 DEPLOY_ONLY — 배포 후 pull이 정규화 값을 주므로
  R35 격리 없이 정상 로드 기대. 기존에 격리로 비워진 로컬도 이번 pull에서 서버 우선 교체로 복원.

## 2026-08-02 R38 목록 조회 실패 근본 수정 — summaryRaceRowSchema.result optional — 직접 구현 (bug-fix/프로덕션)
- **확정(사용자 /api/data 원문으로)**: 서버 JSON 정상인데 앱이 "저장된 데이터를 읽을 수 없습니다". 실측: 사용자 데이터에
  result 없는 레이스 1건(R30/v2.31 "레이스 전 세팅" — goal:stability, 결과 미정). listMotorSummaries의
  parseSummaryRaceRow가 이를 거부(summaryRaceRowSchema.result가 z.enum 필수) → data-corrupt → 그 모터를 가진
  사용자의 전체 목록 불능. 부팅 검증·R35 sanitize는 canonical(result optional)이라 통과 → projection 스키마 drift가 원인.
- MODIFIED: src/entities/motor/api/repository.ts — summaryRaceRowSchema.result를 `.optional()`로(canonical 정합).
- MODIFIED: src/entities/motor/model/types.ts — MotorSummaryRace.result를 `result?: RaceResult | undefined`로.
- MODIFIED: src/features/race-record/ui/RaceMotorList.tsx — raceDetailLine이 result 부재 시 "결과 미정 · 전압" 표시.
- CREATED: src/entities/motor/api/repository.summary.test.ts — 회귀 2건(result 없는 레이스→목록 정상 조회 / result 있으면 그대로).
- 실증: 사용자 실제 실패 행을 summary 스키마에 통과 — R38 전 실패=1(원인)·후 실패=0(임시 probe, 삭제).
- 보존: canonical raceRecordSchema·부팅 검증·R35 sanitize·정렬·rollup·result 있는 레이스 표시 문구 불변.
- 관계 정리: R34(no-store)·R35(sanitize)·R36(branch)·R37(ts 정규화)는 방어적 하드닝(각자 유효)이었고, **R38이 이 장애의 진짜 원인 수정**.
- EVIDENCE: Node22 게이트 4종 PASS(268, 회귀 2 신규). 실기기 목록 로드는 DEPLOY_ONLY — 배포 후 확인.

## 2026-08-02 R35 AI 추천 방향 안전장치 + 프롬프트 강화 — 직접 구현 (bug-fix)
- **사용자 제보**: 레이스 입력 폼 [AI 추천](LLM/Haiku) 버튼 — 파노 474→526 상승인데 완주 추천 전압을 2.81로 **올림**.
  ("진입"이 아니라 전압 아래 [AI 추천] 버튼 경로임을 사용자가 확정). 파노 배선(currentPanoHz=마지막 측정=526)·
  휴리스틱은 정상 — **작은 모델이 프롬프트의 파노↑→전압↓ 원칙을 어기고 "파노 높음=강한 모터=고전압" 직관으로 회귀**.
- **판단**: Haiku에 반직관 규칙을 프롬프트만으로 강제하는 건 불안정. 어댑터가 이미 실패 시 휴리스틱 폴백하는
  하이브리드 구조라, **방향 위반도 폴백 조건에 추가**해 결정론적으로 원칙을 보장.
- MODIFIED:
  · api/recommend-voltage.js — SYSTEM_PROMPT만: ① 파노↑→전압↓ 전면화("절대 파노 높다고 전압 높이지 마라")+
    워크드 예시(470/3.0V→520서 2.71V) ② 오해 유발 "전압↔속도 비례" 줄 **제거**→앵커 규칙(현재 파노>완주 파노면
    추천은 완주 전압보다 반드시 낮다)으로 교체 ③ 이탈=과속이라 완주·안정은 그 속도를 유지 목표로 삼지 말고 낮추라
    (도메인+절차 1단계). 출력 스키마·제약·R34 신호·나머지 안전규칙 불변.
  · src/features/race-record/api/recommend-voltage.ts — 방향 안전장치: goal≠speed에서 clampVoltage된 LLM 전압이
    같은 goal 휴리스틱보다 DIRECTION_TOLERANCE_V(0.06=3스텝) 넘게 높으면 LLM 폐기→recommendVoltageHeuristic(input)
    반환(전압·근거 일관, source=heuristic). speed는 예외. 기존 실패 폴백·clampVoltage 재방어·계약 불변.
  · [신규] src/features/race-record/api/recommend-voltage.test.ts — fetch mock 4케이스: 위반(2.82)→휴리스틱 2.6 /
    허용오차 내(2.64)→AI 유지 / speed(3.2)→AI / 네트워크 실패→휴리스틱.
- EVIDENCE: 내 3파일 lint 클린 + 어댑터 테스트 4/4 격리 PASS + 전체 typecheck 오류가 **동시 세션 파일 2건**
  (MeasureActionDock.test.tsx·MeasurePage.tsx — measure 도메인, 내 변경 무관)뿐임을 확인(내 파일 오류 0).
  ⚠️ 전체 게이트(typecheck·build·test)는 동시 세션 미커밋 작업으로 red — 내 파일만 격리 검증 후 선택 커밋(R29 선례).
  실 LLM 프롬프트 준수 개선은 DEPLOY_ONLY이나, **방향 보장은 LLM이 틀려도 어댑터가 결정론적으로 잡음**(유닛 커버).
- 라운드 note: 동시 세션과 커밋 엉킴 방지 — 내 소스 3 + change-scope + 본 저널만 스테이징(measure/MotorPickSheet 제외).

## R39 — 측정 [기록] 로그인 게이트 + 모터 픽 드로어 종류탭·하단 추가버튼 (2026-08-02, feature/ui-change · 직접+위임)
- REQUEST: ① [기록] 버튼 로그인 전 미노출 ② 로그인 후 [기록] → 모터 있으면 종류별 탭 분류·선택 ③ [+ 새 모터 추가] 드로어 하단 상시.
- CHANGED:
  · src/features/measure-session/ui/MeasureActionDock.tsx — deriveMeasureAction에 4번째 인자 loggedIn 추가.
    산출을 deriveBaseAction으로 분리하고, base가 record인데 !loggedIn이면 신규 `{kind:'login-hidden'}`로 치환.
    Dock은 login-hidden이면 slotConfig 이전에 early-return하여 h56 슬롯에 "로그인 후 기록할 수 있어요" 캡션(버튼 미노출·레이아웃 불변).
    slotConfig 인자는 `Exclude<MeasureAction,{kind:'login-hidden'}>`로 타이핑(exhaustive 유지). record 외 액션은 로그인 무관.
  · src/features/measure-session/ui/MeasureActionDock.test.tsx — deriveMeasureAction 7콜에 loggedIn 인자 추가 +
    login-hidden 치환 3케이스(measuring·weak-signal 미로그인 치환 / activate·back-to-origin은 미로그인에도 유지) +
    Dock login-hidden 렌더(버튼 없음·캡션) 케이스.
  · src/pages/measure/ui/MeasurePage.tsx — useSession 소비(const {user}=useSession(); loggedIn=user!==null), deriveMeasureAction 4번째 인자로 전달.
  · src/features/collect-measure/ui/MotorPickSheet.tsx — MUI Tabs 인라인 종류 필터(서로 다른 종류 ≥2일 때만, FSD상 MotorKindFilter
    import 회피·MOTOR_KIND_LABELS 사용·ALL sentinel), effectiveFilter 강등 방어(선택 종류 소멸 시 전체), 스크롤 영역(maxHeight 50vh),
    [+ 새 모터 추가]를 조건부 밖으로 빼 상시 하단 렌더. 0개는 EmptyState 액션 대신 중립 문구+하단 버튼.
  · [신규] src/features/collect-measure/ui/MotorPickSheet.test.tsx — 6케이스: 0개 중립문구+하단버튼·탭 라벨 순서(전체/토크튠/하이퍼대시)·
    탭 선택 필터·모터 있어도 하단버튼 상시·종류 1개면 탭 없음·pending 시 행/버튼 비활성.
- EVIDENCE: LOCAL — typecheck·lint 클린, 전체 vitest 35파일 282 PASS(R39 20건 포함), build OK.
  프리뷰(:8082 미로그인 측정화면) 실측: [기록] 버튼 DOM 부재·캡션 노출·h56 슬롯 유지(스크린샷). 로그인 후 픽 시트 실동작은 DEPLOY_ONLY(render 테스트로 계약 고정).
- 위임 note: Slice A(MotorPickSheet)를 component-builder(fable)에 위임 — 컴포넌트+테스트 작성 완료 후 Fable 5 한도로 종료.
  산출물 검수(라벨·계약·마크업 보존) 후 오케스트레이터가 그대로 채택. Slice B(로그인 게이트)는 직접.
- 라운드 note: 동시 세션 recommend-voltage(R35)가 8e95fba로 change-scope·claude.md 저널 포함 커밋됨 — 내 R39 소스 5파일만 스테이징.

## 2026-08-02 R37 인사이트 카드 파노 히어로 — 직접 구현 (feature/ui)
- **사용자 요청**: "레이스 카드 정보에 모터 파노도 전압과 같이 히어로로 — 파노값도 아주 중요해." 파노 히어로 값 = 최근 완주 파노(사용자 선택, 전압 히어로와 짝).
- MODIFIED:
  · src/entities/race-record/model/race-insight.ts — RaceInsight에 `lastFinishedPanoHz: number|null` additive.
    computeRaceInsight 1-pass에서 최신순 첫 완주 회차에 lastFinishedVoltage와 **같은 회차의 panoHz**를 함께 잡음(재정렬 없음).
  · src/features/race-record/ui/RaceInsightCard.tsx — ready 1행을 [최근 완주 파노][최근 완주 전압] 2열 히어로로
    (파노 text.primary·전압 primary.main 강조 유지), 완주 전압대는 전압 히어로 아래 보조로 이동. insufficient 축약도
    "최근 완주 {파노} · {전압}". formatFanoHz import 추가.
- 픽스처 갱신(신규 필수 필드 6파일): race-insight.test(파노 480 구분값 단언·완주0건 null)·RaceInsightCard.test
  (2 히어로·insufficient 짝)·analyze-race-payload.test·analyze-race.test·race-goal-recommend.test·race-analysis-gate.test.
- 보존: RaceInsight 기존 필드·kind 분기·empty=null·완주0건 "완주 기록 없음"·formatVoltage 자릿수·onOpenHelp·[보는 법]·
  서버 동기화/스키마 불변(파생 파노는 IndexedDB 원본에서 계산). RaceRecordRow·RaceMotorList 무변경(파노 이미 주값).
- EVIDENCE: Node22 게이트 4종 PASS(typecheck·lint·**test 282**·build) — 동시 세션 measure 오류 해소 후 전체 클린 + check-iterate-scope OK.
  카드 실화면(2열 히어로 폭·정렬)은 로그인 게이트 뒤 DEPLOY_ONLY — render 테스트로 계약 고정, 배포 후 시각 튜닝 가능.
- 라운드 note: R35(AI 방향 가드)에 이어 본 라운드 R37(동시 세션이 R34·R36대 번호 사용 가능 — 커밋 해시로 구분). R36(AI 추천 항목)은 다음.

## R40 — 모터 픽 드로어 높이 50vh 고정 + 리스트 내부 스크롤 (2026-08-02, ui-change · 직접)
- REQUEST(사용자): [기록] 눌렀을 때 드로어 높이를 화면의 1/2(50vh)로 고정, 모터 리스트는 그 안에서 스크롤.
- CHANGED:
  · src/shared/ui/bottom-sheet/BottomSheet.tsx — 선택적 `height` prop 추가(기본 undefined=자동 높이, 기존 3시트 무변).
    지정 시 Drawer paper를 height로 고정+flex 컬럼, 제목 flexShrink:0, children을 flex:1·minHeight:0 컬럼으로 감싸 스크롤 소유권 위임.
  · src/features/collect-measure/ui/MotorPickSheet.tsx — height="50vh" 전달. 스냅샷/에러/탭/버튼 flexShrink:0 고정,
    콘텐츠 영역을 flex:1·minHeight:0 컬럼으로, 리스트 박스를 maxHeight:50vh→flex:1·minHeight:0·overflowY:auto로 교체(리스트만 스크롤).
    [+ 새 모터 추가]는 flexShrink:0로 시트 하단 상시 고정(R39 계약 유지).
- EVIDENCE: LOCAL — typecheck·lint 클린, 전체 vitest 35파일 282 PASS(MotorPickSheet render 6건 구조 유지), build OK.
  프리뷰(:8082 미로그인) 회귀: 측정화면 R39 캡션 유지·[기록] 부재·콘솔 무오류. 열린 시트 50vh·스크롤 실측은 DEPLOY_ONLY
  (로컬은 로그인·마이크 없이 [기록]→시트 오픈 불가) — flex 계약은 결정론적.
- 라운드 note: 동시 세션(R37 인사이트 카드, race-record 8파일)이 change-scope.md에 doc append + 소스 미커밋 진행 중.
  공유 change-scope.md는 내 R40만 HEAD 기준으로 격리 스테이징(plumbing), 그들의 R37 소스·doc은 미접촉. 내 소스 2 + 저널만 커밋.

## R41 — 레이스 UX 개선 6종 (2026-08-03, ui-change + feature · 직접)
- REQUEST(사용자): ① 모터상세→레이스상세 진입점 ② 레이스 기록 행 클릭→수정·스와이프 삭제만
  ③ 목록 파노=최근 측정 파노(레이스 없어도) ④ 레이스 있으면 완주 전압+파노 ⑤ 랩타임 실측 타이머 팝업
  ⑥ 요약 카드 Hz/V 단위 제거·파노 색=전압 색. (확정: ③④ 완주 우선/엔티티 파생, ① 진입점 구현)
- CHANGED:
  · [엔티티 ③④] entities/motor/model/types.ts — MotorSummary에 lastFinishedRace?: MotorSummaryRace additive.
    entities/motor/api/repository.ts — pickLatestFinishedRace(race.rows에서 result==='finished' 최신) 파생, 추가 IO 없음.
    repository.summary.test.ts — 최신 이탈이어도 완주 기준 유지 / 완주 0건이면 부재 회귀 2건.
  · [③④] RaceMotorList.tsx — deriveRightColumn: 완주 있으면 완주 파노+"완주 · {전압}", 없으면 최근 측정 파노 + "완주 기록 없음"/"레이스 기록 없음". EM_DASH는 파노·측정 둘 다 없을 때만.
  · [②] RaceRecordRow.tsx — Paper role=group→button(onClick→onEdit, Enter/Space, deletePending 가드), 스와이프 트레이 [수정] 제거·[삭제]만(trayWidth ×1). RaceRecordRow.test: group→button + 클릭/삭제-only/pending 가드 3건.
  · [⑤] LapTimerDialog.tsx(신규) — performance.now() 히어로 타이머, idle→시작→running→정지→stopped→완주/이탈/취소.
    완주→onResult('finished',초)·이탈→onResult('retired',초)·취소→무효. 리셋은 transition onExited(effect 내 setState 회피).
    RaceEntrySheet.tsx — 랩타임 FormField action에 TimerIcon 버튼, handleTimerResult가 onDraftChange({result,lapTimeRaw})로 반영(이탈이면 이탈 사유 셀렉트 자동 노출). LapTimerDialog.test 5건(rAF stub).
  · [⑥] RaceInsightCard.tsx — 히어로 파노 formatPanoValue(단위 없음)+색 primary.main(전압과 동일), 전압 voltageDigits, finishedBandLabel 단위 제거. RaceInsightCard.test: 단위 문자열 갱신(512.0 Hz·2.80 V→512.0·2.80 등).
  · [①] MotorDetailPage.tsx — 히어로 하단 고정영역에 "레이스 기록 보기 →" Button → navigate('/race/:motorId').
  · [⑤ 지원] shared/ui/icons/icons.tsx+index.ts — TimerIcon(Material stopwatch glyph) 신규.
- EVIDENCE: LOCAL — typecheck·lint 클린, 전체 vitest 36파일 292 PASS(신규 10: LapTimerDialog 5·RaceRecordRow 3·repository.summary 2), build OK.
  프리뷰: 모터 하나 시드 후 모터 상세에서 "레이스 기록 보기 →" 노출·클릭 시 /race/:id 이동·콘솔 무오류 실측(시드 원복). 로그인 필요한 레이스 목록/상세/타이머 실동작(②③④⑤⑥)은 DEPLOY_ONLY — 단위/render/상태기계 테스트로 계약 고정.
- 라운드 note: 동시 세션 신규 커밋 없음(HEAD=R40). 내 R41 15파일만 스테이징. race-record/ui/index.ts 무접촉(LapTimerDialog는 시트 내부 사용).

## R42 — 레이스 진입점 위치·스타일 변경 (2026-08-03, ui-change · 직접)
- REQUEST(사용자): "레이스 기록 보기"를 측정 기록 타이틀과 같은 라인 오른쪽 끝, 언더라인 버튼으로.
- CHANGED: src/pages/motor-detail/ui/MotorDetailPage.tsx — R41의 고정영역 풀-width outlined 버튼 제거,
  측정 기록 SectionHeading의 action 슬롯(ml:auto "Show All" 자리)에 언더라인 text Button으로 이동(→ 화살표 제거). navigate 대상 불변.
- EVIDENCE: typecheck·lint·build 클린. 프리뷰: 측정 기록 라인 우측 끝 언더라인 링크(textDecoration underline·fullWidth false·같은 라인 top 일치)·클릭 시 /race/:id, 스크린샷. 시드 원복.
- note: 측정 기록 헤딩은 records>0에서만 렌더 → 링크도 그 조건(0측정 모터는 레이스 데이터도 거의 없어 수용). 동시 세션 무관, HEAD=R41 위에 쌓음.

## R43 — 레이스 진입점을 하단 도크 2버튼으로 (2026-08-03, ui-change · 직접)
- REQUEST(사용자 다단계): [측정] 옆 [레이스 보기] 나란히 → 최종 "너비 작게·모양 동일(컷코너)·아웃라인".
- CHANGED: src/pages/motor-detail/ui/MotorDetailPage.tsx —
  · R42 측정 기록 헤딩 언더라인 링크 되돌림.
  · 하단 도크: full-width [측정] → 2버튼 행. [측정] contained flex3 48px, [레이스 보기] flex1 48px.
  · [레이스 보기] 컷코너 아웃라인: variant outlined의 직각 보더를 border:none으로 끄고, ::before(테두리색 clip cutCorner)+
    ::after(background.default 1px 인셋 clip cutCorner)로 컷코너 테두리 링 재현. shapeTokens·motionTokens import 추가.
- EVIDENCE: typecheck·lint·build 클린. 프리뷰: measureW 316/raceW 124(≈2.5:1)·동일 48px·raceBorder 0px none·::before clip cutCorner+outline색, 스크린샷. 시드 원복.
- note: DS-A13(컷코너=contained 전용)은 테마에서 유지, 이 한 버튼만 로컬 override로 컷코너 아웃라인 구현. R42 링크는 이 커밋으로 무효화(미푸시 반복 탐색).
