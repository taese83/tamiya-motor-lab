import {create} from 'zustand'
import {persist} from 'zustand/middleware'

import {MOTOR_KINDS} from '@shared/config/domain'

import type {MotorKind} from '@shared/config/domain'

// 종류 필터 선택 store (v2.17) — **화면 간 공유 + 영구 저장**.
//
// v2.4에서는 선택을 URL search param(`?kind=a,b`)에 뒀다. 두 요구가 그 설계를 무효화했다:
// ① 모터 탭과 레이스 탭이 **하나의 필터를 공유**해야 한다 — 라우트가 다르면 URL도 달라서
//    param으로는 공유가 성립하지 않는다.
// ② 앱 재시작 후에도 유지돼야 한다 — param은 세션과 함께 사라진다.
// 그래서 모듈 store(공유) + localStorage(영속)로 옮기고 URL param 경로는 제거했다.
// param을 병행하면 같은 상태의 출처가 둘이 되어 어느 쪽이 이기는지가 화면마다 갈린다.
//
// URL을 버려서 잃는 것: 필터 상태의 딥링크·공유. 이 앱은 로컬 단일 사용자용이고 공유할 URL
// 개념이 없어 손실이 없다. v2.4가 param을 고른 실제 이유("상세 왕복 후 필터 유지")는
// 영속 store가 더 확실하게 충족한다 — 뒤로가기 이력에 의존하지 않는다.
//
// 필터는 view 상태이지 도메인 상태가 아니다 — IndexedDB(도메인 저장소)가 아니라
// localStorage에 둔다. 정렬(sortOrder)에는 영향을 주지 않는다.

/** localStorage 키 — 값 형태가 바뀌면 키를 bump해 구버전 값을 무효화한다(theme 'mml-mode-2'와 동일 관례) */
const STORAGE_KEY = 'mml-kind-filter-1'

const isMotorKind = (value: unknown): value is MotorKind =>
  typeof value === 'string' && (MOTOR_KINDS as ReadonlyArray<string>).includes(value)

/**
 * 영속 값 정규화 — localStorage는 **외부 입력**이다(사용자 편집·구버전 잔존·다른 탭).
 * 미지 종류는 조용히 버리고, 중복을 제거하고, 표시 순서를 MOTOR_KINDS 순서로 고정한다.
 * 검증 없이 신뢰하면 잘못된 값 하나로 목록이 빈 화면이 된다(빈 상태 위장 금지 — D-10 정신).
 */
export const normalizeKinds = (value: unknown): ReadonlyArray<MotorKind> => {
  if (!Array.isArray(value)) return []
  const requested = new Set(value.filter(isMotorKind))
  return MOTOR_KINDS.filter(kind => requested.has(kind))
}

interface KindFilterState {
  /** 선택된 종류 — 빈 배열이면 전체(필터 없음). 항상 MOTOR_KINDS 순서 */
  selected: ReadonlyArray<MotorKind>
  toggle: (kind: MotorKind) => void
  clear: () => void
}

export const useKindFilterStore = create<KindFilterState>()(
  persist(
    set => ({
      selected: [],
      toggle: kind =>
        set(state => ({
          selected: state.selected.includes(kind)
            ? state.selected.filter(item => item !== kind)
            : // 추가는 MOTOR_KINDS 순서로 다시 깔아 선택 순서가 표시에 새지 않게 한다
              MOTOR_KINDS.filter(item => item === kind || state.selected.includes(item)),
        })),
      clear: () => set({selected: []}),
    }),
    {
      name: STORAGE_KEY,
      // 저장 대상은 선택값만 — 액션은 직렬화하지 않는다
      partialize: state => ({selected: state.selected}),
      // rehydrate 경계에서 정규화한다(INV-16과 같은 원칙: 외부 입력은 읽는 자리에서 검증)
      merge: (persisted, current) => ({
        ...current,
        selected: normalizeKinds((persisted as {selected?: unknown} | null)?.selected),
      }),
    },
  ),
)
