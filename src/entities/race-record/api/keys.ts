// RaceRecord query key factory (api-schema v2 §6.2 canonical).
// invalidation 매트릭스(§6.4): createRaceRecord/deleteRaceRecord → raceKeys.root + motorKeys.summaries(),
// deleteMotorCascade·resetAllRecords → raceKeys.root 포함 — 실행은 feature-mutation-builder 소관.
export const raceKeys = {
  root: ['race-records'] as const,
  byMotor: (motorId: string) => [...raceKeys.root, 'by-motor', motorId] as const,
}
