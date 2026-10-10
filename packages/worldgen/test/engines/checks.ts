// Free of Node imports, so the same file runs in Node and, bundled, in the browser.
import type { WorldSize } from '@nomos/sim-protocol/world-map';
import { stagePrints } from './stages.ts';

export interface GoldenWorld {
  size: WorldSize;
  seed: number;
  // One 8-digit hex fingerprint per stage, in the file's stage order, separated by spaces.
  prints: string;
}

export interface Goldens {
  version: number;
  stages: string[];
  worlds: GoldenWorld[];
}

export interface EngineReport {
  cases: number;
  failures: string[];
}

export type WorldCounts = Record<WorldSize, number>;

const EVERY: WorldCounts = { standard: 100, large: 100 };

function hex(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0');
}

function wanted(file: Goldens | null, world: GoldenWorld, stage: string): string | undefined {
  const index = file ? file.stages.indexOf(stage) : -1;
  if (!file || index < 0) return undefined;
  return file.worlds.find((w) => w.size === world.size && w.seed === world.seed)?.prints.split(' ')[index];
}

// Python's stages come in goldens-v1's order with none skipped; frozen stages may sit between them. A world stops at
// its first mismatch, since every later stage reads it.
function checkWorld(report: EngineReport, goldens: Goldens, frozen: Goldens | null, world: GoldenWorld): void {
  const name = `${world.size} ${hex(world.seed)}`;
  let next = 0;
  for (const [stage, print] of stagePrints(world.seed, world.size)) {
    report.cases++;
    const index = goldens.stages.indexOf(stage);
    if (index >= 0 && index !== next) {
      report.failures.push(`${name} ${stage}: out of order, ${goldens.stages[next]} comes first`);
      return;
    }
    if (index >= 0) next++;
    const want = wanted(goldens, world, stage) ?? wanted(frozen, world, stage);
    if (want === hex(print)) continue;
    report.failures.push(`${name} ${stage}: got ${hex(print)}, want ${want ?? 'no golden'}`);
    return;
  }
}

// The first counts[size] worlds of each size, against goldens-v1 (Python) and frozen-v1 (TypeScript only).
export function checkStages(goldens: Goldens, frozen: Goldens | null, counts: WorldCounts = EVERY): EngineReport {
  const report: EngineReport = { cases: 0, failures: [] };
  const taken: WorldCounts = { standard: 0, large: 0 };
  for (const world of goldens.worlds) {
    if (taken[world.size] >= counts[world.size]) continue;
    taken[world.size]++;
    checkWorld(report, goldens, frozen, world);
  }
  return report;
}
