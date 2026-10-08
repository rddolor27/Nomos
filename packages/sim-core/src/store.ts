import { take, type Arena } from './memory.ts';

export interface AgentStore {
  readonly capacity: number;
  readonly count: Int32Array;
  readonly x: Int32Array;
  readonly y: Int32Array;
}

// Every per-agent column, checked against the 256-bytes-per-agent budget (Performance budget).
export const AGENT_COLUMNS: readonly { name: string; bytes: number }[] = [
  { name: 'x', bytes: 4 },
  { name: 'y', bytes: 4 },
];

export function createAgentStore(arena: Arena, capacity: number): AgentStore {
  return {
    capacity,
    count: take(arena, Int32Array, 1, true),
    x: take(arena, Int32Array, capacity, true),
    y: take(arena, Int32Array, capacity, true),
  };
}
