import {
  SYSTEM_NAMES,
  checkpoint,
  currentTick,
  step,
  warmUp,
  type SystemTimer,
  type Tier,
  type World,
} from '@nomos/sim-core';
import {
  TICK_MS,
  createSnapshotPool,
  giveBack,
  takeView,
  writeSnapshot,
  type AppMessage,
  type SnapshotPool,
  type WorkerMessage,
} from '@nomos/sim-protocol';

export const MAX_TURN_MS = 10;
// At most two ticks' worth, so a stall of any length runs at most 2 ticks and nothing is caught up (R2 §2).
export const MAX_GAP_MS = 250;
export const STATS_MS = 250;
// A shorter wait yields through the MessageChannel instead, since setTimeout clamps nested waits to 4 ms (R2 §2).
export const SLEEP_MIN_MS = 4;

export interface LoopHost {
  now(): number;
  sleep(fn: () => void, ms: number): void;
  yieldNow(fn: () => void): void;
  post(msg: WorkerMessage, transfer: Transferable[]): void;
  makeWorld(seed: number, tier: Tier, map: ArrayBuffer): World;
}

interface Session {
  readonly world: World;
  readonly pool: SnapshotPool;
}

type SnapshotMessage = Extract<WorkerMessage, { type: 'snapshot' }>;
type StatsMessage = Extract<WorkerMessage, { type: 'stats' }>;

export function createSimLoop(host: LoopHost): { handle(msg: AppMessage): void } {
  let session: Session | null = null;
  let running = false;
  let turnPending = false;
  let lastMs = 0;
  let accMs = 0;

  // Sums since the last stats message, which reports them as means.
  const systemMsSum = new Float64Array(SYSTEM_NAMES.length);
  let lapMs = 0;
  let ticksTimed = 0;
  let snapshotMsSum = 0;
  let snapshotsTimed = 0;
  let statsFromMs = 0;

  // One message object and transfer array per kind, reused by every turn, so turns allocate nothing; postMessage copies
  // the message as it sends it.
  const snapshotMsg: SnapshotMessage = { type: 'snapshot', tick: 0, count: 0, buffer: new ArrayBuffer(0) };
  const snapshotTransfer: Transferable[] = [snapshotMsg.buffer];
  const statsMsg: StatsMessage = { type: 'stats', tick: 0, systemMs: {} };
  for (const name of [...SYSTEM_NAMES, 'snapshot']) statsMsg.systemMs[name] = 0;
  const noTransfer: Transferable[] = [];

  const timer: SystemTimer = {
    lap(system: number): void {
      const nowMs = host.now();
      systemMsSum[system] += nowMs - lapMs;
      lapMs = nowMs;
    },
  };

  function handle(msg: AppMessage): void {
    if (msg.type === 'init') {
      init(msg.seed, msg.tier, msg.map);
      return;
    }
    if (session === null) return;
    if (msg.type === 'pause') running = false;
    else if (msg.type === 'resume') resume();
    else if (msg.type === 'checkpoint') postCheckpoint(session.world);
    else giveBack(session.pool, msg.buffer);
  }

  function init(seed: number, tier: Tier, map: ArrayBuffer): void {
    running = false;
    warmUp();
    const world = host.makeWorld(seed, tier, map);
    session = { world, pool: createSnapshotPool(world.agents.capacity) };
    host.post({ type: 'ready', agents: world.agents.count[0] }, []);
  }

  // Time spent paused is dropped, not caught up.
  function resume(): void {
    if (running) return;
    running = true;
    lastMs = host.now();
    accMs = 0;
    statsFromMs = lastMs;
    if (!turnPending) scheduleTurn(TICK_MS);
  }

  function turn(): void {
    turnPending = false;
    if (!running || session === null) return;
    const world = session.world;
    const startMs = host.now();
    accMs = Math.min(accMs + (startMs - lastMs), MAX_GAP_MS);
    lastMs = startMs;
    let ticks = 0;
    while (accMs >= TICK_MS && host.now() - startMs < MAX_TURN_MS) {
      lapMs = host.now();
      step(world, timer);
      accMs -= TICK_MS;
      ticks++;
    }
    ticksTimed += ticks;
    if (ticks > 0) postSnapshot(world, session.pool);
    if (startMs - statsFromMs >= STATS_MS) postStats(world, startMs);
    scheduleTurn(TICK_MS - accMs);
  }

  function scheduleTurn(waitMs: number): void {
    turnPending = true;
    if (waitMs >= SLEEP_MIN_MS) host.sleep(turn, waitMs);
    else host.yieldNow(turn);
  }

  // With every buffer still at the app, the loop keeps ticking and posts nothing.
  function postSnapshot(world: World, pool: SnapshotPool): void {
    const view = takeView(pool);
    if (view === null) return;
    const startMs = host.now();
    snapshotMsg.count = writeSnapshot(world, view);
    snapshotMsSum += host.now() - startMs;
    snapshotsTimed++;
    snapshotMsg.tick = currentTick(world);
    snapshotMsg.buffer = view.buffer;
    snapshotTransfer[0] = view.buffer;
    host.post(snapshotMsg, snapshotTransfer);
  }

  function postStats(world: World, nowMs: number): void {
    const systemMs = statsMsg.systemMs;
    for (let system = 0; system < SYSTEM_NAMES.length; system++) {
      systemMs[SYSTEM_NAMES[system]] = meanMs(systemMsSum[system], ticksTimed);
      systemMsSum[system] = 0;
    }
    systemMs.snapshot = meanMs(snapshotMsSum, snapshotsTimed);
    statsMsg.tick = currentTick(world);
    host.post(statsMsg, noTransfer);
    ticksTimed = 0;
    snapshotMsSum = 0;
    snapshotsTimed = 0;
    statsFromMs = nowMs;
  }

  function postCheckpoint(world: World): void {
    const state = checkpoint(world);
    host.post({ type: 'checkpoint', tick: currentTick(world), state }, [state]);
  }

  return { handle };
}

function meanMs(totalMs: number, count: number): number {
  return count > 0 ? totalMs / count : 0;
}
