import {Box, Button, Typography} from '@mui/material'
import {Link} from 'react-router'

// 클라이언트 404 (layout-spec §2.5) — splat('*') route가 제자리 렌더하므로 URL은 보존된다
// (리다이렉트 없음). 탭 바는 유지되나 활성 탭 없음 — handle에 tab 미지정.
// '/motors/:id'의 미존재 id는 여기로 오지 않는다 — S4 화면 내 in-place not-found (layout-spec §2.2).
// TODO(data-ui-binder): shared/ui EmptyState가 준비되면 본문 블록을 EmptyState 조립로 교체 가능
// (component-spec §3.6 소비처에 클라이언트 404 포함) — 선택 사항, 현 구현도 계약 충족.
export function NotFoundPage() {
  return (
    <Box
      sx={{
        px: 2,
        py: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        textAlign: 'center',
      }}>
      <Typography variant="h1" component="h1">
        페이지를 찾을 수 없습니다
      </Typography>
      <Button component={Link} to="/" replace variant="contained" size="large" fullWidth sx={{maxWidth: 320}}>
        측정으로 이동
      </Button>
    </Box>
  )
}
