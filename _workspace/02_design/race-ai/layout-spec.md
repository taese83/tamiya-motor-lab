# Layout Spec — 레이스 AI 분석 (Phase 2, 2026-08-01)

> 근거: `_workspace/01_plan/race-ai/{ux-brief,requirements}.md`, `_workspace/02_design/race-ai/ai-architecture.md`, 실코드 `RaceDetailPage.tsx`·`RaceInsightCard.tsx`·`RaceRecordRow.tsx`·`PageHeader.tsx`·`design-tokens.ts`·`theme.ts`. 신규 화면·라우트·토큰 없음. (기록 주체: 오케스트레이터 대필 — ownership hook.)

## 1. 고정 셸 실측 (코드 근거)

| 요소 | 값 | 근거 |
|---|---|---|
| 페이지 셸 | `100dvh − 56px(bottomNavHeight) − safe-bottom` | `pageShellSx`, `layoutTokens.bottomNavHeight: 56` |
| 헤더 | `3.5rem = 56px` (+safe-top, sticky) | `PageHeader` height `calc(3.5rem + var(--mml-safe-top))` |
| 하단 푸터 | ~73px = py 12×2 + 초기화 버튼 `minHeight: 48` + border 1 | `footerSx` + `ResetRecordsBlock` |
| 스크롤 영역 | `flex:1, minHeight:0, overflowY:auto` — **유일한 스크롤 소유자** | `scrollAreaSx`, py 16×2 |
| R22 카드(ready 전체) | **~164px** = border 2 + py 24 + 1행 62.5 + streak 18.4 + trend 18.4 + 하단 행 ~20 + gap 6×3 | `RaceInsightCard` + `numericTypography.guideRange` + theme body2 |
| R22 insufficient 카드 | ~46px (1줄 축약) | 동 파일 |
| 목록 행 | **~64px** = border 2 + py 24 + 좌측 2줄(18.4 + gap 2 + 16.8) | `RaceRecordRow` py 1.5 |
| 카드↔목록 간격 | 8px (`mb:1`) + 행간 `spacing={1}` | `RaceDetailPage` |

**스크롤 뷰포트**: 375×667 → 667−56−56−73 = **482px** / 360×640 → **455px** (safe-area 0 기준).

## 2. 진입점 배치 — A안 확정 (코드 검증 완료)

R22 카드 하단 행은 `[excluded caption?][spacer][보는 법(ml:auto)]` 구조 — **[AI 분석] text 버튼을 [보는 법] 좌측에 삽입해도 행 높이 불변**(동일 행 재사용). `ml:'auto'`는 [보는 법]→[AI 분석](첫 버튼)으로 이동. 카드 높이 증가 **0px** → A안 성립·확정.

- 위계 보존: [+ 기록]은 헤더 라임 contained 유지 ≫ [AI 분석]·[보는 법]은 카드 내 `size="small" variant="text"`.
- 터치 타깃(NFR-005④): [AI 분석]은 `minHeight: 44` + 음수 마진으로 시각 행높이 ~20px 유지하며 44px 히트 영역 확보.
- **insufficient 카드(1~2건)**: 하단 행이 없으므로 disabled [AI 분석] + 사유 caption("기록 3건부터 분석할 수 있어요") 행을 **추가**(+~26px, §4 예산 내). kind=empty는 카드 자체가 null → 진입점 없음(게이트 자연 충족).
- 하단 행 좌측 caption 우선순위: ① 게이트 사유(disabled 시) ② 미정 n건 제외 ③ 요청 중에는 숨김(취소 버튼 폭 확보). 동시 표기 금지.

## 3. 응답 카드 배치 — 스크롤 소유권

- 위치: **스크롤 영역 내부**, R22 카드 `mb:1` 아래·목록 `<ol>` 위에 형제로 삽입. 새 고정 요소·sticky 금지(셸 불변).
- **내부 스크롤 금지 확정**: 펼침이 길어져도 `max-height`·`overflow` 없이 스크롤 영역 흐름에 맡긴다(중첩 스크롤 금지 관례).
- `Paper variant="outlined" px:2 py:1.5` — R22 카드와 동일 스킨(신규 토큰 없음).

