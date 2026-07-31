# Decision Log — minicar-motor-lab

> Phase 1 Wave 0. 형식: 결정 / 근거 / 검증 방법. 답변이 바뀌면 이전 결정과 이유를 이 로그에 남긴다.

## DL-001 측정 방식: 마이크 소음 → FFT → 피크 주파수 → RPM 환산

- **일자/출처**: 2026-07-28, intake 답변 1 (사용자 직접 설명)
- **결정**: 스마트폰 마이크로 모터 회전 소음(정류자·카본 브러시 마찰, 회전축 진동 고유 주파수)을 수집하고, FFT로 주파수 스펙트럼을 분해해 모터 회전과 연동된 피크 주파수를 추출한 뒤, 주파수(Hz)×60 또는 모터 극수(pole) 계산식으로 RPM을 환산해 표시한다.
- **근거**: 사용자가 측정 원리를 직접 지정. 웹 브라우저에서 추가 하드웨어 없이 가능한 유일한 측정 경로 (getUserMedia + Web Audio API). 광학 타코미터 수준 절대 정확도가 아닌 동일 조건 상대 비교가 목적.
- **검증 방법**: 알려진 주파수의 합성 신호 fixture(순수 사인파 / 기본파+배음 / 소음 혼합 / 무음)로 파이프라인의 기대 출력(피크 Hz, RPM)을 결정적으로 검증. Phase 2에서 HTTPS 실기기(iOS Safari 우선)로 실제 130 모터 공회전 소음의 피크 검출률·수치 안정성 확인.

## DL-002 파노값 정의 (ASSUMPTION)

- **일자/출처**: 2026-07-28, intake 답변 2 — 오케스트레이터 해석, 사용자에게 고지됨 (명시 확정 아님)
- **결정**: 파노값 = FFT 스펙트럼에서 추출한 모터 회전 피크 주파수(Hz) 수치. RPM과 같은 분석 파이프라인의 산출물로 취급하고 수치로만 표시한다.
- **근거**: 사용자 원문에 "회전에 따른 rpm과 파노값"이 함께 등장하고, 측정 방식 설명(FFT 피크 추출)과 정합하는 가장 자연스러운 해석. 사용자에게 이 해석이 고지되었다.
- **검증 방법**: 첫 검토(plan review 또는 prototype 검토)에서 사용자 명시 확인. 다른 의미(예: 커뮤니티 고유 용어)로 판명되면 표시 계층에서 환산식만 교체할 수 있도록 분석 산출값과 표시 라벨을 분리 설계. → planning-context A1.

## DL-003 측정 상황: 공회전 근접 측정만 범위

