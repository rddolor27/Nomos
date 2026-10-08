import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

const EXACT_MATHS =
  'sim-core rules, Determinism: use only + - * /, Math.sqrt, Math.floor, Math.imul and bit operations; build tables at build time.';
const KEYED_DRAW = 'sim-core rules, Determinism: take every random number from the keyed draw.';
const NO_BIGINT = 'sim-core rules, Determinism: no BigInt in hot code; it is 115x slower in JavaScriptCore.';

const TRANSCENDENTAL_MATH = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'exp', 'expm1', 'log', 'log1p', 'log2', 'log10', 'pow', 'hypot', 'cbrt',
];

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
  {
    // Build scripts under scripts/ may use any maths: they write tables that src/ reads.
    files: ['packages/sim-core/src/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        ...TRANSCENDENTAL_MATH.map((property) => ({ object: 'Math', property, message: EXACT_MATHS })),
        { object: 'Math', property: 'random', message: KEYED_DRAW },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "BinaryExpression[operator='**']", message: EXACT_MATHS },
        { selector: "AssignmentExpression[operator='**=']", message: EXACT_MATHS },
        { selector: 'Literal[bigint]', message: NO_BIGINT },
        { selector: "CallExpression[callee.name='BigInt']", message: NO_BIGINT },
        { selector: 'Identifier[name=/^Big(Int|Uint)64Array$/]', message: NO_BIGINT },
      ],
    },
  },
);
