# Data Governance — 레이스 AI Phase 2 (2026-07-31, 경량)

> 근거: `01_plan/race-ai/{project-brief,requirements,feature-plan}.md`, `ai-requirements.md`, DL-029. 코드 실사: `race-record/model/schema.ts`, `motor/model/schema.ts`, `api/_lib/db.js`, `api/data.js`. 1인 개인 도구(사용자=본인) 기준 — 기업용 프레임 미적용. (기록 주체: 오케스트레이터 대필 — ownership hook.)

## 1. 데이터 분류 (실사)

| 데이터 | 내용 | 민감도 | AI 전송 |
|---|---|---|---|
| RaceRecord | voltage·panoHz·result·lapTimeMs·goal·retireReason(enum)·createdAt | 개인 취미 수치 — PII 아님 | 부분(§2 화이트리스트) |
| Motor | **name(자유 텍스트)**·id·kind·sortOrder·stabilityBestCvs | name만 잠재 식별성 | **전면 제외** |
| MeasureRecord | panoHz·rpm·measuredAt·stabilityCv | 수치 — PII 아님 | **전면 제외**(W4) |
| 계정 | 구글 **sub**(PK)·**email·name·picture**(Neon `users`, `upsertUser`) | 실 PII — 유일한 PII | **전면 제외** |
| AI 응답 | 섹션형 JSON | 파생 해석 | 비영속(L1, REQ-RAI-006) |

- 앱의 PII는 계정 프로필뿐이며 용도는 인증·동기화 스코프(`session.sub`)로 한정. 도메인 데이터와 AI 경로에는 미등장.
- **각주(코드 실사 — 별도 이슈)**: `race_records` 서버 테이블에 `retire_reason` 컬럼이 **없어** retireReason은 현재 IndexedDB에만 존재하고 서버 동기화에서 탈락한다. AI payload에는 포함되는 필드이므로 동기화 스키마 정합이 필요(§7 체크리스트).

## 2. 제3자(Anthropic API) 전송 목록 — 핵심

**화이트리스트(이것만 나간다)**: ① races ≤20건 — voltage·panoHz·result·lapTimeMs·goal·retireReason(leaf key)·createdAt·weight ② insight — R22 `computeRaceInsight` 파생값 전체 ③ retireReasonMeta — 등장 leaf의 key·pathLabel·speedRelated·causal(앱 상수 유래, 사용자 입력 아님) ④ excludedNoReason(정수).

**명시적 제외(부재를 테스트한다)**: 모터 name·모터 id·motorId·RaceRecord id·구글 sub·email·세션/토큰·MeasureRecord·자유 텍스트 일체·**advisorVoltage(DL-029 제거)**.

**강제 방식(요구사항화)**: U2 직렬화기는 **화이트리스트 방식**(필드 명시 선택)으로만 조립 — 원본 객체 spread·통과 금지. unit test는 포함 필드 정합에 더해 **제외 필드의 부재를 직접 assert**한다(AC-3 확장).

## 3. 보관·삭제

- **앱 측**: 프롬프트·응답 모두 비영속 — IndexedDB·Neon 어디에도 저장하지 않고 새로고침 시 소멸(REQ-RAI-006). 삭제 절차가 필요 없는 구조가 곧 정책.
- **제3자 측**: Anthropic API의 입력 보존·학습 사용 여부는 **앱이 통제할 수 없는 영역**이며 현행 정책은 **확인 필요**(웹 리서치 미수행 — 단정하지 않음). 완화는 정책 신뢰가 아니라 §2 최소화로 달성: 유출 최악 케이스가 "익명 수치+enum ≤20건"이 되도록 설계.

## 4. 로그 (서버 함수)

- `api/analyze-race.js`는 **프롬프트·응답 본문을 로그에 남기지 않는다**. 허용: 상태 코드·지연·토큰 수·racesUsed·verdict 수준 메타데이터.
- 실패 경로 포함 — 파싱 실패·스키마 위반 시에도 모델 원문 미로깅(길이·사유 코드만). 업스트림 에러 body를 `console.error`로 흘리는 패턴 금지(본문이 로그에 영속되면 §3 "비저장"이 무의미).

## 5. 사용자 스코프

- 엔드포인트는 `requireSession` 필수. 서버는 분석 시 **DB를 읽지 않으므로**(payload는 클라 조립) 타인 데이터가 응답에 섞일 경로가 구조적으로 없다 — 기밀성 성립.
- **함의(정직하게)**: 반대로 서버는 "이 races가 그 세션 사용자의 데이터인가"를 **검증할 수 없다**. 로그인 사용자가 임의 수치를 넣을 수 있으나 L1·비저장·본인 화면 표시이므로 피해 대상은 본인의 API 비용뿐. 보호 대상은 데이터가 아니라 **키 비용**이며 방어는 requireSession(+allowlist)·rate limit·max_tokens·20건 컷으로 충분 — 서버측 소유 검증 도입은 과설계로 판정(미채택).

## 6. 동의·투명성

- 본인 데이터·본인 도구라 동의 다이얼로그는 불요. 단 "로컬 전용"이던 앱에서 **외부 전송이 처음 생기는 지점**이므로 최소 고지는 필요: 응답 카드의 AI 표식 캡션(U5)에 "외부 AI(Anthropic)로 기록 요약이 전송됨" 1줄 포함. 별도 화면·설정 토글 없음 — 캡션 1줄이 상한.

## 7. 요구사항으로 옮길 체크리스트

- [ ] U2: 화이트리스트 조립 강제 + 제외 필드 부재 unit test(§2) — AC-3 확장
- [ ] U4: 프롬프트·응답 본문 무로깅, 메타데이터만(§4) — 실패 경로 포함
- [ ] U5: 외부 전송 고지 캡션 1줄(§6) — 기존 AI 표식 문구에 병합
- [ ] Anthropic 입력 보존·학습 정책 확인(owner 사용자, 확인 후 §3 갱신)
- [ ] **`race_records.retire_reason` 동기화 스키마 누락(§1 각주) — AI 근거 데이터가 서버 동기화에서 유실되므로 선행 수정 필요**
