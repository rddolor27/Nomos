// As map-input.ts's pinch: two pointers step the zoom whenever they spread or close by a quarter.
const PINCH_STEP = 1.25;

// The pointers of one pinch, fed every pointer event of the view so each position is fresh when a second one lands.
export class Pinch {
  // The pointers' midpoint in client px, as of the last move of a pinch.
  midX = 0;
  midY = 0;
  private readonly points = new Map<number, [number, number]>();
  // The distance between the pointers at the last step, or at the start of the pinch.
  private reference = 0;

  get active(): boolean {
    return this.points.size === 2;
  }

  // A third pointer is no part of the pinch.
  down(pointer: number, x: number, y: number): void {
    if (this.points.size === 2) return;
    this.points.set(pointer, [x, y]);
    if (this.points.size === 2) this.reference = this.measure();
  }

  // The zoom step due: 1 once the pointers have spread by a quarter, -1 once they have closed by a fifth, else 0.
  move(pointer: number, x: number, y: number): number {
    const point = this.points.get(pointer);
    if (!point) return 0;
    point[0] = x;
    point[1] = y;
    if (!this.active) return 0;
    const distance = this.measure();
    // Two pointers that landed on one spot have no distance to compare with until they part.
    if (this.reference === 0) {
      this.reference = distance;
      return 0;
    }
    const ratio = distance / this.reference;
    if (ratio < PINCH_STEP && ratio > 1 / PINCH_STEP) return 0;
    this.reference = distance;
    return ratio > 1 ? 1 : -1;
  }

  up(pointer: number): void {
    this.points.delete(pointer);
  }

  // The pointers' distance, which also sets their midpoint.
  private measure(): number {
    const [a, b] = this.points.values();
    this.midX = (a[0] + b[0]) / 2;
    this.midY = (a[1] + b[1]) / 2;
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
}
