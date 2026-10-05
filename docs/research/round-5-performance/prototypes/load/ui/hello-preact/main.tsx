import { render } from 'preact'; import { signal } from '@preact/signals';
const c = signal(0); render(<p onClick={() => c.value++}>{c}</p>, document.getElementById('app')!); setInterval(() => c.value++, 100);
