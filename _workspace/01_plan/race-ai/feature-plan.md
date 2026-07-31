# Feature Plan — 레이스 AI 활용 Phase 1 (2026-07-31, 계획만·구현 금지)

> 근거: `race-ai/{planning-context,requirements,ux-brief}.md`, `ai-requirements.md`, `autonomy-risk-matrix.md`. A1(단일 버튼·단일 엔드포인트·섹션형 응답) 전제. 신규 제품 결정 없음 — D1~D3 미결 유지.
> 코드 선례 확인: `api/recommend-voltage.js`(클램프·JSON-only·5xx), `api/_lib/authGuard.js`(requireSession), `src/features/race-record/api/recommend-voltage.ts`(zod·timeout), `race-insight.ts`(주입 파생), `domain.ts`(트리 메타), `RaceInsightCard.tsx`(진입점 카드).
> (기록 주체: 오케스트레이터 대필 — ownership hook.)

## 딜리버리 단위 U1~U6 (FSD owner · 의존 순서)

| # | 단위 | Owner 경로 | 의존 | 내용 |
|---|---|---|---|---|
| U1 | 응답·요청 계약(zod) + 클라 어댑터 | `src/features/race-record/api/analyze-race.ts` (신규) | entities/race-record(타입), shared/config/domain | 계약이 선행 산출물 — 서버·UI가 이 스키마를 기준으로 병렬 착수. fetch `/api/analyze-race`, 클라 타임아웃 10s(REQ-AI §6), `AbortController` 취소, zod `safeParse` 실패=실패 상태. **휴리스틱 폴백 없음** — `{status:'ok',data}` \| `{status:'unavailable',reason}` typed 반환(recommend-voltage와 계약이 다름: 성공 위장 금지, REQ-RAI-005) |
| U2 | payload 직렬화기(순수) | `src/features/race-record/api/analyze-race-payload.ts` (신규) | entities/race-record/model/race-insight, shared/config/domain | races(≤20)+insight+트리 메타+advisor 결과 → 요청 payload. 순수 함수 — 단독 unit test 대상(AC-3 절반) |
| U3 | 근거 부족 게이트(순수 selector) | `src/entities/race-record/model/race-analysis-gate.ts` (신규) | race-insight.ts | `(races, insight) → {eligible:boolean; reason?: 'empty'|'insufficient'|'no_retire_reasons'}`. kind empty/insufficient 또는 "retired 존재 & 전부 retireReason 없음" 차단(REQ-RAI-004). U1과 병렬 가능 |
| U4 | 서버 엔드포인트 | `api/analyze-race.js` (신규) + `api/_lib/anthropic.js` (추출, 선택) | authGuard.js, U1 계약 미러 | POST only·`requireSession` 필수(AC-1)·입력 검증 400·업스트림/파싱 실패 5xx(AC-2)·응답 스키마 검증+전압 수치 2.6~3.2/0.02 클램프(기존 패턴)·max_tokens ≤1024·temp 0·Haiku 4.5(A3). rate limit: §6 수치(분당 5·월 ~300)를 인스턴스 메모리 카운터로 best-effort 구현 — serverless 특성상 완전 보장 불가, 한계는 tech-note에 명기 |
| U5 | 응답 UI 카드(5상태) | `src/features/race-record/ui/RaceAnalysisCard.tsx` (신규) | U1 타입, design-tokens, formatVoltage | 접힘 기본(요약 1줄)+펼침 4섹션(진단/이상/브리핑/제안 — 순서 고정, 빈 섹션 생략), 근거 캡션 "기록 n건 기준 · 사유 미입력 m건 제외"(tabular-nums), AI 표식+재호출 변동 고지, "판단 불가"=중립 톤(Alert 금지), 실패 1줄+[다시 시도], L1 caption. 전압 표기는 `formatVoltage` 공유(눈 대조 정합). aria-live·44px(NFR-005) |
| U6 | 진입점 배선 + 상태 소유 | `RaceInsightCard.tsx` (수정: 하단 행 [AI 분석] text 버튼 — optional props `onAnalyze/analyzeDisabledReason`, 카드 순수성 유지) + `src/pages/race-detail/ui/RaceDetailPage.tsx` (수정) + `src/features/race-record/model/use-race-analysis.ts` (신규 훅: idle/loading/success/error 상태기계·취소·중복 호출 방지) | U1·U3·U5 | 페이지가 게이트 결과로 버튼 활성 결정, 응답 카드를 R22 카드 바로 아래 배치(ux-brief A안). 응답은 컴포넌트 state만 — 비영속(REQ-RAI-006, D3 기본값) |

