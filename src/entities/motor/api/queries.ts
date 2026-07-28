import {queryOptions} from '@tanstack/react-query'

import {motorKeys} from './keys'
import {getMotorById, listMotors} from './repository'

// Motor queryOptions factory (api-schema §6.3).
// TanStack Query 로컬 정책(AD-4a: networkMode 'always' · staleTime Infinity · retry false ·
// refetchOnWindowFocus false)은 app/providers/query-client.ts 전역 설정 소관 —
// factory에서 중복 지정하지 않는다. IndexedDB 로컬 조회라 HTTP AbortSignal 취소 대상도 없다.
export const motorQueries = {
  list: () => queryOptions({queryKey: motorKeys.list(), queryFn: () => listMotors()}),
  detail: (id: string) =>
    queryOptions({
      queryKey: motorKeys.detail(id),
      // TanStack Query v5는 queryFn의 undefined 반환을 오류로 취급한다 —
      // "부재"(정상 도메인 결과, api-schema §5)는 null로 표현하고 S4 라우트 가드가 분기한다.
      queryFn: async () => (await getMotorById(id)) ?? null,
    }),
  // summaries(motorKeys.summaries())의 queryFn은 Motor·RunRecord 두 entity를 조인하는 파생 view라
  // entity 간 import 금지(FSD) 아래 상위 레이어가 합성한다 —
  // @entities/run-record의 listMotorRecordRollups + composeMotorSummaries 참조.
}
