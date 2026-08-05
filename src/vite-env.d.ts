/// <reference types="vite/client" />

// R52 빌드 타임 주입 상수 (vite.config define) — 소비는 @shared/config/version 한 곳뿐이다.
declare const __APP_VERSION__: string
declare const __BUILD_SHA__: string
declare const __BUILD_TIME__: string

interface ImportMetaEnv {
  readonly VITE_PHASE: 'dev' | 'production'
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
