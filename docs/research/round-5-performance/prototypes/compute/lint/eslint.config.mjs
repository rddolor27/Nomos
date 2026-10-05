// Hot-path lint profile: apply to sim-core system files only (e.g. src/core/systems/**). Setup code lives elsewhere.
const ban = (selector, message) => ({ selector, message });
export default [
  {
    files: ['hot-*.mjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
    rules: {
      'no-restricted-syntax': ['error',
        ban('FunctionDeclaration ArrayExpression', 'hot path: array literal allocates; use a preallocated scratch typed array'),
        ban('FunctionDeclaration ObjectExpression', 'hot path: object literal allocates; write results into SoA typed arrays'),
        ban('FunctionDeclaration ArrowFunctionExpression, FunctionDeclaration FunctionExpression', 'hot path: closure allocates; use a plain loop'),
        ban('FunctionDeclaration NewExpression', 'hot path: `new` allocates; allocate in setup and pass buffers in'),
        ban('FunctionDeclaration SpreadElement, FunctionDeclaration TemplateLiteral', 'hot path: spread/template allocates'),
        ban('FunctionDeclaration ForOfStatement, FunctionDeclaration ForInStatement', 'hot path: use indexed for loops'),
        ban("FunctionDeclaration CallExpression[callee.property.name=/^(map|filter|reduce|forEach|flatMap|some|every|find|slice|subarray|concat|splice|push|pop|shift|unshift|from|of|entries|keys|values|join|split)$/]", 'hot path: allocating or callback-based array method'),
        ban("FunctionDeclaration CallExpression[callee.name='BigInt'], FunctionDeclaration Literal[bigint]", 'hot path: BigInt allocates (115x slower than Float64 cents in JavaScriptCore)'),
        ban("MemberExpression[object.name='Math'][property.name=/^(random|sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|asinh|acosh|atanh|exp|expm1|log|log1p|log2|log10|pow|cbrt|hypot)$/]", 'determinism: implementation-approximated Math function or unseeded RNG; use LUTs / keyed hash'),
        ban("MemberExpression[object.name='Date'], MemberExpression[object.name='performance'][property.name='now']", 'determinism: wall-clock time in the sim core'),
      ],
    },
  },
];
