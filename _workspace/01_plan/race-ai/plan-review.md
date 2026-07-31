# Plan Review — 레이스 AI 활용 Phase 1 (2026-07-31, plan-reviewer)

> 대상: `race-ai/{planning-context,requirements,ux-brief,feature-plan,tech-note}.md` + `ai-requirements.md`, `autonomy-risk-matrix.md`. 근거 코드 대조: `api/recommend-voltage.js`, `api/_lib/authGuard.js`, `api/data.js`, `race-insight.ts`, `RaceInsightCard.tsx`. read-only 리뷰 — 파일 수정 없음.
> (기록 주체: 오케스트레이터 대필 — ownership hook.)

## 판정: **NEEDS_DECISION**

Phase 2가 새 제품 결정을 발명하지 않고 시작할 수 있는 수준이나, 설계상 열어둔 D1·D2에 더해 **A2(advisor 인용)의 실행 방법이 미정**임을 새로 발견했다. BLOCKER 없음 — 병렬 착수 안전.

## Readiness Gate 통과 항목

- **Product frame**: 대상 화면(`/race/:motorId`)·사용자(본인 1명)·pain(교차 해석 암산)·관찰 가능한 성공 조건(1탭→모순 없는 인용 응답→비전압 액션 결정, R22 불변) 전부 명확. 결정론/AI 역할 경계 표(planning-context §구조 해석)가 4역할 각각의 "AI 고유 몫"을 고정 — 재계산·재진술 금지가 요구(REQ-AI-001/002)→프롬프트 원칙 2→스키마(voltageNote 인용+클램프)→테스트(AC-3)로 이어진다.
- **사용자 확정 3건 위반 없음(전수 확인)**: ① 4역할 전부 = 응답 내 4섹션(축소 아님, 침묵 원칙에 의한 섹션 생략만) ② on-demand only — REQ-RAI-001이 "버튼 탭 외 어떤 이벤트로도 요청 없음"을 테스트로 고정, W1이 자동 감시 재유입 차단 ③ L1 — write 경로 구조적 부재(risk-matrix §2), 응답 비저장(REQ-RAI-006), 자유 텍스트 W5 금지, L2 승격 조건 별도 문서화. 몰래 넘은 곳 없음.
- **상태 커버리지**: 5상태(REQ-RAI-ST-001) + 클라 게이트(버튼 비활성)와 서버 "판단 불가"(2xx 정상) 구분 존재. Won't 7건이 범위 유입 방지. UX Check trigger(AI 신뢰·정보 밀도) 적용, annotation 해당 없음 근거 명시.
- **데이터 전략**: mock + fixture 9종, production mutation 없음, Mock→real 전환 조건(Vercel preview 실 LLM 1회, owner 사용자) 명시. **effort**: M, driver·split(1차 통합/2차 focus)·최소 검토 단위(mock 5상태) 계약 충족. serverless rate limit 한계는 tech-note §3이 "warm instance 한정 best-effort"로 **정직하게** 기술 — 1인 도구에서 requireSession+클라 게이트+max_tokens+20건 컷이 주 방어라는 판단은 타당.
- **수치 대조**: 클라 타임아웃 10s·p95 6s는 전 문서 일관(6s는 기존 advisor 예산·p95 목표로만 등장 — 충돌 아님). "3건" 기준은 코드(insight ready 최소 3건)·게이트·카피 일치. 무인증 recommend-voltage는 코드 재확인 결과 사실(`requireSession` import 없음).

## 발견 사항 (Phase 2 입력에 반영 — 사용자 결정 불요)

