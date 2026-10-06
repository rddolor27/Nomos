// Compares map.mjs's tidyAll and tileFor with place.py's tidy_water and tile_for on parity.json.
// Usage: python parity.py && node parity.mjs

import { readFileSync } from 'node:fs';
import { TILE_NAMES, createMap, tidyAll, tidyAllSync, tileFor } from './map.mjs';

const cases = JSON.parse(readFileSync(new URL('./parity.json', import.meta.url), 'utf8'));
let cells = 0, kindDiff = 0, tileDiff = 0, gridsDiffer = 0, syncDiff = 0, syncGrids = 0, pyFlips = 0;
for (const c of cases) {
  const m = createMap(c.w, c.h);
  m.kind.set(c.before);
  tidyAll(m);
  let bad = 0;
  for (let i = 0; i < c.w * c.h; i++) {
    cells++;
    pyFlips += c.before[i] !== c.after[i];
    if (m.kind[i] !== c.after[i]) { kindDiff++; bad++; }
    if (TILE_NAMES[tileFor(m, i % c.w, (i / c.w) | 0)] !== c.tiles[i]) { tileDiff++; bad++; }
  }
  gridsDiffer += bad > 0;
  const s = createMap(c.w, c.h);
  s.kind.set(c.before);
  tidyAllSync(s);
  let d = 0;
  for (let i = 0; i < c.w * c.h; i++) d += s.kind[i] !== c.after[i];
  syncDiff += d;
  syncGrids += d > 0;
}
console.log(`${cases.length} grids, ${cells} cells: ${kindDiff} kind and ${tileDiff} tile mismatches, ${gridsDiffer} grids differ`);
console.log(`plan-then-apply tidy against place.py: ${syncDiff} cells differ in ${syncGrids} grids (place.py flooded ${pyFlips})`);
