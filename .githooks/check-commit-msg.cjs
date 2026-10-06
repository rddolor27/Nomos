#!/usr/bin/env node
// Enforces the commit message format described under "Commits" in README.md.
'use strict';

const fs = require('fs');

const TYPES = ['feat', 'fix', 'chore', 'refactor', 'perf', 'test', 'docs', 'style', 'build', 'ci', 'revert'];
const HEADER = new RegExp(`^(${TYPES.join('|')})(\\([\\w./-]+\\))?!?: \\S`);
const MAX_HEADER_LENGTH = 72;
const GIT_GENERATED = /^(Merge|Revert|fixup!|squash!|amend!) /;

function messageLines(text) {
  const lines = text.split(/\r?\n/);
  const scissors = lines.findIndex((line) => /^# -+ >8 -+$/.test(line));
  const kept = (scissors === -1 ? lines : lines.slice(0, scissors)).filter((line) => !line.startsWith('#'));
  return kept.slice(Math.max(0, kept.findIndex((line) => line.trim() !== '')));
}

function problems([header = '', second = '']) {
  if (GIT_GENERATED.test(header)) return [];
  const found = [];
  if (!HEADER.test(header)) found.push(`start with type(scope): description, where type is one of ${TYPES.join(', ')}`);
  if (header.length > MAX_HEADER_LENGTH) found.push(`keep the header to ${MAX_HEADER_LENGTH} characters (it has ${header.length})`);
  if (header.trimEnd().endsWith('.')) found.push('drop the trailing period from the header');
  if (second.trim() !== '') found.push('leave a blank line between the header and the body');
  return found;
}

const lines = messageLines(fs.readFileSync(process.argv[2], 'utf8'));
const found = problems(lines);
if (found.length) {
  console.error(`commit-msg: "${lines[0] || ''}"`);
  for (const problem of found) console.error(`  - ${problem}`);
  console.error('  e.g. "feat(sim-core): add the day-boundary commit phase"');
  process.exit(1);
}
