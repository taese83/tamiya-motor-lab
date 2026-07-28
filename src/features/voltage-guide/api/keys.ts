// Guide query key factory (api-schema §6.2 canonical — 이 파일이 guideKeys의 단일 원천).
// 가이드 결과는 in-memory query 캐시만 사용 — IndexedDB·전역 store 영속 금지 (INV-09/INV-10).
// invalidation 매트릭스(§6.4): deleteMotorCascade / createRecord / deleteRecord → guideKeys.root.
// 주의: feature 간 직접 import 금지(eslint)로 motor-management·record-entry의 mutations.ts는
// 이 root 값(['guide'])을 계약 미러 상수로 보유한다 — 값 변경 시 세 위치 + api-schema §6.2 동시 갱신.
export const guideKeys = {
  root: ['guide'] as const,
  byMotor: (motorId: string) => [...guideKeys.root, motorId] as const,
}
