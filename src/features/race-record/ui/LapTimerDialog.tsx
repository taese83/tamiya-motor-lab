import {Box, Button, Dialog, Typography} from '@mui/material'
import {useEffect, useRef, useState} from 'react'

import {numericTypography} from '@shared/config/design-tokens'

import type {RaceResult} from '@shared/config/domain'

export interface LapTimerDialogProps {
  open: boolean
  /** 취소·backdrop·ESC — 무효(draft 무변경) */
  onClose: () => void
  /**
   * 정지 후 [완주]/[이탈] 확정 — 부모가 draft에 result + lapTimeRaw(초, 2자리)를 반영한다.
   * 완주→'finished', 이탈→'retired'. 이탈은 시트의 이탈 사유 셀렉트를 펼치는 트리거가 된다.
   */
  onResult: (result: RaceResult, lapTimeSec: number) => void
}

type Phase = 'idle' | 'running' | 'stopped'

// 경과 ms → "S.cs" 또는 "M:SS.cs"(60초+). 히어로 표시 전용 — 저장값은 onResult(초 2자리)가 소유.
function formatStopwatch(ms: number): string {
  const totalCs = Math.floor(ms / 10)
  const cs = totalCs % 100
  const totalSec = Math.floor(totalCs / 100)
  const sec = totalSec % 60
  const min = Math.floor(totalSec / 60)
  const cc = String(cs).padStart(2, '0')
  return min > 0 ? `${min}:${String(sec).padStart(2, '0')}.${cc}` : `${sec}.${cc}`
}

/**
 * 랩타임 실측 타이머 팝업 (R41 ⑤, 사용자). RaceEntrySheet의 랩타임 필드에서 진입한다.
 * 상태기계: idle → (시작) running → (정지) stopped → 완주 / 이탈 / 취소.
 * - 완주: 잰 랩타임 + 결과=완주를 부모 draft에 반영.
 * - 이탈: 잰 랩타임 + 결과=이탈(시트가 이탈 사유 셀렉트를 펼친다).
 * - 취소: 무효(닫기만, draft 무변경).
 * 계측은 performance.now()(월클록 아님) — 정지 순간 값을 동기 확정하므로 rAF 유무와 무관하게 정확하다.
 * open 전환마다 idle/0으로 리셋(직전 계측 잔상 방지).
 */
export function LapTimerDialog({open, onClose, onResult}: LapTimerDialogProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const startRef = useRef(0)

  // 닫힘 전환 완료 시 초기화 — 직전 랩타임 잔상이 다음 열림에 남지 않게(effect 내 setState 회피,
  // MUI transition onExited 콜백에서 리셋). 초기 마운트는 이미 idle/0이라 첫 열림도 깨끗하다.
  const resetTimer = () => {
    setPhase('idle')
    setElapsedMs(0)
  }

  // running 동안 rAF로 히어로 갱신(표시 전용). 정지 시점 값은 handleStop이 동기 확정한다.
  useEffect(() => {
    if (phase !== 'running') return undefined
    let raf = 0
    const tick = () => {
      setElapsedMs(performance.now() - startRef.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  const handleStart = () => {
    startRef.current = performance.now()
    setElapsedMs(0)
    setPhase('running')
  }
  const handleStop = () => {
    setElapsedMs(performance.now() - startRef.current)
    setPhase('stopped')
  }
  // 정지 시 확정된 elapsedMs를 초 2자리(centisecond)로 — 필드 lapTimeRaw 포맷과 정합
  const finalize = (result: RaceResult) => {
    onResult(result, Math.round(elapsedMs / 10) / 100)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="lap-timer-title"
      fullWidth
      maxWidth="xs"
      slotProps={{transition: {onExited: resetTimer}}}>
      <Box sx={{p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2}}>
        <Typography id="lap-timer-title" variant="h2" component="h2" sx={{alignSelf: 'flex-start'}}>
          랩타임
        </Typography>

        {/* 히어로 — 경과시간 대형 표시. running이면 라임 강조, 정지 후엔 중립색 확정값 */}
        <Box
          role="timer"
          aria-live="off"
          sx={{
            ...numericTypography.guideRange,
            fontSize: '3.5rem',
            lineHeight: 1,
            py: 1,
            fontVariantNumeric: 'tabular-nums lining-nums',
            color: phase === 'running' ? 'primary.main' : 'text.primary',
          }}>
          {formatStopwatch(elapsedMs)}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{mt: -1}}>
          초
        </Typography>

        {/* 컨트롤 — idle:[시작] / running:[정지] / stopped:[완주][이탈][취소] */}
        {phase === 'idle' && (
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleStart}
            sx={{minHeight: 52}}>
            시작
          </Button>
        )}
        {phase === 'running' && (
          <Button
            fullWidth
            variant="contained"
            color="error"
            size="large"
            onClick={handleStop}
            sx={{minHeight: 52}}>
            정지
          </Button>
        )}
        {phase === 'stopped' && (
          <Box sx={{display: 'flex', flexDirection: 'column', gap: 1, width: '100%'}}>
            <Box sx={{display: 'flex', gap: 1}}>
              <Button
                variant="contained"
                onClick={() => finalize('finished')}
                sx={{flex: 1, minHeight: 48}}>
                완주
              </Button>
              <Button
                variant="outlined"
                onClick={() => finalize('retired')}
                sx={{flex: 1, minHeight: 48}}>
                이탈
              </Button>
            </Box>
            <Button variant="text" onClick={onClose} sx={{minHeight: 44}}>
              취소
            </Button>
          </Box>
        )}
      </Box>
    </Dialog>
  )
}
