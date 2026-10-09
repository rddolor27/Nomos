import { below, floorDiv } from '@nomos/sim-core/kernels';
import { DECIDUOUS, FARMLAND, GRASSLAND } from '../climate/biomes.ts';
import { dist2 } from '../grid/grid.ts';
import { SETTLEMENT } from '../random/streams.ts';
import { FIELD, FIELDS, type Settlement } from './settle.ts';

// One settlement's fields. It tests the old biome, as Python does: a cell another settlement already turned to farmland
// stays farmland whichever biome is read.
function sow(
  out: Uint8Array,
  seed: number,
  width: number,
  height: number,
  biome: Uint8Array,
  homes: Uint8Array,
  s: Settlement,
): void {
  const r = FIELDS[s.tier];
  const top = Math.max(0, s.y - r - 1);
  const bottom = Math.min(height, s.y + r + 2);
  const left = Math.max(0, s.x - r - 1);
  const right = Math.min(width, s.x + r + 2);
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const i = y * width + x;
      const cover = biome[i];
      if (homes[i] !== 0 || (cover !== GRASSLAND && cover !== DECIDUOUS)) continue;
      if (dist2(x, y, s.x, s.y) <= r * r + below(3, seed, SETTLEMENT, FIELD, i)) out[i] = FARMLAND;
    }
  }
}

// Grassland and broadleaf forest round each settlement turn to fields, out to a ragged radius that grows with tier; the
// settlement's own cell keeps its land.
export function farm(seed: number, width: number, biome: Uint8Array, settlements: readonly Settlement[]): Uint8Array {
  const out = biome.slice();
  const homes = new Uint8Array(biome.length);
  for (const s of settlements) homes[s.y * width + s.x] = 1;
  const height = floorDiv(biome.length, width);
  for (const s of settlements) sow(out, seed, width, height, biome, homes, s);
  return out;
}
