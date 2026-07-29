import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'

import {MIN_MEASURE_DURATION_MS} from '@shared/config/domain'

import {MeasureActionDock, deriveMeasureAction} from './MeasureActionDock'

import type {MeasureView} from './measure-view'

// Z3 액션 순수 산출·렌더 unit (§2.7 "unit 대상" 계약).
// 브라우저 QA는 마이크 없이 measuring에 도달하지 못해 record 경로를 활성 상태로 확인할 수
// 없다(preview는 starting/no-permission으로 귀결) — 그 구간을 여기서 고정한다.

// v2.18: measuredMs가 하한(MIN_MEASURE_DURATION_MS)을 넘긴 상태 = 기존 '기록 가능' 픽스처의 의미
const MEASURING: MeasureView = {
  status: 'measuring',
  panoHz: 512,
  rpm: 30720,
  isStable: true,
  measuredMs: MIN_MEASURE_DURATION_MS,
}
/** 하한 미달 — 측정은 되고 있지만 아직 기록 불가 */
const MEASURING_TOO_SHORT: MeasureView = {...MEASURING, measuredMs: 2_000}
const WEAK: MeasureView = {status: 'weak-signal'}

const noopHandlers = {
  onRecord: () => undefined,
  onActivate: () => undefined,
  onRetryPermission: () => undefined,
  onToggleSettingsHelp: () => undefined,
  onResume: () => undefined,
  onBackToOrigin: () => undefined,
}

describe('deriveMeasureAction', () => {
  it('최소 측정시간 미달이면 [기록]이 비활성이고 남은 시간이 실린다 — 무음 비활성 금지', () => {
    // 엔진 stable(1.5s CV)만으로는 모터 회전이 안정됐다고 볼 수 없다는 게 이 게이트의 이유다.
    expect(deriveMeasureAction(MEASURING_TOO_SHORT, null, true)).toEqual({
      kind: 'record',
      disabled: true,
      waitRemainingMs: MIN_MEASURE_DURATION_MS - 2_000,
    })
  })

  it('하한을 정확히 채우면 활성 — 경계는 포함이다', () => {
    expect(deriveMeasureAction(MEASURING, null, true)).toEqual({kind: 'record', disabled: false})
  })

  it('하한을 넘겨도 활성이고 남은 시간은 실리지 않는다', () => {
    const long: MeasureView = {...MEASURING, measuredMs: MIN_MEASURE_DURATION_MS + 10_000}
    expect(deriveMeasureAction(long, null, true)).toEqual({kind: 'record', disabled: false})
  })

  it('persistence 불가가 하한보다 우선한다 — 시간이 지나도 풀리지 않는 사유', () => {
    // 두 사유를 합치면 '기다리면 된다'는 잘못된 기대를 준다(persistence는 전역 배너 소관)
    expect(deriveMeasureAction(MEASURING_TOO_SHORT, null, false)).toEqual({
      kind: 'record',
      disabled: true,
    })
  })

  it('measuring + persistence ready면 [기록] 활성', () => {
    expect(deriveMeasureAction(MEASURING, null, true)).toEqual({kind: 'record', disabled: false})
  })

  it('persistence가 준비되지 않으면 [기록] 비활성 — 사유는 전역 배너 소관', () => {
    expect(deriveMeasureAction(MEASURING, null, false)).toEqual({kind: 'record', disabled: true})
  })

  it('신호가 약하면 [기록] 비활성 (measuring 아님)', () => {
    expect(deriveMeasureAction(WEAK, null, true)).toEqual({kind: 'record', disabled: true})
  })

  it('awaiting-gesture는 [탭하여 시작]으로 치환된다', () => {
    expect(deriveMeasureAction({status: 'awaiting-gesture'}, null, true)).toEqual({
      kind: 'activate',
    })
  })

  it('왕복 모드는 measuring이어도 복귀 액션으로 치환된다 — 왕복 중 기록 진입점 0개(INV-21)', () => {
    expect(deriveMeasureAction(MEASURING, {motorName: '테스트', origin: 'motor'}, true)).toEqual({
      kind: 'back-to-origin',
      motorName: '테스트',
      origin: 'motor',
    })
  })
})

describe('MeasureActionDock', () => {
  it('[기록] 단일 버튼을 렌더한다', () => {
    render(<MeasureActionDock {...noopHandlers} action={{kind: 'record', disabled: false}} />)
    expect(screen.getByRole('button', {name: '기록'})).toBeInTheDocument()
  })

  it('[기록] 탭을 상위로 전달한다', async () => {
    const onRecord = vi.fn()
    const user = userEvent.setup()
    render(
      <MeasureActionDock
        {...noopHandlers}
        onRecord={onRecord}
        action={{kind: 'record', disabled: false}}
      />,
    )

    await user.click(screen.getByRole('button', {name: '기록'}))
    expect(onRecord).toHaveBeenCalledOnce()
  })

  it('비활성 [기록]은 상시 렌더되지만 탭이 전달되지 않는다 (자리 이동 없음 — M-5)', async () => {
    const onRecord = vi.fn()
    const user = userEvent.setup()
    render(
      <MeasureActionDock
        {...noopHandlers}
        onRecord={onRecord}
        action={{kind: 'record', disabled: true}}
      />,
    )

    const button = screen.getByRole('button', {name: '기록'})
    expect(button).toBeInTheDocument() // 사라지지 않는다
    expect(button).toHaveAttribute('aria-disabled', 'true')
    await user.click(button)
    expect(onRecord).not.toHaveBeenCalled()
  })

  it('복귀 라벨은 origin별로 갈린다 (v2.5)', () => {
    const {unmount} = render(
      <MeasureActionDock
        {...noopHandlers}
        action={{kind: 'back-to-origin', motorName: '테스트', origin: 'motor'}}
      />,
    )
    expect(screen.getByRole('button', {name: '모터로 돌아가기'})).toBeInTheDocument()
    unmount()

    render(
      <MeasureActionDock
        {...noopHandlers}
        action={{kind: 'back-to-origin', motorName: '테스트', origin: 'race'}}
      />,
    )
    expect(screen.getByRole('button', {name: '레이스로 돌아가기'})).toBeInTheDocument()
  })
})
