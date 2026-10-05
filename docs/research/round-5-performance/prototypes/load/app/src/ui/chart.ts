import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
export function mountChart(el: HTMLElement) {
  const xs: number[] = [], a: number[] = [], b: number[] = [];
  const u = new uPlot({ width: 320, height: 160, series: [{}, { label: 'True thefts', stroke: '#ff7a59' }, { label: 'Recorded', stroke: '#2ecc71' }], axes: [{}, {}] }, [xs, a, b], el);
  return { push(t: number, va: number, vb: number) { xs.push(t); a.push(va); b.push(vb); if (xs.length > 600) { xs.shift(); a.shift(); b.shift(); } u.setData([xs, a, b]); } };
}
