import { createWorld, currentTick, restoreWorld, stateHash, type World } from '@nomos/sim-core';
import { bindPageLifecycle, type WorkerMessage } from '@nomos/sim-protocol';
import { describe, expect, it } from 'vitest';
import { SLEEP_MIN_MS, STATS_MS, createSimLoop, type LoopHost } from '../src/index.ts';

type Posted<T extends WorkerMessage['type']> = Extract<WorkerMessage, { type: T }>;
type FakeDoc = EventTarget & { visibilityState: string };

// A manual clock and the loop's one pending callback. Scheduling a second turn while one is pending throws, so every
// test also checks that only one loop ever runs.
function fakePage({ init = true } = {}) {
  let clock = 0;
  let pending: { at: number; fn: () => void } | null = null;
  let world: World | null = null;
  let yields = 0;
  const posted: WorkerMessage[] = [];
  const sleeps: number[] = [];

  function schedule(fn: () => void, at: number): void {
    if (pending !== null) throw new Error('the loop scheduled a second turn while one was pending');
    pending = { at, fn };
  }

  const host: LoopHost = {
    now: () => clock,
    sleep: (fn, ms) => {
      sleeps.push(ms);
      schedule(fn, clock + ms);
    },
    yieldNow: (fn) => {
      yields++;
      schedule(fn, clock);
    },
    // Cloned and transferred as postMessage would, so reused message objects and returned buffers behave as in a browser.
    post: (msg, transfer) => posted.push(structuredClone(msg, { transfer })),
    makeWorld: (seed, tier) => (world = createWorld(seed, tier)),
  };
  const loop = createSimLoop(host);

  // Runs the pending callback whenever it falls due within ms. A late callback runs at the current time, and a loop that
  // keeps waking without the clock moving would spin a core, so it fails here instead of hanging the test.
  function advance(ms: number): void {
    const end = clock + ms;
    let wakesThisInstant = 0;
    while (pending !== null && pending.at <= end) {
      const { at, fn } = pending;
      pending = null;
      wakesThisInstant = at > clock ? 0 : wakesThisInstant + 1;
      if (wakesThisInstant > 1_000) throw new Error(`the loop spun at ${clock} ms without the clock moving`);
      clock = Math.max(clock, at);
      fn();
    }
    clock = end;
  }

  function startedWorld(): World {
    if (world === null) throw new Error('no world yet');
    return world;
  }

  if (init) loop.handle({ type: 'init', seed: 42, tier: 'phone', map: new ArrayBuffer(0) });
  return {
    handle: loop.handle,
    advance,
    // Holds every callback back, as a GC pause, a debugger or a frozen phone tab would.
    stall: (ms: number) => (clock += ms),
    posted,
    sleeps,
    yields: () => yields,
    world: startedWorld,
    tick: () => currentTick(startedWorld()),
    ofType: <T extends WorkerMessage['type']>(type: T) => posted.filter((msg): msg is Posted<T> => msg.type === type),
  };
}

function fakeDoc(): FakeDoc {
  return Object.assign(new EventTarget(), { visibilityState: 'visible' });
}

function setVisibility(doc: FakeDoc, state: string): void {
  doc.visibilityState = state;
  doc.dispatchEvent(new Event('visibilitychange'));
}

