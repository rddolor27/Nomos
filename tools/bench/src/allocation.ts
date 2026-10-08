import {
  PerformanceObserver,
  constants,
  performance,
  type NodeGCPerformanceDetail,
  type PerformanceEntry,
} from 'node:perf_hooks';
import { getHeapStatistics } from 'node:v8';
import { step, type World } from '@nomos/sim-core';
import { writeSnapshot } from '@nomos/sim-protocol';

// perf_hooks reports scavenges late: one setImmediate after a run had seen 1 of 11, and all 11 arrived within 500 ms
// (M0.3's review).
const GC_REPORT_WAIT_MS = 1_000;

// @types/node does not type a gc entry's detail yet.
type GcEntry = PerformanceEntry & { readonly detail: NodeGCPerformanceDetail };

export interface Allocation {
  readonly scavenges: number;
  readonly heapGrowthPerTick: number;
}

// Each tick as the worker runs it: a step, then a snapshot.
export function runTicks(world: World, ticks: number, view: Uint32Array, extra?: (world: World) => void): void {
  for (let tick = 0; tick < ticks; tick++) {
    step(world);
    writeSnapshot(world, view);
    extra?.(world);
  }
}

// Counts the scavenges that start inside the window, which leaves out any from before it and from the wait after it,
// such as Vitest's own. Heap growth is NaN without --expose-gc.
export async function allocationWindow(
  world: World,
  ticks: number,
  view: Uint32Array,
  extra?: (world: World) => void,
): Promise<Allocation> {
  const scavengeStartsMs: number[] = [];
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as GcEntry[]) {
      if (entry.detail.kind === constants.NODE_PERFORMANCE_GC_MINOR) scavengeStartsMs.push(entry.startTime);
    }
  });
  observer.observe({ entryTypes: ['gc'] });
  const heapBefore = collectedHeapBytes();
  const startMs = performance.now();
  runTicks(world, ticks, view, extra);
  const endMs = performance.now();
  const heapAfter = collectedHeapBytes();
  await new Promise((resolve) => setTimeout(resolve, GC_REPORT_WAIT_MS));
  observer.disconnect();
  const scavenges = scavengeStartsMs.filter((ms) => ms >= startMs && ms <= endMs).length;
  return { scavenges, heapGrowthPerTick: (heapAfter - heapBefore) / ticks };
}

function collectedHeapBytes(): number {
  const gc = globalThis.gc;
  if (gc === undefined) return NaN;
  gc();
  return getHeapStatistics().used_heap_size;
}
