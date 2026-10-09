import { floorDiv } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { bare } from './decor.ts';
import { HERD } from './keys.ts';
import { BEAST_Y, DIRS, type Cell, type Site } from './site.ts';

const HERDS = ['cow', 'sheep', 'goat', 'horse'];
const HERD_POSES = ['graze_left', 'graze_right', 'idle_left', 'idle_right', 'idle_down'];
const CHICKEN_POSES = ['peck_left', 'peck_right', 'idle_down', 'walk_left_0'];
const DUCKS = ['duck_swim_left_0', 'duck_swim_right_0'];
const PETS = ['dog', 'cat'];
const PET_FACINGS = ['down', 'left', 'right'];

function putAnimal(site: Site, name: string, x: number, y: number, rowY: number): void {
  site.put('animals', name, x * TILE + floorDiv(TILE, 2), y * TILE + rowY);
}

export function herd(site: Site): void {
  site.pastures.forEach((rect, i) => graze(site, rect, i));
  const homes = site.doors.filter(
    (d) => d.name.includes('farmhouse') || d.name === 'work_farm' || d.name === 'work_pasture',
  );
  homes.slice(0, 3).forEach((home, i) => chickens(site, home.x, home.y, i));
  ducks(site);
  if (site.ctx.tier && site.doors.length > 0) pet(site);
}

function graze(site: Site, [tx, ty, fw, fh]: readonly number[], i: number): void {
  const hilly = site.ctx.biome === 'hills' || site.ctx.biome === 'mountain';
  const species = hilly ? 'goat' : site.pick(HERDS, HERD, i);
  const cells: Cell[] = [];
  for (let y = ty; y < ty + fh; y++) {
    for (let x = tx; x < tx + fw; x++) cells.push([x, y]);
  }
  const count = Math.min(floorDiv(cells.length, 2), 2 + site.below(3, HERD, i, 1));
  for (let k = 0; k < count; k++) {
    const [x, y] = cells[site.below(cells.length, HERD, i, 2, k)];
    if (site.solid[site.at(x, y)] !== null) continue;
    site.solid[site.at(x, y)] = species;
    putAnimal(site, `${species}_${site.pick(HERD_POSES, HERD, i, 3, k)}`, x, y, BEAST_Y);
  }
}

function chickens(site: Site, hx: number, hy: number, i: number): void {
  const count = 2 + site.below(2, HERD, 10, i);
  for (let k = 0; k < count; k++) {
    const x = hx + site.below(5, HERD, 11, i, k) - 2;
    const y = hy + site.below(3, HERD, 12, i, k);
    if (!bare(site, x, y)) continue;
    site.solid[site.at(x, y)] = 'chicken';
    putAnimal(site, `chicken_${site.pick(CHICKEN_POSES, HERD, 13, i, k)}`, x, y, BEAST_Y);
  }
}

function ducks(site: Site): void {
  const pond: Cell[] = [];
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) {
      if (pondTile(site, x, y)) pond.push([x, y]);
    }
  }
  const count = Math.min(pond.length, 2 + site.below(2, HERD, 20));
  for (let k = 0; k < count; k++) {
    const [x, y] = pond[site.below(pond.length, HERD, 21, k)];
    if (site.solid[site.at(x, y)] !== null) continue;
    site.solid[site.at(x, y)] = 'duck';
    putAnimal(site, site.pick(DUCKS, HERD, 22, k), x, y, 11);
  }
}

// Fresh water with water on at least three sides, off the roads.
function pondTile(site: Site, x: number, y: number): boolean {
  const c = site.at(x, y);
  if (!site.water(x, y) || site.sea[c] || site.road[c]) return false;
  return DIRS.filter(([dx, dy]) => site.water(x + dx, y + dy)).length >= 3;
}

// One dog or cat, beside the first door a keyed draw picks that has room.
function pet(site: Site): void {
  const kind = site.pick(PETS, HERD, 30);
  for (let k = 0; k < site.doors.length; k++) {
    const { x, y } = site.doors[site.below(site.doors.length, HERD, 31, k)];
    const spot = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
    ].find(([cx, cy]) => site.inside(cx, cy) && site.standable(cx, cy));
    if (!spot) continue;
    site.solid[site.at(spot[0], spot[1])] = kind;
    putAnimal(site, `${kind}_idle_${site.pick(PET_FACINGS, HERD, 32)}`, spot[0], spot[1], BEAST_Y);
    return;
  }
}
