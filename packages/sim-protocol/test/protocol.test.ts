import { describe, expect, it } from 'vitest';
import { AGENT_COLUMNS as coreColumns, TIER_AGENTS as coreTiers } from '@nomos/sim-core';
import {
  ACTION_CARRY,
  ACTION_IDLE,
  ACTION_NAMES,
  ACTION_SIT,
  ACTION_SLEEP,
  ACTION_SNEAK,
  ACTION_TALK,
  ACTION_WALK,
  ACTION_WORK,
  AGENT_COLUMNS,
  CUSTOM_FESTIVAL,
  CUSTOM_FOOD,
  CUSTOM_MUSIC,
  CUSTOM_NAMING,
  DAYS_PER_SEASON,
  DAYS_PER_WEEK,
  DAYS_PER_YEAR,
  FACING_DOWN,
  FACING_LEFT,
  FACING_RIGHT,
  FACING_UP,
  SEASONS_PER_YEAR,
  SNAPSHOT_BUFFERS,
  SNAPSHOT_BYTES,
  TICKS_PER_DAY,
  TICKS_PER_SECOND,
  TICKS_PER_YEAR,
  TICK_MS,
  TIER_AGENTS,
  VISUAL_FIELDS,
  actionOf,
  emoteOf,
  facingOf,
  isTrueOnly,
  jobOf,
  lookOf,
  packVisual,
} from '../src/index.ts';

const RESERVED_BITS = 0xf8000080;

function packRow([look, action, emote, job, facing, trueOnly]: number[]): number {
  return packVisual(look, action, emote, job, facing, trueOnly);
}

function fieldsOf(word: number): number[] {
  return [lookOf(word), actionOf(word), emoteOf(word), jobOf(word), facingOf(word), isTrueOnly(word)];
}

function combinations(lists: number[][]): number[][] {
  return lists.reduce<number[][]>((rows, list) => rows.flatMap((row) => list.map((value) => [...row, value])), [[]]);
}

describe('the sim protocol', () => {
  it('records the calendar the sim runs on', () => {
    expect([TICKS_PER_DAY, DAYS_PER_WEEK, DAYS_PER_SEASON, DAYS_PER_YEAR, TICKS_PER_YEAR]).toEqual([
      1440, 7, 28, 112, 161_280,
    ]);
    expect(SEASONS_PER_YEAR * DAYS_PER_SEASON).toBe(DAYS_PER_YEAR);
    expect([TICKS_PER_SECOND, TICK_MS]).toEqual([10, 100]);
  });

  it('packs every visual field at its limits', () => {
    const looks = [0, 95];
    const actions = [0, 1, 2, 3, 4, 5, 6, 7];
    const emotes = [0, 31];
    const jobs = [0, 255];
    const facings = [0, 1, 2, 3];
    const trueOnlyFlags = [0, 1];
    const rows = combinations([looks, actions, emotes, jobs, facings, trueOnlyFlags]);
    const words = rows.map(packRow);

    expect(rows).toHaveLength(512);
    expect(words.map(fieldsOf)).toEqual(rows);
    expect(words.filter((word) => (word >>> 0) !== word || (word & RESERVED_BITS) !== 0)).toEqual([]);
    expect(packVisual(128, 8, 32, 256, 4, 2)).toBe(0);
  });

  it('lays out the word as interfaces.md fixes, with no wanted bit', () => {
    expect(VISUAL_FIELDS).toEqual([
      { name: 'look', shift: 0, bits: 7 },
      { name: 'action', shift: 8, bits: 3 },
      { name: 'emote', shift: 11, bits: 5 },
      { name: 'job', shift: 16, bits: 8 },
      { name: 'facing', shift: 24, bits: 2 },
      { name: 'trueOnly', shift: 26, bits: 1 },
    ]);
    expect(VISUAL_FIELDS.map(({ name }) => name)).not.toContain('wanted');
    expect([FACING_DOWN, FACING_LEFT, FACING_UP, FACING_RIGHT]).toEqual([0, 1, 2, 3]);

    const filled = VISUAL_FIELDS.map((_, filledIndex) => {
      const values = VISUAL_FIELDS.map(({ bits }, i) => (i === filledIndex ? (1 << bits) - 1 : 0));
      return packRow(values);
    });
    expect(filled).toEqual(VISUAL_FIELDS.map(({ shift, bits }) => ((1 << bits) - 1) << shift));
  });

  it('names the eight actions with sneak and carry last', () => {
    expect(ACTION_NAMES).toEqual(['idle', 'walk', 'sit', 'sleep', 'work', 'talk', 'sneak', 'carry']);
    expect([ACTION_IDLE, ACTION_WALK, ACTION_SIT, ACTION_SLEEP, ACTION_WORK, ACTION_TALK, ACTION_SNEAK, ACTION_CARRY]).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it('re-exports the sim-core layouts and sizes the snapshot', () => {
    expect(AGENT_COLUMNS).toBe(coreColumns);
    expect(TIER_AGENTS).toBe(coreTiers);
    expect([CUSTOM_FOOD, CUSTOM_FESTIVAL, CUSTOM_MUSIC, CUSTOM_NAMING]).toEqual([0, 1, 2, 3]);
    expect([SNAPSHOT_BYTES, SNAPSHOT_BUFFERS]).toEqual([12, 3]);
  });
});
