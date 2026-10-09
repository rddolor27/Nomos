import { below, draw2, draw3 } from '@nomos/sim-core/kernels';
import { LANDMARK_NAMES } from '@nomos/sim-protocol/world-map';
import { FARMLAND, GRASSLAND, HILLS, HILLS_AT, MOUNTAIN, OCEAN, PEAK } from '../climate/biomes.ts';
import { dist2, xOf, yOf } from '../grid/grid.ts';
import { chance, shuffled } from '../random/keyed.ts';
import { LANDMARK } from '../random/streams.ts';
import { CAPITAL, CITY, type Settlement, TOWN } from '../settle/settle.ts';
import type { FeatureWorld, Spot } from '../world/draft.ts';
import { at, countAround, framed, type Land } from './survey.ts';
import { crowded } from './wonders.ts';

// features.py's sub-purposes of the LANDMARK stream, by value.
const ODDS = 0;
const ARRANGE = 1;
const SPOTS = 2;
const LOOKOUTS = 3;
const GAPS = 4;

const LIGHTHOUSE = LANDMARK_NAMES.indexOf('lighthouse');
const VIADUCT = LANDMARK_NAMES.indexOf('viaduct');
const OBSERVATORY = LANDMARK_NAMES.indexOf('observatory');
const CLOCK_TOWER = LANDMARK_NAMES.indexOf('clock-tower');
const GLASSHOUSE = LANDMARK_NAMES.indexOf('glasshouse');
const LIBRARY = LANDMARK_NAMES.indexOf('library');
const AMPHITHEATRE = LANDMARK_NAMES.indexOf('amphitheatre');
const WINDMILL = LANDMARK_NAMES.indexOf('windmill');
const GARDEN_TERRACES = LANDMARK_NAMES.indexOf('garden-terraces');
const FOUNTAIN = LANDMARK_NAMES.indexOf('fountain');

// Per mille by tier (capital, city, town, village, hamlet); each kind also needs its site. In Python's dict order,
// since the shuffle keys on each kind's position among those that pass.
export const CHANCES: readonly (readonly [kind: number, perMille: readonly number[]])[] = [
  [CLOCK_TOWER, [1000, 600, 300, 0, 0]],
  [LIBRARY, [800, 500, 0, 0, 0]],
  [FOUNTAIN, [500, 400, 250, 0, 0]],
  [GLASSHOUSE, [300, 300, 250, 0, 0]],
  [AMPHITHEATRE, [700, 600, 0, 0, 0]],
  [GARDEN_TERRACES, [0, 0, 500, 500, 0]],
  [WINDMILL, [0, 0, 0, 450, 400]],
  [LIGHTHOUSE, [700, 700, 600, 100, 0]],
];

// A bridge becomes a viaduct when the banks stand this far above it; a map gets at most two.
const MIN_DEPTH = 40;
const MAX_VIADUCTS = 2;

// A viaduct: its depth, then its tie draw and its cell. An observatory: its height with a draw added, then its cell.
type Crossing = readonly [depth: number, tie: number, cell: number];
type Lookout = readonly [height: number, cell: number];

// Python compares (sea, tie draw) tuples, so the draw decides only between equal sea counts.
function beats(sea: number, tie: number, bestSea: number, bestTie: number): boolean {
  return sea > bestSea || (sea === bestSea && tie > bestTie);
}

// Coastal land beside the settlement but not under it, with room above for the icon and no other icon on it.
function canLight(world: FeatureWorld, land: Land, cell: number, used: Uint8Array): boolean {
  if (cell < 0) return false;
  return (
    land.water[cell] === 0 &&
    world.coast[cell] !== 0 &&
    land.town[cell] !== 0 &&
    used[cell] === 0 &&
    framed(world, cell)
  );
}

// The cell among the settlement's own and its eight neighbours that faces the most sea, below it if possible, or -1. A
// strict comparison keeps the first of two equal keys.
function lighthouseSpot(world: FeatureWorld, land: Land, s: Settlement, used: Uint8Array): number {
  let best = -1;
  let bestSea = 0;
  let bestTie = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const i = at(world, s.x + dx, s.y + dy);
      if (!canLight(world, land, i, used)) continue;
      const sea = countAround(world, land, i, [OCEAN]) + (dy >= 0 ? 2 : 0);
      const tie = draw3(world.seed, LANDMARK, SPOTS, s.uid, i);
      if (best < 0 || beats(sea, tie, bestSea, bestTie)) {
        best = i;
        bestSea = sea;
        bestTie = tie;
      }
    }
  }
  return best;
}

function fits(world: FeatureWorld, land: Land, s: Settlement, kind: number): boolean {
  const i = s.y * world.width + s.x;
  switch (kind) {
    case GLASSHOUSE:
      return world.temperature[i] >= 90 && world.temperature[i] <= 170;
    case AMPHITHEATRE:
      return land.slope[i] >= 40 || countAround(world, land, i, [HILLS, MOUNTAIN]) >= 2;
    case GARDEN_TERRACES:
      return world.biome[i] === HILLS || countAround(world, land, i, [HILLS]) >= 2;
    case WINDMILL:
      return (
        world.biome[i] === GRASSLAND || world.biome[i] === FARMLAND || countAround(world, land, i, [FARMLAND]) >= 1
      );
    default:
      return true;
  }
}

// A capital rolls its clock tower at 1000 per mille, so it is always among the kinds, as Python's remove needs.
function clockTowerFirst(kinds: number[]): void {
  kinds.splice(kinds.indexOf(CLOCK_TOWER), 1);
  kinds.unshift(CLOCK_TOWER);
}