- **F1 (중) AC-7 문구 자기모순**: ai-requirements AC-7 "AI 실패 시 클라이언트 결정론 **폴백 렌더**" ↔ REQ-RAI-005·feature-plan U1 테스트 "**폴백 미생성**". REQ-AI-005의 "휴리스틱 폴백 **또는** 명시적 실패 표시"도 분석 엔드포인트에 폴백을 허용하는 것으로 오독 가능. 두 정책 공존 자체는 feature-plan 말미·tech-note §5가 잘 구분했으나 canonical 문서(ai-requirements)가 구식 — "advisor=폴백 / 분석=실패 표면화"로 문구 분리 필요.
- **F2 (중) evidence를 LLM이 echo**: 응답 스키마의 `evidence.racesUsed·excludedNoReason`은 클라가 이미 결정론으로 아는 값(payload)인데 모델 출력에서 받도록 설계 — 근거 캡션의 원천이 환각 표면에 놓임. 서버(또는 클라)가 payload 값으로 **덮어쓰기** 권고. `citedRaces`(건수)도 의미 미정의 — 인용 강제 장치로는 약함(실질 grounding 검증은 AC-5/6 DEPLOY_ONLY로 정직하게 한정돼 있어 치명적이진 않음).
- **F3 (하) max_tokens 기술 stale**: ai-requirements "역할② 300, ①③④ 500 이하"는 A1(단일 응답) 이전 구도. tech-note 1024는 등가 내 주장이나, D1 확정 시 예산 절을 통합 응답 기준으로 갱신해야 함. 기존 recommend-voltage 300 불변은 양쪽 일치.
- **F4 (하) traceability 누락 2건**: REQ-RAI-008(재호출 변동 고지 — U5 명세엔 있으나 테스트 표 REQ 매핑 부재)·REQ-RAI-NFR-001(수직 예산 — Phase 2 체크리스트 2번으로만 커버, 테스트 표 부재). 그 외 REQ-RAI-001~007·ST·NFR·AC 전수 매핑 확인.
- **F5 (하) '근거 부족' 행 이중 의미**: ST-001 표는 클라 게이트(버튼 비활성)와 서버 판단 불가(응답 카드 위치, ux-brief)를 한 행에 합침 — 표현 위치가 다르므로 행 분리 권고. AC-4의 LOCAL_VERIFIABLE 라벨은 실제로 "mock upstream이 insufficient 반환 시 파싱·표시" 검증임을 명시하면 정확해짐.

## 우선 결정 (최대 3 — 사용자 제시용)

1. **D1 — AI 분석 진입점: 단일 버튼 통합(권고) vs 역할별 분리.** ⓐ 단일 버튼+섹션형 응답(권고): 비용 1회·화면 밀도 보존, 특정 역할만 깊게 묻기는 2차 focus 파라미터로 — trade-off는 응답이 다소 길어짐. ⓑ 역할별 4버튼: 질문 의도가 명확해지나 비용 4배·수직 예산 초과로 전 문서 재설계. → 기각 시 U1/U4/U5 전면 재작업이므로 최우선 확정 필요.
2. **D2 — 기존 recommend-voltage에 requireSession 소급.** ⓐ 소급(권고·tech-note 판정 리스크 낮음): 무인증 denial-of-wallet 봉쇄, 비로그인은 휴리스틱 폴백으로 자연 수렴 — trade-off는 비로그인 AI 추천 상실. ⓑ 미소급: 현행 유지되나 공개 POST로 키 비용 남용 표면 잔존(risk-matrix 심각도 높음). **주의: canonical ai-requirements REQ-AI-004는 이미 소급을 MUST로 기술 — 미소급 선택 시 해당 문서 개정 필요(현재 문서 간 결정 상태 불일치).**
3. **A2 실행 방법 — 코칭 섹션의 advisor 전압 출처(신규 발견).** 상세 화면 버튼 탭 시점에 advisor 결과는 저장돼 있지 않음(스키마에 필드 없음, 호출은 RaceEntrySheet 시점). ⓐ payload의 `advisorVoltage`를 **휴리스틱(결정론) 계산값**으로 채움(권고): LLM 추가 호출 없이 인용 원천 확보 — trade-off는 "AI 추천"이 아닌 휴리스틱 값 인용임을 문서화 필요. ⓑ 분석 요청마다 recommend-voltage 연쇄 호출: 최신 AI 추천 인용 가능하나 호출당 비용·지연 2배. ⓒ null 허용·전압 언급 생략: 가장 단순하나 코칭 섹션 가치 감소. → U2/U4 계약에 직결되므로 Phase 2 착수 전 확정 권고.

- D3(세션 캐시)은 안전한 기본값(유지 없음)으로 착수 가능 — 우선 결정에서 제외, 결정 후 훅 1줄 추가로 흡수(feature-plan 확인).

## 결론

3대 사용자 확정은 어느 문서도 넘지 않았고, 근거 강제·비용 방어·실패 정책은 설계 의도가 견고하다. 남은 것은 열어둔 결정 2건(D1·D2)과 신규 발견 1건(A2 출처), 그리고 canonical 문서의 문구 정합(F1~F5) — 후자는 Phase 2 입력 지시로 처리 가능하다.
