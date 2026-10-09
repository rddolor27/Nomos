import { floorDiv } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { MARK } from './keys.ts';
import { CLIFFS, frame, rise, type Rect, type Site } from './site.ts';

type Spot = [cost: number, x: number, y: number];

const LANDMARK_FRAMES: Readonly<Record<string, string>> = {
  lighthouse: 'landmark_lighthouse_0',
  windmill: 'landmark_windmill_0',
  fountain: 'landmark_fountain_0',
};
const ON_LOTS = ['library', 'glasshouse', 'observatory', 'amphitheatre', 'garden-terraces'];
const VIADUCT: readonly (readonly [name: string, dx: number])[] = [
  ['landmark_viaduct_end-left', -4],
  ['landmark_viaduct_span', 0],
  ['landmark_viaduct_end-right', 2],
];

export function landmarkFrame(kind: string): string {
  return LANDMARK_FRAMES[kind] ?? `landmark_${kind}`;
}

function cheaper(best: Spot | null, cost: number, x: number, y: number): Spot | null {
  return best === null || cost < best[0] ? [cost, x, y] : best;
}

export function lighthouse(site: Site): void {
  const name = landmarkFrame('lighthouse');
  const up = rise(frame('landmarks', name));
  let best: Spot | null = null;
  for (let ty = 1; ty < site.h - 2; ty++) {
    for (let tx = 0; tx < site.w - 3; tx++) {
      if (!lighthouseFits(site, tx, ty, up)) continue;
      best = cheaper(best, site.below(10, MARK, 20, tx, ty) - Math.abs(tx + 1 - site.cx), tx, ty);
    }
  }
  if (best) site.build('landmarks', name, best[1], best[2]);
}

// Two free rows of three tiles on the shore, with sea in front of the middle of the lower row.
function lighthouseFits(site: Site, tx: number, ty: number, up: number): boolean {
  for (const y of [ty, ty + 1]) {
    for (let x = tx; x < tx + 3; x++) {
      if (!lighthouseGround(site, site.at(x, y))) return false;
    }
  }
  if (!(site.sea[site.at(tx + 1, ty + 1)] && !site.water(tx + 1, ty))) return false;
  return nothingAbove(site, tx, ty, 3, up);
}

function lighthouseGround(site: Site, c: number): boolean {
  return site.solid[c] === null && !site.road[c] && !site.shade[c] && !CLIFFS.includes(site.kind[c]);
}

// No sprite stands in the rows the image rises into.
function nothingAbove(site: Site, tx: number, ty: number, fw: number, up: number): boolean {
  for (let y = Math.max(0, ty - up); y < ty; y++) {
    for (let x = tx; x < tx + fw; x++) {
      if (site.solid[site.at(x, y)] !== null) return false;
    }
  }
  return true;
}

// A viaduct over a river two tiles wide, where four free tiles flank it on each side.
export function viaduct(site: Site): void {
  let best: Spot | null = null;
  for (let y = 2; y < site.h - 1; y++) {
    for (let x = 5; x < site.w - 6; x++) {
      if (!viaductFits(site, x, y)) continue;
      let onRoad = 0;
      for (const cx of viaductEnds(x)) onRoad += site.road[site.at(cx, y)];
      best = cheaper(best, -onRoad * 4 + Math.abs(y - site.cy) + site.below(4, MARK, 30, x, y), x, y);
    }
  }
  if (best === null) return;
  const [, x, y] = best;
  for (const [name, dx] of VIADUCT) site.build('landmarks', name, x + dx, y);
  site.ground = site.ground.filter((s) => !underViaduct(s.name, s.x, s.y, x, y));
}

function viaductEnds(x: number): number[] {
  return [x - 4, x - 3, x - 2, x - 1, x + 2, x + 3, x + 4, x + 5];
}

