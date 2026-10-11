import {
  ACTION_IDLE,
  FOCUS_PENDING,
  GENERIC,
  NO_HOME,
  NO_HOUSEHOLD,
  NO_PLACE,
  STREETS,
  SUBPIXELS,
  SYSTEM_NAMES,
  TILE_PX,
  checkpoint,
  currentTick,
  firstMemberOf,
  householdOf,
  minuteOf,
  nearestAgent,
  requestTown,
  step,
  streetsAsleep,
  warmUp,
  type Ground,
  type Homes,
  type Shops,
  type SystemTimer,
  type Tier,
  type World,
} from '@nomos/sim-core';
import {
  TICK_MS,
  createEconomyFeed,
  createSnapshotPool,
  economyDayEnded,
  giveBack,
  takeView,
  writeEconomyFeed,
  writeSnapshot,
  type AppMessage,
  type EconomyMessage,
  type SnapshotPool,
  type Speed,
  type WorkerMessage,
} from '@nomos/sim-protocol';

// A turn may spend this long for each tick of speed, so 16× has 160 ms to fit its 16 ticks (M2.2b Ruling 6).
export const MAX_TURN_MS = 10;
// At most two slots' worth, so a stall of any length runs at most two slots, 2 ticks at 1×, and nothing is caught up (R2 §2).
export const MAX_GAP_MS = 250;
export const STATS_MS = 250;
// A shorter wait yields through the MessageChannel instead, since setTimeout clamps nested waits to 4 ms (R2 §2).
export const SLEEP_MIN_MS = 4;
// A town's streets stand empty from 22:00 to 06:00, so the night passes at this many times the chosen speed (owner, 11 October
// 2026; M2.7 Ruling 3). The speed is pacing only: it moves no tick's state.
export const NIGHT_SPEEDUP = 8;
const NIGHT_FROM_MINUTE = 1_320;
const NIGHT_TO_MINUTE = 360;
// One tile.
const INSPECT_RADIUS_Q8 = TILE_PX * SUBPIXELS;
const NO_EMPLOYER = -1;

// The town an open message's map holds: its ground, the homes on it and the shops that give it streets. A site with no shops
// wanders, as a stand-in town does.
export interface TownSite {
  readonly ground: Ground;
  readonly homes: Homes;
  readonly shops?: Shops;
}

export interface LoopHost {
  now(): number;
  sleep(fn: () => void, ms: number): void;
  yieldNow(fn: () => void): void;
  post(msg: WorkerMessage, transfer: Transferable[]): void;
  makeWorld(seed: number, tier: Tier, map: ArrayBuffer, agents?: number): World;
  readTown(map: ArrayBuffer): TownSite;
}

interface Session {
  readonly world: World;
  readonly pool: SnapshotPool;
  // Made with the world and again at each switch, so the panel's days start over with the town; a world that is not a town
  // never writes it.
  feed: EconomyMessage;
}

type SnapshotMessage = Extract<WorkerMessage, { type: 'snapshot' }>;
type StatsMessage = Extract<WorkerMessage, { type: 'stats' }>;
type InspectedMessage = Extract<WorkerMessage, { type: 'inspected' }>;

