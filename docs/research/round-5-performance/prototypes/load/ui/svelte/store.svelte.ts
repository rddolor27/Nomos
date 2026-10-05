import { FRAMES, N, initialEvents } from '../common/data';
class UiStore { tick = $state(0); paused = $state(false); speed = $state(4); tiles = $state.raw(FRAMES[0].tiles); events = $state.raw(initialEvents()); agent = $state.raw(FRAMES[0].agent); }
export const ui = new UiStore();
export function apply(i: number) { const f = FRAMES[i % N]; ui.tick = f.tick; ui.tiles = f.tiles; ui.agent = f.agent; ui.events = [f.ev, ...ui.events.slice(0, 49)]; }
