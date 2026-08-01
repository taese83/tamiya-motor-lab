import {Box, Button, Paper, Stack, Typography} from '@mui/material'
import {useId} from 'react'

import {layoutTokens} from '@shared/config/design-tokens'

import type {AnalysisEvidence, AnalyzeUnavailableReason, RaceAnalysisOk} from '../api/analyze-race'

/**
 * 응답 표시용 뷰 유니언 (R25 U5 — component-spec race-ai §2).
 * 훅 상태(RaceAnalysisState)를 페이지가 이 뷰로 사상한다 — idle·첫 loading은 페이지가
 * 카드 자체를 미렌더(슬롯 0px)하므로 여기엔 대기 상태가 없다.
 */
export type RaceAnalysisView =
  | {kind: 'success'; data: RaceAnalysisOk}
  | {kind: 'insufficient'; reason: string; evidence: AnalysisEvidence}
  | {kind: 'error'; reason: AnalyzeUnavailableReason}

export interface RaceAnalysisCardProps {
  view: RaceAnalysisView
  /** 펼침 상태 — 소유는 useRaceAnalysis(새 success마다 접힘 기본) */
  expanded: boolean
  onToggleExpand: () => void
  /** error 카드 [다시 시도] — 페이지가 현재 파생값으로 재호출(최신성 보장) */
  onRetry: () => void
  /** true면 [다시 시도] → "재시도 중…" disabled — 카드는 unmount 없이 유지 */
  retryPending: boolean
}

// ── 카피 상수 1곳 (RACE_ENTRY_MESSAGES 선례 — component-spec §2·§5 확정 카피) ──────────
export const RACE_ANALYSIS_MESSAGES = {
  title: 'AI 분석',
  expand: '펼치기',
  collapse: '접기',
  /** AI 표식 + 외부 전송 고지(REQ-RAI 신뢰 경계) — success에서 근거 caption 아래 상시 */
  aiNotice:
    'AI가 생성한 해석입니다 — 다시 분석하면 표현이 달라질 수 있어요 · 요청 시에만 기록을 외부 AI로 보내고 응답은 저장하지 않아요',
  sectionTitles: {
    diagnosis: '진단',
    anomaly: '이상 신호',
    briefing: '브리핑',
    nextRace: '다음 판 제안',
  },
  citedRaces: (n: number) => `회차 ${n}건 근거`,
  /** L1 안전 caption — 제안 자동 적용 아님(REQ-RAI L1) */
  nextRaceCaution: '제안일 뿐 자동 적용되지 않아요 — [+ 기록]으로 직접 입력',
  evidence: (e: AnalysisEvidence) =>
    e.excludedNoReason > 0
      ? `기록 ${e.racesUsed}건 기준 · 사유 미입력 ${e.excludedNoReason}건 제외`
      : `기록 ${e.racesUsed}건 기준`,
  /** insufficient는 서버의 정상 판단(2xx) — 에러 톤·Alert·[다시 시도] 금지 */
  insufficientBody: (reason: string) =>
    `분석할 근거가 부족해요 — ${reason}. 기록이 쌓이면 다시 시도하세요`,
  errorBody: '분석하지 못했어요 — 결정론 요약은 위 카드에 있어요',
  /** error 전용 재시도 버튼(component-spec §5) — retryPending이면 카드 유지 + 버튼만 disabled */
  retry: '다시 시도',
  retryPending: '재시도 중…',
  /** reason별 보조 caption(§5) — timeout·upstream·invalid_response는 보조 없음(키 부재) */
  errorHints: {
    unauthenticated: '로그인이 필요해요',
    forbidden: '허용되지 않은 계정이에요',
    ai_disabled: 'AI 분석이 비활성 상태예요',
    rate_limited: '잠시 후 다시 시도하세요',
  } as Partial<Record<AnalyzeUnavailableReason, string>>,
} as const

// 섹션 고정 순서(진단→이상 신호→브리핑→다음 판 제안) — 접힘 요약 1줄의 "첫 존재 섹션" 탐색용
const SECTION_ORDER = ['diagnosis', 'anomaly', 'briefing', 'nextRace'] as const

