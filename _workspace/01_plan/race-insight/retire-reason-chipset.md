# Feature Plan — 이탈 사유 (race-retire-reason, Phase 1 / 옵션 B)

> 근거: decision-log DL-015(옵션 B — AI 분석 전제 데이터 수집 먼저), DL-016~019(taxonomy·구조 반영).
> race-insight 열람 요약과 **별개 트랙**: 입력 스키마 확장(feature, 규모 M). AI 기능은 B에서 안 나온다 — **라벨된 실패 데이터 수집만**.
> 코드 근거: `domain.ts`(RACE_RESULTS finished/retired), `RaceEntrySheet.tsx:209`(result SegmentControl), `schema.ts`(result optional additive).
> (기록 주체: 오케스트레이터 대필 — ownership hook.)

## 목적

`result='retired'`(이탈)만으로는 **왜** 이탈했는지 모른다 → AI가 전압·파노 상관만으로 원인을 추측하게 됨.
이탈 사유를 라벨된 트리로 수집하면, AI가 사유별로 원인을 가르고(속도형=전압 처방 가능 / 기계형=전압 무관) 정확히 조언한다. 과거 이탈 기록엔 소급 불가 → **지금부터 수집 시작이 이득**.

## Taxonomy — 재귀 트리 (섹션→세부, n단 확장 가능)

구조 결정(D-R5 확정): 평면 칩이 아니라 **재귀 트리**. 섹션을 1탭으로 고르고, 하위 세부가 있으면 이어서 고른다. 세부는 **몇 단이든 더 자랄 수 있다**(예: '공중 자세 무너짐'을 나중에 롤/요/피치로 재분해). 저장은 항상 **가장 구체적으로 고른 노드의 key 하나** — 트리가 그 key로 경로·인과 메타를 복원한다.

Node 모델 (도메인 config, 재귀):
```
RetireReasonNode {
  key: string             // 안정 식별자 — append-only(리네임·삭제 금지)
  label: string
  speedRelated?: boolean  // AI: 전압 처방 가능 여부. 미지정 시 부모에서 상속
  causal?: string         // AI 힌트(예: '밸런스/댐퍼')
  children?: RetireReasonNode[]  // 있으면 branch, 없으면 leaf(=저장 가능)
}
```

현재 트리 인스턴스:
- **속도형** (speedRelated=true — 전압·파노와 관련)
  - `corner` 코너 이탈 — 전압↑→이탈 직결 → 전압 하향 후보
  - `jump` 점프 *(branch)*
    - `jump_overshoot` 비거리 김 — 순수 속도(비거리≈발사속도) → **전압↓ 1순위**
    - `jump_attitude` 공중 자세 무너짐(롤·요·피치) — 밸런스/댐퍼/무게배분, 속도 약한 신호 *(향후 롤/요/피치 재분해 가능)*
    - `jump_rebound` 착지 후 튐 — 착지 에너지=속도+댐퍼 → 전압↓ or 댐퍼
    - `jump_other` 그 외 점프 — 세부 확신 없음(미상)
  - `down_step` 다운 한칸 실패 — 다운 구간 드롭 착지 실패 → 속도 or 밸런스
  - `wave` 웨이브 이탈 — 웨이브 구간 접지 상실·튐 → 속도 or 댐퍼/제진
  - `lane_change` 레인체인지 실패 — LC 구간 이탈 → 속도 과다 후보
- **기계형** (speedRelated=false — 전압 무관)
  - `parts` 파츠 이탈·파손 — 롤러 빠짐·기어·바디 → 전압 조언 제외
  - `stall` 멈춤(완주 전 정지) — 배터리·모터 → 세팅/배터리 지목
- **escape**
  - `other` 기타·기억 안 남 — 미상, AI 표본 제외(추측 금지)

Growth 규칙:
- 세부 추가 = 트리에 leaf 하나 추가(config 1곳). 스키마·migration 불변.
- 섹션이 leaf였다가 branch가 되면(예: 코너→인/아웃) 기존 leaf key는 그 섹션의 "그 외"로 살아남는다(과거 데이터 유효). **key는 append-only(리네임·삭제 금지)** — 앱의 안정 식별자 관례.
- 분기 노드는 "그 외" leaf를 두어 **어느 단계서든 1탭 더로 마감** 가능(과도한 세부 강요 없음 — 트랙사이드 이탈 방지).

AI 신호: leaf key → 트리 경로의 speedRelated(자신 or 상속)·causal 해석. **코스아웃 위치(섹션) + 물리 원인(세부)**을 함께 준다. 예: `jump_overshoot`=(점프 › 비거리 김, 속도) → 전압↓ 확신 / `jump_attitude`=(점프 › 자세, 밸런스) → 댐퍼·무게 / `parts`=(기계) → 전압 조언 제외.

## 데이터 모델 (optional additive — migration 불변)

