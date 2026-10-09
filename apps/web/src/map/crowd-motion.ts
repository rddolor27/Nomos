import { CROWD_Q, CROWD_STOPS, type MapCrowd } from '@nomos/sim-protocol/world-map';

// A dot stands this share of each leg at its stop, then walks straight to the next.
const STAND = 0.4;

// Writes each dot's place at nowMs into xy, x then y, in cells. It runs every Region frame over some 10,000 dots, so it
// allocates nothing.
export function crowdAt(crowd: MapCrowd, nowMs: number, xy: Float32Array): void {
  const { stops, legMs, startMs } = crowd;
  for (let dot = 0; dot < legMs.length; dot++) {
    const leg = legMs[dot];
    const into = (nowMs + startMs[dot]) % (CROWD_STOPS * leg);
    const stop = Math.floor(into / leg);
    const standMs = STAND * leg;
    const walked = Math.max(0, into - stop * leg - standMs) / (leg - standMs);
    const from = 2 * (dot * CROWD_STOPS + stop);
    const to = 2 * (dot * CROWD_STOPS + ((stop + 1) % CROWD_STOPS));
    xy[2 * dot] = (stops[from] + (stops[to] - stops[from]) * walked) / CROWD_Q;
    xy[2 * dot + 1] = (stops[from + 1] + (stops[to + 1] - stops[from + 1]) * walked) / CROWD_Q;
  }
}
