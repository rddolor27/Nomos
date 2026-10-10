import {
  createWorld,
  currentTick,
  issue,
  nearestAgent,
  restoreWorld,
  stateHash,
  step,
  walletAccount,
  warmUp,
  type World,
} from '@nomos/sim-core';
import { bindPageLifecycle, type AppMessage, type WorkerMessage } from '@nomos/sim-protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SLEEP_MIN_MS, STATS_MS, createSimLoop, type LoopHost } from '../src/index.ts';

// The real warm-up, wrapped so a test can see when the loop runs it or stand in for its time.
vi.mock('@nomos/sim-core', async (importOriginal) => {
  const simCore = await importOriginal<typeof import('@nomos/sim-core')>();
  return { ...simCore, warmUp: vi.fn(simCore.warmUp) };
});

afterEach(() => {
  vi.mocked(warmUp).mockReset();
});

type Posted<T extends WorkerMessage['type']> = Extract<WorkerMessage, { type: T }>;
type FakeDoc = EventTarget & { visibilityState: string };
type Page = ReturnType<typeof fakePage>;

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
    makeWorld: (seed, tier, _map, agents) => (world = createWorld(seed, tier, undefined, agents)),
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

  if (init) loop.handle({ type: 'init', seed: 42, tier: 'phone', map: new ArrayBuffer(0), checks: true });
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

    page.handle({ type: 'init', seed: 42, tier: 'phone', map: new ArrayBuffer(0), checks: true });
    expect(page.posted.map(({ type }) => type)).toEqual(['ready', 'snapshot']);
    expect(page.posted[0]).toEqual({ type: 'ready', agents: 10_000 });
    page.advance(1_000);
    expect(page.tick()).toBe(0);
    expect(page.posted).toHaveLength(2);
  });

  it('spawns the count init asks for, a tier smaller than its own', () => {
    const page = fakePage({ init: false });
    page.handle({ type: 'init', seed: 42, tier: 'phone', map: new ArrayBuffer(0), checks: true, agents: 300 });
    expect(page.posted[0]).toEqual({ type: 'ready', agents: 300 });
    expect(page.ofType('snapshot')[0].count).toBe(300);

    const greedy = fakePage({ init: false });
    const tooMany: AppMessage = { type: 'init', seed: 42, tier: 'phone', map: new ArrayBuffer(0), checks: true, agents: 10_001 };
    expect(() => greedy.handle(tooMany)).toThrow(RangeError);
  });

  it('posts the spawn after ready', () => {
    const page = fakePage();
    const [ready, spawn] = page.posted;
    expect(ready).toEqual({ type: 'ready', agents: 10_000 });
    if (spawn.type !== 'snapshot') throw new Error(`expected a snapshot, not ${spawn.type}`);
    expect([spawn.tick, spawn.count]).toEqual([0, 10_000]);
    const { x, y } = page.world().agents;
    const view = new DataView(spawn.buffer);
    expect([view.getFloat32(0, true), view.getFloat32(4, true)]).toEqual([x[0] / 256, y[0] / 256]);
    page.advance(1_000);
    expect(page.posted).toHaveLength(2);
    page.handle({ type: 'resume' });
    page.advance(100);
    expect(page.ofType('snapshot').map(({ tick }) => tick)).toEqual([0, 1]);
  });

  it('posts ready and the spawn before it warms up', () => {
    const page = fakePage({ init: false });
    const postedFirst: string[] = [];
    vi.mocked(warmUp).mockImplementationOnce(() => {
      for (const { type } of page.posted) postedFirst.push(type);
    });
    page.handle({ type: 'init', seed: 42, tier: 'phone', map: new ArrayBuffer(0), checks: true });
    expect(postedFirst).toEqual(['ready', 'snapshot']);
  });

  it("sets the world's checks from init", () => {
    const unchecked = fakePage({ init: false });
    unchecked.handle({ type: 'init', seed: 42, tier: 'phone', map: new ArrayBuffer(0), checks: false });
    expect(unchecked.world().checks).toBe(false);

    const checked = fakePage({ init: false });
    checked.handle({ type: 'init', seed: 42, tier: 'phone', map: new ArrayBuffer(0), checks: true });
    expect(checked.world().checks).toBe(true);
  });

  // Both orders finish the warm-up before the world's first tick, and the scratch both worlds share is written before
  // it is read, so a warm-up after the world exists changes no replay.
  it('replays the same whether it warms up before or after making the world', () => {
    warmUp();
    const warmedFirst = createWorld(42, 'phone');
    while (currentTick(warmedFirst) < 1_000) step(warmedFirst);
    const page = fakePage();
    page.handle({ type: 'resume' });
    page.advance(100_000);
    expect(page.tick()).toBe(1_000);
    expect(stateHash(page.world())).toBe(stateHash(warmedFirst));
  });

  it('handles what the page sends during the warm-up once it ends', () => {
    // A worker runs one task at a time, so whatever the page sends while init warms up waits in its queue, in order.
    function initWhileSending(send: (page: Page) => AppMessage[]): Page {
      const page = fakePage({ init: false });
      let queued: AppMessage[] = [];
      vi.mocked(warmUp).mockImplementationOnce(() => {
        queued = send(page);
        page.stall(300);
      });
      page.handle({ type: 'init', seed: 42, tier: 'phone', map: new ArrayBuffer(0), checks: true });
      expect(page.posted.map(({ type }) => type)).toEqual(['ready', 'snapshot']);
      for (const msg of queued) page.handle(msg);
      return page;
    }

    const playing = initWhileSending((page) => [
      { type: 'resume' },
      { type: 'return', buffer: page.ofType('snapshot')[0].buffer },
      { type: 'checkpoint' },
    ]);
    expect(playing.ofType('checkpoint').map(({ tick }) => tick)).toEqual([0]);
    playing.advance(1_000);
    expect(playing.tick()).toBe(10);
    expect(playing.ofType('snapshot').map(({ tick }) => tick)).toEqual([0, 1, 2, 3]);

    const paused = initWhileSending(() => [{ type: 'resume' }, { type: 'pause' }]);
    paused.advance(1_000);
    expect(paused.tick()).toBe(0);
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
    expect(sent.map(({ tick }) => tick)).toEqual([0, 1, 2]);
    expect(sent.map(({ count, buffer }) => [count, buffer.byteLength])).toEqual(Array(3).fill([10_000, 120_000]));

    page.handle({ type: 'return', buffer: sent[0].buffer });
    page.advance(1_000);
    expect(page.tick()).toBe(20);
    expect(page.ofType('snapshot').map(({ tick }) => tick)).toEqual([0, 1, 2, 11]);
    page.handle({ type: 'return', buffer: sent[1].buffer });
    page.handle({ type: 'return', buffer: sent[2].buffer });
    page.advance(1_000);
    expect(page.ofType('snapshot').map(({ tick }) => tick)).toEqual([0, 1, 2, 11, 21, 22]);
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

  it('answers inspect with the nearest blob within a tile', () => {
    const page = fakePage();
    const { agents, cash } = page.world();
    // A blob past the first, holding a balance no other wallet holds, so an answer from the wrong row or wallet shows.
    const agent = 7;
    issue(cash, walletAccount(cash, agent), 1_234);
    expect(nearestAgent(agents, agents.x[agent], agents.y[agent], 4_096)).toBe(agent);
    page.handle({ type: 'inspect', x: agents.x[agent] / 256, y: agents.y[agent] / 256 });
    // No economy has run here, so the blob has no employer and no wage.
    expect(page.ofType('inspected')).toEqual([
      { type: 'inspected', tick: 0, agent, nameKey: agents.nameKey[agent], cents: 101_234, employer: -1, wage: 0 },
    ]);
  });

  it("answers an employed blob's firm row and that firm's wage", () => {
    const page = fakePage();
    const { agents, firms } = page.world();
    // Neighbouring firms hold other wages, so an answer from the wrong row or the wrong firm shows.
    const agent = 7;
    agents.employer[agent] = 3;
    firms.wage[2] = 99_900;
    firms.wage[3] = 142_800;
    firms.wage[4] = 150_000;
    page.handle({ type: 'inspect', x: agents.x[agent] / 256, y: agents.y[agent] / 256 });
    expect(page.ofType('inspected')).toEqual([
      { type: 'inspected', tick: 0, agent, nameKey: agents.nameKey[agent], cents: 100_000, employer: 3, wage: 142_800 },
    ]);
  });

  it('answers -1 off the map', () => {
    const page = fakePage();
    page.handle({ type: 'inspect', x: -1_000, y: -1_000 });
    expect(page.ofType('inspected')).toEqual([
      { type: 'inspected', tick: 0, agent: -1, nameKey: 0, cents: 0, employer: -1, wage: 0 },
    ]);
  });

  it('ignores inspect before init', () => {
    const page = fakePage({ init: false });
    page.handle({ type: 'inspect', x: 0, y: 0 });
    expect(page.posted).toEqual([]);
  });

  it('answers while the run plays', () => {
    const page = fakePage();
    page.handle({ type: 'resume' });
    page.advance(500);
    const { agents } = page.world();
    page.handle({ type: 'inspect', x: agents.x[0] / 256, y: agents.y[0] / 256 });
    const [answer] = page.ofType('inspected');
    expect(page.tick()).toBe(5);
    expect(answer.tick).toBe(page.tick());
    page.advance(500);
    expect(page.tick()).toBe(10);
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

  it("delays a slowed worker's replies, and its next message by its warm-up", () => {
    const WORK_MS = 100;
    const WARM_MS = 200;
    // Ms from init to ready and to init's return, when the worker can take its next message, on a clock that each
    // reading moves 0.25 ms, so a busy-wait on it always ends.
    function initTimesMs(cpuSlowdown: number): { readyMs: number; doneMs: number } {
      let clock = 0;
      let readyMs = -1;
      const host: LoopHost = {
        now: () => (clock += 0.25),
        sleep: () => {},
        yieldNow: () => {},
        post: (msg) => {
          if (msg.type === 'ready') readyMs = clock;
        },
        makeWorld: (seed, tier) => {
          clock += WORK_MS;
          return createWorld(seed, tier);
        },
      };
      vi.mocked(warmUp).mockImplementationOnce(() => {
        clock += WARM_MS;
      });
      createSimLoop(host, cpuSlowdown).handle({
        type: 'init',
        seed: 42,
        tier: 'phone',
        map: new ArrayBuffer(0),
        checks: true,
      });
      return { readyMs, doneMs: clock };
    }

    const slowed = initTimesMs(4);
    expect(slowed.readyMs).toBeGreaterThanOrEqual(4 * WORK_MS);
    expect(slowed.readyMs).toBeLessThan(4 * WORK_MS + WARM_MS);
    expect(slowed.doneMs - slowed.readyMs).toBeGreaterThanOrEqual(4 * WARM_MS);
    const full = initTimesMs(1);
    expect(full.readyMs).toBeGreaterThan(WORK_MS);
    expect(full.readyMs).toBeLessThan(2 * WORK_MS);
    expect(full.doneMs - full.readyMs).toBeLessThan(2 * WARM_MS);
  });
});
