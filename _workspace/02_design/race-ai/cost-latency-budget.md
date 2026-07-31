# Cost·Latency Budget — 레이스 AI 분석 (Phase 2, 2026-07-31)

> DL-029 반영: **LLM 1회/요청**(연쇄 폐기) — 비용·지연 원안 유지. 가격·플랫폼 수치는 로컬 근거가 없어 전부 **ASSUMPTION(추정·확인 필요)** 표기. (기록 주체: 오케스트레이터 대필.)

## 1. 토큰 추정

| 구성 | 추정 | 근거 |
|---|---|---|
| system 프롬프트 | ~700–900 | recommend-voltage system(~500 상당)에 4역할 경계·스키마 예시 추가 |
| races 20건 직렬화 | ~800–1,200 | 건당 JSON ~40–60 tokens |
| insight + retireReasonMeta + excludedNoReason | ~150–300 | RaceInsight 전체 + 등장 leaf 한국어 pathLabel |
| **input 합계** | **~1,700–2,400** | 20건 만재 기준 — 기록 적으면 비례 감소 |
| output(4섹션 한국어 JSON) | ~400–700 | 섹션당 1~2문장 + 키 + evidence. DL-029로 전압 언급 제거분 소폭 감소 |

- **max_tokens 확정 제안: 800.** tech-note 1024는 전압 섹션 포함 추정이었고 DL-029로 상단이 내려감 — 800이면 4섹션+insufficient 구조 모두 여유. truncation 실측 시 1024 복귀(escape hatch). 기존 recommend-voltage 300 불변.

## 2. 요청당 비용·월 예산 (가격 ASSUMPTION — 단정 금지)

- Haiku 4.5 단가는 로컬 근거 없음 — **input $1/MTok·output $5/MTok 수준으로 추정(확인 필요)**.
- 요청당(만재): input 2.4k ≈ $0.0024 + output 0.7k ≈ $0.0035 → **~$0.006/회 추정**.
- 월 예산(사용 가정 명시): 트랙 가는 날 주 1–2회 × 세션당 5–10회 ≈ **월 30–80회** → **월 $0.2–0.5 추정**.
- 정직한 상한: rate limit 상한(월 ~300회)을 전부 소진하면 ~$1.8 추정 — "<$1"은 사용 가정이지 하드 보장이 아님. 하드 보장이 필요하면 Neon 카운터 승격 경로로만.

## 3. 지연 예산

| 구간 | 목표 | 근거 |
|---|---|---|
| p50 | ~2–3.5s | Haiku, output ~0.5k, 스트리밍 없음 |
| p95 | 6s | ai-requirements 승계 — AC-6 DEPLOY_ONLY 실측으로 확정 |
| 클라 타임아웃 | **10s** | 폴백 없는 실패 표면화 전제 — 6s는 tail에서 빠듯. p95와 3s+ 여유 |
| 함수 maxDuration | **30s 명시** | vercel.json에 functions 블록 부재 → 플랫폼 기본값이 10s일 수 있음(ASSUMPTION). 기본 10s면 클라와 경합해 원인 구분 불가 — 서버가 항상 클라보다 늦게 죽게 고정 |

- 취소: `AbortSignal.any([AbortSignal.timeout(10_000), userSignal])`. **정직한 한계**: 진행 중인 서버 함수·업스트림 호출은 중단되지 않아 해당 요청 토큰 비용은 발생(수용: 회당 ~$0.006).

## 4. 비용 방어 계층 — 각 층이 막는 것과 한계

| 계층 | 상태 | 막는 시나리오 | 한계(정직하게) |
|---|---|---|---|
| requireSession | **완료(R23, 배포됨)** | 무인증 공개 POST로 키 소진 | **로그인만 하면 누구나 통과 — 이메일 allowlist 부재(위협 T2①)** |
| 소유자 allowlist | **미구현 — P3 필수** | 타인 구글 계정의 호출 | env 비교 1줄로 해소 가능 |
| 클라 결정론 게이트(U3) | U3에서 구현 | 근거 부족 상태의 무의미 호출(요청 0회) | 클라 우회 직접 POST는 못 막음 |
| max_tokens 800 | U4 상수 | 요청당 output 비용 상한 | input 비용은 못 막음(→ 20건 컷) |
| races ≤20건 컷 | U2+U4 이중 | 요청당 input 비용 상한 | 호출 횟수는 못 막음 |
| in-memory rate limit(분당 5·월 ~300) | U4 best-effort | warm instance 내 연타 | **인스턴스 간 메모리 비공유** — cold start마다 리셋. soft limit임을 주석 명시 |

- 계층 순서 = 비용 발생 전 차단 순서: 게이트(요청 없음) → 401/403/429(업스트림 호출 없음) → 토큰 상한. 업스트림 호출 전에 반드시 인증·rate limit 선행(R23 주석 "키 소비 전에 차단").

## 5. 예산 초과 시 동작

- 서버 429 → 클라 typed unavailable → **UI 실패 상태**: "요청이 잦아요 — 잠시 후 다시 시도" + [다시 시도]. R22 카드 불변, 자동 재시도 없음. 성공 위장·휴리스틱 대체 금지.

## 검증 연결

토큰·비용·p50/p95는 전부 ASSUMPTION — AC-6(Vercel preview, owner 사용자)에서 usage 로그로 실측 후 상수 교체. 타임아웃·취소·429 UI는 LOCAL_VERIFIABLE(mock).
