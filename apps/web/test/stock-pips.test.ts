import { readFileSync } from 'node:fs';
import { ENTITY_HOME, ENTITY_SHOP, createEconomyFeed, parseMap, type MapEntity, type MapV1 } from '@nomos/sim-protocol';
import { buildPlace, TOWN } from '@nomos/worldgen';
import { describe, expect, it } from 'vitest';
import { StockPips, stockLevel } from '../src/view/stock-pips.ts';

const TOWN_MAP = new URL('../../../assets/maps/town.nmap', import.meta.url);
// Series g of a per-good array is good BREAD + g.
const BREAD_SERIES = 0;
const FISH_SERIES = 2;
const CLOTH_SERIES = 4;

function building(kind: MapEntity['kind'], frame: number, x: number, y: number, w: number, h: number): MapEntity {
  return { kind, x, y, w, h, doorX: x + (w >> 1), doorY: y + h, frame, capacity: 0, opens: 0, closes: 0 };
}

// Only the frames and entities matter to a town's premises.
function mapOf(frames: string[], entities: MapEntity[]): MapV1 {
  const none = new Uint8Array(0);
  return { version: 1, width: 40, height: 30, kinds: [], frames, terrain: none, walk: none, tiles: new Uint16Array(0), entities };
}

// Two days of a feed, the newest second: the first day holds nothing, so a read that took it would show.
function feedOf(series: Record<number, [stock: number, sold: number]>) {
  const feed = createEconomyFeed();
  feed.days = 2;
  for (const [g, [stock, sold]] of Object.entries(series)) {
    feed.stockUnits[Number(g)][1] = stock;
    feed.soldUnits[Number(g)][1] = sold;
  }
  return feed;
}

describe('the stock level', () => {
  it('is none at 0, one under a day of sales, two under three days, and three beyond', () => {
    expect(stockLevel(0, 500)).toBe(0);
    expect(stockLevel(499, 500)).toBe(1);
    expect(stockLevel(500, 500)).toBe(2);
    expect(stockLevel(1499, 500)).toBe(2);
    expect(stockLevel(1500, 500)).toBe(3);
  });

  it('reads stock that nobody bought as full, and no stock as none, whatever the sales', () => {
    expect(stockLevel(40, 0)).toBe(3);
    expect(stockLevel(0, 0)).toBe(0);
  });
});

describe('stock pips', () => {
  const frames = ['buildings/shop_bakery', 'buildings/shop_market-stall_fish', 'houses/house_a_1', 'buildings/shop_market-stall'];
  const map = mapOf(frames, [
    building(ENTITY_SHOP, 0, 10, 20, 5, 3),
    building(ENTITY_HOME, 2, 4, 4, 2, 2),
    building(ENTITY_SHOP, 1, 20, 12, 3, 2),
  ]);

  it("puts a premises' sprite at the bottom middle of its footprint, and marks its stalls", () => {
    const { sites } = new StockPips(map);

    expect(sites).toEqual([
      { frame: 'buildings/shop_bakery', x: 10 * 16 + 40, y: 23 * 16 - 1, stall: false },
      { frame: 'buildings/shop_market-stall_fish', x: 20 * 16 + 24, y: 14 * 16 - 1, stall: true },
    ]);
  });

  it("reads each premises' level from its good's newest day, and none for a good with no stock", () => {
    const pips = new StockPips(map);
    const levels = pips.read(feedOf({ [BREAD_SERIES]: [4_000, 2_000], [FISH_SERIES]: [0, 1_900] }));

    expect([...levels]).toEqual([2, 0]);
    expect(levels).toBe(pips.levels);
    expect([...pips.read(feedOf({ [BREAD_SERIES]: [900, 2_000], [FISH_SERIES]: [9_000, 1_900] }))]).toEqual([1, 3]);
  });

  it('adds up the goods of a premises that sells them all, so a general stall closes only when none is in stock', () => {
    const village = new StockPips(mapOf(frames, [building(ENTITY_SHOP, 3, 12, 8, 3, 2)]));

    expect([...village.read(feedOf({ [BREAD_SERIES]: [0, 800], [CLOTH_SERIES]: [3_000, 20] }))]).toEqual([3]);
    expect([...village.read(feedOf({ [BREAD_SERIES]: [10, 800], [CLOTH_SERIES]: [30, 20] }))]).toEqual([1]);
    expect([...village.read(feedOf({ [BREAD_SERIES]: [0, 800], [CLOTH_SERIES]: [0, 20] }))]).toEqual([0]);
  });

  it('has no sites and no levels for a town with no premises', () => {
    const hamlet = new StockPips(mapOf(frames, [building(ENTITY_HOME, 2, 4, 4, 2, 2)]));

    expect(hamlet.sites).toEqual([]);
    expect(hamlet.read(feedOf({ [BREAD_SERIES]: [0, 0] }))).toHaveLength(0);
  });
});

describe("Highcourt's premises", { timeout: 60_000 }, () => {
  // So each pip stands over a sprite the skin draws: the committed map's premises, which the sim sells from, and the layout
  // the Town skin draws must agree on where each stands.
  it("have a sprite in the town's layout at the anchor the map's footprint gives", () => {
    const map = parseMap(new Uint8Array(readFileSync(TOWN_MAP)).buffer);
    const { layout } = buildPlace(TOWN);
    const { sites } = new StockPips(map);
    const standing = new Set<string>();
    for (let at = 0; at < layout.standing.length; at += 3) {
      standing.add(`${layout.frames[layout.standing[at]]} ${layout.standing[at + 1]} ${layout.standing[at + 2]}`);
    }

    expect(sites).toHaveLength(22);
    expect(sites.filter((site) => site.stall)).toHaveLength(6);
    expect(sites.filter((site) => !standing.has(`${site.frame} ${site.x} ${site.y}`))).toEqual([]);
  });
});
