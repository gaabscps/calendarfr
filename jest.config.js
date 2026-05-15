/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', { jsc: { transform: { react: { runtime: 'automatic' } } } }],
    '^.+\\.mjs$': ['@swc/jest', { jsc: { transform: { react: { runtime: 'automatic' } } } }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(msw|@mswjs|@bundled-es-modules|@open-draft|outvariant|strict-event-emitter|until-async|cookie|rettime|headers-polyfill|lens-list|@exodus)/)',
  ],
  moduleNameMapper: {
    // Plain CSS/SCSS imports in React components use identity-obj-proxy.
    // Exclude paths ending in /shared/tokens.css or /shared/styles.css
    // (those are .css.ts TypeScript modules, not stylesheet imports).
    '^(?!.*(?:tokens|styles)\\.css$).*\\.(css|less|scss)$': 'identity-obj-proxy',
    '^@/test-utils$': '<rootDir>/test-utils/index',
    '^@/test-utils/(.*)$': '<rootDir>/test-utils/$1',
    '^@/(.*)$': '<rootDir>/web/src/$1',
    // ESM source files use .js extensions (required for Node ESM runtime).
    // Jest/swc resolver needs to strip the .js to find the .ts source.
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Resolve @calendarfr/shared to the workspace src directly
    '^@calendarfr/shared$': '<rootDir>/shared/src/index',
    // Redirect isomorphic-dompurify to a Jest-compatible shim.
    // The real package's bundled jsdom v28 pulls ESM-only deps (@asamuzakjp/css-color,
    // @exodus/bytes) that Jest cannot transform; the shim uses root-level dompurify+jsdom.
    '^isomorphic-dompurify$': '<rootDir>/__mocks__/isomorphic-dompurify.js',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/web/dist/',
    '/server/dist/',
    '/e2e/',
    '/storybook-static/',
    '/.agent-session/',
    '/.claude/',
    // Shared helper modules placed inside __tests__/ — not test suites themselves.
    '/__tests__/helpers\\.ts$',
  ],
  // Worktrees em .claude/worktrees/ contém cópias do projeto — Jest precisa
  // ignorar pra evitar Haste duplicates ('@calendarfr/shared' resolvendo dois
  // package.json) e pra não escanear os testes da worktree no run principal.
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  collectCoverageFrom: [
    'web/src/shared/**/*.{ts,tsx}',
    'web/src/features/rich-text-line/**/*.{ts,tsx}',
    'web/src/features/priorities/**/*.{ts,tsx}',
    'web/src/features/agenda/**/*.{ts,tsx}',
    'web/src/features/mood/**/*.{ts,tsx}',
    'web/src/features/notes/**/*.{ts,tsx}',
    'web/src/features/daily-page/**/*.{ts,tsx}',
    'server/src/**/*.ts',
    'test-utils/**/*.ts',
    '!**/*.d.ts',
    '!**/*.stories.tsx',
    '!**/__tests__/**',
    '!server/src/index.ts',
    '!test-utils/msw/index.ts',
  ],
  coverageReporters: ['text', 'html', 'lcov'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './test-utils/': {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
    'server/src/storage/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    'server/src/schema/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    // Note: 'server/src/routes/*.ts' (not **) — intentionally excludes __tests__/ helpers
    // which are test fixtures, not production code.
    'server/src/routes/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    'server/src/lib/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    'web/src/features/rich-text-line/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    'web/src/features/priorities/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'web/src/features/agenda/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'web/src/features/mood/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'web/src/features/notes/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'web/src/features/daily-page/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};

module.exports = config;
