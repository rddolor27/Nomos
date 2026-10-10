import { readFileSync } from 'node:fs';
import { parseMap, type Tier } from '@nomos/sim-protocol';
import { expect, test } from 'vitest';
import {
  VERDICT_KEY,
  chooseTier,
  deviceClass,
  loadVerdict,
  saveVerdict,
  startAgents,
  tierFromQuery,
  tierVerdict,
} from '../src/app/tiers.ts';

type Nav = Parameters<typeof deviceClass>[0];
type Device = 'phone' | 'desktop';

const PIXEL =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPAD =
  'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function samples(count: number, ms: number): number[] {
  return new Array<number>(count).fill(ms);
}

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

function throwingStorage(): Storage {
  const fail = (): never => {
    throw new DOMException('Storage is disabled', 'SecurityError');
  };
  return { length: 0, clear: fail, getItem: fail, key: fail, removeItem: fail, setItem: fail };
}

test('classifies devices', () => {
  const cases: [name: string, nav: Nav, coarsePointer: boolean, device: Device][] = [
    ['UA-CH mobile', { userAgent: WINDOWS, userAgentData: { mobile: true } }, false, 'phone'],
    ['Pixel Android UA', { userAgent: PIXEL }, false, 'phone'],
    ['iPhone UA', { userAgent: IPHONE }, false, 'phone'],
    ['iPad UA', { userAgent: IPAD }, false, 'phone'],
    ['Mac UA with a coarse pointer', { userAgent: MAC }, true, 'phone'],
    ['desktop site on a phone, UA-CH not mobile', { userAgent: WINDOWS, userAgentData: { mobile: false } }, true, 'phone'],
    ['Mac UA with a fine pointer', { userAgent: MAC }, false, 'desktop'],
    ['Windows Chrome', { userAgent: WINDOWS, userAgentData: { mobile: false } }, false, 'desktop'],
  ];

  for (const [name, nav, coarsePointer, device] of cases) {
    expect(deviceClass(nav, coarsePointer), name).toBe(device);
  }
});

test('reads the tier parameter', () => {
  expect(['?tier=phone', '?tier=phone-plus', '?tier=desktop', '?x=1&tier=phone'].map(tierFromQuery)).toEqual([
    'phone',
    'phone-plus',
    'desktop',
    'phone',
  ]);
  const bad = ['', '?x=1', '?tier=', '?tier=laptop', '?tier=Phone', '?tier=constructor', '?tier=__proto__', '?tier=toString'];
  expect(bad.map(tierFromQuery)).toEqual(bad.map(() => null));
});

test('chooses tiers', () => {
  const cases: [device: Device, verdict: Tier | null, override: Tier | null, tier: Tier][] = [
    ['desktop', null, null, 'desktop'],
    ['phone', null, null, 'phone'],
    ['phone', 'phone-plus', null, 'phone-plus'],
    ['phone', 'phone-plus', 'phone', 'phone'],
    ['phone', null, 'desktop', 'phone'],
    ['phone', null, 'phone-plus', 'phone-plus'],
    ['desktop', null, 'phone', 'phone'],
    ['phone', 'desktop', null, 'phone'],
    ['phone', 'phone-plus', 'desktop', 'phone-plus'],
    ['desktop', 'phone-plus', null, 'desktop'],
  ];

  for (const [device, verdict, override, tier] of cases) {
    expect(chooseTier(device, verdict, override), `${device}, verdict ${verdict}, override ${override}`).toBe(tier);
  }
});

test('judges the start-up check', () => {
  expect(tierVerdict(samples(119, 1))).toBeNull();
  expect(tierVerdict(samples(120, 5.3))).toBe('phone-plus');
  expect(tierVerdict(samples(120, 5.4))).toBe('phone');
  expect(tierVerdict([...samples(113, 1), ...samples(7, 6)])).toBe('phone');
  expect(tierVerdict([...samples(114, 1), ...samples(6, 6)])).toBe('phone-plus');
});

test('judges the start-up check by the nearest rank', () => {
  // 125 samples: the 119th smallest, the ceiling of 0.95 x 125, decides.
  expect(tierVerdict([...samples(118, 1), ...samples(7, 6)])).toBe('phone');
  expect(tierVerdict([...samples(119, 1), ...samples(6, 6)])).toBe('phone-plus');
});

test('judges the start-up check by the agents it ran', () => {
  // 5,000 agents in 2.6 ms put phone-plus's 25,000 at 13.0 ms, inside its 13.3.
  expect(tierVerdict(samples(120, 2.6), 5_000)).toBe('phone-plus');
  expect(tierVerdict(samples(120, 2.7), 5_000)).toBe('phone');
  expect(tierVerdict(samples(120, 5.3), 10_000)).toBe('phone-plus');
});

test('starts the town at its tier\'s crowd, and a tier asked for by name in full', () => {
  const tiers: Tier[] = ['phone', 'phone-plus', 'desktop'];
  const town = parseMap(new Uint8Array(readFileSync(new URL('../../../assets/maps/town.nmap', import.meta.url))).buffer);

  expect(tiers.map((tier) => startAgents(tier, town, false))).toEqual([3_965, 5_287, 7_931]);
  expect(tiers.map((tier) => startAgents(tier, town, true))).toEqual([10_000, 25_000, 100_000]);
});

test('judges the start-up check whatever order the samples came in', () => {
  expect(tierVerdict([...samples(7, 6), ...samples(113, 1)])).toBe('phone');
  expect(tierVerdict([...samples(6, 6), ...samples(114, 1)])).toBe('phone-plus');
});

test('judges the start-up check by number, not by digits', () => {
  expect(tierVerdict([...samples(113, 2), ...samples(7, 10)])).toBe('phone');
  expect(tierVerdict([...samples(7, 10), ...samples(113, 2)])).toBe('phone');
});

test('stores the build and tier as JSON', () => {
  const storage = memoryStorage();
  saveVerdict(storage, 'worker-a1.js', 'phone');

  expect(VERDICT_KEY).toBe('nomos.tier-check.v1');
  expect(JSON.parse(storage.getItem(VERDICT_KEY) ?? 'null')).toEqual({ build: 'worker-a1.js', tier: 'phone' });
  expect(loadVerdict(storage, 'worker-a1.js')).toBe('phone');
});

test("forgets another build's verdict", () => {
  const storage = memoryStorage();
  saveVerdict(storage, 'a', 'phone-plus');

  expect(loadVerdict(storage, 'a')).toBe('phone-plus');
  expect(loadVerdict(storage, 'b')).toBeNull();
});

test('ignores a damaged verdict', () => {
  const storage = memoryStorage();
  const damaged = ['not json', '5', 'null', '{}', '{"build":"a"}', '{"build":"a","tier":"huge"}', '{"build":"a","tier":"constructor"}'];

  for (const saved of damaged) {
    storage.setItem(VERDICT_KEY, saved);
    expect(loadVerdict(storage, 'a'), saved).toBeNull();
  }
});

test('survives storage that throws', () => {
  const storage = throwingStorage();

  expect(loadVerdict(storage, 'a')).toBeNull();
  expect(() => saveVerdict(storage, 'a', 'phone-plus')).not.toThrow();
  expect(loadVerdict(null, 'a')).toBeNull();
  expect(() => saveVerdict(null, 'a', 'phone-plus')).not.toThrow();
});
