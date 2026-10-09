import { readdirSync, readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';
import { generateManifestTypes } from '../scripts/manifest-types.ts';
import { parseMap, type SpriteManifest } from '../src/index.ts';

const spritesDir = new URL('../../../assets/sprites/', import.meta.url);
const schemaFile = new URL('../schema/sprite-manifest.schema.json', import.meta.url);
const typesFile = new URL('../src/sprites/sprite-manifest.ts', import.meta.url);
const townFile = new URL('../../../assets/maps/town.nmap', import.meta.url);
const MANIFEST_WITHOUT_FRAMES = 'season_map.json';

type Json = Record<string, unknown>;

function readJson(url: URL): Json {
  return JSON.parse(readFileSync(url, 'utf8')) as Json;
}

function manifestFiles(): string[] {
  return readdirSync(spritesDir).filter((name) => name.endsWith('.json') && name !== MANIFEST_WITHOUT_FRAMES);
}

function validator(): (data: unknown) => string[] {
  const validate = new Ajv2020({ allErrors: true }).compile(readJson(schemaFile));
  return (data) => (validate(data) ? [] : (validate.errors ?? []).map((error) => `${error.instancePath} ${error.message}`));
}

function mutated(change: (manifest: Json, frame: Json) => void): Json {
  const manifest = structuredClone(readJson(new URL('buildings.json', spritesDir)));
  change(manifest, (manifest.frames as Record<string, Json>).civic_clinic);
  return manifest;
}

const REJECTED: Record<string, Json> = {
  'an atlas index on a frame': mutated((_, frame) => { frame.atlas = 12; }),
  'a 32 px tile': mutated((manifest) => { manifest.tile = 32; }),
  'an unknown top-level field': mutated((manifest) => { manifest.atlas = 'buildings'; }),
  'an uppercase frame name': mutated((manifest, frame) => { (manifest.frames as Json).Civic_Clinic = frame; }),
  'an anchor of three numbers': mutated((_, frame) => { frame.anchor = [1, 2, 3]; }),
  'a fractional anchor': mutated((_, frame) => { frame.anchor = [1.5, 2]; }),
  'an unknown layer': mutated((_, frame) => { frame.layer = 'sky'; }),
  'a corners key of the wrong length': mutated((_, frame) => { frame.corners = '101'; }),
  'a boolean view': mutated((_, frame) => { frame.view = true; }),
  'an image that is not a lowercase png': mutated((manifest) => { manifest.image = 'Buildings.PNG'; }),
  'a size of zero': mutated((manifest) => { manifest.size = [0, 584]; }),
  'a frame without an anchor': mutated((_, frame) => { delete frame.anchor; }),
};

describe('the sprite manifest schema', () => {
  it('validates every sprite manifest', () => {
    const validate = validator();
    const files = manifestFiles();

    const problems = files.flatMap((file) => validate(readJson(new URL(file, spritesDir))).map((error) => `${file}${error}`));

    expect(files.length).toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });

  it('accepts what the generated types describe', () => {
    const sample: SpriteManifest = {
      image: 'tiny.png',
      size: [32, 16],
      tile: 16,
      frames: { tile_grass: { x: 0, y: 0, w: 16, h: 16, anchor: [8, 15], layer: 'ground', joins: 'lr', corners: '1100' } },
    };

    expect(validator()(sample)).toEqual([]);
  });

  it('rejects atlas indices and unknown fields', () => {
    const validate = validator();

    expect(validate(readJson(new URL('buildings.json', spritesDir)))).toEqual([]);
    for (const [label, manifest] of Object.entries(REJECTED)) {
      expect(validate(manifest), label).not.toEqual([]);
    }
  });

  it('names only frames the manifests define', () => {
    const town = parseMap(new Uint8Array(readFileSync(townFile)).buffer);
    const defined = new Set(
      manifestFiles().flatMap((file) =>
        Object.keys(readJson(new URL(file, spritesDir)).frames as Json).map((name) => `${file.replace('.json', '')}/${name}`),
      ),
    );

    expect(town.frames.length).toBeGreaterThan(0);
    expect(town.frames.filter((key) => !defined.has(key))).toEqual([]);
  });

  it('matches its generator', async () => {
    const committed = readFileSync(typesFile, 'utf8').replace(/\r\n/g, '\n');

    expect(committed).toBe(await generateManifestTypes());
  });
});
