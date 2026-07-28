// RunRecord query key factory (api-schema §6.2 canonical).
// invalidation 매트릭스(§6.4): createRecord/deleteRecord → recordKeys.root +
// motorKeys.summaries() + guideKeys.root — 실행은 feature-mutation-builder 소관.
// listSatisfiedRecords는 별도 키 없음 — 가이드 queryFn(guideKeys) 내부 합성 전용.
export const recordKeys = {
  root: ['records'] as const,
  byMotor: (motorId: string) => [...recordKeys.root, 'by-motor', motorId] as const,
}
