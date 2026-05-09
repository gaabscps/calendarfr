/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'refactor', 'test', 'chore', 'build', 'ci', 'perf', 'style'],
    ],
    // Allow Portuguese subjects without case restrictions
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
  },
};

export default config;
