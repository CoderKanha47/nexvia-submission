import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // data/ holds runtime artifacts (HLS .ts segments are video, not TypeScript), logs/ holds run logs.
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', 'data/**', 'logs/**', 'client/server.js'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
