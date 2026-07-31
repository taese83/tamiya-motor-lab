# Project Brief — 레이스 AI 활용 Phase 1 (minicar-motor-lab)

> 2026-07-31. Phase 2(설계) 단일 진입점. 상세는 원 문서 참조: `race-ai/{planning-context,requirements,ux-brief,feature-plan,tech-note}.md`, `ai-requirements.md`, `autonomy-risk-matrix.md`. 결정 이력 DL-021~025. 본 문서는 요약이며 신규 결정 없음. (기록 주체: 오케스트레이터 대필 — ownership hook.)

## 한 줄 요약 (pain → 해법 → 성공 조건)

R22 결정론 카드는 개별 수치(완주 전압대·스트릭·추세)만 주고 교차 해석(사유 패턴×전압대×추세)은 사용자 암산이 pain — `/race/:motorId` 상세에 on-demand "AI 분석" 버튼 1개를 얹어 4역할(진단·코칭·브리핑·이상 감지) 섹션형 통합 응답으로 인과 질문에 답한다. 성공 조건: 버튼 1탭 → 수 초 내 R22 수치와 모순 없는 근거 인용 응답 → 전압 외 액션 결정 가능. AI 실패·오프라인이어도 R22 카드는 항상 그대로(무료·즉시·오프라인 불변 — 보완이지 대체가 아님).

## 결정론(R22) vs AI 경계 (REQ-AI-001 MUST — planning-context §구조 해석 표 canonical)

| 역할 | 결정론이 이미 답함(AI 재수행 금지, DL-022) | AI 고유 몫 |
|---|---|---|
| ① 이탈 진단 | `resolveSpeedRelated`·leaf당 causal 힌트 | 회차 간 패턴 가설(예: jump_attitude 반복→댐퍼) |
| ② 세팅 코칭 | 전압 숫자 = 기존 `recommend-voltage`(재발명 금지) | 비전압 처방(댐퍼·밸런스·점검), 전압은 advisor 인용만(A2) |
| ③ 기록 브리핑 | finishedBand·streak·trend 수치 = R22 | 수치의 종합 서사(재계산·재진술만이면 가치 없음) |
| ④ 이상 감지 | CV 컨디션·추세 방향 | 교차 이상(완주하던 전압대 갑작스런 이탈 등), 근거 없으면 침묵 |

공통 원칙: R22 산출값은 클라가 계산해 프롬프트에 **주입**, AI는 해석·설명·우선순위 제안만. 전압 출력 시 서버 2.6~3.2V/0.02 클램프.

## 범위 스냅샷

- **단일 진입점**: 4역할의 시점·입력·화면이 동일 → 버튼 1개+엔드포인트 1개+섹션형 응답(A1/D1). 신규 화면 없음, 진입점은 R22 카드 하단 행 text 버튼(ux-brief A안 권고).
- **Won't**: W1 자동 호출·알림·감시 / W2 L1 초과(AI 저장·적용) / W3 모터 간 비교 / W4 MeasureRecord AI / W5 자유 텍스트 입력(인젝션 NON-GOAL) / W6 역할별 4버튼·4엔드포인트 / W7 응답 영속 저장.

## 핵심 계약 요약 (상세: feature-plan §계약, tech-note)

- **입력 payload**: `{races(≤20·최신순·weight), insight(RaceInsight 전체 주입), retireReasonMeta(등장 leaf만), advisorVoltage|null, excludedNoReason}`. 모터 id·세션·측정·자유 텍스트 미포함.
- **응답 스키마(zod)**: `{verdict:'ok'|'insufficient', reason?, sections?:{diagnosis?/anomaly?/briefing?/nextRace?}, evidence:{racesUsed, excludedNoReason}(필수)}`. 근거 없는 섹션 키 생략(침묵), 산문·스키마 위반=실패 처리. "판단 불가"는 2xx 정상 응답.
- **인증**: 신규 엔드포인트 `requireSession` 필수(AC-1, 비인증 401). 기존 recommend-voltage 소급은 상충 C1 참조.
- **자율성 L1**: 읽기 전용 제안만. HIGH_IMPACT_ACTIONS 없음, AI write 경로 구조적 부재. L2 승격 조건 5개는 risk-matrix §3.
- **스택 변경 0건**: 신규 의존성·인프라 없음. raw fetch+Haiku 4.5+temp 0+max_tokens 1024, 서버 JS 구조 검증+클라 zod 이중 검증, 클라 타임아웃 10s+`AbortSignal.any` 취소, 신규 함수 maxDuration 30s 명시.

