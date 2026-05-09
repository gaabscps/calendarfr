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
    '/node_modules/(?!(msw|@mswjs|@bundled-es-modules|@open-draft|outvariant|strict-event-emitter|until-async|cookie|rettime|headers-polyfill|lens-list)/)',
  ],
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '^@/test-utils$': '<rootDir>/test-utils/index',
    '^@/test-utils/(.*)$': '<rootDir>/test-utils/$1',
    '^@/(.*)$': '<rootDir>/web/src/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/web/dist/',
    '/server/dist/',
    '/e2e/',
    '/storybook-static/',
    '/scripts/agentops/__fixtures__/',
  ],
  collectCoverageFrom: [
    'web/src/shared/**/*.{ts,tsx}',
    'server/src/**/*.ts',
    'scripts/agentops/**/*.ts',
    '!**/*.d.ts',
    '!**/*.stories.tsx',
  ],
  coverageReporters: ['text', 'html', 'lcov'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
    './test-utils/': {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
    './scripts/agentops/': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
  },
};

module.exports = config;
