import {Alert, Snackbar} from '@mui/material'
import {createContext, useContext, useMemo, useState} from 'react'
import type {ReactNode} from 'react'

export interface ToastApi {
  /** 성공 확인 전용("저장됨"·"초기화되었습니다") — 오류 Toast 금지(인라인 Alert+재시도가 계약) */
  showSuccess: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

/** ToastHost 하위에서만 사용 — app providers에 1개 mount (component-spec §3.9) */
export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (api === null) {
    throw new Error('useToast는 ToastHost 하위에서만 사용할 수 있다')
  }
  return api
}

const AUTO_HIDE_MS = 3000

interface ToastState {
  key: number
  message: string
}

/**
 * 성공 토스트 호스트 — Snackbar top-center(헤더 아래 offset은 theme 오버라이드), autoHide 3s.
 * 연속 호출은 교체(큐 없음) — key 교체로 타이머 재시작.
 * v2.x(사용자): **토스트 자체를 탭하면 즉시 닫힌다** — 이전에는 Alert에 핸들러가 없어
 * 바깥 탭(clickaway)·3초 자동 닫힘만 동작했고 토스트 탭은 무반응이었다.
 */
export function ToastHost({children}: {children?: ReactNode}) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const [open, setOpen] = useState(false)
  const api = useMemo<ToastApi>(
    () => ({
      showSuccess: message => {
        setToast({key: Date.now(), message})
        setOpen(true)
      },
    }),
    [],
  )
  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast !== null && (
        <Snackbar
          key={toast.key}
          open={open}
          autoHideDuration={AUTO_HIDE_MS}
          onClose={() => setOpen(false)}>
          <Alert
            severity="success"
            role="status"
            variant="standard"
            onClick={() => setOpen(false)}
            sx={{cursor: 'pointer'}}>
            {toast.message}
          </Alert>
        </Snackbar>
      )}
    </ToastContext.Provider>
  )
}
