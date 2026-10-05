export function mountInspector(root: HTMLElement) {
  const box = document.createElement('section'); box.className = 'inspector'; const dl = document.createElement('dl'); box.append(dl); root.append(box);
  return { show(a: Record<string, number>) { dl.replaceChildren(...Object.entries(a).flatMap(([k, v]) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = typeof v === 'number' ? v.toFixed(1) : String(v); return [dt, dd]; })); } };
}
