import {Box, Checkbox, FormControlLabel, Paper, Typography} from '@mui/material'
import {useState} from 'react'

import {retireReasonRowLabel} from '@shared/config/domain'
import {layoutTokens} from '@shared/config/design-tokens'

import type {PrerunChecklistGroup} from '@entities/race-record'

// 주행 전 체크리스트 블록 (R30 race-autofill U4 — REQ-AF-005·006·N04, DL-038).
// 표시 전용(ephemeral) — 체크 상태는 이 컴포넌트 로컬 useState뿐이고 언마운트(시트 닫힘·저장)
// 시 소멸한다. onChange류 콜백이 **props 타입에 없음** — 체크 상태가 draft·useRaceEntry·
// 스키마로 새는 경로를 계약으로 차단한다(DL-038). 데이터는 페이지가 selectPrerunChecklist로
// 주입(RaceRetireReasonSelect 선례 — RaceEntrySheet 내부 직접 소비).

export interface RacePrerunChecklistProps {
  /** selectPrerunChecklist 파생(≤3항목) — 빈 배열이면 블록 자체 미렌더(REQ-AF-006 침묵) */
  groups: ReadonlyArray<PrerunChecklistGroup>
}

export function RacePrerunChecklist({groups}: RacePrerunChecklistProps) {
  // 로컬 체크 상태 — key `${reason}:${item}`. 저장·상위 전파 없음, 재마운트 시 초기화(ephemeral)
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set())

  if (groups.length === 0) return null

  const toggle = (key: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <Paper
      component="section"
      aria-label="주행 전 점검"
      variant="outlined"
      sx={{px: 2, py: 1.5}}>
      {/* 헤더 — 제목 + "표시 전용" 명시 카피(REQ-AF-005). sr 도달 가능(N04 — aria-hidden 금지) */}
      <Box sx={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1}}>
        <Typography component="h3" variant="body2" sx={{m: 0, fontWeight: 700}}>
          주행 전 점검
        </Typography>
        <Typography
          component="span"
          variant="caption"
          sx={{color: 'text.secondary', flexShrink: 0}}>
          표시 전용 · 저장 안 됨
        </Typography>
      </Box>

      {/* 항목 ≤3 — FormControlLabel이 <label>로 Checkbox input을 감싸 접근 가능한 이름을 만든다.
          행 minHeight 44(터치 타깃, N04) — 테마 MuiCheckbox padding 10(=44px 타깃)과 이중 보장.
          ml -1.25는 체크박스 패딩(10px) 상쇄 — 아이콘 좌단을 카드 패딩에 정렬. */}
      <Box sx={{display: 'flex', flexDirection: 'column', mt: 0.5}}>
        {groups.flatMap(group =>
          group.items.map(item => {
            const key = `${group.reason}:${item}`
            return (
              <FormControlLabel
                key={key}
                control={<Checkbox checked={checked.has(key)} onChange={() => toggle(key)} />}
                label={item}
                slotProps={{typography: {variant: 'body2'}}}
                sx={{ml: -1.25, mr: 0, minHeight: layoutTokens.touchTargetMin}}
              />
            )
          }),
        )}
      </Box>

      {/* 근거 — "최근 이탈: 점프 · 공중 자세 무너짐 ×2 · 멈춤 ×1" 꼴. 일반 텍스트라 sr 도달 가능 */}
      <Typography variant="caption" sx={{display: 'block', color: 'text.secondary', mt: 0.5}}>
        {`최근 이탈: ${groups.map(g => `${retireReasonRowLabel(g.reason)} ×${g.count}`).join(' · ')}`}
      </Typography>
    </Paper>
  )
}
