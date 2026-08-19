# 구현 축별 대조표 — v4.1 (2026-08-19, 완결성 계약 첫 실행)

방법: 라이브 dev(8080)에서 computed style 실측(브라우저 JS) + §8.1/§8.2 이식 블록 대조.
대조 기준 = 승인 시안 A(candidate-a/tokens.css + README).

| 축 | 시안 A 기준 | 실측 | 판정 |
|---|---|---|---|
| 색 | 웜 엄버 카본 + 카퍼(#FF8A3D dark / #B85C1E light) | 양모드 렌더 + `--mui-palette-primary-main: #B85C1E`(light) 실측, 다크 스크린샷 확인 | **PASS** |
| 타이포 | 디스플레이(h1·h2) = 모노 스택, 본문 = 휴머니스트 | `MuiTypography-h1` computed `SFMono-Regular, Roboto Mono…` 28px/800 · h2 모노 18px/700 · body 시스템 산세리프 · RPM 수치는 OPTION-F1 무변경(설계) — 전부 실측 | **PASS** |
| 밀도 | 6px 조밀 → 국소 오버라이드 전략(§5.1: cardPad 20→16·sectionGap 40→32, 전역 spacing 유닛 8 유지) | §8.1 블록에 cardPad:16·sectionGap:32 반영 확인. **요소 실측은 미도달** — 카드가 로그인 게이트 뒤(아래 한계) | **PASS(블록 수준)** |
| 형태 | radius 12 소프트라운드 + 카퍼 매트 글로우 + 얇은 보더 | `--mui-shape-borderRadius: 12px` 실측 ✓. MuiButton·MuiPaper(글로우 그림자)·MuiOutlinedInput 오버라이드는 §8.2 블록 대조로 확인. **요소 실측 미도달**(게이트 뒤). IconButton 원형(50%)은 정상(아이콘 버튼 관례) | **PASS(변수+블록 수준)** |
| 위계 | 크기·웨이트 대비(모노 디스플레이 vs 산세리프 본문) | h1 28px/800 vs body 시스템 스택 — 실측 대비 성립 | **PASS** |

부수 확인: 구키 잔존 참조 0(rg 스윕) · typecheck/lint/test 320/320/build green ·
콘솔 에러 0 · SegmentControl 직각 유지는 §9.2의 **의도된 범위 밖**(과도기 감수 문서화).

## 한계 (정직 명세)

- 밀도·형태의 **요소 수준** 실측은 카드·인풋·일반 버튼이 로그인 게이트 뒤라 미도달 —
  auth-verification 계약상 fixture 없이는 표면 PASS 금지이므로 "블록/변수 수준 PASS"로
  한정한다. 로그인 뒤 화면(모터 카드 radius 12·cardPad 16·카퍼 글로우·뱃지 공존)은
  **사용자 실사용 확인 몫**으로 위임.
- v4 1차 구현이 색만 적용됐던 결함(사용자 발견)이 이 대조표 규약의 등록 계기다 —
  이번 표가 규약의 첫 산출물이며, 미도달 항목을 PASS로 뭉개지 않는 것이 규약의 존재 이유다.

## v4.2 부록 (2026-08-19) — 사용자 발견 결함 3건 보수

형태 축의 "블록/변수 수준 PASS"가 가리던 실제 결손이 사용자 실사용 확인으로 노출됨:
인풋 프레임(FormField/VoltageStepper 로컬 면 소유 — §10 지시 누락), 셀렉션(ToggleButton
직각 과도기 기각), 기록 버튼 soft-disabled(::before 고아). v4.2로 정본 갱신 후 6파일
동기화, 게이트 green, ::before 스윕 기대값 일치. 요소 수준 확인 잔여는 change-scope
R2 보수 2 결과 참조(로그인 게이트 — 사용자 위임).
