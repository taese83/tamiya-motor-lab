import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'
import svgr from 'vite-plugin-svgr'

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
})
