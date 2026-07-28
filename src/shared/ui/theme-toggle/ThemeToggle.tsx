import {IconButton} from '@mui/material'
import {useColorScheme} from '@mui/material/styles'
import {MoonIcon, SunIcon} from '@shared/ui/icons'

/**
 * 다크↔라이트 2택 테마 토글 (design-system v2 §7.3·§9) — 'system' 미제공(DS-A7).
 * 선택 영속은 ThemeProvider의 modeStorageKey("mml-mode")가 담당 — 여기서는 setMode만 호출.
 * 아이콘은 현재 모드 표기(moon=다크·sun=라이트), aria-label은 전환 결과(반대 모드) 표기.
 * 배치(S1 우상단 고정 / PageHeader action 슬롯)는 호출부 소유 — 44×44 타깃은 자체 보장.
 */
export function ThemeToggle() {
  const {mode, setMode} = useColorScheme()
  // mode 미확정 초기 프레임은 렌더 스킵 — ThemeProvider noSsr로 최소화(§7.3)
  if (mode === undefined) {
    return null
  }
  const isDark = mode !== 'light'
  return (
    <IconButton
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      onClick={() => {
        setMode(isDark ? 'light' : 'dark')
      }}
      sx={{width: 44, height: 44}}>
      {isDark ? <MoonIcon /> : <SunIcon />}
    </IconButton>
  )
}
