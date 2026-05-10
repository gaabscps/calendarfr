/**
 * Stryker-specific Jest config.
 * Re-exports jest.config.js but swaps transform to ts-jest when STRYKER_RUN=1.
 * This is the workaround for @swc/jest incompatibility with Stryker Mutator.
 * See: FEAT-003 AC-005, Plan D1.
 */
const baseConfig = require('./jest.config.js');

if (process.env.STRYKER_RUN === '1') {
  module.exports = {
    ...baseConfig,
    transform: {
      '^.+\\.(t|j)sx?$': [
        'ts-jest',
        {
          tsconfig: 'tsconfig.scripts.json',
          diagnostics: false,
        },
      ],
    },
    // ts-jest handles .mjs differently — keep transformIgnorePatterns but remove swc-specific patterns
    transformIgnorePatterns: ['/node_modules/'],
    // Exclude test environment setup files that depend on jsdom for Stryker run
    setupFiles: [],
    setupFilesAfterEnv: [],
    testEnvironment: 'node',
    testPathPattern: 'server/src/',
  };
} else {
  module.exports = baseConfig;
}
