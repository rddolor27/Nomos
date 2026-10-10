import type { Site } from './site.ts';

// The ring a walled town keeps for its wall: a line round the rectangle from (x0, y0) to (x1, y1).
export class Wall {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly material: string;

  constructor(x0: number, y0: number, x1: number, y1: number, material: string) {
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
    this.material = material;
  }

  // How many tiles (x, y) lies inside the ring line: 0 on it, and less than 0 outside.
  inset(x: number, y: number): number {
    return Math.min(x - this.x0, this.x1 - x, y - this.y0, this.y1 - y);
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
