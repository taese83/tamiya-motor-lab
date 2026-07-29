import {useCallback, useState} from 'react'

// 목록에서 "한 번에 한 행만 열림"을 소유하는 훅 (v2.16).
//
// 각 행이 자기 열림 상태를 들고 있으면 두 행이 동시에 열려 "지금 액션 대상이 어느 행인지"가
// 모호해진다. 파괴 액션이 걸린 트레이에서 그 모호함은 그대로 오삭제 위험이다.
//
// 닫기는 **자기 행일 때만** 반영한다: 행 A의 blur-close가 방금 열린 행 B를 닫아버리는
// 순서 경합(포커스가 A→B로 이동하면 B의 open과 A의 close가 같은 tick에 온다)을 막는다.
export interface SingleOpenRow {
  openId: string | null
  /** 행이 자기 열림 상태 변경을 요청한다 */
  setOpen: (id: string, open: boolean) => void
  /** 전체 닫기 — 목록 데이터가 바뀌거나 시트가 열릴 때 */
  closeAll: () => void
}

export function useSingleOpenRow(): SingleOpenRow {
  const [openId, setOpenId] = useState<string | null>(null)

  const setOpen = useCallback((id: string, open: boolean) => {
    setOpenId(prev => (open ? id : prev === id ? null : prev))
  }, [])

  const closeAll = useCallback(() => setOpenId(null), [])

  return {openId, setOpen, closeAll}
}
