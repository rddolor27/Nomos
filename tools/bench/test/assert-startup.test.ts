import { describe, expect, it } from 'vitest';
import { compareStartup, type StartupResult } from '../src/assert-startup.ts';

function startup(firstFrameMs: number, interactiveMs: number): StartupResult {
  return { firstFrameMs: { median: firstFrameMs }, interactiveMs: { median: interactiveMs } };
}

describe('the startup regression gate', () => {
  it('flags real regressions only', () => {
    const main = startup(1_000, 1_000);
    expect(compareStartup(startup(1_160, 1_000), main)).toEqual([expect.stringContaining('firstFrameMs')]);
    expect(compareStartup(startup(1_000, 1_160), main)).toEqual([expect.stringContaining('interactiveMs')]);
    expect(compareStartup(startup(116, 116), startup(100, 100))).toEqual([]);
    expect(compareStartup(startup(1_100, 1_100), main)).toEqual([]);
    expect(compareStartup(startup(1_160, 1_160), null)).toEqual([]);
  });
});