- **일자/출처**: 2026-07-28, intake 답변 3
- **결정**: 모터/차체를 손에 들고 공회전시키며 폰을 가까이 대고 측정하는 시나리오만 지원한다. 주행 중 측정은 범위 외 (Won't).
- **근거**: 사용자 확인. 주행 중은 거리·도플러·주변 소음으로 신호 품질을 보장할 수 없고, 근접 공회전은 SNR이 높아 상대 비교 목적에 충분하다.
- **검증 방법**: prototype 실기기 검증을 공회전 근접 조건으로만 수행. 소음 환경·거리 이탈 시 "신호 약함" 실패 상태로 유도되는지 확인.

## DL-004 가이드 방식: 만족 기록 기반 고정 규칙 추천

- **일자/출처**: 2026-07-28, intake 답변 4
- **결정**: 모터별로 '만족' 체크된 주행 기록의 전압 분포를 근거로 추천 전압 범위를 제시한다. 고정 규칙 기반이며 AI 불필요 (AI_MODE: false).
- **근거**: 사용자 확인. 데이터가 소량·개인 기록이므로 통계적 학습이 아닌 단순 분포 요약이 설명 가능하고 신뢰를 얻기 쉽다.
- **검증 방법**: seed fixture(만족 기록 3+건 / 0~1건 / 전압 분산 큰 케이스)로 추천 범위 계산과 근거 노출을 검증. 최소 기록 건수와 미달 시 표시는 NEEDS_DECISION D1로 사용자 확인.

## DL-005 프로젝트 위치: workspace/minicar-motor-lab

- **일자/출처**: 2026-07-28, 오케스트레이터 결정 (harness 규칙)
- **결정**: 구현 project root는 `workspace/minicar-motor-lab` (harness 규칙: 새 앱은 workspace/<이름>에 생성). WEB_PROFILE: react-vite-spa, 서버 없이 정적 호스팅.
- **근거**: greenfield-service 요청이며 harness의 신규 앱 배치 규칙을 따름. 서버가 필요 없는 로컬 데이터(IndexedDB) 도구라 SPA + 정적 호스팅이 최소 구성.
- **검증 방법**: Phase 3 scaffold 시 해당 경로에 앱 생성 확인. 단, 기획 산출물(`_workspace/01_plan/*`)은 agent-registry 소유권이 harness root `_workspace/`에 anchor되어 있어 오케스트레이터 지시 경로(`workspace/minicar-motor-lab/_workspace/`)에 쓸 수 없었다 — 산출물 경로 정책(이관 vs registry 조정)은 오케스트레이터/사용자 결정 필요. → planning-context BLOCKER 항목.

## DL-006 데이터 전략: mock (합성 신호 + seed fixture)

- **일자/출처**: 2026-07-28, planning-facilitator 판단 (planning-readiness-contract의 전략 표 적용)
- **결정**: 데이터 검토 전략은 `mock`. 분석 로직은 합성 오디오 신호 fixture로, CRUD·가이드는 IndexedDB seed fixture로 검증한다. 권한·suspended 등 브라우저 전용 상태는 Phase 2 실기기 확인 항목으로 분리한다.
- **근거**: 서버·외부 API가 없고, 실측 오디오는 브라우저+실기기에서만 재현 가능하다. 합성 신호는 기대 출력이 결정적이라 UX·상태 검토 목적에 충분하다. production 데이터가 없어 mutation 위험도 없다.
- **검증 방법**: fixture 목록(normal/empty/저신호/무음/배음/소음, 만족 기록 유무·분산)을 requirements와 state-contract에 전달하고, Mock→real 전환은 실기기+실모터 검증 세션으로 수행 (owner: 사용자 본인).

## 2026-07-31 레이스 개선 기획

### DL-007 레이스 개선 pain 확정: 기록 열람이 목록뿐 (단일 선택)

- **일자/출처**: 2026-07-31, intake 답변 ① (사용자 확정 — 재질문 금지)
- **결정**: 이번 개선의 pain은 "기록 열람이 목록뿐 — 회차가 쌓여도 추세·비교가 안 보임"(전압/랩타임/파노 관계, 목표 대비 결과 등 인사이트 부족) 하나로 고정한다. 입력 번거로움·대회(세션) 구조·기록 항목 추가는 선택되지 않았으므로 Won't/후순위다.
- **근거**: 사용자 단일 선택. 핵심 job은 "트랙사이드에서 다음 판 전압을 결정할 때 과거 기록이 즉시 참고가 되는 것"이며, 현재 최신순 목록은 스크롤·암산을 요구한다. 입력 시점 전압 추천(voltage-advisor, v2.31~v2.37)은 이미 존재하므로 이번 범위는 추천 재발명이 아닌 **열람 인사이트**다.
- **검증 방법**: 관찰 가능한 성공 조건 — 레이스 상세 진입 시 스크롤 없이 완주 전압대·최근 추세를 파악하고 다음 판 전압을 결정할 수 있는지 Phase 2 prototype(작은 뷰포트 기준)에서 확인.

### DL-008 사용 맥락: 현장 즉석 열람 (모바일 한눈 요약)

- **일자/출처**: 2026-07-31, intake 답변 ② (사용자 확정)
- **결정**: 트랙 옆에서 폰 한 손으로 빠르게 보는 "모바일 한눈 요약"으로 설계한다. 데스크톱 분석 대시보드·필터/차원 편집기(ANALYTICS_BUILDER)는 범위 외. 기존 [+ 기록] 주 행동과 목록·입력 흐름은 유지하고 요약은 파생 표시 전용으로 얹는다.
- **근거**: 사용자 확정 답변. 기존 상세 화면은 고정 셸(헤더/스크롤 목록/하단 초기화 푸터)이라 스크롤 영역 상단이 요약 삽입 후보이며, 요약이 목록 첫 행을 뷰포트 밖으로 밀어내면 성공 조건과 충돌한다.
- **검증 방법**: layout 단계에서 수직 공간 예산(요약+목록 첫 행 동시 노출) 확인, prototype에서 한 손 조작 동선 검토.

### DL-009 크기 결정 방식: S/M/L 비교 제안 후 사용자 선택 (권고 split)

- **일자/출처**: 2026-07-31, intake 답변 ③ (사용자 확정) + planning-facilitator 권고
- **결정**: 기획서에 S(상세 상단 파생 요약 카드만) / M(요약+미니 차트·완주 vs 이탈 전압 비교) / L(세션·대회 구조)을 비교 제시하고 사용자가 선택한다(NEEDS_DECISION D1). facilitator 권고는 **split** — S를 최소 가시 검토 단위로 먼저 검토 후 M 확장. L은 DL-007에 의해 Won't.
- **근거**: 사용자가 "페인 기준 제안 받기"를 선택. M의 차트는 @mui/x-charts가 이미 도입돼(PanoLineChart v2.3 — intake의 "자체 SVG" 전제는 코드와 다름을 확인) 신규 의존성이 없으나, 수직 공간 예산 위험은 S 검토에서 먼저 확인하는 편이 안전하다.
- **검증 방법**: plan review에서 D1 사용자 선택 수령. M 채택 시 PanoLineChart의 a11y 계약(aria-hidden, canonical=목록 텍스트, 차트 단독 사용 금지) 준용 여부를 design 단계에서 확인.

### DL-010 데이터 전략: mock — 기존 IndexedDB 로컬 데이터 파생 전용

- **일자/출처**: 2026-07-31, planning-facilitator 판단 (planning-readiness-contract 전략 표 적용)
- **결정**: 전략은 `mock`. 인사이트는 기존 RaceRecord의 **읽기 파생 전용** — 신규 엔티티·필드·migration 없음, production mutation 없음, 서버 로그인 동기화 계약 무변경. 검토는 격리 seed fixture(0건 / 1~2건 표본 부족 / 완주·이탈 혼재 / result 미정 포함 / lapTimeMs 일부만 / 동일 전압 반복 / 20+건 누적)로 수행한다.
- **근거**: RaceRecord에는 rolling 상한이 없어(≤10은 MeasureRecord만) 회차가 누적되며, 파생 계산은 순수 함수로 fixture 검증이 결정적이다. result·lapTimeMs가 optional이라 partial 상태(표본 제외 표기)가 UX 위험의 중심이다.
- **검증 방법**: fixture 세트로 요약 수치·부족/partial 문구·삭제/초기화 직후 재계산을 검증. Mock→real 전환은 사용자 본인 실기기·실데이터 열람 확인(읽기 전용 — 전환 위험 없음, owner: 사용자).

### DL-011 산출물 경로 차단: race-insight/ 하위는 planning-facilitator 소유권 밖

- **일자/출처**: 2026-07-31, enforce-agent-ownership 훅 차단 (DL-005와 동일 계열)
- **결정**: 지시받은 `_workspace/01_plan/race-insight/planning-context.md`는 agent-registry상 planning-facilitator 소유 경로(`_workspace/01_plan/planning-context.md`·`decision-log.md` 정확 일치 2개)가 아니어서 쓸 수 없다. 기존 planning-context.md는 전체 앱 기획으로 읽기 전용 지시라 덮어쓰지 않는다. planning-context 본문은 facilitator 응답으로 오케스트레이터에 핸드오프하고, 파일 기록은 `01_plan/` 전체를 소유한 agent(예: source-artifact-ingestor) 경유 또는 registry 조정으로 오케스트레이터/사용자가 결정한다.
- **근거**: 훅 차단 메시지 + `agent-registry.mjs` 'planning-facilitator' 항목 직접 확인. 권한 설정·registry를 에이전트가 임의 변경하지 않는다.
- **검증 방법**: 오케스트레이터가 경로 정책 결정 후 해당 파일 존재·내용 일치 확인.

### DL-012~014 — race-insight 우선 결정 확정 (2026-07-31, 사용자)
- **DL-012 (D1 크기)**: split 확정 — 1차 S(U1 파생 계산 + U2 요약 카드 + U5 배선) 구현·검토 후, 2차 M(U3 미니 차트 + U4 완주 vs 이탈 대역)을 별도 라운드로. 근거: 수직 예산(REQ-NFR-001) 실측 후 차트 결정.
- **DL-013 (D2 표본 윈도우)**: 세분화 확정 — **완주 전압대(REQ-RI-001) 표본 = 전체 finished 회차**, **추세(REQ-RI-003) 표본 = voltage-advisor 동일 윈도우**(selectAdviceWindow 공유: 최신→가장 최근 완주 포함, 폴백 5건). advisor 단일 윈도우의 band 퇴화(완주 표본 항상 1건) 함정 회피. [보는 법] 다이얼로그에 기준 2개 설명 의무.
- **DL-014 (D3 미정 표기)**: 제외 + 건수 고지 확정 — "미정 n건 제외" 보조 문구 표시. excluded는 계약대로 항상 산출.

### DL-015 — 이탈 사유 수집(옵션 B) 착수 결정 (2026-07-31, 사용자)
- 결정: race-insight 열람 요약과 **별개**로, RaceRecord에 이탈 사유(optional additive enum)를 추가해 **AI 분석 전제 데이터 수집을 먼저 시작**한다. 라인 번호는 제외(교란변수·부담 대비 이득 불확실). AI 기능 자체는 이 라운드에서 구현하지 않음 — 라벨된 실패 데이터 수집만.
- 근거: 과거 이탈 기록엔 사유 소급 입력 불가 → 데이터가 익는 데 시간 걸림 → 수집은 빠를수록 이득. 칩은 인과 도메인(속도형/기계형)으로 나눠 AI가 전압 처방 가능 여부를 데이터에서 가를 수 있게 함.
- 산출물: `_workspace/01_plan/race-insight/retire-reason-chipset.md`. 미결 D-R1~R4.

### DL-016 — 이탈 사유 칩 taxonomy 1차 반영 (2026-07-31, 사용자)
- 속도형에 `jump_overshoot`(점프 비거리 김) 추가. 기존 `jump` → `jump_land`(점프·착지 실패)로 명확화. 비거리 초과(순수 속도)와 착지 실패(속도 or 밸런스)를 분리 — AI 신호 선명화.
- 현재 세트: 속도형 4(corner·jump_overshoot·jump_land·lane_change) + 기계형 2(parts·stall) + escape 1(other) = 7. D-R1 계속 열림(추가 코스 섹션 있으면 가감).

### DL-017 — 이탈 사유 칩 taxonomy 2차 반영 (2026-07-31, 사용자)
- 속도형에 `down_step`(다운 한칸 실패) 추가 — 다운 구간 드롭 착지 실패. AI 해석은 jump_land와 동형(속도 or 밸런스).
- 현재 세트 8칩: 속도형 5(corner·jump_overshoot·jump_land·down_step·lane_change) + 기계형 2(parts·stall) + escape 1(other). 한 손 즉석 선택 실용 상한 근처 — 추가 시 그룹 접기 검토. D-R1 계속 열림.

### DL-018 — 점프 계열 3분해 (2026-07-31, 사용자)
- `jump_land`를 둘로 분해: `jump_attitude`(공중 자세 무너짐 — 롤·요·피치) + `jump_rebound`(착지 후 튐). `jump_overshoot`(비거리 김)와 합쳐 점프 3세부.
- AI 근거: 세 모드가 "순수 속도(비거리)→밸런스·댐퍼(자세)→속도+댐퍼(튐)" 스펙트럼을 가름 → 처방 분리.
- 현재 9칩(속도형 6 + 기계형 2 + escape 1). 평면 상한 초과 → 신규 미결 D-R5(평면 vs 섹션→세부 2단 구조).

### DL-019 — 이탈 사유 구조 = 재귀 트리 + 웨이브 추가 (2026-07-31, 사용자)
- D-R5 확정: 평면 칩 폐기, **재귀 트리(섹션→세부, n단 확장 가능)** 채택. 저장은 최종 선택 노드 key 하나, enum은 트리 평탄화에서 파생, key append-only → 스키마·migration 불변으로 세부를 무한 확장.
- `wave`(웨이브 이탈) 속도형 섹션 추가. 현재 트리: 속도형 5섹션(corner·jump{overshoot·attitude·rebound·other}·down_step·wave·lane_change) + 기계형 2(parts·stall) + escape(other).
- UX: result='retired' 시 섹션 1탭 → children 있으면 세부(breadcrumb+뒤로), "그 외"로 어느 단계서든 마감. 옵션·단일 선택.
- 문서: retire-reason-chipset.md 재귀 트리로 전면 개정. 잔여 미결 D-R1(트리 확정)·D-R2·D-R3·D-R4.

### DL-020 — 이탈 사유 계획 전면 확정 (2026-07-31, 사용자 "확정")
- D-R1 트리 확정(추가 섹션 없음), D-R2 UI 클리어, D-R3 말단 라벨 표시('그 외'는 섹션 병기), D-R4 단일 선택. D-R5 재귀 트리(기확정).
- retire-reason-chipset.md = READY. 다음: /web-orchestrator Phase 3 iterate(existing-change, feature/M) — domain 트리·schema optional additive·RaceEntrySheet 드릴다운·RaceRecordRow 표시·테스트. AI 기능 제외(데이터 수집만).
- 별개 트랙 race-insight(열람 요약 S안)는 D1~D3 확정(DL-012~014) 상태로 병존 — 두 라운드 순서는 사용자 선택.
