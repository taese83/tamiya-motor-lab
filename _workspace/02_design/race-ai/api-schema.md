# API Schema — 레이스 AI 분석 (Phase 2, 2026-08-01)

> 근거: `race-ai/{ai-architecture,ai-threat-model,data-governance,cost-latency-budget}.md`, `01_plan/race-ai/{requirements,feature-plan}.md`, 코드 선례 `api/recommend-voltage.js`·`api/_lib/authGuard.js`(R24)·`src/features/race-record/api/recommend-voltage.ts`. **DL-029(전압 수치 전면 금지)·DL-030(AI 소유자 전용 fail-closed) 반영 — feature-plan의 `advisorVoltage`·`voltageNote`·서버 클램프는 본 문서로 폐기.** 범위는 이 기능뿐. 구현 금지 — Phase 3 명세. (기록 주체: 오케스트레이터 대필 — ownership hook.)

## 0. 인증 가드 — `requireAllowedSession(req, res)` 신설 (api/_lib/authGuard.js)

| 분기 | 조건 | 응답 | 비고 |
|---|---|---|---|
| ① | 세션 없음·서명 무효 | **401** `{error:'unauthenticated'\|'invalid_session'}` | 기존 requireSession과 동일 |
| ② | `ALLOWED_EMAIL` env 미설정/공백 | **503** `{error:'ai_disabled'}` | **fail-closed** — R24 `isAllowedEmail`의 fail-open(true)과 반대. AI 경로는 소유자 미확정 상태에서 키를 태우지 않는다 |
| ③ | 세션 email이 allowlist 밖 | **403** `{error:'forbidden'}` | R24와 동일(콤마 구분 다중·소문자 비교) |
| 통과 | — | session payload 반환 | 호출자는 null이면 즉시 return(선례 계약) |

- 적용: **`api/analyze-race.js`(신규)·`api/recommend-voltage.js`(교체)** 2곳. `api/data.js`는 기존 `requireSession` 유지(DL-030 범위 밖).
- ①~③은 업스트림 호출·키 접근 **이전**에 판정(비용 발생 전 차단, R23 주석 승계).

## 1. POST `/api/analyze-race` (신규)

처리 순서: 405(POST 외) → `requireAllowedSession`(401/403/503) → body 검증(400) → rate limit(429, 분당 5·best-effort) → 키 확인(500) → Anthropic 1회(실패 502) → 응답 구조 검증+전압 패턴 스캔(위반 502) → evidence 덮어쓰기 → 200.

### 1.1 Request body (클라 U2 직렬화 = 서버 검증 대상)

    {
      races: [{ voltage, panoHz, result?, lapTimeMs?, goal?, retireReason?, createdAt, weight }],  // ≤20·최신순
      insight: RaceInsight,               // race-insight.ts 형태 그대로 — 주입값, 서버 재계산 없음
      retireReasonKeys: string[],         // ★ 등장한 leaf key만 (예: ['jump_overshoot','corner'])
      excludedNoReason: number            // 사유 미입력 retired 건수 (정수 ≥0)
    }

- **T1② 확정: `retireReasonMeta` 객체 전송 폐기 — 클라는 `retireReasonKeys`(enum key 배열)만 보내고, 서버가 `api/_lib`의 트리 미러 상수로 `{key, pathLabel, speedRelated, causal}`를 재구성해 프롬프트에 주입한다.** 자유 문자열(`pathLabel`·`causal`)이 클라→서버 채널에서 구조적으로 사라진다. 미러는 `domain.ts`의 `RETIRE_REASON_TREE`와 수동 동기(append-only enum — leaf 추가 시 양쪽 갱신, fixture 정합 테스트로 drift 검출).
- **화이트리스트(data-governance §2 — 이것만 유효)**: races 8필드·insight·retireReasonKeys·excludedNoReason. **금지(존재 시에도 서버가 드롭, U2는 애초에 미포함 + 부재 assert 테스트)**: 모터 name·모터 id·`motorId`·RaceRecord `id`·구글 `sub`·`email`·세션/토큰·MeasureRecord 일체·자유 텍스트·`advisorVoltage`(DL-029)·`retireReasonMeta`.

서버 검증 규칙(위반 → 400 `{error:'invalid input'}`, 단 races 초과는 슬라이스):

| 필드 | 규칙 |
|---|---|
| body 전체 | 직렬화 크기 ≤ **32KB**, 미지 키 **드롭**(400 아님 — 전달만 차단) |
| races | 배열 필수, **서버측 앞 20건 슬라이스**(400 아님). 각 항목: voltage number 0.1~9.9 · panoHz 유한 양수 ≤2000 · result ∈ {finished,retired} · lapTimeMs 양의 정수 ≤3,600,000 · goal ∈ {finish,stability,speed} · retireReason ∈ leaf enum 11종 · createdAt ISO 8601 형식 검사 · weight 유한 양수. optional 부재 허용, **enum 외 값·비수치는 400**(인젝션 fixture → 400) |
| insight | kind ∈ {empty,insufficient,ready} · finishedBand `{minVoltage,maxVoltage,sampleCount}`\|null · lastFinishedVoltage number\|null · streak (finished\|retired)[] ≤5 · trend 값 ∈ {improving,steady,worsening,null} · excluded 정수 ≥0 |
| retireReasonKeys | 배열, 각 원소 ∈ leaf enum(외는 400), 중복 제거, ≤11개 |
| excludedNoReason | 정수 ≥0 |