## 4. 높이 예산 — 5상태 (레이아웃 시프트 규칙 포함)

| 상태 | 슬롯 높이 | 시프트 규칙 |
|---|---|---|
| 대기 | **0px** (하단 행 재사용) | — |
| 요청 중 | **0px** — 버튼 라벨 "분석 중…" disabled + [취소] 같은 행. R22·목록 불변 | 행 wrap 금지(Phase 3 실측 ①) |
| 성공(접힘) | **~104px, 예산 상한 120px** = border 2 + py 24 + 헤더 행 28 + 근거 caption 20 + 요약 1줄 18.4 + gap 12 | 삽입 지점이 목록 위라 **R22·진입점 버튼은 부동, 아래로만 밀림** |
| 성공(펼침) | ~360–450px(4섹션 전부 발화 시. 침묵 원칙으로 통상 더 짧음) | 자동 스크롤(§5) |
| 실패/판단불가 | 1줄 + [다시 시도] ≈ 84–104px | 성공 접힘과 **min-height `5rem`(80px) 공유** |

- **요청 중→성공 전환**: 예약 스켈레톤 슬롯 없음(ux-brief "요청 중 R22·목록 그대로"). 성공 시 1회 삽입 시프트는 삽입점 아래로만 발생. mount 후에는 min-height 5rem을 성공 접힘·실패가 공유해 재전환 점프 차단. 재시도 중 실패 카드 unmount 금지(버튼만 "재시도 중…" disabled).
- **375×667 접힘 검증**: 16(py) + 164(R22) + 8 + **104**(접힘) + 8 + 64(첫 행) = **364px ≤ 482px** ✓ (여유 118px). REQ-RAI-NFR-001 충족.
- **360×640**: R22 ≈161px → 16+161+8+104+8+64 = **361 ≤ 455** ✓ (여유 94px). streak 줄바꿈(+18)·insufficient 행(+26) 최악 조합도 통과 — **줄일 것 없음**. 단 요약이 2줄로 wrap하지 않도록 `WebkitLineClamp:1`(ellipsis) 강제.

## 5. 펼침 인터랙션

- 펼침 시 자동 스크롤: 응답 카드 상단을 스크롤 영역 상단 −8px 정렬(`scroll-margin-top: 8px`). 펼침 카드(≤450px)가 스크롤 뷰포트(482px) 안에 거의 전부 수용.
- 접기 도달성: 헤더 행 [펼치기/접기] 토글 + **펼침 시 카드 최하단에 [접기] text 버튼 추가**(엄지 위치). 하단 [접기] 탭 시 카드 상단 재정렬(`block:'nearest'`).
- 섹션 순서 고정: 진단→이상 신호→브리핑→다음 판 제안(subtitle2 + body2 1–2문장), 근거 없는 섹션 생략. 제안 섹션 끝 L1 caption.
- 접근성: 슬롯 컨테이너 `aria-live="polite"`, 펼치기 `aria-expanded`, disabled 사유 caption은 버튼 `aria-describedby`.

## 6. Phase 3 프리뷰 실측 목록

1. 요청 중 하단 행(분석 중…+취소+보는 법)이 360px에서 wrap 없는지
2. 성공 접힘 실측 높이 ≤120px, 375×667·360×640에서 첫 행 완전 노출(§4 계산 대조)
3. 펼침 자동 스크롤 정렬·하단 [접기] 한 손 도달
4. 실패↔재시도↔성공 전환에서 min-height 5rem 공유로 점프 0인지
5. [AI 분석] 히트 영역 44px — [보는 법]·trend 줄 오탭 간섭 여부
6. insufficient 카드 +행 추가 후 높이(~72px)와 caption 단독 표기 규칙