function viaductFits(site: Site, x: number, y: number): boolean {
  if (!(site.water(x, y) && site.water(x + 1, y)) || site.water(x - 1, y) || site.water(x + 2, y)) return false;
  for (const cx of viaductEnds(x)) {
    if (!endFree(site, cx, y)) return false;
  }
  for (let cx = x - 4; cx < x + 6; cx++) {
    if (site.shade[site.at(cx, y)]) return false;
  }
  return clearBehind(site, x, y);
}

// Nothing stands, and no footprint lies, in the two rows behind the viaduct's image.
function clearBehind(site: Site, x: number, y: number): boolean {
  for (const ry of [y - 2, y - 1]) {
    for (let cx = x - 4; cx < x + 6; cx++) {
      if (site.solid[site.at(cx, ry)] !== null || site.big[site.at(cx, ry)]) return false;
    }
  }
  return true;
}

// An end of the viaduct stands on dry, open land or a dirt path.
function endFree(site: Site, cx: number, y: number): boolean {
  if (!site.inside(cx, y)) return false;
  const c = site.at(cx, y);
  if (site.solid[c] !== null || site.water(cx, y) || CLIFFS.includes(site.kind[c])) return false;
  return !(site.road[c] && site.kind[c] !== 'path');
}

function underViaduct(name: string, sx: number, sy: number, x: number, y: number): boolean {
  const tx = floorDiv(sx, TILE);
  return name === 'prop_footbridge' && floorDiv(sy, TILE) === y && x - 2 <= tx && tx <= x + 3;
}

// Every landmark but the windmill, which waits for the fields it stands among.
export function placeLandmarks(site: Site): void {
  const marks = site.ctx.landmarks;
  if (marks.includes('viaduct') && hasRiver(site)) viaduct(site);
  if (marks.includes('lighthouse') && site.ctx.sea) lighthouse(site);
  ON_LOTS.forEach((kind, i) => {
    if (!marks.includes(kind)) return;
    const name = `landmark_${kind}`;
    const f = frame('landmarks', name);
    const doors = [floorDiv(f.footprintW * TILE, 2)];
    const lot = site.findLot(f.footprintW, f.footprintH, rise(f), doors, [site.cx, site.cy], { spur: 2, salt: 40 + i });
    if (lot) site.settle('landmarks', name, lot);
  });
  for (const kind of ['clock-tower', 'fountain']) {
    if (!marks.includes(kind) || site.plaza !== null) continue;
    const name = landmarkFrame(kind);
    const f = frame('landmarks', name);
    const lot = site.findLot(f.footprintW, f.footprintH, rise(f), [], [site.cx, site.cy + 3], { salt: 50 });
    if (lot) site.build('landmarks', name, lot.tx, lot.ty);
  }
}

// Water that is not the sea: a river or a pond.
function hasRiver(site: Site): boolean {
  for (let c = 0; c < site.kind.length; c++) {
    if (site.kind[c] === 'water' && !site.sea[c]) return true;
  }
  return false;
}

export function placeWindmill(site: Site): void {
  const name = landmarkFrame('windmill');
  const up = rise(frame('landmarks', name));
  const rects = [...site.fields, ...site.pastures];
  let best: Spot | null = null;
  for (let ty = 1; ty < site.h - 2; ty++) {
    for (let tx = 0; tx < site.w - 3; tx++) {
      if (!site.fits(tx, ty, 3, 2, up, (x, y) => site.buildable(x, y))) continue;
      const edge = Math.min(tx, site.w - 3 - tx, ty, site.h - 2 - ty);
      const cost = nearestField(rects, tx, ty) * 4 + edge * 3 + site.below(6, MARK, 60, tx, ty);
      best = cheaper(best, cost, tx, ty);
    }
  }
  if (best) site.build('landmarks', name, best[1], best[2]);
}

function nearestField(rects: readonly Rect[], tx: number, ty: number): number {
  let near: number | null = null;
  for (const [fx, fy, fw, fh] of rects) {
    const d = Math.abs(tx + 1 - (fx + floorDiv(fw, 2))) + Math.abs(ty + 1 - (fy + floorDiv(fh, 2)));
    if (near === null || d < near) near = d;
  }
  return near ?? 0;
}
