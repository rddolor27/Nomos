import type { Tier } from '@nomos/sim-core';

export type { Tier };
export { TIER_AGENTS, townAgents } from '@nomos/sim-core';

// Snapshot v1 (interfaces.md): float32 x, float32 y and the uint32 visual word, in three pooled buffers that circulate.
export const SNAPSHOT_BYTES = 12;
export const SNAPSHOT_BUFFERS = 3;

// The ticks the worker runs for each tick of wall time at 1×. Skipping and per-tier caps are M1.2's.
export const SPEEDS = [1, 4, 16] as const;
export type Speed = (typeof SPEEDS)[number];

export type AppMessage =
  | { type: 'init'; seed: number; tier: Tier; map: ArrayBuffer; checks: boolean; agents?: number } // agents: omitted, the tier's whole count
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'speed'; speed: Speed } // changes no state, so a watch-only run accepts it; a paused run keeps it for Play
  | { type: 'checkpoint' } // a worker cannot see pagehide, so the app asks for the checkpoint
  | { type: 'inspect'; x: number; y: number } // world pixels; a read-only query, answered even while a run plays
  | { type: 'return'; buffer: ArrayBuffer };

// A town's economy after each of its days (M2.2b): the last days of three figures, oldest first, and the day's last trades.
// Every array keeps its length from one message to the next, so read days and trades for how much of each is filled; the
// rest is zero. The trades name the shop and never a buyer.
export interface EconomyMessage {
  type: 'economy';
  // The day that just ended, counted from 0. Point i of the three series is day `day - days + 1 + i`, and days is at most
  // FEED_DAYS.
  day: number;
  days: number;
  // The firms' mean price, in cents a unit.
  meanPriceCents: Float64Array;
  // The firms' mean wage, in cents a month.
  meanWageCents: Float64Array;
  // The share of households out of work, in parts per million.
  unemploymentPpm: Float64Array;
  // Trade i, oldest first, is tradeUnits[i] units bought from firm row tradeShop[i] for tradeCents[i] cents, for i below
  // trades, which is at most FEED_TRADES.
  trades: number;
  tradeShop: Int32Array;
  tradeUnits: Int32Array;
  tradeCents: Float64Array;
}

export type WorkerMessage =
  | { type: 'ready'; agents: number }
  | { type: 'snapshot'; tick: number; count: number; buffer: ArrayBuffer }
  | { type: 'stats'; tick: number; systemMs: Record<string, number> } // keyed by SYSTEM_NAMES plus 'snapshot'
  | { type: 'checkpoint'; tick: number; state: ArrayBuffer }
  // agent -1: no blob within a tile. employer is the employing firm's row and wage its pay in cents a month, or -1 and 0 for
  // someone out of work.
  | { type: 'inspected'; tick: number; agent: number; nameKey: number; cents: number; employer: number; wage: number }
  | EconomyMessage;
