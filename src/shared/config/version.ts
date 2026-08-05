// R52 배포 버전 정보 — vite.config define(__APP_VERSION__ 등)이 유일한 원천이다.
// vitest는 별도 config로 define이 주입되지 않으므로 typeof 가드 폴백을 갖는다.
// 표시 전용이다 — 로직 분기·캐시 키 등에 사용하지 않는다(빌드마다 값이 바뀐다).

export interface AppVersion {
  /** package.json semver — `pnpm version:*`로만 올린다 */
  version: string
  /** 배포 커밋 short sha — Vercel은 VERCEL_GIT_COMMIT_SHA, 로컬은 git, 없으면 'local' */
  sha: string
  /** 빌드 시각 ISO 문자열 — dev/test 폴백은 null */
  builtAt: string | null
}

export const appVersion: AppVersion = {
  version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev',
  sha: typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'dev',
  builtAt: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null,
}

/** 화면 표시 라벨 — "v0.1.0 (645e417 · 08-05)" / 빌드 시각 없으면 "v0.0.0-dev (dev)" */
export const formatVersionLabel = ({version, sha, builtAt}: AppVersion): string => {
  const datePart = builtAt === null ? null : builtAt.slice(5, 10)
  return datePart === null ? `v${version} (${sha})` : `v${version} (${sha} · ${datePart})`
}

export const appVersionLabel = formatVersionLabel(appVersion)
