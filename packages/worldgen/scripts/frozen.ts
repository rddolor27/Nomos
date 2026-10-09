// Fingerprints the stages Python doesn't have, over goldens-v1's worlds, from the same mirror the checks run:
// node packages/worldgen/scripts/frozen.ts [--check]. Writes test/fixtures/frozen-v1.json; --check compares instead.
import { readFileSync, writeFileSync } from 'node:fs';
import type { Goldens } from '../test/engines/checks.ts';
import { stagePrints } from '../test/engines/stages.ts';

const STAGES = ['regions'];
const GOLDENS = new URL('../test/fixtures/goldens-v1.json', import.meta.url);
const FROZEN = new URL('../test/fixtures/frozen-v1.json', import.meta.url);

function hex(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0');
}

function printOf(prints: Map<string, number>, stage: string): string {
  const print = prints.get(stage);
  if (print === undefined) throw new Error(`the mirror has no ${stage} stage`);
  return hex(print);
}

function build(goldens: Goldens): Goldens {
  const worlds = goldens.worlds.map(({ size, seed }) => {
    const prints = stagePrints(seed, size);
    return { size, seed, prints: STAGES.map((stage) => printOf(prints, stage)).join(' ') };
  });
  return { version: 1, stages: STAGES, worlds };
}

const goldens: Goldens = JSON.parse(readFileSync(GOLDENS, 'utf8'));
const text = `${JSON.stringify(build(goldens), null, 1)}\n`;
const name = 'packages/worldgen/test/fixtures/frozen-v1.json';
if (!process.argv.includes('--check')) {
  writeFileSync(FROZEN, text);
  console.log(`wrote ${name}: ${goldens.worlds.length} worlds, stages ${STAGES.join(', ')}`);
} else if (readFileSync(FROZEN, 'utf8').replace(/\r\n/g, '\n') === text) {
  console.log(`${name} matches on ${goldens.worlds.length} worlds`);
} else {
  console.error(`${name} is out of date: run node packages/worldgen/scripts/frozen.ts and commit the result`);
  process.exitCode = 1;
}
