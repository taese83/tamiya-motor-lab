import svgr from 'vite-plugin-svgr'
import {configDefaults, defineConfig} from 'vitest/config'

// 테스트 전략 (tech-stack.md AD-9 / §테스트 전략):
// - MSW 미도입 확정 (AD-10) — HTTP 경계가 없으므로 mock server lifecycle이 존재하지 않는다.
// - projects 분리: 분석 엔진(shared/lib/audio-analysis)은 node env(jsdom 불요·고속, 합성
//   fixture 수치 assert), 나머지 unit은 jsdom + fake-indexeddb setup.
export default defineConfig({
  plugins: [svgr()],
  resolve: {tsconfigPaths: true},
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/entities/**', 'src/features/**', 'src/shared/**'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/__fixtures__/**',
        'src/shared/testing/**',
        'src/test/**',
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'engine',
          environment: 'node',
          // zero-dependency 순수 엔진 (AD-12) — DOM·IndexedDB setup 불요
          include: ['src/shared/lib/audio-analysis/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, 'e2e/**', 'src/shared/lib/audio-analysis/**'],
        },
      },
    ],
  },
})