describe('the sim loop', () => {
  it('posts ready and waits', () => {
    const page = fakePage({ init: false });
    page.handle({ type: 'resume' });
    page.handle({ type: 'checkpoint' });
    page.advance(1_000);
    expect(page.posted).toEqual([]);

    page.handle({ type: 'init', seed: 42, tier: 'phone', map: new ArrayBuffer(0) });
    expect(page.posted).toEqual([{ type: 'ready', agents: 10_000 }]);
    page.advance(1_000);
    expect(page.tick()).toBe(0);
    expect(page.posted).toHaveLength(1);
  });

  it('runs 10 ticks per second of wall time', () => {
    const page = fakePage();
    page.handle({ type: 'resume' });
    page.advance(1_000);
    expect(page.tick()).toBe(10);
    page.advance(9_000);
    expect(page.tick()).toBe(100);
  });

  it('pauses while the page is hidden and resumes without catching up', () => {
    const page = fakePage();
    const doc = fakeDoc();
    bindPageLifecycle(doc, new EventTarget(), page.handle);
    page.handle({ type: 'resume' });
    page.advance(1_000);
    expect(page.tick()).toBe(10);
    setVisibility(doc, 'hidden');
    page.advance(60_000);
    expect(page.tick()).toBe(10);
    setVisibility(doc, 'visible');
    page.advance(1_000);
    expect(page.tick()).toBe(20);
  });

  it('never catches up after a stall', () => {
    const page = fakePage();
    page.handle({ type: 'resume' });
    page.advance(1_000);
    for (const stallMs of [5_000, 3_600_000]) {
      const before = page.tick();
      page.stall(stallMs);
      page.advance(0);
      expect(page.tick() - before, `${stallMs} ms`).toBe(2);
      page.advance(1_000);
      expect(page.tick() - before, `${stallMs} ms`).toBe(12);
    }
  });

  it('sleeps between ticks at 1x', () => {
    const page = fakePage();
    page.handle({ type: 'resume' });
    page.advance(1_000);
    expect(page.tick()).toBe(10);
    expect(page.sleeps.length).toBeGreaterThanOrEqual(10);
    expect(page.sleeps.every((ms) => ms >= SLEEP_MIN_MS)).toBe(true);
    expect(page.yields()).toBeLessThanOrEqual(10);
  });

  it('checkpoints on pagehide', () => {
    const page = fakePage();
    const win = new EventTarget();
    bindPageLifecycle(fakeDoc(), win, page.handle);
    page.handle({ type: 'resume' });
    page.advance(1_000);
    win.dispatchEvent(new Event('pagehide'));
    const saved = page.ofType('checkpoint');
    expect(saved.map(({ tick }) => tick)).toEqual([10]);
    expect(saved[0].state.byteLength).toBe(page.world().arena.top);
    const restored = restoreWorld(42, 'phone', saved[0].state);
    expect([currentTick(restored), stateHash(restored)]).toEqual([10, stateHash(page.world())]);
    page.advance(1_000);
    expect(page.tick()).toBe(10);
  });

  it('posts snapshots only while a buffer is free', () => {
    const page = fakePage();
    page.handle({ type: 'resume' });
    page.advance(1_000);
    const sent = page.ofType('snapshot');
    expect(page.tick()).toBe(10);
    expect(sent.map(({ tick }) => tick)).toEqual([1, 2, 3]);
    expect(sent.map(({ count, buffer }) => [count, buffer.byteLength])).toEqual(Array(3).fill([10_000, 120_000]));

    page.handle({ type: 'return', buffer: sent[0].buffer });
    page.advance(1_000);
    expect(page.tick()).toBe(20);
    expect(page.ofType('snapshot').map(({ tick }) => tick)).toEqual([1, 2, 3, 11]);
    page.handle({ type: 'return', buffer: sent[1].buffer });
    page.handle({ type: 'return', buffer: sent[2].buffer });
    page.advance(1_000);
    expect(page.ofType('snapshot').map(({ tick }) => tick)).toEqual([1, 2, 3, 11, 21, 22]);
  });

  it('reports per-system milliseconds', () => {
    const page = fakePage();
    page.handle({ type: 'resume' });
    page.advance(1_000);
    const stats = page.ofType('stats');
    expect(stats.length).toBeGreaterThan(0);
    expect(stats.length).toBeLessThanOrEqual(1_000 / STATS_MS);
    for (const { systemMs } of stats) {
      expect(Object.keys(systemMs)).toEqual(['day', 'move', 'snapshot']);
      expect(Object.values(systemMs).every((ms) => Number.isFinite(ms) && ms >= 0)).toBe(true);
    }
  });

  it('treats a repeated pause or resume as one', () => {
    const page = fakePage();
    const doc = fakeDoc();
    const win = new EventTarget();
    bindPageLifecycle(doc, win, page.handle);
    page.handle({ type: 'resume' });
    page.handle({ type: 'resume' });
    page.advance(1_000);
    setVisibility(doc, 'hidden');
    win.dispatchEvent(new Event('pagehide'));
    expect(page.ofType('checkpoint').map(({ tick }) => tick)).toEqual([10]);
    page.advance(5_000);
    expect(page.tick()).toBe(10);

    setVisibility(doc, 'visible');
    page.advance(50);
    page.handle({ type: 'pause' });
    page.handle({ type: 'resume' });
    page.advance(1_000);
    expect(page.tick()).toBe(20);
  });
});
