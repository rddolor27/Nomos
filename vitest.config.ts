import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'apps/*/test/**/*.test.ts', 'tools/*/test/**/*.test.ts'],
    // Two workers on the owner's machine, which the full suite pinned at 100% CPU (owner, 10 October 2026); CI keeps
    // Vitest's default.
    maxWorkers: process.env.CI ? undefined : 2,
  },
});
