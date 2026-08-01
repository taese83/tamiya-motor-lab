# Component Spec — 레이스 AI 분석 (Phase 2, 2026-08-01)

> 근거: `race-ai/{layout-spec,api-schema,ai-architecture}.md`, `01_plan/race-ai/{ux-brief,requirements,feature-plan}.md`. 코드 선례: `RaceInsightCard.tsx`(하단 행·순수 렌더), `RaceRetireReasonSelect.tsx`(제어형·44px), `use-race-entry.ts`(single-flight·seq 가드), `RaceDetailPage.tsx`(페이지 조립 소유). 구현 금지 — Phase 3 계약. (기록 주체: 오케스트레이터 대필.)

## 0. 소유 구조

`RaceDetailPage`(상태·게이트·배선 소유) → `useRaceAnalysis`(상태기계·Abort 소유) → `RaceInsightCard`(진입점, 순수 렌더 유지) + `RaceAnalysisCard`(응답 표시, 순수 렌더). 타입 원천: `RaceAnalysis`·`AnalyzeUnavailableReason`은 U1 `analyze-race.ts`(zod infer), `RaceAnalysisGate`는 U3.

## 1. RaceInsightCard — additive optional props (기존 props·동작·테스트 불변)

    export interface RaceInsightCardProps {
      insight: RaceInsight
      onOpenHelp: () => void
      // ── Phase 3 additive. 전부 optional — onAnalyze 미전달 시 렌더 100% 기존 동일(진입점 opt-in)
      onAnalyze?: () => void
      analyzeDisabledReason?: string | null
      analyzePending?: boolean
      onCancelAnalyze?: () => void
    }

- **ready 하단 행**(높이 불변): `[caption?] [AI 분석(첫 버튼, ml:'auto')] [보는 법]`. 둘 다 `size="small" variant="text"`, [AI 분석]은 `minHeight: 44` + 음수 마진으로 시각 높이 ~20px 유지.
- **좌측 caption 우선순위**(동시 표기 금지): ① `analyzeDisabledReason` ② 기존 `미정 n건 제외` ③ `analyzePending`이면 caption 전부 숨김.
- **insufficient 카드**: `onAnalyze` 전달 시에만 하단 행 **추가**(+~26px) — disabled + 사유 caption. 미전달이면 기존 1줄. empty는 기존대로 null.
- a11y: disabled 시 caption `id` 부여, 버튼 `aria-describedby` 연결.

## 2. RaceAnalysisCard (신규) — 제어형·순수 렌더

    export type RaceAnalysisView =
      | {kind: 'success'; data: RaceAnalysisOk}
      | {kind: 'insufficient'; reason: string; evidence: AnalysisEvidence}
      | {kind: 'error'; reason: AnalyzeUnavailableReason}
    export interface RaceAnalysisCardProps {
      view: RaceAnalysisView
      expanded: boolean
      onToggleExpand: () => void
      onRetry: () => void
      retryPending: boolean
    }

- 스킨: `Paper component="section" aria-label="AI 분석" variant="outlined" sx={{px:2, py:1.5}}` + `scroll-margin-top: 8px`. **idle·첫 loading은 페이지가 카드 미렌더**(슬롯 0px).
- **min-height `5rem`**: success 접힘·insufficient·error 공유(재전환 점프 차단). 펼침은 제한 없음 — 내부 스크롤 금지.
- **렌더 매트릭스**: 대기·요청 중=미렌더 / success 접힘=헤더 행+근거 caption+요약 1줄(`WebkitLineClamp:1`, 첫 존재 섹션 summary) / success 펼침=4섹션 / insufficient·error=1줄+부속.
- **헤더 행**: "AI 분석"(subtitle2) + [펼치기/접기](`aria-expanded`·`aria-controls`, 44px). success에서만.
- **근거 caption**(success·insufficient, evidence=서버 덮어쓰기 값): "기록 {racesUsed}건 기준" + `excludedNoReason>0`일 때만 " · 사유 미입력 {m}건 제외". tabular-nums.
- **AI 표식+외부 전송 고지**(success, 근거 caption 아래): "AI가 생성한 해석입니다 — 다시 분석하면 표현이 달라질 수 있어요 · 요청 시에만 기록을 외부 AI로 보내고 응답은 저장하지 않아요".
- **펼침 4섹션**: 진단→이상 신호→브리핑→다음 판 제안, subtitle2 제목+body2 summary. **키 없는 섹션 DOM 미렌더**(침묵). diagnosis·anomaly는 `citedRaces>0`이면 "회차 {n}건 근거". nextRace 끝 L1 caption "제안일 뿐 자동 적용되지 않아요 — [+ 기록]으로 직접 입력". 최하단 [접기](44px). 전압 표기 재가공 없음(DL-029).
- **insufficient**: "분석할 근거가 부족해요 — {reason}. 기록이 쌓이면 다시 시도하세요" + 근거 caption. **Alert·[다시 시도] 금지**.
- **error**: "분석하지 못했어요 — 결정론 요약은 위 카드에 있어요" + reason별 보조 caption(§5) + [다시 시도](44px). `retryPending`이면 "재시도 중…" disabled — 카드 유지.
- 카피 상수는 `RACE_ANALYSIS_MESSAGES` 1곳(`RACE_ENTRY_MESSAGES` 선례).

