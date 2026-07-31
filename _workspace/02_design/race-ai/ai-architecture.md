# AI Architecture — 레이스 AI 분석 (Phase 2 설계, 2026-07-31)

> 근거: `race-ai/{project-brief,feature-plan,tech-note,plan-review}.md`, `ai-requirements.md`, `autonomy-risk-matrix.md`, 선례 `api/recommend-voltage.js`(R23 requireSession 적용 완료)·`api/_lib/authGuard.js`·`race-insight.ts`. **DL-029 반영: 코칭 섹션 전압 수치 완전 생략 — LLM 호출은 요청당 1회**(DL-028의 연쇄 호출 폐기). 신규 제품 결정 없음. (기록 주체: 오케스트레이터 대필 — ownership hook.)

## 1. 런타임 토폴로지 — 단발 요청/응답, 그 외 전부 없음

    브라우저 /race/:motorId
      ├─ U3 게이트(순수 selector): kind empty/insufficient·사유 전무 → 호출 자체 차단(버튼 비활성)
      ├─ U2 payload 직렬화(순수): races ≤20 + insight + retireReasonMeta + excludedNoReason
      └─ U1 어댑터: POST /api/analyze-race, 클라 타임아웃 10s + 사용자 취소(AbortSignal.any)
            ↓ same-origin fetch(세션 쿠키 자동 전송)
    Vercel function api/analyze-race.js (maxDuration 30s 명시)
      ① requireSession(첫 줄, api/data.js·recommend-voltage R23 선례) — 실패 시 401 즉시 반환
      ② 입력 구조 검증(400) ③ best-effort in-memory rate limit(429)
      ④ Anthropic Messages API raw fetch **1회**(Haiku 4.5·temp 0·max_tokens §B 확정값)
      ⑤ 첫 {…} JSON 블록 파싱 + 구조 검증(위반 시 502 invalid model output)
      ⑥ **evidence 서버 덮어쓰기**(payload 값으로 — §2) → 200 JSON
            ↓
    브라우저: zod safeParse 재검증 → 성공 렌더 | 실패 상태(typed unavailable)

- **tool use·RAG·multi-turn·스트리밍·백그라운드 잡·큐 전부 없음.** 단발 stateless 요청/응답 1개가 전부 — tool-contracts·세션/체크포인트/재개 설계 불필요(project-brief §Phase 2 판단 승계). 상태는 클라 컴포넌트 state만(비영속, REQ-RAI-006).
- 키(`ANTHROPIC_API_KEY`)는 서버 전용 env — 브라우저 번들 미포함(선례 유지). 모델은 auth·상태 결정에 관여하지 않음(L1, write 경로 구조적 부재).

## 2. 신뢰 경계 — 4단 검증, 어디서 무엇을

| 지점 | 검증 | 신뢰 원칙 |
|---|---|---|
| 클라 게이트(U3) | 근거 부족이면 요청 0회 | 결정론이 호출 여부를 소유 — 모델에게 묻지 않음 |
| 서버 입력(U4) | races 배열·insight 형태·≤20건 컷 재확인, 위반 400 | 클라를 신뢰하지 않음(공개 인터넷 표면) |
| 서버 출력(U4) | verdict enum·sections 키·string 타입·summary 길이 상한, 위반 502 | **모델 출력을 신뢰하지 않음** |
| 클라 zod(U1) | safeParse 실패 = 실패 상태 | 서버 JS 검증의 이중 방어(api/↔src/ 코드 미공유 선례) |

- **evidence 덮어쓰기(plan-review F2)**: `evidence.racesUsed·excludedNoReason`은 모델 echo를 버리고 **서버가 요청 payload 값으로 무조건 덮어쓴다**. 근거 캡션의 원천을 환각 표면에서 제거 — 스키마에는 남기되 출처가 결정론임을 코드 주석으로 명시.
- **DL-029로 전압 검증 계층 제거**: payload에 `advisorVoltage` 없음, 응답에 `nextRace.voltageNote` 없음 → 서버 전압 클램프 불필요. 단 위협 모델 T3③에 따라 **응답 전압 패턴 스캔 시 502 거부**는 채택(클램프가 아닌 거부 — 비전압 처방 계약).

## 3. 프롬프트 조립 — system(고정 문자열) + user(JSON payload)

- **system**: ① 역할(기록 분석가 — recommend-voltage 도메인 블록 재사용: 파노↔RPM·retired=위험·weight 가중) ② 4역할 결정론 경계 표 요약(재진술만인 섹션은 키 생략 지시) ③ 경계 규칙 — 주입값 재계산 금지·모든 수치는 races/insight 인용만·미측정 세팅(롤러·댐퍼·기어비)은 "가능성" 어휘 상한·speedRelated=false 사유에 전압 조언 금지·**전압 숫자(V 수치) 출력 전면 금지(DL-029)** ④ 근거 부족 시 `verdict:'insufficient'`+사유 ⑤ 출력 JSON only + 스키마 예시(voltageNote 없는 최종형).
- **user**: `JSON.stringify(payload)` 단독 — 자유 텍스트 미포함(W5), 인젝션 표면은 숫자+enum+고정 라벨뿐.

## 4. 실패·복원력 — 폴백 없음, 실패 표면화

| 상황 | 서버 | 클라(U1) |
|---|---|---|
| 키 없음 | 500 | 실패 상태 |
| 비인증 | 401 (requireSession) | 실패 상태 |
| 업스트림 !ok / fetch throw | 502 | 실패 상태 |
| 파싱·구조 위반 | 502 invalid model output | 실패 상태 |
| rate limit | 429 | 실패 상태(재시도 안내) |
| 클라 10s 타임아웃·사용자 취소 | (요청 abort) | 실패 상태 / 대기 복귀 |

- 전 실패에서 R22 카드 불변, "분석 불가 — 결정론 요약은 위 카드" 1줄 + [다시 시도]. **자동 재시도 없음**(1탭=1요청, REQ-RAI-001).
- recommend-voltage와 정책이 다른 이유: **추천은 등가 대체물(휴리스틱 전압)이 있어 폴백하고, 분석은 등가물이 없어 폴백을 만들면 성공 위장이 되기 때문**(REQ-RAI-005).

## 5. 관측(개인 도구 수준)

- 로그(Vercel function console, 구조화 1줄): 결과(ok/insufficient/4xx/5xx 사유 코드)·업스트림 지연 ms·usage 토큰·racesUsed 건수. 신규 관측 인프라 0건.
- **프롬프트 본문·모델 응답 본문은 로그 금지.** 디버깅 가치 대비 로그 잔존 표면이 손해고, 재현은 temp 0 + 로컬 fixture로 가능.

## 6. 확장 지점 (구현하지 않고 자리만)

- focus 파라미터(2차): body에 optional `focus` 1필드 — 엔드포인트·스키마 불변.
- 세션 캐시(D3): `use-race-analysis.ts` 훅에 메모리 캐시 1줄 — 서버·계약 불변.
- 모델 교체: MODEL 상수 문자열 1줄(품질 미달 시 Sonnet — AC-5/6 실측 후에만).

## 완료 조건 대조

키 서버 전용 ✓ / 모델은 auth·tenant·authoritative state 무관여(L1) ✓ / 루프 없음, 반복 표면은 사용자 탭이며 rate limit 상한 존재 ✓ / provider 격리는 raw fetch 1곳 ✓ / owner·순서는 feature-plan U1→{U2·U3·U4·U5}→U6 승계 ✓
