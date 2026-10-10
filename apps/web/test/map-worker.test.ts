import { describe, expect, it, vi } from 'vitest';
import { layoutBuffers, placeBuffers, type PlaceError, type PlaceReply } from '@nomos/sim-protocol/place';
import { crowdBuffers } from '@nomos/sim-protocol/world-map';
import { buildPlace, worldFingerprint } from '@nomos/worldgen';
import { answerGenerate, answerPlace, answerTown } from '../src/map/generate.ts';
import { TOWN } from '../src/map/town.ts';

describe('the map worker', { timeout: 60_000 }, () => {
  it('answers generate with the world, its names and its timings, every buffer listed', () => {
    let now = 0;
    const { reply, transfer } = answerGenerate({ type: 'generate', seed: 0x5eed0001, size: 'standard' }, () => (now += 2));
    expect(reply.type).toBe('world');
    expect(worldFingerprint(reply.map)).toBe(0x4a765ce2);
    expect(reply.names).toHaveLength(reply.map.countries.capital.length + reply.map.settlements.cell.length);
    expect(reply.names.slice(0, 2)).toEqual(['country-1', 'country-2']);
    expect(reply.crowd.hue.length).toBeGreaterThan(0);
    expect(Object.keys(reply.stageMs)).toEqual([
      'shape', 'rain', 'drain', 'climate', 'biomes', 'settle', 'countries', 'regions', 'farm', 'roads', 'lanes', 'features', 'names', 'crowd', 'contexts',
    ]);
    expect(Object.values(reply.stageMs).every((ms) => ms === 2)).toBe(true);
    expect(new Set(transfer).size).toBe(transfer.length);
    const moved = structuredClone(reply, { transfer });
    expect(crowdBuffers(reply.crowd).every((b) => b.byteLength === 0)).toBe(true);
    expect(worldFingerprint(moved.map)).toBe(0x4a765ce2);
  });

  // Place p is settlement p, or wonder p minus the settlement count, as world.py's place_contexts orders them. The
  // builder loads on the first request, through the same dynamic import the worker makes.
  it("answers place with a settlement's and a wonder's place after the world's columns are gone", async () => {
    const world = answerGenerate({ type: 'generate', seed: 0x5eed0001, size: 'standard' }, () => 0);
    const settlements = world.reply.map.settlements.cell.length;
    expect(world.reply.map.wonders.kind.length).toBeGreaterThan(0);
    expect(world.contexts).toHaveLength(settlements + world.reply.map.wonders.kind.length);
    structuredClone(world.reply, { transfer: world.transfer });
    let now = 100;
    for (const [place, width] of [
      [0, 128],
      [settlements, 30],
    ]) {
      const answer = await answerPlace({ type: 'place', place }, world.contexts, () => (now += 7));
      const reply = built(answer.reply);
      const transfer = answer.transfer;
      const fresh = buildPlace(world.contexts[place]);
      expect(reply).toMatchObject({ type: 'place', place, ms: 7 });
      expect(reply.layout.width).toBe(width);
      expect(reply.layout).toEqual(fresh.layout);
      expect(reply.walks).toEqual(fresh.walks);
      expect(reply.walks.person.length).toBeGreaterThan(0);
      expect(transfer).toEqual(placeBuffers(reply.layout, reply.walks, reply.crowd));
      expect(new Set(transfer).size).toBe(transfer.length);
      const moved = structuredClone(reply, { transfer });
      expect(reply.layout.tiles.byteLength).toBe(0);
      expect(moved.layout.frames).toEqual(fresh.layout.frames);
    }
  });

  // WebKit runs a module worker's script again when a module it imports dynamically imports it back, as the place
  // builder's chunk does for the code they share (a probe in Playwright's WebKit 27.2). The second run must leave the
  // first run's handler, and its world, in place.
  it('answers place for the last world after its module runs a second time', async () => {
    const { scope, posted } = workerScope();
    vi.stubGlobal('self', scope);
    try {
      vi.resetModules();
      await import('../src/map/map-worker.ts');
      scope.onmessage?.({ data: { type: 'generate', seed: 0x5eed0001, size: 'standard' } });
      vi.resetModules();
      await import('../src/map/map-worker.ts');
      scope.onmessage?.({ data: { type: 'place', place: 1 } });
      await vi.waitFor(() => expect(posted).toHaveLength(2));
      expect(posted.map((m) => [m.type, m.place])).toEqual([
        ['world', undefined],
        ['place', 1],
      ]);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });

  // A request the worker cannot answer comes back as a place-error for that place, never as the worker's error event,
  // so the page cannot fail a later place with an earlier one's error.
  it('answers place-error for an unknown place, a request before any world and a failed build', async () => {
    const world = answerGenerate({ type: 'generate', seed: 0x5eed0001, size: 'standard' }, () => 0);
    const count = world.contexts.length;
    const unknown = await answerPlace({ type: 'place', place: count }, world.contexts, () => 0);
    expect(unknown).toEqual({
      reply: { type: 'place-error', place: count, message: `the map worker has no place ${count}; its world has ${count}` },
      transfer: [],
    });
    const early = await answerPlace({ type: 'place', place: 0 }, [], () => 0);
    expect(early.reply).toEqual({ type: 'place-error', place: 0, message: 'the map worker has no place 0; its world has 0' });
    const broken = [{ ...world.contexts[0], tier: null, wonder: 'volcano' }];
    const failed = await answerPlace({ type: 'place', place: 0 }, broken, () => 0);
    expect(failed.reply).toEqual({
      type: 'place-error',
      place: 0,
      message: 'no sprite wonders/wonder_volcano in the place frame table',
    });
  });

  // The first screen's Town skin asks for Highcourt alone, before any world, through the same lazy builder.
  it('answers town with Highcourt, every buffer listed, before any world', async () => {
    let now = 10;
    const { reply, transfer } = await answerTown(() => (now += 5));
    if (reply.type === 'town-error') throw new Error(reply.message);

    expect(reply).toMatchObject({ type: 'town', ms: 5 });
    expect(reply.layout).toEqual(buildPlace(TOWN).layout);
    expect(transfer).toEqual(layoutBuffers(reply.layout));
    expect(new Set(transfer).size).toBe(transfer.length);
    structuredClone(reply, { transfer });
    expect(reply.layout.tiles.byteLength).toBe(0);
  });

  it('posts the town to a request before any world', async () => {
    const { scope, posted } = workerScope();
    vi.stubGlobal('self', scope);
    try {
      vi.resetModules();
      await import('../src/map/map-worker.ts');
      scope.onmessage?.({ data: { type: 'town' } });
      await vi.waitFor(() => expect(posted).toHaveLength(1));
      expect(posted[0].type).toBe('town');
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });

  it('posts a place-error for a request before any world', async () => {
    const { scope, posted } = workerScope();
    vi.stubGlobal('self', scope);
    try {
      vi.resetModules();
      await import('../src/map/map-worker.ts');
      scope.onmessage?.({ data: { type: 'place', place: 3 } });
      await vi.waitFor(() => expect(posted).toHaveLength(1));
      expect(posted[0]).toEqual({ type: 'place-error', place: 3, message: 'the map worker has no place 3; its world has 0' });
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});

function built(reply: PlaceReply | PlaceError): PlaceReply {
  if (reply.type === 'place-error') throw new Error(`expected a place, got a place-error: ${reply.message}`);
  return reply;
}

// A stand-in for the worker's global scope, which records what the worker posts.
function workerScope(): {
  scope: { onmessage: ((event: { data: unknown }) => void) | null; postMessage: (message: never) => void };
  posted: { type: string; place?: number }[];
} {
  const posted: { type: string; place?: number }[] = [];
  const scope = { onmessage: null, postMessage: (message: { type: string; place?: number }) => posted.push(message) };
  return { scope, posted };
}
