import {Box, Typography} from '@mui/material'

import type {MeasureView} from './measure-view'

export interface SignalStrengthProps {
  view: MeasureView
}

type Tone = 'weak' | 'ok' | 'idle'

/** 수신감도 막대 개수 — 5칸(휴대폰 신호 은유) */
const BAR_COUNT = 5

interface Strength {
  /** 실시간 신호 존재(measuring/weak-signal) — 아니면 빈 막대 dim */
  active: boolean
  /** 켜진 막대 수(0~BAR_COUNT) — confidence를 5칸으로 양자화 */
  bars: number
  /** 약함 / 양호 / 강 (비active면 '') */
  label: string
  tone: Tone
}

// confidence(0~1) → 켜진 막대 수(0~5). 반올림 양자화 — 0.2→1칸, 0.6→3칸, 0.9→5칸.
const barsFrom = (confidence: number): number =>
  Math.max(0, Math.min(BAR_COUNT, Math.round(Math.min(1, Math.max(0, confidence)) * BAR_COUNT)))

// 상태 → 신호 세기 파생. weak-signal=약함(앰버), measuring=양호/강(라임, confidence로 분기), 그 외=idle(빈 막대).
function strengthOf(view: MeasureView): Strength {
  if (view.status === 'weak-signal') {
    return {active: true, bars: barsFrom(view.confidence), label: '약함', tone: 'weak'}
  }
  if (view.status === 'measuring') {
    return {
      active: true,
      bars: barsFrom(view.confidence),
      label: view.confidence >= 0.85 ? '강' : '양호',
      tone: 'ok',
    }
  }
  return {active: false, bars: 0, label: '', tone: 'idle'}
}

const TONE_COLOR: Record<Tone, string> = {
  weak: 'warning.main', // 앰버 — 신호 약함(더 가까이 유도)
  ok: 'primary.main', // 라임 — 신호 양호/강
  idle: 'text.disabled',
}

/**
 * S1 신호 세기 미터 (R45, 사용자) — 안정도 게이지 하단. 기존 "신호 약함"(Z1)·"더 가까이"(게이지)를
 * **하나로 통일**한다: 엔진 confidence(0~1)를 가로 막대로 표시(약=앰버, 양호/강=라임), 비측정 시 빈 막대 dim.
 *
 * a11y: 컨테이너 role="img" + aria-label 단일 라벨("신호 세기 약함")로 읽히고 내부 요소는 aria-hidden.
 * aria-live 없음 — 상태 전이 낭독은 Z1 role="status"(측정 중/신호 약함)가 단일 채널로 담당(≥10Hz 스팸 방지).
 * 라벨은 tone 변화(약↔양호)에만 바뀌므로 non-live여도 필요 시 현재 세기를 읽을 수 있다.
 */
export function SignalStrength({view}: SignalStrengthProps) {
  const s = strengthOf(view)
  const color = TONE_COLOR[s.tone]
  return (
    <Box
      role="img"
      aria-label={s.active ? `신호 세기 ${s.label}` : '신호 세기'}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        minHeight: '1.4em',
      }}>
      <Typography aria-hidden variant="caption" sx={{color: 'text.secondary', flexShrink: 0}}>
        신호 세기
      </Typography>
      {/* 수신감도 막대 — 왼→오른으로 높아지는 5칸(휴대폰 신호 은유). confidence만큼 켜지고, 켜진 칸은
          tone색(약=앰버/양호·강=라임), 꺼진 칸은 dim 트랙. 하단 정렬(flex-end)로 계단 형태를 만든다. */}
      <Box aria-hidden sx={{display: 'flex', alignItems: 'flex-end', gap: '3px', height: 18}}>
        {Array.from({length: BAR_COUNT}, (_, i) => {
          const on = i < s.bars
          return (
            <Box
              key={i}
              sx={{
                width: 5,
                height: `${((i + 1) / BAR_COUNT) * 100}%`,
                borderRadius: 1,
                bgcolor: on ? color : 'action.disabledBackground',
                opacity: on ? 1 : 0.55,
                transition: 'background-color 140ms, opacity 140ms',
                '@media (prefers-reduced-motion: reduce)': {transition: 'none'},
              }}
            />
          )
        })}
      </Box>
      {/* 세기 라벨 — 폭 고정으로 막대 위치가 라벨 길이(약함/양호/강)에 흔들리지 않게 */}
      <Typography
        aria-hidden
        variant="caption"
        sx={{color, fontWeight: 700, flexShrink: 0, minWidth: '2.4em', textAlign: 'left'}}>
        {s.label}
      </Typography>
    </Box>
  )
}
