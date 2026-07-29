import {queryOptions} from '@tanstack/react-query'

import {motorKeys} from './keys'
import {getMotorById, listMotors, listMotorSummaries} from './repository'

// Motor queryOptions factory (api-schema v2 §6.3).
// TanStack Query 로컬 정책(AD-4a: networkMode 'always' · staleTime Infinity · retry false ·
// refetchOnWindowFocus false)은 app/providers/query-client.ts 전역 설정 소관 —
// factory에서 중복 지정하지 않는다. IndexedDB 로컬 조회라 HTTP AbortSignal 취소 대상도 없다.
// countRecordsByMotor는 의도적으로 factory 없음 — confirm 직전 명령형 호출 전용 (§5, 캐시 금지).
export const motorQueries = {
  list: () => queryOptions({queryKey: motorKeys.list(), queryFn: () => listMotors()}),
  detail: (id: string) =>
    queryOptions({
      queryKey: motorKeys.detail(id),
      // TanStack Query v5는 queryFn의 undefined 반환을 오류로 취급한다 —
      // "부재"(정상 도메인 결과, api-schema §5)는 null로 표현하고 라우트 가드가 분기한다.
      queryFn: async () => (await getMotorById(id)) ?? null,
    }),
  // 파생 view — 영속·캐시 금지(INV-09)는 invalidation 매트릭스가 보장 (§6.4)
  summaries: () => queryOptions({queryKey: motorKeys.summaries(), queryFn: () => listMotorSummaries()}),
}
