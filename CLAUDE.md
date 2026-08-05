# minicar-motor-lab

미니카 모터 파노(RPM) 측정·기록 웹앱. Vite SPA + Vercel serverless(`api/`), main push → Vercel 자동 배포.

## 배포 프로토콜 (버전 규율)

**배포는 반드시 버전을 올린다.** 원커맨드:

```bash
pnpm run release        # patch +1 → 버전 커밋+태그 → main push → Vercel 배포
pnpm run release:minor  # 기능 단위가 클 때
```

- 작업 커밋들을 먼저 만들고, **마지막에 release로 마감**한다 (`pnpm version`은 clean tree 요구).
- 버전 기준선은 내부 리비전 넘버링(v2.x)과 정렬 — 2.41.0부터 시작(2026-08-05 확정).
- 버전 표시: 모터 탭 페이지 하단 caption `v{semver} ({sha} · {MM-DD})` — 원천은
  `vite.config.ts`의 define 주입(`__APP_VERSION__`/`__BUILD_SHA__`/`__BUILD_TIME__`),
  소비는 `src/shared/config/version.ts` 한 곳(R52). 로직 분기·캐시 키에 사용 금지.

## toolchain

Node 22.22.3 + pnpm 11.18.0 (engines 핀). 검증: `pnpm typecheck && pnpm test`.
