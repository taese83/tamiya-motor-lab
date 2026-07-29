import {Box, FormHelperText, Typography} from '@mui/material'
import {layoutTokens} from '@shared/config/design-tokens'

import type {ReactNode} from 'react'

// FormField (v2.11) — 폼 필드 공통 면. 레퍼런스(Mobbin input 패턴) 구조 채택:
// ① 라벨을 테두리에 파넣어(notch) 필드 위 별도 줄을 없앤다 ② 값·컨트롤은 면 안에 들어간다
// ③ 우측 인라인 액션(레퍼런스의 EDIT 위치)을 면 안에 둔다.
//
// 표면 언어는 기존 것을 유지한다 — 직각(라운드 없음)·헤어라인 테두리·라임 포커스 링.
// 레퍼런스의 라운드/pill은 가져오지 않는다(사용자 결정: 구조만 채택).
//
// notch 구현: 라벨을 테두리 위에 절대 배치하고 배경색으로 테두리를 끊는다.
// 따라서 이 컴포넌트는 **background.paper 표면 위에서만** 정상 렌더된다(시트·카드 내부).
// 다른 배경 위에 놓으면 라벨 뒤 색이 어긋난다 — 그때는 surfaceColor로 맞춘다.

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
  /** notch 라벨 뒤에 깔 배경 — 기본은 시트/카드 표면 */
  surfaceColor?: string | undefined
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
  surfaceColor = 'background.paper',
  children,
}: FormFieldProps) {
  const hasError = error !== null && error !== ''
  return (
    <Box>
      <Box
        sx={{
          position: 'relative',
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
        <Typography
          {...(labelFor !== undefined
            ? {component: 'label' as const, htmlFor: labelFor}
            : {component: 'span' as const, 'aria-hidden': true})}
          variant="overline"
          sx={{
            position: 'absolute',
            top: 0,
            left: 10,
            transform: 'translateY(-50%)',
            // 내부 컨트롤이 면을 꽉 채우므로(세그먼트 등) 라벨이 그 위로 올라와야 한다.
            // 없으면 선택된 세그먼트 색에 라벨이 묻힌다(실측 확인).
            zIndex: 1,
            px: 0.5,
            // 테두리를 끊는 핵심 — 라벨 뒤에 표면색을 깐다
            bgcolor: surfaceColor,
            color: hasError ? 'error.main' : 'text.secondary',
            lineHeight: 1,
            pointerEvents: 'none',
            maxWidth: 'calc(100% - 20px)',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}>
          {label}
        </Typography>

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
