import type { PlaceLayout } from '@nomos/sim-protocol/place';
import type { AtlasFrame, AtlasPage } from '../map/frames.ts';

// Stock pips (M2.7 Part 1, Ruling 8): three beads over each shop and stall, lit by how much of its good it holds, and the
// closed stall in place of a stall that holds none. They are standing sprites added to the town's layout once, so the place
// pass sorts and draws them with the buildings, and a new level only rewrites a sprite's frame in place: nothing is made
// after the town loads.
//
// A pip sorts at its premises' own anchor row, so everything behind the premises, such as the building a stall abuts, draws
// first and cannot cover it. The pass draws a sprite at its sort row less the frame's anchor, so each bead frame comes in a
// copy for every anchor height a building has (withPipFrames), anchored to hang above that building's top row.

// Levels run from 0, nothing in stock, to MOST_BEADS. A level past it, such as NO_LEVEL, draws no pip: the town's first day
// has not ended, so there is no stock to show.
export const MOST_BEADS = 3;
export const NO_LEVEL = 255;
const LEVELS = MOST_BEADS + 1;
const BEAD_FRAMES = ['icons/pip_stock_0', 'icons/pip_stock_1', 'icons/pip_stock_2', 'icons/pip_stock_3'];
const CLOSED_STALL = 'buildings/shop_market-stall_closed';
const BUILDINGS = 'buildings/';
// Clear rows between a pip's bottom row and its sprite's top row.
const GAP = 1;
// A pip with no level stands here, off every view, where both painters skip a sprite.
const HIDDEN_X = -4096;
// A standing sprite is its frame, then its anchor's x and y.
const SPRITE_INTS = 3;

// A shop or stall as the layout draws it: its sprite's frame, and the sprite's anchor, the bottom middle of its footprint,
// in art px. A stall closes when it holds no stock.
export interface PipSite {
  frame: string;
  x: number;
  y: number;
  stall: boolean;
}

function beadName(level: number, anchorY: number): string {
  return `${BEAD_FRAMES[level]}@${anchorY}`;
}

// The atlas's frames and, for each bead frame, a copy at every anchor height a building's frame has, re-anchored so that a
// bead drawn at the building's anchor row stands GAP rows above its top row. An atlas without the beads gains none.
export function withPipFrames(frames: AtlasPage['frames']): Record<string, AtlasFrame> {
  const out: Record<string, AtlasFrame> = { ...frames };
  const heights = new Set<number>();
  for (const [name, frame] of Object.entries(frames)) {
    if (name.startsWith(BUILDINGS)) heights.add(frame.anchor[1]);
  }
  BEAD_FRAMES.forEach((name, level) => {
    const bead = frames[name];
    if (!bead) return;
    for (const anchorY of heights) out[beadName(level, anchorY)] = { ...bead, anchor: [bead.anchor[0], anchorY + GAP + bead.h] };
  });
  return out;
}

function frameIndex(names: string[], name: string): number {
  const found = names.indexOf(name);
  return found >= 0 ? found : names.push(name) - 1;
}

// The offset in `standing` of the sprite with this frame and anchor, or -1.
function standingAt(standing: Int32Array, frame: number, x: number, y: number): number {
  for (let at = 0; at < standing.length; at += SPRITE_INTS) {
    if (standing[at] === frame && standing[at + 1] === x && standing[at + 2] === y) return at;
  }
  return -1;
}

export class TownPips {
  // What the place draws: the town's own layout, or for a town with premises a copy with each pip and the frames they use
  // added at the end.
  readonly layout: PlaceLayout;
  private readonly standing: Int32Array;
  // For each site, where its pip stands in `standing` and the x it shows at.
  private readonly pipAt: Int32Array;
  private readonly pipX: Int32Array;
  // For each site, its pip's frame at each level, LEVELS to a site.
  private readonly beads: Int32Array;
  // For each site, where its stall's own sprite stands in `standing` and its open frame, or -1 where it has no stall to close.
  private readonly stallAt: Int32Array;
  private readonly stallOpen: Int32Array;
  private readonly closed: number;

  // `frames` must be withPipFrames's, and the same the place draws with. A site's sprite must be in them, for the height its
  // pip clears. Every pip starts hidden.
  constructor(layout: PlaceLayout, sites: readonly PipSite[], frames: AtlasPage['frames']) {
    const count = sites.length;
    const own = layout.standing.length;
    const names = [...layout.frames];
    const standing = new Int32Array(own + SPRITE_INTS * count);
    standing.set(layout.standing);
    this.closed = sites.some((site) => site.stall) ? frameIndex(names, CLOSED_STALL) : -1;
    this.beads = new Int32Array(LEVELS * count);
    this.pipAt = new Int32Array(count);
    this.pipX = new Int32Array(count);
    this.stallAt = new Int32Array(count).fill(-1);
    this.stallOpen = new Int32Array(count);
    sites.forEach((site, i) => {
      const sprite = frames[site.frame];
      if (!sprite) throw new Error(`the atlas has no frame ${site.frame}`);
      for (let level = 0; level < LEVELS; level++) {
        const bead = beadName(level, sprite.anchor[1]);
        if (!frames[bead]) throw new Error(`the atlas has no frame ${BEAD_FRAMES[level]} to hang over ${site.frame}`);
        this.beads[LEVELS * i + level] = frameIndex(names, bead);
      }
      const at = own + SPRITE_INTS * i;
      this.pipAt[i] = at;
      this.pipX[i] = site.x;
      standing[at] = this.beads[LEVELS * i];
      standing[at + 1] = HIDDEN_X;
      standing[at + 2] = site.y;
      const open = layout.frames.indexOf(site.frame);
      this.stallOpen[i] = open;
      if (site.stall && open >= 0) this.stallAt[i] = standingAt(layout.standing, open, site.x, site.y);
    });
    this.standing = standing;
    this.layout = count === 0 ? layout : { ...layout, frames: names, standing };
  }

  // Lights each site's pip to its level and closes the stalls at 0, in place and with nothing made, so the next draw shows it.
  set(levels: ArrayLike<number>): void {
    const { standing, beads } = this;
    for (let i = 0; i < this.pipAt.length; i++) {
      const level = levels[i];
      const at = this.pipAt[i];
      const lit = level <= MOST_BEADS;
      standing[at] = beads[LEVELS * i + (lit ? level : 0)];
      standing[at + 1] = lit ? this.pipX[i] : HIDDEN_X;
      const stall = this.stallAt[i];
      if (stall >= 0) standing[stall] = level === 0 ? this.closed : this.stallOpen[i];
    }
  }
}
