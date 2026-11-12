// Regression guard for EN media URL portability.
// Since 6a04150 every served page carries a <base> element pinning relative-URL
// resolution to the site root - including the root page, whose <base href="./">
// freezes at parse time, before the SPA history-navigates to deep routes.
// RELATIVE media URLs (media-posts/...) therefore resolve correctly on every
// route, on the custom domain AND on the staging subpath (github.io project
// site), while root-absolute /media-posts refs bypass <base> and 404 under the
// subpath. EN media refs must stay relative.
// (History: this guard previously required root-absolute refs as a workaround
// for the root page lacking <base>; 6a04150 fixed the root cause.)
//
// Covers, at source level, the URL resolution used by these flows:
//   root -> EN toggle (pushState route), EN -> HE -> EN, direct /en/home/ load,
//   and the carousel / grid (#/mediaposts) / post detail (#/mpostN) /
//   full-view (figure href media-posts/original/*) references.
// With --live it also fetches every referenced EN media URL and asserts
// HTTP 200 against the live site root (needs network).
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/body-en.ts', import.meta.url), 'utf8');
const abs = src.match(/(?:src|href)=\\"\/media-posts\//g) || [];
if (abs.length) {
  console.error(`FAIL: ${abs.length} root-absolute media URL(s) in body-en.ts; EN media refs must stay relative (media-posts/...) - <base> now pins resolution`);
  process.exit(1);
}
const rel = src.match(/(?:src|href)=\\"media-posts\//g) || [];
console.log(`source OK: ${rel.length} relative media refs, 0 root-absolute`);

if (process.argv.includes('--live')) {
  const urls = [...new Set([...src.matchAll(/(?:src|href)=\\"(media-posts\/[^\\]+?)\\"/g)].map(m => m[1]))];
  let bad = 0;
  for (const u of urls) {
    const r = await fetch('https://ccw.org.il/' + u, { method: 'HEAD' });
    if (!r.ok) { bad++; console.error(`  ${r.status} ${u}`); }
  }
  console.log(bad ? `FAIL: ${bad}/${urls.length} media URLs not 200` : `live OK: all ${urls.length} referenced media URLs return 200`);
  process.exit(bad ? 1 : 0);
}
