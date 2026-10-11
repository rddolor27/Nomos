import { FISH, MILK, VEGETABLES, floorDiv, floorMod } from '@nomos/sim-core/kernels';
import { TRADES } from '@nomos/sim-protocol/premises';
import { TRADE } from './keys.ts';
import { onPlaza, plazaOf, towerLeft } from './settlement.ts';
import { doorOffset, frame, rise, type Cell, type CellTest, type Lot, type Site } from './site.ts';

// The trades that sell from stalls in the market on the plaza. Every other trade has shops, each in a part of town of its own.
const MARKET: readonly number[] = [VEGETABLES, FISH, MILK];
// Buildings a trade gets (the owner's several buildings to a trade, 11 October 2026): each market trade 2 stalls, and each
// shop trade as many shops as its tier has. At Highcourt's 268 firms the trades' shares of the firm rows run to about 6 a
// stall and 3 to 18 a shop.
const STALLS = 2;
const SHOPS: Readonly<Record<string, number>> = { capital: 4, city: 4, town: 3 };
// The eight sectors of a town round its plaza, clockwise from north. Trade t starts at sector 3t, so the seven start apart,
// and its n shops then fall 8 / n sectors apart.
const SECTORS: readonly Cell[] = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
const SECTOR_STEP = 3;
// A shop's door may lie this many steps from a street, or this many when its sector has no lot and it goes by the plaza.
const SHOP_SPUR = 1;
const CENTRE_SPUR = 3;

// The premises of a town, city or capital (M2.7 Part 1, Ruling 1): each trade's stalls on the plaza and shops across the
// town. Round r gives every trade its r-th building before any gets another, so a place with little room gives each trade
// one before it gives any a second. A village keeps its one general shop or stalls, and a hamlet has none.
export function placeTrades(site: Site): void {
  if (site.plaza === null) return;
  const doors = doorTiles(site);
  const shops = SHOPS[site.ctx.tier ?? ''];
  for (let round = 0; round < Math.max(STALLS, shops); round++) {
    TRADES.forEach((trade, t) => {
      const market = MARKET.indexOf(trade.good);
      const count = market >= 0 ? STALLS : shops;
      if (round >= count) return;
      const name = site.pick(trade.frames, TRADE, t, round, 2);
      const lot =
        market >= 0 ? stallLot(site, doors, name, round * MARKET.length + market) : shopLot(site, doors, name, t, round, count);
      if (lot === null) return;
      site.settle('buildings', name, lot);
      // settle notes the door last.
      const { x, y } = site.doors[site.doors.length - 1];
      doors[site.at(x, y)] = 1;
    });
  }
}

// The tiles of the doors built so far, which no premises's image may rise over.
function doorTiles(site: Site): Uint8Array {
  const doors = new Uint8Array(site.w * site.h);
  for (const { x, y } of site.doors) doors[site.at(x, y)] = 1;
  return doors;
}

// Ground a premises may stand on, beyond `base`: the tile below each cell is on the map and under no building's image,
// and no door lies in the rows the premises's own image will rise over, so nobody at a door is hidden.
function inView(site: Site, doors: Uint8Array, up: number, base: CellTest): CellTest {
  return (x, y) => {
    if (!base(x, y) || !site.inside(x, y + 1) || site.shade[site.at(x, y + 1)]) return false;
    for (let k = 1; k <= up; k++) {
      if (site.inside(x, y - k) && doors[site.at(x, y - k)]) return false;
    }
    return true;
  };
}

// A stall's lot: on the plaza near one of its ends, the ends taking stalls in turn, or else off it near its top middle.
function stallLot(site: Site, doors: Uint8Array, name: string, k: number): Lot | null {
  const [px, py, pw, ph] = plazaOf(site);
  const f = frame('buildings', name);
  const up = rise(f);
  const target: Cell = [((k & 1) === 0) === towerLeft(site) ? px + pw - 3 : px + 2, py + ph - 1];
  const onPlazaOk = inView(site, doors, up, (x, y) => onPlaza(site, x, y));
  const offPlazaOk = inView(site, doors, up, (x, y) => site.buildable(x, y));
  return (
    site.findLot(f.footprintW, f.footprintH, up, [], target, { groundOk: onPlazaOk, salt: 10 + k }) ??
    site.findLot(f.footprintW, f.footprintH, up, [doorOffset(f)], [site.cx, py], { spur: 0, groundOk: offPlazaOk, salt: 20 + k })
  );
}

// A shop's lot: the nearest to its sector's aim whose door reaches a street, or else the nearest to the plaza's middle.
function shopLot(site: Site, doors: Uint8Array, name: string, t: number, j: number, count: number): Lot | null {
  const f = frame('buildings', name);
  const up = rise(f);
  const groundOk = inView(site, doors, up, (x, y) => site.buildable(x, y));
  const salt = 2000 + 10 * t + j;
  const search = (target: Cell, spur: number): Lot | null =>
    site.findLot(f.footprintW, f.footprintH, up, [doorOffset(f)], target, { spur, groundOk, salt });
  return search(sectorAim(site, t, j, count), SHOP_SPUR) ?? search([site.cx, site.cy], CENTRE_SPUR);
}

// Half way from the plaza's middle to the wall in the building's sector, moved by up to 4 tiles across and 2 down.
function sectorAim(site: Site, t: number, j: number, count: number): Cell {
  const { wall } = site;
  if (wall === null) throw new Error('a town stage ran before lay_town');
  const [dx, dy] = SECTORS[floorMod(SECTOR_STEP * t + floorDiv(8 * j, count), 8)];
  return [
    site.cx + floorDiv(dx * (wall.x1 - wall.x0), 4) + site.below(9, TRADE, t, j, 0) - 4,
    site.cy + floorDiv(dy * (wall.y1 - wall.y0), 4) + site.below(5, TRADE, t, j, 1) - 2,
  ];
}
