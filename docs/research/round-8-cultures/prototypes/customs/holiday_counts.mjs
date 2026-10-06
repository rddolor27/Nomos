// How many nationwide public holidays do countries have a year? (frequency anchor for festivals)
// Data: Nager.Date public API (https://date.nager.at), fetched at run time into a cache dir OUTSIDE the repo.
// Usage: node holiday_counts.mjs <cacheDir> [year]
import fs from 'node:fs';
import path from 'node:path';

const cache = process.argv[2];
const year = +(process.argv[3] || 2025);
if (!cache) { console.error('usage: node holiday_counts.mjs <cacheDir> [year]'); process.exit(1); }
fs.mkdirSync(cache, { recursive: true });

async function get(url, file) {
  const f = path.join(cache, file);
  if (!fs.existsSync(f)) { const r = await fetch(url); fs.writeFileSync(f, r.ok ? await r.text() : '[]'); }
  return JSON.parse(fs.readFileSync(f, 'utf8') || '[]');
}
const countries = await get('https://date.nager.at/api/v3/AvailableCountries', 'nager_countries.json');
const counts = [], months = new Array(12).fill(0);
let total = 0;
for (const c of countries) {
  const hs = await get(`https://date.nager.at/api/v3/PublicHolidays/${year}/${c.countryCode}`, `nager_${year}_${c.countryCode}.json`);
  // Nationwide public days only: global === true and 'Public' among types; one count per distinct date.
  const days = new Set(hs.filter(h => h.global && (h.types || []).includes('Public')).map(h => h.date));
  if (days.size === 0) continue;
  counts.push({ cc: c.countryCode, n: days.size });
  for (const d of days) { months[+d.slice(5, 7) - 1]++; total++; }
}
const v = counts.map(x => x.n).sort((a, b) => a - b);
const q = p => { const i = (v.length - 1) * p, lo = Math.floor(i); return v[lo] + (v[Math.ceil(i)] - v[lo]) * (i - lo); };
// Clustering: share of holiday dates that sit within 1 day of another holiday date (multi-day festivals)
let clustered = 0, all = 0;
for (const c of counts) {
  const hs = JSON.parse(fs.readFileSync(path.join(cache, `nager_${year}_${c.cc}.json`), 'utf8'));
  const ds = [...new Set(hs.filter(h => h.global && (h.types || []).includes('Public')).map(h => Date.parse(h.date) / 864e5))].sort((a, b) => a - b);
  for (let i = 0; i < ds.length; i++) { all++; if ((i > 0 && ds[i] - ds[i - 1] === 1) || (i < ds.length - 1 && ds[i + 1] - ds[i] === 1)) clustered++; }
}
console.log(JSON.stringify({
  year, countries: counts.length,
  nationwide_public_days: { min: v[0], p10: q(0.1), p25: q(0.25), median: q(0.5), p75: q(0.75), p90: q(0.9), max: v[v.length - 1] },
  share_of_days_adjacent_to_another: +(clustered / all).toFixed(3),
  month_share: months.map(m => +(m / total).toFixed(3)),
}, null, 1));