## 상태 계약 5종 (REQ-RAI-ST-001 — 전 상태에서 R22 카드 불변)

| 상태 | 요구 | UX(ux-brief) |
|---|---|---|
| 대기 | 버튼만 표시 | 카드 하단 행 text 버튼 — 조용히 존재 |
| 요청 중 | 스피너+취소 가능+타임아웃(클라 10s) | "분석 중…" disabled+[취소], 레이아웃 시프트 없음 |
| 성공 | 섹션형 응답+근거 범위 표기 | 접힘 기본(요약 1줄)→펼침 4섹션, 근거 캡션·AI 표식·L1 caption |
| 실패 | 명시 실패, 성공 위장·휴리스틱 대체 금지 | 1줄 안내+[다시 시도] |
| 근거 부족 | 클라 게이트가 호출 자체 차단(버튼 비활성+사유). 서버 "판단 불가"(2xx)도 그대로 표시 | 중립 톤, error Alert 금지 |

## 딜리버리 단위 U1~U6 (feature-plan — 의존: U1 계약 선행 → U2·U3·U4·U5 병렬 → U6 통합)

| # | 단위 | Owner |
|---|---|---|
| U1 | 응답·요청 zod 계약+클라 어댑터(폴백 없음, typed unavailable) | `features/race-record/api/analyze-race.ts` 신규 |
| U2 | payload 직렬화기(순수) | `analyze-race-payload.ts` 신규 |
| U3 | 근거 부족 게이트(순수 selector) | `entities/race-record/model/race-analysis-gate.ts` 신규 |
| U4 | 서버 엔드포인트(requireSession·클램프·best-effort rate limit) | `api/analyze-race.js` 신규(+`_lib/anthropic.js` 추출 선택) |
| U5 | 응답 UI 카드(5상태·접힘 기본) | `RaceAnalysisCard.tsx` 신규 |
| U6 | 진입점 배선+상태 훅(비영속) | `RaceInsightCard.tsx`·`RaceDetailPage.tsx` 수정, `use-race-analysis.ts` 신규 |

CHANGE_BUDGET: 신규 8+테스트 ~5, 수정 5±. Effort **M**(split 권고: 1차 통합 응답 / 2차 focus 진단·세션 캐시). 최소 검토 단위: mock fixture로 5상태 전환(실 LLM 불필요). 데이터 전략 `mock` — 읽기 전용 직렬화, migration 0, mock→real은 Vercel preview 실 호출 1회(owner: 사용자).

## 결정 확정 (2026-07-31 사용자 체크포인트 — DL-026~028)

- **D1 = 단일 버튼 통합** — 버튼 1개·엔드포인트 1개·섹션형 응답 확정. 역할별 분리 최종 기각.
- **D2 = requireSession 소급 적용** — 기존 recommend-voltage 포함. C1 상충 해소(ai-requirements MUST와 일치).
- **A2 = AI 추천 연쇄 호출** — 코칭 섹션은 분석 시 함께 호출한 최신 AI 추천 전압을 인용. ⚠️ LLM 2회/요청(비용·지연 2배 수용). Phase 2 지시: 서버 내부 연쇄 / 타임아웃·maxDuration 재산정 / 추천 실패 시 advisorVoltage null 강등(분석 계속) / 합산 토큰 예산 갱신.
- D3(세션 캐시)는 기본값(유지 없음)으로 착수. F1~F5는 Phase 2 입력 지시.

## 결정이 필요했던 사항 (원문 보존 — 위 확정으로 대체)

- **D1(최우선)**: 통합 1버튼(권고 A1) vs 역할별 분리 — 기각 시 계약·UI·엔드포인트 전면 재설계(feature-plan §미결 영향).
- **D2**: requireSession을 기존 recommend-voltage에 소급할지 — tech-note 판정: 리스크 낮음·소급 권고(401→휴리스틱 자연 수렴).
- **D3**: 응답 세션 내 메모리 캐시 허용 여부 — 결정 전 기본값: 유지 없음(새로고침 소멸).
- ASSUMPTION A1(단일 엔드포인트 통합 — 검증: plan review 사용자 확인) / A2(전압은 advisor 인용, AI는 비전압 — 검증: fixture 모순 검사) / A3(Haiku 4.5·서버 env·temp 0 재사용 — 검증: tech-note에서 확인 완료). 예산 수치도 ASSUMPTION(사용자 확정 시 상수 교체). BLOCKER: 없음.

