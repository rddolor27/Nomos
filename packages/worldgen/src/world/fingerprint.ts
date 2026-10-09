import { floorDiv, floorMod, mix } from '@nomos/sim-core/kernels';
import { LANDMARK_SLOTS, NO_LANDMARK, type PathTable, type WorldMap } from '@nomos/sim-protocol/world-map';

// world.py's fingerprint, read back from the map: the same values fed in the same order, so the two agree exactly.
export function worldFingerprint(map: WorldMap): number {
  let h = feed(feed(mix(map.seed), map.width), map.height);
  for (const column of [map.elevation, map.biome, map.temperature, map.moisture, map.river, map.receiver, map.coast]) {
    h = feedColumn(h, column);
  }
  h = feedSettlements(h, map);
  h = feedPaths(feedPaths(h, map.roads), map.lanes);
  h = feedColumn(h, map.bridges);
  h = feedSpots(h, map.wonders.kind, map.wonders.cell, map.width);
  h = feedSpots(h, map.landmarks.kind, map.landmarks.cell, map.width);
  h = feed(h, map.countries.capital.length);
  for (let k = 0; k < map.countries.capital.length; k++) h = feed(feed(h, map.countries.capital[k]), map.countries.colour[k]);
  return feedColumn(h, map.country);
}

function feed(h: number, value: number): number {
  return mix(h ^ value);
}

function feedColumn(h: number, column: ArrayLike<number>): number {
  let out = feed(h, column.length);
  for (let i = 0; i < column.length; i++) out = feed(out, column[i]);
  return out;
}

function landmarkCount(landmarks: Uint8Array, first: number): number {
  let count = 0;
  while (count < LANDMARK_SLOTS && landmarks[first + count] !== NO_LANDMARK) count++;
  return count;
}

function feedSettlements(h: number, map: WorldMap): number {
  const { cell, tier, population, landmarks } = map.settlements;
  let out = feed(h, cell.length);
  for (let id = 0; id < cell.length; id++) {
    out = feed(feed(feed(out, id), floorMod(cell[id], map.width)), floorDiv(cell[id], map.width));
    out = feed(feed(out, tier[id]), population[id]);
    const first = id * LANDMARK_SLOTS;
    const count = landmarkCount(landmarks, first);
    out = feed(out, count);
    for (let k = 0; k < count; k++) out = feed(out, landmarks[first + k]);
  }
  return out;
}

function feedPaths(h: number, table: PathTable): number {
  const { offsets, cells } = table;
  let out = feed(h, offsets.length - 1);
  for (let p = 0; p + 1 < offsets.length; p++) {
    out = feed(out, offsets[p + 1] - offsets[p]);
    for (let c = offsets[p]; c < offsets[p + 1]; c++) out = feed(out, cells[c]);
  }
  return out;
}

function feedSpots(h: number, kind: Uint8Array, cell: Int32Array, width: number): number {
  let out = feed(h, kind.length);
  for (let k = 0; k < kind.length; k++) {
    out = feed(feed(feed(out, kind[k]), floorMod(cell[k], width)), floorDiv(cell[k], width));
  }
  return out;
}
