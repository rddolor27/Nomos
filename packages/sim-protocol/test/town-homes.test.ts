import { readFileSync } from 'node:fs';
import { createHomes, seatHouseholds, type Homes } from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import { ENTITY_HOME, parseMap } from '../src/index.ts';

const townFile = new URL('../../../assets/maps/town.nmap', import.meta.url);
const SEED = 42;
const KEY = 7;
const UNSEATED = -1;

// The caller's filter, from the map's entities to its homes, is the lookup the 10 ms spawn row leaves out.
function highcourtHomes(): Homes {
  const town = parseMap(new Uint8Array(readFileSync(townFile)).buffer);
  return createHomes(town.entities.filter((entity) => entity.kind === ENTITY_HOME));
}

// counts[i] households of i + 1 people, smallest first.
function householdsOf(counts: number[]): Uint8Array {
  const size = new Uint8Array(counts.reduce((total, n) => total + n, 0));
  let from = 0;
  counts.forEach((n, i) => {
    size.fill(i + 1, from, from + n);
    from += n;
  });
  return size;
}

function seat(size: Uint8Array, homes: Homes): Int32Array {
  const home = new Int32Array(size.length).fill(UNSEATED);
  seatHouseholds(size, size.length, home, homes, SEED, KEY);
  return home;
}

function peopleAt(size: Uint8Array, home: Int32Array, homes: Homes): Int32Array {
  const people = new Int32Array(homes.count);
  for (let h = 0; h < size.length; h++) people[home[h]] += size[h];
  return people;
}

describe("Highcourt's homes", () => {
  it('hold 2,688 beds, 330 homes of 4 and 57 of 24', () => {
    const { count, capacity } = highcourtHomes();
    const homesOf = (beds: number) => capacity.filter((bedCount) => bedCount === beds).length;

    expect([count, homesOf(4), homesOf(24)]).toEqual([387, 330, 57]);
    expect(capacity.reduce((beds, bedCount) => beds + bedCount, 0)).toBe(2_688);
  });

  it('seat 2,310 people in households of 1 to 6, none over capacity', () => {
    const homes = highcourtHomes();
    const size = householdsOf([200, 200, 150, 150, 60, 60]);
    const home = seat(size, homes);

    const people = peopleAt(size, home, homes);
    expect(home.every((index) => index >= 0 && index < homes.count)).toBe(true);
    expect(people.reduce((total, here) => total + here, 0)).toBe(2_310);
    expect(Array.from(people.keys()).filter((index) => people[index] > homes.capacity[index])).toEqual([]);
  });

  it('seat 228 households of 5, since only the 57 homes of 24 take them, 4 each, and throw for a 229th', () => {
    const homes = highcourtHomes();

    const home = seat(householdsOf([0, 0, 0, 0, 228]), homes);
    expect(new Set(home).size).toBe(57);
    expect(() => seat(householdsOf([0, 0, 0, 0, 229]), homes)).toThrow(RangeError);
    expect(() => seat(householdsOf([0, 0, 0, 0, 229]), homes)).toThrow(/household of 5/);
  });
});