## 문서 간 상충 (발명으로 메우지 않음 — Phase 2에서 해소)

- **C1 requireSession 소급 지위**: ai-requirements REQ-AI-004는 "소급 적용 **요구**(MUST)", planning-context·requirements는 **D2 미결**, tech-note는 "권고". 요구 확정인지 미결인지 사용자 확인 필요.
- **C2 max_tokens**: ai-requirements "역할② 300, ①③④ 500 이하"(역할별 기준) vs tech-note "통합 응답 1024"(등가 주장). 통합 응답 상한 수치 확정 필요.
- **C3 실패 폴백 표현**: REQ-AI-005·AC-7 "결정론 폴백 렌더" vs REQ-RAI-005·feature-plan "휴리스틱 폴백 생성 금지, 실패 표면화". 의도는 "R22 카드 유지+명시 실패"로 수렴 가능해 보이나 AC-7 문구 정합 확인 필요.
- **C4 소수치 불일치**: 요청 중 타임아웃(6s 준용 vs 10s) / 검증 뷰포트(375×667 vs 360×640) / 섹션 순서(requirements: 진단·코칭·브리핑·이상 vs ux-brief·feature-plan: 진단·이상·브리핑·제안).

## 리스크 상위 3 (autonomy-risk-matrix·tech-note 근거)

1. **무인증 recommend-voltage(denial-of-wallet, 높음)**: `requireSession` 미적용 공개 POST 확인됨 — 신규는 필수 적용, 소급은 C1/D2. L2 승격도 이 해소 전 금지.
2. **환각·근거 부족(코칭 높음/브리핑 중)**: 과전압 제안=실물 손해, 수치 환각=신뢰 상실 — 완화: 주입·재계산 금지, 서버 클램프, speedRelated=false 전압 조언 금지, 클라 게이트+서버 "판단 불가" 이중 방어, 미측정 세팅 "가능성" 어휘 상한.
3. **rate limit serverless 한계(중)**: 인스턴스 간 메모리 비공유로 in-memory 카운터는 best-effort — 주 방어는 requireSession+결정론 게이트+max_tokens+20건 컷. hard 월 상한 필요 시 기존 Neon 카운터로만 승격(신규 인프라 금지).

## Phase 2로 넘길 것

- **설계 산출물 판단**: tool use 없음·모델 직접 단발 호출·L1이므로 **tool-contracts 불필요**. ai-architecture는 전면 문서 대신 경량으로 충분 — 필요 범위: ① 프롬프트 전문(feature-plan §원칙 1~6 구체화) ② U1/U4 스키마 최종 확정(C2·C3 해소 반영) ③ U5 레이아웃 명세(접힘/펼침·수직 예산 — REQ-RAI-NFR-001).
- 프로토타입 확인 6항목(ux-brief §Phase 2 목록): 5상태 전환·접힘 1줄 뷰포트·펼침 스크롤·수치 눈 대조 정합(fixture 4종)·"판단 불가" 카피·취소 후 재요청.
- D1~D3 사용자 확인, C1~C4 해소. DEPLOY_ONLY(AC-5·AC-6)는 Phase 3 이후 Vercel preview, owner 사용자.

## Traceability 요약 (REQ ↔ 단위 ↔ 테스트 — 전체 표는 feature-plan §테스트 계획)

| REQ/AC | 단위 | 테스트 |
|---|---|---|
| REQ-RAI-001/005/006, NFR-004 | U6 | RTL page: 1탭=1요청·자동 트리거 없음·취소 재요청·R22 불변·새로고침 소멸 |
| REQ-RAI-002/003/ST-001, NFR-005/006 | U5 | RTL: 5상태·근거 캡션·중립 톤·L1 caption·aria |
| REQ-RAI-003, AC-3 | U2 | unit: ≤20 컷·weight·트리 메타·advisor 인용·제외 필드 부재 |
| REQ-RAI-004, AC-4 | U3 | unit: empty/2건/사유 전무 차단·요청 0회 |
| REQ-RAI-005, AC-7, NFR-002 | U1 | unit: zod 실패→unavailable·타임아웃/abort·폴백 미생성 |
| REQ-RAI-007=AC-1, AC-2, REQ-AI-001, NFR-003 | U4 | vitest node: 401/400/5xx/클램프/429 |
| AC-5·AC-6 (DEPLOY_ONLY) | — | 실 LLM grounding·전압 조언 부재·p95 (Vercel preview) |
