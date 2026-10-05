const pkgs = process.argv.slice(2);
for (const p of pkgs) {
  try {
    const r = await fetch('https://registry.npmjs.org/' + p.replace('/', '%2F'));
    if (!r.ok) { console.log(p, 'HTTP', r.status); continue; }
    const j = await r.json();
    const tags = j['dist-tags'] || {};
    const latest = tags.latest;
    const t = j.time || {};
    const vers = Object.keys(j.versions || {});
    const lastVers = vers.slice(-6).map(v => `${v}@${(t[v]||'').slice(0,10)}`).join(', ');
    const lv = j.versions?.[latest] || {};
    console.log(`\n## ${p}\n tags=${JSON.stringify(Object.fromEntries(Object.entries(tags).map(([k,v])=>[k, v + '@' + (t[v]||'').slice(0,10)])))}\n license=${lv.license || j.license} | created=${(t.created||'').slice(0,10)} modified=${(t.modified||'').slice(0,10)} | nVersions=${vers.length}\n last=${lastVers}\n deps=${JSON.stringify(lv.dependencies||{})} peer=${JSON.stringify(lv.peerDependencies||{})}\n repo=${JSON.stringify(lv.repository?.url || lv.repository || '')} desc=${(lv.description||'').slice(0,150)}`);
  } catch (e) { console.log(p, 'ERR', e.message); }
}