의존 순서: **U1(계약) → {U2, U3, U4, U5 병렬} → U6(통합)**. U4는 U1의 zod 스키마를 JS로 미러(선례: 서버 클램프 + 클라 zod 이중 방어, api/와 src/는 코드 미공유).

## AI 입력 payload 계약 (계약 수준 — 구현 코드 아님)

    {
      races: [{ voltage, panoHz, result?, lapTimeMs?, goal?, retireReason?, createdAt, weight }] // ≤20건·최신순, weight=지수(기존 계약)
      insight: RaceInsight 전체            // kind·finishedBand·lastFinishedVoltage·streak·trend·excluded — 주입, AI 재계산 금지(REQ-AI-001)
      retireReasonMeta: [{ key, pathLabel, speedRelated, causal }]  // 등장 leaf만 — retireReasonRowLabel·resolveSpeedRelated로 직렬화
      advisorVoltage: { voltage, rationale, source } | null          // 기존 recommend-voltage 결과 — 코칭 섹션은 이 값 인용만(A2)
      excludedNoReason: number             // 사유 미입력 retired 건수 — 근거 캡션·프롬프트 겸용
    }

제외 원칙: 모터 id/이름·세션·측정(MeasureRecord)·자유 텍스트 일절 미포함(W4·W5, 인젝션 표면 최소). PII 실질 없음(수치+enum) 유지.

## 응답 스키마 계약 (zod — 위반 시 실패 처리, 자유 산문 금지)

    { verdict: 'ok' | 'insufficient',
      reason?: string,                       // verdict=insufficient일 때 사유(판단 불가는 2xx 정상 응답 — REQ-AI-003)
      sections?: {                           // verdict=ok. 근거 없는 섹션은 키 생략(침묵 원칙)
        diagnosis?:  { summary: string, citedRaces: number },
        anomaly?:    { summary: string, citedRaces: number },
        briefing?:   { summary: string },
        nextRace?:   { summary: string, voltageNote?: string } },  // voltageNote는 advisor/주입값 인용만·서버 클램프 검증
      evidence: { racesUsed: number, excludedNoReason: number } }  // 필수 — 근거 캡션 원천

summary는 각 1~2문장 상한(max length). 스키마 외 필드·산문 → safeParse 실패 → 실패 상태(성공 위장 금지).

## 프롬프트 설계 원칙 (문구 전문은 구현 담당)

1. **역할·도메인 지식**: recommend-voltage system 프롬프트의 도메인 블록(파노↔RPM, retired=위험 신호, weight 가중) 서술 재사용 — 역할은 "세팅 코치"에서 "기록 분석가"로 확장.
2. **재계산 금지·인용 강제**: 모든 수치는 `insight`·`races` 주입값 인용만, 외부 지식 수치 창작 금지(REQ-AI-001/002). 4역할별 결정론 경계(planning-context 표)를 프롬프트에 명시 — 재진술만인 섹션은 생략 지시.
3. **speedRelated=false 사유에는 전압 조언 금지**, 전압 숫자는 `advisorVoltage` 인용만(AC-5, A2).
4. **미측정 물리 세팅(롤러·댐퍼·기어비 등)은 "가능성" 어휘까지만** — 단정 금지.
5. **근거 부족이면 `verdict:'insufficient'`+사유 반환** — 지어내기 금지(서버 2차 방어선, 1차는 U3 클라 게이트).
6. **출력 JSON only** — 스키마 예시 포함, 첫 `{…}` 블록 파싱(기존 패턴).

## 테스트 계획 + REQ Traceability

