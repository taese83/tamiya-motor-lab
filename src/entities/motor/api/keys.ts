// Motor query key factory (api-schema §6.2 canonical).
// invalidation 매트릭스(§6.4): createMotor/updateMotor → motorKeys.root,
// deleteMotorCascade → motorKeys.root + recordKeys.root + guideKeys.root,
// createRecord/deleteRecord → motorKeys.summaries() 포함 — 실행은 feature-mutation-builder 소관.
export const motorKeys = {
  root: ['motors'] as const,
  list: () => [...motorKeys.root, 'list'] as const,
  detail: (id: string) => [...motorKeys.root, 'detail', id] as const,
  summaries: () => [...motorKeys.root, 'summaries'] as const, // records 파생 — record mutation도 invalidate
}
