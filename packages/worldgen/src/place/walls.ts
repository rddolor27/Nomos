import type { Site } from './site.ts';

// The ring a walled town keeps for its wall: the rectangle from (x0, y0) to (x1, y1) with each corner cut off by a
// diagonal that runs `cuts` tiles along both edges, so an octagon, or a plain rectangle when cuts is 0. The line is
// 8-connected, so a 4-way flood cannot cross it.
export class Wall {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly cuts: number;
  readonly material: string;

  constructor(x0: number, y0: number, x1: number, y1: number, cuts: number, material: string) {
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
    this.cuts = cuts;
    this.material = material;
  }

  // How many tiles (x, y) lies inside the ring line: 0 on it, and less than 0 outside. Across a cut it counts steps
  // along the edges, which is what a street running at right angles to the cut needs.
  inset(x: number, y: number): number {
    const left = x - this.x0;
    const right = this.x1 - x;
    const top = y - this.y0;
    const bottom = this.y1 - y;
    const inset = Math.min(left, right, top, bottom);
    if (this.cuts === 0) return inset;
    const cut = this.cuts;
    return Math.min(inset, left + top - cut, right + top - cut, left + bottom - cut, right + bottom - cut);
  }

  contains(x: number, y: number): boolean {
    return this.inset(x, y) > 0;
  }

  onLine(x: number, y: number): boolean {
    return this.inset(x, y) === 0;
  }

  // Keeps every tile of the line that no road crosses, so nothing is built where the wall will stand.
  reserve(site: Site): void {
    for (let y = this.y0; y <= this.y1; y++) {
      for (let x = this.x0; x <= this.x1; x++) {
        if (this.onLine(x, y) && !site.road[site.at(x, y)]) site.keep[site.at(x, y)] = 1;
      }
    }
  }
}
