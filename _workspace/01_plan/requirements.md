# Requirements — minicar-motor-lab (미니카 모터 RPM 측정 모바일 웹앱)

> Phase 1 Wave 1 산출물. 입력: `_workspace/01_plan/planning-context.md`, `_workspace/01_plan/decision-log.md`, `_workspace/01_plan/analysis-algorithm.md`(측정 알고리즘 canonical 사양 v2).
> 측정 관련 수치·상태·검증 기준은 모두 analysis-algorithm.md v2를 인용한다. 앱 소스 위치: `workspace/minicar-motor-lab`.

## Modes

- LOCAL_DOMAIN_STATE_MODE: **true** (IndexedDB가 authoritative store — motors/records CRUD, 참조 관계, cascade 삭제)
- TIMESERIES_MODE: false (시계열 차트는 Won't — 수치 표시만)
- ANALYTICS_BUILDER_MODE: false (가이드는 고정 규칙 단일 집계, 사용자 정의 query 없음)
- AI_MODE: false (DL-004: 고정 규칙 추천, AI 불필요)
- EXTERNAL_DATA_INGESTION_MODE: false (외부 데이터 소스 없음 — 마이크 입력은 실시간 로컬 신호)

## 서비스 개요

- **핵심 가치 제안**: 스마트폰 마이크만으로 130 브러시드 3극 모터의 공회전 RPM·파노(기본 주파수 f₀ Hz)를 측정·기록하고, 축적된 '만족' 주행 기록을 근거로 다음 주행의 배터리 전압 세팅을 판단하게 한다.
- **주요 사용자**: 미니카 취미 유저 본인. 단일 사용자 개인 도구 — 계정·공유·멀티 디바이스 동기화 없음 (planning-context Product Frame).
- **핵심 사용 시나리오 3개**:
  1. 공회전 중인 모터에 폰을 가까이 대고 "녹음 활성화" 탭 → 3초 이내 파노(Hz)·RPM이 수치로 표시되고 안정되면 확정값으로 잠긴다.
  2. 측정 직후 한 흐름으로 기록 입력 — 모터 선택, 세팅 전압(수동 숫자 입력), 주행 결과, 만족 체크 저장. 브라우저를 닫았다 열어도 기록이 남는다.
  3. 만족 기록이 쌓인 모터를 가이드에서 선택 → 추천 전압 범위와 근거가 된 만족 기록 목록을 확인한다.
- **대상 화면/기능**: 측정 / 기록 입력 / 모터·기록 이력 / 전압 가이드 — 4개 surface.
- **현재 pain**: 전압 세팅을 감으로 한다(근거 없음), 모터 상태(길들이기·마모)를 추적할 수단이 없다.
- **관찰 가능한 성공 조건** (planning-context 승계):
  1. 측정 시작 후 수 초 내 RPM·파노가 수치로 표시된다 (측정 시작→확정 3s 이내, v2 §4).
  2. 같은 모터·같은 전압 반복 측정 시 RPM이 일관 대역에 수렴한다 (절대 정확도가 아닌 상대 비교 신뢰성 — DL-001).
  3. 측정→기록 입력이 한 흐름으로 끝나고 IndexedDB에 영속된다.
  4. 만족 기록이 쌓인 모터의 추천 전압 범위와 근거 기록을 확인할 수 있다.

## 측정 상태 계약 (canonical — analysis-algorithm.md v2 §1)

측정 화면의 status는 다음 6종으로 고정한다. 모든 측정 관련 요구사항·시나리오는 이 enum을 사용한다.

`idle · measuring · stable · weak-signal · no-permission · suspended`

- 출력: 파노 = f₀ (Hz, 소수 1자리), RPM = f₀ × 60 (정수), confidence(0~1), status.
- 신뢰 게이트: 고조파 SNR ≥ 8 dB & 검출 고조파 ≥ 2 & pYIN voicing 확률 임계. 미달 시 **수치 미표시 + `weak-signal`** (오값 표시 금지). 무음·피크 미검출·저신호는 모두 `weak-signal`로 수렴한다.
- 안정 판정: 최근 1.5 s 창 변동계수 < 1.5% → 중앙값을 확정값으로 잠금 (`stable`).
- f₀ 탐색 대역: 170~620 Hz (≈ 10,000~37,000 RPM) — 대역 제한으로 기대 대역 밖 쓰레기 값 표시를 구조적으로 차단.

## 기능 요구사항

각 요구사항의 정상·실패·경계 시나리오는 하단 Scenario Review 표에 ID로 매핑된다.

### Must Have (MVP)

- [ ] **REQ-F-001 마이크 활성화 및 캡처 계약** (trace: planning-context Must, DL-001, v2 §2)
  - Given 권한 미부여 상태의 측정 화면, When 사용자가 "녹음 활성화" 버튼을 탭, Then 탭 핸들러 내에서 `getUserMedia({ audio: { echoCancellation:false, noiseSuppression:false, autoGainControl:false, channelCount:1 } })` 호출과 `AudioContext.resume()`이 수행된다 (음성용 DSP가 배음을 제거하므로 constraint는 필수).
  - Given 권한 허용됨, When 캡처 시작, Then 실제 `AudioContext.sampleRate`를 읽어 모든 분석 계산에 반영한다 (48 kHz 가정 금지). AudioWorklet으로 수집하고 분석 전체는 Web Worker에서 수행한다 (메인 스레드는 상태·수치 표시만).
  - Given `AudioContext.state !== 'running'`, When 측정 시작 시도, Then 측정을 시작하지 않고 `suspended` 상태를 표시한다 (→ REQ-ST-004).
- [ ] **REQ-F-002 공회전 측정 → 파노·RPM 수치 표시** (trace: planning-context Must + 성공 조건 1·2, DL-001/DL-003, v2 §1·§3·§4)
  - Given 권한 허용 + `running` 상태, When 공회전 모터에 근접해 측정, Then status가 `measuring`으로 전이되고 신뢰 게이트 통과 시 파노(f₀ Hz, 소수 1자리)·RPM(f₀×60, 정수)이 갱신 표시되며, 안정 판정 충족 시 `stable`로 전이되어 확정값이 잠긴다. 측정 시작→확정 3 s 이내.
  - Given 3f₀/6f₀ 정류 성분이 기본파보다 강한 신호(v2 §0 핵심 위험), When 분석, Then f₀가 채택된다 — RPM 3·6배 오판 금지 (fixture "배음 지배" 합격 기준).
  - Given 신뢰 게이트 미달(저신호·무음·피크 미검출), When 프레임 분석, Then 수치를 표시하지 않고 `weak-signal`을 표시한다. 이전 측정값·0 RPM·쓰레기 피크가 유효 측정값처럼 표시되면 안 된다 (→ REQ-ST-003).
  - Given 측정 중 회전수 변화(스핀업), When f₀가 200→500 Hz로 이동, Then 추적 지연 < 0.5 s, Viterbi 옥타브/고조파 점프 오작동 없음 (fixture "스핀업 chirp"·"옥타브 유혹").
- [ ] **REQ-F-003 모터 등록·관리 (상태 메모 포함)** (trace: planning-context Must "모터 엔티티 CRUD", 핵심 기능 2)
  - Given 모터 0개, When 모터 목록 진입, Then 빈 상태 안내와 첫 모터 등록 유도가 표시된다.
  - Given 이름/라벨(필수)과 상태 메모(선택) 입력, When 저장, Then IndexedDB에 영속되고 목록에 즉시 반영된다. 이름 미입력 시 저장이 거부되고 인라인 검증 메시지가 표시된다.
  - Given 기존 모터, When 이름/상태 메모 수정, Then 구조 필드(ID, createdAt)는 변경되지 않고 편집 필드만 갱신된다 (local-domain-state 불변식).
  - 모터 삭제는 REQ-ST-007(destructive) 계약을 따른다.
- [ ] **REQ-F-004 주행 기록 입력** (trace: planning-context Must "측정·주행 기록 저장", 핵심 기능 3, A4)
  - Given 등록된 모터 존재, When 기록 입력에서 모터 선택 + 세팅 전압(수동 숫자 입력) + 주행 결과(선택형) + 만족 여부 체크 + 측정값(파노·RPM) 연결 후 저장, Then 기록이 IndexedDB에 영속되고 모터와 참조 관계로 연결된다.
  - Given 측정값 없이 진입(D2 baseline: 허용), When 저장, Then 파노·RPM 필드는 비운 채 저장된다. 측정값은 optional이다.
  - Given 전압 필드에 비수치·음수·범위 밖 값, When 저장 시도, Then 저장이 거부되고 필드 단위 검증 오류가 표시된다 (허용 범위는 ASSUMPTION A5).
  - Given 모터 미선택, When 저장 시도, Then 저장이 거부된다 (기록은 반드시 모터에 소속 — dangling reference 금지).
  - Given 저장 버튼을 연속 탭, When IndexedDB write 진행 중, Then 중복 기록이 생성되지 않는다 (제출 중 재요청 방지).
- [ ] **REQ-F-005 모터·기록 목록 조회** (trace: planning-context surface 3, 성공 조건 3, Critical State Inventory "모터 목록/이력")
  - Given 저장된 모터·기록 존재, When 목록 진입, Then IndexedDB에서 읽어 모터 목록과 기록 목록(모터·전압·측정값·결과·만족 표시)이 렌더된다.
  - Given 브라우저 종료 후 재방문, When 목록 진입, Then 이전 기록이 그대로 표시된다 (persistence recovery — 성공 조건 3).
  - Given IndexedDB 읽기 실패, When 목록 진입, Then 빈 목록으로 위장하지 않고 오류 상태와 재시도 경로를 표시한다 (→ REQ-ST-005).
  - 기록 삭제는 REQ-ST-007(confirm) 계약을 따른다.
- [ ] **REQ-F-006 전압 세팅 가이드 (추천 범위 + 근거 표시)** (trace: 핵심 기능 4, DL-004, planning-context 성공 조건 4)
  - Given 특정 모터에 '만족' 기록 3건 이상(D1 baseline), When 가이드에서 해당 모터 선택, Then 만족 기록의 전압 분포 기반 추천 전압 범위와 근거가 된 만족 기록 목록(전압·측정값·결과)이 함께 표시된다. 고정 규칙 계산이며 AI가 아니다 (집계 규칙 상세는 ASSUMPTION A6).
  - Given 만족 기록이 3건 미만, When 모터 선택, Then 추천 범위를 표시하지 않고 "기록 부족 — n건 더 필요" 안내를 표시한다 (→ REQ-ST-006, D1).
  - Given 만족 기록의 전압 분산이 큰 경우, When 추천 계산, Then 범위를 그대로 넓게 표시하되 분산이 큼을 알 수 있게 근거 기록으로 확인 가능해야 한다 (표현 방식은 Phase 2 ux-brief).
  - Given 기록 추가/삭제 직후, When 가이드 재진입, Then 추천 범위가 최신 기록 기준으로 재계산된다 (stale 집계 금지).
- [ ] **REQ-F-007 IndexedDB 영속 및 안전 복구** (trace: 핵심 기능 5, LOCAL_DOMAIN_STATE_MODE, local-domain-state 계약)
  - Given motors/records가 IndexedDB에 저장됨, When 새로고침·브라우저 재시작 후 rehydrate, Then persisted 데이터는 외부 입력으로 취급해 검증 후 로드한다 (type assertion만으로 rehydrate 금지).
  - Given 구버전 schema 또는 손상된 데이터, When rehydrate, Then migrate 또는 안전 복구 UI로 연결한다 — 무한 crash loop 금지 (→ REQ-ST-005).
  - Given 임의 mutation 완료 후, Then dangling reference(모터 없는 기록), duplicate ID가 존재하지 않는다 (불변식 — state-contract-designer가 상세화).

### Should Have

- [ ] **REQ-F-008 측정값 자동 채움 (측정→기록 한 흐름)** (trace: planning-context Should, UX Check "측정 완료 → '기록으로 저장'이 바로 이어짐")
  - Given `stable` 확정값 존재, When "기록으로 저장" 진입, Then 파노·RPM이 기록 입력 폼에 자동 채워진다. `weak-signal`·미측정 상태에서는 채우지 않는다 (실패 값 오염 금지).
- [ ] **REQ-F-009 모터별 기록 이력 모아보기** (trace: planning-context Should "모터별 기록 이력 목록" — 상대 비교의 근거)
  - Given 특정 모터 선택, When 이력 진입, Then 해당 모터의 측정·주행 기록만 시간순으로 모아 표시된다 (수치 목록 — 차트 아님).

### Could Have (이후 단계)

- [ ] **REQ-F-010 모터별 고조파 가중치 캘리브레이션 프로필** (trace: v2 §1 — "가중치는 물리 기반 고정값으로 시작, 모터별 캘리브레이션 프로필은 후속 확장")
- [ ] **REQ-F-011 10 ms hop 고급 옵션** (trace: v2 §4 — 성능 검증 후 선택 가능한 고급 옵션, 기본 25 ms)

### Won't Have (이번 범위 제외 — 명시)

- **주행 중 측정** (DL-003: 공회전 근접 측정만 범위. 거리·도플러·주변 소음으로 신호 품질 보장 불가)
- **전압 자동 측정** (웹에서 측정 불가 — 수동 입력만, planning-context 기술 고지)
- **서버 동기화·계정** (단일 사용자·단일 기기, A3)
- **시계열 차트 / 스펙트럼·파형 시각화** (수치로만 표시 — 사용자 심플 요구)
- 데이터 export/import, AI 추천, 광학 타코미터 수준 절대 정확도 보장 (planning-context Won't 승계)

## 상태 요구사항 (Critical States 승격 — 전부 Must)

planning-context Critical State Inventory의 각 상태를 요구사항 ID로 승격한다.

- [ ] **REQ-ST-001 마이크 권한 거부·영구 거부** (trace: Critical State "측정 화면 permission", UX Check)
  - Given 권한 프롬프트에서 거부, When 측정 시도, Then `no-permission` 상태와 재시도 경로(다시 요청 버튼)를 표시한다.
  - Given 영구 거부(브라우저가 프롬프트를 다시 띄우지 않음), When 측정 시도, Then 일시 거부와 **다른 메시지**로 브라우저 설정에서 권한을 복구하는 방법을 안내한다 (일시/영구를 같은 메시지로 뭉치지 않는다).
- [ ] **REQ-ST-002 비보안 컨텍스트(HTTPS 아님)** (trace: Critical State, 기술 고지 "HTTPS 필수")
  - Given `window.isSecureContext === false`, When 측정 화면 진입, Then 녹음 활성화 버튼을 비활성화하고 "HTTPS에서만 측정 가능" 안내를 표시한다. getUserMedia 호출 실패를 권한 거부로 오표시하지 않는다.
- [ ] **REQ-ST-003 weak-signal (신호 약함·피크 미검출·무음)** (trace: Critical State, v2 신뢰 게이트)
  - Given 신뢰 게이트 미달(고조파 SNR < 8 dB 또는 검출 고조파 < 2 또는 voicing 미달), Then 수치 미표시 + `weak-signal` 표시. "측정 실패"와 "측정값"은 시각적으로 명확히 구분한다.
  - Given 무음 입력(진폭 0), Then `weak-signal` — **0 RPM 표시 금지** (fixture "무음").
- [ ] **REQ-ST-004 iOS AudioContext suspended** (trace: Critical State, v2 §2, UX Check "suspended를 사용자는 알 수 없다")
  - Given `AudioContext.state !== 'running'`(iOS 자동재생 정책 등), When 측정 시작 시도 또는 측정 중 전환, Then 측정을 시작/지속하지 않고 `suspended` 상태와 "화면을 탭해 다시 시작" 복구 동선을 표시한다. 무음 입력이 0 RPM이나 임의 수치로 표시되면 안 된다.
- [ ] **REQ-ST-005 IndexedDB 실패·quota·private 모드** (trace: Critical State "기록 입력 error/partial", local-domain-state 계약)
  - Given IndexedDB write 실패(quota 초과 포함), When 저장, Then 실패를 명시적으로 표시하고 입력값을 유지한 채 재시도할 수 있다 — 저장 성공으로 오표시 금지, 입력 데이터 소실 금지.
  - Given private 모드 등으로 IndexedDB 사용 불가, When 앱 시작, Then 측정은 가능하되 "기록 저장 불가" 상태를 사전 고지한다.
  - Given parse/migration 실패, When rehydrate, Then 복구 UI 또는 reset 경로로 연결한다 (crash loop 금지).
- [ ] **REQ-ST-006 만족 기록 부족 (가이드)** (trace: Critical State "전압 가이드 empty", D1)
  - Given 만족 기록 < 3건(D1 baseline), Then 추천 미표시 + "기록 부족 — n건 더 필요" 안내. 0건과 1~2건 모두 동일 계약 (n은 실제 부족 건수).
- [ ] **REQ-ST-007 삭제 destructive (기록 삭제 confirm, 모터 삭제 cascade)** (trace: Critical State "모터 목록/이력 destructive", D3, local-domain-state 불변식)
  - Given 기록 삭제 시도, When 삭제 탭, Then confirm 후에만 삭제되고 목록·가이드 집계에 즉시 반영된다.
  - Given 소속 기록이 있는 모터 삭제 시도(D3 baseline: cascade), When 삭제 탭, Then "기록 n건이 함께 삭제됩니다" confirm을 표시하고, 확인 시 모터와 소속 기록을 함께 삭제한다. 삭제 후 dangling reference가 없어야 한다.
  - Given confirm 취소, Then 아무것도 삭제되지 않는다.
  - UI의 숨김·필터 결과 개수로 삭제 가능 여부를 판단하지 않는다 (MVP에는 목록 필터가 없으므로 filtered-view 삭제 시나리오는 해당 없음 — REQ-F-009 모터별 모아보기 도입 시 state-contract에서 재검증).

## 비기능 요구사항

- **REQ-NFR-001 성능** (trace: v2 §4): 12 kHz 데시메이션·25 ms hop 기준 모바일 1코어 점유 20% 미만, UI 업데이트 ≥ 10 Hz, 측정 시작→확정 3 s 이내. 분석 전체 Web Worker 수행(메인 스레드 점유 금지). 측정 환경: 실기기 모바일(iOS Safari 우선). max fixture(A7: 모터 30개·기록 1,000건)에서 목록 렌더·가이드 계산·삭제 반영이 체감 지연 없이(상호작용 p95 < 200 ms) 동작.
- **REQ-NFR-002 반응형**: 모바일 우선 세로 레이아웃(측정 화면은 대형 수치 중심 1-action 화면 — UX Check). 태블릿/데스크탑에서도 깨짐 없이 사용 가능(별도 최적화는 범위 외).
- **REQ-NFR-003 접근성**: WCAG 2.2 AA. 측정 status 전이(`measuring→stable→weak-signal` 등)는 색만이 아닌 텍스트로 구분하고 aria-live로 알린다. 모든 인터랙션(활성화 버튼, 폼, confirm 대화상자) keyboard 도달·조작 가능, confirm 닫힘 후 focus 복귀. 터치 target size 최소 44×44px(모바일 주 사용). 인증 없음(로그인 없는 개인 도구)이므로 accessible authentication 요구는 해당 없음.
- **REQ-NFR-004 브라우저**: iOS Safari(최신 및 직전 메이저) 우선, Android Chrome 최신. 요구 API: getUserMedia, AudioWorklet, Web Worker, IndexedDB, secure context. 검증 범위 — 합성 fixture unit은 CI, 권한·suspended·실측은 Phase 2 실기기 세션(iOS Safari 우선, DL-006).
- **REQ-NFR-005 측정 품질(상대 비교 신뢰성)** (trace: v2 §3 — 합성 신호 fixture 합격 기준을 그대로 수용 기준으로 사용):
  | Fixture | 합격 기준 |
  |---|---|
  | 순음 300 Hz | f₀ 오차 < 0.3 Hz |
  | 배음 지배(약한 300 + 강한 900/1800 Hz) | f₀=300 채택 (3·6배 오판 금지) |
  | 고조파 오염(+1805 Hz 독립 톤) | 일치도 검사가 6차 제외, f₀ 유지 |
  | 잡음 SNR 10 dB | f₀ 오차 < 0.5 Hz, 게이트 통과 |
  | 잡음 SNR 0 dB | `weak-signal` (오값 표시 금지) |
  | 무음 | `weak-signal`, 0 RPM 표시 금지 |
  | 스핀업 chirp 200→500 Hz/2 s | 추적 지연 < 0.5 s, 점프 오작동 없음 |
  | 옥타브 유혹 | 추적 출력에 옥타브 점프 없음 |
  VP 정밀도는 CRLB 대비 sanity 테스트(이론 분산의 3배 이내)로 확인.
- **REQ-NFR-006 데이터 안전(local-domain-state)**: storage schema에 version 필드, migration 경로, invalid-state recovery 정의. persisted JSON 검증 후 rehydrate. quota/parse 실패는 복구 UI로 연결. 브라우저 데이터 삭제 시 기록 소실은 허용(A3 — export는 Won't, 소실 위험 고지).

## 화면 목록

1. **측정 화면** — 녹음 활성화 → 파노·RPM 대형 수치 표시. status 6종 전환의 중심 (REQ-F-001/002, REQ-ST-001~004)
2. **기록 입력 화면** — 모터·전압·측정값(optional)·주행 결과·만족 체크 저장 (REQ-F-004, REQ-ST-005)
3. **모터·기록 이력 화면** — 모터 CRUD + 기록 목록·삭제 (REQ-F-003/005/009, REQ-ST-007)
4. **전압 가이드 화면** — 모터 선택 → 추천 전압 범위 + 근거 기록 (REQ-F-006, REQ-ST-006)

## API 필요 목록 (기능 기준)

서버 API 없음 (서버리스 정적 호스팅, DL-005). 대신 다음 로컬 계약이 서버 API를 대체한다 — Phase 2 state-contract·설계의 입력.

- **브라우저 API**: `getUserMedia(audio constraints — v2 §2 고정값)`, `AudioContext`/`AudioWorklet`(수집), `Web Worker`(분석), `IndexedDB`(영속), `isSecureContext`(사전 점검)
- **분석 엔진 인터페이스** (v2 §5, 순수 함수 계층 — fixture 단위 테스트 대상): `estimateFrame(pcm) → candidates`, `refine(candidate) → f₀`, `track(estimates) → display{f0, rpm, confidence, status}`
- **IndexedDB store (기능 기준)**: `motors`(id, 이름/라벨, 상태 메모, createdAt) / `records`(id, motorId 참조, 전압, 파노·RPM optional, 주행 결과, 만족 여부, createdAt) / schema version — 상세 스키마·불변식은 state-contract-designer 산출물에서 확정
- **가이드 계산 (로컬 순수 함수)**: `recommend(motorId) → { range, evidenceRecords } | { insufficient, needed }` — 만족 기록 전압 분포 고정 규칙 (A6)

## Scenario Review (scenario-contract 매핑)

적용 카테고리: C(데이터 변경)·D(비동기/에러)·E(빈 상태/경계)·F(피드백)·H(폼) + 권한/destructive. A(선택 상태)·B(라우팅 경계)·G(서버 권한)·I(동시성/실시간)·J~M(분석 빌더)은 해당 없음 — 단일 사용자, 서버 없음, 사용자 정의 집계 없음, cross-tab 동기화는 Won't 수준의 단일 기기 도구(state-contract에서 동시 탭 시 마지막 쓰기 정책만 명시).

Evidence: `unit` = Vitest(합성 신호 fixture, 가이드 계산, IndexedDB seed — fake-indexeddb), `browser` = 브라우저 자동화 테스트, `device` = Phase 2 실기기 수동 검증(iOS Safari 우선 — mock 재현 불가 항목, DL-006).

| ID | 관련 REQ | Scenario | Expected Behavior | Evidence | Status |
|---|---|---|---|---|---|
| D-1 | REQ-F-001 | 정상: 탭 → 권한 허용 → 캡처 시작 | 탭 핸들러 내 getUserMedia(DSP off)+resume(), 실제 sampleRate 반영, `measuring` 전이 | browser + device | ✅ |
| D-2 | REQ-ST-001 | 실패: 권한 일시 거부 | `no-permission` + 재시도 버튼 | browser(권한 mock) + device | ✅ |
| D-3 | REQ-ST-001 | 실패: 권한 영구 거부 | 일시 거부와 다른 메시지 + 브라우저 설정 복구 안내 | device | ✅ |
| D-4 | REQ-ST-002 | 경계: HTTP(비보안 컨텍스트) 접속 | 활성화 버튼 비활성 + HTTPS 안내, 권한 오류로 오표시 안 함 | browser | ✅ |
| D-5 | REQ-ST-004 | 실패: iOS suspended 상태에서 측정 시작/중단 | 측정 미시작, `suspended` + 재개 동선, 무음이 0 RPM으로 표시 안 됨 | device (+ unit: state guard) | ✅ |
| D-6 | REQ-F-002 | 정상: 유효 신호 측정 | 3 s 이내 `stable` 확정, 파노 소수 1자리·RPM 정수 | unit(fixture 순음·SNR10dB) + device | ✅ |
| D-7 | REQ-F-002 | 경계: 배음 지배·고조파 오염·옥타브 유혹·스핀업 | v2 §3 합격 기준 전부 충족 (3·6배 오판/옥타브 점프 금지, 추적 지연 <0.5 s) | unit(fixture 4종) | ✅ |
| D-8 | REQ-ST-003 | 실패: 무음/SNR 0 dB | `weak-signal`, 수치·0 RPM·이전 값 표시 금지 | unit(fixture 무음·SNR0dB) + browser(상태 표시) | ✅ |
| D-9 | REQ-F-002 | 경계: weak-signal→유효 신호 회복 | `weak-signal`→`measuring`→`stable` 재전이, 잔존 stale 값 없음 | unit + browser | ✅ |
| H-1 | REQ-F-004 | 정상: 모터+전압+결과+만족 저장 | IndexedDB 영속, 목록 반영 | unit(seed) + browser | ✅ |
| H-2 | REQ-F-004 | 실패: 전압 비수치/범위 밖·모터 미선택 | 필드 단위 검증 오류, 저장 안 됨 | unit + browser | ✅ |
| H-3 | REQ-F-004 (D2) | 경계: 측정 없이 직접 입력 | baseline 허용 — 측정값 비운 채 저장 | unit + browser | ❓ D2 |
| H-4 | REQ-F-004 | 경계: 저장 중 중복 탭 | 중복 기록 생성 안 됨 | browser | ✅ |
| H-5 | REQ-F-008 | 정상: stable 확정 후 기록 진입 | 파노·RPM 자동 채움. weak-signal이면 채우지 않음 | browser | ✅ |
| C-1 | REQ-F-003 | 정상: 모터 등록/수정 | 영속 + 구조 필드 불변 | unit + browser | ✅ |
| C-2 | REQ-ST-007 | destructive: 기록 삭제 | confirm 후 삭제, 가이드 집계 즉시 반영, 취소 시 무변경 | unit + browser | ✅ |
| C-3 | REQ-ST-007 (D3) | destructive: 소속 기록 있는 모터 삭제 | baseline cascade — "기록 n건 함께 삭제" confirm 후 함께 삭제, dangling reference 없음 | unit + browser | ❓ D3 |
| C-4 | REQ-ST-005 | 실패: write 실패/quota 초과 | 실패 명시 + 입력값 유지 + 재시도, 성공 오표시 금지 | unit(write 실패 주입) | ✅ |
| C-5 | REQ-ST-005 | 경계: private 모드/IndexedDB 불가 | 측정 가능 + "저장 불가" 사전 고지 | browser + device | ✅ |
| C-6 | REQ-F-007 | 경계: 손상/구버전 데이터 rehydrate | 검증→migrate 또는 복구 UI, crash loop 금지 | unit(invalid seed) | ✅ |
| E-1 | REQ-F-003/005 | empty: 모터 0개 / 기록 0건 | 등록 유도 빈 상태 (오류로 위장 금지) | browser | ✅ |
| E-2 | REQ-ST-006 (D1) | empty/경계: 만족 기록 0·1·2건 | baseline — 추천 미표시 + "n건 더 필요" 안내 | unit(seed 0·1·2건) + browser | ❓ D1 |
| E-3 | REQ-F-006 | 정상: 만족 기록 3+건 | 추천 범위 + 근거 기록 목록 표시 | unit(seed) + browser | ✅ |
| E-4 | REQ-F-006 | 경계: 전압 분산 큰 만족 기록 | 넓은 범위 그대로 + 근거로 확인 가능 (표현은 ux-brief) | unit(분산 seed) | ✅ |
| E-5 | REQ-NFR-001 | 경계: max fixture(모터 30·기록 1,000) | 목록·가이드·삭제 상호작용 p95 < 200 ms | browser(max seed) | ❓ A7 |
| E-6 | REQ-F-005 | 정상: 재방문 persistence | 브라우저 재시작 후 기록 유지 | browser(재로드) | ✅ |
| F-1 | REQ-NFR-003 | 접근성: status 전이 announce, confirm focus 복귀, keyboard 전 경로 | aria-live 알림, focus trap/복귀, 44px target | browser(a11y 검사) | ✅ |

성공 흐름만 있는 Must는 없다 — 각 Must는 최소 1개 실패 또는 경계 시나리오를 갖거나 해당 없음 근거(위 카테고리 제외 사유)를 명시했다.

## Open Decisions (승계)

### NEEDS_DECISION — 각각 ASSUMPTION baseline으로 진행, 사용자 확인 시 교체

- **D1. 가이드 최소 '만족' 기록 건수와 미달 시 표시**
  - ASSUMPTION baseline: **3건 미만이면 추천 미표시 + "기록 부족 — n건 더 필요" 표시** (오케스트레이터 baseline. planning-context 초안은 "2건 미만이면 안내만"이었음 — 확정 시 임계값 상수 하나만 교체되도록 구현).
  - 영향: REQ-ST-006, REQ-F-006, 시나리오 E-2. 검증: seed 0·1·2·3건 unit.
- **D2. 측정 없이 직접 기록 입력 허용 여부**
  - ASSUMPTION baseline: **허용, 측정값(파노·RPM) optional** (측정 실패여도 주행 기록은 남기고 싶은 케이스 — planning-context 제안과 일치).
  - 영향: REQ-F-004, 기록 스키마(측정값 nullable), 시나리오 H-3.
- **D3. 모터 삭제 시 소속 기록 처리**
  - ASSUMPTION baseline: **confirm("기록 n건이 함께 삭제됩니다") 후 cascade 삭제** (planning-context 제안과 일치. 대안: 삭제 차단 — 기록 먼저 삭제 요구).
  - 영향: REQ-ST-007, store cascade command, 시나리오 C-3.

### ASSUMPTION (planning-context A1~A4 승계 + 신규)

- **A1**. 파노값 = FFT/pYIN 파이프라인의 기본 주파수 f₀(Hz) (DL-002, 오케스트레이터 해석·사용자 고지). 검증: 첫 검토에서 사용자 확인. 다른 의미면 표시 계층 라벨/환산식만 교체.
- **A2**. RPM = f₀ × 60 (3극 브러시드, 정류 성분 3f₀/6f₀와 구분 — v2 파이프라인이 담당). 검증: 합성 fixture + 실측 12,000~30,000 RPM 대역 확인.
- **A3**. 단일 사용자·단일 기기 — 브라우저 데이터 삭제 시 소실 허용, export는 Won't. 검증: 소실 위험 고지 후 이의 없으면 유지.
- **A4**. "모터 상태"·"주행 결과"는 선택형 입력으로 심플화, 구체 선택지는 Phase 2 ux-brief에서 확정.
- **A5 (신규)**. 세팅 전압 입력 허용 범위: 양수, 소수 1~2자리, 0.1~9.9 V. 검증: 사용자 실사용 전압대(예: 2.4~3.2 V) 확인 후 조정 — 검증 상수만 교체.
- **A6 (신규)**. 가이드 고정 규칙: 추천 범위 = 해당 모터 '만족' 기록 전압의 min~max (D1 임계 충족 시). 분산 표현·반올림은 ux-brief에서 확정. 검증: seed fixture 계산 + 사용자 검토.
- **A7 (신규)**. max fixture 규모 = 모터 30개·기록 1,000건, 상호작용 예산 p95 < 200 ms. 검증: 개인 도구 실사용 규모 확인 후 조정.

### BLOCKER

- 제품 blocker 없음. 승계된 운영 항목: (1) Mock→real 실기기 검증은 Phase 2 사용자 참여 필요(owner: 사용자, DL-006), (2) harness 산출물 경로 소유권 정책(planning-context BLOCKER — 오케스트레이터 결정 사항, 본 문서는 허용 경로 harness root `_workspace/01_plan/`에 작성).

## Traceability 요약

| Requirement | planning-context / decision-log / algorithm v2 근거 |
|---|---|
| REQ-F-001 | Must "마이크 권한 흐름", DL-001, v2 §2 캡처 계약 |
| REQ-F-002 | Must "녹음→FFT→RPM", 성공 조건 1·2, DL-001/003, v2 §0·§1·§3·§4 |
| REQ-F-003 | Must "모터 엔티티 CRUD", 핵심 기능 2 |
| REQ-F-004 | Must "측정·주행 기록 저장", A4, D2 |
| REQ-F-005 | surface 3, 성공 조건 3, Critical State "모터 목록/이력" |
| REQ-F-006 | Must "추천 전압 범위", DL-004, D1, A6 |
| REQ-F-007 | LOCAL_DOMAIN_STATE_MODE, local-domain-state 계약, DL-006 |
| REQ-F-008/009 | planning-context Should 2건 |
| REQ-ST-001~007 | Critical State Inventory 행별 승격 (permission/HTTPS/weak-signal/suspended/IndexedDB/가이드 부족/destructive) |
| REQ-NFR-001~006 | v2 §4 성능 예산, UX Check, 기술 고지(브라우저), v2 §3 fixture, A3 |
