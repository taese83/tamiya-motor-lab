import {Tab, Tabs} from '@mui/material'

import {MOTOR_KIND_LABELS} from '@shared/config/domain'

import type {MotorKindFilterOption} from '../model'
import type {MotorKind} from '@shared/config/domain'

// MotorKindFilter (v2.4 칩 다중선택 → v2.x **단일 선택 탭**, 사용자 확정). 순수 presentational·
// 완전 제어형: 선택 상태의 소유와 영속은 상위(useMotorKindFilter)의 공유 store 소관이다.
// 모터·레이스 두 화면이 같은 컴포넌트·같은 상태를 재사용한다(v2.17 계약 유지).
//
// 형태: 가로 스크롤 탭 행 [전체][종류 n]… — 하나만 활성. MUI Tabs scrollable로 종류가 많아도
// 좌우 스와이프로 접근 가능(칩 행과 같은 x축 스크롤 관례). 탭 최소 높이 44px(터치 타깃).
// 선택 표시는 색 + indicator(밑줄)로 이중화 — 색 단독 구분 금지(DS 계약).

/** [전체] 탭의 Tabs value — MotorKind와 충돌하지 않는 예약값 */
const ALL_VALUE = '__all__'

export interface MotorKindFilterProps {
  /** 목록에 존재하는 종류 + 건수 + 선택 여부 (MOTOR_KINDS 순서) */
  options: ReadonlyArray<MotorKindFilterOption>
  /** 선택된 종류 — null이면 [전체] 활성 */
  selectedKind: MotorKind | null
  /** 종류 탭 선택 — 단일 교체 */
  onSelect: (kind: MotorKind) => void
  /** [전체] 탭 — 선택 비움 */
  onClear: () => void
}

export function MotorKindFilter({options, selectedKind, onSelect, onClear}: MotorKindFilterProps) {
  return (
    <Tabs
      value={selectedKind ?? ALL_VALUE}
      onChange={(_event, value: string) => {
        if (value === ALL_VALUE) onClear()
        else onSelect(value as MotorKind)
      }}
      variant="scrollable"
      scrollButtons={false}
      aria-label="모터 종류 필터"
      sx={{
        minHeight: 44,
        // 탭 행을 콘텐츠와 시각적으로 분리 — indicator가 얹힐 기준선
        borderBottom: 1,
        borderColor: 'divider',
        '& .MuiTab-root': {
          minHeight: 44,
          minWidth: 'auto',
          px: 1.5,
          textTransform: 'none',
          fontVariantNumeric: 'tabular-nums lining-nums',
        },
      }}>
      <Tab value={ALL_VALUE} label="전체" />
      {options.map(option => (
        <Tab
          key={option.kind}
          value={option.kind}
          label={`${MOTOR_KIND_LABELS[option.kind]} ${option.count}`}
        />
      ))}
    </Tabs>
  )
}
