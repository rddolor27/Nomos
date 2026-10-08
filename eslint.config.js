import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import tseslint from 'typescript-eslint';

const EXACT_MATHS =
  'sim-core rules, Determinism: use only + - * /, Math.sqrt, Math.floor, Math.imul, Math.max, Math.min, Math.abs, Math.round and bit operations; build tables at build time.';
const KEYED_DRAW = 'sim-core rules, Determinism: take every random number from the keyed draw.';
const NO_BIGINT = 'sim-core rules, Determinism: no BigInt in hot code; it is 115x slower in JavaScriptCore.';
const UNREAD_LOOK = 'content rules, Art direction 1: no sim rule ever reads a look; only src/store.ts writes it.';
const MUL_PPM = 'Non-negotiables, Money: rates go through mulPpm, never a raw cents * rate (R6).';
const NO_SORT =
  'sim-core rules, Hot paths: TypedArray.prototype.sort copies shared memory, so sim code never sorts; use a histogram or slot order (R6).';
const FLOOR_DIV =
  'Generator port (R9 traps 3 and 4): / is float division and Python floors, so use floorDiv, or a shift for a power of two.';
const FLOOR_MOD =
  "Generator port (R9 trap 1): % keeps the dividend's sign where Python's follows the divisor's, so use floorMod, or (x >>> 0) % n.";
const NO_FRAMEWORKS =
  'web rules, Rendering and Load order: one custom WebGL2 renderer, so no PixiJS or Phaser; the HUD is vanilla TypeScript and richer UI uses Solid or Preact, never React.';

const TRANSCENDENTAL_MATH = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'exp', 'expm1', 'log', 'log1p', 'log2', 'log10', 'pow', 'hypot', 'cbrt',
];

// no-restricted-syntax groups for sim source; LOOK_READS applies to sim-core and sim-culture.
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
// A rate is named rate or ppm, or ends in Rate or Ppm, as a direct operand of * or *=, or the array indexed there,
// whether read off a struct or copied into a local first.
const RATE = '/^(rate|ppm)$|(Rate|Ppm)$/';
const PRODUCT = ":matches(BinaryExpression[operator='*'], AssignmentExpression[operator='*='])";
const RATE_PRODUCTS = [
  { selector: `${PRODUCT} > Identifier[name=${RATE}]`, message: MUL_PPM },
  { selector: `${PRODUCT} > MemberExpression[property.name=${RATE}]`, message: MUL_PPM },
  { selector: `${PRODUCT} > MemberExpression[object.name=${RATE}]`, message: MUL_PPM },
  { selector: `${PRODUCT} > MemberExpression > MemberExpression[property.name=${RATE}]`, message: MUL_PPM },
];
// ESLint cannot tell which views sit on shared memory, so every sort call goes.
const SORT_CALLS = [
  { selector: 'CallExpression[callee.property.name=/^(sort|toSorted)$/]', message: NO_SORT },
];
const SYNTAX_GROUPS = [MATH_SYNTAX, BIGINT_SYNTAX, LOOK_READS, RATE_PRODUCTS, SORT_CALLS];

// Flat config replaces a rule's options block by block, so a block exempting a file from one group restates the rest.
function syntaxBansWithout(exempt) {
  return ['error', ...SYNTAX_GROUPS.filter((group) => group !== exempt).flat()];
}

// The per-tick list's one home: M0.3's step and snapshot writer and the functions they call every tick, ground.ts
// for move's walkableAt. draw.ts (its variadic draw and below serve non-tick code) and apportion.ts (BigInt) stay out.
const HOT_FILES = [
  'packages/sim-core/src/{world,wander,step,day,slices,stride,inputs,histogram}.ts',
  'packages/sim-protocol/src/{snapshot,visual}.ts',
  'packages/sim-core/src/{int,calendar,space,store,ledger,money,claims,registry,flows,split,log2,invariants,ground}.ts',
];
// Functions in hot files that run only at creation, restore or failure, or between ticks, so they may allocate.
const COLD = '/^(create|layout|populate|restore|checkpoint|giveBack|fail|stateHash|openCells|standIn)/';
const IN_HOT = `FunctionDeclaration:not([id.name=${COLD}])`;
const ARRAY_METHODS =
  '/^(map|filter|reduce|forEach|flatMap|some|every|find|slice|subarray|concat|splice|push|pop|shift|unshift|from|of|entries|keys|values|join|split)$/';
