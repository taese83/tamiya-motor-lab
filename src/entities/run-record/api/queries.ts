import {queryOptions} from '@tanstack/react-query'

import {recordKeys} from './keys'
import {listRecordsByMotor} from './repository'

// RunRecord queryOptions factory (api-schema §6.3).
// TanStack Query 로컬 정책(AD-4a)은 app/providers/query-client.ts 전역 설정 소관 —
// factory에서 중복 지정하지 않는다. IndexedDB 로컬 조회라 HTTP AbortSignal 취소 대상도 없다.
// countRecordsByMotor는 query 캐시 미사용(cascade confirm 직전 명령형 호출 — api-schema §11),
// listSatisfiedRecords는 guideKeys queryFn 내부 합성 전용 — 둘 다 factory를 만들지 않는다.
export const recordQueries = {
  byMotor: (motorId: string) =>
    queryOptions({
      queryKey: recordKeys.byMotor(motorId),
      queryFn: () => listRecordsByMotor(motorId),
    }),
}
