import type {IconProps} from '@shared/ui/icons'

// feature-private 아이콘 2종 (drag-handle ≡ · chevron-down ▾) — component-spec v2 §1.5는
// shared/ui/icons additive 3종(drag-handle·chevron-down·plus)을 canonical로 지정하지만,
// shared/ui/icons slice는 본 작업 소유 범위 밖이라 임시로 여기 배치한다(owner handoff 보고 대상).
// shared에 추가되면 이 파일을 삭제하고 import만 교체한다. barrel 비공개(슬라이스 내부 전용).
// 규격은 shared/ui/icons와 동일: 24×24 viewBox · fill="currentColor" · aria-hidden —
// 의미 전달은 항상 병행 텍스트/aria-label이 담당한다.

/** DnD 핸들 ≡ — MotorRow 핸들 버튼 전용(버튼 aria-label이 의미 소유) */
export function DragHandleIcon({size = 24}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor">
      <path d="M3 8h18V6H3v2zm0 5h18v-2H3v2zm0 5h18v-2H3v2z" />
    </svg>
  )
}

/** 확장 캐럿 ▾ — expanded 시 회전은 소비 측(transform) 소관 */
export function ChevronDownIcon({size = 24}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor">
      <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
    </svg>
  )
}
