import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

export interface HeaderRule {
  pattern: string;
  headers: Record<string, string>;
}

function addHeader(rule: HeaderRule | undefined, line: string): void {
  const colon = line.indexOf(':');
  if (!rule || colon < 1) return;
  rule.headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
}

export function parseHeaders(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  for (const line of text.split(/\r?\n/)) {
    const content = line.trim();
    if (content === '' || content.startsWith('#')) continue;
    if (/^\s/.test(line)) addHeader(rules.at(-1), content);
    else rules.push({ pattern: content, headers: {} });
  }
  return rules;
}

function matches(pattern: string, path: string): boolean {
  const source = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${source}$`).test(path);
}

export function headersFor(path: string, rules: HeaderRule[]): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const rule of rules) {
    if (matches(rule.pattern, path)) Object.assign(headers, rule.headers);
  }
  return headers;
}

function serveHeaders(server: Pick<ViteDevServer, 'config' | 'middlewares'>): void {
  const rules = parseHeaders(readFileSync(join(server.config.publicDir, '_headers'), 'utf8'));
  server.middlewares.use((req, res, next) => {
    const path = (req.url ?? '/').split('?')[0];
    for (const [name, value] of Object.entries(headersFor(path, rules))) res.setHeader(name, value);
    next();
  });
}

export function headersFile(): Plugin {
  return { name: 'headers-file', configureServer: serveHeaders, configurePreviewServer: serveHeaders };
}
