// Regression guard for the 2026-11-12 broken-carousel incident.
// The language toggle client-side pushStates from the root document (no <base>)
// to /en/home/, so RELATIVE media URLs in EN content resolve to
// /en/home/media-posts/* and 404. EN media refs must stay root-absolute.
//
// Covers, at source level, the URL resolution used by these flows:
//   root -> EN toggle (pushState route), EN -> HE -> EN, direct /en/home/ load,
//   and the carousel / grid (#/mediaposts) / post detail (#/mpostN) /
//   full-view (figure href media-posts/original/*) references.
// With --live it also fetches a sample of every referenced EN media URL and
// asserts HTTP 200 (needs network).
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/body-en.ts', import.meta.url), 'utf8');
const rel = src.match(/(?:src|href)=\\"media-posts\//g) || [];
if (rel.length) {
  console.error(`FAIL: ${rel.length} relative media URL(s) in body-en.ts; EN media refs must be root-absolute (/media-posts/...)`);
  process.exit(1);
}
const abs = src.match(/(?:src|href)=\\"\/media-posts\//g) || [];
console.log(`source OK: ${abs.length} root-absolute media refs, 0 relative`);

if (process.argv.includes('--live')) {
  const urls = [...new Set([...src.matchAll(/(?:src|href)=\\"(\/media-posts\/[^\\]+?)\\"/g)].map(m => m[1]))];
  let bad = 0;
  for (const u of urls) {
    const r = await fetch('https://ccw.org.il' + u, { method: 'HEAD' });
    if (!r.ok) { bad++; console.error(`  ${r.status} ${u}`); }
  }
  console.log(bad ? `FAIL: ${bad}/${urls.length} media URLs not 200` : `live OK: all ${urls.length} referenced media URLs return 200`);
  process.exit(bad ? 1 : 0);
}
