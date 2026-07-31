# Tech Note — 레이스 AI 분석 엔드포인트 (범위 한정, 2026-07-31)

> 전체 스택은 `_workspace/01_plan/tech-stack.md` 고정 — 본 노트는 신규 AI 분석 기능(REQ-RAI-*, REQ-AI-*)의 기술 판정만 다룬다. 근거는 전부 로컬 코드.
> (기록 주체: 오케스트레이터 대필 — ownership hook.)

## 1. 신규 의존성 — **0건 추가**
- 서버: Anthropic SDK 불필요. `api/recommend-voltage.js`가 raw `fetch`(x-api-key + anthropic-version 헤더)로 Messages API 호출·코드펜스 파싱·클램프까지 이미 검증된 패턴. 신규 엔드포인트도 스트리밍·tool use 없는 단발 호출이라 SDK는 cold start·의존성 표면만 늘린다.
- 클라: zod 4.3.0 기존 사용(`recommend-voltage.ts`의 safeParse 선례). jose(세션)·@neondatabase/serverless(db)도 기존재. → Package Changes 없음, lockfile 불변.

## 2. 모델·토큰 — Haiku 4.5 유지, max_tokens 1024
- 모델: `claude-haiku-4-5-20251001` 유지(A3 확정). 과제가 **주입된 R22 파생값의 해석·서술**이지 개방형 추론이 아니므로(재계산 금지, REQ-AI-001) Haiku로 충분. 품질은 AC-5/AC-6 `DEPLOY_ONLY`에서 검증하고, 미달 시 모델 문자열 1줄 교체가 escape hatch — 선제 Sonnet 채택은 비용·지연만 손해.
- max_tokens: 기존 300은 전압 스칼라+1~2문장용. 4섹션 한국어(섹션당 1~3문장+근거 인용+JSON 키+판단불가 구조)는 추정 600~1000 output tokens → **1024** 권고(ai-requirements §6 예산의 통합 응답 등가 내). Haiku 1k output ≈ 센트 미만 — 월 300회여도 <$1 유지.
- temperature: **0 유지**(비결정성 완화, UX Check ③·REQ-RAI-008과 정합). 기존 recommend-voltage의 max_tokens 300은 변경하지 않는다.

## 3. 인증·비용 방어
- requireSession: `api/data.js` 선례 그대로 — 핸들러 첫 줄 `const session = await requireSession(req, res); if (!session) return`. 신규 엔드포인트 필수(AC-1).
- rate limit 현실 판단: Vercel serverless는 인스턴스 간 메모리 비공유 — in-memory 카운터는 warm instance 한정 best-effort. KV/Upstash는 신규 인프라+의존성이라 단일 사용자 도구에 과잉. **1차 방어 = requireSession(무인증 denial-of-wallet 차단, 실질 리스크) + 클라 결정론 게이트(REQ-RAI-004, 호출 자체 차단) + max_tokens 상한 + history 20건 컷.** 분당 5회는 in-memory soft limiter(best-effort 명시)로 충분. 월 상한 ~300회를 hard하게 만들려면 기존 Neon(`api/_lib/db.js`)에 카운터 테이블 1개 — 신규 의존성 없이 가능한 승격 경로로만 남긴다(ASSUMPTION이므로 Phase 3 필수 아님).
- D2 소급 리스크(recommend-voltage에 requireSession): **낮음.** 클라 어댑터는 `res.ok` 아니면 무조건 휴리스틱 폴백이므로 401도 자연 수렴하고, same-origin fetch는 쿠키를 기본 전송해 로그인 사용자는 무영향. 영향은 "비로그인 시 AI 추천 상실(휴리스틱만)"뿐 — REQ-RAI-ST-002 fixture(mock 401 → source:'heuristic')로 확인. 소급 적용 권고.

## 4. 타임아웃·취소
- Vercel: `vercel.json`에 `functions` 블록 없음 → maxDuration 플랫폼 기본값(플랜·Fluid Compute 여부에 따라 10s~300s로 달라짐 — ASSUMPTION). 기본 10s면 업스트림 지연 시 클라 타임아웃과 경합하므로 신규 함수에 `functions: {"api/<신규>.js": {"maxDuration": 30}}` 명시 권고.
- 클라: 기존 6s는 "실패해도 휴리스틱 폴백" 전제의 짧은 예산. AI 분석은 폴백 없이 실패 표면화(REQ-RAI-005)이고 ~1k 토큰 생성이라 6s는 빠듯 → **클라 10s**(REQ-AI §6 그대로). 취소 가능 요구(REQ-RAI-ST-001)가 있으므로 `AbortSignal.timeout(10_000)` 단독이 아니라 `AbortSignal.any([timeout, userController.signal])`로 사용자 취소+타임아웃 합성. TanStack Query mutation의 signal 전달로 자연 배선.

## 5. 응답 검증 — 서버·클라 이중 검증 (기존 선례 유지)
- 위치: zod 스키마는 **feature 배치**(신규 feature의 `api/` 파일 내) — `recommend-voltage.ts`가 feature 내 스키마 선례. shared 승격은 소비 feature가 2개 이상일 때만(현재 1개).
- 서버(`api/*.js`는 plain JS, src TS import 불가): zod 없이 기존 패턴대로 최소 구조 검증(4섹션 키 존재·string 타입·"판단 불가" 분기) + 전압 수치 등장 시 2.6~3.2/0.02 클램프 재사용. 위반 시 502 `invalid model output`(성공 위장 금지, AC-2).
- 클라: zod safeParse + 실패 시 **실패 상태**(휴리스틱 대체 금지 — 기존 advisor와 정책이 다름 주의). 전압 인용값은 클라 재클램프(기존 이중 클램프 선례, AC-3).

## 6. 결론
**스택 변경 0건** — 신규 의존성·버전 변경·인프라 추가 없음. Phase 3 기술 제약:
1. 서버는 raw fetch + Haiku 4.5 + temp 0 + max_tokens 1024, 첫 줄 requireSession(D2로 recommend-voltage 소급 포함).
2. 응답은 서버 JS 구조 검증 → 클라 feature-내 zod 이중 검증, 실패는 폴백 없이 표면화(전압 인용만 이중 클램프).
3. 클라 타임아웃 10s + 사용자 취소 `AbortSignal.any`, 신규 함수 maxDuration 명시(30s).
4. rate limit은 requireSession+결정론 게이트+max_tokens가 주 방어, in-memory는 best-effort — hard 월 상한 필요 시 기존 Neon 카운터로만 승격.
5. 기존 recommend-voltage의 모델·300토큰·폴백 계약은 불변.
