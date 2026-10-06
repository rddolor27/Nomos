// How often place.py's priority shore rule disagrees with a lookup by the manifest's `corners` key
// (nw, ne, sw, se; 1 land, 0 water), where a corner is water when any cell sharing it is water.
// Usage: node corners.mjs

import { readFileSync } from 'node:fs';
import { GRASS, TILE_NAMES, WATER, createMap, draw, synthesize, tileFor } from './map.mjs';
import { beginEdit, brushEvent, commit, createEditor, finishEdit } from './tools.mjs';

const manifest = JSON.parse(readFileSync(new URL('../../../../../assets/sprites/scenery.json', import.meta.url), 'utf8')).frames;
const m = createMap(1024, 1024);
synthesize(m, 0x5eed0009);
const wet = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.kind[y * m.w + x] === WATER;

function census(label) {
const counts = { shoreCells: 0, agree: 0, disagree: 0, saddle: 0, allWater: 0 };
const examples = {};
for (let y = 0; y < m.h; y++) {
  for (let x = 0; x < m.w; x++) {
    const name = TILE_NAMES[tileFor(m, x, y)].split('/')[1];
    const frame = manifest[name];
    const nw = wet(x - 1, y) || wet(x, y - 1) || wet(x - 1, y - 1) ? 0 : 1;
    const ne = wet(x + 1, y) || wet(x, y - 1) || wet(x + 1, y - 1) ? 0 : 1;
    const sw = wet(x - 1, y) || wet(x, y + 1) || wet(x - 1, y + 1) ? 0 : 1;
    const se = wet(x + 1, y) || wet(x, y + 1) || wet(x + 1, y + 1) ? 0 : 1;
    const key = `${nw}${ne}${sw}${se}`;
    if (!frame || !frame.corners) continue;
    counts.shoreCells++;
    if (frame.corners === key) counts.agree++;
    else {
      counts.disagree++;
      if (key === '1001' || key === '0110') counts.saddle++;
      if (key === '0000') counts.allWater++;
      examples[`${frame.corners}->${key}`] = (examples[`${frame.corners}->${key}`] || 0) + 1;
    }
  }
}
console.log(label, counts, Object.entries(examples).sort((a, b) => b[1] - a[1]).slice(0, 6));
}

census('generated');
m.sync = true;
const ed = createEditor(m, 'diff', true);
for (let s = 0; s < 200; s++) {
  let x = 40 + (draw(7, 1, s) % 944), y = 40 + (draw(7, 2, s) % 944);
  const radius = s % 3, k = s % 2 ? GRASS : WATER;
  beginEdit(ed);
  for (let e = 0; e < 40; e++) {
    const nx = Math.min(1000, Math.max(20, x + (draw(7, 3, s, e) % 5) - 2)), ny = Math.min(1000, Math.max(20, y + (draw(7, 4, s, e) % 5) - 2));
    brushEvent(ed, x, y, nx, ny, radius, k);
    x = nx; y = ny;
  }
  finishEdit(ed);
  commit(ed);
}
census('after 200 random strokes (r0-r2, water and land)');