Mock fixture(신규 `src/features/race-record/api/__fixtures__/race-analysis.ts`): ① 사유 풍부 ② 사유 없는 이탈만 ③ 표본 2건 ④ 완주만 / 응답: ⑤ 정상 4섹션 ⑥ 판단 불가 ⑦ 스키마 위반(산문) ⑧ 과장 응답(길이 초과) ⑨ 5xx/429.

| 대상 | 테스트 | REQ/AC |
|---|---|---|
| U4 서버(vitest node, upstream fetch mock) | 비인증 401 / 잘못된 body 400 / upstream 오류·파싱 실패 5xx / voltageNote 클램프 / 429 rate limit | REQ-RAI-007=AC-1, AC-2, REQ-AI-001, NFR-003 |
| U1 클라(unit) | zod 실패→unavailable / 타임아웃·abort→unavailable / 폴백 미생성 | REQ-RAI-005, AC-7, NFR-002 |
| U2 직렬화(unit) | ≤20 컷·weight·트리 메타·advisor 인용·제외 필드 부재 | REQ-RAI-003, AC-3 |
| U3 게이트(unit) | empty/2건/사유 전무→차단, ready+사유 존재→통과, 요청 0회 | REQ-RAI-004, AC-4 |
| U5 UI render(RTL) | 5상태 전환·근거 캡션·판단 불가 중립 톤·L1 caption·aria | REQ-RAI-ST-001, REQ-RAI-002/003/006, NFR-005/006 |
| U6 통합(RTL page) | 버튼 1탭=1요청·자동 트리거 없음·취소 후 재요청·R22 불변·새로고침 소멸 | REQ-RAI-001/005/006, NFR-004 |
| DEPLOY_ONLY | 실 LLM grounding·speedRelated 전압 조언 부재·p95 | AC-5·AC-6 (Vercel preview, owner 사용자) |

## CHANGE_BUDGET (추정)

- **신규 8**: `api/analyze-race.js`, `api/_lib/anthropic.js`(선택), `analyze-race.ts`, `analyze-race-payload.ts`, `race-analysis-gate.ts`, `use-race-analysis.ts`, `RaceAnalysisCard.tsx`, fixture 1. 테스트 신규 ~5.
- **수정 5±**: `RaceInsightCard.tsx`(+props, 기존 테스트 보강), `RaceDetailPage.tsx`, `features/race-record/{api,model,ui}/index.ts` 배럴, (D2 채택 시) `api/recommend-voltage.js`.
- **코드 공유 판단**: api/(JS)↔src/(TS)는 선례대로 미공유(계약 이중 방어). api/ 내부는 upstream fetch+첫 JSON 블록 파싱만 `_lib/anthropic.js`로 추출 권고(저위험·D2 소급 시 어차피 recommend-voltage 수정) — 프롬프트 문자열 공유는 결합도만 높여 비권고. 클라 zod 스키마·formatVoltage·AbortSignal 패턴은 기존 재사용.

## 미결 D1~D3 영향

| 미결 | U1 | U3 | U4 | U5 | U6 |
|---|---|---|---|---|---|
| D1 통합 1버튼(권고 A1) | 기각 시 계약 4분할 — 전면 재설계 | 영향 없음 | 기각 시 엔드포인트 4개(W6 위반, 반대) | 기각 시 카드 4개·NFR-001 재검토 | 기각 시 진입점 재설계 |
| D2 requireSession 소급 | 영향 없음(신규는 항상 적용) | 없음 | 채택 시 recommend-voltage.js 수정+ST-002 확인 추가 | 없음 | 비로그인은 v2.43 게이트가 선차단 — 상태 추가 없음 |
| D3 세션 캐시 | 없음 | 없음 | 없음 | 재호출 변동 고지 문구 유지 | 채택 시 훅에 메모리 캐시 1줄 — 기본값(유지 없음)으로 착수, 결정 후 추가 |

---

계획 요지: 계약(U1)을 첫 산출물로 고정해 서버(U4)·게이트(U3)·UI(U5)를 병렬화하고, 통합(U6)만 직렬이다. recommend-voltage 선례에서 재사용하는 것은 **패턴**(서버 클램프·zod 이중 방어·JSON-only·5xx)이고, **계약은 다르다** — 분석 응답은 휴리스틱 폴백 없이 실패를 표면화한다(REQ-RAI-005).
