import {execSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'
import svgr from 'vite-plugin-svgr'

// R52 배포 버전 식별 — 빌드 타임 주입의 원천. Vercel 빌드는 VERCEL_GIT_COMMIT_SHA가
// 정본이고(git 유무와 무관), 로컬 빌드는 git에서, 둘 다 없으면 'local'.
// git cwd는 이 config 파일 위치로 고정한다 — dev server가 상위 디렉토리(하니스 루트 등)에서
// 기동되면 process.cwd() 기준 git이 다른 저장소의 HEAD를 읽는다 (프리뷰 실측 사고).
const projectDirectory = fileURLToPath(new URL('.', import.meta.url))
const packageVersion = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {version: string}).version
const resolveBuildSha = (): string => {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA
  if (vercelSha) return vercelSha.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', {cwd: projectDirectory, stdio: ['ignore', 'pipe', 'ignore']})
      .toString()
      .trim()
  } catch {
    return 'local'
  }
}

// react-vite-spa certified 프로파일 (tech-stack.md AD-2).
// - manualChunks 없음: Vite 기본 code splitting을 출발점으로 사용하고,
//   bundle report에서 중복/cache churn/oversized async chunk가 확인될 때만 추가한다.
// - chunkSizeWarningLimit를 올려 경고를 숨기지 않는다.
export default defineConfig({
  plugins: [react(), svgr()],
  resolve: {tsconfigPaths: true},
  server: {
    // local dev는 loopback 기본 (container/LAN 요구 시에만 0.0.0.0 명시 선택)
    host: '127.0.0.1',
    port: 8080,
  },
  preview: {
    // Playwright baseURL(http://127.0.0.1:4173)과 동일 — package script와 일치
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  // AD-11: 분석 Worker는 new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'}),
  // AudioWorklet은 audioWorklet.addModule(new URL(...)) — Vite 네이티브 번들.
  // SharedArrayBuffer 미사용이므로 COOP/COEP 헤더 설정을 넣지 않는다.
  worker: {format: 'es'},
  build: {assetsInlineLimit: 4096},
  // R52: 버전 표시용 빌드 타임 상수 — 소비는 @shared/config/version 한 곳으로 제한한다.
  define: {
    __APP_VERSION__: JSON.stringify(packageVersion),
    __BUILD_SHA__: JSON.stringify(resolveBuildSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
