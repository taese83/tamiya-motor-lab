import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'

import {MeasureFigures} from './MeasureFigures'
import {PermissionHelpDialog} from './PermissionHelpDialog'

import type {MeasureView} from './measure-view'

// v2.20 — 권한 안내를 인라인 Collapse에서 Dialog로 옮긴 것에 대한 회귀 고정.
// 브라우저 QA로는 이 상태에 도달할 수 없다: no-permission(영구)은 getUserMedia 거부가
// 2회 이상 누적돼야 하고, preview 환경에는 마이크 장치가 없어 세션이 starting에서 멈춘다.

const PERMANENT_DENIED: MeasureView = {
  status: 'no-permission',
  permanent: true,
  settingsHelpOpen: true,
}

describe('PermissionHelpDialog', () => {
  it('modal dialog로 열리고 제목이 접근 이름이 된다', () => {
    render(<PermissionHelpDialog open onClose={() => undefined} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('마이크 권한 허용 방법')
  })

  it('닫혀 있으면 DOM에 없다 — 화면 뒤에 남아 게이지를 가리지 않는다', () => {
    render(<PermissionHelpDialog open={false} onClose={() => undefined} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('플랫폼별 안내와 새로고침 안내를 모두 담는다', () => {
    render(<PermissionHelpDialog open onClose={() => undefined} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(screen.getByText(/변경 후 이 페이지를 새로고침/)).toBeInTheDocument()
  })

  it('[닫기]로 닫힌다', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<PermissionHelpDialog open onClose={onClose} />)

    await user.click(screen.getByRole('button', {name: '닫기'}))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('MeasureFigures — 히어로 존은 안내를 품지 않는다 (v2.20)', () => {
  it('영구 권한 거부 + 안내 열림 상태에서도 안내 목록을 인라인으로 렌더하지 않는다', () => {
    // 사용자 지적("설정 방법 보기가 게이지를 가린다")의 회귀 방지.
    // 이 존은 게이지를 장식 배경층으로 깔고 전경에 수치를 얹는 구조라, 여기에 5줄 안내가
    // 펼쳐지면 눈금·라벨과 겹친다. 안내의 소유는 페이지 레벨 Dialog다.
    render(<MeasureFigures view={PERMANENT_DENIED} />)

    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.queryByText(/변경 후 이 페이지를 새로고침/)).toBeNull()
  })

  it('안내가 빠져도 존은 게이지와 상태 문구를 유지한다', () => {
    const {container} = render(<MeasureFigures view={PERMANENT_DENIED} />)

    // 게이지(장식 SVG)는 그대로 — viewBox 고정으로 layout shift 0 계약 유지
    expect(container.querySelector('svg[viewBox="0 0 200 120"]')).not.toBeNull()
    expect(screen.getByText('브라우저 설정에서 마이크 권한을 허용해야 합니다')).toBeInTheDocument()
  })
})
