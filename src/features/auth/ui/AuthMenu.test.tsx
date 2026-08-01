import {fireEvent, render, screen} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'

import {createWrapper} from '@test/utils'

import {AuthMenu} from './AuthMenu'
import {useSession} from '../model/useSession'

// 계정 메뉴는 서버리스 세션(/api/auth/session) 로그인 게이트 뒤라 실화면은 DEPLOY_ONLY다.
// 여기서 컴포넌트 계약을 고정한다(R29): 로그인 시에만 '타미야 경기 일정' 외부 링크가 뜨고,
// 새 탭 + noopener/noreferrer로 외부 URL로 이동한다.
vi.mock('../model/useSession')
const mockUseSession = vi.mocked(useSession)

const TAMIYA_URL = 'https://tamiya-race-app-br4o.vercel.app/'

describe('AuthMenu — 타미야 경기 일정 외부 링크 (R29)', () => {
  it('비로그인이면 계정 메뉴가 없어 링크도 노출되지 않는다', () => {
    mockUseSession.mockReturnValue({user: null, isPending: false})
    render(<AuthMenu />, {wrapper: createWrapper()})
    expect(screen.queryByRole('menuitem', {name: '타미야 경기 일정'})).toBeNull()
  })

  it('로그인이면 계정 메뉴에 타미야 경기 일정 링크가 뜨고 외부 URL·새 탭·보안 rel을 갖는다', () => {
    mockUseSession.mockReturnValue({
      user: {id: 'u1', email: 'tester@example.com', name: '테스터'},
      isPending: false,
    })
    render(<AuthMenu />, {wrapper: createWrapper()})
    fireEvent.click(screen.getByRole('button', {name: /계정 메뉴/}))

    const link = screen.getByRole('menuitem', {name: '타미야 경기 일정'})
    expect(link).toHaveAttribute('href', TAMIYA_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    // 로그아웃 항목은 보존
    expect(screen.getByRole('menuitem', {name: '로그아웃'})).toBeInTheDocument()
  })
})
