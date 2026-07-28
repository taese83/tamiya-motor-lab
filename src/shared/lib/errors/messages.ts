import type {DomainErrorCode} from './domain-error'

// 코드 ↔ 기본 사용자 메시지 1곳 관리 (api-schema §3 매핑 표) —
// command는 기본 메시지를 쓰고, 문맥 메시지가 필요하면 DomainError 생성 시 override한다.
// weak-signal은 오류가 아니라 MeasureStatus 상태(수치 미표시) — 이 맵에 포함되지 않는다.
export const DOMAIN_ERROR_MESSAGES: Record<DomainErrorCode, string> = {
  validation: '입력값을 확인해 주세요',
  'not-found': '대상을 찾을 수 없습니다. 목록을 새로고침해 주세요',
  'storage-unavailable': '기록 저장을 사용할 수 없습니다 (측정은 가능)',
  'quota-exceeded': '저장 공간이 부족합니다. 오래된 기록을 삭제해 주세요',
  'transaction-failed': '저장 중 오류가 발생했습니다. 다시 시도해 주세요',
  'data-corrupt': '저장된 데이터를 읽을 수 없습니다',
  'capture-insecure-context': 'HTTPS 연결에서만 측정할 수 있습니다',
  'capture-permission-denied': '마이크 권한이 필요합니다',
  'capture-permission-denied-permanent': '브라우저 설정에서 마이크 권한을 허용해 주세요',
  'capture-suspended': '탭하여 다시 시작',
  'capture-device-error': '마이크를 사용할 수 없습니다',
}
