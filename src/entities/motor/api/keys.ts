// Motor query key factory (api-schema v2 §6.2 canonical).
// invalidation 매트릭스(§6.4): createMotor/updateMotor/reorderMotors → motorKeys.root,
// deleteMotorCascade → motorKeys.root + measureKeys.root + raceKeys.root,
// collectMeasureRecord/createRaceRecord/deleteRaceRecord/resetAllRecords → motorKeys.summaries() 포함 —
// 실행은 feature-mutation-builder 소관. guideKeys는 v2에서 제거(RV-2).
export const motorKeys = {
  root: ['motors'] as const,
  list: () => [...motorKeys.root, 'list'] as const,
  detail: (id: string) => [...motorKeys.root, 'detail', id] as const,
  summaries: () => [...motorKeys.root, 'summaries'] as const, // record 파생 — record mutation도 invalidate
}
