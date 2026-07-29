import {Box, FormHelperText, Typography} from '@mui/material'
import {layoutTokens} from '@shared/config/design-tokens'

import type {ReactNode} from 'react'

// FormField — 폼 필드 공통 면 (레퍼런스: Mobbin 계정/프로필 편집 폼).
// ① 라벨은 **필드 위 굵은 텍스트** ② 값·컨트롤은 테두리 면 안에 ③ 우측 인라인 액션 슬롯
// ④ 오류/도움말 슬롯은 높이 예약(등장 시 레이아웃 밀림 금지).
//
// 표면 언어는 기존 것을 유지한다 — 직각(라운드 없음)·헤어라인 테두리·라임 포커스 링.
// 레퍼런스의 라운드/pill은 가져오지 않는다(사용자 결정: 구조만 채택).
//
// v2.13: v2.11의 notch(라벨을 테두리에 파넣기)를 철회했다. 사용자가 최신 레퍼런스로
// "라벨은 필드 위" 형태를 지정했고, 실제로 notch는 이 앱과 궁합이 나빴다 —
// 폼에 텍스트 입력이 아닌 컨트롤(세그먼트·스테퍼)이 섞여 있어 그것들 위에도 라벨이 겹쳐
// z-index로 눌러야 했고, 라벨 뒤를 배경색으로 덮어야 해서 "background.paper 표면 위에서만
// 정상 렌더"라는 제약이 붙었다. 라벨을 위로 빼면 두 억지가 모두 사라진다.

export interface FormFieldProps {
  /** 필드 라벨 — 테두리에 파넣어 표시한다 */
  label: string
  /**
   * 내부 컨트롤의 id. 주면 실제 `<label for>`로 연결한다(텍스트 입력).
   * 없으면 라벨을 aria-hidden으로 둔다 — 내부 컨트롤이 자체 accessible name을
   * 이미 갖는 경우(SegmentControl·VoltageStepper의 aria-label) 이중 낭독을 피한다.
   */
  labelFor?: string | undefined
  /** 오류 문구 — 테두리 error 톤 + 하단 helper. 내부 컨트롤이 자체 오류 슬롯을 가지면 넘기지 않는다 */
  error?: string | null | undefined
  /**
   * 오류 helper에 부여할 id — 내부 컨트롤의 aria-describedby로 연결해 프로그램적 결속을
   * 유지한다(시각적 인접만으로는 낭독되지 않는다).
   */
  errorId?: string | undefined
  /** 하단 오류/도움말 슬롯 자체를 숨긴다(내부 컨트롤이 이미 슬롯을 예약한 경우 — 이중 여백 방지) */
  hideHelperSlot?: boolean | undefined
  /** 면 우측 인라인 액션 — 레퍼런스 EDIT 위치 */
  action?: ReactNode | undefined
  /** 도움말 문구 — error가 없을 때만 표시 */
  helperText?: string | undefined
  children: ReactNode
}

export function FormField({
  label,
  labelFor,
  error = null,
  errorId,
  hideHelperSlot = false,
  action,
  helperText,
  children,
}: FormFieldProps) {
  const hasError = error !== null && error !== ''
  return (
    <Box>
      {/*
        라벨 — 필드 위 굵은 텍스트(레퍼런스). 오류 시에도 색을 바꾸지 않는다:
        오류 신호는 테두리 + 아래 helper 문구가 담당하고, 라벨까지 붉게 물들이면
        "무엇이 문제인지"보다 "어디가 붉은지"가 먼저 읽힌다.
      */}
      <Typography
        {...(labelFor !== undefined
          ? {component: 'label' as const, htmlFor: labelFor}
          : {component: 'span' as const, 'aria-hidden': true})}
        variant="body2"
        sx={{
          display: 'block',
          mb: 0.75,
          fontWeight: 700,
          color: 'text.primary',
          lineHeight: 1.2,
        }}>
        {label}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          minHeight: layoutTokens.formControlHeight,
          border: '1px solid',
          borderColor: hasError ? 'error.main' : 'var(--mml-outline)',
          // 내부 컨트롤은 자기 테두리를 그리지 않는다 — 면은 이 컴포넌트가 소유한다
          '& .MuiOutlinedInput-notchedOutline': {border: 0},
          /*
           * 텍스트 입력이 포커스를 받을 때만 면 전체로 표시한다.
           * `:focus-within`을 그대로 쓰면 인라인 액션([측정] 버튼)에 포커스가 갔을 때도 면이
           * 링을 둘러 "필드가 편집 중"으로 오해된다 — 버튼은 자기 포커스를 스스로 표시한다.
           *
           * 두 신호를 함께 본다: native `input:focus`와 MUI가 입력 루트에 붙이는 `.Mui-focused`.
           * 어느 한쪽만 쓰면 브라우저·MUI 버전 차이로 링이 누락될 수 있다.
           */
          '&:has(input:focus), &:has(input:focus-visible), &:has(.Mui-focused)': {
            outline: '2px solid var(--mml-focus-ring)',
            outlineOffset: '1px',
          },
        }}>

        <Box sx={{flex: 1, minWidth: 0, display: 'flex', alignItems: 'center'}}>{children}</Box>
        {action !== undefined && action !== null && (
          <Box sx={{display: 'flex', alignItems: 'center', flexShrink: 0, pr: 0.5}}>{action}</Box>
        )}
      </Box>

      {/* 오류/도움말 슬롯 — 높이 예약으로 등장 시 레이아웃이 밀리지 않는다 */}
      {!hideHelperSlot && (
        <Box sx={{minHeight: '1.25rem', mt: 0.5}}>
          {hasError ? (
            <FormHelperText error id={errorId} sx={{m: 0}}>
              {error}
            </FormHelperText>
          ) : (
            helperText !== undefined && <FormHelperText sx={{m: 0}}>{helperText}</FormHelperText>
          )}
        </Box>
      )}
    </Box>
  )
}
