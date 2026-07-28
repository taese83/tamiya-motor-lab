import {defineConfig, devices} from '@playwright/test'

// browser evidence 계약 (tech-stack.md §테스트 전략, requirements Evidence):
// - baseURL http://127.0.0.1:4173 은 secure context로 취급 → HTTPS 배포 전에도
//   getUserMedia 캡처 flow E2E 가능 (D-1/D-2/D-4).
// - fake media stream: 권한 허용/거부 시나리오는 테스트에서
//   context.grantPermissions(['microphone']) / clearPermissions()로 제어한다.
// - webServer는 build 후 loopback preview 사용 — dev server를 release QA에 쓰지 않는다.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', {open: 'never'}], ['github']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    deviceScaleFactor: 1,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // 3개 project 전부 chromium 기반 — 마이크 fixture를 공통 적용 (D-1/D-2 재현)
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
  },
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome']}},
    // REQ-NFR-002: 모바일 세로 기준 + 320px reflow
    {name: 'mobile-chrome', use: {...devices['Pixel 7']}},
    {name: 'reflow-320', use: {browserName: 'chromium', viewport: {width: 320, height: 800}}},
  ],
  webServer: {
    // build = tsc -b && vite build --mode production / preview = 127.0.0.1:4173 strictPort
    command: 'pnpm build && pnpm preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
