/**
 * dependency-cruiser configuration — architecture fitness functions.
 * FEAT-003 AC-010, AC-011, AC-013 (Plan D3).
 *
 * 4 rules enforced:
 *   no-cross-feature-internals — error (no cross-feature private imports)
 *   no-server-front-cross      — error (no web↔server imports)
 *   no-circular                — error (no dependency cycles)
 *   no-orphans                 — warn  (unreachable files)
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    /**
     * Rule 1: no-cross-feature-internals
     * Prevents importing internal files of a feature from another feature.
     * Only index.ts (public surface) exports are allowed across features.
     * Severity: error
     */
    {
      name: 'no-cross-feature-internals',
      severity: 'error',
      comment:
        'Import of a feature-internal module from outside that feature is forbidden. Use the feature index.ts instead.',
      from: {
        path: '^web/src/features/([^/]+)/',
      },
      to: {
        path: '^web/src/features/([^/]+)/',
        pathNot: [
          '^web/src/features/$1/', // same feature is OK
          '/index\\.ts$', // index.ts public exports are OK
          '/index\\.tsx$',
        ],
      },
    },

    /**
     * Rule 2: no-server-front-cross
     * Prevents web/ from importing server/ code and vice versa.
     * Severity: error
     */
    {
      name: 'no-server-to-front',
      severity: 'error',
      comment: 'Server code must not import from web/ (front-end). Use shared APIs or contracts.',
      from: {
        path: '^server/',
      },
      to: {
        path: '^web/',
      },
    },
    {
      name: 'no-front-to-server',
      severity: 'error',
      comment: 'Web (front-end) code must not import from server/. Use HTTP APIs.',
      from: {
        path: '^web/',
      },
      to: {
        path: '^server/',
      },
    },

    /**
     * Rule 3: no-circular
     * Dependency cycles are forbidden — they make the dependency graph a DAG violation.
     * Severity: error
     */
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are forbidden. Refactor to break the cycle.',
      from: {},
      to: {
        circular: true,
      },
    },

    /**
     * Rule 4: no-orphans
     * Files not imported anywhere are suspicious — may be dead code.
     * Severity: warn (does not block; only signals).
     */
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'This file is not imported anywhere. It may be dead code.',
      from: {
        orphan: true,
        pathNot: [
          // Entry points — intentionally not imported
          '\\.d\\.ts$',
          'web/src/main\\.tsx$',
          'web/src/vite-env\\.d\\.ts$',
          'server/src/index\\.ts$',
          // Test files — imported by test runner, not by app code
          '\\.test\\.(ts|tsx)$',
          '\\.spec\\.(ts|tsx)$',
          // Fixtures and storybook — not part of app dependency graph
          '/__fixtures__/',
          '\\.stories\\.(ts|tsx)$',
          // Config files
          '\\.config\\.(ts|js|cjs|mjs)$',
          // Test-utils entry point
          'test-utils/index\\.ts$',
        ],
      },
      to: {},
    },
  ],

  options: {
    doNotFollow: {
      path: [
        'node_modules',
        '\\.agent-session',
        '\\.superpowers',
        'dist',
        'coverage',
        'reports',
        'storybook-static',
        'playwright-report',
        'test-results',
      ],
    },

    exclude: {
      path: [
        'node_modules',
        '\\.agent-session',
        '\\.superpowers',
        '__fixtures__',
        'dist/',
        'coverage/',
        'reports/',
        'storybook-static/',
        'playwright-report/',
      ],
    },

    tsConfig: {
      fileName: 'tsconfig.base.json',
    },

    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },

    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
        theme: {
          graph: { rankdir: 'LR', splines: 'ortho' },
          modules: [
            { criteria: { source: '^scripts/' }, attributes: { fillcolor: '#dde3f0' } },
            { criteria: { source: '^web/' }, attributes: { fillcolor: '#d0f0c0' } },
            { criteria: { source: '^server/' }, attributes: { fillcolor: '#f0d0c0' } },
            { criteria: { source: '^test-utils/' }, attributes: { fillcolor: '#f0f0d0' } },
          ],
        },
      },
    },
  },
};