- `domain.ts`: `RETIRE_REASON_TREE`(재귀 config) **단일 정의**. `RETIRE_REASON_KEYS` = 트리 평탄화(모든 노드 key) — enum·검증의 단일 출처. `RETIRE_REASON_LABELS`·`resolveSpeedRelated(key)`·`reasonPath(key)`는 트리에서 파생(중복 정의 금지).
- `schema.ts`: `retireReasonSchema = z.enum(RETIRE_REASON_KEYS)`. `raceRecordSchema`에 `retireReason: retireReasonSchema.optional()` 추가(goal과 동일 optional additive → read-lenient, 구 데이터 corrupt 판정 안 됨, migration script 불요). 저장은 **가장 구체적으로 고른 노드 key 하나**(leaf 또는 '그 외'). `createRaceRecordDraftSchema`·`updateRaceRecordPatchSchema`에도 추가(result처럼 편집 가능).
- 불변식: retireReason은 result='retired'일 때만 유의미. **강제 방식 = UI 클리어**(result를 완주로 바꾸면 제거) + 스키마 refine 안 함(엣지 데이터 거부 회피). → D-R2.
- 트리가 커져도 스키마 계약은 불변(enum이 트리에서 자동 파생, additive). key append-only라 과거 데이터 항상 유효.

## 입력 UX (RaceEntrySheet) — 재귀 드릴다운

- result SegmentControl(209행) 아래 **조건부 블록**: `draft.result === 'retired'`일 때만 렌더.
- **섹션 칩(1탭)** → 고른 섹션에 children 있으면 **세부 칩 행 노출(다음 탭)** + breadcrumb(예: `점프 ›`) + [뒤로]. children 없으면 그 자리서 확정.
- 재귀: 세부가 또 children을 가지면 계속 드릴다운(현재는 점프만 2단). "그 외"로 어느 단계서든 마감.
- **옵션 필드**(미선택 허용 — 사유 미기록), **단일 선택**(D-R4 권고 — 주 사유 1개), [입력] 활성 조건 불변(전압·파노만).
- result를 이탈→완주/미정으로 바꾸면 retireReason 클리어(고아 방지).
- 재사용: 기존 chip/segment 계열 우선. 트리 드릴다운 컴포넌트는 신규 가능성 높음(44px, aria, breadcrumb 스크린리더 경로).

## 표시 (RaceRecordRow)

- 이탈 행에 사유 경로를 조용히 표기(예: `이탈 · 점프 › 비거리 김` 또는 축약 `이탈 · 비거리 김`) → 목록 가시화 + 수정 진입점. → D-R3.

## Sync/영속

- optional additive라 기존 repository·서버 동기화를 goal과 동일하게 통과. 서버가 미지 필드를 additive로 수용하는지만 확인(대개 무해). production mutation 신규 없음.

## 규모·파일 (M)

- 수정: `domain.ts`(트리 config·파생 헬퍼), `schema.ts`(3곳), `RaceEntrySheet.tsx`(드릴다운 블록), `use-race-entry.ts`(draft 필드 배선), `RaceRecordRow.tsx`(경로 표시), 각 index/barrel. 신규 드릴다운 칩 컴포넌트 1 + 테스트.
- 테스트: 트리 파생(키 평탄화·speedRelated 상속·경로 복원) unit + 스키마 경계(optional·enum·result 클리어) + 컴포넌트 render(섹션→세부 드릴다운·뒤로·그 외 마감·클리어) + 기존 회귀. LOCAL_VERIFIABLE(fixture·프리뷰). 실측정 왕복은 DEPLOY_ONLY.

## Locked Decisions (2026-07-31 사용자 "확정" — DL-020)

- **D-R5 · 구조**: **재귀 트리(섹션→세부, n단 확장)**. 평면 칩 폐기.
- **D-R1 · taxonomy**: 현재 트리로 **확정** — 속도형 5섹션(코너·점프{비거리 김·공중 자세·착지 후 튐·그 외}·다운 한칸·웨이브·레인체인지) + 기계형 2(파츠·멈춤) + escape(기타). 추가 코스 섹션 없음(향후 트리 config append로 언제든 확장 — 스키마 불변).
- **D-R2 · 불변식**: **UI 클리어** — result를 이탈→완주/미정으로 바꾸면 retireReason 제거. 스키마는 refine 안 함(read-lenient 유지).
- **D-R3 · 표시**: 목록 이탈 행에 **말단 라벨** 표시(`이탈 · 비거리 김`). 단 `그 외` 계열 leaf는 모호하므로 섹션 문맥 병기(`이탈 · 점프 · 그 외`).
- **D-R4 · 선택**: **단일 선택**(주 사유 1개). 복합 원인은 향후 별도 결정.
- 스코프 경계(불변): '이탈'이 코스아웃과 멈춤을 함께 덮음 — 분리하려면 result 모델 변경(범위 밖). 지금은 `stall` leaf가 구분.

## Status: READY — 구현 라운드(`/web-orchestrator`) 대기

모든 결정 잠금. 다음은 Phase 3 iterate(existing-change, feature/M): change-scope append → domain 트리·schema·입력 드릴다운·행 표시·테스트 → 게이트 4종 + check-iterate-scope. AI 기능은 이 라운드 범위 밖(데이터 수집만).
