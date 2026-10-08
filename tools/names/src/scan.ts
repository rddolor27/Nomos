import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { franchiseHits } from './franchise.ts';

// line is 1-based for a hit in a file's text, and 0 for a hit in its path.
export interface Finding {
  readonly path: string;
  readonly line: number;
  readonly text: string;
}

const CODE_FOLDERS = ['apps/', 'packages/', 'tools/'];
const SNIFF_BYTES = 8192;
const QUOTE_CHARS = 160;
const MAX_LISTING_BYTES = 64 * 1024 * 1024;

function trackedPaths(root: string): string[] {
  const listing = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: MAX_LISTING_BYTES });
  return listing.split('\0').filter((path) => path !== '');
}

// The READMEs and plans state the rule in words, so markdown is read by path only.
function readsContent(path: string): boolean {
  if (path.endsWith('.md')) return false;
  return path === 'package.json' || CODE_FOLDERS.some((folder) => path.startsWith(folder));
}

function readText(file: string): string | null {
  const stat = lstatSync(file, { throwIfNoEntry: false });
  if (!stat?.isFile()) return null;
  const bytes = readFileSync(file);
  return bytes.subarray(0, SNIFF_BYTES).includes(0) ? null : bytes.toString('utf8');
}

function lineFindings(path: string, text: string): Finding[] {
  const found: Finding[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (franchiseHits(lines[i]).length > 0) found.push({ path, line: i + 1, text: lines[i].trim().slice(0, QUOTE_CHARS) });
  }
  return found;
}

export function scanPaths(root: string, paths: readonly string[]): Finding[] {
  const found: Finding[] = [];
  for (const path of paths) {
    if (franchiseHits(path).length > 0) found.push({ path, line: 0, text: path });
    const text = readsContent(path) ? readText(join(root, path)) : null;
    if (text !== null) found.push(...lineFindings(path, text));
  }
  return found;
}

export function scanRepo(root: string): Finding[] {
  return scanPaths(root, trackedPaths(root));
}

export function formatFindings(findings: readonly Finding[]): string[] {
  const lines = findings.map((finding) => `${finding.path}:${finding.line}: ${finding.text}`);
  return [...lines, `${findings.length} ${findings.length === 1 ? 'finding' : 'findings'}`];
}
