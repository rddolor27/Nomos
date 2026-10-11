import {
  ACTION_IDLE,
  ACTION_WALK,
  FACING_DOWN,
  FACING_LEFT,
  FACING_RIGHT,
  FACING_UP,
  SNAPSHOT_BYTES,
  packVisual,
} from '@nomos/sim-protocol';
import type { PlaceLayout } from '@nomos/sim-protocol/place';
import type { Retained } from '../src/renderer/types.ts';

const FACINGS = [FACING_DOWN, FACING_LEFT, FACING_UP, FACING_RIGHT];

// One agent of a snapshot: its world px and its visual word.
type Row = [x: number, y: number, word: number];

// The renderer's two latest snapshots, both the same so none has moved, holding these agents at this tick.
function retainedOf(rows: Row[], tick: number): Retained {
  const bytes = new Uint8Array(rows.length * SNAPSHOT_BYTES);
  const data = new DataView(bytes.buffer);
  rows.forEach(([x, y, word], i) => {
    data.setFloat32(i * SNAPSHOT_BYTES, x, true);
    data.setFloat32(i * SNAPSHOT_BYTES + 4, y, true);
    data.setUint32(i * SNAPSHOT_BYTES + 8, word, true);
  });
  const floats = new Float32Array(bytes.buffer);
  const words = new Uint32Array(bytes.buffer);
  return { map: null, minimap: null, copies: [bytes, bytes], floats: [floats, floats], words: [words, words], slot: 0, count: rows.length, tick };
}

// One agent for each person of a fixture place, at the person's anchor, in every look and facing in turn, and walking in turn.
export function townAgents(layout: PlaceLayout): Retained {
  const { x, y } = layout.people;
  const rows = Array.from(x, (px, i): Row => [px, y[i], packVisual(i % 96, i % 2 ? ACTION_WALK : ACTION_IDLE, 0, 0, FACINGS[i % 4], 0)]);
  return retainedOf(rows, 0);
}

// An agent of the street, as plain data a browser spec can send the harness: where it stands and what its word shows.
export interface StreetAgent {
  x: number;
  y: number;
  look: number;
  facing: 'down' | 'left' | 'up' | 'right';
  walking?: boolean;
  indoors?: boolean;
  // The good carried: 0, or its code in ITEM_GOODS.
  item?: number;
  eating?: boolean;
}

const FACING_OF: Record<StreetAgent['facing'], number> = { down: FACING_DOWN, left: FACING_LEFT, up: FACING_UP, right: FACING_RIGHT };

export function streetAgents(agents: readonly StreetAgent[], tick: number): Retained {
  const rows = agents.map((a): Row => {
    const action = a.walking ? ACTION_WALK : ACTION_IDLE;
    return [a.x, a.y, packVisual(a.look, action, 0, 0, FACING_OF[a.facing], 0, a.indoors ? 1 : 0, a.item ?? 0, a.eating ? 1 : 0)];
  });
  return retainedOf(rows, tick);
}
