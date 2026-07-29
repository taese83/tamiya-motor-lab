import {queryOptions} from '@tanstack/react-query'

import {measureKeys} from './keys'
import {listMeasureRecordsByMotor} from './repository'

// MeasureRecord queryOptions factory (api-schema v2 §6.3).
// 전역 로컬 정책(AD-4a — staleTime Infinity·retry false 등)은 query-client 소관, 중복 지정 금지.
// 레이스 폼 "최신 파노 자동 입력"(R-3①)은 byMotor 결과의 마지막 요소를 select 파생 —
// 전용 query·전용 캐시를 만들지 않는다 (AR-5, 이중 원본 금지).
export const measureQueries = {
  byMotor: (motorId: string) =>
    queryOptions({
      queryKey: measureKeys.byMotor(motorId),
      queryFn: () => listMeasureRecordsByMotor(motorId),
    }),
}
