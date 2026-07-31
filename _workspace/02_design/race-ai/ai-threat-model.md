# AI Threat Model — 레이스 AI 분석 (Phase 2)

> 2026-07-31. 대상: `api/analyze-race.js`(신설, requireSession → 검증 → Haiku 4.5 단발 → 구조 검증 → JSON, DL-029 전압 수치 출력 금지). 근거는 전부 로컬 코드 — `api/recommend-voltage.js`(R23 적용 확인), `api/_lib/{session,authGuard}.js`, `api/auth/google/callback.js`, `api/data.js`. (기록 주체: 오케스트레이터 대필 — ownership hook.)

## 신뢰 경계 요약

브라우저(사용자 제어) →(1: 쿠키 세션)→ Vercel 함수 →(2: HTTPS+API 키)→ Anthropic →(3: 모델 출력=비신뢰 입력)→ 서버 검증 →(4: JSON)→ React 렌더. AI는 L1 — 저장·tool·retrieval 경로가 구조적으로 없어 confused deputy·RAG poisoning 표면 부재. 위협은 경계 1(인증·비용), 2(유출), 3(출력 신뢰)에 집중.

## T1. 프롬프트 인젝션 — 표면은 "0"이 아니라 "검증에 의존" · 심각도 **낮음**

- **exploit**: 계약상 숫자+enum이지만 문자열 채널이 실재. ① `races[].retireReason·goal·result` — enum key여야 하나 **서버가 allowlist로 강제할 때만 사실**(선례 recommend-voltage는 `history` 항목 내용 미검증 — `Array.isArray`만, 41행 → 프롬프트 77행 도달). ② `retireReasonMeta[].pathLabel·causal` — 클라이언트가 보내는 자유 문자열 필드. ③ 모델 산출 문자열의 재주입(2차).
- **impact**: 낮음 — 출력은 본인 화면 표시가 전부(L1·tool 없음·비저장).
- **preventive**: (a) 서버 **필드별 allowlist 검증** — enum 대조·숫자 타입/범위·미지 키 드롭 (b) `pathLabel·causal`은 클라 문자열 수신 금지, **서버가 enum key→메타 재구성**(도메인 트리 상수를 api/_lib에 미러) (c) races ≤20 서버 슬라이스.
- **test**: enum 외 문자열·미지 필드 400, "ignore previous instructions"를 retireReason에 담은 adversarial fixture 400.
- **조건부**: 향후 메모 자유 텍스트 도입 시 — 데이터 구획 표기·길이 상한·출력 캡을 선행 요구로 별도 라운드.

## T2. Denial-of-wallet — R23 이후 재평가: 높음 → **중** (잔여 3개)

- **exploit(잔여)**: ① **로그인 개방** — `callback.js`에 이메일 allowlist 없음 → 아무 구글 계정이나 유효 세션 획득 후 호출 가능. requireSession은 봇·무인증만 막는다. ② 탈취 세션 30일 유효(무상태 JWT — 개별 폐기 불가). ③ rate limit best-effort(cold start 리셋). ④ 입력측 비용 — 서버가 길이·크기를 자르지 않으면 거대 payload로 입력 토큰 증폭.
- **preventive**: **[P3 필수] 소유자 이메일 allowlist**(env `ALLOWED_EMAIL` 비교 1줄 — 1인 도구에서 가장 값싼 결정론 통제). 서버측 races ≤20 슬라이스 + body 크기 상한(예: 32KB) + 문자열 길이 캡. max_tokens·클라 게이트 유지.
- **detective**: Anthropic 콘솔 spend alert(월 $5) — owner 사용자.
- **잔여(수용)**: warm instance 한정 rate limit 불완전성, 탈취 세션 30일 창 — owner 사용자, 재검토 2026-10-31.

## T3. 모델 출력 신뢰 — 구조 위반·환각 수치·렌더 주입 · 심각도 **중**