// cpuSlowdown stands in for CDP's CPU throttling, which skips workers: the startup gate sets it (R5 load notes §2).
export function createSimLoop(host: LoopHost, cpuSlowdown = 1): { handle(msg: AppMessage): void } {
  let session: Session | null = null;
  let running = false;
  let speed: Speed = 1;
  let turnPending = false;
  // A town's day ended in the turn under way, so the turn posts its economy feed.
  let feedDue = false;
  let lastMs = 0;
  let accMs = 0;
  // When the work the next slowed wait covers began: the message, the turn or the last reply.
  let workFromMs = 0;

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
    workFromMs = host.now();
    if (msg.type === 'init') {
      init(msg.seed, msg.tier, msg.map, msg.checks, msg.agents);
      return;
    }
    if (session === null) return;
    if (msg.type === 'pause') running = false;
    else if (msg.type === 'resume') resume();
    else if (msg.type === 'speed') speed = msg.speed;
    else if (msg.type === 'checkpoint') postCheckpoint(session.world);
    else if (msg.type === 'inspect') postInspected(session.world, msg.x, msg.y);
    else if (msg.type === 'inspectAgent') postAgentInspected(session.world, msg.agent);
    else if (msg.type === 'open') openTown(session, msg.place, msg.map);
    else giveBack(session.pool, msg.buffer);
  }

  function init(seed: number, tier: Tier, map: ArrayBuffer, checks: boolean, agents?: number): void {
    running = false;
    speed = 1;
    const world = host.makeWorld(seed, tier, map, agents);
    world.checks = checks;
    const feed = createEconomyFeed();
    const fed = runNight(world, feed);
    const pool = createSnapshotPool(world.agents.capacity);
    session = { world, pool, feed };
    post({ type: 'ready', agents: world.agents.count[0] }, []);
    // The spawn, so a page that starts paused, as under reduced motion, still draws its agents (M0.5).
    postSnapshot(world, pool);
    if (fed) post(feed, noTransfer);
    // After the replies, so the first frame never waits for it; whatever the page sends meanwhile queues behind it. A
    // slower CPU would warm up for longer, so a slowed worker holds the queue for that long too.
    warmUp();
    if (cpuSlowdown > 1) waitAsSlowerCpu();
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
    workFromMs = startMs;
    accMs = Math.min(accMs + (startMs - lastMs), MAX_GAP_MS);
    lastMs = startMs;
    const untilMs = startMs + MAX_TURN_MS * speed;
    let ticks = 0;
    feedDue = false;
    while (accMs >= TICK_MS && host.now() < untilMs) {
      accMs -= TICK_MS;
      ticks += runSlot(world, session.feed, untilMs);
    }
    ticksTimed += ticks;
    if (ticks > 0) postSnapshot(world, session.pool);
    if (feedDue) post(session.feed, noTransfer);
    if (startMs - statsFromMs >= STATS_MS) postStats(world, startMs);
    scheduleTurn(TICK_MS - accMs);
  }

  // A slot is the 100 ms of wall time that one tick takes at 1×, and it holds `speed` ticks, or NIGHT_SPEEDUP times as many when
  // it starts in an empty night, which ends the slot at 06:00. A slot the turn's time cuts short is spent all the same, so a
  // slow device plays slower and never makes the lost ticks up.
  function runSlot(world: World, feed: EconomyMessage, untilMs: number): number {
    const night = isStreetNight(world);
    const slotTicks = night ? speed * NIGHT_SPEEDUP : speed;
    let ran = 0;
    while (ran < slotTicks && host.now() < untilMs) {
      lapMs = host.now();
      step(world, timer);
      ran++;
      if (economyDayEnded(world)) {
        writeEconomyFeed(world, feed);
        feedDue = true;
      }
      if (night && minuteOf(currentTick(world)) === NIGHT_TO_MINUTE) break;
    }
    return ran;
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
    post(snapshotMsg, snapshotTransfer);
  }

  function postStats(world: World, nowMs: number): void {
    const systemMs = statsMsg.systemMs;
    for (let system = 0; system < SYSTEM_NAMES.length; system++) {
      systemMs[SYSTEM_NAMES[system]] = meanMs(systemMsSum[system], ticksTimed);
      systemMsSum[system] = 0;
    }
    systemMs.snapshot = meanMs(snapshotMsSum, snapshotsTimed);
    statsMsg.tick = currentTick(world);
    post(statsMsg, noTransfer);
    ticksTimed = 0;
    snapshotMsSum = 0;
    snapshotsTimed = 0;
    statsFromMs = nowMs;
  }

  function postCheckpoint(world: World): void {
    const state = checkpoint(world);
    post({ type: 'checkpoint', tick: currentTick(world), state }, [state]);
  }

  function postInspected(world: World, x: number, y: number): void {
    const tick = currentTick(world);
    const agent = nearestAgent(world.agents, Math.round(x * SUBPIXELS), Math.round(y * SUBPIXELS), INSPECT_RADIUS_Q8);
    post(agent < 0 ? noBlobReply(tick) : blobReply(world, tick, agent), noTransfer);
  }

  // The blob a live card shows, asked for again by its row. A row the town has no blob at answers -1, as an old town's rows
  // do after a switch to a smaller one; a row below the count may be another blob by then, so the page drops its card when a
  // town opens.
  function postAgentInspected(world: World, agent: number): void {
    const tick = currentTick(world);
    const found = Number.isInteger(agent) && agent >= 0 && agent < world.agents.count[0];
    post(found ? blobReply(world, tick, agent) : noBlobReply(tick), noTransfer);
  }

  // A switch lands at a day boundary (M2.2c Ruling 2), so the rest of the day runs here at once, with no snapshots and
  // whether or not the run is paused. The handler is one turn, so no checkpoint or inspect falls between the request and the
  // switch. The map is read first, so a bad one changes nothing. A request for the live town, or one the sim refuses, switches
  // nothing, and opened names the town still live. The snapshot lets a paused page draw the new town, as init's does. A town
  // with streets then opens at 06:00, which only a real switch runs up to.
  function openTown(session: Session, place: number, map: ArrayBuffer): void {
    const world = session.world;
    let fed = false;
    if (place !== world.focus[0]) {
      const { ground, homes, shops } = host.readTown(map);
      if (requestTown(world, place, ground, homes, shops)) {
        while (world.focus[FOCUS_PENDING] !== NO_PLACE) step(world);
        session.feed = createEconomyFeed();
        fed = runNight(world, session.feed);
      }
    }
    const { width, height } = world.ground;
    post({ type: 'opened', place: world.focus[0], agents: world.agents.count[0], width, height, tick: currentTick(world) }, noTransfer);
    postSnapshot(world, session.pool);
    if (fed) post(session.feed, noTransfer);
  }

  // Waits before the post rather than after the handler, which would come too late: init posts ready and the spawn
  // that the page's first frame waits for before it returns.
  function post(msg: WorkerMessage, transfer: Transferable[]): void {
    if (cpuSlowdown > 1) waitAsSlowerCpu();
    host.post(msg, transfer);
    workFromMs = host.now();
  }

  // A CPU cpuSlowdown times slower would still be working, so spin until it would be done.
  function waitAsSlowerCpu(): void {
    let nowMs = host.now();
    const doneAtMs = nowMs + (cpuSlowdown - 1) * (nowMs - workFromMs);
    while (nowMs < doneAtMs) nowMs = host.now();
  }

  return { handle };
}

