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

// A town's economy after each of its days (M2.2b): the last days of each figure, oldest first, and the day's last trades.
// Every array keeps its length from one message to the next, so read days and trades for how much of each is filled; the
// rest is zero. The trades name the shop and its good and never a buyer.
export interface EconomyMessage {
  type: 'economy';
  // The day that just ended, counted from 0. Point i of every series is day `day - days + 1 + i`, and days is at most
  // FEED_DAYS.
  day: number;
  days: number;
  // The firms' mean wage, in cents a month.
  meanWageCents: Float64Array;
  // The share of households out of work, in parts per million.
  unemploymentPpm: Float64Array;
  // Per town good, BREAD to FUEL: series g is good BREAD + g, and FEED_GOODS long. Units sold in the day and in stock at
  // its end, portions for a food, and the price paid in cents a unit, which is the posted mean on a day nothing sells.
  soldUnits: Float64Array[];
  stockUnits: Float64Array[];
  paidCents: Float64Array[];
  // The day's food in portions: eaten, spoiled across the four foods, and wanted but never bought.
  eaten: Float64Array;
  spoiled: Float64Array;
  unmet: Float64Array;
  // Trade i, oldest first, is tradeUnits[i] units of tradeGood[i] bought from firm row tradeShop[i] for tradeCents[i]
  // cents, for i below trades, which is at most FEED_TRADES. The day's last 8 foods come first, then its last 8 other goods.
  trades: number;
  tradeShop: Int32Array;
  tradeGood: Uint8Array;
  tradeUnits: Int32Array;
  tradeCents: Float64Array;
}

export type WorkerMessage =
  | { type: 'ready'; agents: number }
  | { type: 'snapshot'; tick: number; count: number; buffer: ArrayBuffer }
  | { type: 'stats'; tick: number; systemMs: Record<string, number> } // keyed by SYSTEM_NAMES plus 'snapshot'
  | { type: 'checkpoint'; tick: number; state: ArrayBuffer }
  // agent -1: no blob within a tile, and every field after it 0, -1 or empty. employer is the employing firm's row, employerGood
  // its good (0 for none) and wage its pay in cents a month, or -1, 0 and 0 for someone out of work. look is one of the 96
  // (hue look % 6, eyes floor(look / 6) % 4, pattern floor(look / 24)) and action an ACTION_* code, both as the snapshot's
  // visual word holds them. home is the row of the household's home, or -1, and members the name keys of the other people
  // in its household, in household order: none for someone who lives alone, and at most five.
  | {
      type: 'inspected';
      tick: number;
      agent: number;
      nameKey: number;
      cents: number;
      employer: number;
      employerGood: number;
      wage: number;
      look: number;
      action: number;
      home: number;
      members: number[];
    }
  | EconomyMessage;
