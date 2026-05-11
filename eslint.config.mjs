import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import pluginImport from 'eslint-plugin-import';
import pluginJsxA11y from 'eslint-plugin-jsx-a11y';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  // Block 1: Global ignores
  {
    ignores: [
      'web/dist/**',
      'server/dist/**',
      'coverage/**',
      'node_modules/**',
      'storybook-static/**',
      'web/storybook-static/**',
      'playwright-report/**',
      'test-results/**',
      'data/**',
      '.agent-session/**',
      '.superpowers/**',
      '__mocks__/**',
    ],
  },

  // Block 2: JavaScript files (non-type-checked) — covers .mjs config files
  js.configs.recommended,

  // Block 3: CJS config files (jest.config.js, jest.polyfills.js, jest.setup.js, *.cjs)
  {
    files: [
      'jest.config.js',
      'jest.polyfills.js',
      'jest.setup.js',
      '*.cjs',
      'stryker.jest.config.cjs',
    ],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
      'no-console': 'off',
    },
  },

  // Block 4: TypeScript source files (type-checked, scoped to TS/TSX only)
  ...tseslint.config({
    files: ['**/*.{ts,tsx}'],
    ignores: [
      '**/*.test.{ts,tsx}',
      '**/*.integration.test.{ts,tsx}',
      'e2e/**',
      'playwright.config.ts',
      'test-utils/**',
      'web/vite.config.ts',
      'web/.storybook/**',
    ],
    extends: [...tseslint.configs.recommendedTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      'react-refresh': pluginReactRefresh,
      import: pluginImport,
      'jsx-a11y': pluginJsxA11y,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: {
          project: ['web/tsconfig.json', 'server/tsconfig.json', 'tsconfig.scripts.json'],
        },
      },
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  }),

  // Block 5: Test files (relaxed rules, no type-checking required)
  {
    files: ['**/*.test.{ts,tsx}', '**/*.integration.test.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: pluginImport,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Jest
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        // Node
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // jsdom / browser
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        Node: 'readonly',
        // React (allow direct React.* usage without import)
        React: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },

  // Block 6: E2E files and playwright config (no type-checking — Playwright has its own tsconfig)
  {
    files: ['e2e/**/*.spec.ts', 'e2e/**/*.ts', 'playwright.config.ts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      globals: {
        process: 'readonly',
        console: 'readonly',
        // Browser globals referenced inside page.evaluate() callbacks
        document: 'readonly',
        HTMLElement: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // Block 7: test-utils, vite.config.ts, and storybook config (not type-checked by projectService)
  {
    files: ['test-utils/**/*.{ts,tsx}', 'web/vite.config.ts', 'web/.storybook/**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: pluginImport,
    },
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      ...js.configs.recommended.rules,
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'no-console': 'off',
    },
  },
];
