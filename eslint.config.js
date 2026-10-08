import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

const EXACT_MATHS =
  'sim-core rules, Determinism: use only + - * /, Math.sqrt, Math.floor, Math.imul, Math.max, Math.min, Math.abs, Math.round and bit operations; build tables at build time.';
const KEYED_DRAW = 'sim-core rules, Determinism: take every random number from the keyed draw.';
const NO_BIGINT = 'sim-core rules, Determinism: no BigInt in hot code; it is 115x slower in JavaScriptCore.';
const UNREAD_LOOK = 'content rules, Art direction 1: no sim rule ever reads a look; only src/store.ts writes it.';
const MUL_PPM = 'Non-negotiables, Money: rates go through mulPpm, never a raw cents * rate (R6).';

const TRANSCENDENTAL_MATH = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'exp', 'expm1', 'log', 'log1p', 'log2', 'log10', 'pow', 'hypot', 'cbrt',
];

// no-restricted-syntax groups for sim source; LOOK_READS applies to sim-core alone.
const MATH_SYNTAX = [
  { selector: "BinaryExpression[operator='**']", message: EXACT_MATHS },
  { selector: "AssignmentExpression[operator='**=']", message: EXACT_MATHS },
];
const BIGINT_SYNTAX = [
  { selector: 'Literal[bigint]', message: NO_BIGINT },
  { selector: "CallExpression[callee.name='BigInt']", message: NO_BIGINT },
  { selector: 'Identifier[name=/^Big(Int|Uint)64Array$/]', message: NO_BIGINT },
];
const LOOK_READS = [
  { selector: "MemberExpression[property.name='look']", message: UNREAD_LOOK },
  { selector: "MemberExpression[property.value='look']", message: UNREAD_LOOK },
  { selector: "ObjectPattern > Property[key.name='look']", message: UNREAD_LOOK },
];
// A rate is named rate or ppm, or ends in Rate or Ppm, as a direct operand of * or *=, or the array indexed there.
const RATE = '/^(rate|ppm)$|(Rate|Ppm)$/';
const PRODUCT = ":matches(BinaryExpression[operator='*'], AssignmentExpression[operator='*='])";
const RATE_PRODUCTS = [
  { selector: `${PRODUCT} > Identifier[name=${RATE}]`, message: MUL_PPM },
  { selector: `${PRODUCT} > MemberExpression[property.name=${RATE}]`, message: MUL_PPM },
  { selector: `${PRODUCT} > MemberExpression > MemberExpression[property.name=${RATE}]`, message: MUL_PPM },
];
const SYNTAX_GROUPS = [MATH_SYNTAX, BIGINT_SYNTAX, LOOK_READS, RATE_PRODUCTS];

// Flat config replaces a rule's options block by block, so a block exempting a file from one group restates the rest.
function syntaxBansWithout(exempt) {
  return ['error', ...SYNTAX_GROUPS.filter((group) => group !== exempt).flat()];
}

export default defineConfig(
  // Round 7's prototypes under docs/ carry their own node_modules; .claude/ and .githooks/ hold CommonJS scripts outside
  // the workspace; .superpowers/ holds agents' scratch copies, which ESLint 10 would read as configs if named like one.
  globalIgnores([
    'docs/**', 'graphify-out/**', '.claude/**', '.githooks/**', '.superpowers/**', 'dist/**', 'coverage/**', 'assets/**',
  ]),
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
    files: ['packages/{sim-core,sim-protocol,sim-worker}/src/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        ...TRANSCENDENTAL_MATH.map((property) => ({ object: 'Math', property, message: EXACT_MATHS })),
        { object: 'Math', property: 'random', message: KEYED_DRAW },
      ],
      'no-restricted-syntax': syntaxBansWithout(LOOK_READS),
    },
  },
  {
    // The snapshot writer in sim-protocol reads looks, so only sim-core bans reading them.
    files: ['packages/sim-core/src/**/*.ts'],
    rules: { 'no-restricted-syntax': ['error', ...SYNTAX_GROUPS.flat()] },
  },
  {
    files: ['packages/sim-core/src/store.ts'],
    rules: { 'no-restricted-syntax': syntaxBansWithout(LOOK_READS) },
  },
  {
    // mulPpm's own exact split multiplies cents by ppm.
    files: ['packages/sim-core/src/money.ts'],
    rules: { 'no-restricted-syntax': syntaxBansWithout(RATE_PRODUCTS) },
  },
  {
    // Apportionment takes BigInt once total * weight reaches 2^53, and never runs per tick (R4).
    files: ['packages/sim-core/src/apportion.ts'],
    rules: { 'no-restricted-syntax': syntaxBansWithout(BIGINT_SYNTAX) },
  },
);
