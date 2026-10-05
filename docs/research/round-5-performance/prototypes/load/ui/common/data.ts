export interface Ev { id: number; t: string; kind: string; text: string }
export interface Tile { k: string; v: string; ds: string; up: boolean }
export interface Agent { id: number; fields: [string, string][] }
export interface Frame { tick: number; ev: Ev; tiles: Tile[]; agent: Agent }
export const KINDS = ['theft', 'arrest', 'trade', 'birth', 'death', 'move', 'hire', 'fire'];
export const LEGEND = [
  { label: 'Citizen', color: '#f4f4f4' }, { label: 'Merchant', color: '#e8b423' },
  { label: 'Police', color: '#3b6fd8' }, { label: 'Stealing', color: '#d83b3b' },
  { label: 'Market', color: '#9b59b6' }, { label: 'Home', color: '#7f8c8d' },
  { label: 'True thefts', color: '#ff7a59' }, { label: 'Recorded', color: '#2ecc71' },
];
const STAT = ['Population', 'Births', 'Deaths', 'Thefts (true)', 'Thefts (rec.)', 'Arrests', 'Trades', 'Avg wealth',
  'Gini', 'Unemployment', 'Avg hunger', 'Police', 'Merchants', 'Citizens', 'Homeless', 'Migrants in', 'Migrants out',
  'Food stock', 'Tax revenue', 'Clearance'];
const NAMES = ['Ada', 'Bo', 'Cy', 'Di', 'Ed', 'Flo', 'Gus', 'Hal', 'Ivy', 'Jo'];
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pad = (n: number) => (n < 10 ? '0' : '') + n;
let evId = 0;
function makeEv(tick: number): Ev {
  const kind = KINDS[(rnd() * KINDS.length) | 0];
  return { id: evId++, t: `D${(tick / 144) | 0} ${pad(((tick % 144) / 6) | 0)}:${pad((tick % 6) * 10)}`, kind,
    text: `${NAMES[(rnd() * 10) | 0]} #${(rnd() * 10000) | 0} ${kind} at (${(rnd() * 256) | 0},${(rnd() * 256) | 0})` };
}
export const FRAMES: Frame[] = [];
for (let i = 0; i < 1200; i++) {
  const tiles: Tile[] = STAT.map((k) => { const d = (rnd() - 0.5) * 20; return { k, v: (rnd() * 10000).toFixed(k === 'Gini' ? 3 : 0), ds: (d >= 0 ? '+' : '') + d.toFixed(1) + '%', up: d >= 0 }; });
  const agent: Agent = { id: (rnd() * 10000) | 0, fields: [
    ['Name', NAMES[(rnd() * 10) | 0]], ['Role', ['citizen', 'merchant', 'police'][(rnd() * 3) | 0]], ['State', KINDS[(rnd() * 8) | 0]],
    ['X', (rnd() * 4096).toFixed(1)], ['Y', (rnd() * 4096).toFixed(1)], ['Hunger', (rnd() * 100).toFixed(0)],
    ['Wealth', (rnd() * 500).toFixed(2)], ['Age', String((rnd() * 80) | 0)], ['Home', `H${(rnd() * 900) | 0}`],
    ['Work', `W${(rnd() * 300) | 0}`], ['Mood', (rnd() * 2 - 1).toFixed(2)], ['Crimes', String((rnd() * 5) | 0)]] };
  FRAMES.push({ tick: i, ev: makeEv(i), tiles, agent });
}
export function initialEvents(): Ev[] { const a: Ev[] = []; for (let i = 0; i < 50; i++) a.push(makeEv(i)); return a.reverse(); }
export const N = FRAMES.length;
