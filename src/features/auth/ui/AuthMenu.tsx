import {Avatar, Box, Button, Typography} from '@mui/material'
import {useQueryClient} from '@tanstack/react-query'

import {useSession} from '../model/useSession'

// 로그인/로그아웃 메뉴 (v2.39 Phase A). 미로그인 = [구글 로그인](서버리스 /api/auth/google/start로
// 이동). 로그인 = 아바타·이름 + [로그아웃](POST /api/auth/logout → 세션 무효화 + 새로고침).
// 로컬 정적 서버에서는 세션이 항상 null이라 [구글 로그인]만 보이며 클릭은 배포본에서만 동작한다.

export function AuthMenu() {
  const {user, isPending} = useSession()
  const queryClient = useQueryClient()

  if (isPending) return null // 세션 확인 중 — 깜빡임 방지(짧음)

  if (user === null) {
    return (
      <Button variant="outlined" href="/api/auth/google/start" sx={{minHeight: 44}}>
        구글 로그인
      </Button>
    )
  }

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {method: 'POST', credentials: 'same-origin'})
    } catch {
      // 실패해도 로컬 세션 캐시는 비운다(사용자 의도 우선) — 아래 invalidate + reload
    }
    await queryClient.invalidateQueries({queryKey: ['auth', 'session']})
    window.location.reload()
  }

  return (
    <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minWidth: 0}}>
      {user.picture !== undefined && (
        <Avatar src={user.picture} alt="" sx={{width: 28, height: 28}} />
      )}
      <Typography variant="body2" noWrap sx={{maxWidth: 110, minWidth: 0}}>
        {user.name}
      </Typography>
      <Button variant="text" size="small" onClick={() => void logout()} sx={{minHeight: 44}}>
        로그아웃
      </Button>
    </Box>
  )
}