const NO_ALLOCATION = 'sim-core rules, Hot paths: per-tick functions allocate nothing, so';
const HOT_SYNTAX = [
  { selector: `${IN_HOT} ArrayExpression`, message: `${NO_ALLOCATION} write into a preallocated typed array.` },
  { selector: `${IN_HOT} ObjectExpression`, message: `${NO_ALLOCATION} write results into struct-of-arrays columns.` },
  {
    selector: `${IN_HOT} :matches(ArrowFunctionExpression, FunctionExpression, FunctionDeclaration)`,
    message: `${NO_ALLOCATION} use a plain loop and module-level functions, never a closure.`,
  },
  {
    selector: `${IN_HOT} NewExpression:not(ThrowStatement NewExpression)`,
    message: `${NO_ALLOCATION} allocate at creation and pass buffers in; only a throw may construct.`,
  },
  { selector: `${IN_HOT} SpreadElement`, message: `${NO_ALLOCATION} pass values one by one, never spread.` },
  {
    selector: `${IN_HOT} TemplateLiteral:not(ThrowStatement TemplateLiteral)`,
    message: `${NO_ALLOCATION} build no strings; only a throw may format one.`,
  },
  {
    selector: `${IN_HOT} :matches(ForOfStatement, ForInStatement)`,
    message: `${NO_ALLOCATION} use an indexed for loop, which needs no iterator.`,
  },
  {
    selector: `${IN_HOT} CallExpression[callee.property.name=${ARRAY_METHODS}]`,
    message: `${NO_ALLOCATION} use an indexed for loop, never an array callback or a copying method.`,
  },
  {
    selector: `${IN_HOT} CallExpression[callee.name=/^(draw|below)$/]`,
    message: `${NO_ALLOCATION} use draw1-draw4, never the variadic draw or below, whose keys allocate.`,
  },
  {
    selector: `${IN_HOT} :matches(Identifier[name='Date'], MemberExpression[object.name='performance'][property.name='now'])`,
    message: 'sim-core rules, Hot paths: per-tick functions read no clock; time is the tick counter.',
  },
  {
    // Anywhere in a hot file, so that no per-tick function escapes the checks above.
    selector: 'VariableDeclarator > :matches(ArrowFunctionExpression, FunctionExpression)',
    message: 'sim-core rules, Hot paths: declare functions in hot files with function, so the hot-path lint sees them.',
  },
];

// The generator code that exists: the keyed draw, value noise and the map parser. M3.1 adds packages/worldgen/src.
const GENERATOR_FILES = ['packages/sim-core/src/{draw,noise}.ts', 'packages/sim-protocol/src/map.ts'];
// % is allowed on an unsigned left operand, where JS and Python agree.
const GEN_SYNTAX = [
  { selector: "BinaryExpression[operator='/']", message: FLOOR_DIV },
  { selector: "AssignmentExpression[operator='/=']", message: FLOOR_DIV },
  { selector: "BinaryExpression[operator='%'][left.operator!='>>>']", message: FLOOR_MOD },
  { selector: "AssignmentExpression[operator='%=']", message: FLOOR_MOD },
];

// Each is banned bare and by subpath, such as react-dom/client; @pixi/* covers PixiJS v7's scoped packages.
const FRAMEWORKS = ['react', 'react-dom', 'pixi.js', 'phaser'];

export default defineConfig(
  // Round 7's prototypes under docs/ carry their own node_modules; .claude/ and .githooks/ hold CommonJS scripts outside
  // the workspace; .superpowers/ holds agents' scratch copies, which ESLint 10 would read as configs if named like one.
  globalIgnores([
    'docs/**', 'graphify-out/**', '.claude/**', '.githooks/**', '.superpowers/**', '**/dist/**', 'coverage/**', 'assets/**',
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
    files: ['packages/sim-*/src/**/*.ts'],
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
    // The snapshot writer in sim-protocol reads looks, so only sim-core and sim-culture ban reading them.
    files: ['packages/{sim-core,sim-culture}/src/**/*.ts'],
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
  {
    // Its own copy of the core rule, so these bans stack on the sim profile's instead of replacing them.
    files: HOT_FILES,
    plugins: { hot: { rules: { 'no-restricted-syntax': builtinRules.get('no-restricted-syntax') } } },
    rules: { 'hot/no-restricted-syntax': ['error', ...HOT_SYNTAX] },
  },
  {
    // Its own copy of the core rule too, so these bans stack on the sim profile's.
    files: GENERATOR_FILES,
    plugins: { gen: { rules: { 'no-restricted-syntax': builtinRules.get('no-restricted-syntax') } } },
    rules: { 'gen/no-restricted-syntax': ['error', ...GEN_SYNTAX] },
  },
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/render-gl/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: FRAMEWORKS.map((name) => ({ name, message: NO_FRAMEWORKS })),
          patterns: [{ group: [...FRAMEWORKS.map((name) => `${name}/*`), '@pixi/*'], message: NO_FRAMEWORKS }],
        },
      ],
    },
  },
);
