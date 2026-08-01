// 이탈 사유 트리 **미러** (R25 U4 — api-schema §1.1 T1②, threat-model Phase 3 체크리스트 3).
// ⚠️ 원본은 src/shared/config/domain.ts의 RETIRE_REASON_TREE — api/(plain JS)는 src/(TS)를
// import 못 해 **수동 동기** 사본이다. leaf 추가 시 반드시 양쪽을 함께 갱신할 것
// (append-only enum — 리네임·삭제 금지, drift는 fixture 정합 테스트로 검출).
// 용도: ① RETIRE_REASON_LEAF_KEYS — retireReason·retireReasonKeys 입력 검증(enum 대조)
//       ② resolveRetireReasonMeta — enum key → {pathLabel, speedRelated, causal} 서버측 재구성.
//          클라가 자유 문자열(pathLabel·causal)을 보내는 채널을 구조적으로 제거한다(T1②).

export const RETIRE_REASON_TREE = [
  {key: 'corner', label: '코너 이탈', speedRelated: true, causal: '속도 과다'},
  {
    key: 'jump',
    label: '점프',
    speedRelated: true,
    children: [
      {key: 'jump_overshoot', label: '비거리 김', causal: '순수 속도 → 전압↓ 1순위'},
      {key: 'jump_attitude', label: '공중 자세 무너짐', causal: '밸런스/댐퍼(속도 약함)'},
      {key: 'jump_rebound', label: '착지 후 튐', causal: '속도+댐퍼'},
      {key: 'jump_other', label: '그 외 점프', causal: '미상'},
    ],
  },
  {key: 'down_step', label: '다운 한칸 실패', speedRelated: true, causal: '속도 or 밸런스'},
  {key: 'wave', label: '웨이브 이탈', speedRelated: true, causal: '속도 or 댐퍼'},
  {key: 'lane_change', label: '레인체인지 실패', speedRelated: true, causal: '속도 과다'},
  {key: 'parts', label: '파츠 이탈·파손', speedRelated: false, causal: '전압 무관'},
  {key: 'stall', label: '멈춤', speedRelated: false, causal: '전압 무관'},
  {key: 'other', label: '기타·기억 안 남', speedRelated: false, causal: '미상'},
]

// leaf key → 루트→leaf 노드 경로 맵 (모듈 로드 시 1회 DFS). domain.ts와 동일 규칙 —
// children 있으면 branch(자기 key 미등록·저장 불가), 없으면 leaf(저장 가능).
const LEAF_PATHS = new Map()
function collectLeafPaths(nodes, ancestors) {
  for (const node of nodes) {
    if (node.children) {
      collectLeafPaths(node.children, [...ancestors, node])
      continue
    }
    LEAF_PATHS.set(node.key, [...ancestors, node])
  }
}
collectLeafPaths(RETIRE_REASON_TREE, [])

/** 저장 가능한 leaf key 목록(트리 순회 순서, 현재 11종) — 입력 검증(enum 대조)의 단일 참조 */
export const RETIRE_REASON_LEAF_KEYS = [...LEAF_PATHS.keys()]

/**
 * leaf key 배열 → 프롬프트 주입용 메타 [{key, pathLabel, speedRelated, causal}].
 * - pathLabel: 루트→leaf 라벨을 ' · '로 연결 — domain.ts retireReasonRowLabel과 동일 표기
 * - speedRelated: leaf부터 부모로 첫 정의값 상속(domain.ts resolveSpeedRelated와 동일 규칙),
 *   경로 전체 미정의면 false(전압 처방 제외가 안전한 기본)
 * - 미지 key는 **드롭**(400 판정은 호출자 검증 몫 — 여기는 재구성만 담당)
 */
export function resolveRetireReasonMeta(keys) {
  const out = []
  for (const key of keys) {
    const path = LEAF_PATHS.get(key)
    if (!path) continue // 미지 key 드롭
    const leaf = path[path.length - 1]
    let speedRelated = false
    for (let i = path.length - 1; i >= 0; i--) {
      if (path[i].speedRelated !== undefined) {
        speedRelated = path[i].speedRelated
        break
      }
    }
    out.push({
      key,
      pathLabel: path.map(node => node.label).join(' · '),
      speedRelated,
      causal: leaf.causal ?? '미상',
    })
  }
  return out
}
