import {Avatar, Box, Divider, IconButton, Menu, MenuItem, Typography} from '@mui/material'
import {useState} from 'react'

import {useQueryClient} from '@tanstack/react-query'

import {useSession} from '../model/useSession'

import type {MouseEvent} from 'react'

// 로그인/로그아웃 메뉴 (v2.40 — 아바타 중심 UX).
// - 비로그인: 기본 아바타(빈 사람 실루엣) → 클릭 시 메뉴 [구글 로그인].
// - 로그인: 설정된 아바타(user.picture) → 클릭 시 메뉴 [기본 정보(이름·이메일) + 로그아웃].
// 세션은 서버리스(/api/auth/session)에서만 실동작 — 로컬 정적 서버는 null(미로그인)로 수렴.

export function AuthMenu() {
  const {user} = useSession()
  const queryClient = useQueryClient()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = anchorEl !== null
  const close = (): void => setAnchorEl(null)

  const logout = async (): Promise<void> => {
    close()
    try {
      await fetch('/api/auth/logout', {method: 'POST', credentials: 'same-origin'})
    } catch {
      // 실패해도 로컬 세션 캐시는 비우고 새로고침(사용자 의도 우선)
    }
    await queryClient.invalidateQueries({queryKey: ['auth', 'session']})
    window.location.reload()
  }

  return (
    <>
      <IconButton
        onClick={(e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
        aria-label={user !== null ? `${user.name} 계정 메뉴` : '로그인'}
        aria-haspopup="menu"
        aria-expanded={open}
        sx={{p: 0.5}}>
        {/* src 없으면 MUI Avatar가 기본 사람 실루엣을 렌더 — 비로그인/사진없음 공통 */}
        <Avatar {...(user?.picture ? {src: user.picture} : {})} alt="" sx={{width: 32, height: 32}} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
        transformOrigin={{vertical: 'top', horizontal: 'left'}}>
        {user !== null
          ? [
              <Box key="info" sx={{px: 2, py: 1, maxWidth: 260}}>
                <Typography variant="body2" noWrap sx={{fontWeight: 700}}>
                  {user.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{display: 'block'}}>
                  {user.email}
                </Typography>
              </Box>,
              <Divider key="divider" />,
              <MenuItem key="logout" onClick={() => void logout()}>
                로그아웃
              </MenuItem>,
            ]
          : (
              <MenuItem
                onClick={() => {
                  close()
                  window.location.href = '/api/auth/google/start'
                }}>
                구글 로그인
              </MenuItem>
            )}
      </Menu>
    </>
  )
}
