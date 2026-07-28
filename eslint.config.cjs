// ESLint 9 Flat Config (certified 기준선: ESLint 9.39.5 + typescript-eslint 8.57.0).
// root package.json에 "type": "module"이 없으므로 이 파일은 CommonJS로 작성한다
// (eslint.config.js는 package.json의 module system을 따른다).
const js = require('@eslint/js')
const jsxA11y = require('eslint-plugin-jsx-a11y')
const reactHooks = require('eslint-plugin-react-hooks')
const globals = require('globals')
const tseslint = require('typescript-eslint')

// ─── FSD import 경계 (project-brief §확정된 FSD 구조 / feature-plan §2) ──────
// 레이어 5, widgets 미사용 (alias도 미제공). 의존 방향: app → pages → features → entities → shared.
// feature 간·entity 간·page 간 직접 의존 금지 — 측정→기록 handoff는 entities/measurement 경유.
const FSD_LAYER_RULES = [
  {
    layer: 'pages',
    patterns: [
      {group: ['@app/*'], message: 'pages는 app 레이어를 import할 수 없다 (FSD 의존 방향).'},
      {group: ['@pages/*'], message: 'page 간 직접 import 금지 — 공유 로직은 하위 레이어로 내린다.'},
    ],
  },
  {
    layer: 'features',
    patterns: [
      {
        group: ['@app/*', '@pages/*'],
        message: 'features는 상위 레이어(app/pages)를 import할 수 없다 (FSD 의존 방향).',
      },
      {
        group: ['@features/*'],
        message:
          'feature 간 직접 의존 금지 — 측정→기록 handoff는 entities/measurement 경유 (feature-plan §2).',
      },
    ],
  },
  {
    layer: 'entities',
    patterns: [
      {
        group: ['@app/*', '@pages/*', '@features/*'],
        message: 'entities는 상위 레이어를 import할 수 없다 (FSD 의존 방향).',
      },
      {
        group: ['@entities/*'],
        message:
          'entity 간 직접 import 금지 — 다중 store 원자성은 shared/lib/persistence의 withTransaction 사용 (state-contract 위임 1).',
      },
    ],
  },
  {
    layer: 'shared',
    patterns: [
      {
        group: ['@app/*', '@pages/*', '@features/*', '@entities/*'],
        message: 'shared는 상위 레이어를 import할 수 없다 (FSD 의존 방향).',
      },
    ],
  },
]

// 테스트 전용 모듈이 runtime 코드로 새는 것을 금지
const TEST_ONLY_IMPORTS = {
  group: ['@test/*', 'fake-indexeddb', 'fake-indexeddb/*', 'vitest', '@testing-library/*'],
  message: '테스트 전용 모듈은 runtime 코드에서 import할 수 없다.',
}

const TEST_FILE_SUFFIXES = ['**/*.test.{ts,tsx}', '**/__fixtures__/**', '**/testing/**']

// flat config에서 같은 rule은 나중 블록이 통째로 덮어쓰므로, 레이어별로
// runtime(경계 + 테스트 전용 금지) / test(경계만) 블록을 분리 생성한다.
const fsdBoundaryConfigs = FSD_LAYER_RULES.flatMap(({layer, patterns}) => [
  {
    files: [`src/${layer}/**/*.{ts,tsx}`],
    ignores: TEST_FILE_SUFFIXES,
    rules: {
      'no-restricted-imports': ['error', {patterns: [...patterns, TEST_ONLY_IMPORTS]}],
    },
  },
  {
    files: TEST_FILE_SUFFIXES.map(suffix => `src/${layer}/${suffix}`),
    rules: {
      'no-restricted-imports': ['error', {patterns}],
    },
  },
])

// AD-12: 분석 엔진의 DOM/브라우저 전역 접근 0건 강제
const ENGINE_FORBIDDEN_GLOBALS = [
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'Worker',
  'SharedWorker',
  'AudioContext',
  'OfflineAudioContext',
  'requestAnimationFrame',
]

module.exports = tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/.turbo/**',
      '**/cache/**',
      '_workspace/**',
    ],
  },
  {...js.configs.recommended, files: ['**/*.{js,mjs,cjs,ts,tsx}']},
  // type-aware preset은 TS 파일에만 적용한다 (JS/config 파일 제외 — projectService 밖)
  ...tseslint.configs.recommendedTypeChecked.map(config => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {globals: globals.node},
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {...globals.browser, ...globals.node},
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
    },
    rules: {
      // REQ-NFR-003 (WCAG 2.2 AA) 정적 검사 계층
      ...jsxA11y.configs.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
    },
  },
  ...fsdBoundaryConfigs,
  // AD-12: shared/lib/audio-analysis는 zero-dependency 순수 TS —
  // 상대 경로 외 모든 import 금지 + DOM/브라우저 API 접근 0건.
  // (테스트 파일은 vitest import가 필요하므로 위 test 블록 규칙만 적용)
  {
    files: ['src/shared/lib/audio-analysis/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // 상대 경로(`.`으로 시작)만 허용 — group negation은 './x'를 걸러내지 못해 regex로 판정한다
              regex: '^[^.]',
              message:
                'audio-analysis 엔진은 zero-dependency 순수 TS — 상대 경로 외 import 금지 (AD-12).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...ENGINE_FORBIDDEN_GLOBALS.map(name => ({
          name,
          message: `엔진은 DOM/브라우저 API 접근 0건 — '${name}' 사용 금지 (AD-12).`,
        })),
      ],
    },
  },
)
