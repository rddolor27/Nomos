import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // Round 7's prototypes under docs/ carry their own node_modules; .claude/ and .githooks/ hold CommonJS scripts outside the workspace.
  globalIgnores(['docs/**', 'graphify-out/**', '.claude/**', '.githooks/**', 'dist/**', 'coverage/**', 'assets/**']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      complexity: ['error', { max: 10, variant: 'modified' }],
      'max-depth': ['error', 4],
      'no-nested-ternary': 'error',
    },
  },
);