function meanMs(totalMs: number, count: number): number {
  return count > 0 ? totalMs / count : 0;
}

// Only a town with streets has an empty night: any other world has its blobs about at every hour.
function isStreetNight(world: World): boolean {
  if (world.globals[STREETS] !== 1) return false;
  const minute = minuteOf(currentTick(world));
  return minute >= NIGHT_FROM_MINUTE || minute < NIGHT_TO_MINUTE;
}

// A town with streets opens at 06:00 (M2.7 Ruling 3), so its night runs at once, with no snapshots, as a switch runs out a day.
// The day's economy ends inside it, so its row goes into the feed as a turn would write it. Whether it did tells the caller to
// post the row, which the panel would otherwise wait a day for.
function runNight(world: World, feed: EconomyMessage): boolean {
  let fed = false;
  while (streetsAsleep(world)) {
    step(world);
    if (economyDayEnded(world)) {
      writeEconomyFeed(world, feed);
      fed = true;
    }
  }
  return fed;
}

function noBlobReply(tick: number): InspectedMessage {
  return {
    type: 'inspected',
    tick,
    agent: -1,
    nameKey: 0,
    cents: 0,
    employer: NO_EMPLOYER,
    employerGood: GENERIC,
    wage: 0,
    look: 0,
    action: ACTION_IDLE,
    home: NO_HOME,
    members: [],
  };
}

// A read-only query answered between turns, so it may allocate. Only this and the snapshot writer read a look, to draw it.
function blobReply(world: World, tick: number, agent: number): InspectedMessage {
  const { blob, households } = world;
  blob.at(agent);
  const employer = blob.employer;
  const household = householdOf(households, agent);
  return {
    type: 'inspected',
    tick,
    agent,
    nameKey: blob.nameKey,
    cents: blob.cash,
    employer,
    employerGood: employer < 0 ? GENERIC : world.goods.good[employer],
    wage: employer < 0 ? 0 : world.firms.wage[employer],
    look: world.agents.look[agent],
    action: blob.action,
    home: household === NO_HOUSEHOLD ? NO_HOME : households.home[household],
    members: housemateKeys(world, household, agent),
  };
}

// The name keys of the others in agent's household, in household order: none for someone who lives alone, or in no household.
function housemateKeys(world: World, household: number, agent: number): number[] {
  const keys: number[] = [];
  if (household === NO_HOUSEHOLD) return keys;
  const first = firstMemberOf(world.households, household);
  const end = first + world.households.size[household];
  for (let member = first; member < end; member++) {
    if (member !== agent) keys.push(world.agents.nameKey[member]);
  }
  return keys;
}
