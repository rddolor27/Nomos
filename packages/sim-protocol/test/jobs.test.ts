import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JOB_ITEMS, jobId } from '../src/index.ts';

const spritesDir = new URL('../../../assets/sprites/', import.meta.url);
const MANIFEST_WITHOUT_FRAMES = 'season_map.json';

interface Manifest {
  frames: Record<string, { job?: string }>;
}

function jobsTheManifestsDraw(): string[] {
  const jobs = new Set<string>();
  const files = readdirSync(spritesDir).filter((name) => name.endsWith('.json') && name !== MANIFEST_WITHOUT_FRAMES);
  for (const file of files) {
    const manifest: Manifest = JSON.parse(readFileSync(new URL(file, spritesDir), 'utf8'));
    for (const frame of Object.values(manifest.frames)) {
      if (frame.job !== undefined) jobs.add(frame.job);
    }
  }
  return [...jobs].sort();
}

describe('the job items', () => {
  it('names the job items the manifests draw', () => {
    expect([...JOB_ITEMS].sort()).toEqual(jobsTheManifestsDraw());
  });

  it('keeps the ids interfaces.md fixes: index + 1, with 0 for none', () => {
    expect(JOB_ITEMS.map((item, index) => `${index + 1} ${item}`)).toEqual([
      '1 builder',
      '2 clinic',
      '3 farmer',
      '4 merchant',
      '5 police',
      '6 soldier',
    ]);
    expect(JOB_ITEMS.length).toBeLessThanOrEqual(255);
  });

  it('gives each item its id', () => {
    expect([jobId('builder'), jobId('merchant'), jobId('police'), jobId('soldier')]).toEqual([1, 4, 5, 6]);
  });
});
