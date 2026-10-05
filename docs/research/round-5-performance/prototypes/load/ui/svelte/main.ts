import '../common/style.css';
import { mount, flushSync } from 'svelte';
import App from './App.svelte';
import { apply } from './store.svelte';
mount(App, { target: document.getElementById('app')! });
(window as any).__ui = { apply, flush: () => flushSync() };
