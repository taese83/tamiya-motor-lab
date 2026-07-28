import {z} from 'zod'

// 공개 env 중앙 관리 — 컴포넌트에서 import.meta.env 직접 접근 금지 (env-management 규칙 1).
// 서버·외부 API가 없어 env는 표시/모드 구분용 2개뿐이다 (tech-stack §환경 설정).
// VITE_API_URL은 존재하지 않는다 — 스키마에 남기면 env 검증이 부팅을 막는다.
// staging은 미사용 (TS-A3) — provider 확정 후 preview 환경이 생기면 union·.env 파일을 함께 확장한다.
const publicEnvSchema = z.object({
  VITE_PHASE: z.enum(['dev', 'production']),
  VITE_APP_TITLE: z.string().min(1),
})

const publicEnv = publicEnvSchema.parse(import.meta.env)

export const config = {
  phase: publicEnv.VITE_PHASE,
  appTitle: publicEnv.VITE_APP_TITLE,
  isDev: publicEnv.VITE_PHASE === 'dev',
} as const

export type AppConfig = typeof config

// 도메인 상수는 './domain'에서 직접 import한다 (@shared/config/domain) —
// 이 파일을 경유해 재수출하지 않는 이유: env 검증(parse)이 도메인 상수만 필요한
// node 환경 unit(engine project 등)까지 강제 실행되는 결합을 피하기 위함.

// 디자인 토큰 재export (app/theme.ts에서 이동 — FSD shared→app 역방향 해소).
// 주의: 이 배럴 경유 import는 위 env parse를 함께 실행한다. import.meta.env가 없는
// node 환경 unit은 '@shared/config/design-tokens'에서 직접 import할 것.
export {
  color,
  measureStatusTokens,
  numericTypography,
  layoutTokens,
  motionTokens,
} from './design-tokens'
export type {MeasureStatusVisual} from './design-tokens'
