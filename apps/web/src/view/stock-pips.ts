import type { PipSite } from '@nomos/render-gl/town';
import { BREAD, FEED_GOODS, type EconomyMessage, type MapV1 } from '@nomos/sim-protocol';
import { PLACE_TILE_PX } from '@nomos/sim-protocol/place';
import { premisesOf, sells, type Premises } from '@nomos/sim-protocol/premises';

// Beads count days of cover, the units in stock at the day's end over the units sold in it. None with no stock; one under a
// day, which is where a food firm turns hirer (decideFood); two under three days, the shelf life of the quickest food to spoil
// (fish, DAYS_ON_SALE 3); and three beyond. A durable good's firms keep weeks of stock (decideGoods), so they show three until
// a shock drains them. Compared as products, so stock that nobody bought reads as full.
export function stockLevel(stock: number, sold: number): number {
  if (stock <= 0) return 0;
  if (stock < sold) return 1;
  return stock < 3 * sold ? 2 : 3;
}

// A premises as the layout draws it: worldgen anchors a building's sprite at the bottom middle of its footprint.
function siteOf(map: MapV1, premises: Premises): PipSite {
  const { x, y, w, h, frame } = map.entities[premises.entity];
  return {
    frame: map.frames[frame],
    x: x * PLACE_TILE_PX + ((w * PLACE_TILE_PX) >> 1),
    y: (y + h) * PLACE_TILE_PX - 1,
    stall: premises.stall,
  };
}

// The shops and stalls of the town on show and the beads each wears from the economy feed's latest day (M2.7 Part 1, Ruling
// 8). The feed holds each good's stock for the whole town, so every premises of a good shows the same level, and one that
// sells several, a village's general shop, adds its goods up. Made when a town is shown; reading a feed makes nothing.
export class StockPips {
  // Where each premises' sprite stands, in `premisesOf`'s order, which `levels` follows. A town with no premises has none.
  readonly sites: PipSite[];
  readonly levels: Uint8Array;
  private readonly premises: Premises[];

  constructor(map: MapV1) {
    this.premises = premisesOf(map);
    this.sites = this.premises.map((premises) => siteOf(map, premises));
    this.levels = new Uint8Array(this.premises.length);
  }

  // Fills `levels` from the feed's newest day, which the feed must hold, and returns them.
  read(feed: EconomyMessage): Uint8Array {
    const newest = feed.days - 1;
    for (let p = 0; p < this.premises.length; p++) {
      let stock = 0;
      let sold = 0;
      for (let g = 0; g < FEED_GOODS; g++) {
        if (!sells(this.premises[p], BREAD + g)) continue;
        stock += feed.stockUnits[g][newest];
        sold += feed.soldUnits[g][newest];
      }
      this.levels[p] = stockLevel(stock, sold);
    }
    return this.levels;
  }
}