## 3. useRaceAnalysis (신규 훅)

    export type RaceAnalysisState =
      | {phase: 'idle'}
      | {phase: 'loading'}
      | {phase: 'success'; data: RaceAnalysis; refreshing: boolean}
      | {phase: 'error'; reason: AnalyzeUnavailableReason; retrying: boolean}
    export interface RaceAnalysisController {
      state: RaceAnalysisState
      expanded: boolean          // 새 success마다 false(접힘 기본)
      toggleExpanded: () => void
      pending: boolean           // loading || refreshing || retrying
      analyze: (input: {races: readonly RaceRecord[]; insight: RaceInsight}) => void
      cancel: () => void
    }

- **상태기계**: idle→loading→success|error. success→analyze→`refreshing`(성공 시 data 교체·expanded false). error→analyze→`retrying`. cancel→ loading이면 idle 복귀, refreshing/retrying이면 플래그만 해제(기존 표시 유지).
- **single-flight**: `inFlightRef` 동기 가드. 1탭=1요청, 자동 재시도 없음.
- **AbortController 소유**: analyze마다 신규 생성, cancel·unmount에서 abort. `seqRef`로 stale 응답 폐기.
- payload 조립은 훅이 U2 `buildAnalyzeRacePayload(races, insight)` 호출. retry는 페이지가 **현재 파생값으로 재호출**(최신성 보장).
- **비영속**: useState만 — react-query·storage·모듈 캐시 금지(D3 미채택 기본값).

## 4. RaceDetailPage 배선 (기존 흐름 무변경)

- 추가: `gate = selectRaceAnalysisGate(races, insight)`(U3) · `analysis = useRaceAnalysis()` · `handleAnalyze`(gate 방어 재확인).
- `RaceInsightCard`에 4 props 배선.
- **카드 배치**: races>0 분기 안, R22 `<Box sx={{mb:1}}>`와 `<Stack component="ol">` 사이에 **상시 렌더 래퍼** `<Box aria-live="polite">` — 내부에 success/insufficient/error일 때만 `RaceAnalysisCard`.
- 펼침 자동 스크롤은 페이지 effect 소유(expanded 전이 관찰).
- **무변경**: [+ 기록]·목표 팝업·미완성 확인·왕복·삭제·초기화·로그인 게이트·corrupted 분기. 새 고정 요소·query·라우트 0건.

## 5. 상태 → 컴포넌트 매핑 + 카피

| 훅 상태 | 진입점 | 응답 슬롯 | 카피 |
|---|---|---|---|
| idle + eligible | [AI 분석] enabled | 미렌더 | "AI 분석" |
| idle + 게이트 차단 | disabled + 사유 | 미렌더 | insufficient "기록 3건부터 분석할 수 있어요" / no_retire_reasons "이탈 사유를 입력하면 분석할 수 있어요" / empty 카드 null |
| loading | "분석 중…" disabled + [취소] | 미렌더 | "분석 중…" / "취소" |
| success(ok) | enabled(재분석) | success 카드 | 근거·AI 표식·L1 caption |
| success(insufficient) | enabled | insufficient 카드 | "분석할 근거가 부족해요 — {reason}…" |
| error(+retrying) | "분석 중…"(retrying) | error 카드 유지 | "분석하지 못했어요…" + [다시 시도]/"재시도 중…" |

error reason별 보조: unauthenticated "로그인이 필요해요" / forbidden "허용되지 않은 계정이에요" / ai_disabled "AI 분석이 비활성 상태예요" / rate_limited "잠시 후 다시 시도하세요" / timeout·upstream·invalid_response 보조 없음.

## 6. 테스트 계약

- **RaceInsightCard(기존 테스트 무수정 통과가 게이트)**: onAnalyze 미전달 시 기존 렌더 동일 / 1탭=1콜백 / disabledReason·aria-describedby / pending 라벨·취소·caption 숨김 / insufficient 행 추가.
- **RaceAnalysisCard**: success 접힘 clamp·aria-expanded·근거 caption(m=0이면 제외절 부재)·AI 표식 / 펼침 4섹션 순서·생략 섹션 DOM 부재·citedRaces·L1 caption·[접기] / 토글 1회 / insufficient 중립(`role="alert"` 부재·[다시 시도] 부재) / error 문구+보조+[다시 시도] / retryPending 카드 잔존 / 44px.
- **useRaceAnalysis(renderHook)**: idle→loading fetch 1회 / pending 중 no-op / cancel abort·idle / success 후 refreshing·data 유지 / error→retrying / unmount abort / 재마운트 idle.
- **RaceDetailPage 통합**: 2건 fixture 버튼 disabled·네트워크 0회 / 1탭=1요청·자동 트리거 없음 / 5xx → error 카드+R22 불변 / 카드 위치 / aria-live 래퍼 / 취소 후 재요청 / 기존 회귀 무수정 통과.
