import { readFileSync } from 'node:fs';
import { MAP_CONTENT_TYPE } from '@nomos/sim-protocol';
import { expect, test } from 'vitest';
import { headersFor, parseHeaders } from '../vite/headers.ts';

const IMMUTABLE = 'public, max-age=31536000, immutable';
const ISOLATION = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' };

test('parses rules in file order', () => {
  expect(parseHeaders('/a/*\n  X-A: 1\n  X-B: 2\n/b\n  X-C: 3\n')).toEqual([
    { pattern: '/a/*', headers: { 'X-A': '1', 'X-B': '2' } },
    { pattern: '/b', headers: { 'X-C': '3' } },
  ]);
});

test('skips comments and blank lines, and reads CRLF, tabs and colons in values', () => {
  const text = '# caching\r\n\r\n/a/*\r\n\tLink: <https://x.test/f.css>; rel=preload\r\n/b\r\n  X-One: 1\r\n';

  expect(parseHeaders(text)).toEqual([
    { pattern: '/a/*', headers: { Link: '<https://x.test/f.css>; rel=preload' } },
    { pattern: '/b', headers: { 'X-One': '1' } },
  ]);
});

test('serves the production headers', () => {
  const rules = parseHeaders(readFileSync(new URL('../public/_headers', import.meta.url), 'utf8'));

  expect(headersFor('/assets/index-x.js', rules)).toEqual({ 'Cache-Control': IMMUTABLE, ...ISOLATION });
  expect(headersFor('/assets/maps/town-x.nmap', rules)).toEqual({
    'Cache-Control': IMMUTABLE,
    'Content-Type': MAP_CONTENT_TYPE,
    ...ISOLATION,
  });
  expect(headersFor('/index.html', rules)).toEqual(ISOLATION);
  expect(headersFor('/', rules)).toEqual(ISOLATION);
});

test('matches a splat anywhere and everything else literally, whole path only', () => {
  const rules = parseHeaders('/a/*\n  X-A: 1\n/b/*/c.js\n  X-B: 1\n/d\n  X-D: 1\n');

  expect(headersFor('/a/', rules)).toEqual({ 'X-A': '1' });
  expect(headersFor('/a/x/y', rules)).toEqual({ 'X-A': '1' });
  expect(headersFor('/a', rules)).toEqual({});
  expect(headersFor('/x/a/y', rules)).toEqual({});
  expect(headersFor('/b/x/c.js', rules)).toEqual({ 'X-B': '1' });
  expect(headersFor('/b/x/cXjs', rules)).toEqual({});
  expect(headersFor('/b/x/c.js/y', rules)).toEqual({});
  expect(headersFor('/d', rules)).toEqual({ 'X-D': '1' });
  expect(headersFor('/d/x', rules)).toEqual({});
  expect(headersFor('/xd', rules)).toEqual({});
});

test('lets a later rule override an earlier header of the same name', () => {
  const rules = parseHeaders('/*\n  X-A: 1\n  X-B: 1\n/a\n  X-A: 2\n');

  expect(headersFor('/a', rules)).toEqual({ 'X-A': '2', 'X-B': '1' });
  expect(headersFor('/b', rules)).toEqual({ 'X-A': '1', 'X-B': '1' });
});
