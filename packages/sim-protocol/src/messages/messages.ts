import type { Tier } from '@nomos/sim-core';

export type { Tier };
export { TIER_AGENTS } from '@nomos/sim-core';

// Snapshot v1 (interfaces.md): float32 x, float32 y and the uint32 visual word, in three pooled buffers that circulate.
export const SNAPSHOT_BYTES = 12;
export const SNAPSHOT_BUFFERS = 3;

export type AppMessage =
  | { type: 'init'; seed: number; tier: Tier; map: ArrayBuffer; checks: boolean }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'checkpoint' } // a worker cannot see pagehide, so the app asks for the checkpoint
  | { type: 'return'; buffer: ArrayBuffer };

export type WorkerMessage =
  | { type: 'ready'; agents: number }
  | { type: 'snapshot'; tick: number; count: number; buffer: ArrayBuffer }
  | { type: 'stats'; tick: number; systemMs: Record<string, number> } // keyed by SYSTEM_NAMES plus 'snapshot'
  | { type: 'checkpoint'; tick: number; state: ArrayBuffer };
