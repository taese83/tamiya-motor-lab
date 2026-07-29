import {MOTOR_KIND_LABELS} from '@shared/config/domain'

import type {MotorKind} from '@shared/config/domain'

// 종류 기반 자동 이름 부여 (v2.18) — "모터 종류만 고르면 이름이 자동으로 붙는다".
//
// 규칙: `{종류 라벨} {n}` 에서 n은 **아직 쓰이지 않은 가장 작은 1 이상 정수**다.
// "이미 있다면 숫자를 한 개 올려서"의 직역이며, 삭제로 생긴 빈 번호를 재사용한다
// (예: '토크튠 1'·'토크튠 2' 중 1을 지우면 다음 자동 이름은 다시 '토크튠 1').
// max+1 방식을 쓰지 않는 이유: 추가·삭제를 반복하면 번호가 단조 증가해 '토크튠 37'처럼
// 실제 보유 수와 무관한 숫자가 남는다 — 사용자가 읽는 라벨이므로 작은 수를 유지한다.
//
// 비교는 **저장된 이름 전체**를 대상으로 한다(같은 종류만 보지 않는다): 사용자가 수동으로
// '토크튠 1'을 다른 종류 모터에 붙여둘 수 있고, 그 경우에도 이름이 겹치면 안 된다.
// 전역 이름 유일성 자체는 불변식이 아니다(수동 입력은 중복 허용) — 이 함수는 "자동 부여가
// 기존 이름과 부딪히지 않는다"만 보장한다.

/**
 * @param existingNames 저장된 전체 모터 이름. 호출자는 **같은 트랜잭션 안에서 읽은 값**을
 *   넘겨야 한다 — 탭 2개가 동시에 추가할 때 같은 번호가 두 번 부여되는 것을 막는 유일한 방법이다.
 */
export function nextAutoMotorName(kind: MotorKind, existingNames: ReadonlyArray<string>): string {
  const label = MOTOR_KIND_LABELS[kind]
  // 저장 시 trim된 값이지만 방어적으로 한 번 더 정규화한다(수동 입력 이력·구버전 행)
  const used = new Set(existingNames.map(name => name.trim()))
  let index = 1
  while (used.has(`${label} ${index}`)) index += 1
  return `${label} ${index}`
}

// 폼에 "부여될 이름"을 미리 보여주지 않는 이유: 실제 이름은 command가 tx 안에서 다시 계산한다.
// 다른 탭이 그 사이에 모터를 추가하면 미리보기와 결과가 달라져 **지키지 못할 약속**이 된다.
// 폼은 규칙만 알린다("비워두면 종류에 맞춰 자동으로 붙습니다").
