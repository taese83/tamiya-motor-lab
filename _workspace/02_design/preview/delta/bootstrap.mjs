// tamiya-motor-lab 델타 bootstrap — as-is 온보딩(2026-08-19, R3).
// 기능 델타 없음: 기존 하단 내비 탭 3종에 앵커 스탬핑 + 공용 오버레이 로드만 수행한다.
// 작성 규칙 준수: 텍스트 리프 매칭(1)·body 전체 관찰(2)·자기오염 가드(3)·호스트 불간섭(4)·
// 실패 시 침묵 금지(1)·rAF 숨김 탭 폴백(9)·미지 앵커 무배지(10 — 오버레이 소관).
window.__WH_DELTA_VERSION = 'motor-lab-asis-1'

const ANCHORS = [
  {anchorId: 'wh-feat-measure-tab', label: '측정', featureId: 'FEAT-002', tests: 'TC-002-1'},
  {anchorId: 'wh-feat-motors-tab', label: '모터', featureId: 'FEAT-007', tests: 'TC-007-1'},
  {anchorId: 'wh-feat-race-tab', label: '레이스', featureId: 'FEAT-008', tests: 'TC-008-1'},
]

// 라벨 리프 매칭 + 최근접 내비 조상(a/button) — 델타 자기 요소(data-wh-delta)는 제외
const stampAnchors = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const leaves = []
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.textContent.trim() && !node.parentElement?.closest('[data-wh-delta]')) leaves.push(node)
  }
  for (const {anchorId, label, featureId, tests} of ANCHORS) {
    const leaf = leaves.find(node => node.textContent.trim() === label && node.parentElement?.closest('nav, [role="tablist"], a, button'))
    if (!leaf) continue // SPA 하이드레이션 전 경합 — 실패 판정은 아래 정착 검사가 담당
    const host = leaf.parentElement.closest('a, button') ?? leaf.parentElement
    if (host.getAttribute('data-wh-anchor') === anchorId) continue // 멱등(규칙 3)
    host.setAttribute('data-wh-anchor', anchorId)
    host.setAttribute('data-wh-feature', featureId)
    host.setAttribute('data-wh-tests', tests)
  }
}

// 침묵 금지(규칙 1)의 판정 시점: 하이드레이션 정착 후에도 미매칭인 앵커만 경고한다 —
// 로드 직후 1회 시도의 실패는 SPA 렌더 전 경합이라 실패가 아니다(실측: 경고 3건 소음).
setTimeout(() => {
  for (const {anchorId, label} of ANCHORS) {
    if (!document.querySelector(`[data-wh-anchor="${anchorId}"]`)) {
      console.warn(`[wh-delta] 앵커 매칭 실패(정착 후): ${anchorId} (라벨 "${label}") — 배지 생략`)
    }
  }
}, 3000)

// SPA 리렌더 재적용 — 디바운스, 숨김 탭에서는 setTimeout 폴백(규칙 9)
let pending = null
const schedule = () => {
  if (pending !== null) return
  const run = () => { pending = null; stampAnchors() }
  pending = document.visibilityState === 'hidden'
    ? setTimeout(run, 120)
    : requestAnimationFrame(run)
}
new MutationObserver(schedule).observe(document.body, {childList: true, subtree: true})

stampAnchors()
// 오버레이 초기화 — 델타 모드 시그니처(traceability 주입 + 콘솔 딥링크 파라미터 전달)
const pageParams = new URLSearchParams(location.search)
import('./wh-overlay.mjs')
  .then(({initWhOverlay}) => initWhOverlay({
    traceabilityUrl: new URL('./traceability.json', import.meta.url).href,
    consoleOrigin: pageParams.get('whConsoleOrigin') ?? undefined,
    projectId: pageParams.get('whProject') ?? undefined,
  }))
  .catch(error => console.warn('[wh-delta] 오버레이 로드 실패:', error))
