import {describe, expect, it} from 'vitest'

import {nextAutoMotorName} from './auto-name'

// 자동 이름 부여 규칙 unit (v2.18). 이름은 사용자가 매일 읽는 라벨이고 한 번 붙으면
// 수동으로 고치기 전까지 남으므로, 번호 규칙을 여기서 고정한다.

describe('nextAutoMotorName', () => {
  it('같은 종류가 없으면 1번을 붙인다', () => {
    expect(nextAutoMotorName('torque', [])).toBe('토크튠 1')
  })

  it('종류 라벨은 한글 표시명을 쓴다 — 내부 enum 값이 노출되면 안 된다', () => {
    expect(nextAutoMotorName('hyper_dash', [])).toBe('하이퍼대시 1')
    expect(nextAutoMotorName('m130', [])).toBe('130 1')
  })

  it('이미 있으면 번호를 올린다', () => {
    expect(nextAutoMotorName('torque', ['토크튠 1'])).toBe('토크튠 2')
    expect(nextAutoMotorName('torque', ['토크튠 1', '토크튠 2'])).toBe('토크튠 3')
  })

  it('삭제로 생긴 빈 번호를 재사용한다 — 번호가 단조 증가하지 않는다', () => {
    // '토크튠 2'만 남은 상태(1을 지웠다) → 다시 1번
    expect(nextAutoMotorName('torque', ['토크튠 2', '토크튠 3'])).toBe('토크튠 1')
  })

  it('다른 종류의 이름은 번호에 영향을 주지 않는다', () => {
    expect(nextAutoMotorName('torque', ['하이퍼대시 1', '렙튠 1'])).toBe('토크튠 1')
  })

  it('수동으로 붙인 같은 문자열과도 충돌하지 않는다', () => {
    // 사용자가 다른 종류 모터에 '토크튠 1'을 손으로 붙여둔 경우 — 전역 이름 목록을 본다
    expect(nextAutoMotorName('torque', ['토크튠 1'])).toBe('토크튠 2')
  })

  it('앞뒤 공백이 있는 저장 이름도 같은 이름으로 취급한다', () => {
    expect(nextAutoMotorName('torque', ['  토크튠 1  '])).toBe('토크튠 2')
  })

  it('무관한 이름은 번호를 밀지 않는다', () => {
    // '토크튠'(번호 없음)·'토크튠 10'은 1번을 막지 않는다
    expect(nextAutoMotorName('torque', ['토크튠', '토크튠 10', '내 모터'])).toBe('토크튠 1')
  })

  it('이름 길이 상한(30자)을 넘기지 않는다 — 가장 긴 라벨 + 최대 번호대', () => {
    const many = Array.from({length: 40}, (_, index) => `스프린트대시 ${index + 1}`)
    expect(nextAutoMotorName('sprint_dash', many)).toBe('스프린트대시 41')
    expect(nextAutoMotorName('sprint_dash', many).length).toBeLessThanOrEqual(30)
  })
})
