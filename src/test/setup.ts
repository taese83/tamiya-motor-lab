import '@testing-library/jest-dom/vitest'
// jsdom에는 IndexedDB가 없다 — fake-indexeddb가 indexedDB/IDBKeyRange 전역을 제공한다.
// MSW lifecycle 없음 (AD-10: HTTP 경계 자체가 없어 handler 0건 — 미도입 확정).
import 'fake-indexeddb/auto'

import {IDBFactory} from 'fake-indexeddb'
import {beforeEach} from 'vitest'

// 테스트 간 IndexedDB 완전 격리 — 각 테스트는 빈 factory에서 시작한다.
// seed 주입은 shared/testing/seeds (motors.seed / records.seed)를 사용한다.
beforeEach(() => {
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    writable: true,
    value: new IDBFactory(),
  })
})
