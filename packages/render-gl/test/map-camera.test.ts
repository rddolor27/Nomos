import { describe, expect, it } from 'vitest';
import { MAP_CELL_PX, cameraDevice, fitMapCamera, mapViewFor, panMapBy, zoomMapAt } from '../src/map.ts';

describe('the map camera', () => {
  it('fits the largest step that shows every cell, centred', () => {
    expect(fitMapCamera(192, 128, 1600, 1100)).toEqual({ x: -4, y: -4.75, cellPx: 8 });
    expect(fitMapCamera(192, 128, 3200, 2100).cellPx).toBe(16);
    expect(fitMapCamera(192, 128, 800, 600).cellPx).toBe(8);
  });

  it('zooms along the ladder about a point, and stops at its ends', () => {
    expect(zoomMapAt({ x: 10, y: 20, cellPx: 16 }, 1, 320, 160)).toEqual({ x: 20, y: 25, cellPx: 32 });
    expect(zoomMapAt({ x: 10, y: 20, cellPx: 16 }, -5, 0, 0).cellPx).toBe(8);
    expect(zoomMapAt({ x: 0, y: 0, cellPx: 128 }, 3, 0, 0).cellPx).toBe(128);
  });

  it('pans and snaps in device pixels', () => {
    expect(panMapBy({ x: 1, y: 2, cellPx: 32 }, 64, -32)).toEqual({ x: 3, y: 1, cellPx: 32 });
    expect(cameraDevice({ x: 1.26, y: -0.5, cellPx: 16 })).toEqual([20, -8]);
  });

  it('gives way to the Region view at 16 CSS px a cell, with 15% hysteresis', () => {
    expect(mapViewFor('country', 16, 1)).toBe('country');
    expect(mapViewFor('region', 16, 1)).toBe('region');
    expect(mapViewFor('country', 32, 1)).toBe('region');
    expect(mapViewFor('region', 8, 1)).toBe('country');
    expect(mapViewFor('country', 32, 2)).toBe('country');
    expect(mapViewFor('region', 32, 2)).toBe('region');
    expect(mapViewFor('region', 16, 2)).toBe('country');
    expect(mapViewFor('country', 48, 2)).toBe('region');
  });

  it('draws either view at a whole scale on every step', () => {
    for (const cellPx of MAP_CELL_PX) {
      for (const current of ['country', 'region'] as const) {
        for (const dpr of [1, 1.5, 2, 3]) {
          const art = mapViewFor(current, cellPx, dpr) === 'region' ? 16 : 8;
          expect(cellPx % art, `${cellPx} px at dpr ${dpr} from ${current}`).toBe(0);
        }
      }
    }
  });
});