### 1.2 Response 200 (zod discriminated union — verdict)

    { verdict: 'ok',
      sections: {                          // 근거 없는 섹션은 키 생략(침묵 원칙) — 최소 1개
        diagnosis?: { summary: string, citedRaces: number },   // 이탈 원인 진단
        anomaly?:   { summary: string, citedRaces: number },   // 이상 신호
        briefing?:  { summary: string },                       // 기록 브리핑
        nextRace?:  { summary: string } },                     // 다음 세팅 — ★ voltageNote 없음(DL-029)
      evidence: { racesUsed: number, excludedNoReason: number } }
    | { verdict: 'insufficient', reason: string,               // 판단 불가는 2xx 정상 응답(REQ-AI-003)
        evidence: { racesUsed: number, excludedNoReason: number } }

- 길이 상한(계약 상수 — 서버·클라 동일): `summary`·`reason` **≤200자**, `citedRaces` 정수 0~20. 위반은 서버 502, 클라 safeParse 실패=unavailable.
- **evidence는 서버가 모델 echo를 버리고 payload 값으로 무조건 덮어쓴다**(F2): `racesUsed` = 슬라이스 후 races.length, `excludedNoReason` = 요청 값.
- **전압 패턴 스캔(T3③·DL-029)**: 직렬화된 응답 전체에 `/\d[.,]?\d*\s*[vV볼]/` 매칭 시 **502 거부**(클램프·수정 아님).

### 1.3 에러 응답 표

| status | body | 원인 | 클라 처리(U1 → U5) |
|---|---|---|---|
| 400 | `{error:'invalid input'}` | 검증 실패·크기 초과 | unavailable(정상 클라에선 미발생) |
| 401 | `{error:'unauthenticated'\|'invalid_session'}` | 가드 ① | unavailable → "로그인 필요" |
| 403 | `{error:'forbidden'}` | 가드 ③ | unavailable → "허용되지 않은 계정" |
| 405 | `{error:'method not allowed'}` | POST 외 | unavailable |
| 429 | `{error:'rate_limited'}` | 분당 5 초과(best-effort) | unavailable → "잠시 후 다시 시도" |
| 500 | `{error:'ANTHROPIC_API_KEY not set'}` | 키 미설정 | unavailable |
| 502 | `{error:'upstream error'\|'upstream fetch failed'\|'invalid model output'}` | 업스트림·파싱/구조/길이/**전압 패턴** | unavailable → "분석 불가 — 결정론 요약은 위 카드" |
| 503 | `{error:'ai_disabled'}` | 가드 ②(env 미설정) | unavailable → "AI 비활성" |

전 에러에서 R22 카드 불변·자동 재시도 없음·휴리스틱 대체 금지. 에러 body에 모델 원문·프롬프트 미포함.

## 2. POST `/api/recommend-voltage` 변경분 (DL-030)

- 변경 **1줄**: `requireSession` → `requireAllowedSession`. 요청/응답 계약(goal·currentPanoHz·history → `{voltage, rationale}`, 클램프 2.6~3.2/0.02, max_tokens 300)은 **불변**.
- 효과: 401에 더해 403·**503(env 미설정 시 신규)** 추가. 클라 어댑터는 `res.ok` 아니면 무조건 휴리스틱 폴백이므로 **클라 수정 0건·무해** — 503도 401과 동일하게 폴백으로 수렴(ST-002 fixture에 503 케이스 1개 추가 권고).

## 3. 클라 어댑터 계약 — `src/features/race-record/api/analyze-race.ts` (U1)

    type AnalyzeRaceResult =
      | { status: 'ok', data: RaceAnalysis }
      | { status: 'unavailable', reason: 'unauthenticated' | 'forbidden' | 'ai_disabled'
          | 'rate_limited' | 'invalid_response' | 'upstream' | 'timeout' | 'cancelled' }

- 매핑: 401→unauthenticated · 403→forbidden · 503→ai_disabled · 429→rate_limited · 200+safeParse 실패→invalid_response · 400/405/500/502/네트워크→upstream · timeout 만료→timeout · 사용자 signal→cancelled(훅이 대기 복귀).
- 취소: `AbortSignal.any([AbortSignal.timeout(10_000), userSignal])`. **휴리스틱 폴백 생성 금지**.
- `verdict:'insufficient'` 200은 **ok로 반환**(서버 정상 판단 — U5가 중립 톤 표시).

## 4. zod(클라) ↔ 서버 JS 검증 이중화

- **배치**: zod 스키마는 feature 내부 `analyze-race.ts`(U1이 계약 원본). 서버 `api/analyze-race.js`는 **JS 수동 미러** — api/(JS)↔src/(TS) 코드 미공유(빌드 경계·이중 방어 목적).
- 역할: 서버 검증 = 공개 표면 방어(인젝션·비용·모델 출력 불신) / 클라 zod = 미러 drift·비정상 응답 최종 방어. enum 단일 원천은 `domain.ts`, 서버는 `api/_lib` 미러 — 정합은 fixture 공유 테스트로 고정.

## 미결(발명 금지 — 승계)

D3 세션 캐시(기본값 유지 없음) · Anthropic 입력 보존 정책 확인 · (R24로 해소됨: race_records.retire_reason 컬럼)
