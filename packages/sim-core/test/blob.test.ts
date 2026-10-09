import { describe, expect, it } from 'vitest';
import { Blob } from '../src/agents/blob.ts';
import { issue, walletAccount } from '../src/money/ledger.ts';
import { draw2 } from '../src/random/draw.ts';
import { checkpoint, restoreWorld } from '../src/world/checkpoint.ts';
import { createWorld } from '../src/world/world.ts';
import { run } from './run.ts';

const ROWS = 64;
const READ_WRITE = ['action', 'facing', 'heading', 'vx', 'vy', 'x', 'y'];
const READ_ONLY = ['cash', 'index', 'nameKey', 'wallet'];

describe('the Blob handle', () => {
  it('reads and writes its row through every accessor', () => {
    const { agents, cash, blob } = createWorld(42, 'phone');
    const { count, x, y, vx, vy, heading, action, facing, nameKey } = agents;
    // Every wallet holds its own balance, so a getter that reads a neighbour's wallet shows.
    for (let i = 0; i < count[0]; i++) issue(cash, walletAccount(cash, i), i);
    for (let k = 0; k < ROWS; k++) {
      const i = draw2(42, 1, k, 0) % count[0];
      blob.at(i);
      expect(blob.index).toBe(i);
      expect([blob.x, blob.y, blob.vx, blob.vy, blob.heading, blob.action, blob.facing]).toEqual([
        x[i], y[i], vx[i], vy[i], heading[i], action[i], facing[i],
      ]);
      expect(blob.nameKey).toBe(nameKey[i]);
      expect(blob.wallet).toBe(walletAccount(cash, i));
      expect(blob.cash).toBe(cash.balance[blob.wallet]);

      // Seven different values at every row, so two setters wired to each other's column would show.
      blob.x = 5_000 + k;
      blob.y = -6_000 - k;
      blob.vx = -1 - k;
      blob.vy = 1 + k;
      blob.heading = 255 - k;
      blob.action = 100 + k;
      blob.facing = 10 + k;
      expect([x[i], y[i], vx[i], vy[i], heading[i], action[i], facing[i]]).toEqual([
        5_000 + k, -6_000 - k, -1 - k, 1 + k, 255 - k, 100 + k, 10 + k,
      ]);
    }
  });

  it('lists exactly its accessors, and no look', () => {
    expect(Object.getOwnPropertyNames(Blob.prototype).sort()).toEqual([
      'action', 'at', 'cash', 'constructor', 'facing', 'heading', 'index', 'nameKey', 'vx', 'vy', 'wallet', 'x', 'y',
    ]);
    for (const name of READ_WRITE) expect(Object.getOwnPropertyDescriptor(Blob.prototype, name)?.set, name).toBeTypeOf('function');
    for (const name of READ_ONLY) expect(Object.getOwnPropertyDescriptor(Blob.prototype, name)?.set, name).toBeUndefined();
  });

  it('gives a restored world its own handle', () => {
    const original = run(createWorld(42, 'phone'), 100);
    const restored = restoreWorld(42, 'phone', checkpoint(original));
    expect(restored.blob).not.toBe(original.blob);
    original.blob.at(7);
    restored.blob.at(7);
    expect([restored.blob.x, restored.blob.y, restored.blob.cash]).toEqual([
      original.blob.x, original.blob.y, original.blob.cash,
    ]);

    // Equal values prove nothing, since a restore copies them: a write to one world must leave the other's row alone.
    const restoredX = restored.blob.x;
    original.blob.x = restoredX + 1_000;
    expect([restored.blob.x, restored.agents.x[7]]).toEqual([restoredX, restoredX]);
  });
});
