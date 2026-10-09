import { below, draw2, floorDiv } from '@nomos/sim-core/kernels';
import { TIER_NAMES } from '@nomos/sim-protocol/world-map';
import { dist2, xOf, yOf } from '../grid/grid.ts';
import { SETTLEMENT } from '../random/streams.ts';

type TierName = (typeof TIER_NAMES)[number];

export const CAPITAL = TIER_NAMES.indexOf('capital');
export const CITY = TIER_NAMES.indexOf('city');
export const TOWN = TIER_NAMES.indexOf('town');
export const VILLAGE = TIER_NAMES.indexOf('village');
export const HAMLET = TIER_NAMES.indexOf('hamlet');

const FIELDS_OF: Record<TierName, number> = { capital: 3, city: 2, town: 2, village: 1, hamlet: 1 };
export const FIELDS: readonly number[] = TIER_NAMES.map((name) => FIELDS_OF[name]);

const MIN_SCORE = 30;
// The best few sites, which become the capital and cities, keep further apart. Both spacings are squared distances.
const LEADERS = 5;
const LEADER_SPACING = 12 * 12;
// A country map shows only its notable places, so the k-th shown place has a true rank that grows faster than k: exactly
// P1/k for the top HEAD, then steeper, reaching the villages and hamlets that plain P1/k over 35-75 places never would.
const HEAD = 6;
const TAIL = 2;

// settle.py's sub-purposes of the SETTLEMENT stream, by value. Its CAPITAL (2) is CAPITAL_PEOPLE here, since CAPITAL is
// the tier code. farm.ts draws on FIELD.
const PER = 0;
const JITTER = 1;
const CAPITAL_PEOPLE = 2;
const SIZE = 3;
export const FIELD = 4;

export interface Settlement {
  id: number;
  x: number;
  y: number;
  tier: number;
  population: number;
  // The settlement's cell. Per-settlement draws key on it, because ids follow population rank and an edit that adds or
  // removes a place would re-roll every place ranked below it.
  uid: number;
  landmarks: number[];
}

// Every cell scoring MIN_SCORE or more, best first: the score jittered to 75% to 125%, with ties to the lower cell.
function rankedCells(seed: number, score: Int32Array): number[] {
  const jittered = new Int32Array(score.length);
  const ranked: number[] = [];
  for (let i = 0; i < score.length; i++) {
    if (score[i] < MIN_SCORE) continue;
    jittered[i] = floorDiv(score[i] * (768 + ((draw2(seed, SETTLEMENT, JITTER, i) >>> 0) % 513)), 1024);
    ranked.push(i);
  }
  return ranked.sort((a, b) => jittered[b] - jittered[a] || a - b);
}

function clearOf(taken: readonly (readonly [number, number])[], x: number, y: number, need: number): boolean {
  for (let k = 0; k < taken.length; k++) {
    if (dist2(x, y, taken[k][0], taken[k][1]) < need) return false;
  }
  return true;
}

function takeSites(ranked: readonly number[], width: number, spacing: number, target: number): [number, number][] {
  const taken: [number, number][] = [];
  for (let k = 0; k < ranked.length && taken.length < target; k++) {
    const x = xOf(ranked[k], width);
    const y = yOf(ranked[k], width);
    const need = taken.length < LEADERS ? LEADER_SPACING : spacing;
    if (clearOf(taken, x, y, need)) taken.push([x, y]);
  }
  return taken;
}

// Best sites first, each at least a spacing from those already taken (the first few further still); the spacing shrinks
// until the land's quota of settlements fits.
export function sites(
  seed: number,
  width: number,
  height: number,
  score: Int32Array,
  landCells: number,
): [number, number][] {
  const target = Math.max(4, floorDiv(landCells, 50 + below(21, seed, SETTLEMENT, PER)));
  const ranked = rankedCells(seed, score);
  let spacing = floorDiv(landCells * 64, target * 100);
  for (;;) {
    const taken = takeSites(ranked, width, spacing, target);
    if (taken.length === target || spacing <= 4) return taken;
    spacing = floorDiv(spacing * 3, 4);
  }
}

export function tierOf(id: number, population: number): number {
  if (id === 0) return CAPITAL;
  if (population >= 50_000) return CITY;
  if (population >= 5_000) return TOWN;
  if (population >= 500) return VILLAGE;
  return HAMLET;
}

function rankOf(k: number): number {
  const late = Math.max(0, k - HEAD);
  return k + floorDiv(late * late, TAIL);
}

// Settlements in id order: id 0 is the capital, then by falling population.
export function settle(
  seed: number,
  width: number,
  height: number,
  score: Int32Array,
  landCells: number,
): Settlement[] {
  const spots = sites(seed, width, height, score, landCells);
  const top = 150_000 + below(350_001, seed, SETTLEMENT, CAPITAL_PEOPLE);
  const people: number[] = [];
  for (let k = 1; k <= spots.length; k++) {
    const [x, y] = spots[k - 1];
    const sizePermille = 750 + below(501, seed, SETTLEMENT, SIZE, y * width + x);
    people.push(floorDiv(floorDiv(top, rankOf(k)) * sizePermille, 1000));
  }
  const order = spots.map((_, k) => k).sort((a, b) => people[b] - people[a] || a - b);
  const out: Settlement[] = [];
  for (let id = 0; id < order.length; id++) {
    const k = order[id];
    const [x, y] = spots[k];
    out.push({ id, x, y, tier: tierOf(id, people[k]), population: people[k], uid: y * width + x, landmarks: [] });
  }
  return out;
}
