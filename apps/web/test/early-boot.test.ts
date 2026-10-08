import { describe, expect, it } from 'vitest';
import { bootTag } from '../vite/early-boot.ts';

const BUNDLE = ['assets/index-c3.js', 'assets/worker-a1.js', 'assets/maps/town-b2.nmap', 'index.html'];

describe('the early boot', () => {
  it('injects the boot script first in head', () => {
    const tag = bootTag(BUNDLE);
    expect(tag).toMatchObject({ tag: 'script', injectTo: 'head-prepend' });
    const script = String(tag.children);
    expect(script).toContain("new Worker('/assets/worker-a1.js',{type:'module',name:'sim'})");
    expect(script).toContain("fetch('/assets/maps/town-b2.nmap')");
    expect(script).toContain("performance.mark('worker:new')");
    expect(() => new Function(script)).not.toThrow();
  });

  // The app's own listener attaches only once the entry chunk runs, which can be after the worker has already failed.
  it('flags a worker that fails before the app listens', () => {
    const worker: { onerror?: () => void } = {};
    const win: { __boot?: { failed?: boolean } } = {};
    const run = new Function('window', 'Worker', 'fetch', 'performance', String(bootTag(BUNDLE).children));
    run(
      win,
      function Worker() {
        return worker;
      },
      () => new Promise(() => {}),
      { mark() {} },
    );
    expect(win.__boot?.failed).toBeUndefined();
    worker.onerror?.();
    expect(win.__boot?.failed).toBe(true);
  });

  it('throws without a worker or map', () => {
    expect(() => bootTag(['assets/maps/town-b2.nmap'])).toThrow(/worker/);
    expect(() => bootTag(['assets/worker-a1.js'])).toThrow(/map/);
  });
});
