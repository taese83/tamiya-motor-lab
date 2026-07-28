import type {ReactNode} from 'react'
import {useId} from 'react'
import {Box, Chip, FormControlLabel, Radio, RadioGroup, Typography} from '@mui/material'
import {color} from '@shared/config/design-tokens'

/** 라디오 행 뷰모델 — gradeLabel은 shared/config 라벨 맵 통과 값, null이면 칩 미표시(CP2-3) */
export interface MotorRadioOption {
  /** stable UUID */
  id: string
  name: string
  gradeLabel: string | null
}

export interface MotorRadioListProps {
  /** 최근 사용순(FP-A1) 정렬은 데이터 계층 소관 — 주어진 순서 그대로 렌더 */
  motors: ReadonlyArray<MotorRadioOption>
  /** motorId — LO-1: S5는 미선택(null)으로 시작 */
  value: string | null
  onChange: (motorId: string) => void
  /** "모터 선택" — radiogroup aria-label (component-spec §4.2) */
  legend: string
  /** S2 미선택 저장 시도 — 그룹 외곽 error + 문구(aria-describedby). focus 이동은 폼(§5.2) 소유 */
  error?: string | null
  /**
   * motors가 빈 목록일 때 라디오 그룹 대신 렌더할 콘텐츠 — copy·행동 버튼은 소비자 소유
   * (S2 인라인 [모터 등록] 카드는 feature §5.2, S5 EmptyState는 page §6 소관). 미전달 시 null 렌더.
   */
  emptyContent?: ReactNode
}

/**
 * S2·S5 공통 모터 선택 라디오 (component-spec §4.2) — 이름 + 등급 칩 수준(심플 원칙).
 * RadioGroup+FormControlLabel+Radio — native radio 시맨틱(화살표 이동 기본 제공),
 * Radio 44px 타깃은 theme MuiRadio 패딩 오버라이드가 보장. 행 높이 ≥56px, 행 전체 탭.
 * 등급 칩은 features/motor-management GradeChip과 동일 시각(중립색, DS-A5) —
 * entities는 features를 import할 수 없어 자체 렌더한다(§4.3 소유 정리 시 통합 대상).
 */
export function MotorRadioList({
  motors,
  value,
  onChange,
  legend,
  error,
  emptyContent,
}: MotorRadioListProps) {
  const errorId = useId()
  const hasError = error != null && error !== ''

  if (motors.length === 0) {
    return <>{emptyContent ?? null}</>
  }

  return (
    <Box>
      <RadioGroup
        aria-label={legend}
        aria-describedby={hasError ? errorId : undefined}
        value={value ?? ''}
        onChange={(_event, motorId) => onChange(motorId)}
        sx={{
          gap: 0.5,
          ...(hasError && {
            border: 1,
            borderColor: 'error.main',
            borderRadius: 1,
            px: 1,
          }),
        }}>
        {motors.map(motor => (
          <FormControlLabel
            key={motor.id}
            value={motor.id}
            control={<Radio />}
            sx={{minHeight: '3.5rem', mx: 0, gap: 0.5}}
            label={
              <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minWidth: 0}}>
                <Typography variant="body1" noWrap sx={{minWidth: 0}}>
                  {motor.name}
                </Typography>
                {motor.gradeLabel !== null && (
                  <Chip
                    variant="outlined"
                    size="small"
                    label={motor.gradeLabel}
                    sx={{color: color.gray700, borderColor: color.gray500}}
                  />
                )}
              </Box>
            }
          />
        ))}
      </RadioGroup>
      {hasError && (
        <Typography id={errorId} variant="body2" color="error" sx={{mt: 0.5}}>
          {error}
        </Typography>
      )}
    </Box>
  )
}
