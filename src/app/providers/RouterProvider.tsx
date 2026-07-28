import {RouterProvider} from 'react-router/dom'

import {router} from '@app/routes'

// DOM RouterProvider는 반드시 react-router/dom에서 import한다 — 나머지 라우터 API는 전부
// 'react-router'에서 (layout-spec §0/§2.3, react-router 8.2.0 data router).
export function AppRouterProvider() {
  return <RouterProvider router={router} />
}
