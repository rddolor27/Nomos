import { describe, expect, it } from 'vitest';
import { Pinch } from '../src/view/pinch.ts';

describe('the pinch', () => {
  it('steps the zoom up once the pointers spread by a quarter and down once they close by a fifth', () => {
    const pinch = new Pinch();
    pinch.down(1, 100, 100);
    pinch.down(2, 300, 100);
    expect(pinch.active).toBe(true);

    expect(pinch.move(2, 340, 100)).toBe(0);
    expect(pinch.move(2, 360, 100)).toBe(1);
    expect([pinch.midX, pinch.midY]).toEqual([230, 100]);
    // Each step is measured from the one before: 260 to 200 closes to 77%, and a wobble after it is no step.
    expect(pinch.move(2, 300, 100)).toBe(-1);
    expect(pinch.move(2, 310, 100)).toBe(0);
  });

  it('measures from the first move of two pointers that landed on one spot, and ends when one lifts', () => {
    const pinch = new Pinch();
    pinch.down(1, 50, 50);
    expect(pinch.move(1, 70, 50)).toBe(0);
    expect(pinch.active).toBe(false);
    pinch.down(2, 70, 50);

    expect(pinch.move(2, 80, 50)).toBe(0);
    expect(pinch.move(2, 100, 50)).toBe(1);
    pinch.up(2);
    expect(pinch.active).toBe(false);
    expect(pinch.move(1, 0, 0)).toBe(0);
  });
});
