const bcd=require("@mdn/browser-compat-data");
console.log("BCD version", bcd.__meta && bcd.__meta.version, "timestamp", bcd.__meta && bcd.__meta.timestamp);
const B=["chrome","edge","firefox","safari","safari_ios","chrome_android","firefox_android","samsunginternet_android","webview_android"];
function fmt(v){ const arr=Array.isArray(v)?v:[v]; return arr.map(x=>(x.version_added)+(x.version_removed?"-"+x.version_removed:"")+(x.partial_implementation?" partial":"")+(x.flags?" flag":"")+(x.prefix?" prefix:"+x.prefix:"")+(x.notes?" ["+[].concat(x.notes).join(" | ").replace(/<[^>]+>/g,"")+"]":"")).join(" ; "); }
function show(path){ let n=bcd; for(const p of path.split(".")) n=n&&n[p]; if(!n||!n.__compat){console.log("missing",path);return;} const s=n.__compat.support; console.log("== "+path); for(const b of B){ if(s[b]) console.log("  "+b+": "+fmt(s[b])); } }
for (const p of process.argv.slice(2)) show(p);
