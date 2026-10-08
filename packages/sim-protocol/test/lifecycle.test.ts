import { describe, expect, it } from 'vitest';
import { bindPageLifecycle, type AppMessage } from '../src/index.ts';

type FakeDoc = EventTarget & { visibilityState: string };

function bindFakePage() {
  const doc: FakeDoc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const win = new EventTarget();
  const posted: AppMessage[] = [];
  bindPageLifecycle(doc, win, (msg) => posted.push(msg));
  return { doc, win, posted };
}

function changeVisibility(doc: FakeDoc, state: string): void {
  doc.visibilityState = state;
  doc.dispatchEvent(new Event('visibilitychange'));
}

describe('the page lifecycle', () => {
  it('pauses when the page is hidden', () => {
    const { doc, posted } = bindFakePage();
    changeVisibility(doc, 'hidden');
    expect(posted).toEqual([{ type: 'pause' }]);
  });

  it('resumes when the page is visible again', () => {
    const { doc, posted } = bindFakePage();
    changeVisibility(doc, 'hidden');
    changeVisibility(doc, 'visible');
    expect(posted).toEqual([{ type: 'pause' }, { type: 'resume' }]);
  });

  it('pauses and then checkpoints on pagehide', () => {
    const { win, posted } = bindFakePage();
    win.dispatchEvent(new Event('pagehide'));
    expect(posted).toEqual([{ type: 'pause' }, { type: 'checkpoint' }]);
  });
});