function firstSectionSummary(sections: RaceAnalysisOk['sections']): string {
  for (const key of SECTION_ORDER) {
    const section = sections[key]
    if (section !== undefined) return section.summary
  }
  return '' // zod refine이 최소 1섹션 보장 — 도달 불가 방어값
}

const evidenceCaptionSx = {
  color: 'text.secondary',
  fontVariantNumeric: 'tabular-nums lining-nums',
} as const

interface AnalysisSectionProps {
  title: string
  summary: string
  /** diagnosis·anomaly만 — >0일 때만 근거 caption 노출(0이면 침묵) */
  citedRaces?: number
  /** nextRace 끝 L1 caption */
  footnote?: string
}

// summary·footnote는 평문 텍스트 렌더만 — dangerouslySetInnerHTML·마크다운 금지(T3④)
function AnalysisSection({title, summary, citedRaces, footnote}: AnalysisSectionProps) {
  return (
    <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.25}}>
      <Typography variant="subtitle2" component="p">
        {title}
      </Typography>
      <Typography variant="body2" sx={{wordBreak: 'keep-all'}}>
        {summary}
      </Typography>
      {citedRaces !== undefined && citedRaces > 0 && (
        <Typography variant="caption" sx={evidenceCaptionSx}>
          {RACE_ANALYSIS_MESSAGES.citedRaces(citedRaces)}
        </Typography>
      )}
      {footnote !== undefined && (
        <Typography variant="caption" sx={{color: 'text.secondary', wordBreak: 'keep-all'}}>
          {footnote}
        </Typography>
      )}
    </Box>
  )
}

/**
 * AI 분석 응답 카드 (R25 U5 — component-spec race-ai §2, 제어형 순수 렌더).
 *
 * - 데이터·상태기계는 useRaceAnalysis/페이지 소유 — 이 카드는 IO·query·effect 없음.
 * - min-height 5rem: success 접힘·insufficient·error가 공유해 재전환 점프 차단(펼침엔 무해).
 * - 내부 스크롤 금지 — 펼침이 길어도 스크롤 영역 흐름에 맡긴다(layout-spec §3).
 * - 전압 등 수치 표기는 서버 summary 그대로 — 재가공 없음(DL-029).
 */
