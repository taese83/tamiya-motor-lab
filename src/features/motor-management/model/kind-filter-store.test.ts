import {beforeEach, describe, expect, it} from 'vitest'

import {normalizeKinds, useKindFilterStore} from './kind-filter-store'

// 종류 필터 공유·영속 store unit (v2.17).
// localStorage는 외부 입력이다 — 사용자 편집·구버전 잔존·다른 탭이 값을 바꿀 수 있고,
// 잘못된 값 하나가 "모터가 없다"로 보이는 빈 목록을 만들 수 있어 정규화가 계약이다.

describe('normalizeKinds — 영속 값 정규화', () => {
  it('미지 종류는 조용히 버린다', () => {
    expect(normalizeKinds(['torque', 'not_a_motor', 'rev'])).toEqual(['torque', 'rev'])
  })

  it('중복을 제거한다', () => {
    expect(normalizeKinds(['rev', 'rev', 'rev'])).toEqual(['rev'])
  })

  it('나열 순서와 무관하게 MOTOR_KINDS 순서로 정규화한다', () => {
    // 저장 순서가 표시 순서로 새지 않아야 한다(칩 순서가 세션마다 흔들리는 것 방지)
    expect(normalizeKinds(['mach_dash', 'm130', 'rev'])).toEqual(['m130', 'rev', 'mach_dash'])
  })

  it('배열이 아닌 값·null·손상된 JSON 결과는 빈 선택으로 떨어진다', () => {
    expect(normalizeKinds(null)).toEqual([])
    expect(normalizeKinds(undefined)).toEqual([])
    expect(normalizeKinds('torque')).toEqual([])
    expect(normalizeKinds({kind: 'torque'})).toEqual([])
    expect(normalizeKinds([1, 2, 3])).toEqual([])
  })
})

describe('useKindFilterStore — 공유 선택 상태', () => {
  beforeEach(() => {
    useKindFilterStore.setState({selected: []})
  })

  it('toggle이 선택을 켜고 끈다', () => {
    const {toggle} = useKindFilterStore.getState()

    toggle('rev')
    expect(useKindFilterStore.getState().selected).toEqual(['rev'])

    toggle('rev')
    expect(useKindFilterStore.getState().selected).toEqual([])
  })

  it('추가 선택도 MOTOR_KINDS 순서로 유지된다 — 고른 순서가 표시에 새지 않는다', () => {
    const {toggle} = useKindFilterStore.getState()

    toggle('mach_dash')
    toggle('m130')

    expect(useKindFilterStore.getState().selected).toEqual(['m130', 'mach_dash'])
  })

  it('clear가 전체 선택을 비운다', () => {
    const {toggle, clear} = useKindFilterStore.getState()
    toggle('rev')
    toggle('torque')

    clear()

    expect(useKindFilterStore.getState().selected).toEqual([])
  })

  it('모듈 store라 두 화면이 같은 선택을 본다 — 한쪽 변경이 다른 쪽에 반영된다', () => {
    // 모터 화면이 고른 값을 레이스 화면이 그대로 읽는 구조를 store 레벨에서 고정한다.
    // (화면별 독립 상태였다면 이 단정이 깨진다)
    const motorsScreen = useKindFilterStore.getState()
    motorsScreen.toggle('hyper_dash')

    const raceScreen = useKindFilterStore.getState()
    expect(raceScreen.selected).toEqual(['hyper_dash'])
  })
})
