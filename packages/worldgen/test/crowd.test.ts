import { CROWD_HUES, CROWD_Q, CROWD_STOPS, WORLD_SIZES, type WorldMap } from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import { crowdOf } from '../src/crowd/crowd.ts';

const WIDTH = 12;
const HEIGHT = 8;
type Place = readonly [x: number, y: number, people: number, country: number];
// Settlements in id order, as [x, y, population, country]: 90 dots, then 9, then a hamlet's one.
const PLACES = [
  [5, 2, 9000, 1],
  [8, 4, 999, 2],
  [1, 6, 40, 1],
] as const;
// 71 dots, the most a reach of 1 holds, on open land: the settlement and its four neighbours are all country 1.
const OPEN: Place = [2, 3, 7100, 1];
// The furthest, in cells either way, a stop may stand from its settlement: its reach, plus the block around its home.
const FARTHEST = [3, 2, 2];
const OWNERS = [...Array<number>(90).fill(0), ...Array<number>(9).fill(1), 2];

// Two countries inside a ring of sea, country 1 west of x = 6, with a lake at (4, 3). crowdOf reads only the seed,
// the size, the countries and the settlements.
function tinyWorld(seed: number, places: readonly Place[] = PLACES): WorldMap {
  const n = WIDTH * HEIGHT;
  const country = new Uint8Array(n);
  for (let y = 1; y < HEIGHT - 1; y++) {
    for (let x = 1; x < WIDTH - 1; x++) country[y * WIDTH + x] = x < 6 ? 1 : 2;
  }
  country[3 * WIDTH + 4] = 0;
  const count = places.length;
  return {
    version: 1,
    seed,
    width: WIDTH,
    height: HEIGHT,
    template: 0,
    wind: 0,
    cold: 0,
    elevation: new Int16Array(n),
    biome: new Uint8Array(n),
    temperature: new Uint8Array(n),
    moisture: new Uint8Array(n),
    river: new Uint8Array(n),
    receiver: new Int32Array(n),
    coast: new Uint8Array(n),
    variant: new Uint8Array(n),
    country,
    region: new Uint16Array(n),
    market: new Uint16Array(n),
    settlements: {
      cell: Int32Array.from(places, ([x, y]) => y * WIDTH + x),
      tier: new Uint8Array(count),
      population: Int32Array.from(places, (place) => place[2]),
      country: Uint8Array.from(places, (place) => place[3]),
      region: new Uint16Array(count),
      landmarks: new Uint8Array(count * 3),
    },
    countries: { capital: Int32Array.from([0, 1]), colour: Uint8Array.from([0, 1]) },
    regions: { seat: new Int32Array(0), country: new Uint8Array(0) },
    roads: { offsets: new Int32Array(1), cells: new Int32Array(0) },
    lanes: { offsets: new Int32Array(1), cells: new Int32Array(0) },
    bridges: new Int32Array(0),
    wonders: { kind: new Uint8Array(0), cell: new Int32Array(0) },
    landmarks: { kind: new Uint8Array(0), cell: new Int32Array(0) },
  };
}

function stopCell(stops: Uint16Array, dot: number, stop: number): [number, number] {
  const at = 2 * (dot * CROWD_STOPS + stop);
  return [Math.floor(stops[at] / CROWD_Q), Math.floor(stops[at + 1] / CROWD_Q)];
}

function apart(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

// How many homes of the settlement at OPEN lie on each side of it, over seeds 1 to 40.
function homesBySide(): { north: number; south: number; west: number; east: number } {
  const [px, py] = OPEN;
  const sides = { north: 0, south: 0, west: 0, east: 0 };
  for (let seed = 1; seed <= 40; seed++) {
    const crowd = crowdOf(tinyWorld(seed, [OPEN]));
    for (let dot = 0; dot < crowd.hue.length; dot++) {
      const [x, y] = stopCell(crowd.stops, dot, 0);
      if (y < py) sides.north++;
      if (y > py) sides.south++;
      if (x < px) sides.west++;
      if (x > px) sides.east++;
    }
  }
  return sides;
}

describe('the map crowd', () => {
  const world = tinyWorld(0x5eed0001);
  const crowd = crowdOf(world);

  it('gives each settlement a dot per 100 people, and a hamlet at least one', () => {
    expect(crowd.hue.length).toBe(OWNERS.length);
    expect(crowd.stops.length).toBe(OWNERS.length * CROWD_STOPS * 2);
    expect(crowd.legMs.length).toBe(OWNERS.length);
    expect(crowd.startMs.length).toBe(OWNERS.length);
  });

  it("keeps every stop on its own country's land, near its settlement", () => {
    OWNERS.forEach((s, dot) => {
      const [px, py, , country] = PLACES[s];
      for (let stop = 0; stop < CROWD_STOPS; stop++) {
        const [x, y] = stopCell(crowd.stops, dot, stop);
        expect(world.country[y * WIDTH + x], `dot ${dot} stop ${stop}`).toBe(country);
        expect(apart(x, y, px, py), `dot ${dot} stop ${stop}`).toBeLessThanOrEqual(FARTHEST[s]);
      }
    });
  });

  it("puts a dot's later stops beside its first", () => {
    OWNERS.forEach((_, dot) => {
      const [hx, hy] = stopCell(crowd.stops, dot, 0);
      for (let stop = 1; stop < CROWD_STOPS; stop++) {
        const [x, y] = stopCell(crowd.stops, dot, stop);
        expect(apart(x, y, hx, hy), `dot ${dot} stop ${stop}`).toBeLessThanOrEqual(1);
      }
    });
  });

  it('keeps stops off cell edges, and legs between 2.5 and 6 s', () => {
    for (const q of crowd.stops) {
      expect(q % CROWD_Q).toBeGreaterThanOrEqual(32);
      expect(q % CROWD_Q).toBeLessThan(224);
    }
    crowd.legMs.forEach((leg, dot) => {
      expect(leg).toBeGreaterThanOrEqual(2500);
      expect(leg).toBeLessThanOrEqual(6000);
      expect(crowd.startMs[dot]).toBeLessThan(CROWD_STOPS * leg);
    });
  });

  it('draws all six body hues', () => {
    expect(new Set(crowd.hue).size).toBe(CROWD_HUES.length);
  });

  it('makes the same crowd from the same seed, and another from another', () => {
    expect(crowdOf(tinyWorld(0x5eed0001))).toEqual(crowd);
    expect(crowdOf(tinyWorld(0x5eed0002)).stops).not.toEqual(crowd.stops);
  });

  it('spreads the homes of a small settlement alike to every side', () => {
    const { north, south, west, east } = homesBySide();
    expect(Math.abs(north - south), `north ${north}, south ${south}`).toBeLessThanOrEqual((north + south) / 10);
    expect(Math.abs(west - east), `west ${west}, east ${east}`).toBeLessThanOrEqual((west + east) / 10);
  });

  it('keeps every world side within the 16 bits of a stop', () => {
    for (const side of Object.values(WORLD_SIZES).flat()) {
      expect(side * CROWD_Q, `side ${side}`).toBeLessThanOrEqual(65_536);
    }
  });
});