export function RaceAnalysisCard({
  view,
  expanded,
  onToggleExpand,
  onRetry,
  retryPending,
}: RaceAnalysisCardProps) {
  // 펼치기 버튼 aria-controls 대상 — 접힘(요약 1줄)/펼침(4섹션)이 교대하는 영역
  const regionId = useId()
  // §5 표에 있는 4개 reason만 보조 caption — 나머지(timeout·upstream·invalid_response)는 undefined
  const errorHint =
    view.kind === 'error' ? RACE_ANALYSIS_MESSAGES.errorHints[view.reason] : undefined

  return (
    <Paper
      component="section"
      aria-label={RACE_ANALYSIS_MESSAGES.title}
      variant="outlined"
      sx={{
        px: 2,
        py: 1.5,
        minHeight: '5rem',
        scrollMarginTop: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
      }}>
      {view.kind === 'success' && (
        <>
          {/* 헤더 행 — 토글은 44px 히트 영역 + 음수 마진으로 행높이 ~28px 유지 */}
          <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1}}>
            <Typography variant="subtitle2" component="p">
              {RACE_ANALYSIS_MESSAGES.title}
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={onToggleExpand}
              aria-expanded={expanded}
              aria-controls={regionId}
              sx={{flexShrink: 0, mr: -1, my: -1, minHeight: layoutTokens.touchTargetMin}}>
              {expanded ? RACE_ANALYSIS_MESSAGES.collapse : RACE_ANALYSIS_MESSAGES.expand}
            </Button>
          </Box>

          {/* 근거 caption — evidence는 서버가 payload 값으로 덮어쓴 것(F2), m=0이면 제외절 부재 */}
          <Typography variant="caption" sx={evidenceCaptionSx}>
            {RACE_ANALYSIS_MESSAGES.evidence(view.data.evidence)}
          </Typography>

          {/* AI 표식 + 외부 전송 고지 — success 상시(접힘·펼침 공통) */}
          <Typography variant="caption" sx={{color: 'text.secondary', wordBreak: 'keep-all'}}>
            {RACE_ANALYSIS_MESSAGES.aiNotice}
          </Typography>

          <Box id={regionId}>
            {expanded ? (
              <Stack spacing={1.25}>
                {/* 4섹션 고정 순서 — 키 없는 섹션은 DOM 미렌더(침묵 원칙) */}
                {view.data.sections.diagnosis !== undefined && (
                  <AnalysisSection
                    title={RACE_ANALYSIS_MESSAGES.sectionTitles.diagnosis}
                    summary={view.data.sections.diagnosis.summary}
                    citedRaces={view.data.sections.diagnosis.citedRaces}
                  />
                )}
                {view.data.sections.anomaly !== undefined && (
                  <AnalysisSection
                    title={RACE_ANALYSIS_MESSAGES.sectionTitles.anomaly}
                    summary={view.data.sections.anomaly.summary}
                    citedRaces={view.data.sections.anomaly.citedRaces}
                  />
                )}
                {view.data.sections.briefing !== undefined && (
                  <AnalysisSection
                    title={RACE_ANALYSIS_MESSAGES.sectionTitles.briefing}
                    summary={view.data.sections.briefing.summary}
                  />
                )}
                {view.data.sections.nextRace !== undefined && (
                  <AnalysisSection
                    title={RACE_ANALYSIS_MESSAGES.sectionTitles.nextRace}
                    summary={view.data.sections.nextRace.summary}
                    footnote={RACE_ANALYSIS_MESSAGES.nextRaceCaution}
                  />
                )}
                {/* 최하단 [접기] — 긴 펼침에서 엄지 도달성(layout-spec §5). 스크롤 재정렬은 페이지 소유 */}
                <Button
                  size="small"
                  variant="text"
                  onClick={onToggleExpand}
                  sx={{
                    alignSelf: 'flex-start',
                    ml: -1,
                    mb: -1,
                    minHeight: layoutTokens.touchTargetMin,
                  }}>
                  {RACE_ANALYSIS_MESSAGES.collapse}
                </Button>
              </Stack>
            ) : (
              // 접힘 요약 1줄 — 첫 존재 섹션 summary, 2줄 wrap 금지(ellipsis 강제)
              <Typography
                variant="body2"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'keep-all',
                }}>
                {firstSectionSummary(view.data.sections)}
              </Typography>
            )}
          </Box>
        </>
      )}

      {view.kind === 'insufficient' && (
        <>
          {/* 서버의 정상 판단 — 중립 톤. Alert·role="alert"·[다시 시도] 금지(component-spec §2) */}
          <Typography variant="body2" sx={{color: 'text.secondary', wordBreak: 'keep-all'}}>
            {RACE_ANALYSIS_MESSAGES.insufficientBody(view.reason)}
          </Typography>
          <Typography variant="caption" sx={evidenceCaptionSx}>
            {RACE_ANALYSIS_MESSAGES.evidence(view.evidence)}
          </Typography>
        </>
      )}

      {view.kind === 'error' && (
        <>
          <Typography variant="body2" sx={{wordBreak: 'keep-all'}}>
            {RACE_ANALYSIS_MESSAGES.errorBody}
          </Typography>
          {errorHint !== undefined && (
            <Typography variant="caption" sx={{color: 'text.secondary', wordBreak: 'keep-all'}}>
              {errorHint}
            </Typography>
          )}
          {/* 재시도 중에도 카드 유지 — 버튼만 라벨 교체 + disabled */}
          <Button
            size="small"
            variant="text"
            onClick={onRetry}
            disabled={retryPending}
            sx={{alignSelf: 'flex-start', ml: -1, mb: -1, minHeight: layoutTokens.touchTargetMin}}>
            {retryPending ? RACE_ANALYSIS_MESSAGES.retryPending : RACE_ANALYSIS_MESSAGES.retry}
          </Button>
        </>
      )}
    </Paper>
  )
}
