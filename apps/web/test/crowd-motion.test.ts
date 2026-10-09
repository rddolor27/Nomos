import { CROWD_Q, type MapCrowd } from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import { crowdAt } from '../src/map/crowd-motion.ts';

// Each dot walks a square of four stops, given here in cells. Dot 0's legs take 2.5 s, so it stands 1 s and walks 1.5 s,
// and it starts at the top of its loop. Dot 1's legs take 5 s, standing 2 s and walking 3 s, and it starts 3.5 s in,
// halfway along its first walk.
const STOPS = [
  [1.5, 2.5, 2.5, 2.5, 2.5, 3.5, 1.5, 3.5],
  [10.25, 4.75, 11.75, 4.75, 11.75, 5.25, 10.25, 5.25],
];

const crowd: MapCrowd = {
  hue: Uint8Array.from([0, 3]),
  stops: Uint16Array.from(STOPS.flat(), (cells) => cells * CROWD_Q),
  legMs: Uint16Array.from([2500, 5000]),
  startMs: Uint16Array.from([0, 3500]),
};

function at(nowMs: number): number[] {
  const xy = new Float32Array(4);
  crowdAt(crowd, nowMs, xy);
  return [...xy];
}

describe('the map crowd in motion', () => {
  it('stands at each stop for the first 40% of its leg', () => {
    expect(at(0).slice(0, 2)).toEqual([1.5, 2.5]);
    expect(at(1000).slice(0, 2)).toEqual([1.5, 2.5]);
    expect(at(2500).slice(0, 2)).toEqual([2.5, 2.5]);
    expect(at(3500).slice(0, 2)).toEqual([2.5, 2.5]);
  });

  it('then walks straight to the next stop', () => {
    expect(at(1375).slice(0, 2)).toEqual([1.75, 2.5]);
    expect(at(1750).slice(0, 2)).toEqual([2, 2.5]);
    expect(at(4250).slice(0, 2)).toEqual([2.5, 3]);
  });

  it('walks its last leg back to stop 0, then starts the loop again', () => {
    expect(at(8500).slice(0, 2)).toEqual([1.5, 3.5]);
    expect(at(9250).slice(0, 2)).toEqual([1.5, 3]);
    expect(at(10_000).slice(0, 2)).toEqual([1.5, 2.5]);
    expect(at(11_750).slice(0, 2)).toEqual([2, 2.5]);
  });

  it('starts each dot its own way into its loop', () => {
    expect(at(0).slice(2)).toEqual([11, 4.75]);
    expect(at(12_500).slice(2)).toEqual([10.25, 5.25]);
    expect(at(15_000).slice(2)).toEqual([10.25, 5]);
    expect(at(16_500).slice(2)).toEqual([10.25, 4.75]);
  });
});
