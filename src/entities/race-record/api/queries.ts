import {queryOptions} from '@tanstack/react-query'

import {raceKeys} from './keys'
import {listRaceRecordsByMotor} from './repository'

// RaceRecord queryOptions factory (api-schema v2 §6.3).
// 전역 로컬 정책(AD-4a — staleTime Infinity·retry false 등)은 query-client 소관, 중복 지정 금지.
export const raceQueries = {
  byMotor: (motorId: string) =>
    queryOptions({
      queryKey: raceKeys.byMotor(motorId),
      queryFn: () => listRaceRecordsByMotor(motorId),
    }),
}
