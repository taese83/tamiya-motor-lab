import {describe, expect, it} from 'vitest'

import {appVersion, formatVersionLabel} from './version'

describe('version', () => {
  it('vitest 환경(define 미주입)에서는 폴백으로 안전하다', () => {
    // 이 테스트 자체가 폴백 경로의 실증이다 — define 없는 환경에서 import가 throw하지 않는다
    expect(appVersion.version).toBe('0.0.0-dev')
    expect(appVersion.sha).toBe('dev')
    expect(appVersion.builtAt).toBeNull()
  })

  it('빌드 시각이 있으면 "v{ver} ({sha} · MM-DD)" 형식이다', () => {
    expect(formatVersionLabel({version: '0.2.0', sha: '645e417', builtAt: '2026-08-05T02:00:00.000Z'})).toBe(
      'v0.2.0 (645e417 · 08-05)',
    )
  })

  it('빌드 시각이 없으면 날짜 없이 "v{ver} ({sha})" 형식이다', () => {
    expect(formatVersionLabel({version: '0.0.0-dev', sha: 'dev', builtAt: null})).toBe('v0.0.0-dev (dev)')
  })
})
