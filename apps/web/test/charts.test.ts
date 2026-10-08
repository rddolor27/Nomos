import { contrastRatio } from '@nomos/render-gl';
import { expect, test } from 'vitest';
import { addSample, chartData, seriesOptions, tableCells, type Plot } from '../src/charts.ts';

// The page background in index.html, which is Skin A's STONE_D.
const PAGE = 0x464c5e;

function plot(labels: string[]): Plot {
  return { caption: 'Tick time by system (ms)', labels, samples: [] };
}

function strokesOf(count: number): string[] {
  const labels = Array.from({ length: count }, (_, index) => `system ${index}`);
  return seriesOptions(labels)
    .slice(1)
    .map((series) => String(series.stroke));
}

test('keeps the last 20 samples', () => {
  const systems = plot(['day']);
  for (let tick = 1; tick <= 25; tick++) addSample(systems, tick, [tick / 10]);

  expect(systems.samples.map((sample) => sample.tick)).toEqual(Array.from({ length: 20 }, (_, index) => index + 6));
});

test('turns a missing or non-finite timing into a gap', () => {
  const systems = plot(['day', 'move', 'snapshot', 'other']);
  const reported: Record<string, number> = { day: 0.5, move: Number.NaN, snapshot: Number.POSITIVE_INFINITY };
  addSample(systems, 3, systems.labels.map((label) => reported[label]));

  expect(systems.samples).toEqual([{ tick: 3, values: [0.5, null, null, null] }]);
});

test('lines the series up for uPlot', () => {
  const systems = plot(['day', 'move']);
  expect(chartData(systems)).toEqual([[], [], []]);

  addSample(systems, 10, [0.1, 0.2]);
  addSample(systems, 13, [0.3, Number.NaN]);

  expect(chartData(systems)).toEqual([
    [10, 13],
    [0.1, 0.3],
    [0.2, null],
  ]);
});

test('formats the data table in the en locale', () => {
  const systems = plot(['day', 'move']);
  addSample(systems, 12_345, [0.1234, 1234.5]);
  addSample(systems, 12_348, [Number.NaN, 0]);

  expect(tableCells(systems)).toEqual([
    ['12,345', '0.12', '1,234.50'],
    ['12,348', '–', '0.00'],
  ]);
});

test('puts the tick first and the systems after it, in order', () => {
  const labels = seriesOptions(['day', 'move', 'snapshot']).map((series) => series.label);

  expect(labels).toEqual(['Tick', 'day', 'move', 'snapshot']);
});

test('gives each of the first four series its own colour and repeats them after that', () => {
  const strokes = strokesOf(8);

  expect(new Set(strokes.slice(0, 4)).size).toBe(4);
  expect(strokes.slice(4)).toEqual(strokes.slice(0, 4));
});

test('keeps every series colour 3:1 from the page', () => {
  for (const stroke of strokesOf(4)) {
    expect(contrastRatio(Number.parseInt(stroke.slice(1), 16), PAGE), stroke).toBeGreaterThanOrEqual(3);
  }
});
