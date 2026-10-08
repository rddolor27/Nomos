import { bindPageLifecycle } from '@nomos/sim-protocol';
import type { App } from './app.ts';

// Hidden pauses and visible resumes, unless the user paused: then returning to the tab keeps the run paused.
export function bindLifecycle(doc: Document, win: Window, app: App): void {
  bindPageLifecycle(doc, win, (msg) => {
    if (msg.type === 'resume' && app.userPaused) return;
    app.worker.postMessage(msg);
  });
}
