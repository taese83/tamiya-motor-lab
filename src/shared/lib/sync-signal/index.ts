// 서버 동기화 요청 신호 (v2.x 버그 수정).
//
// 문제: SyncManager(app)는 TanStack **mutation 성공**만 구독해 서버로 push한다. 그런데 측정
// 수집(collectMeasureRecord)은 useMutation이 아니라 command 직접 호출이라 그 이벤트가 발생하지
// 않는다 → **측정 기록이 서버에 영영 저장되지 않았다**(모터 생성·수정만 올라감).
//
// 해결: 쓰기를 수행한 feature가 이 신호를 쏘고, app(SyncManager)이 구독해 디바운스 push한다.
// features는 app을 import할 수 없으므로 신호 지점을 shared에 둔다(FSD 준수 — 양쪽이 shared만 참조).
// 상태 없는 순수 이벤트 — 구독자가 없으면 no-op(미로그인·로컬 정적 서버에서 무해).

type Listener = () => void

const listeners = new Set<Listener>()

/** 로컬 도메인 데이터가 바뀌었음을 알린다 — 서버 push 트리거(구독자 없으면 no-op) */
export function requestServerSync(): void {
  for (const listener of listeners) listener()
}

/** SyncManager 전용 구독 — 반환 함수로 해제 */
export function subscribeServerSync(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
