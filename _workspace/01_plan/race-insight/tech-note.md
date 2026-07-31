# Tech Note — 레이스 인사이트 (race-insight, 범위 한정)

> 전체 스택은 `tech-stack.md` 고정 — 본 문서는 race-insight 추가분만 판정한다. 근거 전부 로컬(웹 리서치 0건). 새 제품 결정 없음(D1~D3 유지). 기록 주체: 오케스트레이터 대필(ownership hook).

## 1. 신규 runtime dependency — S·M 모두 0건

- **S안(텍스트 카드): 0건.** MUI core(`@mui/material` 7.3.0 설치·전면 사용)와 `shared/lib/format`(formatVoltage 등, RaceRecordRow와 동일 표기원) 재사용으로 충분. 신규 표시 프리미티브 없음.
- **M안(미니 차트): 0건.** `@mui/x-charts` **9.10.1**이 이미 exact pin으로 설치되어 있고(`package.json`), `features/motor-management/ui/PanoLineChart.tsx`가 v2.3부터 production 사용 중 — MUI 7.3.0/React 19.2.7 peer 호환은 로컬 동작 실적으로 입증됨. RaceTrendMiniChart는 PanoLineChart의 aria-hidden·회차 X축·subpath import(`@mui/x-charts/LineChart`) 계약을 준용한다.
- 따라서 **Package Changes: 없음** — lockfile operation 불필요, package-scaffolder 경유 대상 아님.

## 2. 파생 계산(U1) 기술 리스크 — 낮음

- **n 추정**: `raceRecords`는 rolling 상한 없음(repository에 cap 로직 부재 확인 — measure의 ≤20건과 다름). 개인 도구·모터당 회차 특성상 현실 n은 수십, 수년 누적 극단이 수백~수천. O(n) 1-pass는 n=10⁴에서도 sub-ms — **가상화 없는 `races.map` DOM 렌더가 항상 먼저 병목**이 된다. 정렬은 repository가 소유(`byCreatedAtDescIdDesc`)하므로 U1의 "재정렬 금지"(NFR-003)는 입력 순서 신뢰로 성립.
- **렌더 중 계산으로 시작**: RaceDetailPage는 이미 `adviceHistory`/`windowRaces`를 렌더 중 인라인 계산한다 — 동일 패턴 유지가 정합. `racesQuery.data`는 TanStack Query structural sharing으로 참조 안정이라 `useMemo(deps: [races, sampleWindow])`가 언제든 성립 가능.
- **useMemo 도입 판단 기준(Phase 2/3에서 판단 — 지금 확정 아님)**: ① `RaceInsightCard`를 `React.memo`로 감싸거나 insight 객체를 effect deps에 쓸 때(객체 identity 필요), ② M안 차트 series 배열의 참조 안정 필요 시, ③ F7(20+ fixture)·burst n 실측에서 계산 시간이 유의미할 때 — 그 전 선제 도입 금지.

## 3. `selectAdviceWindow` 추출 refactor 리스크 — 계약 보존 조건

- 현행: RaceDetailPage.tsx **155-161행** 인라인 — `findIndex(result==='finished')` → `slice(0, idx+1)`, 미발견 시 `slice(0, RECENT_FALLBACK=5)`. 입력은 최신순(desc) 전제.
- 보존 조건: ① desc 입력 가정·완주 **포함** slice·fallback 5 동일(상수도 함께 이동), ② 페이지는 import 치환만 — `assignExponentialWeights` 입력 경로·이후 로직 무변경, ③ 회귀 테스트 fixture(완주 있음/없음/0건/전부 이탈)에서 인라인과 결과 동일 단언(feature-plan 명시 안전망).
- FSD 방향성: `entities/race-record` → `shared/lib/voltage-advisor` import는 허용 방향 — 위반 없음. 추출 후 소비처 2곳(추천 이력·insight `sampleWindow:'advisor'`)이 단일 정의 공유 → D2 뒤집힘 시 변경 1곳으로 수렴(장점이자, D2 미결 상태에서 두 소비처가 자동 동조된다는 점을 [보는 법] 문구가 설명해야 하는 이유). ⚠️ D2의 band 퇴화 flag(feature-plan)는 본 note 범위 밖 — plan review 소관.

## 4. 번들 영향 — M안만 해당, 수용 가능

- 현재 `@mui/x-charts` 사용처는 `PanoLineChart.tsx` **단 1곳**, 소비는 `pages/motor-detail`뿐. 라우트는 전부 `lazy: () => import(...)` 분할이고 `vite.config.ts`는 manualChunks 없음(기본 분할 정책 주석 명시) — **레이스 상세 청크는 현재 x-charts를 로드하지 않는다**(RaceDetailPage import 0건 확인).
- M안 배선 시 Rollup이 x-charts를 motor-detail·race-detail **공유 청크**로 분리 — 중복 번들 없음, 모터 상세를 먼저 본 세션이면 캐시 적중. 비용은 `/race/:motorId` 최초 진입 시 신규 다운로드 1회뿐.
- 수용 기준: requirements §비기능에 번들 예산 없음 + 정적 CDN 캐시 + 오프라인 요건은 IndexedDB 데이터 기준(NFR-004) → **수용**. 단 Phase 3 bundle report에서 ① race-detail 청크 증가분이 x-charts 공유 청크뿐(중복 미발생), ② subpath import 유지(배럴 `@mui/x-charts` 루트 import 금지)를 확인 조건으로 한다.

## 5. 결론 — 스택 변경 0건 + Phase 3 기술 제약

S·M 어느 결정(D1)에서도 dependency 추가·버전 변경·설정 변경 0건. tech-stack.md 개정 불요.

Phase 3에서 지킬 제약:
1. `pnpm add`/버전 변경 금지 — 신규 패키지 필요가 생기면 그 자체가 계획 위반 신호.
2. U1은 순수 함수 + O(n) 1-pass·입력 불변·재정렬 금지(F7로 검증), useMemo는 §2 기준 충족 전 도입 금지.
3. `selectAdviceWindow` 추출은 회귀 테스트(인라인 동일 결과) 선행 후 페이지 치환 — 동작 변경 커밋에 섞지 않는다.
4. M안 차트는 `@mui/x-charts/LineChart` subpath import + PanoLineChart a11y 계약(aria-hidden·disableKeyboardNavigation·canonical=텍스트) 준용, 0~1점 미렌더.
5. 번들 확인은 M안 병합 시 bundle report로 — manualChunks 추가는 중복/cache churn 실측 확인 시에만(기존 vite.config 정책).
