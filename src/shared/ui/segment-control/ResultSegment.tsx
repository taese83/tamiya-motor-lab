import {Box, FormHelperText} from '@mui/material'
import {RUN_RESULTS, RUN_RESULT_LABELS} from '@shared/config/domain'
import type {RunResult} from '@shared/config/domain'
import {useId} from 'react'
import {SegmentControl} from './SegmentControl'
import type {SegmentOption} from './SegmentControl'

// 도메인 상수 1곳 결속 — 라벨 하드코딩 금지 (D4 어휘 교체는 shared/config 라벨 맵만)
const RESULT_OPTIONS: ReadonlyArray<SegmentOption<RunResult>> = RUN_RESULTS.map(value => ({
  value,
  label: RUN_RESULT_LABELS[value],
}))

export interface ResultSegmentProps {
  value: RunResult | null
  /** 필수 항목 — 해제 불가 */
  onChange: (value: RunResult) => void
  /** 폼 검증 오류 문구("주행 결과를 선택하세요") — 그룹 외곽 error + 문구 표시 */
  error?: string | null | undefined
}

/** S2 주행 결과 3택 — 결과에 시맨틱 색 금지(코스아웃 red 금지, DS-A5) */
export function ResultSegment({value, onChange, error = null}: ResultSegmentProps) {
  const helperId = useId()
  const hasError = error !== null && error !== ''
  return (
    <Box>
      <SegmentControl
        options={RESULT_OPTIONS}
        value={value}
        onChange={next => {
          if (next !== null) onChange(next)
        }}
        aria-label="주행 결과"
        error={hasError}
        aria-describedby={hasError ? helperId : undefined}
      />
      {hasError && (
        <FormHelperText error id={helperId}>
          {error}
        </FormHelperText>
      )}
    </Box>
  )
}
