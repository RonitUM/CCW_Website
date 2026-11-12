// Regression guard for the 2026-11-12 broken-images incident.
// The SPA history-navigates (pushState) from the root document to pretty deep
// routes like /דרושות/ and /מסמכי-עמותה/ without reloading. Every runtime image
// URL is relative (vite base './'), so any served page that boots the SPA must
// carry a <base> element pinning relative-URL resolution to the site root; the
// root page used to have none, so menu-navigated pages 404ed all their images
// (doc viewer pages, hiring ad, posts). Deep prerendered pages already had it.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../dist', import.meta.url).pathname;
const missing = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (f !== 'index.html') continue;
    const html = readFileSync(p, 'utf8');
    // Redirect stubs neither boot the SPA nor reference runtime media; skip them.
    if (!html.includes('assets/index-')) continue;
    if (!/<base\s+href=/.test(html)) missing.push(p.slice(root.length));
  }
})(root);
if (missing.length) {
  console.error(`FAIL: ${missing.length} SPA page(s) served without <base href>: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('base OK: every served SPA page carries a <base href>');
