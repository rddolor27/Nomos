import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PHONE_MEMORY_BYTES, reserveArena } from '../src/memory.ts';
import {
  CUSTOM_FESTIVAL,
  CUSTOM_FOOD,
  CUSTOM_MUSIC,
  CUSTOM_NAMING,
  LOOKS,
  MAX_CULTURES,
  addAgent,
  createAgentStore,
  customOf,
  withCustom,
} from '../src/store.ts';
import { AGENT_SALT, CULTURE, LEDGER_SALT, LOOK, layerOf } from '../src/streams.ts';

interface Vectors {
  streams: Record<string, number>;
  look: { seed: number; id: number; out: number }[];
}

const vectors: Vectors = JSON.parse(readFileSync(new URL('./fixtures/kernels.json', import.meta.url), 'utf8'));

const PEOPLE = 96_000;
const HUES = 6;
const CUSTOM_DOMAINS = [CUSTOM_FOOD, CUSTOM_FESTIVAL, CUSTOM_MUSIC, CUSTOM_NAMING];

function chiSquared(counts: Uint32Array, total: number): number {
  const expected = total / counts.length;
  let sum = 0;
  for (const count of counts) {
    const diff = count - expected;
    sum += (diff * diff) / expected;
  }
  return sum;
}

// Pearson's test of independence on a rows x cols table, with expected counts from its margins.
function chiSquaredIndependence(table: Uint32Array, rows: number, cols: number, total: number): number {
  const rowSums = new Float64Array(rows);
  const colSums = new Float64Array(cols);
  for (let i = 0; i < table.length; i++) {
    rowSums[Math.floor(i / cols)] += table[i];
    colSums[i % cols] += table[i];
  }
  let sum = 0;
  for (let i = 0; i < table.length; i++) {
    const expected = (rowSums[Math.floor(i / cols)] * colSums[i % cols]) / total;
    const diff = table[i] - expected;
    sum += (diff * diff) / expected;
  }
  return sum;
}

function populate(people: number, cultures: number) {
  const store = createAgentStore(reserveArena(PHONE_MEMORY_BYTES), people);
  for (let id = 0; id < people; id++) addAgent(store, 42, id, cultures, id % 5);
  return store;
}

describe('looks and cultures', () => {
  it('matches looks.py for every look vector', () => {
    const store = createAgentStore(reserveArena(65_536), 2 * vectors.look.length);
    for (const { seed, id, out } of vectors.look) {
      const raisedInOne = addAgent(store, seed, id, 1, 0);
      const raisedInEight = addAgent(store, seed, id, MAX_CULTURES, 4_000);
      expect(store.look[raisedInOne], `seed ${seed}, id ${id}`).toBe(out);
      expect(store.look[raisedInEight], `seed ${seed}, id ${id}`).toBe(out);
    }
  });

  it('spreads 96,000 people evenly over the 96 looks', () => {
    const store = populate(PEOPLE, MAX_CULTURES);
    const counts = new Uint32Array(LOOKS);
    for (let slot = 0; slot < PEOPLE; slot++) counts[store.look[slot]]++;
    expect(chiSquared(counts, PEOPLE)).toBeLessThan(143.3); // 95 degrees of freedom, p = 0.001
  });

  it('draws cultures on their own stream', () => {
    for (let cultures = 1; cultures <= MAX_CULTURES; cultures++) {
      const store = populate(200, cultures);
      for (let slot = 0; slot < 200; slot++) {
        const culture = store.culture[slot];
        expect(culture).toBeLessThan(cultures);
        expect(store.birthCulture[slot]).toBe(culture);
        for (const domain of CUSTOM_DOMAINS) expect(customOf(store.customs[slot], domain)).toBe(culture);
      }
    }
    const store = populate(PEOPLE, MAX_CULTURES);
    const counts = new Uint32Array(MAX_CULTURES);
    const hueByCulture = new Uint32Array(HUES * MAX_CULTURES);
    for (let slot = 0; slot < PEOPLE; slot++) {
      counts[store.culture[slot]]++;
      hueByCulture[(store.look[slot] % HUES) * MAX_CULTURES + store.culture[slot]]++;
    }
    expect(chiSquared(counts, PEOPLE)).toBeLessThan(24.32); // 7 degrees of freedom, p = 0.001
    expect(chiSquaredIndependence(hueByCulture, HUES, MAX_CULTURES, PEOPLE)).toBeLessThan(66.62); // 35 df
  });

  it('keeps one custom per nibble', () => {
    let customs = 3 * 0x1111;
    customs = withCustom(customs, CUSTOM_MUSIC, 7);
    expect(CUSTOM_DOMAINS.map((domain) => customOf(customs, domain))).toEqual([3, 3, 7, 3]);
    customs = withCustom(customs, CUSTOM_FOOD, 0);
    expect(CUSTOM_DOMAINS.map((domain) => customOf(customs, domain))).toEqual([0, 3, 7, 3]);
  });

  it('keeps world, agent and ledger streams apart', () => {
    const worldStreams = Object.values(vectors.streams);
    expect(new Set([...worldStreams, CULTURE]).size).toBe(worldStreams.length + 1);
    for (const [name, stream] of Object.entries(vectors.streams)) expect(stream, name).toBeLessThan(AGENT_SALT);
    expect(vectors.streams.LOOK).toBe(LOOK);
    expect([LOOK, AGENT_SALT - 1].map(layerOf)).toEqual(['world', 'world']);
    expect([AGENT_SALT, CULTURE, LEDGER_SALT - 1].map(layerOf)).toEqual(['agent', 'agent', 'agent']);
    expect([LEDGER_SALT, LEDGER_SALT + 1].map(layerOf)).toEqual(['ledger', 'ledger']);
  });

  it('refuses a bad culture count or a full store', () => {
    const store = createAgentStore(reserveArena(65_536), 1);
    expect(() => addAgent(store, 42, 7, 0, 3)).toThrow(RangeError);
    expect(() => addAgent(store, 42, 7, MAX_CULTURES + 1, 3)).toThrow(RangeError);
    expect(store.count[0]).toBe(0);
    expect([store.look[0], store.culture[0], store.birthCulture[0], store.customs[0], store.homeRegion[0]]).toEqual([
      0, 0, 0, 0, 0,
    ]);
    expect(addAgent(store, 42, 7, MAX_CULTURES, 3)).toBe(0);
    expect(() => addAgent(store, 42, 8, MAX_CULTURES, 3)).toThrow(RangeError);
    expect(store.count[0]).toBe(1);
  });
});
