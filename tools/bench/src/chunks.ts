import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BUILT_CHUNKS = 'dist/**/*.{js,css,nmap,webp,wasm}';
const WASM_ADVICE = 'add a size-limit entry: WASM core ≤ 64 kB gzip (R5)';

interface SizeLimitEntry {
  readonly path: string | readonly string[];
}

// globSync returns backslashes on Windows, so both sides of the comparison are made slash-separated.
function expand(webRoot: string, pattern: string): string[] {
  return globSync(pattern, { cwd: webRoot }).map((file) => file.replaceAll('\\', '/'));
}

function advise(chunk: string): string {
  return chunk.endsWith('.wasm') ? `${chunk}: ${WASM_ADVICE}` : chunk;
}

// A build with no chunk is refused rather than passed: nothing to check is not the same as everything gated.
export function uncoveredChunks(webRoot: string): string[] {
  const entries = JSON.parse(readFileSync(join(webRoot, '.size-limit.json'), 'utf8')) as SizeLimitEntry[];
  const covered = new Set(entries.flatMap((entry) => [entry.path].flat().flatMap((pattern) => expand(webRoot, pattern))));
  const built = expand(webRoot, BUILT_CHUNKS);
  if (built.length === 0) throw new Error(`${webRoot} holds no built chunk; run pnpm --filter @nomos/web build first`);
  return built.filter((chunk) => !covered.has(chunk)).sort().map(advise);
}

if (import.meta.main) {
  const ungated = uncoveredChunks(fileURLToPath(new URL('../../../apps/web', import.meta.url)));
  console.log([...ungated, `${ungated.length} ungated ${ungated.length === 1 ? 'chunk' : 'chunks'}`].join('\n'));
  process.exitCode = ungated.length === 0 ? 0 : 1;
}