// The kinds that fit the site and win their roll, shuffled, then cut to what a settlement holds: 3 for the capital, 2
// for the rest.
function chosenKinds(world: FeatureWorld, land: Land, s: Settlement, light: number): number[] {
  const rolled: number[] = [];
  for (const [kind, perMille] of CHANCES) {
    if (kind === LIGHTHOUSE && light < 0) continue;
    const wins = chance(perMille[s.tier], world.seed, LANDMARK, ODDS, s.uid, kind);
    if (fits(world, land, s, kind) && wins) rolled.push(kind);
  }
  const kinds = shuffled(rolled, world.seed, LANDMARK, ARRANGE, s.uid);
  if (s.tier === CAPITAL) clockTowerFirst(kinds);
  return kinds.slice(0, s.tier === CAPITAL ? 3 : 2);
}

// Per cell, how far the banks stand above a bridge a road crosses: the lower of the two banks' higher cells, less the
// bridge's own height, at its deepest over every road. The two cells at each end of a road have no bank to read.
function bridgeDepths(world: FeatureWorld, used: Uint8Array): Int32Array {
  const { elevation } = world;
  const bridges = new Uint8Array(elevation.length);
  for (const c of world.bridges) bridges[c] = 1;
  const depth = new Int32Array(elevation.length);
  for (const path of world.roads) {
    for (let k = 2; k < path.length - 2; k++) {
      const c = path[k];
      if (bridges[c] === 0 || used[c] !== 0) continue;
      const bank = Math.min(
        Math.max(elevation[path[k - 1]], elevation[path[k - 2]]),
        Math.max(elevation[path[k + 1]], elevation[path[k + 2]]),
      );
      depth[c] = Math.max(depth[c], bank - elevation[c]);
    }
  }
  return depth;
}

// Where a road crosses a river between steep banks: at most two, apart from each other, the deepest first.
function viaducts(world: FeatureWorld, used: Uint8Array): Spot[] {
  const depth = bridgeDepths(world, used);
  const ranked: Crossing[] = [];
  for (let c = 0; c < depth.length; c++) {
    if (depth[c] >= MIN_DEPTH) ranked.push([depth[c], draw2(world.seed, LANDMARK, GAPS, c), c]);
  }
  ranked.sort((p, q) => q[0] - p[0] || q[1] - p[1] || q[2] - p[2]);
  const out: Spot[] = [];
  for (const [, , c] of ranked) {
    const x = xOf(c, world.width);
    const y = yOf(c, world.width);
    if (out.length < MAX_VIADUCTS && !crowded(x, y, out)) {
      used[c] = 1;
      out.push({ kind: VIADUCT, x, y });
    }
  }
  return out;
}

// High ground below the peaks, with room above for the icon and no other icon on it.
function highGround(world: FeatureWorld, land: Land, cell: number, used: Uint8Array): boolean {
  return (
    land.water[cell] === 0 &&
    world.elevation[cell] >= HILLS_AT &&
    used[cell] === 0 &&
    world.biome[cell] !== PEAK &&
    framed(world, cell)
  );
}

// 2 to 4 cells from the capital, a city or a town; the squares are 4 and 16.
function nearTown(x: number, y: number, towns: readonly Settlement[]): boolean {
  for (const t of towns) {
    const d = dist2(x, y, t.x, t.y);
    if (d >= 4 && d <= 16) return true;
  }
  return false;
}

// Every lookout site, the highest first. A draw of up to 49 is added to the height.
function lookoutSites(world: FeatureWorld, land: Land, used: Uint8Array): Lookout[] {
  const { seed, width, elevation } = world;
  const towns = world.settlements.filter((s) => s.tier === CAPITAL || s.tier === CITY || s.tier === TOWN);
  const sites: Lookout[] = [];
  for (let i = 0; i < elevation.length; i++) {
    if (highGround(world, land, i, used) && nearTown(xOf(i, width), yOf(i, width), towns)) {
      sites.push([elevation[i] + ((draw2(seed, LANDMARK, LOOKOUTS, i) >>> 0) % 50), i]);
    }
  }
  return sites.sort((p, q) => q[0] - p[0] || q[1] - p[1]);
}

// High ground 2 to 4 cells from a town or city: one or two per world, apart from each other.
function observatories(world: FeatureWorld, land: Land, used: Uint8Array): Spot[] {
  const sites = lookoutSites(world, land, used);
  const wanted = 1 + below(2, world.seed, LANDMARK, LOOKOUTS);
  const out: Spot[] = [];
  for (const [, i] of sites) {
    const x = xOf(i, world.width);
    const y = yOf(i, world.width);
    if (out.length < wanted && !crowded(x, y, out)) {
      used[i] = 1;
      out.push({ kind: OBSERVATORY, x, y });
    }
  }
  return out;
}

// Fills each settlement's landmarks in place and returns the ones with cells of their own: lighthouses, then viaducts,
// then observatories. used grows as they are placed, so a later one keeps off an earlier one's cell.
export function landmarks(world: FeatureWorld, land: Land, wonderSpots: readonly Spot[]): Spot[] {
  const { width, height, settlements } = world;
  const used = new Uint8Array(width * height);
  for (const s of settlements) used[s.y * width + s.x] = 1;
  for (const p of wonderSpots) used[p.y * width + p.x] = 1;
  const out: Spot[] = [];
  for (const s of settlements) {
    const light = world.coast[s.y * width + s.x] !== 0 ? lighthouseSpot(world, land, s, used) : -1;
    s.landmarks = chosenKinds(world, land, s, light);
    if (s.landmarks.includes(LIGHTHOUSE)) {
      used[light] = 1;
      out.push({ kind: LIGHTHOUSE, x: xOf(light, width), y: yOf(light, width) });
    }
  }
  out.push(...viaducts(world, used));
  out.push(...observatories(world, land, used));
  return out;
}
