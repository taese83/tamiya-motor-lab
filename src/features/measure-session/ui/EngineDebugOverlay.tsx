import {useEffect, useState} from 'react'

import {Box} from '@mui/material'

import {subscribeEngineDebug} from '../model/session'
import {describeTuningOverrides} from '../model/tuning-overrides'

import type {EngineDebugFrame} from '../model/session'
import type {MeasureView} from './measure-view'
import type {GateReject} from '@shared/lib/audio-analysis'

// ─────────────────────────────────────────────────────────────────────────────
// R53 엔진 진단 오버레이 — `?debug=1`에서만 렌더되는 개발 도구.
// 목적: 실기기에서 "어느 게이트가 measuring을 끊는가"를 즉석 판정.
// - 구독 채널은 게시 스로틀·hold를 우회한 **원본 estimate 전수**(hop 25ms) — 최근 ≈5s 창.
// - 제품 UI 계약(존 고정 높이·토큰·store 구독 규칙) 밖의 장식층: view는 페이지가 prop으로
//   주입하고, 계측은 effect 안에서만 수집해 RENDER_INTERVAL_MS마다 문자열로 스냅샷한다.
// - 튜닝 오버라이드(URL 쿼리)를 병기해 소거 실험 중 어떤 게이트를 껐는지 확인 가능.
// ─────────────────────────────────────────────────────────────────────────────

export interface EngineDebugOverlayProps {
  view: MeasureView
}

/** 통계 창 크기 (프레임 수) — hop 25ms 기준 ≈5초 */
const WINDOW_FRAMES = 200
/** 표시 갱신 주기 (ms) — 계측은 effect 로컬 배열에 쌓고 표시만 4Hz로 스냅샷 */
const RENDER_INTERVAL_MS = 250

const REJECT_LABELS: readonly GateReject[] = [
  'rms',
  'no-dip',
  'no-winner',
  'voicing',
  'snr',
  'harmonics',
]

interface DebugSnapshot {
  lines: string[]
  /** 최신 원본 estimate가 weak-signal — view=measuring이면 hold(유예 유지) 구간 */
  latestWeak: boolean
}

const EMPTY_SNAPSHOT: DebugSnapshot = {lines: ['engine: 대기 중 (estimate 없음)'], latestWeak: false}

function buildSnapshot(frames: readonly EngineDebugFrame[]): DebugSnapshot {
  const latest = frames[frames.length - 1]
  if (latest === undefined) return EMPTY_SNAPSHOT

  let passCount = 0
  const rejectCounts = new Map<GateReject, number>()
  // 기각 프레임이 평가한 f0의 분포 (10Hz 버킷) — 후보 미끄러짐 vs 스펙트럼 요동 판별 (R53)
  const rejectedF0Counts = new Map<number, number>()
  for (const frame of frames) {
    if (frame.estimate.status !== 'weak-signal') {
      passCount += 1
      continue
    }
    const debug = frame.estimate.debug
    for (const reject of debug?.rejects ?? []) {
      rejectCounts.set(reject, (rejectCounts.get(reject) ?? 0) + 1)
    }
    if (debug?.evalF0 != null) {
      const bucket = Math.round(debug.evalF0 / 10) * 10
      rejectedF0Counts.set(bucket, (rejectedF0Counts.get(bucket) ?? 0) + 1)
    }
  }
  const passPct = Math.round((passCount / frames.length) * 100)

  const lines = [
    `pass ${String(passPct)}% (${String(frames.length)}f) · ${latest.estimate.status}` +
      (latest.estimate.f0 !== null ? ` f0 ${latest.estimate.f0.toFixed(1)}Hz` : ''),
  ]
  const debug = latest.estimate.debug
  if (debug !== undefined) {
    lines.push(
      `rms ${debug.rms.toFixed(4)} snr ${debug.snrDb.toFixed(1)}dB ` +
        `voi ${debug.voicedProb.toFixed(2)} harm ${String(debug.harmonicCount)}` +
        (debug.evalF0 !== null ? ` ev ${debug.evalF0.toFixed(0)}` : ''),
    )
  }
  const histogram = REJECT_LABELS.filter(label => rejectCounts.has(label))
    .map(label => `${label} ${String(rejectCounts.get(label))}`)
    .join(' · ')
  lines.push(histogram === '' ? 'rejects: 없음' : `rejects: ${histogram}`)
  if (rejectedF0Counts.size > 0) {
    const top = [...rejectedF0Counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([bucket, count]) => `${String(bucket)}Hz×${String(count)}`)
      .join(' · ')
    lines.push(`rejF0: ${top}`)
  }
  return {lines, latestWeak: latest.estimate.status === 'weak-signal'}
}

export function EngineDebugOverlay({view}: EngineDebugOverlayProps) {
  const [snapshot, setSnapshot] = useState<DebugSnapshot>(EMPTY_SNAPSHOT)

  useEffect(() => {
    const frames: EngineDebugFrame[] = []
    const unsubscribe = subscribeEngineDebug(frame => {
      frames.push(frame)
      if (frames.length > WINDOW_FRAMES) frames.splice(0, frames.length - WINDOW_FRAMES)
    })
    const timer = setInterval(() => {
      setSnapshot(buildSnapshot(frames))
    }, RENDER_INTERVAL_MS)
    return () => {
      unsubscribe()
      clearInterval(timer)
    }
  }, [])

  // hold 가시화: view는 measuring인데 엔진 원본은 weak-signal — 유예 구간에서 값 유지 중
  const holding = view.status === 'measuring' && snapshot.latestWeak
  const overrides = describeTuningOverrides()

  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'fixed',
        top: 'calc(52px + var(--mml-safe-top, 0px))',
        left: 8,
        zIndex: theme => theme.zIndex.tooltip,
        pointerEvents: 'none',
        px: 1,
        py: 0.5,
        borderRadius: 1,
        bgcolor: 'rgba(0, 0, 0, 0.72)',
        color: '#9dff57',
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 1.5,
        whiteSpace: 'pre',
      }}>
      {[
        `view ${view.status}${holding ? ' (hold)' : ''}`,
        ...snapshot.lines,
        ...(overrides.length > 0 ? [`tune: ${overrides.join(' ')}`] : []),
      ].join('\n')}
    </Box>
  )
}
