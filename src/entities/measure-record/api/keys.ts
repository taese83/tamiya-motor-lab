// MeasureRecord query key factory (api-schema v2 §6.2 canonical).
// invalidation 매트릭스(§6.4): collectMeasureRecord → measureKeys.root + motorKeys.summaries(),
// deleteMotorCascade·resetAllRecords → measureKeys.root 포함 — 실행은 feature-mutation-builder 소관.
export const measureKeys = {
  root: ['measure-records'] as const,
  byMotor: (motorId: string) => [...measureKeys.root, 'by-motor', motorId] as const,
}
