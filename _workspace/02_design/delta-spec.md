# Delta Spec — tamiya-motor-lab as-is 온보딩 (2026-08-19, R3)

브라운필드 델타 킷의 최초 생성(전환 규칙 — 전환 후 첫 델타 표면). **이번 킷은 변경을
싣지 않는다**: 기존 기능의 앵커 스탬핑 + 오버레이 로드만 수행하는 as-is 온보딩이며,
승인 기록은 첫 실제 변경 라운드에서 남긴다(변경 없는 승인의 anchorReceipt는 무의미).
경계 배너 없음 — 프로토타입 요소 0(전부 실물).

## 신원 선언 (target 신원 대조 계약)

- target: `http://127.0.0.1:8080` (vite.config.ts server.port 고정 — launch.json
  `tamiya-motor-lab` 항목과 일치)
- identity.titleIncludes: `Motor Lab` — dev `<title>` = "{탭} — Motor Lab"
  (.env.development VITE_APP_TITLE). 주의: production 빌드는 title이
  "minicar-motor-lab"이라 이 선언은 **dev 전용**이 맞다(콘솔 프록시 대상 = dev server).
  포트 8080은 launch.json에서 tart-web과 공유 — 점유 충돌 시 identity 대조가
  fail-closed(502)로 오표시를 차단한다(2026-08-19 도입 계약의 실사용 첫 적용).

## 앵커 표 (as-is — 안정 라벨 리프 매칭)

| anchorId | 라벨(리프 텍스트) | 위치 | feature | behavior(현재 동작) |
|---|---|---|---|---|
| wh-feat-measure-tab | 측정 | 하단 내비 탭 | FEAT-002 측정 세션 | 측정 화면 진입 — 마이크 권한·게이지·기록 dock |
| wh-feat-motors-tab | 모터 | 하단 내비 탭 | FEAT-007 목록·이력 조회 | 모터 목록/상세 진입 — 종류 뱃지·파노 이력 |
| wh-feat-race-tab | 레이스 | 하단 내비 탭 | FEAT-008 전압 가이드·레이스 | 레이스 기록/가이드 진입 |

feature-plan은 FEAT-ID 이전 형식(F1~F10 표)이다 — traceability의 featureId는 이 표의
F# 를 그대로 쓰고, 비시각/전역 기능(F1 엔진, F4 persistence, F9 셸, F10 UI 킷 등)은
빈 anchorIds + 사유로 등재한다(계약의 as-is 규정).

## mock 경계

없음 — 변경이 도입하는 신규 API 표면 0(전부 실물).

## 인접 목록

해당 없음 — 델타 UI 요소 0이므로 인접 상호작용 영향 없음. bootstrap은 스탬핑 실패 시
침묵하지 않고 콘솔 경고로 보고한다(작성 규칙 1).
