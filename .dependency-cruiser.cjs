/* global module */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'culture-wall',
      comment:
        'R8, content rule 8: guarded folders may not reach sim-culture by any chain of imports. Import the module you need, never a barrel that re-exports consumption, and write `import type` for types.',
      severity: 'error',
      from: { path: '^packages/sim-[^/]+/src/(crime|police|labour|wages|wealth|ability|housing|migration)/' },
      to: { path: '^packages/sim-culture/', reachable: true },
    },
    {
      name: 'culture-imports-kernels-only',
      comment: 'M0.6 Task 4: sim-culture takes sim-core values only through kernels.ts, so the packages stay acyclic.',
      severity: 'error',
      from: { path: '^packages/sim-culture/src/' },
      to: { path: '^packages/sim-core/', pathNot: '^packages/sim-core/src/kernels\\.ts$' },
    },
    {
      name: 'kernels-stay-below-culture',
      comment: 'M0.6 Task 4: nothing kernels.ts imports may reach sim-culture, or sim-culture would import itself.',
      severity: 'error',
      from: { path: '^packages/sim-core/src/kernels\\.ts$' },
      to: { path: '^packages/sim-culture/', reachable: true },
    },
    {
      name: 'no-cycles',
      comment: 'A cycle makes the load order, and so any module-level setup, depend on the entry point.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    // `import type` vanishes at runtime and forms no edge. The base tsconfig's verbatimModuleSyntax keeps
    // `import { type X }` as a bare import, as Node's type stripping does, so that one is an edge.
    tsPreCompilationDeps: false,
    tsConfig: { fileName: 'tsconfig.base.json' },
    exclude: { path: ['/test/', '/dist/', 'node_modules'] },
    // Workspace names resolve through pnpm's symlinks and the packages' exports to src.
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'default'] },
  },
};
