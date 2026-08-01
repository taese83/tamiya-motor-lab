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
