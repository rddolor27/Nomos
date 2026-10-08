import { readFileSync, writeFileSync } from 'node:fs';
import { compile } from 'json-schema-to-typescript';

const schemaFile = new URL('../schema/sprite-manifest.schema.json', import.meta.url);
const typesFile = new URL('../src/sprite-manifest.ts', import.meta.url);

// The default banner is a whole-file eslint-disable, which the code rules ban.
const BANNER = '/* Generated from schema/sprite-manifest.schema.json by `pnpm --filter @nomos/sim-protocol types`; do not edit. */';

export function generateManifestTypes(): Promise<string> {
  const schema = JSON.parse(readFileSync(schemaFile, 'utf8'));
  return compile(schema, 'SpriteManifest', { bannerComment: BANNER, style: { singleQuote: true, printWidth: 120 } });
}

if (import.meta.main) {
  writeFileSync(typesFile, await generateManifestTypes());
}
