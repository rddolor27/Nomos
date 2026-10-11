import { SITE_GREEN, SITE_PLAZA, SITE_WATER } from '@nomos/sim-core/kernels';
import { ENTITY_GREEN, ENTITY_PLAZA, WALK_BLOCKED, WALK_OPEN, type MapEntity, type MapV1 } from './map.ts';

// Where blobs go for their own sake (M3.2 Ruling 5): a place's plaza, its greens and up to WATER_SITES edges of water. A
// leisure site is a ShopSite that sells nothing, so createShops takes the premises and then these, and each site gets a flow
// field of its own.
export const WATER_SITES = 3;
// Water edges lie at least this many tiles apart, as the tiles walk, so each is a place of its own along a river.
export const WATER_APART = 12;
const WATER_KIND = 'water';
const STEPS: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export interface LeisureSite {
  // SITE_PLAZA, SITE_GREEN or SITE_WATER.
  kind: number;
  // The tile its field floods from: where the place gathers.
  doorX: number;
  doorY: number;
  // The ground it covers, for the spots people stand on: a water edge is one tile.
  x: number;
  y: number;
  w: number;
  h: number;
  goods: 0;
  stall: false;
}

function siteOf(kind: number, { doorX, doorY, x, y, w, h }: Pick<MapEntity, 'doorX' | 'doorY' | 'x' | 'y' | 'w' | 'h'>): LeisureSite {
  return { kind, doorX, doorY, x, y, w, h, goods: 0, stall: false };
}

// The cells a blob can walk to from `start`, as 1 in a cell. Four steps reach exactly what the walk grid's eight do, since a
// diagonal step needs both cells it passes between to be open.
function reachableFrom(map: MapV1, start: number): Uint8Array {
  const { width, height, walk } = map;
  const reach = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let tail = 0;
  reach[start] = 1;
  queue[tail++] = start;
  for (let head = 0; head < tail; head++) {
    const x = queue[head] % width;
    const y = (queue[head] - x) / width;
    for (const [dx, dy] of STEPS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = ny * width + nx;
      if (reach[next] === 1 || walk[next] === WALK_BLOCKED) continue;
      reach[next] = 1;
      queue[tail++] = next;
    }
  }
  return reach;
}

function touchesWater(map: MapV1, water: number, cell: number): boolean {
  const { width, height, terrain } = map;
  const x = cell % width;
  const y = (cell - x) / width;
  return STEPS.some(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    return nx >= 0 && ny >= 0 && nx < width && ny < height && terrain[ny * width + nx] === water;
  });
}

// The open ground the plaza can walk to that lies beside water: a bank, not a road, a door or a bridge.
function banksOf(map: MapV1, reach: Uint8Array): number[] {
  const water = map.kinds.findIndex((kind) => kind.name === WATER_KIND);
  const banks: number[] = [];
  if (water < 0) return banks;
  for (let cell = 0; cell < map.width * map.height; cell++) {
    if (reach[cell] === 1 && map.walk[cell] === WALK_OPEN && touchesWater(map, water, cell)) banks.push(cell);
  }
  return banks;
}

function distance(width: number, a: number, b: number): number {
  const ax = a % width;
  const bx = b % width;
  return Math.abs(ax - bx) + Math.abs((a - ax) / width - (b - bx) / width);
}

// Up to WATER_SITES banks, each the nearest to the plaza of those at least WATER_APART from the ones chosen before it, the first
// in reading order at a tie, so a river through a town gives a few places along it rather than one.
function waterEdges(map: MapV1, reach: Uint8Array, plazaDoor: number): LeisureSite[] {
  const banks = banksOf(map, reach);
  const chosen: number[] = [];
  while (chosen.length < WATER_SITES) {
    let best = -1;
    let bestCost = Number.MAX_SAFE_INTEGER;
    for (const bank of banks) {
      const cost = distance(map.width, bank, plazaDoor);
      if (cost >= bestCost || chosen.some((other) => distance(map.width, bank, other) < WATER_APART)) continue;
      best = bank;
      bestCost = cost;
    }
    if (best < 0) break;
    chosen.push(best);
  }
  return chosen.map((cell) => {
    const x = cell % map.width;
    const y = (cell - x) / map.width;
    return siteOf(SITE_WATER, { doorX: x, doorY: y, x, y, w: 1, h: 1 });
  });
}

// The leisure sites of a map that its plaza can walk to, in the order of the plaza, the greens as the map lists them, and the
// water edges nearest the plaza first. A map with no plaza has none: a plaza is what the rest are reached from. At most a plaza,
// 3 greens and 3 water edges of a capital, so 7 beside its 22 premises.
export function leisureOf(map: MapV1): LeisureSite[] {
  const plaza = map.entities.find((entity) => entity.kind === ENTITY_PLAZA);
  if (plaza === undefined) return [];
  const plazaDoor = plaza.doorY * map.width + plaza.doorX;
  const reach = reachableFrom(map, plazaDoor);
  const sites = [siteOf(SITE_PLAZA, plaza)];
  for (const entity of map.entities) {
    if (entity.kind === ENTITY_GREEN && reach[entity.doorY * map.width + entity.doorX] === 1) sites.push(siteOf(SITE_GREEN, entity));
  }
  return sites.concat(waterEdges(map, reach, plazaDoor));
}
