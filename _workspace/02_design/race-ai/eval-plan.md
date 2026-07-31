# Eval Plan — 레이스 AI 분석 Phase 2 (2026-07-31)

> 근거: `01_plan/race-ai/{project-brief,requirements,feature-plan}.md`, `ai-requirements.md`(AC-1~7), DL-029(**전압 수치 출력 금지** — voltageNote·서버 전압 클램프 폐기, 코칭은 비전압 처방만). 1인 개인 도구 — 과설계 금지, 결정론은 CI hard gate / 모델 품질은 DEPLOY_ONLY 관찰로 이원화. (기록 주체: 오케스트레이터 대필.)

## 1. 실패 모드 → 평가 매핑

| 실패 모드 | 비용 | 방어 평가 |
|---|---|---|
| 수치 환각(주입값에 없는 숫자) | 신뢰 상실·오판 | G-NUM 자동 검출기 (§4) |
| 전압 수치 출력(DL-029 위반) | 과전압 실물 손해 | G-VOLT 자동 검출기 — 전 시나리오 |
| speedRelated=false에 전압 조언 | 잘못된 세팅 | G-BAN 금지어 검사 (S2) |
| 근거 부족인데 지어냄 | 허위 경보 | 클라 게이트 + verdict=insufficient |
| 스키마 위반·산문 성공 위장 | 계약 붕괴 | zod 이중 검증 + 실패 표면화 (D1·D4) |
| 무인증 호출 | 키 비용 | 401 + upstream 미호출 trace (D6) |

## 2. 결정론 평가 — LOCAL_VERIFIABLE, CI hard gate (vitest, 모델 불필요)

| # | 항목 | fixture | 검증(trace 포함) |
|---|---|---|---|
| D1 | 스키마 준수 | 정상 4섹션 / 산문 / 스키마 외 필드 / 길이 초과 | U1 safeParse: 정상만 ok, 나머지 `unavailable` — 폴백 데이터 미생성 |
| D2 | 클라 게이트 차단 | races 0건 / 2건 / retired 전부 사유 없음 | 버튼 비활성+사유 문구 + **fetch spy 호출 0회** |
| D3 | evidence 서버 덮어쓰기 | LLM mock이 `evidence:{racesUsed:99}` 조작 반환 | 서버가 payload 파생값으로 강제 재기입 — 응답 evidence == 입력 값 |
| D4 | 실패 표면화 | upstream 5xx / 429 / 파싱 불가 / 오프라인 | unavailable + R22 카드 DOM 불변 + 휴리스틱 대체 문구 부재 |
| D5 | 타임아웃·취소 | fake timers 10s / abort 후 재요청 | unavailable 전이·인플라이트 abort·재요청 정확히 1회 |
| D6 | 401 | 비인증 POST | 401 + **anthropic fetch mock 호출 0회**(과금 경로 미진입) |
| D7 | payload 직렬화 | 25건 입력 / 자유 필드 포함 시도 | ≤20 컷·weight·등장 leaf만·`motorId/id/name/email/sub` **부재** |

전부 feature-plan §테스트 계획 U1~U6에 흡수 — `pnpm test`가 곧 이 게이트다.

## 3. 모델 출력 평가 — DEPLOY_ONLY golden dataset (Vercel preview, temp 0 × 각 1회)