- **preventive**: ① 서버 구조 검증(섹션 키·타입·길이 상한) 위반 시 502 ② 클라 zod 이중 검증 → 실패 상태 ③ **DL-029 집행을 결정론으로**: 응답 전체 전압 패턴 스캔(`/\d[.,]?\d*\s*[vV볼]/`) 검출 시 **502 거부**(클램프 아님 — 비전압 처방 계약). voltageNote 필드는 스키마에서 제거 ④ 렌더: React 기본 텍스트만 — `dangerouslySetInnerHTML`·마크다운 라이브러리·자동 링크화 금지(현 코드 0건 확인, U5 신규 작성 시 유지).
- **test**: CI grep `dangerouslySetInnerHTML` 0건. fixture 산문·길이 초과·전압 포함 응답 → 실패 상태.
- **잔여**: 스키마를 통과한 "그럴듯한 비전압 오조언" — 완화는 주입·인용 강제+"가능성" 어휘 상한+L1(적용은 항상 사용자 수동). 수용, owner 사용자.

## T4. 데이터 유출 — Anthropic 송신·로그 · 심각도 **낮음**

- **나가면 안 되는데 섞일 위험**: 모터 id/이름·세션 payload(sub/email/name)·MeasureRecord — 직렬화기가 객체 spread를 쓰면 오염.
- **preventive**: U2는 **명시적 field-pick만**(spread 금지), session을 payload 조립 스코프에 전달하지 않는 함수 분리. **test**: 산출 payload에 `motorId·id·name·email·sub` 키 부재 단언.
- **로그**: 프롬프트·aiText console 출력 금지(Vercel 로그 잔류). 에러도 상태코드·사유까지만.
- **잔여(수용)**: 레이스 수치의 제3자 송신 — 개인 취미 데이터, 민감도 낮음. 재검토 2026-12-31(자유 텍스트 도입 시 즉시).

## T5. 인증·세션·CSRF · 심각도 **낮음**

- **사실(코드)**: `mml_session` = HS256 JWT, `HttpOnly; SameSite=Lax; Secure(https); Max-Age 30일`(session.js:55). CSRF: 쿠키 인증 POST지만 **Lax가 cross-site POST 쿠키 전송을 차단** → 결정론적 완화. 저비용 보강으로 `Origin` same-origin 검사 1줄 권고(선택).
- **타 사용자 데이터**: analyze-race는 DB를 읽지 않는 무상태 프록시 → IDOR 표면 없음. 단 T2①(개방 로그인)로 타인 계정 생성은 가능 — allowlist로 함께 해소.
- **약점**: `SESSION_SECRET` 최소 16자만 강제(session.js:10) — 32바이트 랜덤 이상 권고(운영 체크).

## T6. 가용성 — R22 무영향 계약 · 심각도 **낮음**

- 업스트림 장애·타임아웃은 AI 카드 실패 상태로만 표면화, R22 카드·목록은 클라 로컬 연산이라 구조적 무영향. 클라 10s `AbortSignal.any` + 서버 maxDuration 30s로 좀비 요청 차단.

## Phase 3 필수 방어 체크리스트

1. [ ] `requireSession` 첫 줄 + **소유자 이메일 allowlist**(env 비교 1줄) — T2① 해소
2. [ ] 서버 필드별 allowlist 검증: enum 대조·숫자 범위·미지 키 드롭·races ≤20 슬라이스·body/문자열 크기 상한 — T1·T2④
3. [ ] `pathLabel·causal` 클라 문자열 수신 금지 — 서버측 enum key→메타 재구성 — T1②
4. [ ] 응답: 구조 검증 + summary 길이 캡 + **전압 패턴 스캔 시 502**(DL-029, voltageNote 스키마 제거) — T3
5. [ ] `dangerouslySetInnerHTML`·마크다운 렌더 0건(CI grep) — T3④
6. [ ] 프롬프트·응답 원문 console 출력 금지 + U2 필드 부재 단언 테스트 — T4
7. [ ] Anthropic spend alert 설정(owner 사용자) + adversarial fixture(인젝션 400·산문 502·비인증 401) — detective

수용 위험 대장: T2 잔여(재검토 2026-10-31), T3 스키마 통과 오조언, T4 제3자 송신(재검토 2026-12-31) — owner 전부 사용자(1인 도구).
