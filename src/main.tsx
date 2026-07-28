import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'

import {App} from '@app/App'

// MSW bootstrap 없음 — 이 앱에는 HTTP 경계 자체가 없다 (AD-10 미도입 확정, api-schema.md 서두).
// RUM/Web Vitals 미연결 — tech-stack observability 요구 없음 (vendor·telemetry 코드 금지).

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('#root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