| # | 시나리오 | 기대 성질 | 판정 |
|---|---|---|---|
| S1 | 사유 풍부 혼재(corner·jump_attitude 반복 + finished, 12건) | verdict=ok, diagnosis가 **등장 leaf만** 언급, 반복 패턴→댐퍼/밸런스 "가능성" 어휘 | 자동(G-NUM·G-VOLT·leaf 집합) + 사람 |
| S2 | 기계형만 — retired 전부 parts·stall | 진단·nextRace에 **"전압" 단어 부재**, 처방은 점검·파츠 계열만 | 자동(G-BAN) |
| S3 | 완주만 — retired 0건 | diagnosis·anomaly 키 생략 또는 이탈 서술 부재(침묵), briefing 중심 | 자동(섹션 키) + 사람 |
| S4 | 표본 경계 — 정확히 3건 | 과잉 단정 없음, trend=null이면 추세 어휘 부재 | 자동(어휘) + 사람(톤) |
| S5 | 사유 없는 이탈 혼재 — excludedNoReason=4 | 미입력 이탈의 사유 **추측 부재**, evidence 정확 | 자동(G-EVID) + 사람 |
| S6 | 추세 상반 — panoHz improving·lapTimeMs worsening | 주입 방향 그대로 서술(반전 금지), 모순 없는 종합 | 사람(반자동 보조) |
| S7 | 동일 전압 반복 — band min=max | 전압대 "폭" 창작 부재, 전압 수치 미출력 | 자동(G-VOLT·G-NUM) |

## 4. Grader 설계 (자동 판정은 정규식·집합 검사 수준)

- **G-SCHEMA**: U1 zod safeParse 재사용.
- **G-NUM 환각 수치 검출기**: 응답 전체에서 `/\d+(\.\d+)?/g` 추출 → 허용 집합{payload의 voltage·panoHz·lapTimeMs 원문, finishedBand min/max, racesUsed·excludedNoReason·streak 건수, 1~20 정수} 밖이면 FAIL. 오탐은 사람 확인 후 시나리오별 화이트리스트 — 기본은 엄격.
- **G-VOLT**: `/\d+(\.\d+)?\s*[Vv]|볼트|전압.*\d/` 검출 시 FAIL — **전 시나리오**(DL-029).
- **G-BAN**: S2 한정 — 전 섹션에 "전압" 부재.
- **G-EVID**: evidence == fixture 파생값 등치.
- **G-LEN**: summary당 2문장·길이 상한.
- **사람 판정**: 과잉 단정 톤(S4)·추세 종합 정합(S6)·해석 가치·한국어 품질. 7건×4섹션 ≈ 5분 체크리스트.
- **LLM-as-judge: 비권고.** 시나리오 7개 규모에서 judge 구축·검증 비용이 피평가 비용을 초과. 20+로 늘면 재검토.

## 5. 임계·릴리즈 게이트

| 등급 | 항목 | 기준 | 릴리즈 |
|---|---|---|---|
| Hard (CI) | §2 D1~D7 | 100% PASS. **BLOCKED(실행 불가)=FAIL로 계산** | 미충족 시 배포 차단 |
| Hard (배포 전 1회) | §3 자동 grader 6종 | 7 시나리오 전부 PASS | FAIL 시 프롬프트 수정 후 재실행 전 배포 금지 |
| 관찰 (DEPLOY_ONLY) | 사람 판정·p95 6s(AC-6) | 첫 실행 = baseline | 차단 아님. 2회 연속 실패 시 승격 |

PASS evidence: 실행마다 {날짜, model id, 프롬프트 git hash, fixture id, raw 응답 JSON, grader 결과}를 `_workspace/04_qa/race-ai/eval-log.md`에 append — **raw 응답 없는 PASS 주장은 무효**.

## 6. 회귀 관리

| 변경 | 재실행 |
|---|---|
| 프롬프트 문구 | §3 전체 7건 + 자동 grader |
| 모델 교체 | §3 전체 + D1·G-SCHEMA — baseline 갱신 |
| 응답·payload 스키마 | §2 전체 + §3 전체 |
| RETIRE_REASON_TREE leaf 추가 | S1·S2·S5 fixture 갱신 후 해당 3건 |
| UI·훅만 | CI만(§2) |

## 7. Production 승격 기준

응답 비영속이므로 트리거는 사용자 목격: 이상 응답(수치 환각·전압 언급·모순 서사)을 보면 ① U2로 payload 재현 ② 위반 성질을 자동 grader로 정식화 ③ S8+로 golden에 append. **자동 판정 불가능한 관찰은 승격하지 않고 사람 체크리스트로만**(dataset 오염 방지). 승격 시 원 응답 사본 필수.
