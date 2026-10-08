import type { AppMessage } from './messages.ts';

export function bindPageLifecycle(
  doc: EventTarget & { readonly visibilityState: string },
  win: EventTarget,
  post: (msg: AppMessage) => void,
): void {
  doc.addEventListener('visibilitychange', () => {
    const state = doc.visibilityState;
    if (state === 'hidden') post({ type: 'pause' });
    else if (state === 'visible') post({ type: 'resume' });
  });
  // Pause first, so the checkpoint is the last state the run reaches.
  win.addEventListener('pagehide', () => {
    post({ type: 'pause' });
    post({ type: 'checkpoint' });
  });
}
