import { LitElement, html } from 'lit';
class C extends LitElement { static properties = { c: { state: true } }; declare c: number; constructor() { super(); this.c = 0; setInterval(() => this.c++, 100); } render() { return html`<p @click=${() => this.c++}>${this.c}</p>`; } }
customElements.define('x-c', C); document.getElementById('app')!.append(document.createElement('x-c'));
