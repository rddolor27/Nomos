/* global module */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'culture-wall',
      comment:
        'R8, content rule 8: guarded folders may not reach sim-culture by any chain of imports. Import the module you need, never a barrel that re-exports consumption, and write `import type` for types.',
      severity: 'error',
      from: { path: '^packages/sim-[^/]+/src/(crime|police|labour|wages|wealth|money|ability|housing|migration)/' },
      to: { path: '^packages/sim-culture/', reachable: true },
    },
    {
      name: 'culture-stays-in-consumption',
      comment:
        'R8: in sim-core only consumption/ and the barrel may reach sim-culture, so guarded code may import any other folder.',
      severity: 'error',
      from: { path: '^packages/sim-core/src/', pathNot: '^packages/sim-core/src/(consumption/|index\\.ts$)' },
      to: { path: '^packages/sim-culture/', reachable: true },
    },
    {
      name: 'names-only-in-the-inspector',
      comment: 'R8, content rule 5: names reach the page only through the inspector, which loads on demand.',
      severity: 'error',
      from: { path: '^apps/web/src/', pathNot: '^apps/web/src/panels/inspector\\.ts$' },
      to: { path: '^packages/sim-culture/' },
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
      name: 'map-scene-stands-alone',
      comment:
        "M8.3: the lazy map scene imports nothing from render-gl's town folders, so the renderer chunk never gains an export for it.",
      severity: 'error',
      from: { path: '^packages/render-gl/src/map(\\.ts$|/)' },
      to: { path: '^packages/render-gl/src/', pathNot: '^packages/render-gl/src/map(\\.ts$|/)' },
    },
    {
      name: 'map-view-takes-only-types-from-the-town',
      comment: 'M8.3: the map view reaches the town only through `import type`, so the entry chunk never gains an export for it.',
      severity: 'error',
      from: { path: '^apps/web/src/map/' },
      to: { path: '^apps/web/src/', pathNot: '^apps/web/src/map/' },
    },
    {
      name: 'worldgen-imports-kernels-only',
      comment:
        'M8.1: the generator takes sim-core values only through kernels.ts, and sim-protocol only through its world-map codes and, from M3.1, the place layout, so it stays pure and small.',
      severity: 'error',
      from: { path: '^packages/worldgen/src/' },
      to: {
        path: '^packages/',
        pathNot:
          '^packages/worldgen/|^packages/sim-core/src/kernels\\.ts$|^packages/sim-protocol/src/world-map/world-map\\.ts$|^packages/sim-protocol/src/place/place-layout\\.ts$',
      },
    },
    {
      name: 'worldgen-only-in-the-map-worker',
      comment:
        'M8.1, owner (9 October 2026): the map runs in a worker of its own, so no page module but the map worker may reach the generator.',
      severity: 'error',
      from: { path: '^apps/web/src/', pathNot: '^apps/web/src/map/(map-worker|generate)\\.ts$' },
      to: { path: '^packages/worldgen/', reachable: true },
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
