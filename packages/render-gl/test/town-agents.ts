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

// The renderer's two latest snapshots, both the same so none has moved: one agent for each person of a fixture place, at
// the person's anchor, in every look and facing in turn, and walking in turn.
export function townAgents(layout: PlaceLayout): Retained {
  const { x, y } = layout.people;
  const bytes = new Uint8Array(x.length * SNAPSHOT_BYTES);
  const data = new DataView(bytes.buffer);
  for (let i = 0; i < x.length; i++) {
    data.setFloat32(i * SNAPSHOT_BYTES, x[i], true);
    data.setFloat32(i * SNAPSHOT_BYTES + 4, y[i], true);
    data.setUint32(i * SNAPSHOT_BYTES + 8, packVisual(i % 96, i % 2 ? ACTION_WALK : ACTION_IDLE, 0, 0, FACINGS[i % 4], 0), true);
  }
  const floats = new Float32Array(bytes.buffer);
  const words = new Uint32Array(bytes.buffer);
  return { map: null, minimap: null, copies: [bytes, bytes], floats: [floats, floats], words: [words, words], slot: 0, count: x.length };
}
