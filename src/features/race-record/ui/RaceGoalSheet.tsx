import {Box, Button, Typography} from '@mui/material'

import {RACE_GOALS, RACE_GOAL_LABELS} from '@shared/config/domain'
import {layoutTokens} from '@shared/config/design-tokens'
import {BottomSheet} from '@shared/ui/bottom-sheet'

import type {RaceGoal} from '@shared/config/domain'

// 레이스 목표 선택 팝업 (v2.31 — 2번째+ 입력 진입점). 무엇을 우선할지 고르면 그 목표 + 과거
// 레이스 + 현재 파노로 전압을 추천한다. 완전 제어형 — 선택은 상위(page)가 openWithGoal로 처리.
// 직전 목표를 primary(contained)로 강조해 "지난 목표"를 빠르게 반복 선택할 수 있게 한다.

/** 목표별 한 줄 설명 — 라벨만으로 애매한 우선순위 뉘앙스를 보강 */
const GOAL_DESCRIPTIONS: Record<RaceGoal, string> = {
  finish: '완주 우선 · 보수적 전압',
  stability: '안정 · 균형 잡힌 전압',
  speed: '속도 우선 · 공격적 전압',
}

export interface RaceGoalSheetProps {
  open: boolean
  /** 직전 기록의 목표 — 있으면 해당 버튼을 강조(반복 선택 편의). 없으면 균등 표시 */
  lastGoal: RaceGoal | null
  onSelect: (goal: RaceGoal) => void
  onClose: () => void
}

export function RaceGoalSheet({open, lastGoal, onSelect, onClose}: RaceGoalSheetProps) {
  return (
    <BottomSheet open={open} title="이번 목표" onClose={onClose}>
      <Typography color="text.secondary" sx={{mb: 2}}>
        무엇을 우선할까요? 목표에 맞춰 지난 기록·현재 파노로 전압을 추천합니다.
      </Typography>
      <Box sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
        {RACE_GOALS.map(goal => {
          const isLast = goal === lastGoal
          return (
            <Button
              key={goal}
              fullWidth
              variant={isLast ? 'contained' : 'outlined'}
              onClick={() => onSelect(goal)}
              sx={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 0.25,
                py: 1,
                minHeight: layoutTokens.formControlHeight,
                textTransform: 'none',
              }}>
              <Typography component="span" sx={{fontWeight: 700}}>
                {RACE_GOAL_LABELS[goal]}
                {isLast ? ' · 지난 목표' : ''}
              </Typography>
              <Typography
                component="span"
                variant="caption"
                sx={{color: isLast ? 'inherit' : 'text.secondary', opacity: isLast ? 0.85 : 1}}>
                {GOAL_DESCRIPTIONS[goal]}
              </Typography>
            </Button>
          )
        })}
      </Box>
    </BottomSheet>
  )
}
