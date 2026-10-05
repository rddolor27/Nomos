import { render } from 'solid-js/web'; import { createSignal } from 'solid-js';
const [c, s] = createSignal(0); render(() => <p onClick={() => s(c() + 1)}>{c()}</p>, document.getElementById('app')!); setInterval(() => s(c() + 1), 100);
